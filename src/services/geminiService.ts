import type { ChatMessage, CleanAirPlan, UserAirProfile } from '../types/vayucare.ts';
import {
  validateAndSanitizeAskRequest,
  validateAndSanitizePlanRequest,
} from '../utils/securityValidation.ts';

/**
 * Parses a JSON API response safely and throws a descriptive message on HTML or HTTP errors.
 */
export async function parseApiJson<T>(response: Response, fallbackError: string): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(fallbackError);
  }

  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || fallbackError);
  }
  return data;
}

/**
 * Requests a structured 4-pillar Clean Air Action Plan and 6 Interactive What-If
 * Simulator habits from the server-side Gemini endpoint (/api/generate-plan).
 */
export async function generatePlan(profileInput: UserAirProfile): Promise<CleanAirPlan> {
  const validation = validateAndSanitizePlanRequest(profileInput);
  if (!validation.valid || !validation.data) {
    throw new Error(validation.error || 'Invalid household profile input.');
  }

  let response: Response;
  try {
    response = await fetch('/api/generate-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validation.data),
    });
  } catch {
    throw new Error(
      'Unable to reach the VayuCare server right now. Please check your connection and try again.'
    );
  }

  const data = await parseApiJson<{ plan?: CleanAirPlan }>(
    response,
    'Unable to generate your Clean Air Action Plan right now. Please try again.'
  );

  if (!data.plan) {
    throw new Error('The server returned an empty Clean Air Action Plan. Please try again.');
  }
  return data.plan;
}

/**
 * Sends a family follow-up question, full conversation history, and active household
 * profile to the server-side Gemini endpoint (/api/ask-vayucare).
 */
export async function askVayuCare(
  questionInput: string,
  historyInput: ChatMessage[],
  profileInput: UserAirProfile
): Promise<string> {
  const validation = validateAndSanitizeAskRequest({
    question: questionInput,
    history: historyInput.map((m) => ({ role: m.role, content: m.content })),
    profile: profileInput,
  });

  if (!validation.valid || !validation.question) {
    throw new Error(
      validation.error || 'Please enter a valid question (up to 300 characters).'
    );
  }

  let response: Response;
  try {
    response = await fetch('/api/ask-vayucare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: validation.question,
        history: validation.history ?? [],
        profile: validation.profile,
      }),
    });
  } catch {
    throw new Error(
      'Unable to reach the VayuCare server right now. Please check your connection and try again.'
    );
  }

  const data = await parseApiJson<{ answer?: string }>(
    response,
    'Unable to answer your question right now. Please try again.'
  );

  if (!data.answer) {
    throw new Error('The server returned an empty answer. Please try asking again.');
  }
  return data.answer;
}
