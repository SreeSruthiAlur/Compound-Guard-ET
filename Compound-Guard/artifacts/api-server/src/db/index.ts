import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH ?? path.join(process.cwd(), "compoundguard.db");

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS zones (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      hazard_class TEXT NOT NULL,
      polygon_points TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sensor_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      zone_id INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      gas_lel_pct REAL NOT NULL DEFAULT 0,
      co_ppm REAL NOT NULL DEFAULT 0,
      temperature_c REAL NOT NULL DEFAULT 0,
      vibration REAL NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_sr_zone_time
      ON sensor_readings(zone_id, timestamp DESC);
    CREATE TABLE IF NOT EXISTS permits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      zone_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      issued_by TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS shift_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      shift_name TEXT NOT NULL,
      event_type TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      zone_id INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      model_source TEXT NOT NULL,
      severity TEXT NOT NULL,
      score REAL NOT NULL,
      explanation_text TEXT NOT NULL,
      citation_id TEXT,
      dismissed INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('sensitivity', '1.0')").run();
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('dismissed_count', '0')").run();
}

// ── Zones ──────────────────────────────────────────────────────────────────

const ZONE_DEFS = [
  { id: 1, name: "Coke Oven Battery",    hazard_class: "gas_release_risk",  polygon_points: "50,50 270,50 270,200 50,200" },
  { id: 2, name: "Blast Furnace",        hazard_class: "gas_release_risk",  polygon_points: "320,50 540,50 540,200 320,200" },
  { id: 3, name: "Blower House",         hazard_class: "hot_work_adjacent", polygon_points: "590,50 770,50 770,200 590,200" },
  { id: 4, name: "Gas Cleaning Plant",   hazard_class: "confined_space",    polygon_points: "50,260 270,260 270,410 50,410" },
  { id: 5, name: "Storage Yard",         hazard_class: "hot_work_adjacent", polygon_points: "320,260 540,260 540,410 320,410" },
  { id: 6, name: "Control Room",         hazard_class: "general",           polygon_points: "590,260 770,260 770,410 590,410" },
  { id: 7, name: "Maintenance Bay",      hazard_class: "electrical_hazard", polygon_points: "50,470 430,470 430,560 50,560" },
  { id: 8, name: "Loading Dock",         hazard_class: "confined_space",    polygon_points: "480,470 950,470 950,560 480,560" },
];

export function seedZones() {
  const stmt = db.prepare(
    "INSERT OR IGNORE INTO zones (id, name, hazard_class, polygon_points) VALUES (?, ?, ?, ?)"
  );
  for (const z of ZONE_DEFS) stmt.run(z.id, z.name, z.hazard_class, z.polygon_points);
}

export function getZones(): ZoneRow[] {
  return db.prepare("SELECT * FROM zones ORDER BY id").all() as ZoneRow[];
}

export function getZone(id: number): ZoneRow | null {
  return (db.prepare("SELECT * FROM zones WHERE id = ?").get(id) as ZoneRow) ?? null;
}

// ── Sensors ────────────────────────────────────────────────────────────────

export function seedHistoricalReadings() {
  const count = (db.prepare("SELECT COUNT(*) as c FROM sensor_readings").get() as { c: number }).c;
  if (count > 0) return;

  // Zone baselines [gasLel, co, temp, vibration]
  const baselines: Record<number, [number, number, number, number]> = {
    1: [12, 35, 52, 0.4],
    2: [8,  25, 65, 0.6],
    3: [5,  15, 45, 0.3],
    4: [7,  20, 48, 0.2],  // anomaly zone
    5: [4,  12, 40, 0.1],
    6: [1,  5,  25, 0.05],
    7: [3,  10, 42, 0.3],
    8: [5,  18, 38, 0.15],
  };

  const now = Date.now();
  const start = now - 4 * 3600_000; // 4 hours of history
  const noise = (v: number, pct = 0.15) => Math.max(0, v + (Math.random() - 0.5) * 2 * v * pct);

  const stmt = db.prepare(
    "INSERT INTO sensor_readings (zone_id, timestamp, gas_lel_pct, co_ppm, temperature_c, vibration) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const total = 48; // one reading every 5 minutes for 4 hours

  db.transaction(() => {
    for (let i = 0; i < total; i++) {
      const t = new Date(start + i * 5 * 60_000).toISOString();
      for (let zoneId = 1; zoneId <= 8; zoneId++) {
        const [bg, bc, bt, bv] = baselines[zoneId];
        let gasLel = noise(bg);
        // Pre-seed zone 4 with a rising trend in the last 20% of history
        if (zoneId === 4 && i > total * 0.8) {
          const progress = (i - total * 0.8) / (total * 0.2);
          gasLel = bg + progress * 12 + noise(bg, 0.05);
        }
        stmt.run(zoneId, t, gasLel, noise(bc), noise(bt), noise(bv));
      }
    }
  })();
}

export function getZoneSensors(zoneId: number, limit = 60, since?: string): SensorRow[] {
  if (since) {
    return db.prepare(
      "SELECT * FROM sensor_readings WHERE zone_id = ? AND timestamp > ? ORDER BY timestamp DESC LIMIT ?"
    ).all(zoneId, since, limit) as SensorRow[];
  }
  return db.prepare(
    "SELECT * FROM sensor_readings WHERE zone_id = ? ORDER BY timestamp DESC LIMIT ?"
  ).all(zoneId, limit) as SensorRow[];
}

export function getLatestReading(zoneId: number): SensorRow | null {
  return (
    db.prepare("SELECT * FROM sensor_readings WHERE zone_id = ? ORDER BY timestamp DESC LIMIT 1")
      .get(zoneId) as SensorRow
  ) ?? null;
}

export function getRecentReadings(zoneId: number, n = 8): SensorRow[] {
  return db.prepare(
    "SELECT * FROM sensor_readings WHERE zone_id = ? ORDER BY timestamp DESC LIMIT ?"
  ).all(zoneId, n) as SensorRow[];
}

export function insertSensorReading(
  zoneId: number, timestamp: string, gasLelPct: number,
  coPpm: number, temperatureC: number, vibration: number
) {
  return db.prepare(
    "INSERT INTO sensor_readings (zone_id, timestamp, gas_lel_pct, co_ppm, temperature_c, vibration) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(zoneId, timestamp, gasLelPct, coPpm, temperatureC, vibration);
}

export function pruneOldReadings() {
  // Keep only last 4 hours to prevent DB from growing unbounded
  db.prepare(
    "DELETE FROM sensor_readings WHERE timestamp < datetime('now', '-4 hours')"
  ).run();
}

// ── Permits ────────────────────────────────────────────────────────────────

export function seedPermits() {
  const count = (db.prepare("SELECT COUNT(*) as c FROM permits").get() as { c: number }).c;
  if (count > 0) return;

  const now = new Date();
  const h = (n: number) => new Date(now.getTime() + n * 3600_000).toISOString();
  const permits = [
    { zone_id: 1, type: "hot_work",      status: "active",  start: h(-2), end: h(6),  by: "Supervisor R. Mehta" },
    { zone_id: 4, type: "confined_space",status: "active",  start: h(-1), end: h(7),  by: "Safety Officer A. Kumar" },
    { zone_id: 4, type: "hot_work",      status: "active",  start: h(-0.5),end: h(8), by: "Permit Issuer S. Rao" },
    { zone_id: 7, type: "electrical",    status: "active",  start: h(-4), end: h(4),  by: "Electrical Supervisor P. Singh" },
    { zone_id: 2, type: "hot_work",      status: "expired", start: h(-12),end: h(-4), by: "Supervisor V. Rajan" },
  ];
  const stmt = db.prepare(
    "INSERT INTO permits (zone_id, type, status, start_time, end_time, issued_by) VALUES (?, ?, ?, ?, ?, ?)"
  );
  for (const p of permits) stmt.run(p.zone_id, p.type, p.status, p.start, p.end, p.by);
}

export function getActivePermitsForZone(zoneId: number): PermitRow[] {
  return db.prepare(
    `SELECT p.*, z.name as zone_name FROM permits p
     JOIN zones z ON p.zone_id = z.id
     WHERE p.zone_id = ? AND p.status = 'active' AND p.end_time > ?
     ORDER BY p.start_time DESC`
  ).all(zoneId, new Date().toISOString()) as PermitRow[];
}

export function getPermitsByZone(zoneId: number, activeOnly = false): PermitRow[] {
  let query = `SELECT p.*, z.name as zone_name FROM permits p
               JOIN zones z ON p.zone_id = z.id WHERE p.zone_id = ?`;
  const params: unknown[] = [zoneId];
  if (activeOnly) { query += " AND p.status = 'active' AND p.end_time > ?"; params.push(new Date().toISOString()); }
  return db.prepare(query + " ORDER BY p.start_time DESC").all(...params) as PermitRow[];
}

export function getAllPermits(activeOnly = false, zoneId?: number): PermitRow[] {
  let query = `SELECT p.*, z.name as zone_name FROM permits p JOIN zones z ON p.zone_id = z.id`;
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (activeOnly) { conditions.push("p.status = 'active' AND p.end_time > ?"); params.push(new Date().toISOString()); }
  if (zoneId !== undefined) { conditions.push("p.zone_id = ?"); params.push(zoneId); }
  if (conditions.length) query += " WHERE " + conditions.join(" AND ");
  return db.prepare(query + " ORDER BY p.start_time DESC").all(...params) as PermitRow[];
}

// ── Shift events ───────────────────────────────────────────────────────────

export function seedShiftEvents() {
  const count = (db.prepare("SELECT COUNT(*) as c FROM shift_events").get() as { c: number }).c;
  if (count > 0) return;
  const now = new Date();
  const h = (n: number) => new Date(now.getTime() + n * 3600_000).toISOString();
  const events = [
    { t: h(-8),   shift: "day",     type: "changeover" },
    { t: h(-7.9), shift: "day",     type: "handover_note" },
    { t: h(-4),   shift: "evening", type: "changeover" },
    { t: h(-3.9), shift: "evening", type: "handover_note" },
  ];
  const stmt = db.prepare("INSERT INTO shift_events (timestamp, shift_name, event_type) VALUES (?, ?, ?)");
  for (const e of events) stmt.run(e.t, e.shift, e.type);
}

export function getRecentShiftEvents(limit = 20): ShiftRow[] {
  return db.prepare(
    "SELECT * FROM shift_events ORDER BY timestamp DESC LIMIT ?"
  ).all(limit) as ShiftRow[];
}

export function insertShiftEvent(timestamp: string, shiftName: string, eventType: string) {
  return db.prepare(
    "INSERT INTO shift_events (timestamp, shift_name, event_type) VALUES (?, ?, ?)"
  ).run(timestamp, shiftName, eventType);
}

export function getCurrentShift(): "day" | "evening" | "night" {
  const h = new Date().getHours();
  if (h >= 6 && h < 14) return "day";
  if (h >= 14 && h < 22) return "evening";
  return "night";
}

export function isNearShiftChangeover(): boolean {
  const mins = new Date().getHours() * 60 + new Date().getMinutes();
  for (const cm of [360, 840, 1320]) {
    const diff = Math.min(Math.abs(mins - cm), 1440 - Math.abs(mins - cm));
    if (diff <= 30) return true;
  }
  return false;
}

// ── Alerts ─────────────────────────────────────────────────────────────────

export function getAlerts(params: {
  limit?: number; modelSource?: string; severity?: string;
  includeDismissed?: boolean; zoneId?: number;
}): AlertRow[] {
  const { limit = 50, modelSource, severity, includeDismissed = false, zoneId } = params;
  let query = `SELECT a.*, z.name as zone_name FROM alerts a JOIN zones z ON a.zone_id = z.id`;
  const conds: string[] = [];
  const vals: unknown[] = [];
  if (!includeDismissed) conds.push("a.dismissed = 0");
  if (modelSource) { conds.push("a.model_source = ?"); vals.push(modelSource); }
  if (severity) { conds.push("a.severity = ?"); vals.push(severity); }
  if (zoneId !== undefined) { conds.push("a.zone_id = ?"); vals.push(zoneId); }
  if (conds.length) query += " WHERE " + conds.join(" AND ");
  query += " ORDER BY a.timestamp DESC LIMIT ?";
  vals.push(limit);
  return db.prepare(query).all(...vals) as AlertRow[];
}

export function getAlert(id: number): AlertRow | null {
  return (
    db.prepare(`SELECT a.*, z.name as zone_name FROM alerts a JOIN zones z ON a.zone_id = z.id WHERE a.id = ?`)
      .get(id) as AlertRow
  ) ?? null;
}

export function insertAlert(data: {
  zoneId: number; timestamp: string; modelSource: string; severity: string;
  score: number; explanationText: string; citationId?: string;
}): number {
  const r = db.prepare(
    `INSERT INTO alerts (zone_id, timestamp, model_source, severity, score, explanation_text, citation_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(data.zoneId, data.timestamp, data.modelSource, data.severity, data.score,
        data.explanationText, data.citationId ?? null);
  return r.lastInsertRowid as number;
}

export function dismissAlertById(id: number): boolean {
  return db.prepare("UPDATE alerts SET dismissed = 1 WHERE id = ?").run(id).changes > 0;
}

// ── Settings ───────────────────────────────────────────────────────────────

export function getSetting(key: string): string | null {
  return (db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined)?.value ?? null;
}

export function setSetting(key: string, value: string) {
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
}

export function getSensitivity(): number {
  return parseFloat(getSetting("sensitivity") ?? "1.0");
}

export function updateSensitivityOnDismiss(): number {
  const dismissed = parseInt(getSetting("dismissed_count") ?? "0") + 1;
  setSetting("dismissed_count", String(dismissed));
  const next = Math.max(0.5, Math.round((getSensitivity() - 0.05) * 100) / 100);
  setSetting("sensitivity", String(next));
  return next;
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface SensorRow {
  id: number; zone_id: number; timestamp: string;
  gas_lel_pct: number; co_ppm: number; temperature_c: number; vibration: number;
}
export interface ZoneRow {
  id: number; name: string; hazard_class: string; polygon_points: string;
}
export interface PermitRow {
  id: number; zone_id: number; zone_name: string; type: string; status: string;
  start_time: string; end_time: string; issued_by: string;
}
export interface ShiftRow {
  id: number; timestamp: string; shift_name: string; event_type: string;
}
export interface AlertRow {
  id: number; zone_id: number; zone_name: string; timestamp: string;
  model_source: string; severity: string; score: number;
  explanation_text: string; citation_id: string | null; dismissed: number;
}
