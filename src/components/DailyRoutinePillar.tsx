import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { TimeBlockRoutine } from '../types/vayucare.ts';

/** Props for {@link DailyRoutinePillar}. */
export interface DailyRoutinePillarProps {
  city: string;
  dailyRoutine: TimeBlockRoutine[];
}

/**
 * Renders Pillar 01: Time-blocked Morning, Afternoon, and Evening smog-inversion routines.
 */
export const DailyRoutinePillar: React.FC<DailyRoutinePillarProps> = ({
  city,
  dailyRoutine,
}) => (
  <div aria-labelledby="pillar-routine-heading">
    <div className="flex items-center justify-between mb-3">
      <h3 id="pillar-routine-heading" className="text-base font-bold text-slate-900">
        01. Low-Emission Daily Routine (Time-Blocked Schedule)
      </h3>
      <span className="text-xs text-slate-500">
        Calibrated for {city} smog inversion cycle
      </span>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {dailyRoutine.map((slot) => (
        <article
          key={slot.period}
          className="p-4 rounded-lg border border-slate-200 bg-slate-50/60 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-2 text-xs text-slate-500 pb-2 mb-2 border-b border-slate-200/80">
              <span className="font-bold text-slate-900 uppercase tracking-wider">
                {slot.period}
              </span>
              <span className="font-mono tabular-nums">{slot.timeWindow}</span>
            </div>

            <div className="text-xs font-semibold text-emerald-800 mb-1.5">
              {slot.outdoorSafetyStatus}
            </div>

            <h4 className="text-sm font-bold text-slate-900 mb-2.5">{slot.headline}</h4>

            <ul className="space-y-2 text-xs text-slate-700">
              {slot.actions.map((act, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2
                    className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span>{act}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/80 text-xs text-slate-700">
            <strong className="font-semibold text-slate-900">Family Precaution: </strong>
            {slot.vulnerableNote}
          </div>
        </article>
      ))}
    </div>
  </div>
);
