import type { LiveAqiTelemetry } from '../types/vayucare.ts';
import {
  MAJOR_INDIAN_CITIES,
  PM10_FALLBACK_RATIO,
} from '../constants/airQualityData.ts';
import { calculateIndianAqiFromPollutants } from '../utils/airQualityMath.ts';

/** Timeout ceiling (ms) for Open-Meteo geocoding and air quality HTTP calls. */
export const OPEN_METEO_TIMEOUT_MS = 10_000;

interface ResolvedCoordinates {
  latitude: number;
  longitude: number;
  resolvedName: string;
}

/**
 * Resolves coordinates from the local Indian metro directory or Open-Meteo Geocoding API.
 */
async function resolveCityCoordinates(trimmedCity: string): Promise<ResolvedCoordinates> {
  const matchedMajor = MAJOR_INDIAN_CITIES.find(
    (c) => c.name.toLowerCase() === trimmedCity.toLowerCase()
  );
  if (matchedMajor) {
    return {
      latitude: matchedMajor.latitude,
      longitude: matchedMajor.longitude,
      resolvedName: matchedMajor.name,
    };
  }

  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    trimmedCity
  )}&count=1&language=en&format=json`;
  const geoRes = await fetch(geoUrl, {
    signal: AbortSignal.timeout(OPEN_METEO_TIMEOUT_MS),
  });
  if (!geoRes.ok) {
    throw new Error(`Open-Meteo geocoding lookup failed (HTTP ${geoRes.status}).`);
  }

  const geoData = (await geoRes.json()) as {
    results?: Array<{ latitude?: number; longitude?: number; name?: string }>;
  };
  const firstResult = geoData.results?.[0];
  if (
    !firstResult ||
    typeof firstResult.latitude !== 'number' ||
    typeof firstResult.longitude !== 'number'
  ) {
    throw new Error(`Could not locate coordinates for "${trimmedCity}" via Open-Meteo.`);
  }

  return {
    latitude: firstResult.latitude,
    longitude: firstResult.longitude,
    resolvedName: firstResult.name || trimmedCity,
  };
}

/**
 * Fetches real-time PM2.5, PM10, US AQI, and Indian NAQI from Open-Meteo Air Quality API.
 */
export async function fetchLiveCityAqi(cityName: string): Promise<LiveAqiTelemetry> {
  const trimmed = cityName.trim();
  if (!trimmed) {
    throw new Error('Please enter a city name before fetching live AQI.');
  }

  const { latitude, longitude, resolvedName } = await resolveCityCoordinates(trimmed);
  const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=pm2_5,pm10,us_aqi&timezone=auto`;
  const aqRes = await fetch(aqUrl, {
    signal: AbortSignal.timeout(OPEN_METEO_TIMEOUT_MS),
  });
  if (!aqRes.ok) {
    throw new Error(`Open-Meteo Air Quality API returned HTTP ${aqRes.status}.`);
  }

  const aqData = (await aqRes.json()) as {
    current?: { pm2_5?: number; pm10?: number; us_aqi?: number };
  };
  const current = aqData.current;
  if (!current || (typeof current.pm2_5 !== 'number' && typeof current.us_aqi !== 'number')) {
    throw new Error('Open-Meteo response did not contain current PM2.5 or AQI measurements.');
  }

  const pm25 = Number((current.pm2_5 ?? 0).toFixed(1));
  const pm10 = Number((current.pm10 ?? pm25 * PM10_FALLBACK_RATIO).toFixed(1));
  const indianAqi = calculateIndianAqiFromPollutants(pm25, pm10);
  const usAqi = Math.round(current.us_aqi ?? indianAqi);

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
