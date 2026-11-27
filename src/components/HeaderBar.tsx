import React from 'react';

/** Props for {@link HeaderBar}. */
export interface HeaderBarProps {
  onGenerateClick: () => void;
  isGenerating: boolean;
}

const NAV_LINKS: ReadonlyArray<{ href: string; label: string }> = [
  { href: '#household-inputs', label: 'Household Profile' },
  { href: '#clean-air-plan', label: 'Action Plan' },
  { href: '#impact-simulator', label: 'Impact Simulator' },
  { href: '#ask-vayucare', label: 'Community Q&A' },
];

/**
 * Top navigation header with brand link, responsive wrapping section navigation, and primary CTA.
 */
export const HeaderBar: React.FC<HeaderBarProps> = ({
  onGenerateClick,
  isGenerating,
}) => (
  <header className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 px-4 sm:px-6 py-4 bg-white border-b border-slate-200">
    <a
      href="#top"
      aria-label="VayuCare Home"
      className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
    >
      VayuCare
    </a>

    <nav
      aria-label="Primary Navigation"
      className="order-3 md:order-2 w-full md:w-auto flex flex-wrap items-center gap-x-5 sm:gap-x-7 gap-y-2 text-sm font-medium text-slate-600 pt-2 md:pt-0 border-t border-slate-100 md:border-t-0"
    >
      {NAV_LINKS.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className="hover:text-emerald-800 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
        >
          {link.label}
        </a>
      ))}
    </nav>

    <div className="order-2 md:order-3 flex items-center shrink-0">
      <button
        type="button"
        onClick={onGenerateClick}
        disabled={isGenerating}
        aria-busy={isGenerating}
        className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
      >
        {isGenerating ? 'Generating Plan...' : 'Generate My Clean Air Plan'}
      </button>
    </div>
  </header>
);
