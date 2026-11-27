import type {
  CleanAirPlan,
  IndoorAirHack,
  SimulatorHabit,
  SustainableAlternative,
  TimeBlockRoutine,
  UserAirProfile,
} from '../src/types/vayucare.ts';
import {
  buildInitialEnabledHabits,
  buildSyncedDirectImpactInsights,
  calculateSimulatorImpact,
  estimatePm25FromAqi,
} from '../src/utils/airQualityMath.ts';
import { sanitizePlainText } from '../src/utils/securityValidation.ts';

/** System instruction sent with `/api/generate-plan` requests. */
export const PLAN_SYSTEM_INSTRUCTION =
  'You are VayuCare, an Indian urban air quality assistant for winter smog and indoor air quality. Return ONLY a valid compact JSON object matching the requested structure with no markdown fences.';

const ROUTINE_PERIODS: ReadonlySet<TimeBlockRoutine['period']> = new Set(['Morning', 'Afternoon', 'Evening']);
const HACK_CATEGORIES: ReadonlySet<IndoorAirHack['category']> = new Set(['Ventilation', 'Filtration', 'Cleaning', 'Source Control']);
const HABIT_CATEGORIES: ReadonlySet<SimulatorHabit['category']> = new Set(['Indoor Air', 'Commute & Masking', 'Community Eco']);

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, Math.round(num)));
}

function sanitizeStringList(value: unknown, fallbackItem: string): string[] {
  if (!Array.isArray(value)) return [fallbackItem];
  const cleaned = value.map((item) => sanitizePlainText(item)).filter(Boolean);
  return cleaned.length > 0 ? cleaned : [fallbackItem];
}

function sanitizeRoutineItems(items: unknown[]): TimeBlockRoutine[] {
  const defaults: TimeBlockRoutine['period'][] = ['Morning', 'Afternoon', 'Evening'];
  return items.map((entry, idx) => {
    const row = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
    const period = ROUTINE_PERIODS.has(row.period as TimeBlockRoutine['period'])
      ? (row.period as TimeBlockRoutine['period'])
      : defaults[idx % defaults.length];
    return {
      period,
      timeWindow: sanitizePlainText(row.timeWindow) || 'Daytime',
      outdoorSafetyStatus: sanitizePlainText(row.outdoorSafetyStatus) || 'Limit Exposure',
      headline: sanitizePlainText(row.headline) || `${period} Clean-Air Protocol`,
      actions: sanitizeStringList(row.actions, 'Keep windows sealed during peak smog.'),
      vulnerableNote: sanitizePlainText(row.vulnerableNote) || 'Monitor symptoms closely.',
    };
  });
}

function sanitizeIndoorHacks(items: unknown[]): IndoorAirHack[] {
  const defaults: IndoorAirHack['category'][] = ['Ventilation', 'Filtration', 'Cleaning', 'Source Control'];
  return items.map((entry, idx) => {
    const row = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
    const category = HACK_CATEGORIES.has(row.category as IndoorAirHack['category'])
      ? (row.category as IndoorAirHack['category'])
      : defaults[idx % defaults.length];
    return {
      id: sanitizePlainText(row.id) || `hack-${idx + 1}`,
      title: sanitizePlainText(row.title) || `${category} Protection`,
      category,
      costTag: sanitizePlainText(row.costTag) || 'Low Cost',
      summary: sanitizePlainText(row.summary) || 'Reduces indoor particulate infiltration.',
      steps: sanitizeStringList(row.steps, 'Apply consistently during smog hours.'),
    };
  });
}

function sanitizeAlternatives(items: unknown[], city: string): SustainableAlternative[] {
  return items.map((entry, idx) => {
    const row = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
    return {
      id: sanitizePlainText(row.id) || `alt-${idx + 1}`,
      title: sanitizePlainText(row.title) || `Low-Emission Swap ${idx + 1}`,
      currentHabit: sanitizePlainText(row.currentHabit) || 'Standard daily routine',
      recommendedSwap: sanitizePlainText(row.recommendedSwap) || 'Shift to cleaner alternative',
      cityContext: sanitizePlainText(row.cityContext) || `Calibrated for ${city}`,
      emissionSavingText: sanitizePlainText(row.emissionSavingText) || 'Cuts daily PM2.5 & CO₂e',
    };
  });
}

function sanitizeSimulatorHabits(items: unknown[]): SimulatorHabit[] {
  const defaults: SimulatorHabit['category'][] = ['Indoor Air', 'Commute & Masking', 'Community Eco'];
  return items.map((entry, idx) => {
    const row = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
    const category = HABIT_CATEGORIES.has(row.category as SimulatorHabit['category'])
      ? (row.category as SimulatorHabit['category'])
      : defaults[idx % defaults.length];
    return {
      id: sanitizePlainText(row.id) || `habit-${idx + 1}`,
      label: sanitizePlainText(row.label) || `Clean-Air Habit ${idx + 1}`,
      category,
      exposureReductionPct: clampInt(row.exposureReductionPct, 1, 40, 12),
      pm25SavedUg: clampInt(row.pm25SavedUg, 0, 10_000, 150),
      co2SavedGrams: clampInt(row.co2SavedGrams, 0, 50_000, 200),
      ecoScorePoints: clampInt(row.ecoScorePoints, 1, 40, 15),
      defaultEnabled: Boolean(row.defaultEnabled),
      description: sanitizePlainText(row.description) || 'Reduces daily household PM2.5 exposure.',
    };
  });
}

/**
 * Builds the localized structured JSON prompt for `/api/generate-plan`.
 */
export function buildCleanAirPlanPrompt(profile: UserAirProfile): string {
  const telemetryLine = profile.liveTelemetry
    ? `- Live Open-Meteo Telemetry: PM2.5 = ${profile.liveTelemetry.pm25} µg/m³, PM10 = ${profile.liveTelemetry.pm10} µg/m³, US AQI = ${profile.liveTelemetry.usAqi}, Indian NAQI = ${profile.liveTelemetry.indianAqi} (coords: ${profile.liveTelemetry.latitude}, ${profile.liveTelemetry.longitude})`
    : `- Estimated PM2.5: ~${estimatePm25FromAqi(profile.aqi)} µg/m³`;
  const membersText =
    profile.householdTags.length > 0
      ? profile.householdTags.join(', ')
      : 'General adult household (no specific high-risk tags selected)';
  const vulnTarget = profile.householdTags.length > 0 ? profile.householdTags.join(', ') : 'household members';

  return `Generate a localized, practical Clean Air Action Plan and 6 Interactive What-If Simulator Habits for an Indian household with this exact profile:
- City / Neighbourhood: ${profile.city}
- Current Selected AQI: ${profile.aqi} (${profile.aqiCategory})
${telemetryLine}
- Household Vulnerable Members: ${membersText}
- Primary Daily Commute: ${profile.commuteMode}
- Home Type: ${profile.homeType}
- Air Purifier Availability: ${profile.purifier}

Return ONLY a valid JSON object matching this exact structure (keep every bullet/step under 12 words and every summary/note to 1 short sentence):
{
  "planTitle": "string",
  "cityContextSummary": "string",
  "smogInversionWindow": "string",
  "dailyRoutine": [{ "period": "Morning"|"Afternoon"|"Evening", "timeWindow": "string", "outdoorSafetyStatus": "string", "headline": "string", "actions": ["action 1","action 2"], "vulnerableNote": "string tailored to ${vulnTarget}" }],
  "indoorHacks": [{ "id": "hack-1", "title": "string", "category": "Ventilation"|"Filtration"|"Cleaning"|"Source Control", "costTag": "string", "summary": "string", "steps": ["step 1","step 2"] }],
  "sustainableAlternatives": [{ "id": "alt-1", "title": "string", "currentHabit": "string", "recommendedSwap": "string", "cityContext": "string for ${profile.city}", "emissionSavingText": "string" }],
  "simulatorHabits": [{ "id": "habit-1", "label": "string", "category": "Indoor Air"|"Commute & Masking"|"Community Eco", "exposureReductionPct": 15, "pm25SavedUg": 120, "co2SavedGrams": 450, "ecoScorePoints": 18, "defaultEnabled": true, "description": "1 short sentence" }]
}

Counts required:
- dailyRoutine: exactly 3 items ("Morning", "Afternoon", "Evening") tailored to ${profile.commuteMode}.
- indoorHacks: exactly 4 items ("Ventilation", "Filtration", "Cleaning", "Source Control") tailored to ${profile.homeType} and Purifier=${profile.purifier}.
- sustainableAlternatives: exactly 3 items tailored to ${profile.city} and ${profile.commuteMode}.
- simulatorHabits: exactly 6 items across "Indoor Air", "Commute & Masking", "Community Eco" (exposureReductionPct 6-26, ecoScorePoints 10-22 summing to ~100, pm25SavedUg integer for AQI ${profile.aqi}, co2SavedGrams integer).`;
}

/**
 * Parses, sanitizes, and validates Gemini's JSON response into a synchronized CleanAirPlan.
 */
export function sanitizeAndValidatePlanPayload(rawText: string, profile: UserAirProfile): CleanAirPlan | null {
  const cleaned = rawText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  if (!cleaned) return null;
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;
  if (
    !Array.isArray(parsed.dailyRoutine) ||
    !Array.isArray(parsed.indoorHacks) ||
    !Array.isArray(parsed.sustainableAlternatives) ||
    !Array.isArray(parsed.simulatorHabits)
  ) {
    return null;
  }
  const simulatorHabits = sanitizeSimulatorHabits(parsed.simulatorHabits);
  const initialEnabled = buildInitialEnabledHabits(simulatorHabits);
  const initialMetrics = calculateSimulatorImpact(profile.aqi, simulatorHabits, initialEnabled);
  return {
    planTitle: sanitizePlainText(parsed.planTitle) || `${profile.city} Clean Air Action Plan`,
    cityContextSummary: sanitizePlainText(parsed.cityContextSummary) || `Calibrated for ${profile.city} at AQI ${profile.aqi}.`,
    smogInversionWindow: sanitizePlainText(parsed.smogInversionWindow) || '1:00 PM – 4:00 PM',
    dailyRoutine: sanitizeRoutineItems(parsed.dailyRoutine),
    indoorHacks: sanitizeIndoorHacks(parsed.indoorHacks),
    sustainableAlternatives: sanitizeAlternatives(parsed.sustainableAlternatives, profile.city),
    simulatorHabits,
    directImpactInsights: buildSyncedDirectImpactInsights(profile.aqi, profile.city, initialMetrics, profile.liveTelemetry?.pm25),
    generatedSource: 'gemini-ai',
  };
}

/**
 * Builds the contextual system instruction for multi-turn `/api/ask-vayucare` chat.
 */
export function buildAskVayuCareSystemInstruction(profile?: UserAirProfile): string {
  const telemetry = profile?.liveTelemetry
    ? `\n- Real-Time Open-Meteo Telemetry: PM2.5=${profile.liveTelemetry.pm25} µg/m³, PM10=${profile.liveTelemetry.pm10} µg/m³, US AQI=${profile.liveTelemetry.usAqi}, Indian NAQI=${profile.liveTelemetry.indianAqi}`
    : '';
  const profileSummary = profile
    ? `Current Household Profile:\n- City: ${profile.city}\n- Outdoor AQI: ${profile.aqi} (${profile.aqiCategory})${telemetry}\n- Vulnerable Members: ${profile.householdTags.join(', ') || 'None specified'}\n- Primary Commute: ${profile.commuteMode}\n- Home Type: ${profile.homeType}\n- Air Purifier Availability: ${profile.purifier}`
    : 'Current Household Profile: Not specified.';
  return `You are VayuCare, a concise, empathetic Indian urban air quality and respiratory safety advisor.\n${profileSummary}\nUse the household profile and conversation history above to give genuinely tailored, localized advice. Answer in 3 to 4 crisp plain-text bullet points starting with "• " using practical Indian household tactics (e.g., N95/FFP2 respirator fit, smog inversion hours, ₹100 EPDM window sealing tape, wet mopping vs dry jhadu, DIY box-fan HEPA filters, RWA actions, paediatric/elderly precautions). Do NOT use Markdown asterisks or bold syntax (** or *). Keep total answer under 130 words.`;
}

/**
 * Normalizes Gemini Q&A output into clean, sanitized plain-text bullet lines.
 */
export function formatAskAnswer(rawAnswer: string): string {
  return rawAnswer
    .trim()
    .split('\n')
    .map((line) =>
      sanitizePlainText(
        line.replace(/^\s*[-*]\s+/, '• ').replace(/\*\*(.*?)\*\*/g, '$1').replace(/__(.*?)__/g, '$1')
      )
    )
    .filter(Boolean)
    .join('\n');
}
