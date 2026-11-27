import type {
  AQIPresetCategory,
  DirectImpactInsight,
  LiveAqiTelemetry,
  QuickDemoPreset,
  SimulatorHabit,
  SimulatorMetrics,
  UserAirProfile,
} from '../types/vayucare.ts';

export const MAJOR_INDIAN_CITIES: Array<{
  name: string;
  latitude: number;
  longitude: number;
  corridorNote: string;
}> = [
  {
    name: 'Delhi NCR',
    latitude: 28.6139,
    longitude: 77.209,
    corridorNote: 'Indo-Gangetic plain winter thermal inversion & crop-residue smoke buildup',
  },
  {
    name: 'Mumbai',
    latitude: 19.076,
    longitude: 72.8777,
    corridorNote: 'Coastal construction dust stagnation & slow sea-breeze dispersion',
  },
  {
    name: 'Bengaluru',
    latitude: 12.9716,
    longitude: 77.5946,
    corridorNote: 'IT corridor vehicular exhaust & dry-season road dust resuspension',
  },
  {
    name: 'Kolkata',
    latitude: 22.5726,
    longitude: 88.3639,
    corridorNote: 'High humidity particulate trapping & winter coal/biomass heating plumes',
  },
  {
    name: 'Lucknow',
    latitude: 26.8467,
    longitude: 80.9462,
    corridorNote: 'Shallow boundary layer inversion across central Uttar Pradesh',
  },
];

export const AQI_PRESETS: Array<{
  category: AQIPresetCategory;
  rangeLabel: string;
  representativeAqi: number;
  shortGuidance: string;
}> = [
  {
    category: 'Moderate',
    rangeLabel: '101–200',
    representativeAqi: 150,
    shortGuidance: 'Limit prolonged outdoor exertion near heavy traffic corridors.',
  },
  {
    category: 'Poor',
    rangeLabel: '201–300',
    representativeAqi: 245,
    shortGuidance: 'Wear N95 outdoors; sensitive groups must avoid morning smog hours.',
  },
  {
    category: 'Severe',
    rangeLabel: '301–400',
    representativeAqi: 350,
    shortGuidance: 'Keep windows sealed during morning/night inversion; run filtration.',
  },
  {
    category: 'Hazardous',
    rangeLabel: '401–500',
    representativeAqi: 445,
    shortGuidance: 'Emergency smog conditions: avoid all outdoor exercise; create a clean room.',
  },
];

export const QUICK_DEMO_PRESETS: QuickDemoPreset[] = [
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

export function classifyAqiCategory(aqi: number): AQIPresetCategory {
  const clamped = Math.max(0, Math.min(500, Math.round(aqi)));
  if (clamped <= 200) return 'Moderate';
  if (clamped <= 300) return 'Poor';
  if (clamped <= 400) return 'Severe';
  return 'Hazardous';
}

function interpolateAqiSubIndex(
  conc: number,
  cLow: number,
  cHigh: number,
  iLow: number,
  iHigh: number
): number {
  return Math.round(((iHigh - iLow) / (cHigh - cLow)) * (conc - cLow) + iLow);
}

/**
 * Computes Indian CPCB National AQI (NAQI) from real PM2.5 and PM10 concentrations (µg/m³).
 */
export function calculateIndianAqiFromPollutants(pm25: number, pm10: number): number {
  const safePm25 = Math.max(0, pm25);
  const safePm10 = Math.max(0, pm10);

  let subPm25 = 0;
  if (safePm25 <= 30) {
    subPm25 = interpolateAqiSubIndex(safePm25, 0, 30, 0, 50);
  } else if (safePm25 <= 60) {
    subPm25 = interpolateAqiSubIndex(safePm25, 30, 60, 51, 100);
  } else if (safePm25 <= 90) {
    subPm25 = interpolateAqiSubIndex(safePm25, 60, 90, 101, 200);
  } else if (safePm25 <= 120) {
    subPm25 = interpolateAqiSubIndex(safePm25, 90, 120, 201, 300);
  } else if (safePm25 <= 250) {
    subPm25 = interpolateAqiSubIndex(safePm25, 120, 250, 301, 400);
  } else {
    subPm25 = interpolateAqiSubIndex(Math.min(500, safePm25), 250, 500, 401, 500);
  }

  let subPm10 = 0;
  if (safePm10 <= 50) {
    subPm10 = interpolateAqiSubIndex(safePm10, 0, 50, 0, 50);
  } else if (safePm10 <= 100) {
    subPm10 = interpolateAqiSubIndex(safePm10, 50, 100, 51, 100);
  } else if (safePm10 <= 250) {
    subPm10 = interpolateAqiSubIndex(safePm10, 100, 250, 101, 200);
  } else if (safePm10 <= 350) {
    subPm10 = interpolateAqiSubIndex(safePm10, 250, 350, 201, 300);
  } else if (safePm10 <= 430) {
    subPm10 = interpolateAqiSubIndex(safePm10, 350, 430, 301, 400);
  } else {
    subPm10 = interpolateAqiSubIndex(Math.min(600, safePm10), 430, 600, 401, 500);
  }

  return Math.max(10, Math.min(500, Math.max(subPm25, subPm10)));
}

/**
 * Fetches real-time PM2.5, PM10, US AQI, and Indian AQI from the public Open-Meteo Air Quality API.
 */
export async function fetchLiveCityAqi(cityName: string): Promise<LiveAqiTelemetry> {
  const trimmed = cityName.trim();
  if (!trimmed) {
    throw new Error('Please enter a city name before fetching live AQI.');
  }

  const matchedMajor = MAJOR_INDIAN_CITIES.find(
    (c) => c.name.toLowerCase() === trimmed.toLowerCase()
  );

  let latitude: number;
  let longitude: number;
  let resolvedName: string;

  if (matchedMajor) {
    latitude = matchedMajor.latitude;
    longitude = matchedMajor.longitude;
    resolvedName = matchedMajor.name;
  } else {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      trimmed
    )}&count=1&language=en&format=json`;
    const geoRes = await fetch(geoUrl);
    if (!geoRes.ok) {
      throw new Error(`Open-Meteo geocoding lookup failed (HTTP ${geoRes.status}).`);
    }
    const geoData = await geoRes.json();
    const firstResult = geoData?.results?.[0];
    if (!firstResult || typeof firstResult.latitude !== 'number') {
      throw new Error(`Could not locate coordinates for "${trimmed}" via Open-Meteo.`);
    }
    latitude = firstResult.latitude;
    longitude = firstResult.longitude;
    resolvedName = firstResult.name || trimmed;
  }

  const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=pm2_5,pm10,us_aqi&timezone=auto`;
  const aqRes = await fetch(aqUrl);
  if (!aqRes.ok) {
    throw new Error(`Open-Meteo Air Quality API returned HTTP ${aqRes.status}.`);
  }

  const aqData = await aqRes.json();
  const current = aqData?.current;
  if (!current || (typeof current.pm2_5 !== 'number' && typeof current.us_aqi !== 'number')) {
    throw new Error('Open-Meteo response did not contain current PM2.5 or AQI measurements.');
  }

  const pm25 = Number((current.pm2_5 ?? 0).toFixed(1));
  const pm10 = Number((current.pm10 ?? pm25 * 1.6).toFixed(1));
  const usAqi = Math.round(current.us_aqi ?? calculateIndianAqiFromPollutants(pm25, pm10));
  const indianAqi = calculateIndianAqiFromPollutants(pm25, pm10);

  return {
    city: resolvedName,
    latitude: Number(latitude.toFixed(4)),
    longitude: Number(longitude.toFixed(4)),
    pm25,
    pm10,
    usAqi,
    indianAqi,
    fetchedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    source: 'open-meteo',
  };
}

export function getAqiBadgeMeta(
  aqi: number,
  livePm25UgM3?: number | null
): {
  category: AQIPresetCategory;
  label: string;
  pm25EstimateUgM3: number;
  cigaretteEquivalentPerDay: number;
  bgClass: string;
  textClass: string;
  borderClass: string;
  riskSummary: string;
} {
  const category = classifyAqiCategory(aqi);
  const pm25EstimateUgM3 =
    typeof livePm25UgM3 === 'number' && livePm25UgM3 > 0
      ? Math.round(livePm25UgM3)
      : Math.round(aqi * 0.68);
  const cigaretteEquivalentPerDay = Number((pm25EstimateUgM3 / 22).toFixed(1));

  switch (category) {
    case 'Moderate':
      return {
        category,
        label: 'Moderate Air Quality',
        pm25EstimateUgM3,
        cigaretteEquivalentPerDay,
        bgClass: 'bg-emerald-50',
        textClass: 'text-emerald-800',
        borderClass: 'border-emerald-200',
        riskSummary: 'Breathing discomfort possible for people with asthma or lung conditions.',
      };
    case 'Poor':
      return {
        category,
        label: 'Poor Air Quality',
        pm25EstimateUgM3,
        cigaretteEquivalentPerDay,
        bgClass: 'bg-amber-50',
        textClass: 'text-amber-900',
        borderClass: 'border-amber-300',
        riskSummary: 'Breathing discomfort to most people on prolonged outdoor exposure.',
      };
    case 'Severe':
      return {
        category,
        label: 'Severe Winter Smog',
        pm25EstimateUgM3,
        cigaretteEquivalentPerDay,
        bgClass: 'bg-orange-50',
        textClass: 'text-orange-900',
        borderClass: 'border-orange-300',
        riskSummary: 'Respiratory illness risk on prolonged exposure; affects healthy lungs too.',
      };
    case 'Hazardous':
      return {
        category,
        label: 'Hazardous Emergency',
        pm25EstimateUgM3,
        cigaretteEquivalentPerDay,
        bgClass: 'bg-red-50',
        textClass: 'text-red-900',
        borderClass: 'border-red-300',
        riskSummary: 'Acute health alert: stay indoors with sealed ventilation and HEPA filtration.',
      };
  }
}

export function validateProfileInput(profile: UserAirProfile): {
  valid: boolean;
  error?: string;
} {
  const trimmedCity = profile.city.trim();
  if (!trimmedCity) {
    return { valid: false, error: 'Please enter an Indian city or neighbourhood name.' };
  }
  if (trimmedCity.length > 300) {
    return { valid: false, error: 'City or neighbourhood name must be 300 characters or fewer.' };
  }
  if (Number.isNaN(profile.aqi) || profile.aqi < 10 || profile.aqi > 500) {
    return { valid: false, error: 'AQI value must be between 10 and 500.' };
  }
  return { valid: true };
}

export function calculateSimulatorImpact(
  aqi: number,
  habits: SimulatorHabit[],
  enabledIds: Record<string, boolean>
): SimulatorMetrics {
  const safeAqi = Math.max(10, Math.min(500, Math.round(aqi)));
  let totalExposureReductionPct = 0;
  let dailyPm25AvoidedUg = 0;
  let dailyCo2SavedGrams = 0;
  let ecoImpactScore = 0;
  let activeHabitCount = 0;

  for (const habit of habits) {
    if (enabledIds[habit.id]) {
      activeHabitCount += 1;
      totalExposureReductionPct += habit.exposureReductionPct;
      dailyPm25AvoidedUg += habit.pm25SavedUg;
      dailyCo2SavedGrams += habit.co2SavedGrams;
      ecoImpactScore += habit.ecoScorePoints;
    }
  }

  const cappedReductionPct = Math.min(85, totalExposureReductionPct);
  const cappedEcoScore = Math.min(100, ecoImpactScore);
  const effectivePersonalAqi = Math.max(
    18,
    Math.round(safeAqi * (1 - cappedReductionPct / 100))
  );
  // 22 ug/m3 over 11 m3 daily breathing volume = ~242 ug inhaled PM2.5 per cigarette equivalent
  const equivalentCigarettesAvoided = Number(
    (dailyPm25AvoidedUg / 242).toFixed(1)
  );

  return {
    activeHabitCount,
    totalHabitCount: habits.length,
    totalExposureReductionPct: cappedReductionPct,
    effectivePersonalAqi,
    dailyPm25AvoidedUg,
    dailyCo2SavedGrams,
    ecoImpactScore: cappedEcoScore,
    equivalentCigarettesAvoided,
  };
}

/**
 * Synchronizes Section 04 (Direct Impact Insights) with Section 3 (Interactive What-If Impact Simulator)
 * so that Inhaled PM2.5 Reduction, Cigarette-Smoke Equivalence Avoided, and CO2e saved match dynamically.
 */
export function buildSyncedDirectImpactInsights(
  aqi: number,
  city: string,
  simulatorMetrics: SimulatorMetrics,
  livePm25UgM3?: number | null
): DirectImpactInsight[] {
  const safeAqi = Math.max(10, Math.min(500, Math.round(aqi)));
  const meta = getAqiBadgeMeta(safeAqi, livePm25UgM3);
  const baseInhaledUg = Math.round(meta.pm25EstimateUgM3 * 11);
  const remainingInhaledUg = Math.max(
    0,
    baseInhaledUg - simulatorMetrics.dailyPm25AvoidedUg
  );
  const avoidedPrefix =
    simulatorMetrics.dailyPm25AvoidedUg > 0
      ? `-${simulatorMetrics.dailyPm25AvoidedUg.toLocaleString('en-IN')}`
      : '0';

  return [
    {
      metricLabel: 'Daily Inhaled PM2.5 Reduction',
      quantifiedValue: avoidedPrefix,
      unit: 'µg PM2.5 / day per person',
      explanation: `With ${simulatorMetrics.activeHabitCount} of ${simulatorMetrics.totalHabitCount} simulator habits active (-${simulatorMetrics.totalExposureReductionPct}% exposure), daily lung particulate intake drops from ~${baseInhaledUg.toLocaleString('en-IN')} µg to ~${remainingInhaledUg.toLocaleString('en-IN')} µg.`,
      category: 'Personal Health',
    },
    {
      metricLabel: 'Cigarette-Smoke Equivalence Avoided',
      quantifiedValue: `${simulatorMetrics.equivalentCigarettesAvoided}`,
      unit: 'fewer cigarettes / day eq.',
      explanation: `At AQI ${safeAqi} in ${city}, unfiltered outdoor air equals ~${meta.cigaretteEquivalentPerDay} cigarettes/day. Your active habits avoid ${simulatorMetrics.equivalentCigarettesAvoided} cigarettes/day of toxic particulate load.`,
      category: 'Personal Health',
    },
    {
      metricLabel: 'Household Carbon & Tailpipe Footprint',
      quantifiedValue: `${simulatorMetrics.dailyCo2SavedGrams.toLocaleString('en-IN')} g`,
      unit: 'CO₂e saved / day',
      explanation: `Your active clean-air and commute habits prevent ${simulatorMetrics.dailyCo2SavedGrams.toLocaleString('en-IN')} g (${(simulatorMetrics.dailyCo2SavedGrams / 1000).toFixed(2)} kg) of daily urban greenhouse and tailpipe emissions.`,
      category: 'Community Environment',
    },
    {
      metricLabel: 'Eco-Impact & Smog Resilience Score',
      quantifiedValue: `${simulatorMetrics.ecoImpactScore} / 100`,
      unit: `Effective AQI ${simulatorMetrics.effectivePersonalAqi}`,
      explanation: `Achieves a ${simulatorMetrics.totalExposureReductionPct}% personal exposure cut (Effective AQI ${simulatorMetrics.effectivePersonalAqi}) and reduces localized residential smoke exposure.`,
      category: 'Community Environment',
    },
  ];
}
