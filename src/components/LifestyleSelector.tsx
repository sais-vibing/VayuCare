import React from 'react';
import { Car, Home, Sparkles } from 'lucide-react';
import type { UserAirProfile } from '../types/vayucare.ts';
import {
  COMMUTE_OPTIONS,
  HOME_OPTIONS,
  PURIFIER_OPTIONS,
} from '../constants/airQualityData.ts';

/** Props for {@link LifestyleSelector}. */
export interface LifestyleSelectorProps {
  profile: UserAirProfile;
  validationError: string | null;
  isGenerating: boolean;
  onUpdateProfile: (updater: (prev: UserAirProfile) => UserAirProfile) => void;
  onGeneratePlan: () => void;
}

/**
 * Renders daily commute, home type, air purifier selectors, validation alerts, and primary plan CTA.
 */
export const LifestyleSelector: React.FC<LifestyleSelectorProps> = ({
  profile,
  validationError,
  isGenerating,
  onUpdateProfile,
  onGeneratePlan,
}) => (
  <div className="lg:col-span-4 flex flex-col justify-between space-y-4">
    <div className="space-y-4">
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
                onClick={() => onUpdateProfile((prev) => ({ ...prev, commuteMode: mode }))}
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
                onClick={() => onUpdateProfile((prev) => ({ ...prev, homeType: hType }))}
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
                onClick={() => onUpdateProfile((prev) => ({ ...prev, purifier: opt.value }))}
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
        id="profile-validation-error"
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
        aria-busy={isGenerating}
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
);
