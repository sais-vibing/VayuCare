/**
 * Verifies whether an HTTP Origin header matches the request host or configured APP_URL.
 */
export function isSameOriginAllowed(
  originHeader: string | undefined,
  hostHeader: string | undefined,
  appUrlEnv?: string
): boolean {
  if (!originHeader) {
    return true;
  }

  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(originHeader);
  } catch {
    return false;
  }

  const cleanHost = (hostHeader || '').split(',')[0].trim().toLowerCase();
  if (cleanHost && parsedOrigin.host.toLowerCase() === cleanHost) {
    return true;
  }

  const trimmedAppUrl = (appUrlEnv || '').trim();
  if (trimmedAppUrl && trimmedAppUrl !== 'MY_APP_URL') {
    try {
      if (parsedOrigin.origin === new URL(trimmedAppUrl).origin) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}
