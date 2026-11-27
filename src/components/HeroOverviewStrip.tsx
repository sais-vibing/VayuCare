import React from 'react';
import type { SimulatorMetrics, UserAirProfile } from '../types/vayucare.ts';
import type { AqiBadgeMeta } from '../utils/aqiBadges.ts';

/** Props for {@link HeroOverviewStrip}. */
export interface HeroOverviewStripProps {
  profile: UserAirProfile;
  aqiMeta: AqiBadgeMeta;
  simulatorMetrics: SimulatorMetrics;
}

/**
 * Compact overview banner summarizing live city AQI, simulated exposure reduction, and PM2.5 saved.
 */
export const HeroOverviewStrip: React.FC<HeroOverviewStripProps> = ({
  profile,
  aqiMeta,
  simulatorMetrics,
}) => (
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

    <div className="grid grid-cols-3 gap-3 shrink-0">
      <div
        className={`p-3.5 rounded-lg border ${aqiMeta.bgClass} ${aqiMeta.borderClass} ${aqiMeta.textClass}`}
      >
        <div className="text-[11px] font-semibold opacity-85">{profile.city} AQI</div>
        <div className="text-2xl font-bold font-mono tabular-nums mt-0.5">{profile.aqi}</div>
        <div className="text-[11px] font-semibold mt-0.5">{aqiMeta.category}</div>
      </div>

      <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/70 text-emerald-950">
        <div className="text-[11px] font-semibold text-emerald-800">Simulated Exposure Cut</div>
        <div className="text-2xl font-bold font-mono tabular-nums mt-0.5">
          -{simulatorMetrics.totalExposureReductionPct}%
        </div>
        <div className="text-[11px] text-emerald-800 mt-0.5 tabular-nums">
          Effective AQI {simulatorMetrics.effectivePersonalAqi}
        </div>
      </div>

      <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900">
        <div className="text-[11px] font-semibold text-slate-600">Daily PM2.5 Saved</div>
        <div className="text-2xl font-bold font-mono tabular-nums mt-0.5">
          {simulatorMetrics.dailyPm25AvoidedUg.toLocaleString('en-IN')}
        </div>
        <div className="text-[11px] text-slate-600 mt-0.5">µg / person / day</div>
      </div>
    </div>
  </section>
);
