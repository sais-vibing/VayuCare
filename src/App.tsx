/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  ChatMessage,
  CleanAirPlan,
  QuickDemoPreset,
  UserAirProfile,
} from './types/vayucare';
import {
  QUICK_DEMO_PRESETS,
  buildSyncedDirectImpactInsights,
  calculateSimulatorImpact,
  classifyAqiCategory,
  fetchLiveCityAqi,
  getAqiBadgeMeta,
  validateProfileInput,
} from './utils/airQualityLogic';
import { sanitizePlainText } from './utils/securityValidation';
import { askVayuCare, generatePlan } from './services/geminiService';
import { HeaderBar } from './components/HeaderBar';
import { ProfileInputPanel } from './components/ProfileInputPanel';
import { ActionPlanView } from './components/ActionPlanView';
import { ImpactSimulator } from './components/ImpactSimulator';
import { AskVayuCareBar } from './components/AskVayuCareBar';

function buildInitialEnabledHabits(plan: CleanAirPlan | null): Record<string, boolean> {
  if (!plan || !Array.isArray(plan.simulatorHabits)) {
    return {};
  }
  const map: Record<string, boolean> = {};
  for (const h of plan.simulatorHabits) {
    map[h.id] = Boolean(h.defaultEnabled);
  }
  return map;
}

export default function App() {
  const initialPreset = QUICK_DEMO_PRESETS[0];
  const [profile, setProfile] = useState<UserAirProfile>(initialPreset.profile);
  const [activePresetId, setActivePresetId] = useState<string>(initialPreset.id);
  const [plan, setPlan] = useState<CleanAirPlan | null>(null);
  const [enabledHabits, setEnabledHabits] = useState<Record<string, boolean>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  const [liveAqiLoading, setLiveAqiLoading] = useState<boolean>(false);
  const [liveAqiError, setLiveAqiError] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAsking, setIsAsking] = useState<boolean>(false);
  const [askError, setAskError] = useState<string | null>(null);

  const hasBootstrappedRef = useRef(false);
  const activePlanRequestIdRef = useRef(0);

  const habitsList = useMemo(() => plan?.simulatorHabits ?? [], [plan]);

  const simulatorMetrics = useMemo(
    () => calculateSimulatorImpact(profile.aqi, habitsList, enabledHabits),
    [profile.aqi, habitsList, enabledHabits]
  );

  const syncedPlan = useMemo<CleanAirPlan | null>(() => {
    if (!plan) return null;
    return {
      ...plan,
      directImpactInsights: buildSyncedDirectImpactInsights(
        profile.aqi,
        sanitizePlainText(profile.city) || 'Delhi NCR',
        simulatorMetrics,
        profile.liveTelemetry?.pm25
      ),
    };
  }, [plan, profile.aqi, profile.city, profile.liveTelemetry?.pm25, simulatorMetrics]);

  const aqiMeta = getAqiBadgeMeta(profile.aqi, profile.liveTelemetry?.pm25);

  const requestGeminiPlan = useCallback(async (targetProfile: UserAirProfile) => {
    const check = validateProfileInput(targetProfile);
    if (!check.valid) {
      setValidationError(check.error ?? 'Invalid profile input.');
      return;
    }

    const requestId = ++activePlanRequestIdRef.current;
    setValidationError(null);
    setApiError(null);
    setIsGenerating(true);

    try {
      const livePlan = await generatePlan(targetProfile);
      if (requestId !== activePlanRequestIdRef.current) return;
      setPlan(livePlan);
      setEnabledHabits(buildInitialEnabledHabits(livePlan));
    } catch (err) {
      if (requestId !== activePlanRequestIdRef.current) return;
      setApiError(
        err instanceof Error
          ? err.message
          : 'Could not generate Clean Air Action Plan via Gemini API.'
      );
    } finally {
      if (requestId === activePlanRequestIdRef.current) {
        setIsGenerating(false);
      }
    }
  }, []);

  const performLiveAqiFetch = useCallback(
    async (cityName: string, baseProfile: UserAirProfile, shouldAutoGeneratePlan = false) => {
      setLiveAqiLoading(true);
      setLiveAqiError(null);
      try {
        const telemetry = await fetchLiveCityAqi(cityName);
        const nextAqi = telemetry.indianAqi;
        const updatedProfile: UserAirProfile = {
          ...baseProfile,
          city: telemetry.city,
          aqi: nextAqi,
          aqiCategory: classifyAqiCategory(nextAqi),
          liveTelemetry: telemetry,
        };
        setProfile(updatedProfile);
        if (shouldAutoGeneratePlan) {
          await requestGeminiPlan(updatedProfile);
        }
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Could not fetch live AQI from Open-Meteo Air Quality API.';
        setLiveAqiError(msg);
        if (shouldAutoGeneratePlan) {
          await requestGeminiPlan(baseProfile);
        }
      } finally {
        setLiveAqiLoading(false);
      }
    },
    [requestGeminiPlan]
  );

  // On initial load, auto-fetch live Open-Meteo AQI for default city without triggering Gemini
  useEffect(() => {
    if (hasBootstrappedRef.current) return;
    hasBootstrappedRef.current = true;
    void performLiveAqiFetch(initialPreset.profile.city, initialPreset.profile, false);
  }, [initialPreset.profile, performLiveAqiFetch]);

  const handleUpdateProfile = (
    updater: (prev: UserAirProfile) => UserAirProfile
  ) => {
    setValidationError(null);
    setActivePresetId('custom');
    setProfile((prev) => updater(prev));
  };

  const handleSelectCityAndFetchLiveAqi = (cityName: string) => {
    setValidationError(null);
    setActivePresetId('custom');
    const updatedBase: UserAirProfile = {
      ...profile,
      city: cityName,
    };
    setProfile(updatedBase);
    void performLiveAqiFetch(cityName, updatedBase, false);
  };

  const handleFetchLiveAqiButton = () => {
    void performLiveAqiFetch(profile.city, profile, false);
  };

  const handleSelectDemoPreset = (preset: QuickDemoPreset) => {
    setValidationError(null);
    setApiError(null);
    setActivePresetId(preset.id);
    setProfile(preset.profile);
    void performLiveAqiFetch(preset.profile.city, preset.profile, true);
  };

  const handleGeneratePlan = () => {
    void requestGeminiPlan(profile);
  };

  const handleToggleHabit = (habitId: string) => {
    setEnabledHabits((prev) => ({
      ...prev,
      [habitId]: !prev[habitId],
    }));
  };

  const handleSelectAllHabits = () => {
    const all: Record<string, boolean> = {};
    for (const h of habitsList) {
      all[h.id] = true;
    }
    setEnabledHabits(all);
  };

  const handleResetDefaultHabits = () => {
    setEnabledHabits(buildInitialEnabledHabits(plan));
  };

  const handleAskQuestion = async (question: string) => {
    const nowTime = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: nowTime,
    };

    const priorHistory = messages;

    setMessages((prev) => [...prev, userMsg]);
    setAskError(null);
    setIsAsking(true);

    try {
      const answer = await askVayuCare(question, priorHistory, profile);
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: answer,
          timestamp: nowTime,
        },
      ]);
    } catch (err) {
      setAskError(
        err instanceof Error
          ? err.message
          : 'Unable to generate an answer via Gemini API.'
      );
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div id="top" className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <HeaderBar
        onGenerateClick={handleGeneratePlan}
        isGenerating={isGenerating}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Compact Hero & Live City AQI Overview Strip */}
        <section
          aria-label="Urban Air Quality Overview"
          className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
        >
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs text-emerald-800 font-semibold mb-1.5">
              <span>Urban Air Quality & Smog Resilience Assistant</span>
              <span aria-hidden="true">·</span>
              <span>Live Open-Meteo Telemetry + Gemini AI</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight text-balance">
              Protect your family from winter smog with live AQI telemetry & personalized clean-air engineering
            </h1>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Fetch real-time PM2.5, PM10, and AQI data from Open-Meteo for your city, customize your household vulnerabilities, and generate a tailored Gemini AI Clean Air Action Plan.
            </p>
          </div>

          {/* Key Live Status Metrics */}
          <div className="grid grid-cols-3 gap-3 shrink-0">
            <div
              className={`p-3.5 rounded-lg border ${aqiMeta.bgClass} ${aqiMeta.borderClass} ${aqiMeta.textClass}`}
            >
              <div className="text-[11px] font-semibold opacity-85">
                {profile.city} AQI
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums mt-0.5">
                {profile.aqi}
              </div>
              <div className="text-[11px] font-semibold mt-0.5">
                {aqiMeta.category}
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/70 text-emerald-950">
              <div className="text-[11px] font-semibold text-emerald-800">
                Simulated Exposure Cut
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums mt-0.5">
                -{simulatorMetrics.totalExposureReductionPct}%
              </div>
              <div className="text-[11px] text-emerald-800 mt-0.5 tabular-nums">
                Effective AQI {simulatorMetrics.effectivePersonalAqi}
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900">
              <div className="text-[11px] font-semibold text-slate-600">
                Daily PM2.5 Saved
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums mt-0.5">
                {simulatorMetrics.dailyPm25AvoidedUg.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5">
                µg / person / day
              </div>
            </div>
          </div>
        </section>

        {/* 1. Core User Inputs Dashboard Form */}
        <ProfileInputPanel
          profile={profile}
          activePresetId={activePresetId}
          validationError={validationError}
          liveAqiLoading={liveAqiLoading}
          liveAqiError={liveAqiError}
          isGenerating={isGenerating}
          onUpdateProfile={handleUpdateProfile}
          onSelectCityAndFetchLiveAqi={handleSelectCityAndFetchLiveAqi}
          onFetchLiveAqi={handleFetchLiveAqiButton}
          onSelectDemoPreset={handleSelectDemoPreset}
          onGeneratePlan={handleGeneratePlan}
        />

        {/* 2. AI-Powered Action Plan (4 Tabs / Cards) */}
        <ActionPlanView
          plan={syncedPlan}
          profile={profile}
          isLoading={isGenerating}
          apiError={apiError}
          onRetryGenerate={handleGeneratePlan}
        />

        {/* 3. Interactive "What-If" Impact Simulator */}
        <ImpactSimulator
          outdoorAqi={profile.aqi}
          habits={habitsList}
          enabledHabits={enabledHabits}
          metrics={simulatorMetrics}
          onToggleHabit={handleToggleHabit}
          onSelectAllHabits={handleSelectAllHabits}
          onResetDefaultHabits={handleResetDefaultHabits}
        />

        {/* 4. Lightweight "Ask VayuCare" Community Q&A Bar */}
        <AskVayuCareBar
          profile={profile}
          messages={messages}
          isAsking={isAsking}
          askError={askError}
          onAskQuestion={handleAskQuestion}
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
