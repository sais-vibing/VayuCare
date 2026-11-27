import React from 'react';
import {
  AQIPresetCategory,
  CommuteMode,
  HomeType,
  PurifierStatus,
  QuickDemoPreset,
  UserAirProfile,
  VulnerabilityTag,
} from '../types/vayucare';
import {
  AQI_PRESETS,
  MAJOR_INDIAN_CITIES,
  QUICK_DEMO_PRESETS,
  classifyAqiCategory,
  getAqiBadgeMeta,
} from '../utils/airQualityLogic';
import {
  MapPin,
  Users,
  Car,
  Home,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface ProfileInputPanelProps {
  profile: UserAirProfile;
  activePresetId: string;
  validationError: string | null;
  liveAqiLoading: boolean;
  liveAqiError: string | null;
  isGenerating: boolean;
  onUpdateProfile: (updater: (prev: UserAirProfile) => UserAirProfile) => void;
  onSelectCityAndFetchLiveAqi: (cityName: string) => void;
  onFetchLiveAqi: () => void;
  onSelectDemoPreset: (preset: QuickDemoPreset) => void;
  onGeneratePlan: () => void;
}

const VULNERABILITY_OPTIONS: Array<{
  tag: VulnerabilityTag;
  helper: string;
}> = [
  { tag: 'Infants/Toddlers', helper: '0–5 yrs · Higher breathing rate' },
  { tag: 'Elderly', helper: '60+ yrs · Cardiopulmonary care' },
  { tag: 'Asthma/Respiratory issues', helper: 'Bronchial sensitivity & triggers' },
  { tag: 'Pets', helper: 'Outdoor walks & ground-level dust' },
];

const COMMUTE_OPTIONS: CommuteMode[] = [
  'Car',
  'Two-wheeler',
  'Metro/Bus',
  'Walk/Cycle',
];

const HOME_OPTIONS: HomeType[] = ['Apartment', 'Independent House'];

const PURIFIER_OPTIONS: Array<{ value: PurifierStatus; label: string }> = [
  { value: 'Yes', label: 'Yes (HEPA)' },
  { value: 'No', label: 'No Purifier' },
  { value: 'DIY', label: 'DIY Box-Fan' },
];

export const ProfileInputPanel: React.FC<ProfileInputPanelProps> = ({
  profile,
  activePresetId,
  validationError,
  liveAqiLoading,
  liveAqiError,
  isGenerating,
  onUpdateProfile,
  onSelectCityAndFetchLiveAqi,
  onFetchLiveAqi,
  onSelectDemoPreset,
  onGeneratePlan,
}) => {
  const aqiMeta = getAqiBadgeMeta(profile.aqi, profile.liveTelemetry?.pm25);

  const handleAqiNumberChange = (newAqi: number) => {
    const clamped = Math.max(10, Math.min(500, newAqi));
    onUpdateProfile((prev) => ({
      ...prev,
      aqi: clamped,
      aqiCategory: classifyAqiCategory(clamped),
    }));
  };

  const handleAqiPresetClick = (
    category: AQIPresetCategory,
    representativeAqi: number
  ) => {
    onUpdateProfile((prev) => ({
      ...prev,
      aqi: representativeAqi,
      aqiCategory: category,
    }));
  };

  const toggleHouseholdTag = (tag: VulnerabilityTag) => {
    onUpdateProfile((prev) => {
      const exists = prev.householdTags.includes(tag);
      const nextTags = exists
        ? prev.householdTags.filter((t) => t !== tag)
        : [...prev.householdTags, tag];
      return { ...prev, householdTags: nextTags };
    });
  };

  const selectedCityInfo = MAJOR_INDIAN_CITIES.find(
    (c) => c.name.toLowerCase() === profile.city.trim().toLowerCase()
  );

  return (
    <section
      id="household-inputs"
      aria-labelledby="inputs-heading"
      className="bg-white border border-slate-200 rounded-xl p-6"
    >
      {/* Quick Demo Presets Bar */}
      <div className="pb-5 mb-6 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <div>
            <h2
              id="inputs-heading"
              className="text-lg font-bold text-slate-900 tracking-tight"
            >
              1. Household & Smog Exposure Configuration
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Fetch live city air quality via Open-Meteo or select a preset household profile to query Gemini AI:
            </p>
          </div>
          <span className="text-xs font-medium text-emerald-800">
            Quick Demo Profiles (Auto-Fetches Live AQI & Gemini Plan)
          </span>
        </div>

        <div
          role="group"
          aria-label="Quick Demo Presets"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5"
        >
          {QUICK_DEMO_PRESETS.map((preset) => {
            const isSelected = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={isSelected}
                aria-label={`Select demo profile ${preset.label}`}
                onClick={() => onSelectDemoPreset(preset)}
                className={`text-left p-3 rounded-lg border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1 ${
                  isSelected
                    ? 'bg-emerald-50/80 border-emerald-600 text-slate-900'
                    : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100/80 hover:border-slate-300'
                }`}
              >
                <div className="text-xs font-semibold text-slate-900 truncate">
                  {preset.label}
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5 truncate">
                  {preset.subtitle}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main 3-Column Input Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Column 1: Location / City & Live AQI (5 cols) */}
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
                aria-label={`Fetch live Open-Meteo AQI for ${profile.city || 'entered city'}`}
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
              maxLength={300}
              aria-label="Location or Indian City"
              value={profile.city}
              onChange={(e) =>
                onUpdateProfile((prev) => ({ ...prev, city: e.target.value }))
              }
              placeholder="Enter city or locality (e.g., Delhi NCR, Kanpur, Patna)"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
            />

            {/* Quick-select Indian city chips (auto-fetches live Open-Meteo AQI on click) */}
            <div className="mt-2.5">
              <div className="text-[11px] text-slate-500 mb-1.5">
                Quick-select major cities (auto-fetches live Open-Meteo AQI):
              </div>
              <div role="group" aria-label="Major Indian city quick-select chips" className="flex flex-wrap gap-1.5">
                {MAJOR_INDIAN_CITIES.map((cityObj) => {
                  const active =
                    profile.city.trim().toLowerCase() ===
                    cityObj.name.toLowerCase();
                  return (
                    <button
                      key={cityObj.name}
                      type="button"
                      aria-pressed={active}
                      aria-label={`Select city ${cityObj.name} and fetch live AQI`}
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

            {/* Live Open-Meteo Telemetry Strip */}
            {profile.liveTelemetry && (
              <div
                data-testid="live-aqi-telemetry"
                className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1"
              >
                <div className="flex items-center justify-between font-semibold text-slate-900">
                  <span>Open-Meteo Live Air Quality ({profile.liveTelemetry.city})</span>
                  <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                    {profile.liveTelemetry.fetchedAt}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-mono tabular-nums text-slate-700">
                  <span>PM2.5: {profile.liveTelemetry.pm25} µg/m³</span>
                  <span aria-hidden="true">·</span>
                  <span>PM10: {profile.liveTelemetry.pm10} µg/m³</span>
                  <span aria-hidden="true">·</span>
                  <span>US AQI: {profile.liveTelemetry.usAqi}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-emerald-800">
                    Indian NAQI: {profile.liveTelemetry.indianAqi}
                  </span>
                </div>
              </div>
            )}

            {liveAqiError && (
              <div
                role="alert"
                className="mt-2.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-1.5"
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{liveAqiError}</span>
              </div>
            )}

            {selectedCityInfo && (
              <p className="mt-2 text-xs text-slate-600">
                Local pollution pattern: {selectedCityInfo.corridorNote}
              </p>
            )}
          </div>

          {/* AQI Slider & Category Presets (Editable for What-If Smog Spikes) */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between gap-2 mb-2">
              <label
                htmlFor="aqi-slider"
                className="text-xs font-semibold text-slate-800"
              >
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
              min={10}
              max={500}
              step={5}
              value={profile.aqi}
              onChange={(e) => handleAqiNumberChange(Number(e.target.value))}
              aria-label="Current Outdoor AQI Level Slider"
              aria-valuetext={`AQI ${profile.aqi}, ${aqiMeta.category}`}
              className="w-full accent-emerald-700 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded"
            />

            <div className="flex items-center justify-between text-[11px] text-slate-500 tabular-nums mt-1 mb-3">
              <span>10 (Clean)</span>
              <span>
                PM2.5: ~{aqiMeta.pm25EstimateUgM3} µg/m³
              </span>
              <span>500 (Hazardous)</span>
            </div>

            {/* 4 AQI Category Preset Buttons */}
            <div
              role="group"
              aria-label="AQI Preset Categories"
              className="grid grid-cols-4 gap-1.5"
            >
              {AQI_PRESETS.map((preset) => {
                const isActive = profile.aqiCategory === preset.category;
                return (
                  <button
                    key={preset.category}
                    type="button"
                    aria-pressed={isActive}
                    aria-label={`Set AQI preset to ${preset.category} (${preset.rangeLabel})`}
                    onClick={() =>
                      handleAqiPresetClick(
                        preset.category,
                        preset.representativeAqi
                      )
                    }
                    className={`px-2 py-1.5 rounded-md text-xs font-medium border text-center transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1 ${
                      isActive
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div>{preset.category}</div>
                    <div className="text-[10px] opacity-75 tabular-nums">
                      {preset.rangeLabel}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Column 2: Household Profile Multi-Select Tags (3 cols) */}
        <div className="lg:col-span-3 flex flex-col justify-between lg:pr-6 lg:border-r lg:border-slate-200">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <Users className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                <span>Household Vulnerability Profile</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Select all vulnerable members in your home to tailor respiratory precautions:
            </p>

            <div
              role="group"
              aria-label="Household Profile Multi-Select"
              className="space-y-2"
            >
              {VULNERABILITY_OPTIONS.map((item) => {
                const selected = profile.householdTags.includes(item.tag);
                return (
                  <button
                    key={item.tag}
                    type="button"
                    role="checkbox"
                    aria-checked={selected}
                    aria-label={`${item.tag}: ${item.helper}`}
                    onClick={() => toggleHouseholdTag(item.tag)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors flex items-center justify-between gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1 ${
                      selected
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-950'
                        : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">
                        {item.tag}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {item.helper}
                      </div>
                    </div>
                    <span
                      aria-hidden="true"
                      className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        selected
                          ? 'bg-emerald-700 text-white'
                          : 'border border-slate-300 bg-white text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600">
            Unfiltered exposure at AQI {profile.aqi} equals smoking{' '}
            <strong className="font-semibold text-slate-900 tabular-nums">
              ~{aqiMeta.cigaretteEquivalentPerDay} cigarettes/day
            </strong>
            .
          </div>
        </div>

        {/* Column 3: Daily Lifestyle, Commute & Submit CTA (4 cols) */}
        <div className="lg:col-span-4 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            {/* Primary Commute Mode */}
            <div>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 mb-2">
                <Car className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                <span>Primary Daily Commute Mode</span>
              </span>
              <div
                role="group"
                aria-label="Primary Daily Commute Mode"
                className="grid grid-cols-2 gap-1.5"
              >
                {COMMUTE_OPTIONS.map((mode) => {
                  const active = profile.commuteMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={active}
                      aria-label={`Select commute mode ${mode}`}
                      onClick={() =>
                        onUpdateProfile((prev) => ({
                          ...prev,
                          commuteMode: mode,
                        }))
                      }
                      className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1 ${
                        active
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {mode}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Home Type */}
            <div>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 mb-2">
                <Home className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                <span>Home Architecture</span>
              </span>
              <div
                role="group"
                aria-label="Home Architecture"
                className="grid grid-cols-2 gap-1.5"
              >
                {HOME_OPTIONS.map((hType) => {
                  const active = profile.homeType === hType;
                  return (
                    <button
                      key={hType}
                      type="button"
                      aria-pressed={active}
                      aria-label={`Select home type ${hType}`}
                      onClick={() =>
                        onUpdateProfile((prev) => ({
                          ...prev,
                          homeType: hType,
                        }))
                      }
                      className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1 ${
                        active
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {hType}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Air Purifier Availability */}
            <div>
              <span className="block text-xs font-semibold text-slate-800 mb-2">
                Indoor Air Purifier Availability
              </span>
              <div
                role="group"
                aria-label="Indoor Air Purifier Availability"
                className="grid grid-cols-3 gap-1.5"
              >
                {PURIFIER_OPTIONS.map((opt) => {
                  const active = profile.purifier === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      aria-pressed={active}
                      aria-label={`Select air purifier status ${opt.label}`}
                      onClick={() =>
                        onUpdateProfile((prev) => ({
                          ...prev,
                          purifier: opt.value,
                        }))
                      }
                      className={`px-2.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 truncate cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1 ${
                        active
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {validationError && (
            <div
              role="alert"
              className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800"
            >
              {validationError}
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              onClick={onGeneratePlan}
              disabled={isGenerating}
              aria-label="Generate My Clean Air Plan"
              className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-semibold text-sm rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              <span>
                {isGenerating
                  ? 'Querying Gemini AI for Clean Air Plan...'
                  : 'Generate My Clean Air Plan'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
