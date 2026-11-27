import React from 'react';

/**
 * Accessible loading skeleton shown while Gemini generates a Clean Air Action Plan.
 */
export const PlanSkeleton: React.FC = () => (
  <div
    role="status"
    aria-live="polite"
    aria-busy="true"
    aria-label="Generating personalized Clean Air Action Plan"
    className="mt-6 space-y-6 animate-pulse"
  >
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className="p-5 rounded-lg border border-slate-200 bg-slate-50 space-y-3"
        >
          <div className="h-4 w-1/2 bg-slate-200 rounded" />
          <div className="h-3 w-3/4 bg-slate-200 rounded" />
          <div className="space-y-2 pt-2">
            <div className="h-3 w-full bg-slate-200 rounded" />
            <div className="h-3 w-5/6 bg-slate-200 rounded" />
            <div className="h-3 w-4/6 bg-slate-200 rounded" />
          </div>
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[1, 2].map((n) => (
        <div
          key={n}
          className="p-5 rounded-lg border border-slate-200 bg-slate-50 space-y-3"
        >
          <div className="h-4 w-2/3 bg-slate-200 rounded" />
          <div className="h-3 w-full bg-slate-200 rounded" />
          <div className="h-3 w-4/5 bg-slate-200 rounded" />
        </div>
      ))}
    </div>
  </div>
);
