import React from 'react';
import type {
  QuickDemoPreset,
  UserAirProfile,
  VulnerabilityTag,
} from '../types/vayucare.ts';
import { getAqiBadgeMeta } from '../utils/aqiBadges.ts';
import { DemoPresetsBar } from './DemoPresetsBar.tsx';
import { CityAqiSelector } from './CityAqiSelector.tsx';
import { VulnerabilitySelector } from './VulnerabilitySelector.tsx';
import { LifestyleSelector } from './LifestyleSelector.tsx';

/** Props for {@link ProfileInputPanel}. */
export interface ProfileInputPanelProps {
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

/**
 * Section 1 household configuration dashboard composing demo presets, live city/AQI controls,
 * vulnerability multi-select, and daily lifestyle options.
 */
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

  const toggleHouseholdTag = (tag: VulnerabilityTag) => {
    onUpdateProfile((prev) => {
      const exists = prev.householdTags.includes(tag);
      const nextTags = exists
        ? prev.householdTags.filter((t) => t !== tag)
        : [...prev.householdTags, tag];
      return { ...prev, householdTags: nextTags };
    });
  };

  return (
    <section
      id="household-inputs"
      aria-labelledby="inputs-heading"
      className="bg-white border border-slate-200 rounded-xl p-6"
    >
      <DemoPresetsBar
        activePresetId={activePresetId}
        onSelectDemoPreset={onSelectDemoPreset}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <CityAqiSelector
          profile={profile}
          aqiMeta={aqiMeta}
          validationError={validationError}
          liveAqiLoading={liveAqiLoading}
          liveAqiError={liveAqiError}
          onUpdateProfile={onUpdateProfile}
          onSelectCityAndFetchLiveAqi={onSelectCityAndFetchLiveAqi}
          onFetchLiveAqi={onFetchLiveAqi}
        />

        <VulnerabilitySelector
          selectedTags={profile.householdTags}
          aqi={profile.aqi}
          cigaretteEquivalentPerDay={aqiMeta.cigaretteEquivalentPerDay}
          onToggleTag={toggleHouseholdTag}
        />

        <LifestyleSelector
          profile={profile}
          validationError={validationError}
          isGenerating={isGenerating}
          onUpdateProfile={onUpdateProfile}
          onGeneratePlan={onGeneratePlan}
        />
      </div>
    </section>
  );
};
