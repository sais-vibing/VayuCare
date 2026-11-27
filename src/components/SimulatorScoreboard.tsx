import React from 'react';
import { ShieldCheck } from 'lucide-react';
import type { SimulatorMetrics } from '../types/vayucare.ts';
import {
  MAX_ECO_IMPACT_SCORE,
  MAX_EXPOSURE_REDUCTION_PCT,
} from '../constants/airQualityData.ts';
import { classifyAqiCategory } from '../utils/airQualityMath.ts';

/** Props for {@link SimulatorScoreboard}. */
export interface SimulatorScoreboardProps {
  outdoorAqi: number;
  metrics: SimulatorMetrics;
}

/**
 * Live household exposure reduction and eco-impact scoreboard with ARIA progressbar gauges.
 */
export const SimulatorScoreboard: React.FC<SimulatorScoreboardProps> = ({
  outdoorAqi,
  metrics,
}) => {
  const effectiveCategory = classifyAqiCategory(metrics.effectivePersonalAqi);

  return (
    <div
      data-testid="simulator-scoreboard"
      aria-live="polite"
      className="lg:col-span-5 p-5 rounded-xl border border-slate-200 bg-slate-50 space-y-5"
    >
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <div className="text-xs font-semibold text-slate-500">
            Simulated Protection Summary
          </div>
          <div className="text-sm font-bold text-slate-900">
            Live Household Exposure Forecast
          </div>
        </div>
        <ShieldCheck className="w-5 h-5 text-emerald-700" aria-hidden="true" />
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-xs font-semibold text-slate-700">
            Daily Exposure Reduction
          </span>
          <span
            data-testid="exposure-reduction-pct"
            className="text-2xl font-bold text-emerald-800 font-mono tabular-nums"
          >
            {metrics.totalExposureReductionPct}%
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Daily Exposure Reduction"
          aria-valuemin={0}
          aria-valuemax={MAX_EXPOSURE_REDUCTION_PCT}
          aria-valuenow={metrics.totalExposureReductionPct}
          className="w-full h-3 bg-slate-200 rounded-full overflow-hidden"
        >
          <div
            className="h-full bg-emerald-700 transition-transform duration-150 origin-left"
            style={{
              transform: `scaleX(${metrics.totalExposureReductionPct / 100})`,
            }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-slate-500 mt-1 tabular-nums">
          <span>0% (Unprotected Outdoor Air)</span>
          <span>{MAX_EXPOSURE_REDUCTION_PCT}% Max Practical Reduction</span>
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-xs font-semibold text-slate-700">Eco-Impact Score</span>
          <span
            data-testid="eco-impact-score"
            className="text-xl font-bold text-slate-900 font-mono tabular-nums"
          >
            {metrics.ecoImpactScore} / {MAX_ECO_IMPACT_SCORE}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Eco-Impact Score"
          aria-valuemin={0}
          aria-valuemax={MAX_ECO_IMPACT_SCORE}
          aria-valuenow={metrics.ecoImpactScore}
          className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden"
        >
          <div
            className="h-full bg-teal-700 transition-transform duration-150 origin-left"
            style={{
              transform: `scaleX(${metrics.ecoImpactScore / MAX_ECO_IMPACT_SCORE})`,
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="p-3 bg-white rounded-lg border border-slate-200">
          <div className="text-[11px] text-slate-500">Effective Personal AQI</div>
          <div
            data-testid="effective-personal-aqi"
            className="text-lg font-bold text-slate-900 font-mono tabular-nums mt-0.5"
          >
            {metrics.effectivePersonalAqi}{' '}
            <span className="text-xs font-normal text-slate-500">vs {outdoorAqi}</span>
          </div>
          <div className="text-[11px] text-emerald-800 font-medium mt-0.5">
            Feels like {effectiveCategory} air
          </div>
        </div>

        <div className="p-3 bg-white rounded-lg border border-slate-200">
          <div className="text-[11px] text-slate-500">Inhaled PM2.5 Avoided</div>
          <div
            data-testid="pm25-avoided-ug"
            className="text-lg font-bold text-emerald-800 font-mono tabular-nums mt-0.5"
          >
            {metrics.dailyPm25AvoidedUg.toLocaleString('en-IN')} µg
          </div>
          <div className="text-[11px] text-slate-600 mt-0.5">Per person / 24 hrs</div>
        </div>

        <div className="p-3 bg-white rounded-lg border border-slate-200">
          <div className="text-[11px] text-slate-500">Cigarette Equivalent Saved</div>
          <div className="text-lg font-bold text-slate-900 font-mono tabular-nums mt-0.5">
            {metrics.equivalentCigarettesAvoided} cigs
          </div>
          <div className="text-[11px] text-slate-600 mt-0.5">Avoided toxic load / day</div>
        </div>

        <div className="p-3 bg-white rounded-lg border border-slate-200">
          <div className="text-[11px] text-slate-500">Community CO₂ & Smoke Cut</div>
          <div className="text-lg font-bold text-teal-800 font-mono tabular-nums mt-0.5">
            {metrics.dailyCo2SavedGrams.toLocaleString('en-IN')} g
          </div>
          <div className="text-[11px] text-slate-600 mt-0.5">CO₂e prevented / day</div>
        </div>
      </div>
    </div>
  );
};
