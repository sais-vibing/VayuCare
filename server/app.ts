import express, { type Express, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  InMemoryRateLimiter,
  validateAndSanitizeAskRequest,
  validateAndSanitizePlanRequest,
} from '../src/utils/securityValidation.ts';
import {
  formatServerGeminiError,
  generateWithFallback,
  type GenerateContentFn,
} from './geminiClient.ts';
import {
  createRateLimitMiddleware,
  createSecurityHeadersMiddleware,
  finalErrorHandler,
  JSON_BODY_LIMIT,
  jsonSyntaxErrorHandler,
  sameOriginCorsMiddleware,
} from './middleware.ts';
import {
  buildAskVayuCareSystemInstruction,
  buildCleanAirPlanPrompt,
  formatAskAnswer,
  PLAN_SYSTEM_INSTRUCTION,
  sanitizeAndValidatePlanPayload,
} from './prompts.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Optional configuration overrides for creating a testable Express app instance. */
export interface CreateAppOptions {
  generateContent?: GenerateContentFn;
  rateLimiter?: InMemoryRateLimiter;
  isProduction?: boolean;
  mountFrontend?: boolean;
}

function createGeneratePlanHandler(generateFn: GenerateContentFn) {
  return async (req: Request, res: Response): Promise<void> => {
    const validation = validateAndSanitizePlanRequest(req.body);
    if (!validation.valid || !validation.data) {
      res.status(400).json({ error: validation.error || 'Invalid household profile input.' });
      return;
    }

    try {
      const response = await generateFn({
        contents: buildCleanAirPlanPrompt(validation.data),
        config: {
          systemInstruction: PLAN_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
        },
      });

      const rawText = response.text ?? '';
      if (!rawText.trim()) {
        res.status(502).json({
          error: 'Gemini API returned an empty response. Please try generating your plan again.',
        });
        return;
      }

      const plan = sanitizeAndValidatePlanPayload(rawText, validation.data);
      if (!plan) {
        res.status(502).json({
          error: 'Gemini returned an incomplete plan structure. Please click Retry to generate again.',
        });
        return;
      }

      res.status(200).json({ plan });
    } catch (err) {
      const formatted = formatServerGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  };
}

function createAskVayuCareHandler(generateFn: GenerateContentFn) {
  return async (req: Request, res: Response): Promise<void> => {
    const validation = validateAndSanitizeAskRequest(req.body);
    if (!validation.valid || !validation.question) {
      res.status(400).json({
        error: validation.error || 'Please enter a valid question (up to 300 characters).',
      });
      return;
    }

    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    for (const turn of validation.history ?? []) {
      contents.push({
        role: turn.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: turn.content }],
      });
    }
    contents.push({ role: 'user', parts: [{ text: validation.question }] });

    try {
      const response = await generateFn({
        contents,
        config: {
          systemInstruction: buildAskVayuCareSystemInstruction(validation.profile),
        },
      });

      const rawAnswer = (response.text ?? '').trim();
      if (!rawAnswer) {
        res.status(502).json({
          error: 'Gemini API returned an empty answer. Please try asking your question again.',
        });
        return;
      }

      res.status(200).json({ answer: formatAskAnswer(rawAnswer) });
    } catch (err) {
      const formatted = formatServerGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  };
}

async function mountFrontendAssets(app: Express, isProduction: boolean): Promise<void> {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    return;
  }

  const distDir = path.resolve(__dirname, '..', 'dist');
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

/**
 * Creates and configures the full-stack VayuCare Express application.
 */
export async function createApp(options: CreateAppOptions = {}): Promise<Express> {
  const isProduction = options.isProduction ?? process.env.NODE_ENV === 'production';
  const generateFn: GenerateContentFn =
    options.generateContent ?? ((params) => generateWithFallback(params));
  const rateLimiter = options.rateLimiter ?? new InMemoryRateLimiter();
  const shouldMountFrontend = options.mountFrontend ?? !options.generateContent;

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(createSecurityHeadersMiddleware(isProduction));
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use(jsonSyntaxErrorHandler);
  app.use('/api', sameOriginCorsMiddleware);

  const rateLimitMiddleware = createRateLimitMiddleware(rateLimiter);
  app.post('/api/generate-plan', rateLimitMiddleware, createGeneratePlanHandler(generateFn));
  app.post('/api/ask-vayucare', rateLimitMiddleware, createAskVayuCareHandler(generateFn));
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  if (shouldMountFrontend) {
    await mountFrontendAssets(app, isProduction);
  }

  app.use(finalErrorHandler);
  return app;
}
