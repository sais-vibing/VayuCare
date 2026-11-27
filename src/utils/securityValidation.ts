import type {
  AQIPresetCategory,
  CommuteMode,
  HomeType,
  PurifierStatus,
  UserAirProfile,
} from '../types/vayucare.ts';
import {
  AQI_MAX,
  AQI_MIN,
  AQI_PRESETS,
  COMMUTE_OPTIONS,
  HOME_OPTIONS,
  PURIFIER_OPTIONS,
} from '../constants/airQualityData.ts';
import { classifyAqiCategory } from './airQualityMath.ts';
import {
  sanitizeHouseholdTags,
  sanitizeLiveTelemetry,
  sanitizePlainText,
} from './telemetrySanitizers.ts';

export { InMemoryRateLimiter, type RateLimitResult } from './rateLimiter.ts';
export { isSameOriginAllowed } from './originSecurity.ts';
export { ALLOWED_VULNERABILITY_TAGS, sanitizePlainText } from './telemetrySanitizers.ts';

/** Maximum allowed length for free-text city and question inputs. */
export const MAX_TEXT_INPUT_LENGTH = 300;

/** Maximum conversation turns forwarded to Gemini in multi-turn chat. */
export const MAX_HISTORY_MESSAGES = 12;

const MAX_HISTORY_TURN_CHARS = 1200;

export const ALLOWED_AQI_CATEGORIES: ReadonlySet<AQIPresetCategory> = new Set(
  AQI_PRESETS.map((p) => p.category)
);
export const ALLOWED_COMMUTE_MODES: ReadonlySet<CommuteMode> = new Set(COMMUTE_OPTIONS);
export const ALLOWED_HOME_TYPES: ReadonlySet<HomeType> = new Set(HOME_OPTIONS);
export const ALLOWED_PURIFIER_STATUSES: ReadonlySet<PurifierStatus> = new Set(
  PURIFIER_OPTIONS.map((p) => p.value)
);

/** Sanitized single turn from a multi-turn Ask VayuCare conversation. */
export interface SanitizedHistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}

function parseProfileEnums(raw: Record<string, unknown>, roundedAqi: number): {
  aqiCategory?: AQIPresetCategory;
  commuteMode?: CommuteMode;
  homeType?: HomeType;
  purifier?: PurifierStatus;
  error?: string;
} {
  const cat = raw.aqiCategory === undefined ? classifyAqiCategory(roundedAqi) : raw.aqiCategory;
  if (typeof cat !== 'string' || !ALLOWED_AQI_CATEGORIES.has(cat as AQIPresetCategory)) {
    return { error: 'Invalid AQI category. Allowed values: Moderate, Poor, Severe, Hazardous.' };
  }
  if (typeof raw.commuteMode !== 'string' || !ALLOWED_COMMUTE_MODES.has(raw.commuteMode as CommuteMode)) {
    return { error: 'Invalid commute mode. Allowed values: Car, Two-wheeler, Metro/Bus, Walk/Cycle.' };
  }
  if (typeof raw.homeType !== 'string' || !ALLOWED_HOME_TYPES.has(raw.homeType as HomeType)) {
    return { error: 'Invalid home type. Allowed values: Apartment, Independent House.' };
  }
  if (typeof raw.purifier !== 'string' || !ALLOWED_PURIFIER_STATUSES.has(raw.purifier as PurifierStatus)) {
    return { error: 'Invalid purifier status. Allowed values: Yes, No, DIY.' };
  }
  return {
    aqiCategory: cat as AQIPresetCategory,
    commuteMode: raw.commuteMode as CommuteMode,
    homeType: raw.homeType as HomeType,
    purifier: raw.purifier as PurifierStatus,
  };
}

/**
 * Validates and sanitizes a household profile payload for `/api/generate-plan`.
 */
export function validateAndSanitizePlanRequest(body: unknown): {
  valid: boolean;
  data?: UserAirProfile;
  error?: string;
} {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Request payload must be a valid JSON object.' };
  }
  const raw = body as Record<string, unknown>;
  if (typeof raw.city !== 'string') {
    return { valid: false, error: 'City must be a valid text string.' };
  }
  if (raw.city.length > MAX_TEXT_INPUT_LENGTH) {
    return { valid: false, error: `City input must not exceed ${MAX_TEXT_INPUT_LENGTH} characters.` };
  }
  const sanitizedCity = sanitizePlainText(raw.city);
  if (!sanitizedCity) {
    return { valid: false, error: 'Please provide a valid city or locality name without HTML tags.' };
  }
  const numericAqi =
    typeof raw.aqi === 'number'
      ? raw.aqi
      : typeof raw.aqi === 'string' && raw.aqi.trim() !== ''
      ? Number(raw.aqi)
      : NaN;
  if (!Number.isFinite(numericAqi) || numericAqi < AQI_MIN || numericAqi > AQI_MAX) {
    return { valid: false, error: `AQI must be a number between ${AQI_MIN} and ${AQI_MAX}.` };
  }
  const roundedAqi = Math.round(numericAqi);
  const enums = parseProfileEnums(raw, roundedAqi);
  if (enums.error || !enums.aqiCategory || !enums.commuteMode || !enums.homeType || !enums.purifier) {
    return { valid: false, error: enums.error };
  }
  const tagResult = sanitizeHouseholdTags(raw.householdTags);
  if (tagResult.error || !tagResult.tags) {
    return { valid: false, error: tagResult.error };
  }
  return {
    valid: true,
    data: {
      city: sanitizedCity,
      aqi: roundedAqi,
      aqiCategory: enums.aqiCategory,
      householdTags: tagResult.tags,
      commuteMode: enums.commuteMode,
      homeType: enums.homeType,
      purifier: enums.purifier,
      liveTelemetry: sanitizeLiveTelemetry(raw.liveTelemetry, sanitizedCity),
    },
  };
}

/**
 * Validates and sanitizes an Ask VayuCare question, conversation history, and optional profile.
 */
export function validateAndSanitizeAskRequest(body: unknown): {
  valid: boolean;
  question?: string;
  history?: SanitizedHistoryTurn[];
  profile?: UserAirProfile;
  error?: string;
} {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Request payload must be a valid JSON object.' };
  }
  const raw = body as Record<string, unknown>;
  if (typeof raw.question !== 'string') {
    return { valid: false, error: 'Please enter a valid question string.' };
  }
  if (raw.question.length > MAX_TEXT_INPUT_LENGTH) {
    return { valid: false, error: `Question must not exceed ${MAX_TEXT_INPUT_LENGTH} characters.` };
  }
  const sanitizedQuestion = sanitizePlainText(raw.question);
  if (!sanitizedQuestion) {
    return { valid: false, error: 'Please enter a non-empty question without HTML or script tags.' };
  }
  const history: SanitizedHistoryTurn[] = [];
  if (Array.isArray(raw.history)) {
    for (const item of raw.history.slice(-MAX_HISTORY_MESSAGES)) {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const turn = item as Record<string, unknown>;
        const role = turn.role === 'user' || turn.role === 'assistant' ? turn.role : null;
        const cleanContent = sanitizePlainText(turn.content).slice(0, MAX_HISTORY_TURN_CHARS);
        if (role && cleanContent) history.push({ role, content: cleanContent });
      }
    }
  }
  let validatedProfile: UserAirProfile | undefined;
  if (raw.profile !== undefined && raw.profile !== null) {
    const profileCheck = validateAndSanitizePlanRequest(raw.profile);
    if (!profileCheck.valid) return { valid: false, error: profileCheck.error };
    validatedProfile = profileCheck.data;
  }
  return { valid: true, question: sanitizedQuestion, history, profile: validatedProfile };
}
