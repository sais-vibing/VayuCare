import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ChatMessage,
  CleanAirPlan,
  QuickDemoPreset,
  UserAirProfile,
} from '../types/vayucare.ts';
import { QUICK_DEMO_PRESETS } from '../constants/airQualityData.ts';
import {
  buildInitialEnabledHabits,
  buildSyncedDirectImpactInsights,
  calculateSimulatorImpact,
  classifyAqiCategory,
} from '../utils/airQualityMath.ts';
import { getAqiBadgeMeta } from '../utils/aqiBadges.ts';
import { validateProfileInput } from '../utils/airQualityLogic.ts';
import { sanitizePlainText } from '../utils/securityValidation.ts';
import { fetchLiveCityAqi } from '../services/openMeteoService.ts';
import { askVayuCare, generatePlan } from '../services/geminiService.ts';

/**
 * Encapsulates VayuCare's live AQI telemetry, Gemini Clean Air plan state,
 * interactive simulator toggles, and multi-turn Ask VayuCare chat session.
 */
export function useVayuCareSession() {
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

  const aqiMeta = useMemo(
    () => getAqiBadgeMeta(profile.aqi, profile.liveTelemetry?.pm25),
    [profile.aqi, profile.liveTelemetry?.pm25]
  );

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
      setEnabledHabits(buildInitialEnabledHabits(livePlan.simulatorHabits));
    } catch (err) {
      if (requestId !== activePlanRequestIdRef.current) return;
      setApiError(
        err instanceof Error ? err.message : 'Could not generate Clean Air Action Plan via Gemini API.'
      );
    } finally {
      if (requestId === activePlanRequestIdRef.current) setIsGenerating(false);
    }
  }, []);

  const performLiveAqiFetch = useCallback(
    async (cityName: string, baseProfile: UserAirProfile, shouldAutoGeneratePlan = false) => {
      setLiveAqiLoading(true);
      setLiveAqiError(null);
      try {
        const telemetry = await fetchLiveCityAqi(cityName);
        const updatedProfile: UserAirProfile = {
          ...baseProfile,
          city: telemetry.city,
          aqi: telemetry.indianAqi,
          aqiCategory: classifyAqiCategory(telemetry.indianAqi),
          liveTelemetry: telemetry,
        };
        setProfile(updatedProfile);
        if (shouldAutoGeneratePlan) await requestGeminiPlan(updatedProfile);
      } catch (err) {
        setLiveAqiError(
          err instanceof Error ? err.message : 'Could not fetch live AQI from Open-Meteo Air Quality API.'
        );
        if (shouldAutoGeneratePlan) await requestGeminiPlan(baseProfile);
      } finally {
        setLiveAqiLoading(false);
      }
    },
    [requestGeminiPlan]
  );

  useEffect(() => {
    if (hasBootstrappedRef.current) return;
    hasBootstrappedRef.current = true;
    void performLiveAqiFetch(initialPreset.profile.city, initialPreset.profile, false);
  }, [initialPreset.profile, performLiveAqiFetch]);

  const handleUpdateProfile = (updater: (prev: UserAirProfile) => UserAirProfile) => {
    setValidationError(null);
    setActivePresetId('custom');
    setProfile((prev) => updater(prev));
  };

  const handleSelectCityAndFetchLiveAqi = (cityName: string) => {
    setValidationError(null);
    setActivePresetId('custom');
    const updatedBase: UserAirProfile = { ...profile, city: cityName };
    setProfile(updatedBase);
    void performLiveAqiFetch(cityName, updatedBase, false);
  };

  const handleSelectDemoPreset = (preset: QuickDemoPreset) => {
    setValidationError(null);
    setApiError(null);
    setActivePresetId(preset.id);
    setProfile(preset.profile);
    void performLiveAqiFetch(preset.profile.city, preset.profile, true);
  };

  const handleToggleHabit = (habitId: string) => {
    setEnabledHabits((prev) => ({ ...prev, [habitId]: !prev[habitId] }));
  };

  const handleSelectAllHabits = () => {
    const all: Record<string, boolean> = {};
    for (const h of habitsList) all[h.id] = true;
    setEnabledHabits(all);
  };

  const handleAskQuestion = async (question: string) => {
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const priorHistory = messages;
    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: 'user', content: question, timestamp: nowTime }]);
    setAskError(null);
    setIsAsking(true);
    try {
      const answer = await askVayuCare(question, priorHistory, profile);
      setMessages((prev) => [...prev, { id: `assistant-${Date.now()}`, role: 'assistant', content: answer, timestamp: nowTime }]);
    } catch (err) {
      setAskError(err instanceof Error ? err.message : 'Unable to generate an answer via Gemini API.');
    } finally {
      setIsAsking(false);
    }
  };

  return {
    profile, activePresetId, syncedPlan, habitsList, enabledHabits, simulatorMetrics, aqiMeta,
    validationError, liveAqiLoading, liveAqiError, isGenerating, apiError, messages, isAsking, askError,
    handleUpdateProfile, handleSelectCityAndFetchLiveAqi, handleSelectDemoPreset,
    handleFetchLiveAqiButton: () => void performLiveAqiFetch(profile.city, profile, false),
    handleGeneratePlan: () => void requestGeminiPlan(profile),
    handleToggleHabit, handleSelectAllHabits,
    handleResetDefaultHabits: () => setEnabledHabits(buildInitialEnabledHabits(plan?.simulatorHabits)),
    handleAskQuestion,
  };
}
