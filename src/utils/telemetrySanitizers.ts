import type { LiveAqiTelemetry, VulnerabilityTag } from '../types/vayucare.ts';
import { AQI_MAX, VULNERABILITY_OPTIONS } from '../constants/airQualityData.ts';

const MAX_HOUSEHOLD_TAGS = 4;
const MAX_TELEMETRY_CITY_CHARS = 100;
const MAX_TELEMETRY_PM25 = 2000;
const MAX_TELEMETRY_PM10 = 3000;
const MAX_TELEMETRY_TIME_CHARS = 40;

/** Allowlist of supported household respiratory vulnerability tags. */
export const ALLOWED_VULNERABILITY_TAGS: ReadonlySet<VulnerabilityTag> = new Set(
  VULNERABILITY_OPTIONS.map((v) => v.tag)
);

/**
 * Strips script/style blocks, HTML tags, dangerous URI schemes, and control characters.
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

/**
 * Validates and deduplicates up to 4 household vulnerability tags.
 */
export function sanitizeHouseholdTags(
  rawTags: unknown
): { tags?: VulnerabilityTag[]; error?: string } {
  if (rawTags === undefined) return { tags: [] };
  if (!Array.isArray(rawTags) || rawTags.length > MAX_HOUSEHOLD_TAGS) {
    return {
      error: `Household tags must be an array of up to ${MAX_HOUSEHOLD_TAGS} valid categories.`,
    };
  }
  const uniqueTags: VulnerabilityTag[] = [];
  for (const tag of rawTags) {
    if (typeof tag !== 'string' || !ALLOWED_VULNERABILITY_TAGS.has(tag as VulnerabilityTag)) {
      return {
        error:
          'Invalid household vulnerability tag. Allowed values: Infants/Toddlers, Elderly, Asthma/Respiratory issues, Pets.',
      };
    }
    if (!uniqueTags.includes(tag as VulnerabilityTag)) {
      uniqueTags.push(tag as VulnerabilityTag);
    }
  }
  return { tags: uniqueTags };
}

/**
 * Validates and numerically clamps optional Open-Meteo live AQI telemetry payloads.
 */
export function sanitizeLiveTelemetry(
  rawTelemetry: unknown,
  fallbackCity: string
): LiveAqiTelemetry | null {
  if (!rawTelemetry || typeof rawTelemetry !== 'object' || Array.isArray(rawTelemetry)) {
    return null;
  }
  const t = rawTelemetry as Record<string, unknown>;
  const hasNumbers =
    typeof t.pm25 === 'number' && Number.isFinite(t.pm25) &&
    typeof t.pm10 === 'number' && Number.isFinite(t.pm10) &&
    typeof t.usAqi === 'number' && Number.isFinite(t.usAqi) &&
    typeof t.indianAqi === 'number' && Number.isFinite(t.indianAqi);
  if (!hasNumbers) return null;

  return {
    city: sanitizePlainText(t.city || fallbackCity).slice(0, MAX_TELEMETRY_CITY_CHARS),
    latitude: Number(t.latitude) || 0,
    longitude: Number(t.longitude) || 0,
    pm25: Math.max(0, Math.min(MAX_TELEMETRY_PM25, Number(t.pm25))),
    pm10: Math.max(0, Math.min(MAX_TELEMETRY_PM10, Number(t.pm10))),
    usAqi: Math.max(0, Math.min(AQI_MAX, Math.round(Number(t.usAqi)))),
    indianAqi: Math.max(0, Math.min(AQI_MAX, Math.round(Number(t.indianAqi)))),
    fetchedAt: sanitizePlainText(t.fetchedAt || '').slice(0, MAX_TELEMETRY_TIME_CHARS),
    source: 'open-meteo',
  };
}
