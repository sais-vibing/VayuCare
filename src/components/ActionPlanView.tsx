import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Clock,
  Home,
  LayoutGrid,
  Leaf,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import type { CleanAirPlan, UserAirProfile } from '../types/vayucare.ts';
import { getAqiBadgeMeta } from '../utils/aqiBadges.ts';
import { DailyRoutinePillar } from './DailyRoutinePillar.tsx';
import { IndoorHacksPillar } from './IndoorHacksPillar.tsx';
import { SustainableSwapsPillar } from './SustainableSwapsPillar.tsx';
import { DirectImpactPillar } from './DirectImpactPillar.tsx';
import { PlanSkeleton } from './PlanSkeleton.tsx';

/** Props for {@link ActionPlanView}. */
export interface ActionPlanViewProps {
  plan: CleanAirPlan | null;
  profile: UserAirProfile;
  isLoading: boolean;
  apiError: string | null;
  onRetryGenerate: () => void;
}

type PlanTabId = 'all' | 'routine' | 'indoor' | 'sustainable' | 'impact';

const PLAN_TABS: ReadonlyArray<{ id: PlanTabId; label: string; icon: React.ReactNode }> = [
  { id: 'all', label: 'All 4 Plan Pillars', icon: <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" /> },
  { id: 'routine', label: '1. Low-Emission Daily Routine', icon: <Clock className="w-3.5 h-3.5" aria-hidden="true" /> },
  { id: 'indoor', label: '2. Indoor Air Quality Hacks', icon: <Home className="w-3.5 h-3.5" aria-hidden="true" /> },
  { id: 'sustainable', label: '3. Sustainable Lifestyle Alternatives', icon: <Leaf className="w-3.5 h-3.5" aria-hidden="true" /> },
  { id: 'impact', label: '4. Direct Impact Insights', icon: <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" /> },
];

/**
 * Section 2 four-pillar Gemini Clean Air Action Plan viewer implementing the full WAI-ARIA Tabs pattern.
 */
export const ActionPlanView: React.FC<ActionPlanViewProps> = ({
  plan,
  profile,
  isLoading,
  apiError,
  onRetryGenerate,
}) => {
  const [activeTab, setActiveTab] = useState<PlanTabId>('all');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const aqiMeta = getAqiBadgeMeta(profile.aqi, profile.liveTelemetry?.pm25);

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index;
    if (e.key === 'ArrowRight') nextIndex = (index + 1) % PLAN_TABS.length;
    else if (e.key === 'ArrowLeft') nextIndex = (index - 1 + PLAN_TABS.length) % PLAN_TABS.length;
    else if (e.key === 'Home') nextIndex = 0;
    else if (e.key === 'End') nextIndex = PLAN_TABS.length - 1;
    else return;

    e.preventDefault();
    setActiveTab(PLAN_TABS[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <section
      id="clean-air-plan"
      aria-labelledby="plan-heading"
      className="bg-white border border-slate-200 rounded-xl p-6"
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mb-1">
            <span className="font-semibold text-emerald-800">2. AI-Powered Clean Air Action Plan</span>
            {plan && (
              <>
                <span aria-hidden="true">·</span>
                <span>Safe Ventilation Window: {plan.smogInversionWindow}</span>
                <span aria-hidden="true">·</span>
                <span>Live Gemini AI Output</span>
              </>
            )}
          </div>
          <h2 id="plan-heading" className="text-xl font-bold text-slate-900 tracking-tight">
            {plan ? plan.planTitle : `${profile.city} Clean Air Action Plan (AQI ${profile.aqi} · ${aqiMeta.category})`}
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            {plan
              ? plan.cityContextSummary
              : `Configured for ${profile.city} · ${profile.homeType} · ${profile.commuteMode} commute · Purifier: ${profile.purifier}`}
          </p>
        </div>

        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border shrink-0 ${aqiMeta.bgClass} ${aqiMeta.borderClass} ${aqiMeta.textClass}`}>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider">
              {aqiMeta.label} (AQI {profile.aqi})
            </div>
            <div className="text-[11px] opacity-90 mt-0.5 max-w-xs">{aqiMeta.riskSummary}</div>
          </div>
        </div>
      </div>

      {apiError && (
        <div
          role="alert"
          data-testid="gemini-plan-error-banner"
          className="mt-5 p-4 rounded-lg bg-red-50 border border-red-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-red-900"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <div className="font-bold text-red-950">Gemini API Action Plan Generation Error</div>
              <p className="mt-0.5 text-red-800">{apiError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRetryGenerate}
            disabled={isLoading}
            aria-busy={isLoading}
            className="px-3.5 py-2 bg-red-800 hover:bg-red-900 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-1"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Retry Gemini API Call</span>
          </button>
        </div>
      )}

      <div
        role="tablist"
        aria-label="Clean Air Plan Sections"
        className="flex flex-wrap items-center gap-1.5 p-1.5 mt-5 bg-slate-100 rounded-lg"
      >
        {PLAN_TABS.map((t, index) => {
          const isSelected = activeTab === t.id;
          return (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              id={`plan-tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls={`plan-panel-${t.id}`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => setActiveTab(t.id)}
              onKeyDown={(e) => handleTabKeyDown(e, index)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1 ${
                isSelected ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`plan-panel-${activeTab}`}
        aria-labelledby={`plan-tab-${activeTab}`}
      >
        {isLoading ? (
          <PlanSkeleton />
        ) : !plan ? (
          <div className="mt-6 p-8 rounded-xl border border-slate-200 bg-slate-50 text-center max-w-xl mx-auto space-y-3">
            <div className="text-sm font-bold text-slate-900">
              Ready to Generate Your Personalized Gemini Clean Air Plan
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Click below to send your current household configuration ({profile.city}, AQI {profile.aqi}, {profile.commuteMode}, {profile.homeType}, Purifier: {profile.purifier}) to the Gemini API for a live 4-pillar action plan.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={onRetryGenerate}
                disabled={isLoading}
                aria-busy={isLoading}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Generate My Clean Air Plan Now</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-8">
            {(activeTab === 'all' || activeTab === 'routine') && (
              <DailyRoutinePillar city={profile.city} dailyRoutine={plan.dailyRoutine} />
            )}
            {(activeTab === 'all' || activeTab === 'indoor') && (
              <IndoorHacksPillar homeType={profile.homeType} purifier={profile.purifier} indoorHacks={plan.indoorHacks} />
            )}
            {(activeTab === 'all' || activeTab === 'sustainable') && (
              <SustainableSwapsPillar city={profile.city} alternatives={plan.sustainableAlternatives} />
            )}
            {(activeTab === 'all' || activeTab === 'impact') && (
              <DirectImpactPillar aqi={profile.aqi} insights={plan.directImpactInsights} />
            )}
          </div>
        )}
      </div>
    </section>
  );
};
