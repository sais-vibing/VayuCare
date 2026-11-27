import type {
  AQIPresetCategory,
  CommuteMode,
  HomeType,
  PurifierStatus,
  QuickDemoPreset,
  VulnerabilityTag,
} from '../types/vayucare.ts';

/** Minimum selectable and clamped AQI value. */
export const AQI_MIN = 10;

/** Maximum selectable and clamped AQI value. */
export const AQI_MAX = 500;

/** Increment step used by the interactive AQI range slider. */
export const AQI_STEP = 5;

/** Approximate PM2.5-to-AQI fallback multiplier when live sensor data is absent. */
export const PM25_ESTIMATE_FACTOR = 0.68;

/** Berkeley Earth baseline: ~22 µg/m³ PM2.5 over 24h ≈ 1 cigarette/day. */
export const PM25_PER_CIGARETTE_UG_M3 = 22;

/** Average adult daily ventilation volume in cubic meters. */
export const DAILY_BREATHING_VOLUME_M3 = 11;

/** Daily inhaled PM2.5 (µg) per cigarette equivalent (22 µg/m³ × 11 m³). */
export const PM25_PER_CIGARETTE_INHALE_UG =
  PM25_PER_CIGARETTE_UG_M3 * DAILY_BREATHING_VOLUME_M3;

/** Maximum practical residential exposure reduction percentage cap. */
export const MAX_EXPOSURE_REDUCTION_PCT = 85;

/** Maximum Eco-Impact Score ceiling. */
export const MAX_ECO_IMPACT_SCORE = 100;

/** Practical floor for effective personal AQI inside urban residences. */
export const MIN_EFFECTIVE_PERSONAL_AQI = 18;

/** Fallback PM10-to-PM2.5 ratio when an API reading omits PM10. */
export const PM10_FALLBACK_RATIO = 1.6;

/** Piecewise linear breakpoint tuple: [cLow, cHigh, iLow, iHigh]. */
export type CpcbBreakpoint = readonly [number, number, number, number];

/** Official Indian CPCB 24-hour PM2.5 NAQI breakpoints (µg/m³). */
export const CPCB_PM25_BREAKPOINTS: readonly CpcbBreakpoint[] = [
  [0, 30, 0, 50],
  [30, 60, 51, 100],
  [60, 90, 101, 200],
  [90, 120, 201, 300],
  [120, 250, 301, 400],
  [250, 500, 401, 500],
];

/** Official Indian CPCB 24-hour PM10 NAQI breakpoints (µg/m³). */
export const CPCB_PM10_BREAKPOINTS: readonly CpcbBreakpoint[] = [
  [0, 50, 0, 50],
  [50, 100, 51, 100],
  [100, 250, 101, 200],
  [250, 350, 201, 300],
  [350, 430, 301, 400],
  [430, 600, 401, 500],
];

/** Major Indian metro coordinates and localized pollution context notes. */
export const MAJOR_INDIAN_CITIES: ReadonlyArray<{
  name: string;
  latitude: number;
  longitude: number;
  corridorNote: string;
}> = [
  { name: 'Delhi NCR', latitude: 28.6139, longitude: 77.209, corridorNote: 'Indo-Gangetic plain winter thermal inversion & crop-residue smoke buildup' },
  { name: 'Mumbai', latitude: 19.076, longitude: 72.8777, corridorNote: 'Coastal construction dust stagnation & slow sea-breeze dispersion' },
  { name: 'Bengaluru', latitude: 12.9716, longitude: 77.5946, corridorNote: 'IT corridor vehicular exhaust & dry-season road dust resuspension' },
  { name: 'Kolkata', latitude: 22.5726, longitude: 88.3639, corridorNote: 'High humidity particulate trapping & winter coal/biomass heating plumes' },
  { name: 'Lucknow', latitude: 26.8467, longitude: 80.9462, corridorNote: 'Shallow boundary layer inversion across central Uttar Pradesh' },
];

/** Quick-select Indian AQI severity bands for What-If smog simulation. */
export const AQI_PRESETS: ReadonlyArray<{
  category: AQIPresetCategory;
  rangeLabel: string;
  representativeAqi: number;
  shortGuidance: string;
}> = [
  { category: 'Moderate', rangeLabel: '101–200', representativeAqi: 150, shortGuidance: 'Limit prolonged outdoor exertion near heavy traffic corridors.' },
  { category: 'Poor', rangeLabel: '201–300', representativeAqi: 245, shortGuidance: 'Wear N95 outdoors; sensitive groups must avoid morning smog hours.' },
  { category: 'Severe', rangeLabel: '301–400', representativeAqi: 350, shortGuidance: 'Keep windows sealed during morning/night inversion; run filtration.' },
  { category: 'Hazardous', rangeLabel: '401–500', representativeAqi: 445, shortGuidance: 'Emergency smog conditions: avoid all outdoor exercise; create a clean room.' },
];

/** Household vulnerability options shared across UI and validation allowlists. */
export const VULNERABILITY_OPTIONS: ReadonlyArray<{
  tag: VulnerabilityTag;
  helper: string;
}> = [
  { tag: 'Infants/Toddlers', helper: '0–5 yrs · Higher breathing rate' },
  { tag: 'Elderly', helper: '60+ yrs · Cardiopulmonary care' },
  { tag: 'Asthma/Respiratory issues', helper: 'Bronchial sensitivity & triggers' },
  { tag: 'Pets', helper: 'Outdoor walks & ground-level dust' },
];

/** Commute mode choices derived from the CommuteMode union. */
export const COMMUTE_OPTIONS: readonly CommuteMode[] = [
  'Car',
  'Two-wheeler',
  'Metro/Bus',
  'Walk/Cycle',
];

/** Residential architecture choices derived from the HomeType union. */
export const HOME_OPTIONS: readonly HomeType[] = ['Apartment', 'Independent House'];

/** Air purifier availability options with user-facing display labels. */
export const PURIFIER_OPTIONS: ReadonlyArray<{ value: PurifierStatus; label: string }> = [
  { value: 'Yes', label: 'Yes (HEPA)' },
  { value: 'No', label: 'No Purifier' },
  { value: 'DIY', label: 'DIY Box-Fan' },
];

/** Preconfigured Indian family demo profiles for instant live evaluation. */
export const QUICK_DEMO_PRESETS: readonly QuickDemoPreset[] = [
  {
    id: 'delhi-smog-emergency',
    label: 'Delhi NCR Family Profile',
    subtitle: 'Apartment · Toddlers & Elderly · Car Commute · HEPA Purifier',
    profile: {
      city: 'Delhi NCR',
      aqi: 320,
      aqiCategory: 'Severe',
      householdTags: ['Infants/Toddlers', 'Elderly'],
      commuteMode: 'Car',
      homeType: 'Apartment',
      purifier: 'Yes',
    },
  },
  {
    id: 'kolkata-diy-asthma',
    label: 'Kolkata Asthma Care Profile',
    subtitle: 'Independent House · Asthma · Metro/Bus · DIY Box-Fan Filter',
    profile: {
      city: 'Kolkata',
      aqi: 260,
      aqiCategory: 'Poor',
      householdTags: ['Asthma/Respiratory issues'],
      commuteMode: 'Metro/Bus',
      homeType: 'Independent House',
      purifier: 'DIY',
    },
  },
  {
    id: 'mumbai-coastal-haze',
    label: 'Mumbai Coastal Commuter',
    subtitle: 'Apartment · Pets & Toddlers · Two-wheeler · No Purifier',
    profile: {
      city: 'Mumbai',
      aqi: 180,
      aqiCategory: 'Moderate',
      householdTags: ['Infants/Toddlers', 'Pets'],
      commuteMode: 'Two-wheeler',
      homeType: 'Apartment',
      purifier: 'No',
    },
  },
  {
    id: 'bengaluru-commuter',
    label: 'Bengaluru Active Cyclist',
    subtitle: 'Apartment · Active Commuter · Walk/Cycle · No Purifier',
    profile: {
      city: 'Bengaluru',
      aqi: 135,
      aqiCategory: 'Moderate',
      householdTags: [],
      commuteMode: 'Walk/Cycle',
      homeType: 'Apartment',
      purifier: 'No',
    },
  },
];
