import type { NextFunction, Request, Response } from 'express';
import {
  InMemoryRateLimiter,
  isSameOriginAllowed,
} from '../src/utils/securityValidation.ts';

/** Maximum JSON payload size accepted by API routes. */
export const JSON_BODY_LIMIT = '64kb';

/**
 * Builds iframe-compatible security headers middleware, omitting `'unsafe-eval'` in production.
 */
export function createSecurityHeadersMiddleware(isProduction: boolean) {
  const scriptSrc = isProduction
    ? "script-src 'self'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";
  const cspHeader = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://air-quality-api.open-meteo.com https://geocoding-api.open-meteo.com ws: wss:",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  return (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', cspHeader);
    next();
  };
}

/**
 * Catches malformed JSON request bodies and returns HTTP 400 without leaking stack traces.
 */
export function jsonSyntaxErrorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof SyntaxError && 'status' in err) {
    res.status(400).json({ error: 'Invalid JSON payload.' });
    return;
  }
  next(err);
}

/**
 * Enforces strict same-origin CORS checks for all `/api/*` routes using the shared validator.
 */
export function sameOriginCorsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  res.setHeader('Vary', 'Origin');
  const originHeader = req.headers.origin;
  if (originHeader) {
    const forwardedHost =
      typeof req.headers['x-forwarded-host'] === 'string'
        ? req.headers['x-forwarded-host']
        : undefined;
    const hostHeader = forwardedHost || req.headers.host;

    if (!isSameOriginAllowed(originHeader, hostHeader, process.env.APP_URL)) {
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
}

/**
 * Creates IP-based rate-limit middleware relying on Express `req.ip` (honoring `trust proxy`).
 */
export function createRateLimitMiddleware(limiter: InMemoryRateLimiter) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const rateStatus = limiter.check(clientIp);
    if (!rateStatus.allowed) {
      res.setHeader('Retry-After', String(rateStatus.retryAfterSeconds));
      res.status(429).json({
        error: `Rate limit reached (15 requests per minute). Please wait ${rateStatus.retryAfterSeconds} seconds before making another Gemini request.`,
      });
      return;
    }
    next();
  };
}

/**
 * Final Express error middleware preventing unhandled stack traces from reaching clients.
 */
export function finalErrorHandler(
  _err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (!res.headersSent) {
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
}
