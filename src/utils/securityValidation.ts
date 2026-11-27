import type {
  AQIPresetCategory,
  CommuteMode,
  HomeType,
  LiveAqiTelemetry,
  PurifierStatus,
  UserAirProfile,
  VulnerabilityTag,
} from '../types/vayucare.ts';
import { classifyAqiCategory } from './airQualityLogic.ts';

export const MAX_TEXT_INPUT_LENGTH = 300;
export const MAX_HISTORY_MESSAGES = 12;

export const ALLOWED_AQI_CATEGORIES: ReadonlySet<AQIPresetCategory> = new Set([
  'Moderate',
  'Poor',
  'Severe',
  'Hazardous',
]);

export const ALLOWED_COMMUTE_MODES: ReadonlySet<CommuteMode> = new Set([
  'Car',
  'Two-wheeler',
  'Metro/Bus',
  'Walk/Cycle',
]);

export const ALLOWED_HOME_TYPES: ReadonlySet<HomeType> = new Set([
  'Apartment',
  'Independent House',
]);

export const ALLOWED_PURIFIER_STATUSES: ReadonlySet<PurifierStatus> = new Set([
  'Yes',
  'No',
  'DIY',
]);

export const ALLOWED_VULNERABILITY_TAGS: ReadonlySet<VulnerabilityTag> = new Set([
  'Infants/Toddlers',
  'Elderly',
  'Asthma/Respiratory issues',
  'Pets',
]);

export interface SanitizedHistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Strips script blocks, HTML tags, dangerous protocol prefixes, and control characters.
 */
export function sanitizePlainText(input: unknown): string {
  if (typeof input !== 'string') {
    return '';
  }
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<\/?[a-z][^>]*>/gi, '')
    .replace(/[<>]/g, '')
    .replace(/\b(?:javascript|vbscript|data):/gi, '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

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
    return {
      valid: false,
      error: `City input must not exceed ${MAX_TEXT_INPUT_LENGTH} characters.`,
    };
  }

  const sanitizedCity = sanitizePlainText(raw.city);
  if (!sanitizedCity) {
    return {
      valid: false,
      error: 'Please provide a valid city or locality name without HTML tags.',
    };
  }

  const numericAqi =
    typeof raw.aqi === 'number'
      ? raw.aqi
      : typeof raw.aqi === 'string' && raw.aqi.trim() !== ''
      ? Number(raw.aqi)
      : NaN;

  if (!Number.isFinite(numericAqi) || numericAqi < 10 || numericAqi > 500) {
    return {
      valid: false,
      error: 'AQI must be a number between 10 and 500.',
    };
  }
  const roundedAqi = Math.round(numericAqi);

  let aqiCategory: AQIPresetCategory = classifyAqiCategory(roundedAqi);
  if (raw.aqiCategory !== undefined) {
    if (
      typeof raw.aqiCategory !== 'string' ||
      !ALLOWED_AQI_CATEGORIES.has(raw.aqiCategory as AQIPresetCategory)
    ) {
      return {
        valid: false,
        error: 'Invalid AQI category. Allowed values: Moderate, Poor, Severe, Hazardous.',
      };
    }
    aqiCategory = raw.aqiCategory as AQIPresetCategory;
  }

  if (
    typeof raw.commuteMode !== 'string' ||
    !ALLOWED_COMMUTE_MODES.has(raw.commuteMode as CommuteMode)
  ) {
    return {
      valid: false,
      error: 'Invalid commute mode. Allowed values: Car, Two-wheeler, Metro/Bus, Walk/Cycle.',
    };
  }

  if (
    typeof raw.homeType !== 'string' ||
    !ALLOWED_HOME_TYPES.has(raw.homeType as HomeType)
  ) {
    return {
      valid: false,
      error: 'Invalid home type. Allowed values: Apartment, Independent House.',
    };
  }

  if (
    typeof raw.purifier !== 'string' ||
    !ALLOWED_PURIFIER_STATUSES.has(raw.purifier as PurifierStatus)
  ) {
    return {
      valid: false,
      error: 'Invalid purifier status. Allowed values: Yes, No, DIY.',
    };
  }

  const householdTags: VulnerabilityTag[] = [];
  if (raw.householdTags !== undefined) {
    if (!Array.isArray(raw.householdTags) || raw.householdTags.length > 4) {
      return {
        valid: false,
        error: 'Household tags must be an array of up to 4 valid categories.',
      };
    }
    for (const tag of raw.householdTags) {
      if (
        typeof tag !== 'string' ||
        !ALLOWED_VULNERABILITY_TAGS.has(tag as VulnerabilityTag)
      ) {
        return {
          valid: false,
          error:
            'Invalid household vulnerability tag. Allowed values: Infants/Toddlers, Elderly, Asthma/Respiratory issues, Pets.',
        };
      }
      if (!householdTags.includes(tag as VulnerabilityTag)) {
        householdTags.push(tag as VulnerabilityTag);
      }
    }
  }

  let liveTelemetry: LiveAqiTelemetry | null = null;
  if (raw.liveTelemetry && typeof raw.liveTelemetry === 'object' && !Array.isArray(raw.liveTelemetry)) {
    const t = raw.liveTelemetry as Record<string, unknown>;
    if (
      typeof t.pm25 === 'number' &&
      Number.isFinite(t.pm25) &&
      typeof t.pm10 === 'number' &&
      Number.isFinite(t.pm10) &&
      typeof t.usAqi === 'number' &&
      Number.isFinite(t.usAqi) &&
      typeof t.indianAqi === 'number' &&
      Number.isFinite(t.indianAqi)
    ) {
      liveTelemetry = {
        city: sanitizePlainText(t.city || sanitizedCity).slice(0, 100),
        latitude: Number(t.latitude) || 0,
        longitude: Number(t.longitude) || 0,
        pm25: Math.max(0, Math.min(2000, Number(t.pm25))),
        pm10: Math.max(0, Math.min(3000, Number(t.pm10))),
        usAqi: Math.max(0, Math.min(500, Math.round(Number(t.usAqi)))),
        indianAqi: Math.max(0, Math.min(500, Math.round(Number(t.indianAqi)))),
        fetchedAt: sanitizePlainText(t.fetchedAt || '').slice(0, 40),
        source: 'open-meteo',
      };
    }
  }

  return {
    valid: true,
    data: {
      city: sanitizedCity,
      aqi: roundedAqi,
      aqiCategory,
      householdTags,
      commuteMode: raw.commuteMode as CommuteMode,
      homeType: raw.homeType as HomeType,
      purifier: raw.purifier as PurifierStatus,
      liveTelemetry,
    },
  };
}

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
    return {
      valid: false,
      error: `Question must not exceed ${MAX_TEXT_INPUT_LENGTH} characters.`,
    };
  }

  const sanitizedQuestion = sanitizePlainText(raw.question);
  if (!sanitizedQuestion) {
    return {
      valid: false,
      error: 'Please enter a non-empty question without HTML or script tags.',
    };
  }

  const history: SanitizedHistoryTurn[] = [];
  if (Array.isArray(raw.history)) {
    const recentSlice = raw.history.slice(-MAX_HISTORY_MESSAGES);
    for (const item of recentSlice) {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const turn = item as Record<string, unknown>;
        const role = turn.role === 'user' || turn.role === 'assistant' ? turn.role : null;
        const cleanContent = sanitizePlainText(turn.content).slice(0, 1200);
        if (role && cleanContent) {
          history.push({ role, content: cleanContent });
        }
      }
    }
  }

  let validatedProfile: UserAirProfile | undefined;
  if (raw.profile !== undefined && raw.profile !== null) {
    const profileCheck = validateAndSanitizePlanRequest(raw.profile);
    if (!profileCheck.valid) {
      return { valid: false, error: profileCheck.error };
    }
    validatedProfile = profileCheck.data;
  }

  return {
    valid: true,
    question: sanitizedQuestion,
    history,
    profile: validatedProfile,
  };
}

export function isSameOriginAllowed(
  originHeader: string | undefined,
  hostHeader: string | undefined,
  appUrlEnv?: string
): boolean {
  if (!originHeader) {
    return true;
  }

  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(originHeader);
  } catch {
    return false;
  }

  const allowedOrigins = new Set<string>([
    'http://localhost:3000',
    'https://localhost:3000',
    'http://127.0.0.1:3000',
    'https://127.0.0.1:3000',
  ]);

  if (hostHeader) {
    const cleanHost = hostHeader.trim();
    allowedOrigins.add(`http://${cleanHost}`);
    allowedOrigins.add(`https://${cleanHost}`);
  }

  if (appUrlEnv && appUrlEnv !== 'MY_APP_URL') {
    try {
      const parsedAppUrl = new URL(appUrlEnv);
      allowedOrigins.add(parsedAppUrl.origin);
    } catch {
      // Ignore malformed APP_URL placeholder
    }
  }

  return allowedOrigins.has(parsedOrigin.origin);
}

export class InMemoryRateLimiter {
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private readonly hits: Map<string, { count: number; resetAt: number }> = new Map();

  constructor(windowMs = 60_000, maxRequests = 15) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  public check(ipKey: string, now = Date.now()): {
    allowed: boolean;
    remaining: number;
    retryAfterSeconds: number;
  } {
    if (this.hits.size > 2000) {
      for (const [k, v] of this.hits.entries()) {
        if (now >= v.resetAt) {
          this.hits.delete(k);
        }
      }
    }

    const record = this.hits.get(ipKey);
    if (!record || now >= record.resetAt) {
      this.hits.set(ipKey, {
        count: 1,
        resetAt: now + this.windowMs,
      });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        retryAfterSeconds: Math.ceil(this.windowMs / 1000),
      };
    }

    if (record.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((record.resetAt - now) / 1000)),
      };
    }

    record.count += 1;
    return {
      allowed: true,
      remaining: this.maxRequests - record.count,
      retryAfterSeconds: Math.max(1, Math.ceil((record.resetAt - now) / 1000)),
    };
  }
}
