import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  GoogleGenAI,
  ThinkingLevel,
  type GenerateContentParameters,
  type GenerateContentResponse,
} from '@google/genai';
import type { CleanAirPlan } from './src/types/vayucare.ts';
import {
  buildSyncedDirectImpactInsights,
  calculateSimulatorImpact,
} from './src/utils/airQualityLogic.ts';
import {
  InMemoryRateLimiter,
  sanitizePlainText,
  validateAndSanitizeAskRequest,
  validateAndSanitizePlanRequest,
} from './src/utils/securityValidation.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

// IP-based rate limiter: max 15 Gemini requests per minute per client IP
const apiRateLimiter = new InMemoryRateLimiter(60_000, 15);

let cachedAiClient: GoogleGenAI | null = null;
let cachedApiKey = '';

function resolveServerGeminiKey(): string {
  const candidate = (process.env.GEMINI_API_KEY || '').trim();
  if (
    !candidate ||
    candidate === 'MY_GEMINI_API_KEY' ||
    candidate === 'your_api_key_here'
  ) {
    return '';
  }
  return candidate;
}

function getGeminiClient(): GoogleGenAI {
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
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    cachedApiKey = apiKey;
  }

  return cachedAiClient;
}

const GEMINI_MODEL_FALLBACK_CHAIN: ReadonlyArray<{
  model: string;
  thinkingConfig: { thinkingLevel?: ThinkingLevel; thinkingBudget?: number };
}> = [
  { model: 'gemini-3.1-flash-lite', thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } },
  { model: 'gemini-4-hydrogen', thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } },
  { model: 'gemini-2.5-flash', thinkingConfig: { thinkingBudget: 0 } },
  { model: 'gemini-2.5-flash-lite', thinkingConfig: { thinkingBudget: 0 } },
];

function isRetryableModelFallbackError(err: unknown): boolean {
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

async function generateWithFallback(
  ai: GoogleGenAI,
  params: Omit<GenerateContentParameters, 'model'>
): Promise<GenerateContentResponse> {
  let primaryError: unknown;
  let lastError: unknown;

  for (let i = 0; i < GEMINI_MODEL_FALLBACK_CHAIN.length; i++) {
    const entry = GEMINI_MODEL_FALLBACK_CHAIN[i];
    try {
      return await ai.models.generateContent({
        ...params,
        model: entry.model,
        config: {
          ...params.config,
          thinkingConfig: entry.thinkingConfig,
          abortSignal: AbortSignal.timeout(25_000),
        },
      });
    } catch (err) {
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);
      const isNotFound = errMsg.includes('404') || errMsg.includes('NOT_FOUND');
      if (!primaryError && !isNotFound) {
        primaryError = err;
      }
      const hasFallback = i < GEMINI_MODEL_FALLBACK_CHAIN.length - 1;
      if (hasFallback && isRetryableModelFallbackError(err)) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        continue;
      }
      throw primaryError ?? err;
    }
  }

  throw primaryError ?? lastError;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim().length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || req.ip || 'unknown';
}

function isSameOriginAllowed(req: Request): boolean {
  const originHeader = req.headers.origin;
  if (!originHeader || typeof originHeader !== 'string') {
    return true;
  }

  try {
    const parsedOrigin = new URL(originHeader);
    const requestHost = (
      (req.headers['x-forwarded-host'] as string | undefined) ||
      req.headers.host ||
      ''
    )
      .split(',')[0]
      .trim()
      .toLowerCase();

    if (requestHost && parsedOrigin.host.toLowerCase() === requestHost) {
      return true;
    }

    const appUrl = (process.env.APP_URL || '').trim();
    if (appUrl && appUrl !== 'MY_APP_URL') {
      try {
        const parsedAppUrl = new URL(appUrl);
        if (parsedOrigin.origin === parsedAppUrl.origin) {
          return true;
        }
      } catch {
        // Ignore malformed APP_URL
      }
    }

    return false;
  } catch {
    return false;
  }
}

function formatServerGeminiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  const explicitStatus =
    typeof err === 'object' && err !== null && 'statusCode' in err
      ? Number((err as { statusCode?: number }).statusCode)
      : undefined;

  if (explicitStatus && explicitStatus >= 400 && explicitStatus < 600) {
    return { status: explicitStatus, message: raw };
  }

  if (
    raw.includes('PERMISSION_DENIED') ||
    raw.includes('API_KEY_INVALID') ||
    raw.includes('API key not valid') ||
    raw.includes('403')
  ) {
    return {
      status: 403,
      message:
        'Gemini API key is missing or invalid (HTTP 403/400). Please check your key in Settings > Secrets.',
    };
  }

  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      message:
        'Gemini API quota or rate limit reached (HTTP 429). Please wait a moment or switch to a billing-enabled API key in Settings > Secrets.',
    };
  }

  if (raw.includes('UNAVAILABLE') || raw.includes('503') || /overloaded/i.test(raw)) {
    return {
      status: 503,
      message:
        'Gemini service is temporarily busy (HTTP 503). Please try again in a few seconds.',
    };
  }

  if (raw.includes('NOT_FOUND') || raw.includes('404')) {
    return {
      status: 404,
      message:
        'The requested Gemini model is unavailable or not found in this region (HTTP 404).',
    };
  }

  return {
    status: 502,
    message:
      'Unable to complete the Gemini API request right now. Please try again in a moment.',
  };
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Security headers (iframe-compatible for AI Studio preview)
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data: https://fonts.gstatic.com",
        "connect-src 'self' https://air-quality-api.open-meteo.com https://geocoding-api.open-meteo.com ws: wss:",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ')
    );
    next();
  });

  app.use(express.json({ limit: '64kb' }));

  // Catch malformed JSON payloads cleanly without leaking stack traces
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (err instanceof SyntaxError && 'status' in err) {
      res.status(400).json({ error: 'Invalid JSON payload.' });
      return;
    }
    next(err);
  });

  // Strict same-origin CORS guard for /api/*
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Vary', 'Origin');
    const originHeader = req.headers.origin;
    if (originHeader) {
      if (!isSameOriginAllowed(req)) {
        res.status(403).json({ error: 'Cross-origin API requests are not allowed.' });
        return;
      }
      res.setHeader('Access-Control-Allow-Origin', originHeader);
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    next();
  });

  // IP-based rate limiter on Gemini API routes
  const rateLimitMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const clientIp = getClientIp(req);
    const rateStatus = apiRateLimiter.check(clientIp);
    if (!rateStatus.allowed) {
      res.setHeader('Retry-After', String(rateStatus.retryAfterSeconds));
      res.status(429).json({
        error: `Rate limit reached (15 requests per minute). Please wait ${rateStatus.retryAfterSeconds} seconds before making another Gemini request.`,
      });
      return;
    }
    next();
  };

  // POST /api/generate-plan — Structured 4-pillar Clean Air Plan + 6 What-If simulator habits
  app.post('/api/generate-plan', rateLimitMiddleware, async (req: Request, res: Response) => {
    const validation = validateAndSanitizePlanRequest(req.body);
    if (!validation.valid || !validation.data) {
      res.status(400).json({ error: validation.error || 'Invalid household profile input.' });
      return;
    }

    const profile = validation.data;
    const telemetryLine = profile.liveTelemetry
      ? `- Live Open-Meteo Telemetry: PM2.5 = ${profile.liveTelemetry.pm25} µg/m³, PM10 = ${profile.liveTelemetry.pm10} µg/m³, US AQI = ${profile.liveTelemetry.usAqi}, Indian NAQI = ${profile.liveTelemetry.indianAqi} (coords: ${profile.liveTelemetry.latitude}, ${profile.liveTelemetry.longitude})`
      : `- Estimated PM2.5: ~${Math.round(profile.aqi * 0.68)} µg/m³`;

    try {
      const ai = getGeminiClient();
      const prompt = `Generate a localized, practical Clean Air Action Plan and 6 Interactive What-If Simulator Habits for an Indian household with this exact profile:
- City / Neighbourhood: ${profile.city}
- Current Selected AQI: ${profile.aqi} (${profile.aqiCategory})
${telemetryLine}
- Household Vulnerable Members: ${
        profile.householdTags.length > 0
          ? profile.householdTags.join(', ')
          : 'General adult household (no specific high-risk tags selected)'
      }
- Primary Daily Commute: ${profile.commuteMode}
- Home Type: ${profile.homeType}
- Air Purifier Availability: ${profile.purifier}

Return ONLY a valid JSON object matching this exact structure (keep every bullet/step under 12 words and every summary/note to 1 short sentence):
{
  "planTitle": "string",
  "cityContextSummary": "string",
  "smogInversionWindow": "string",
  "dailyRoutine": [
    {
      "period": "Morning" | "Afternoon" | "Evening",
      "timeWindow": "string (e.g. 6:00 AM - 10:00 AM)",
      "outdoorSafetyStatus": "string (e.g. Avoid Outdoor Activity)",
      "headline": "string",
      "actions": ["action 1", "action 2"],
      "vulnerableNote": "string tailored to ${
        profile.householdTags.length > 0 ? profile.householdTags.join(', ') : 'household members'
      }"
    }
  ],
  "indoorHacks": [
    {
      "id": "hack-1",
      "title": "string",
      "category": "Ventilation" | "Filtration" | "Cleaning" | "Source Control",
      "costTag": "string (e.g. Free, ₹150, Existing HEPA)",
      "summary": "string",
      "steps": ["step 1", "step 2"]
    }
  ],
  "sustainableAlternatives": [
    {
      "id": "alt-1",
      "title": "string",
      "currentHabit": "string",
      "recommendedSwap": "string",
      "cityContext": "string for ${profile.city}",
      "emissionSavingText": "string"
    }
  ],
  "simulatorHabits": [
    {
      "id": "habit-1",
      "label": "string",
      "category": "Indoor Air" | "Commute & Masking" | "Community Eco",
      "exposureReductionPct": 15,
      "pm25SavedUg": 120,
      "co2SavedGrams": 450,
      "ecoScorePoints": 18,
      "defaultEnabled": true,
      "description": "1 short sentence"
    }
  ]
}

Counts required:
- dailyRoutine: exactly 3 items ("Morning", "Afternoon", "Evening") tailored to ${profile.commuteMode}.
- indoorHacks: exactly 4 items ("Ventilation", "Filtration", "Cleaning", "Source Control") tailored to ${profile.homeType} and Purifier=${profile.purifier} (smog inversion hours, wet-mopping vs dry jhadu, kitchen exhaust, HEPA/DIY box-fan).
- sustainableAlternatives: exactly 3 items tailored to ${profile.city} and ${profile.commuteMode}.
- simulatorHabits: exactly 6 items across "Indoor Air", "Commute & Masking", "Community Eco" (exposureReductionPct 6-26, ecoScorePoints 10-22 summing to ~100, pm25SavedUg integer for AQI ${profile.aqi}, co2SavedGrams integer).`;

      const response = await generateWithFallback(ai, {
        contents: prompt,
        config: {
          systemInstruction:
            'You are VayuCare, an Indian urban air quality assistant for winter smog and indoor air quality. Return ONLY a valid compact JSON object matching the requested structure with no markdown fences.',
          responseMimeType: 'application/json',
        },
      });

      const rawText = (response.text ?? '')
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      if (!rawText) {
        res.status(502).json({
          error: 'Gemini API returned an empty response. Please try generating your plan again.',
        });
        return;
      }

      const parsed = JSON.parse(rawText) as Omit<
        CleanAirPlan,
        'generatedSource' | 'directImpactInsights'
      >;

      if (
        !Array.isArray(parsed.dailyRoutine) ||
        !Array.isArray(parsed.indoorHacks) ||
        !Array.isArray(parsed.sustainableAlternatives) ||
        !Array.isArray(parsed.simulatorHabits)
      ) {
        res.status(502).json({
          error: 'Gemini returned an incomplete plan structure. Please click Retry to generate again.',
        });
        return;
      }

      const initialEnabled: Record<string, boolean> = {};
      for (const h of parsed.simulatorHabits) {
        initialEnabled[h.id] = Boolean(h.defaultEnabled);
      }
      const initialMetrics = calculateSimulatorImpact(
        profile.aqi,
        parsed.simulatorHabits,
        initialEnabled
      );

      const plan: CleanAirPlan = {
        ...parsed,
        directImpactInsights: buildSyncedDirectImpactInsights(
          profile.aqi,
          profile.city,
          initialMetrics,
          profile.liveTelemetry?.pm25
        ),
        generatedSource: 'gemini-ai',
      };

      res.status(200).json({ plan });
    } catch (err) {
      const formatted = formatServerGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // POST /api/ask-vayucare — Multi-turn Gemini Q&A with household profile context
  app.post('/api/ask-vayucare', rateLimitMiddleware, async (req: Request, res: Response) => {
    const validation = validateAndSanitizeAskRequest(req.body);
    if (!validation.valid || !validation.question) {
      res.status(400).json({
        error: validation.error || 'Please enter a valid question (up to 300 characters).',
      });
      return;
    }

    const cleanQuestion = validation.question;
    const cleanHistory = validation.history ?? [];
    const cleanProfile = validation.profile;

    const profileSummary = cleanProfile
      ? `Current Household Profile:
- City: ${cleanProfile.city}
- Outdoor AQI: ${cleanProfile.aqi} (${cleanProfile.aqiCategory})
${
  cleanProfile.liveTelemetry
    ? `- Real-Time Open-Meteo Telemetry: PM2.5=${cleanProfile.liveTelemetry.pm25} µg/m³, PM10=${cleanProfile.liveTelemetry.pm10} µg/m³, US AQI=${cleanProfile.liveTelemetry.usAqi}, Indian NAQI=${cleanProfile.liveTelemetry.indianAqi}`
    : ''
}
- Vulnerable Members: ${cleanProfile.householdTags.join(', ') || 'None specified'}
- Primary Commute: ${cleanProfile.commuteMode}
- Home Type: ${cleanProfile.homeType}
- Air Purifier Availability: ${cleanProfile.purifier}`
      : 'Current Household Profile: Not specified.';

    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    for (const turn of cleanHistory) {
      contents.push({
        role: turn.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: turn.content }],
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: cleanQuestion }],
    });

    try {
      const ai = getGeminiClient();
      const response = await generateWithFallback(ai, {
        contents,
        config: {
          systemInstruction: `You are VayuCare, a concise, empathetic Indian urban air quality and respiratory safety advisor.
${profileSummary}
Use the household profile and conversation history above to give genuinely tailored, localized advice. Answer in 3 to 4 crisp plain-text bullet points starting with "• " using practical Indian household tactics (e.g., N95/FFP2 respirator fit, smog inversion hours, ₹100 EPDM window sealing tape, wet mopping vs dry jhadu, DIY box-fan HEPA filters, RWA actions, paediatric/elderly precautions). Do NOT use Markdown asterisks or bold syntax (** or *). Keep total answer under 130 words.`,
        },
      });

      const rawAnswer = (response.text ?? '').trim();
      if (!rawAnswer) {
        res.status(502).json({
          error: 'Gemini API returned an empty answer. Please try asking your question again.',
        });
        return;
      }

      const formattedAnswer = rawAnswer
        .split('\n')
        .map((line) =>
          sanitizePlainText(
            line
              .replace(/^\s*[-*]\s+/, '• ')
              .replace(/\*\*(.*?)\*\*/g, '$1')
              .replace(/__(.*?)__/g, '$1')
          )
        )
        .filter(Boolean)
        .join('\n');

      res.status(200).json({ answer: formattedAnswer });
    } catch (err) {
      const formatted = formatServerGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // Catch-all for unknown /api/* routes so they always return JSON (never index.html)
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    const indexHtmlPath = path.join(distDir, 'index.html');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req: Request, res: Response) => {
      if (fs.existsSync(indexHtmlPath)) {
        res.sendFile(indexHtmlPath);
      } else {
        res.status(503).send('Application build not found. Run npm run build first.');
      }
    });
  }

  // Final error handler to avoid leaking stack traces
  app.use((_err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (!res.headersSent) {
      res.status(500).json({ error: 'An unexpected server error occurred.' });
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VayuCare server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
