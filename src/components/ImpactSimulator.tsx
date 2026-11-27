import React from 'react';
import { SimulatorHabit, SimulatorMetrics } from '../types/vayucare';
import { classifyAqiCategory } from '../utils/airQualityLogic';
import { Sliders, ShieldCheck, RotateCcw, CheckSquare } from 'lucide-react';

interface ImpactSimulatorProps {
  outdoorAqi: number;
  habits: SimulatorHabit[];
  enabledHabits: Record<string, boolean>;
  metrics: SimulatorMetrics;
  onToggleHabit: (habitId: string) => void;
  onSelectAllHabits: () => void;
  onResetDefaultHabits: () => void;
}

export const ImpactSimulator: React.FC<ImpactSimulatorProps> = ({
  outdoorAqi,
  habits,
  enabledHabits,
  metrics,
  onToggleHabit,
  onSelectAllHabits,
  onResetDefaultHabits,
}) => {
  const effectiveCategory = classifyAqiCategory(metrics.effectivePersonalAqi);

  return (
    <section
      id="impact-simulator"
      aria-labelledby="simulator-heading"
      className="bg-white border border-slate-200 rounded-xl p-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 mb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-emerald-800 font-semibold mb-1">
            <Sliders className="w-3.5 h-3.5" aria-hidden="true" />
            <span>3. Interactive &ldquo;What-If&rdquo; Impact Simulator</span>
          </div>
          <h2
            id="simulator-heading"
            className="text-lg font-bold text-slate-900 tracking-tight"
          >
            Daily Exposure Reduction & Eco-Impact Scoreboard
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Toggle Gemini-recommended clean-air habits ON or OFF to dynamically update both this scoreboard and Section 04 Direct Impact Insights:
          </p>
        </div>

        {habits.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onSelectAllHabits}
              aria-label="Enable all recommended clean-air habits"
              className="px-3 py-1.5 text-xs font-medium text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1"
            >
              <CheckSquare className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Enable All Habits</span>
            </button>
            <button
              type="button"
              onClick={onResetDefaultHabits}
              aria-label="Reset clean-air habits to recommended defaults"
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Reset Defaults</span>
            </button>
          </div>
        )}
      </div>

      {habits.length === 0 ? (
        <div className="p-6 rounded-lg border border-slate-200 bg-slate-50 text-center text-xs text-slate-600">
          Generate your Clean Air Action Plan above to populate custom Gemini-tailored What-If simulator habits for your household profile.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Interactive Habit Checklist (7 cols) */}
          <div className="lg:col-span-7 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>
                Recommended Clean-Air Habits ({metrics.activeHabitCount} of{' '}
                {metrics.totalHabitCount} active)
              </span>
              <span>Individual Reduction Contribution</span>
            </div>

            {habits.map((habit) => {
              const isChecked = Boolean(enabledHabits[habit.id]);
              return (
                <label
                  key={habit.id}
                  htmlFor={`habit-toggle-${habit.id}`}
                  className={`flex items-start justify-between gap-4 p-3.5 rounded-lg border transition-colors cursor-pointer focus-within:ring-2 focus-within:ring-emerald-600 ${
                    isChecked
                      ? 'bg-emerald-50/60 border-emerald-600 text-slate-900'
                      : 'bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <input
                      id={`habit-toggle-${habit.id}`}
                      type="checkbox"
                      checked={isChecked}
                      aria-label={`Toggle habit: ${habit.label} (-${habit.exposureReductionPct}% PM2.5)`}
                      onChange={() => onToggleHabit(habit.id)}
                      className="mt-0.5 w-4 h-4 accent-emerald-700 rounded cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900">
                        {habit.label}
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        {habit.description}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 tabular-nums">
                        <span>{habit.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>Saves {habit.pm25SavedUg} µg PM2.5/day</span>
                        <span aria-hidden="true">·</span>
                        <span>-{habit.co2SavedGrams} g CO₂</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 font-mono tabular-nums">
                    <span
                      className={`text-xs font-bold ${
                        isChecked ? 'text-emerald-800' : 'text-slate-400'
                      }`}
                    >
                      -{habit.exposureReductionPct}% PM2.5
                    </span>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Right: Visual Daily Exposure Reduction & Eco-Impact Score Panel (5 cols) */}
          <div
            data-testid="simulator-scoreboard"
            className="lg:col-span-5 p-5 rounded-xl border border-slate-200 bg-slate-50 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <div className="text-xs font-semibold text-slate-500">
                  Simulated Protection Summary
                </div>
                <div className="text-sm font-bold text-slate-900">
                  Live Household Exposure Forecast
                </div>
              </div>
              <ShieldCheck
                className="w-5 h-5 text-emerald-700"
                aria-hidden="true"
              />
            </div>

            {/* Primary Exposure Reduction Progress Gauge */}
            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-700">
                  Daily Exposure Reduction
                </span>
                <span
                  data-testid="exposure-reduction-pct"
                  className="text-2xl font-bold text-emerald-800 font-mono tabular-nums"
                >
                  {metrics.totalExposureReductionPct}%
                </span>
              </div>
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-700 transition-transform duration-150 origin-left"
                  style={{
                    transform: `scaleX(${metrics.totalExposureReductionPct / 100})`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 mt-1 tabular-nums">
                <span>0% (Unprotected Outdoor Air)</span>
                <span>85% Max Practical Reduction</span>
              </div>
            </div>

            {/* Community Eco-Impact Score Bar */}
            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-700">
                  Eco-Impact Score
                </span>
                <span
                  data-testid="eco-impact-score"
                  className="text-xl font-bold text-slate-900 font-mono tabular-nums"
                >
                  {metrics.ecoImpactScore} / 100
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-700 transition-transform duration-150 origin-left"
                  style={{
                    transform: `scaleX(${metrics.ecoImpactScore / 100})`,
                  }}
                />
              </div>
            </div>

            {/* 4 Quantified Simulation Readouts */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-500">
                  Effective Personal AQI
                </div>
                <div
                  data-testid="effective-personal-aqi"
                  className="text-lg font-bold text-slate-900 font-mono tabular-nums mt-0.5"
                >
                  {metrics.effectivePersonalAqi}{' '}
                  <span className="text-xs font-normal text-slate-500">
                    vs {outdoorAqi}
                  </span>
                </div>
                <div className="text-[11px] text-emerald-800 font-medium mt-0.5">
                  Feels like {effectiveCategory} air
                </div>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-500">
                  Inhaled PM2.5 Avoided
                </div>
                <div
                  data-testid="pm25-avoided-ug"
                  className="text-lg font-bold text-emerald-800 font-mono tabular-nums mt-0.5"
                >
                  {metrics.dailyPm25AvoidedUg.toLocaleString('en-IN')} µg
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  Per person / 24 hrs
                </div>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-500">
                  Cigarette Equivalent Saved
                </div>
                <div className="text-lg font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                  {metrics.equivalentCigarettesAvoided} cigs
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  Avoided toxic load / day
                </div>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-500">
                  Community CO₂ & Smoke Cut
                </div>
                <div className="text-lg font-bold text-teal-800 font-mono tabular-nums mt-0.5">
                  {metrics.dailyCo2SavedGrams.toLocaleString('en-IN')} g
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  CO₂e prevented / day
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
