# VayuCare — Urban Air Quality & Clean Air Assistant

A responsive, GenAI-powered Urban Air Quality Assistant built with React, TypeScript, Tailwind CSS, the Open-Meteo Air Quality API, and the `@google/genai` SDK to help Indian families and communities navigate severe winter smog and urban air pollution.

---

## 1. Chosen Vertical

**Urban Air Quality & Environmental Health (Indian Household Edition)**

Indian cities experience recurring seasonal smog episodes driven by winter thermal inversion layers, vehicular congestion, construction dust, and evening biomass burning. VayuCare translates real-time pollutant readings into immediate, practical, budget-aware household routines tailored for vulnerable family members (infants/toddlers, elderly parents, people with asthma/respiratory conditions, and pets).

---

## 2. Approach and Logic

VayuCare combines deterministic environmental health engineering with structured generative reasoning:

- **Real-Time Open-Meteo Telemetry:** Queries the public Open-Meteo Geocoding and Air Quality APIs (`https://open-meteo.com`, zero key required) for real-time **PM2.5 (µg/m³)**, **PM10 (µg/m³)**, and **US AQI** for any Indian city or quick-select metro (Delhi NCR, Mumbai, Bengaluru, Kolkata, Lucknow).
- **Indian CPCB NAQI Breakpoints:** Computes the Indian National Air Quality Index (NAQI) directly from live PM2.5 and PM10 sub-indices using Central Pollution Control Board (CPCB) piecewise linear breakpoints (`Moderate`, `Poor`, `Severe`, `Hazardous`).
- **Localized Smog Inversion & Vulnerability Modeling:** Pairs the city's pollution profile with household vulnerability tags (`Infants/Toddlers`, `Elderly`, `Asthma/Respiratory issues`, `Pets`), commute mode (`Car`, `Two-wheeler`, `Metro/Bus`, `Walk/Cycle`), home architecture (`Apartment`, `Independent House`), and filtration setup (`Yes (HEPA)`, `No Purifier`, `DIY Box-Fan`).
- **Dynamic Exposure Math & Cross-Section Synchronization:** Computes effective personal AQI, daily inhaled PM2.5 avoided (µg/day), cigarette-smoke equivalence avoided, daily CO₂e prevented, and Eco-Impact Score dynamically—keeping **Section 04 (Direct Impact Insights)** and **Section 3 (What-If Impact Simulator)** synchronized in real time.
- **Server-Side Gemini Structured Reasoning (`server.ts`):** Handles all `@google/genai` SDK calls on the Express backend (`/api/generate-plan` and `/api/ask-vayucare`) using `process.env.GEMINI_API_KEY` with a strict `responseSchema` so every plan pillar and interactive simulator habit is generated specifically for the user's profile with zero hardcoded mock fallbacks.

---

## 3. How the Solution Works

1. **Live Open-Meteo AQI Fetching (`src/utils/airQualityLogic.ts`):**
   - Clicking a major Indian city chip or **Fetch Live AQI** resolves coordinates and fetches live PM2.5, PM10, and US AQI from Open-Meteo, converting them into Indian CPCB NAQI.
   - The AQI slider and category preset buttons remain fully editable so families can simulate "What-If" winter smog spikes manually.

2. **4-Pillar Clean Air Plan Engine (`POST /api/generate-plan` in `server.ts`):**
   - Invoked by the frontend via `src/services/geminiService.ts` and executed on the Express backend using `@google/genai` and `process.env.GEMINI_API_KEY`.
   - Uses structured JSON output (`responseSchema`) to return:
     - **01. Low-Emission Daily Routine:** Time-blocked Morning, Afternoon, and Evening smog-inversion schedules with commute and vulnerability precautions.
     - **02. Indoor Air Quality Hacks:** Budget-friendly ventilation, HEPA/DIY box-fan filtration, wet-mopping vs. dry sweeping (`jhadu`), and kitchen `tadka` exhaust protocols.
     - **03. Sustainable Lifestyle Alternatives:** City-specific daily swaps (Metro/carpool shifts, RWA electric guard heaters, induction cooking).
     - **04. Direct Impact Insights:** Quantified personal health and community environmental metrics synchronized with the What-If Simulator.
   - Also generates 6 custom household habits for the Interactive Simulator.

3. **Interactive "What-If" Impact Simulator (`src/components/ImpactSimulator.tsx`):**
   - Users toggle Gemini-recommended habits ON or OFF (or use **Enable All Habits** / **Reset Defaults**) to see immediate recalculations of **Daily Exposure Reduction (%)**, **Effective Personal AQI**, **Inhaled PM2.5 Avoided (µg/day)**, **Cigarette Equivalent Saved**, and **Eco-Impact Score (0–100)**.

4. **Multi-Turn Community Q&A (`POST /api/ask-vayucare` in `server.ts`):**
   - Sends the sanitized follow-up question, full prior conversation history, and active household profile + live telemetry to the Express backend, which queries Gemini for concise, actionable answers.
   - Server-side safeguards enforce HTML/script tag stripping, a 300-character max input ceiling, strict enum validation, same-origin CORS checks, and IP-based rate limiting (max 15 requests/minute) with transparent UI error banners instead of silent mock fallbacks.

---

## 4. Assumptions Made

- **CPCB NAQI Severity Breakpoints:** Pollutant sub-indices follow CPCB 24-hour concentration bands for PM2.5 (`0–30`, `30–60`, `60–90`, `90–120`, `120–250`, `250–500 µg/m³`) and PM10 (`0–50`, `50–100`, `100–250`, `250–350`, `350–430`, `430–600 µg/m³`), reporting the dominant sub-index.
- **Cigarette-Smoke Equivalence Baseline:** Uses the Berkeley Earth rule of thumb where breathing **~22 µg/m³ of PM2.5 over 24 hours** (approximately `~242 µg` inhaled across `~11 m³` daily adult ventilation volume) equals **1 cigarette per day**.
- **Household Intervention Reduction Ceiling:** Practical combined exposure reduction from N95 masking, inversion-timed window sealing, wet-mopping, source control, and bedroom HEPA/DIY filtration is capped at **85%** to reflect realistic residential air infiltration.
- **Full-Stack Server Execution:** Express (`server.ts`) serves the React frontend (via Vite middleware in development and `dist/` in production) alongside `/api/generate-plan` and `/api/ask-vayucare`, reading `GEMINI_API_KEY` solely from server environment variables.

---

## 5. Setup & Testing Instructions

### Prerequisites
- Node.js **v22+** and `npm`
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/)

### Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure your local Gemini API key
cp .env.example .env
# Edit .env and replace your_api_key_here with your Gemini API key:
# GEMINI_API_KEY=your_actual_gemini_api_key

# 3. Run automated unit tests (CPCB NAQI, simulator math, input sanitization & rate limiting)
npm test

# 4. Start the local full-stack development server on http://localhost:3000
npm run dev
```

### Build & Type-Check

```bash
npm run lint
npm run build
```
