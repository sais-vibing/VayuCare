import React from 'react';
import { AlertCircle, MapPin, RefreshCw, ShieldAlert } from 'lucide-react';
import type { AQIPresetCategory, UserAirProfile } from '../types/vayucare.ts';
import {
  AQI_MAX,
  AQI_MIN,
  AQI_PRESETS,
  AQI_STEP,
  MAJOR_INDIAN_CITIES,
} from '../constants/airQualityData.ts';
import { classifyAqiCategory } from '../utils/airQualityMath.ts';
import type { AqiBadgeMeta } from '../utils/aqiBadges.ts';
import { MAX_TEXT_INPUT_LENGTH } from '../utils/securityValidation.ts';

/** Props for {@link CityAqiSelector}. */
export interface CityAqiSelectorProps {
  profile: UserAirProfile;
  aqiMeta: AqiBadgeMeta;
  validationError: string | null;
  liveAqiLoading: boolean;
  liveAqiError: string | null;
  onUpdateProfile: (updater: (prev: UserAirProfile) => UserAirProfile) => void;
  onSelectCityAndFetchLiveAqi: (cityName: string) => void;
  onFetchLiveAqi: () => void;
}

/**
 * Renders the Indian city input, live Open-Meteo telemetry card, AQI range slider, and severity presets.
 */
export const CityAqiSelector: React.FC<CityAqiSelectorProps> = ({
  profile,
  aqiMeta,
  validationError,
  liveAqiLoading,
  liveAqiError,
  onUpdateProfile,
  onSelectCityAndFetchLiveAqi,
  onFetchLiveAqi,
}) => {
  const handleAqiNumberChange = (newAqi: number) => {
    const clamped = Math.max(AQI_MIN, Math.min(AQI_MAX, newAqi));
    onUpdateProfile((prev) => ({
      ...prev,
      aqi: clamped,
      aqiCategory: classifyAqiCategory(clamped),
    }));
  };

  const handleAqiPresetClick = (category: AQIPresetCategory, representativeAqi: number) => {
    onUpdateProfile((prev) => ({ ...prev, aqi: representativeAqi, aqiCategory: category }));
  };

  const selectedCityInfo = MAJOR_INDIAN_CITIES.find(
    (c) => c.name.toLowerCase() === profile.city.trim().toLowerCase()
  );

  const cityDescribedBy = [
    liveAqiError ? 'live-aqi-error' : null,
    validationError ? 'profile-validation-error' : null,
  ]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div className="lg:col-span-5 flex flex-col justify-between space-y-5 lg:pr-6 lg:border-r lg:border-slate-200">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <label
            htmlFor="city-input"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-800"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
            <span>Location / Indian City</span>
          </label>

          <button
            type="button"
            onClick={onFetchLiveAqi}
            disabled={liveAqiLoading || !profile.city.trim()}
            aria-busy={liveAqiLoading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-md transition-colors disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1"
          >
            <RefreshCw
              className={`w-3 h-3 ${liveAqiLoading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{liveAqiLoading ? 'Fetching Live AQI...' : 'Fetch Live AQI'}</span>
          </button>
        </div>

        <input
          id="city-input"
          type="text"
          maxLength={MAX_TEXT_INPUT_LENGTH}
          aria-invalid={Boolean(validationError || liveAqiError)}
          aria-describedby={cityDescribedBy}
          value={profile.city}
          onChange={(e) => onUpdateProfile((prev) => ({ ...prev, city: e.target.value }))}
          placeholder="Enter city or locality (e.g., Delhi NCR, Kanpur, Patna)"
          className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
        />

        <div className="mt-2.5">
          <div className="text-[11px] text-slate-500 mb-1.5">
            Quick-select major cities (auto-fetches live Open-Meteo AQI):
          </div>
          <div role="group" aria-label="Major Indian city quick-select chips" className="flex flex-wrap gap-1.5">
            {MAJOR_INDIAN_CITIES.map((cityObj) => {
              const active = profile.city.trim().toLowerCase() === cityObj.name.toLowerCase();
              return (
                <button
                  key={cityObj.name}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelectCityAndFetchLiveAqi(cityObj.name)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1 ${
                    active
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cityObj.name}
                </button>
              );
            })}
          </div>
        </div>

        {profile.liveTelemetry && (
          <div
            data-testid="live-aqi-telemetry"
            aria-live="polite"
            className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1"
          >
            <div className="flex items-center justify-between font-semibold text-slate-900">
              <span>Open-Meteo Live Air Quality ({profile.liveTelemetry.city})</span>
              <span className="font-mono text-[11px] text-slate-500 tabular-nums">{profile.liveTelemetry.fetchedAt}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-mono tabular-nums text-slate-700">
              <span>PM2.5: {profile.liveTelemetry.pm25} µg/m³</span><span aria-hidden="true">·</span>
              <span>PM10: {profile.liveTelemetry.pm10} µg/m³</span><span aria-hidden="true">·</span>
              <span>US AQI: {profile.liveTelemetry.usAqi}</span><span aria-hidden="true">·</span>
              <span className="font-semibold text-emerald-800">Indian NAQI: {profile.liveTelemetry.indianAqi}</span>
            </div>
          </div>
        )}

        {liveAqiError && (
          <div id="live-aqi-error" role="alert" className="mt-2.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{liveAqiError}</span>
          </div>
        )}

        {selectedCityInfo && (
          <p className="mt-2 text-xs text-slate-600">Local pollution pattern: {selectedCityInfo.corridorNote}</p>
        )}
      </div>

      <div className="pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between gap-2 mb-2">
          <label htmlFor="aqi-slider" className="text-xs font-semibold text-slate-800">
            Active AQI Level (Editable for What-If Smog Spikes)
          </label>
          <div
            className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md border text-xs font-semibold tabular-nums ${aqiMeta.bgClass} ${aqiMeta.textClass} ${aqiMeta.borderClass}`}
          >
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>
              AQI {profile.aqi} · {aqiMeta.category}
            </span>
          </div>
        </div>

        <input
          id="aqi-slider"
          type="range"
          min={AQI_MIN}
          max={AQI_MAX}
          step={AQI_STEP}
          value={profile.aqi}
          onChange={(e) => handleAqiNumberChange(Number(e.target.value))}
          aria-valuetext={`AQI ${profile.aqi}, ${aqiMeta.category}`}
          className="w-full accent-emerald-700 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded"
        />

        <div className="flex items-center justify-between text-[11px] text-slate-500 tabular-nums mt-1 mb-3">
          <span>{AQI_MIN} (Clean)</span>
          <span>PM2.5: ~{aqiMeta.pm25EstimateUgM3} µg/m³</span>
          <span>{AQI_MAX} (Hazardous)</span>
        </div>

        <div role="group" aria-label="AQI Preset Categories" className="grid grid-cols-4 gap-1.5">
          {AQI_PRESETS.map((preset) => {
            const isActive = profile.aqiCategory === preset.category;
            return (
              <button
                key={preset.category}
                type="button"
                aria-pressed={isActive}
                onClick={() => handleAqiPresetClick(preset.category, preset.representativeAqi)}
                className={`px-2 py-1.5 rounded-md text-xs font-medium border text-center transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1 ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div>{preset.category}</div>
                <div className="text-[10px] opacity-75 tabular-nums">{preset.rangeLabel}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
