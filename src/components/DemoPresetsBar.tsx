import React from 'react';
import type { QuickDemoPreset } from '../types/vayucare.ts';
import { QUICK_DEMO_PRESETS } from '../constants/airQualityData.ts';

/** Props for {@link DemoPresetsBar}. */
export interface DemoPresetsBarProps {
  activePresetId: string;
  onSelectDemoPreset: (preset: QuickDemoPreset) => void;
}

/**
 * Renders one-click Indian household demo profiles that auto-fetch live AQI and a Gemini plan.
 */
export const DemoPresetsBar: React.FC<DemoPresetsBarProps> = ({
  activePresetId,
  onSelectDemoPreset,
}) => (
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
);
