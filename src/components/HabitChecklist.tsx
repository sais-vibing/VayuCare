import React from 'react';
import type { SimulatorHabit } from '../types/vayucare.ts';

/** Props for {@link HabitChecklist}. */
export interface HabitChecklistProps {
  habits: SimulatorHabit[];
  enabledHabits: Record<string, boolean>;
  activeHabitCount: number;
  totalHabitCount: number;
  onToggleHabit: (habitId: string) => void;
}

/**
 * Interactive checklist of Gemini-recommended clean-air habits for the What-If simulator.
 */
export const HabitChecklist: React.FC<HabitChecklistProps> = ({
  habits,
  enabledHabits,
  activeHabitCount,
  totalHabitCount,
  onToggleHabit,
}) => (
  <div className="lg:col-span-7 space-y-2.5">
    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
      <span>
        Recommended Clean-Air Habits ({activeHabitCount} of {totalHabitCount} active)
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
              onChange={() => onToggleHabit(habit.id)}
              className="mt-0.5 w-4 h-4 accent-emerald-700 rounded cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-900">{habit.label}</div>
              <div className="text-[11px] text-slate-600 mt-0.5">{habit.description}</div>
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
);
