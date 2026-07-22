export interface CorpusItem {
  id: string;
  source_type: "OISD" | "Factory Act" | "Incident Summary";
  title: string;
  excerpt_text: string;
  tags: string[];
}

export const CORPUS: CorpusItem[] = [
  {
    id: "OISD-116-4.1",
    source_type: "OISD",
    title: "OISD-STD-116 §4.1 — Continuous Gas Monitoring Requirements",
    excerpt_text:
      "Continuous gas monitoring shall be provided in all hazardous areas where flammable or toxic gas accumulation is possible. Detectors must be calibrated for the specific gas hazard and alarmed at 10% LEL (warning) and 25% LEL (danger). Readings must be correlated across adjacent zones before issuing any hot-work permit.",
    tags: ["gas", "lel", "monitoring", "hot_work", "alarm"],
  },
  {
    id: "OISD-116-6.2",
    source_type: "OISD",
    title: "OISD-STD-116 §6.2 — Hot-Work Permit in Gassy Areas",
    excerpt_text:
      "No hot-work permit shall be issued in a zone where the gas concentration exceeds 5% LEL without additional safeguards. Where a rising gas trend is detected within 30 minutes of permit issuance, the permit must be suspended immediately and the area evacuated until two consecutive clear readings are confirmed.",
    tags: ["hot_work", "gas", "lel", "permit", "evacuation"],
  },
  {
    id: "OISD-116-7.1",
    source_type: "OISD",
    title: "OISD-STD-116 §7.1 — Confined Space Entry with Gas Hazard",
    excerpt_text:
      "Confined space entry is prohibited when CO levels exceed 25 ppm or when LEL readings indicate any detectable concentration without a supplied-air respirator. Continuous monitoring is mandatory throughout entry duration. Buddy system and external standby with emergency retrieval equipment are required.",
    tags: ["confined_space", "gas", "co", "entry", "monitoring"],
  },
  {
    id: "OISD-105-3.1",
    source_type: "OISD",
    title: "OISD-STD-105 §3.1 — Work Permit System Implementation",
    excerpt_text:
      "A formal permit-to-work system must cover all hazardous activities including hot work, confined space entry, electrical isolation, and height work. Permits must specify the exact zone, duration, and responsible supervisor. No more than two hazardous permit types may be simultaneously active in a single zone without formal simultaneous operations (SIMOPS) risk assessment.",
    tags: ["permit", "hot_work", "confined_space", "electrical", "simops"],
  },
  {
    id: "OISD-105-5.2",
    source_type: "OISD",
    title: "OISD-STD-105 §5.2 — Simultaneous Operations (SIMOPS) Control",
    excerpt_text:
      "When two or more hazardous permits are active concurrently in the same or adjacent zones, a SIMOPS risk assessment is mandatory. The compound hazard potential — particularly the interaction between gas release risk and ignition sources from hot work — must be explicitly evaluated. Historical incident data shows 60% of compound incidents involved overlapping permits in adjacent zones.",
    tags: ["simops", "hot_work", "gas", "compound_risk", "permit"],
  },
  {
    id: "FACTORY-36",
    source_type: "Factory Act",
    title: "Factories Act 1948 §36 — Precautions Against Dangerous Fumes",
    excerpt_text:
      "No person shall enter any chamber, tank, vat, pit, pipe, flue or other confined space in which any gas, fume, vapour or dust is liable to be present to such extent as to involve risk to persons being overcome thereby, unless it is provided with a manhole of adequate size or other effective means of egress. Where gas is present, atmospheric testing must be continuous.",
    tags: ["confined_space", "gas", "fumes", "entry"],
  },
  {
    id: "FACTORY-41B",
    source_type: "Factory Act",
    title: "Factories Act 1948 §41B — Hazardous Process Safety Obligations",
    excerpt_text:
      "The occupier of every factory carrying on hazardous processes shall maintain accurate and up-to-date health records of workers exposed to chemical hazards. A written disclosure of information on hazards, precautions, and emergency procedures must be available to all employees. Compound hazard scenarios must be included in emergency response planning.",
    tags: ["hazardous_process", "emergency", "health", "safety"],
  },
  {
    id: "FACTORY-41C",
    source_type: "Factory Act",
    title: "Factories Act 1948 §41C — Safety Committees for Hazardous Processes",
    excerpt_text:
      "Every factory engaged in a hazardous process shall constitute a Safety Committee with equal representation from management and workers. The committee shall review all near-misses and compound risk incidents, and recommend preventive measures within 15 days. Shift changeover handover protocols must be reviewed quarterly.",
    tags: ["safety_committee", "hazardous_process", "shift", "review"],
  },
  {
    id: "OISD-189-4.3",
    source_type: "OISD",
    title: "OISD-STD-189 §4.3 — Shift Handover in Continuous Process Plants",
    excerpt_text:
      "Formal shift handover is a critical safety event. The outgoing shift supervisor must brief the incoming shift on all active permits, ongoing hazardous activities, abnormal equipment states, and any near-miss events. Handover must not occur during an ongoing emergency or when abnormal readings are active. Statistics indicate 23% of major incidents occur within 90 minutes of shift changeover.",
    tags: ["shift", "handover", "permit", "changeover"],
  },
  {
    id: "OISD-189-5.1",
    source_type: "OISD",
    title: "OISD-STD-189 §5.1 — Night Shift Risk Factors",
    excerpt_text:
      "Night shift operations carry elevated risk due to reduced staffing, circadian fatigue, and slower emergency response. Plants operating hazardous processes at night must maintain minimum crew levels and apply a 10-15% risk multiplier to all threshold decisions. Automated monitoring systems should have lower alarm thresholds during night shifts.",
    tags: ["night_shift", "fatigue", "risk", "monitoring"],
  },
  {
    id: "OISD-GDN-192-2.4",
    source_type: "OISD",
    title: "OISD-GDN-192 §2.4 — Multi-Hazard and Compound Risk Identification",
    excerpt_text:
      "Single-parameter monitoring is insufficient for identifying compound hazard scenarios in which multiple independently sub-threshold conditions combine to create a dangerous situation. OISD guidelines require safety systems to consider correlated readings across sensor types (gas, temperature, vibration) alongside operational context (permits, shift status) to compute a compound risk index.",
    tags: ["compound_risk", "multi_hazard", "monitoring", "correlation"],
  },
  {
    id: "OISD-201-6.1",
    source_type: "OISD",
    title: "OISD-STD-201 §6.1 — Emergency Response and Evacuation Planning",
    excerpt_text:
      "Every facility must maintain a site-specific Emergency Response Plan (ERP) covering all major accident hazard (MAH) scenarios. The ERP must include pre-scripted evacuation routes, assembly points, and first notification procedures. Draft incident reports must be prepared within 15 minutes of a declared emergency by the control room officer, clearly marked as preliminary.",
    tags: ["emergency", "evacuation", "incident_report", "response"],
  },
  {
    id: "INCIDENT-VIZAG-2025",
    source_type: "Incident Summary",
    title: "Visakhapatnam Steel Plant — Coke Oven Explosion (2025, paraphrased)",
    excerpt_text:
      "A coke oven battery explosion at a major steel plant in Visakhapatnam resulted in multiple casualties. Post-incident analysis revealed that gas levels in the adjacent battery had been rising for approximately 40 minutes before the incident, while a hot-work permit remained active for electrode repair in the same zone. No single sensor had breached its standalone alarm threshold; the compound risk from concurrent gas rise and active ignition work was not flagged by the existing single-parameter monitoring system.",
    tags: ["incident", "gas", "hot_work", "coke_oven", "compound_risk", "vizag"],
  },
  {
    id: "INCIDENT-LG-POLYMERS-2020",
    source_type: "Incident Summary",
    title: "LG Polymers Visakhapatnam — Styrene Gas Leak (2020, paraphrased)",
    excerpt_text:
      "A catastrophic styrene vapor release at a chemical plant near Visakhapatnam caused mass casualties in surrounding communities. The incident occurred during early morning hours (night shift handover period) when gas leaked from a storage tank due to inadequate temperature control. Contributing factors included reduced night shift monitoring frequency, absence of a compound risk alert combining gas trend data with tank temperature anomalies, and delayed emergency response.",
    tags: ["incident", "gas", "night_shift", "temperature", "compound_risk", "vizag"],
  },
  {
    id: "FACTORY-38",
    source_type: "Factory Act",
    title: "Factories Act 1948 §38 — Precautions in Case of Fire",
    excerpt_text:
      "In every factory, all practicable measures shall be taken to prevent outbreak of fire and its spread, both internally and externally, and to provide and maintain safe means of escape for all persons in the event of a fire. In plants handling flammable gases, automatic gas detection must be interlocked with fire suppression systems, and emergency evacuation drills must be conducted not less than twice annually.",
    tags: ["fire", "gas", "evacuation", "emergency", "prevention"],
  },
];

export function getCorpusItems(tagFilter?: string): CorpusItem[] {
  if (!tagFilter) return CORPUS;
  const tags = tagFilter.split(",").map((t) => t.trim().toLowerCase());
  return CORPUS.filter((item) => tags.some((t) => item.tags.includes(t)));
}

export function getCorpusItem(id: string): CorpusItem | undefined {
  return CORPUS.find((item) => item.id === id);
}

export function findBestCitation(triggerTags: string[]): CorpusItem | null {
  let best: CorpusItem | null = null;
  let bestScore = 0;
  for (const item of CORPUS) {
    const score = item.tags.filter((t) => triggerTags.includes(t)).length;
    if (score > bestScore) { bestScore = score; best = item; }
  }
  return best;
}
