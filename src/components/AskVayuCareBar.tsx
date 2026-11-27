import React, { useState } from 'react';
import { ChatMessage, UserAirProfile } from '../types/vayucare';
import { MessageSquare, Send, HelpCircle, AlertTriangle } from 'lucide-react';

interface AskVayuCareBarProps {
  profile: UserAirProfile;
  messages: ChatMessage[];
  isAsking: boolean;
  askError: string | null;
  onAskQuestion: (question: string) => void;
}

const SUGGESTED_QUESTIONS: string[] = [
  'Is it safe to send my 6-year-old to school today?',
  'How do I seal drafty windows cheaply under ₹200?',
  'How do I build a DIY box-fan HEPA filter at home?',
  'When is the safest time for elderly parents to walk outside?',
];

export const AskVayuCareBar: React.FC<AskVayuCareBarProps> = ({
  profile,
  messages,
  isAsking,
  askError,
  onAskQuestion,
}) => {
  const [inputQuestion, setInputQuestion] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputQuestion.trim();
    if (!trimmed || isAsking) return;
    onAskQuestion(trimmed);
    setInputQuestion('');
  };

  return (
    <section
      id="ask-vayucare"
      aria-labelledby="ask-heading"
      className="bg-white border border-slate-200 rounded-xl p-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 mb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 mb-0.5">
            <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
            <span>4. Community Q&A & Family Follow-Up (Live Multi-Turn Gemini Chat)</span>
          </div>
          <h2
            id="ask-heading"
            className="text-lg font-bold text-slate-900 tracking-tight"
          >
            Ask VayuCare ({profile.city} · AQI {profile.aqi})
          </h2>
        </div>
        <span className="text-xs text-slate-500">
          Sends full conversation history & household profile to Gemini AI
        </span>
      </div>

      {/* Quick Prompt Chips */}
      <div className="mb-4">
        <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
          <span>Common family questions (click to ask Gemini):</span>
        </div>
        <div role="group" aria-label="Suggested family questions" className="flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              disabled={isAsking}
              aria-label={`Ask VayuCare: ${q}`}
              onClick={() => onAskQuestion(q)}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-900 border border-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Transparent Error Banner if Gemini Q&A fails or rate-limits */}
      {askError && (
        <div
          role="alert"
          data-testid="gemini-ask-error-banner"
          className="mb-4 p-3.5 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-900"
        >
          <AlertTriangle
            className="w-4 h-4 text-red-700 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div>
            <div className="font-bold text-red-950">Ask VayuCare API Error</div>
            <p className="mt-0.5 text-red-800">{askError}</p>
          </div>
        </div>
      )}

      {/* Chat Conversation Feed */}
      <div
        role="log"
        aria-label="Ask VayuCare conversation history"
        aria-live="polite"
        className="space-y-3 max-h-80 overflow-y-auto pr-1 mb-4"
      >
        {messages.length === 0 && !isAsking && (
          <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-600">
            Ask a follow-up question about your {profile.city} household profile (AQI {profile.aqi}, {profile.homeType}, {profile.commuteMode} commute, Purifier: {profile.purifier}) or click any starter question above.
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-3.5 rounded-lg border text-xs leading-relaxed ${
              msg.role === 'user'
                ? 'bg-slate-50 border-slate-200 text-slate-900'
                : 'bg-emerald-50/50 border-emerald-200 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
              <span className="font-semibold text-slate-900">
                {msg.role === 'user' ? 'Your Household Question' : 'VayuCare Gemini Advisor'}
              </span>
              <span className="font-mono tabular-nums">{msg.timestamp}</span>
            </div>
            <div className="whitespace-pre-line">{msg.content}</div>
          </div>
        ))}

        {isAsking && (
          <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/30 text-xs text-emerald-900 animate-pulse">
            Querying Gemini AI with your {profile.city} (AQI {profile.aqi}) profile and conversation history...
          </div>
        )}
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <label htmlFor="ask-vayucare-input" className="sr-only">
          Ask VayuCare a follow-up question
        </label>
        <input
          id="ask-vayucare-input"
          type="text"
          maxLength={300}
          aria-label="Ask VayuCare a follow-up question"
          value={inputQuestion}
          onChange={(e) => setInputQuestion(e.target.value)}
          placeholder="Ask a follow-up question (e.g., Is it safe to send my 6-year-old to school today?)"
          className="flex-1 px-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
        />
        <button
          type="submit"
          disabled={isAsking || !inputQuestion.trim()}
          aria-label="Send question to VayuCare"
          className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1"
        >
          <Send className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Ask VayuCare</span>
        </button>
      </form>
    </section>
  );
};
