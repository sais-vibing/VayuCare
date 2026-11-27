import type { UserAirProfile } from '../types/vayucare.ts';
import { validateAndSanitizePlanRequest } from './securityValidation.ts';

export {
  AQI_MAX,
  AQI_MIN,
  AQI_PRESETS,
  AQI_STEP,
  COMMUTE_OPTIONS,
  HOME_OPTIONS,
  MAJOR_INDIAN_CITIES,
  PURIFIER_OPTIONS,
  QUICK_DEMO_PRESETS,
  VULNERABILITY_OPTIONS,
} from '../constants/airQualityData.ts';

export {
  buildInitialEnabledHabits,
  buildSyncedDirectImpactInsights,
  calculateIndianAqiFromPollutants,
  calculateSimulatorImpact,
  classifyAqiCategory,
  estimatePm25FromAqi,
} from './airQualityMath.ts';

export { getAqiBadgeMeta, type AqiBadgeMeta } from './aqiBadges.ts';
export { fetchLiveCityAqi, OPEN_METEO_TIMEOUT_MS } from '../services/openMeteoService.ts';

/**
 * Validates a household profile on the client by delegating to the shared strict validator.
 */
export function validateProfileInput(profile: UserAirProfile): {
  valid: boolean;
  error?: string;
} {
  const result = validateAndSanitizePlanRequest(profile);
  return result.valid ? { valid: true } : { valid: false, error: result.error };
}
