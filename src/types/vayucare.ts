/** Indian CPCB NAQI severity categories supported by VayuCare. */
export type AQIPresetCategory = 'Moderate' | 'Poor' | 'Severe' | 'Hazardous';

/** Household respiratory vulnerability groups used to tailor precautions. */
export type VulnerabilityTag =
  | 'Infants/Toddlers'
  | 'Elderly'
  | 'Asthma/Respiratory issues'
  | 'Pets';

/** Primary daily commute modes modeled for exposure and emission swaps. */
export type CommuteMode = 'Car' | 'Two-wheeler' | 'Metro/Bus' | 'Walk/Cycle';

/** Residential building architectures supported for indoor air engineering. */
export type HomeType = 'Apartment' | 'Independent House';

/** Available household indoor air filtration configurations. */
export type PurifierStatus = 'Yes' | 'No' | 'DIY';

/** Real-time particulate and AQI telemetry fetched from Open-Meteo. */
export interface LiveAqiTelemetry {
  city: string;
  latitude: number;
  longitude: number;
  pm25: number;
  pm10: number;
  usAqi: number;
  indianAqi: number;
  fetchedAt: string;
  source: 'open-meteo';
}

/** Complete household exposure profile sent to Gemini and simulator math. */
export interface UserAirProfile {
  city: string;
  aqi: number;
  aqiCategory: AQIPresetCategory;
  householdTags: VulnerabilityTag[];
  commuteMode: CommuteMode;
  homeType: HomeType;
  purifier: PurifierStatus;
  liveTelemetry?: LiveAqiTelemetry | null;
}

/** Single time-blocked daily routine segment (Morning, Afternoon, or Evening). */
export interface TimeBlockRoutine {
  period: 'Morning' | 'Afternoon' | 'Evening';
  timeWindow: string;
  outdoorSafetyStatus: string;
  headline: string;
  actions: string[];
  vulnerableNote: string;
}

/** Practical indoor air quality engineering recommendation. */
export interface IndoorAirHack {
  id: string;
  title: string;
  category: 'Ventilation' | 'Filtration' | 'Cleaning' | 'Source Control';
  costTag: string;
  summary: string;
  steps: string[];
}

/** Localized low-emission lifestyle or commute swap recommendation. */
export interface SustainableAlternative {
  id: string;
  title: string;
  currentHabit: string;
  recommendedSwap: string;
  cityContext: string;
  emissionSavingText: string;
}

/** Quantified health or environmental impact card synced with the simulator. */
export interface DirectImpactInsight {
  metricLabel: string;
  quantifiedValue: string;
  unit: string;
  explanation: string;
  category: 'Personal Health' | 'Community Environment';
}

/** Interactive toggleable habit for the What-If Impact Simulator. */
export interface SimulatorHabit {
  id: string;
  label: string;
  category: 'Indoor Air' | 'Commute & Masking' | 'Community Eco';
  exposureReductionPct: number;
  pm25SavedUg: number;
  co2SavedGrams: number;
  ecoScorePoints: number;
  defaultEnabled: boolean;
  description: string;
}

/** Full 4-pillar Gemini Clean Air Action Plan and simulator habit dataset. */
export interface CleanAirPlan {
  planTitle: string;
  cityContextSummary: string;
  smogInversionWindow: string;
  generatedSource: 'gemini-ai';
  dailyRoutine: TimeBlockRoutine[];
  indoorHacks: IndoorAirHack[];
  sustainableAlternatives: SustainableAlternative[];
  directImpactInsights: DirectImpactInsight[];
  simulatorHabits: SimulatorHabit[];
}

/** Aggregated exposure reduction and eco-impact metrics for active habits. */
export interface SimulatorMetrics {
  activeHabitCount: number;
  totalHabitCount: number;
  totalExposureReductionPct: number;
  effectivePersonalAqi: number;
  dailyPm25AvoidedUg: number;
  dailyCo2SavedGrams: number;
  ecoImpactScore: number;
  equivalentCigarettesAvoided: number;
}

/** Single message turn displayed in the Ask VayuCare chat feed. */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

/** Preconfigured Indian household persona for one-click demos. */
export interface QuickDemoPreset {
  id: string;
  label: string;
  subtitle: string;
  profile: UserAirProfile;
}
