import React from 'react';

interface HeaderBarProps {
  onGenerateClick: () => void;
  isGenerating: boolean;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  onGenerateClick,
  isGenerating,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-4 bg-white border-b border-slate-200">
      {/* Zone 1: Single text element wordmark */}
      <a
        href="#top"
        aria-label="VayuCare Home"
        className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
      >
        VayuCare
      </a>

      {/* Zone 2: 4 concise single-line navigation links */}
      <nav
        aria-label="Primary Navigation"
        className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
      >
        <a
          href="#household-inputs"
          className="hover:text-emerald-800 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
        >
          Household Profile
        </a>
        <a
          href="#clean-air-plan"
          className="hover:text-emerald-800 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
        >
          Action Plan
        </a>
        <a
          href="#impact-simulator"
          className="hover:text-emerald-800 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
        >
          Impact Simulator
        </a>
        <a
          href="#ask-vayucare"
          className="hover:text-emerald-800 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
        >
          Community Q&A
        </a>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onGenerateClick}
          disabled={isGenerating}
          aria-label="Generate My Clean Air Plan"
          className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
        >
          {isGenerating ? 'Generating Plan...' : 'Generate My Clean Air Plan'}
        </button>
      </div>
    </header>
  );
};
