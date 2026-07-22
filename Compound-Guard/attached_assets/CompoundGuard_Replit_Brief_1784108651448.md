# CompoundGuard — Replit Agent Build Brief

Paste everything below directly into Replit Agent.

---

## 1. APP OVERVIEW

**App name:** CompoundGuard

**One-line description:** A compound-risk detection and permit-conflict engine for industrial plants that fuses gas-sensor streams, work permits, and shift context into a single explainable risk score — catching dangerous combinations (like a hot-work permit near rising gas levels) minutes to hours before a single-sensor system would.

**Core problem it solves:** In Indian heavy industry, safety data already exists (gas sensors, SCADA, permits, shift logs) but lives in silos. Fatal incidents (e.g., the 2025 Visakhapatnam Steel Plant coke-oven explosion) happen not because sensors failed, but because no system correlated multiple weak signals into one actionable alert in time. CompoundGuard demonstrates, on injected realistic scenarios, that a compound-risk engine (sensor + permit + shift context) flags danger significantly earlier and with fewer false negatives than a single-sensor baseline — and grounds every alert in the actual OISD/Factory Act clause and closest historical incident, so safety officers get an explainable, auditable reason, not a black-box score.

**Target user:** Plant safety officers and shift supervisors at heavy-industrial facilities (steel, chemical, oil & gas) who currently monitor multiple disconnected dashboards (SCADA, permit logs, CCTV) manually.

---

## 2. FULL FEATURE LIST

### Core (must-have — build these first, this is what gets demoed)
1. **Synthetic data generator** — streams gas (LEL %, CO ppm), temperature, and vibration readings per zone on a timeline; generates permit records (hot work, confined space, electrical) with start/end times and zones; generates shift-change events.
2. **Single-sensor baseline model** — a simple rules/threshold model (or isolation forest) that scores each zone's risk using sensor data *only*. This is the explicit comparison baseline judges will ask for.
3. **Compound-risk engine** — a second model that scores the same zone using sensor + active-permit conflicts + shift context jointly (e.g., hot-work permit active in a zone where gas trend is rising = compound flag). This is the core novelty.
4. **Injected scenario mode** — a button/toggle that runs a pre-built "Vizag-style" scenario (gas rise + concurrent hot-work permit) through both models simultaneously and displays: (a) timestamp single-sensor baseline would have flagged it, (b) timestamp compound engine flagged it, (c) lead-time delta in minutes, (d) false-negative count for each model on the scenario set.
5. **Regulation + incident RAG grounding** — on any compound-risk alert, retrieve and cite the matching clause from a small curated corpus (10–20 real OISD guideline excerpts / Factory Act provisions / public incident summaries like Vizag and LG Polymers) plus the closest historical incident. Show citation inline with the alert.
6. **2D geospatial heatmap** — SVG/canvas plant layout divided into zones, colored live by compound-risk score (green/yellow/orange/red). Click a zone to see its explanation + citation.
7. **Alert log with feedback loop** — every alert (raised/dismissed) is logged with a timestamp; dismissing an alert visibly adjusts a "sensitivity" indicator to show the retraining concept (does not need real ML retraining — a labeled, honest simulation is fine).
8. **Emergency orchestrator stub** — on a confirmed high-severity compound alert, auto-generates a draft evacuation notice + preliminary incident report on-screen, explicitly labeled "DRAFT — awaiting human sign-off" with a "Send / Dismiss" button (button does not need to send anything real).

### Nice-to-have (only after core is fully working and demoable)
9. Live-updating line charts of gas/temperature per zone alongside the heatmap.
10. A "before vs after" split-screen replay of the injected scenario for the demo video.
11. Simple authentication (single demo login) so it looks production-like.
12. Export the incident report draft as a downloadable PDF.
13. A permit-conflict table view listing all currently overlapping permits by zone.

**Judge-impressing priority order:** features 3, 4, 5, 6 are what differentiate this from a single-modality dashboard — build and polish these before touching anything in the nice-to-have list.

---

## 3. TECH STACK

Keep this beginner-friendly and fast to build in Replit — no heavy infra, no real cloud services, everything runs in one Repl.

- **Frontend:** React (Vite) + Tailwind CSS
- **Charts/heatmap:** Recharts for time-series charts; plain SVG (hand-authored zone shapes) for the plant-layout heatmap — do not use a mapping API, this is an indoor plant layout, not geography
- **Backend:** Node.js + Express (single server), or Python + FastAPI if the agent prefers — pick one and stay consistent
- **Database:** SQLite (via better-sqlite3 or Prisma) — no need for Postgres/cloud DB for a hackathon demo
- **Data generation:** a scheduled server-side interval (e.g., every 3–5 seconds) that writes new synthetic sensor/permit/shift rows and pushes updates to the frontend via WebSocket (Socket.IO) or simple polling if WebSocket setup is too slow to build
- **Compound-risk logic:** plain JS/Python rule engine + a lightweight anomaly score (simple z-score or isolation-forest-style threshold on rolling windows) — do NOT try to train a real ML model from scratch; a well-reasoned rules+statistics engine is more reliable to demo than a flaky trained model
- **RAG layer:** no need for a vector database — with only 10–20 curated documents, keyword/TF-IDF matching (or a simple embedding call to an available LLM API) over a local JSON corpus is sufficient and far faster to build reliably
- **LLM calls (optional, for natural-language alert explanations and the draft incident report):** use the Anthropic API if a key is available in the environment; otherwise use well-written template strings so the demo never depends on an external API being up
- **State/data flow:** keep everything in one Repl, one database file, no external services required to run the demo offline if needed

---

## 4. PAGES & USER FLOW

1. **Dashboard (Home)** — landing page after login. Shows the 2D plant heatmap front and center, a live alert feed sidebar, and top-line stats (active permits, zones at risk, current sensitivity setting). Entry point to everything else.
2. **Zone Detail (modal or side panel, not a full page)** — opens when a zone on the heatmap is clicked. Shows live sensor charts for that zone, active permits in that zone, the compound-risk score breakdown (what triggered it), and the RAG citation if an alert is active.
3. **Scenario Runner** — a dedicated page/tab with a "Run Vizag-style Scenario" button. Displays the before/after comparison: single-sensor baseline timeline vs. compound-engine timeline, lead-time delta, and false-negative counts. This is the page built specifically to satisfy the evaluation rubric — treat it as a first-class page, not an afterthought.
4. **Alert Log** — table of all alerts raised/dismissed with timestamps, zone, severity, and citation. Includes the sensitivity-feedback indicator.
5. **Emergency Response View** — appears automatically (as a modal/banner) when a critical compound alert fires; shows the draft evacuation notice + preliminary incident report with "Send / Dismiss" buttons.
6. **Permit Log** (nice-to-have page) — table of all permits with zone/time overlap highlighting.

**Navigation:** persistent top nav bar with tabs: Dashboard | Scenario Runner | Alert Log | Permits. Zone Detail is a panel/modal reachable only from the Dashboard heatmap, not a separate nav item.

---

## 5. UI & DESIGN INSTRUCTIONS

- **Color scheme:** dark, control-room aesthetic — near-black background (#0B0F14), slate panels (#151B23), risk colors follow a clear traffic-light scale: safe = emerald (#10B981), watch = amber (#F59E0B), elevated = orange (#F97316), critical = red (#EF4444). Use a single accent color (electric blue, #3B82F6) for interactive elements and citations.
- **Fonts:** Inter or IBM Plex Sans for UI text; a monospace font (JetBrains Mono or Roboto Mono) for sensor readings, timestamps, and log entries — reinforces the "industrial telemetry" feel.
- **Layout style:** dense but organized — this is a monitoring tool, not a marketing page. Use a grid layout with clear panel borders, generous use of small caps labels for metric names, and real-time-updating numbers with subtle transition animations (no bouncy/playful motion).
- **Key UI components:**
  - Heatmap zones should pulse subtly when risk level changes
  - Alerts should slide in from the side with a brief highlight flash, not a jarring popup
  - Citations should render as a small bordered "quote card" with a source tag (e.g., "OISD-STD-XXX §4.2")
  - Use badges/pills for severity levels, permit types, and alert status
- Must look polished and modern out of the box — avoid default unstyled browser components; style every button, input, and table.

---

## 6. DATA & APIS

### Data models (SQLite schema)

**zones**
- id, name, x_coords (for SVG polygon), hazard_class (e.g., "confined_space", "hot_work_adjacent")

**sensor_readings**
- id, zone_id, timestamp, gas_lel_pct, co_ppm, temperature_c, vibration

**permits**
- id, zone_id, type (hot_work / confined_space / electrical), status, start_time, end_time, issued_by

**shift_events**
- id, timestamp, shift_name (day/night), event_type (changeover, handover_note)

**alerts**
- id, zone_id, timestamp, model_source (single_sensor / compound), severity, score, explanation_text, citation_id, dismissed (bool)

**incident_regulatory_corpus** (static JSON, loaded at startup — not user-editable)
- id, source_type (OISD / Factory Act / Incident Summary), title, excerpt_text, tags (e.g., "gas", "hot_work", "confined_space")

### APIs
No external live APIs are required — this is a self-contained simulation. If an LLM API key is available in the Replit environment, optionally call it for:
- Turning the rule-engine's raw trigger conditions into a natural-language alert explanation
- Drafting the evacuation notice / incident report text

If no LLM key is available, use clearly written template-based text generation as a fallback so the app works standalone.

### Mock/dummy data to pre-populate
- 6–8 zones representing a simplified steel-plant layout (e.g., Coke Oven Battery, Blast Furnace, Blower House, Gas Cleaning Plant, Storage Yard, Control Room, Maintenance Bay, Loading Dock)
- 24 hours of pre-generated synthetic sensor history per zone, with one zone pre-loaded with the "injected Vizag-style" anomaly pattern (gradual LEL rise + a hot-work permit issued in the same zone partway through)
- 10–20 real curated regulatory/incident excerpts (OISD guideline excerpts, Factory Act provisions, and short public summaries of the Vizag Steel Plant coke-oven incident and the LG Polymers Vizag gas leak) stored as static JSON — write these as short, factual, non-verbatim paraphrased summaries, not copied text from any source
- A handful of realistic permit records with at least one deliberately engineered conflict (two overlapping permits, same zone, one raising gas risk)

---

## 7. STEP-BY-STEP BUILD INSTRUCTIONS FOR REPLIT AGENT

1. Scaffold a new Repl with a React (Vite) + Tailwind frontend and a Node.js/Express backend in the same project, communicating over a local API + WebSocket (Socket.IO) connection.
2. Set up SQLite with the schema above (zones, sensor_readings, permits, shift_events, alerts). Seed it with the 6–8 zones and the static regulatory/incident corpus (as JSON, not a DB table).
3. Build the synthetic data generator: a server-side loop that appends new sensor_readings every 3–5 seconds per zone, with realistic small random noise, and includes a pre-scripted "anomaly injection" sequence for one designated zone (gradually rising LEL over ~5–10 minutes of simulated time) plus a matching hot-work permit inserted partway through that sequence.
4. Implement the single-sensor baseline model: a simple threshold/z-score check on gas_lel_pct and co_ppm per zone, producing a risk score 0–100 and a timestamp the first time it crosses a "watch" threshold.
5. Implement the compound-risk engine: combines the same sensor score with a permit-conflict check (active hot-work/confined-space permit in a zone with rising gas trend) and a shift-context weight (e.g., changeover periods get a slight risk multiplier since handoff errors are more likely). Output a separate risk score and its own first-crossing timestamp.
6. Build the alert pipeline: whenever either model crosses its threshold, write a row to `alerts` with model_source, score, and a generated explanation_text (rule-based template, or LLM-generated if a key is present). For compound-engine alerts only, attach the best-matching citation from the static corpus (simple keyword/tag match against the zone's hazard_class and the current trigger conditions is sufficient — no vector DB needed).
7. Build the Dashboard page: 2D SVG plant layout with zones colored by current live compound-risk score, a live alert feed sidebar (newest first), and top-line stat cards.
8. Build the Zone Detail panel: clicking a zone opens a side panel with live sensor line charts (Recharts), active permits for that zone, and the current alert's explanation + citation if present.
9. Build the Scenario Runner page: a "Run Vizag-style Scenario" button that replays the pre-scripted anomaly sequence at accelerated speed and displays both models' flag timestamps side by side, the lead-time delta in minutes, and a false-negative/true-positive tally across a small fixed set of injected test scenarios (aim for at least 3–5 scenarios, not just one, so the accuracy comparison looks credible).
10. Build the Alert Log page: a sortable/filterable table of all alerts with a dismiss action; dismissing an alert should visibly nudge a displayed "sensitivity" number, to represent the feedback-loop concept honestly without needing real online learning.
11. Build the Emergency Response modal: triggered automatically when a compound alert reaches "critical" severity, showing a draft evacuation notice and preliminary incident report (template or LLM-generated), clearly labeled as a draft awaiting human approval, with Send/Dismiss buttons that update local state only.
12. Build the Permit Log page (if time remains) showing all permits with visual highlighting of any zone/time overlaps.
13. Apply the dark control-room styling throughout: color tokens, fonts, badges, citation cards, and subtle pulse/slide animations as described in the UI section.
14. Add a simple single-user login screen (hardcoded demo credentials are fine) purely for polish — do not build real auth.
15. Test the full flow end-to-end: start the app fresh, let the generator run, trigger the Scenario Runner, confirm the compound engine visibly flags before the single-sensor baseline, confirm the citation and emergency draft both render correctly, and confirm the Alert Log and Zone Detail views reflect the same data consistently.
16. Write a short in-app "About / Judging Criteria" footer or panel that explicitly states, in one line each: compound-risk accuracy vs. baseline (with the numbers from the Scenario Runner), lead-time achieved, regulatory citations used, and false-negative reduction — so judges can find these numbers in seconds without asking.
