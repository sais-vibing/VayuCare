export type AQIPresetCategory = 'Moderate' | 'Poor' | 'Severe' | 'Hazardous';

export type VulnerabilityTag =
  | 'Infants/Toddlers'
  | 'Elderly'
  | 'Asthma/Respiratory issues'
  | 'Pets';

export type CommuteMode = 'Car' | 'Two-wheeler' | 'Metro/Bus' | 'Walk/Cycle';

export type HomeType = 'Apartment' | 'Independent House';

export type PurifierStatus = 'Yes' | 'No' | 'DIY';

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

export interface TimeBlockRoutine {
  period: 'Morning' | 'Afternoon' | 'Evening';
  timeWindow: string;
  outdoorSafetyStatus: string;
  headline: string;
  actions: string[];
  vulnerableNote: string;
}

export interface IndoorAirHack {
  id: string;
  title: string;
  category: 'Ventilation' | 'Filtration' | 'Cleaning' | 'Source Control';
  costTag: string;
  summary: string;
  steps: string[];
}

export interface SustainableAlternative {
  id: string;
  title: string;
  currentHabit: string;
  recommendedSwap: string;
  cityContext: string;
  emissionSavingText: string;
}

export interface DirectImpactInsight {
  metricLabel: string;
  quantifiedValue: string;
  unit: string;
  explanation: string;
  category: 'Personal Health' | 'Community Environment';
}

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

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface QuickDemoPreset {
  id: string;
  label: string;
  subtitle: string;
  profile: UserAirProfile;
}
