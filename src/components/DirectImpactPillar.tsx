import React from 'react';
import type { DirectImpactInsight } from '../types/vayucare.ts';

/** Props for {@link DirectImpactPillar}. */
export interface DirectImpactPillarProps {
  aqi: number;
  insights: DirectImpactInsight[];
}

/**
 * Renders Pillar 04: Direct health and community impact metrics synchronized with the simulator.
 */
export const DirectImpactPillar: React.FC<DirectImpactPillarProps> = ({
  aqi,
  insights,
}) => (
  <div aria-labelledby="pillar-impact-heading">
    <div className="flex items-center justify-between mb-3">
      <h3 id="pillar-impact-heading" className="text-base font-bold text-slate-900">
        04. Direct Impact Insights (Synchronized with Active Simulator Habits)
      </h3>
      <span className="text-xs text-slate-500">Live protection metrics at AQI {aqi}</span>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {insights.map((insight, idx) => (
        <article
          key={idx}
          className="p-4 rounded-lg border border-slate-200 bg-white flex flex-col justify-between"
        >
          <div>
            <div className="text-xs text-slate-500 mb-1">{insight.category}</div>
            <div className="text-xs font-semibold text-slate-800 mb-2">
              {insight.metricLabel}
            </div>
            <div className="flex items-baseline gap-1.5 my-2">
              <span className="text-2xl font-bold text-emerald-800 font-mono tabular-nums">
                {insight.quantifiedValue}
              </span>
              <span className="text-xs font-medium text-slate-600">{insight.unit}</span>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-2 pt-2 border-t border-slate-100">
            {insight.explanation}
          </p>
        </article>
      ))}
    </div>
  </div>
);
