import type {
  AQIPresetCategory,
  DirectImpactInsight,
  SimulatorHabit,
  SimulatorMetrics,
} from '../types/vayucare.ts';
import {
  AQI_MAX,
  AQI_MIN,
  CPCB_PM10_BREAKPOINTS,
  CPCB_PM25_BREAKPOINTS,
  DAILY_BREATHING_VOLUME_M3,
  MAX_ECO_IMPACT_SCORE,
  MAX_EXPOSURE_REDUCTION_PCT,
  MIN_EFFECTIVE_PERSONAL_AQI,
  PM25_ESTIMATE_FACTOR,
  PM25_PER_CIGARETTE_INHALE_UG,
  PM25_PER_CIGARETTE_UG_M3,
  type CpcbBreakpoint,
} from '../constants/airQualityData.ts';

/**
 * Classifies a numeric Indian AQI value into one of four severity presets.
 */
export function classifyAqiCategory(aqi: number): AQIPresetCategory {
  const clamped = Math.max(0, Math.min(AQI_MAX, Math.round(aqi)));
  if (clamped <= 200) return 'Moderate';
  if (clamped <= 300) return 'Poor';
  if (clamped <= 400) return 'Severe';
  return 'Hazardous';
}

/**
 * Estimates ambient PM2.5 (µg/m³) from AQI or returns a rounded live reading.
 */
export function estimatePm25FromAqi(
  aqi: number,
  livePm25UgM3?: number | null
): number {
  if (typeof livePm25UgM3 === 'number' && Number.isFinite(livePm25UgM3) && livePm25UgM3 > 0) {
    return Math.round(livePm25UgM3);
  }
  return Math.round(aqi * PM25_ESTIMATE_FACTOR);
}

/**
 * Evaluates a CPCB piecewise linear breakpoint table for a single pollutant.
 */
function computeSubIndexFromBreakpoints(
  concentration: number,
  breakpoints: readonly CpcbBreakpoint[]
): number {
  const safeConc = Math.max(0, concentration);
  const lastBand = breakpoints[breakpoints.length - 1];
  const clampedConc = Math.min(lastBand[1], safeConc);

  for (const [cLow, cHigh, iLow, iHigh] of breakpoints) {
    if (clampedConc <= cHigh) {
      return Math.round(((iHigh - iLow) / (cHigh - cLow)) * (clampedConc - cLow) + iLow);
    }
  }

  return lastBand[3];
}

/**
 * Computes Indian CPCB National AQI (NAQI) from PM2.5 and PM10 concentrations (µg/m³).
 */
export function calculateIndianAqiFromPollutants(pm25: number, pm10: number): number {
  const subPm25 = computeSubIndexFromBreakpoints(pm25, CPCB_PM25_BREAKPOINTS);
  const subPm10 = computeSubIndexFromBreakpoints(pm10, CPCB_PM10_BREAKPOINTS);
  return Math.max(AQI_MIN, Math.min(AQI_MAX, Math.max(subPm25, subPm10)));
}

/**
 * Builds the default enabled-state map from a list of What-If simulator habits.
 */
export function buildInitialEnabledHabits(
  habits: readonly SimulatorHabit[] | null | undefined
): Record<string, boolean> {
  if (!Array.isArray(habits)) {
    return {};
  }
  const map: Record<string, boolean> = {};
  for (const habit of habits) {
    map[habit.id] = Boolean(habit.defaultEnabled);
  }
  return map;
}

/**
 * Calculates aggregated exposure reduction, effective AQI, and eco-impact metrics
 * for the currently toggled simulator habits.
 */
export function calculateSimulatorImpact(
  aqi: number,
  habits: readonly SimulatorHabit[],
  enabledIds: Record<string, boolean>
): SimulatorMetrics {
  const safeAqi = Math.max(AQI_MIN, Math.min(AQI_MAX, Math.round(aqi)));
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

  const cappedReductionPct = Math.min(MAX_EXPOSURE_REDUCTION_PCT, totalExposureReductionPct);
  const cappedEcoScore = Math.min(MAX_ECO_IMPACT_SCORE, ecoImpactScore);
  const effectivePersonalAqi = Math.max(
    MIN_EFFECTIVE_PERSONAL_AQI,
    Math.round(safeAqi * (1 - cappedReductionPct / 100))
  );
  const equivalentCigarettesAvoided = Number(
    (dailyPm25AvoidedUg / PM25_PER_CIGARETTE_INHALE_UG).toFixed(1)
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
 * Synchronizes Section 04 (Direct Impact Insights) with Section 3 (What-If Simulator)
 * so PM2.5 reduction, cigarette equivalence, CO₂e saved, and eco score always match.
 */
export function buildSyncedDirectImpactInsights(
  aqi: number,
  city: string,
  simulatorMetrics: SimulatorMetrics,
  livePm25UgM3?: number | null
): DirectImpactInsight[] {
  const safeAqi = Math.max(AQI_MIN, Math.min(AQI_MAX, Math.round(aqi)));
  const pm25UgM3 = estimatePm25FromAqi(safeAqi, livePm25UgM3);
  const outdoorCigarettes = Number((pm25UgM3 / PM25_PER_CIGARETTE_UG_M3).toFixed(1));
  const baseInhaledUg = Math.round(pm25UgM3 * DAILY_BREATHING_VOLUME_M3);
  const remainingInhaledUg = Math.max(0, baseInhaledUg - simulatorMetrics.dailyPm25AvoidedUg);
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
      explanation: `At AQI ${safeAqi} in ${city}, unfiltered outdoor air equals ~${outdoorCigarettes} cigarettes/day. Your active habits avoid ${simulatorMetrics.equivalentCigarettesAvoided} cigarettes/day of toxic particulate load.`,
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
