import type { AQIPresetCategory } from '../types/vayucare.ts';
import { PM25_PER_CIGARETTE_UG_M3 } from '../constants/airQualityData.ts';
import { classifyAqiCategory, estimatePm25FromAqi } from './airQualityMath.ts';

/** Visual styling and health risk metadata for an AQI badge. */
export interface AqiBadgeMeta {
  category: AQIPresetCategory;
  label: string;
  pm25EstimateUgM3: number;
  cigaretteEquivalentPerDay: number;
  bgClass: string;
  textClass: string;
  borderClass: string;
  riskSummary: string;
}

const CATEGORY_BADGE_STYLES: Record<
  AQIPresetCategory,
  Pick<AqiBadgeMeta, 'label' | 'bgClass' | 'textClass' | 'borderClass' | 'riskSummary'>
> = {
  Moderate: {
    label: 'Moderate Air Quality',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-800',
    borderClass: 'border-emerald-200',
    riskSummary: 'Breathing discomfort possible for people with asthma or lung conditions.',
  },
  Poor: {
    label: 'Poor Air Quality',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-900',
    borderClass: 'border-amber-300',
    riskSummary: 'Breathing discomfort to most people on prolonged outdoor exposure.',
  },
  Severe: {
    label: 'Severe Winter Smog',
    bgClass: 'bg-orange-50',
    textClass: 'text-orange-900',
    borderClass: 'border-orange-300',
    riskSummary: 'Respiratory illness risk on prolonged exposure; affects healthy lungs too.',
  },
  Hazardous: {
    label: 'Hazardous Emergency',
    bgClass: 'bg-red-50',
    textClass: 'text-red-900',
    borderClass: 'border-red-300',
    riskSummary: 'Acute health alert: stay indoors with sealed ventilation and HEPA filtration.',
  },
};

/**
 * Computes AQI severity badge classes, PM2.5 estimate, and cigarette equivalence.
 */
export function getAqiBadgeMeta(
  aqi: number,
  livePm25UgM3?: number | null
): AqiBadgeMeta {
  const category = classifyAqiCategory(aqi);
  const pm25EstimateUgM3 = estimatePm25FromAqi(aqi, livePm25UgM3);
  const cigaretteEquivalentPerDay = Number(
    (pm25EstimateUgM3 / PM25_PER_CIGARETTE_UG_M3).toFixed(1)
  );

  return {
    category,
    pm25EstimateUgM3,
    cigaretteEquivalentPerDay,
    ...CATEGORY_BADGE_STYLES[category],
  };
}
