import React from 'react';
import { CheckSquare, RotateCcw, Sliders } from 'lucide-react';
import type { SimulatorHabit, SimulatorMetrics } from '../types/vayucare.ts';
import { HabitChecklist } from './HabitChecklist.tsx';
import { SimulatorScoreboard } from './SimulatorScoreboard.tsx';

/** Props for {@link ImpactSimulator}. */
export interface ImpactSimulatorProps {
  outdoorAqi: number;
  habits: SimulatorHabit[];
  enabledHabits: Record<string, boolean>;
  metrics: SimulatorMetrics;
  onToggleHabit: (habitId: string) => void;
  onSelectAllHabits: () => void;
  onResetDefaultHabits: () => void;
}

/**
 * Section 3 interactive What-If Impact Simulator pairing habit toggles with the live scoreboard.
 */
export const ImpactSimulator: React.FC<ImpactSimulatorProps> = ({
  outdoorAqi,
  habits,
  enabledHabits,
  metrics,
  onToggleHabit,
  onSelectAllHabits,
  onResetDefaultHabits,
}) => (
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
            className="px-3 py-1.5 text-xs font-medium text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1"
          >
            <CheckSquare className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Enable All Habits</span>
          </button>
          <button
            type="button"
            onClick={onResetDefaultHabits}
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
        <HabitChecklist
          habits={habits}
          enabledHabits={enabledHabits}
          activeHabitCount={metrics.activeHabitCount}
          totalHabitCount={metrics.totalHabitCount}
          onToggleHabit={onToggleHabit}
        />
        <SimulatorScoreboard outdoorAqi={outdoorAqi} metrics={metrics} />
      </div>
    )}
  </section>
);
