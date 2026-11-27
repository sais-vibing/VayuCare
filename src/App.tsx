import { useVayuCareSession } from './hooks/useVayuCareSession.ts';
import { HeaderBar } from './components/HeaderBar.tsx';
import { HeroOverviewStrip } from './components/HeroOverviewStrip.tsx';
import { ProfileInputPanel } from './components/ProfileInputPanel.tsx';
import { ActionPlanView } from './components/ActionPlanView.tsx';
import { ImpactSimulator } from './components/ImpactSimulator.tsx';
import { AskVayuCareBar } from './components/AskVayuCareBar.tsx';

/**
 * Root VayuCare application layout combining live AQI telemetry, household configuration,
 * Gemini 4-pillar action plans, What-If exposure simulation, and community Q&A.
 */
export default function App() {
  const session = useVayuCareSession();

  return (
    <div id="top" className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-emerald-700 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>

      <HeaderBar
        onGenerateClick={session.handleGeneratePlan}
        isGenerating={session.isGenerating}
      />

      <main
        id="main-content"
        className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6"
      >
        <HeroOverviewStrip
          profile={session.profile}
          aqiMeta={session.aqiMeta}
          simulatorMetrics={session.simulatorMetrics}
        />

        <ProfileInputPanel
          profile={session.profile}
          activePresetId={session.activePresetId}
          validationError={session.validationError}
          liveAqiLoading={session.liveAqiLoading}
          liveAqiError={session.liveAqiError}
          isGenerating={session.isGenerating}
          onUpdateProfile={session.handleUpdateProfile}
          onSelectCityAndFetchLiveAqi={session.handleSelectCityAndFetchLiveAqi}
          onFetchLiveAqi={session.handleFetchLiveAqiButton}
          onSelectDemoPreset={session.handleSelectDemoPreset}
          onGeneratePlan={session.handleGeneratePlan}
        />

        <ActionPlanView
          plan={session.syncedPlan}
          profile={session.profile}
          isLoading={session.isGenerating}
          apiError={session.apiError}
          onRetryGenerate={session.handleGeneratePlan}
        />

        <ImpactSimulator
          outdoorAqi={session.profile.aqi}
          habits={session.habitsList}
          enabledHabits={session.enabledHabits}
          metrics={session.simulatorMetrics}
          onToggleHabit={session.handleToggleHabit}
          onSelectAllHabits={session.handleSelectAllHabits}
          onResetDefaultHabits={session.handleResetDefaultHabits}
        />

        <AskVayuCareBar
          profile={session.profile}
          messages={session.messages}
          isAsking={session.isAsking}
          askError={session.askError}
          onAskQuestion={session.handleAskQuestion}
        />
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 px-6 mt-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            VayuCare — Urban Air Quality & Clean Air Assistant for Indian Households
          </span>
          <span>
            Live Air Quality via Open-Meteo API · PM2.5 & AQI thresholds aligned with CPCB standards
          </span>
        </div>
      </footer>
    </div>
  );
}
