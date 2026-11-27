import React from 'react';
import type { HomeType, IndoorAirHack, PurifierStatus } from '../types/vayucare.ts';

/** Props for {@link IndoorHacksPillar}. */
export interface IndoorHacksPillarProps {
  homeType: HomeType;
  purifier: PurifierStatus;
  indoorHacks: IndoorAirHack[];
}

/**
 * Renders Pillar 02: Budget-friendly indoor ventilation, filtration, cleaning, and source control hacks.
 */
export const IndoorHacksPillar: React.FC<IndoorHacksPillarProps> = ({
  homeType,
  purifier,
  indoorHacks,
}) => (
  <div aria-labelledby="pillar-indoor-heading">
    <div className="flex items-center justify-between mb-3">
      <h3 id="pillar-indoor-heading" className="text-base font-bold text-slate-900">
        02. Indoor Air Quality Hacks ({homeType} · Purifier: {purifier})
      </h3>
      <span className="text-xs text-slate-500">
        Budget-friendly particulate & CO₂ control
      </span>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {indoorHacks.map((hack) => (
        <article
          key={hack.id}
          className="p-4 rounded-lg border border-slate-200 bg-white"
        >
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-1">
            <span className="font-semibold text-emerald-800">{hack.category}</span>
            <span>Cost: {hack.costTag}</span>
          </div>

          <h4 className="text-sm font-bold text-slate-900 mb-1.5">{hack.title}</h4>
          <p className="text-xs text-slate-600 mb-3">
            <strong className="font-semibold text-slate-800">Key Takeaway: </strong>
            {hack.summary}
          </p>

          <ul className="space-y-1.5 text-xs text-slate-700">
            {hack.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="font-mono text-emerald-700 font-bold" aria-hidden="true">
                  •
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  </div>
);
