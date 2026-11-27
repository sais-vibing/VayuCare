import React from 'react';
import type { SustainableAlternative } from '../types/vayucare.ts';

/** Props for {@link SustainableSwapsPillar}. */
export interface SustainableSwapsPillarProps {
  city: string;
  alternatives: SustainableAlternative[];
}

/**
 * Renders Pillar 03: Localized sustainable commute and daily lifestyle swaps.
 */
export const SustainableSwapsPillar: React.FC<SustainableSwapsPillarProps> = ({
  city,
  alternatives,
}) => (
  <div aria-labelledby="pillar-sustainable-heading">
    <div className="flex items-center justify-between mb-3">
      <h3 id="pillar-sustainable-heading" className="text-base font-bold text-slate-900">
        03. Sustainable Lifestyle Alternatives (Tailored for {city})
      </h3>
      <span className="text-xs text-slate-500">Actionable daily low-emission swaps</span>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {alternatives.map((alt) => (
        <article
          key={alt.id}
          className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col justify-between"
        >
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-2">{alt.title}</h4>
            <div className="text-xs text-slate-600 mb-2">
              <strong className="font-semibold text-slate-800">Instead of: </strong>
              {alt.currentHabit}
            </div>
            <div className="text-xs text-slate-800 mb-2.5">
              <strong className="font-semibold text-emerald-800">Clean Swap: </strong>
              {alt.recommendedSwap}
            </div>
            <p className="text-xs text-slate-600">{alt.cityContext}</p>
          </div>

          <div className="mt-4 pt-2.5 border-t border-slate-200 text-xs font-semibold text-emerald-800 tabular-nums">
            Impact: {alt.emissionSavingText}
          </div>
        </article>
      ))}
    </div>
  </div>
);
