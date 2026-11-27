import React, { useState } from 'react';
import { CleanAirPlan, UserAirProfile } from '../types/vayucare';
import { getAqiBadgeMeta } from '../utils/airQualityLogic';
import {
  Clock,
  Home,
  Leaf,
  BarChart3,
  LayoutGrid,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface ActionPlanViewProps {
  plan: CleanAirPlan | null;
  profile: UserAirProfile;
  isLoading: boolean;
  apiError: string | null;
  onRetryGenerate: () => void;
}

type PlanTabId = 'all' | 'routine' | 'indoor' | 'sustainable' | 'impact';

export const ActionPlanView: React.FC<ActionPlanViewProps> = ({
  plan,
  profile,
  isLoading,
  apiError,
  onRetryGenerate,
}) => {
  const [activeTab, setActiveTab] = useState<PlanTabId>('all');
  const aqiMeta = getAqiBadgeMeta(profile.aqi, profile.liveTelemetry?.pm25);

  const tabs: Array<{
    id: PlanTabId;
    label: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'all',
      label: 'All 4 Plan Pillars',
      icon: <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />,
    },
    {
      id: 'routine',
      label: '1. Low-Emission Daily Routine',
      icon: <Clock className="w-3.5 h-3.5" aria-hidden="true" />,
    },
    {
      id: 'indoor',
      label: '2. Indoor Air Quality Hacks',
      icon: <Home className="w-3.5 h-3.5" aria-hidden="true" />,
    },
    {
      id: 'sustainable',
      label: '3. Sustainable Lifestyle Alternatives',
      icon: <Leaf className="w-3.5 h-3.5" aria-hidden="true" />,
    },
    {
      id: 'impact',
      label: '4. Direct Impact Insights',
      icon: <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" />,
    },
  ];

  return (
    <section
      id="clean-air-plan"
      aria-labelledby="plan-heading"
      className="bg-white border border-slate-200 rounded-xl p-6"
    >
      {/* Top Plan Header & Metadata */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mb-1">
            <span className="font-semibold text-emerald-800">
              2. AI-Powered Clean Air Action Plan
            </span>
            {plan && (
              <>
                <span aria-hidden="true">·</span>
                <span>Safe Ventilation Window: {plan.smogInversionWindow}</span>
                <span aria-hidden="true">·</span>
                <span>Live Gemini AI Output</span>
              </>
            )}
          </div>
          <h2
            id="plan-heading"
            className="text-xl font-bold text-slate-900 tracking-tight"
          >
            {plan
              ? plan.planTitle
              : `${profile.city} Clean Air Action Plan (AQI ${profile.aqi} · ${aqiMeta.category})`}
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            {plan
              ? plan.cityContextSummary
              : `Configured for ${profile.city} · ${profile.homeType} · ${profile.commuteMode} commute · Purifier: ${profile.purifier}`}
          </p>
        </div>

        {/* AQI Status Summary Box */}
        <div
          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border shrink-0 ${aqiMeta.bgClass} ${aqiMeta.borderClass} ${aqiMeta.textClass}`}
        >
          <div>
            <div className="text-xs font-bold uppercase tracking-wider">
              {aqiMeta.label} (AQI {profile.aqi})
            </div>
            <div className="text-[11px] opacity-90 mt-0.5 max-w-xs">
              {aqiMeta.riskSummary}
            </div>
          </div>
        </div>
      </div>

      {/* Transparent Gemini API Error Banner (No Silent Mock Fallback) */}
      {apiError && (
        <div
          role="alert"
          data-testid="gemini-plan-error-banner"
          className="mt-5 p-4 rounded-lg bg-red-50 border border-red-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-red-900"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle
              className="w-4 h-4 text-red-700 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div>
              <div className="font-bold text-red-950">
                Gemini API Action Plan Generation Error
              </div>
              <p className="mt-0.5 text-red-800">{apiError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRetryGenerate}
            disabled={isLoading}
            aria-label="Retry Gemini API Action Plan generation"
            className="px-3.5 py-2 bg-red-800 hover:bg-red-900 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-1"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Retry Gemini API Call</span>
          </button>
        </div>
      )}

      {/* Interactive Tab Switcher */}
      <div
        role="tablist"
        aria-label="Clean Air Plan Sections"
        className="flex flex-wrap items-center gap-1.5 p-1.5 mt-5 bg-slate-100 rounded-lg"
      >
        {tabs.map((t) => {
          const isSelected = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-label={t.label}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1 ${
                isSelected
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Skeleton Loader State during Gemini generation */}
      {isLoading ? (
        <div
          aria-live="polite"
          aria-busy="true"
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
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Generate My Clean Air Plan Now</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {/* PILLAR 1: Low-Emission Daily Routine */}
          {(activeTab === 'all' || activeTab === 'routine') && (
            <div aria-labelledby="pillar-routine-heading">
              <div className="flex items-center justify-between mb-3">
                <h3
                  id="pillar-routine-heading"
                  className="text-base font-bold text-slate-900"
                >
                  01. Low-Emission Daily Routine (Time-Blocked Schedule)
                </h3>
                <span className="text-xs text-slate-500">
                  Calibrated for {profile.city} smog inversion cycle
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plan.dailyRoutine.map((slot) => (
                  <article
                    key={slot.period}
                    className="p-4 rounded-lg border border-slate-200 bg-slate-50/60 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-500 pb-2 mb-2 border-b border-slate-200/80">
                        <span className="font-bold text-slate-900 uppercase tracking-wider">
                          {slot.period}
                        </span>
                        <span className="font-mono tabular-nums">
                          {slot.timeWindow}
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-emerald-800 mb-1.5">
                        {slot.outdoorSafetyStatus}
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 mb-2.5">
                        {slot.headline}
                      </h4>

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
                      <strong className="font-semibold text-slate-900">
                        Family Precaution:{' '}
                      </strong>
                      {slot.vulnerableNote}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {/* PILLAR 2: Indoor Air Quality Hacks */}
          {(activeTab === 'all' || activeTab === 'indoor') && (
            <div aria-labelledby="pillar-indoor-heading">
              <div className="flex items-center justify-between mb-3">
                <h3
                  id="pillar-indoor-heading"
                  className="text-base font-bold text-slate-900"
                >
                  02. Indoor Air Quality Hacks ({profile.homeType} · Purifier:{' '}
                  {profile.purifier})
                </h3>
                <span className="text-xs text-slate-500">
                  Budget-friendly particulate & CO₂ control
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plan.indoorHacks.map((hack) => (
                  <article
                    key={hack.id}
                    className="p-4 rounded-lg border border-slate-200 bg-white"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-1">
                      <span className="font-semibold text-emerald-800">
                        {hack.category}
                      </span>
                      <span>Cost: {hack.costTag}</span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 mb-1.5">
                      {hack.title}
                    </h4>
                    <p className="text-xs text-slate-600 mb-3">
                      <strong className="font-semibold text-slate-800">
                        Key Takeaway:{' '}
                      </strong>
                      {hack.summary}
                    </p>

                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {hack.steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="font-mono text-emerald-700 font-bold">
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
          )}

          {/* PILLAR 3: Sustainable Lifestyle Alternatives */}
          {(activeTab === 'all' || activeTab === 'sustainable') && (
            <div aria-labelledby="pillar-sustainable-heading">
              <div className="flex items-center justify-between mb-3">
                <h3
                  id="pillar-sustainable-heading"
                  className="text-base font-bold text-slate-900"
                >
                  03. Sustainable Lifestyle Alternatives (Tailored for{' '}
                  {profile.city})
                </h3>
                <span className="text-xs text-slate-500">
                  Actionable daily low-emission swaps
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plan.sustainableAlternatives.map((alt) => (
                  <article
                    key={alt.id}
                    className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col justify-between"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 mb-2">
                        {alt.title}
                      </h4>
                      <div className="text-xs text-slate-600 mb-2">
                        <strong className="font-semibold text-slate-800">
                          Instead of:{' '}
                        </strong>
                        {alt.currentHabit}
                      </div>
                      <div className="text-xs text-slate-800 mb-2.5">
                        <strong className="font-semibold text-emerald-800">
                          Clean Swap:{' '}
                        </strong>
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
          )}

          {/* PILLAR 4: Direct Impact Insights */}
          {(activeTab === 'all' || activeTab === 'impact') && (
            <div aria-labelledby="pillar-impact-heading">
              <div className="flex items-center justify-between mb-3">
                <h3
                  id="pillar-impact-heading"
                  className="text-base font-bold text-slate-900"
                >
                  04. Direct Impact Insights (Synchronized with Active Simulator Habits)
                </h3>
                <span className="text-xs text-slate-500">
                  Live protection metrics at AQI {profile.aqi}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {plan.directImpactInsights.map((insight, idx) => (
                  <article
                    key={idx}
                    className="p-4 rounded-lg border border-slate-200 bg-white flex flex-col justify-between"
                  >
                    <div>
                      <div className="text-xs text-slate-500 mb-1">
                        {insight.category}
                      </div>
                      <div className="text-xs font-semibold text-slate-800 mb-2">
                        {insight.metricLabel}
                      </div>
                      <div className="flex items-baseline gap-1.5 my-2">
                        <span className="text-2xl font-bold text-emerald-800 font-mono tabular-nums">
                          {insight.quantifiedValue}
                        </span>
                        <span className="text-xs font-medium text-slate-600">
                          {insight.unit}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 mt-2 pt-2 border-t border-slate-100">
                      {insight.explanation}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
