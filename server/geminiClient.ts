import {
  GoogleGenAI,
  ThinkingLevel,
  type GenerateContentParameters,
  type GenerateContentResponse,
} from '@google/genai';

/** Timeout ceiling (ms) per Gemini model attempt before triggering fallback. */
export const GEMINI_TIMEOUT_MS = 25_000;

/** Brief delay (ms) between automatic model fallback attempts. */
export const GEMINI_RETRY_DELAY_MS = 250;

/** Ordered Gemini model fallback chain preserving low latency and quota resilience. */
export const GEMINI_MODEL_FALLBACK_CHAIN: ReadonlyArray<{
  model: string;
  thinkingConfig: { thinkingLevel?: ThinkingLevel; thinkingBudget?: number };
}> = [
  { model: 'gemini-3.1-flash-lite', thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } },
  { model: 'gemini-4-hydrogen', thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } },
  { model: 'gemini-2.5-flash', thinkingConfig: { thinkingBudget: 0 } },
  { model: 'gemini-2.5-flash-lite', thinkingConfig: { thinkingBudget: 0 } },
];

/** Function signature for injecting custom or mocked Gemini content generation in tests. */
export type GenerateContentFn = (
  params: Omit<GenerateContentParameters, 'model'>
) => Promise<GenerateContentResponse>;

let cachedAiClient: GoogleGenAI | null = null;
let cachedApiKey = '';

/**
 * Resolves the server-side Gemini API key from environment variables, rejecting placeholders.
 */
export function resolveServerGeminiKey(): string {
  const candidate = (process.env.GEMINI_API_KEY || '').trim();
  if (!candidate || candidate === 'MY_GEMINI_API_KEY' || candidate === 'your_api_key_here') {
    return '';
  }
  return candidate;
}

/**
 * Returns a cached server-side GoogleGenAI client or throws HTTP 503 if unconfigured.
 */
export function getGeminiClient(): GoogleGenAI {
  const apiKey = resolveServerGeminiKey();
  if (!apiKey) {
    const error = new Error(
      'Gemini API key is not configured on the server. Please check GEMINI_API_KEY in Settings > Secrets (or your local .env file).'
    ) as Error & { statusCode?: number };
    error.statusCode = 503;
    throw error;
  }

  if (!cachedAiClient || cachedApiKey !== apiKey) {
    cachedAiClient = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
    cachedApiKey = apiKey;
  }

  return cachedAiClient;
}

/**
 * Determines whether a Gemini SDK error warrants automatic fallback to the next model.
 */
export function isRetryableModelFallbackError(err: unknown): boolean {
  const status =
    typeof err === 'object' && err !== null && 'status' in err
      ? Number((err as { status?: number }).status)
      : undefined;
  if (status === 404 || status === 429 || status === 503) {
    return true;
  }
  const name = err instanceof Error ? err.name : '';
  if (name === 'TimeoutError' || name === 'AbortError') {
    return true;
  }
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('404') ||
    msg.includes('NOT_FOUND') ||
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('503') ||
    msg.includes('UNAVAILABLE') ||
    /overloaded|rate limit|quota|not found|timeout|aborted/i.test(msg)
  );
}

/**
 * Invokes Gemini across the model fallback chain with per-request timeouts.
 */
export async function generateWithFallback(
  params: Omit<GenerateContentParameters, 'model'>,
  aiClient?: GoogleGenAI
): Promise<GenerateContentResponse> {
  const ai = aiClient ?? getGeminiClient();
  let primaryError: unknown;
  let lastError: unknown;

  for (let i = 0; i < GEMINI_MODEL_FALLBACK_CHAIN.length; i += 1) {
    const entry = GEMINI_MODEL_FALLBACK_CHAIN[i];
    try {
      return await ai.models.generateContent({
        ...params,
        model: entry.model,
        config: {
          ...params.config,
          thinkingConfig: entry.thinkingConfig,
          abortSignal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
        },
      });
    } catch (err) {
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);
      if (!primaryError && !errMsg.includes('404') && !errMsg.includes('NOT_FOUND')) {
        primaryError = err;
      }
      const hasFallback = i < GEMINI_MODEL_FALLBACK_CHAIN.length - 1;
      if (hasFallback && isRetryableModelFallbackError(err)) {
        await new Promise((resolve) => setTimeout(resolve, GEMINI_RETRY_DELAY_MS));
        continue;
      }
      throw primaryError ?? err;
    }
  }

  throw primaryError ?? lastError;
}

/**
 * Maps internal Gemini SDK failures into safe HTTP status codes and user-facing messages.
 */
export function formatServerGeminiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  const explicitStatus =
    typeof err === 'object' && err !== null && 'statusCode' in err
      ? Number((err as { statusCode?: number }).statusCode)
      : undefined;

  if (explicitStatus && explicitStatus >= 400 && explicitStatus < 600) {
    return { status: explicitStatus, message: raw };
  }
  if (/PERMISSION_DENIED|API_KEY_INVALID|API key not valid|403/.test(raw)) {
    return {
      status: 403,
      message: 'Gemini API key is missing or invalid (HTTP 403/400). Please check your key in Settings > Secrets.',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      message: 'Gemini API quota or rate limit reached (HTTP 429). Please wait a moment or switch to a billing-enabled API key in Settings > Secrets.',
    };
  }
  if (raw.includes('UNAVAILABLE') || raw.includes('503') || /overloaded/i.test(raw)) {
    return {
      status: 503,
      message: 'Gemini service is temporarily busy (HTTP 503). Please try again in a few seconds.',
    };
  }
  if (raw.includes('NOT_FOUND') || raw.includes('404')) {
    return {
      status: 404,
      message: 'The requested Gemini model is unavailable or not found in this region (HTTP 404).',
    };
  }
  return {
    status: 502,
    message: 'Unable to complete the Gemini API request right now. Please try again in a moment.',
  };
}
