import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSyncedDirectImpactInsights,
  calculateIndianAqiFromPollutants,
  calculateSimulatorImpact,
  classifyAqiCategory,
  getAqiBadgeMeta,
} from '../src/utils/airQualityLogic.ts';
import {
  InMemoryRateLimiter,
  isSameOriginAllowed,
  sanitizePlainText,
  validateAndSanitizeAskRequest,
  validateAndSanitizePlanRequest,
} from '../src/utils/securityValidation.ts';
import { createApp } from '../server/app.ts';

const SAMPLE_HABITS = [
  { id: 'h1', label: 'Fitted N95', category: 'Commute & Masking', exposureReductionPct: 24, pm25SavedUg: 680, co2SavedGrams: 50, ecoScorePoints: 20, defaultEnabled: true, description: 'Filters PM2.5.' },
  { id: 'h2', label: 'Bedroom HEPA', category: 'Indoor Air', exposureReductionPct: 30, pm25SavedUg: 850, co2SavedGrams: 80, ecoScorePoints: 30, defaultEnabled: true, description: 'Cleans sleep zone.' },
  { id: 'h3', label: 'Shift to Metro', category: 'Community Eco', exposureReductionPct: 12, pm25SavedUg: 340, co2SavedGrams: 1200, ecoScorePoints: 25, defaultEnabled: false, description: 'Cuts tailpipe NO2.' },
];

const VALID_PROFILE = {
  city: 'Delhi NCR', aqi: 350, aqiCategory: 'Severe',
  householdTags: ['Infants/Toddlers', 'Elderly'],
  commuteMode: 'Metro/Bus', homeType: 'Apartment', purifier: 'DIY',
};

const MOCK_PLAN_JSON = JSON.stringify({
  planTitle: '<b>Delhi</b> Smog Shield',
  cityContextSummary: 'Thermal inversion peaks early morning.',
  smogInversionWindow: '1:00 PM - 4:00 PM',
  dailyRoutine: [{ period: 'Morning', timeWindow: '6-10 AM', outdoorSafetyStatus: 'Avoid', headline: 'Stay Indoors', actions: ['Seal windows'], vulnerableNote: 'Protect toddlers' }],
  indoorHacks: [{ id: 'hack-1', title: 'Wet Mop', category: 'Cleaning', costTag: 'Free', summary: 'Prevents dust.', steps: ['Mop twice daily'] }],
  sustainableAlternatives: [{ id: 'alt-1', title: 'Metro Commute', currentHabit: 'Car', recommendedSwap: 'Metro', cityContext: 'Delhi', emissionSavingText: '1.2 kg CO2/day' }],
  simulatorHabits: [
    { id: 'h-1', label: '<script>x()</script>Wear N95', category: 'Commute & Masking', exposureReductionPct: 25, pm25SavedUg: 726, co2SavedGrams: 120, ecoScorePoints: 25, defaultEnabled: true, description: 'Blocks fine particles.' },
    { id: 'h-2', label: 'Run HEPA', category: 'Indoor Air', exposureReductionPct: 'not-a-number', pm25SavedUg: 242, co2SavedGrams: 80, ecoScorePoints: 20, defaultEnabled: true, description: 'Lowers indoor PM2.5.' },
  ],
});

async function withTestServer(options, fn) {
  const app = await createApp({ mountFrontend: false, ...options });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const { port } = server.address();
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('1. CPCB NAQI classifies severity bands and computes PM2.5/PM10 sub-indices', () => {
  assert.equal(classifyAqiCategory(150), 'Moderate');
  assert.equal(classifyAqiCategory(245), 'Poor');
  assert.equal(classifyAqiCategory(350), 'Severe');
  assert.equal(classifyAqiCategory(445), 'Hazardous');
  assert.ok(calculateIndianAqiFromPollutants(75, 140) >= 101 && calculateIndianAqiFromPollutants(75, 140) <= 200);
  assert.ok(calculateIndianAqiFromPollutants(310, 460) >= 401);
});

test('2. CPCB NAQI enforces lower (10), upper (500) clamps and PM10-dominant sub-index', () => {
  assert.equal(calculateIndianAqiFromPollutants(-5, 0), 10);
  assert.equal(calculateIndianAqiFromPollutants(999, 999), 500);
  assert.ok(calculateIndianAqiFromPollutants(20, 400) >= 301);
});

test('3. Cigarette-smoke equivalence uses 22 ug/m3 live PM2.5 and 0.68 AQI fallback', () => {
  const live = getAqiBadgeMeta(265, 110);
  assert.equal(live.pm25EstimateUgM3, 110);
  assert.equal(live.cigaretteEquivalentPerDay, 5.0);
  const est = getAqiBadgeMeta(400);
  assert.equal(est.pm25EstimateUgM3, 272);
  assert.equal(est.cigaretteEquivalentPerDay, Number((272 / 22).toFixed(1)));
});

test('4. Simulator updates exposure reduction and syncs Section 04 insights identically', () => {
  const partial = calculateSimulatorImpact(400, SAMPLE_HABITS, { h1: true, h2: true, h3: false });
  assert.equal(partial.totalExposureReductionPct, 54);
  assert.equal(partial.effectivePersonalAqi, 184);
  const insights = buildSyncedDirectImpactInsights(400, 'Delhi NCR', partial);
  assert.equal(insights[0].quantifiedValue, '-1,530');
  assert.equal(insights[1].quantifiedValue, `${partial.equivalentCigarettesAvoided}`);
  assert.equal(insights[2].quantifiedValue, '130 g');
  assert.equal(insights[3].quantifiedValue, '50 / 100');
});

test('5. Simulator enforces 85% exposure cap, 100 eco-score cap, and 18 effective AQI floor', () => {
  const extremeHabits = [
    { ...SAMPLE_HABITS[0], id: 'e1', exposureReductionPct: 60, ecoScorePoints: 70 },
    { ...SAMPLE_HABITS[1], id: 'e2', exposureReductionPct: 50, ecoScorePoints: 60 },
  ];
  const maxed = calculateSimulatorImpact(80, extremeHabits, { e1: true, e2: true });
  assert.equal(maxed.totalExposureReductionPct, 85);
  assert.equal(maxed.ecoImpactScore, 100);
  assert.equal(maxed.effectivePersonalAqi, 18);
});

test('6. Input sanitization strips HTML/script tags and dangerous URI schemes', () => {
  const clean = sanitizePlainText('<script>alert(1)</script><b>Lucknow</b> <img src=x> javascript:steal()');
  assert.equal(clean, 'Lucknow steal()');
});

test('7. isSameOriginAllowed validates absent, malformed, host, APP_URL, and foreign origins', () => {
  assert.equal(isSameOriginAllowed(undefined, 'localhost:3000'), true);
  assert.equal(isSameOriginAllowed('not-a-valid-url', 'localhost:3000'), false);
  assert.equal(isSameOriginAllowed('http://localhost:3000', 'localhost:3000'), true);
  assert.equal(isSameOriginAllowed('https://vayucare.run.app', 'other.local', 'https://vayucare.run.app'), true);
  assert.equal(isSameOriginAllowed('https://evil.example', 'localhost:3000', 'https://vayucare.run.app'), false);
});

test('8. Plan validator enforces 300-char limit, strict enums, deduplication & telemetry clamping', () => {
  const res = validateAndSanitizePlanRequest({
    ...VALID_PROFILE,
    city: '<em>Delhi NCR</em>',
    householdTags: ['Elderly', 'Elderly', 'Pets'],
    liveTelemetry: { city: 'Delhi', latitude: 28.6, longitude: 77.2, pm25: 9999, pm10: -10, usAqi: 700, indianAqi: 650, fetchedAt: '10:00' },
  });
  assert.equal(res.valid, true);
  assert.deepEqual(res.data?.householdTags, ['Elderly', 'Pets']);
  assert.equal(res.data?.liveTelemetry?.pm25, 2000);
  assert.equal(res.data?.liveTelemetry?.pm10, 0);
  assert.equal(res.data?.liveTelemetry?.indianAqi, 500);
  assert.equal(validateAndSanitizePlanRequest({ ...VALID_PROFILE, city: 'C'.repeat(301) }).valid, false);
  assert.equal(validateAndSanitizePlanRequest({ ...VALID_PROFILE, commuteMode: 'Jetpack' }).valid, false);
});

test('9. Ask validator enforces 300-char question cap and truncates history to 12 turns', () => {
  const longHistory = Array.from({ length: 16 }, (_, i) => ({ role: i % 2 === 0 ? 'user' : 'assistant', content: `Turn ${i}` }));
  const res = validateAndSanitizeAskRequest({ question: 'Safe for school?', history: longHistory });
  assert.equal(res.valid, true);
  assert.equal(res.history?.length, 12);
  assert.equal(res.history?.[0].content, 'Turn 4');
  assert.equal(validateAndSanitizeAskRequest({ question: 'Q'.repeat(301) }).valid, false);
  assert.equal(validateAndSanitizeAskRequest({ question: '<script>x()</script>' }).valid, false);
});

test('10. InMemoryRateLimiter enforces 15 req/min, recovers after window, and evicts >2000 stale keys', () => {
  const limiter = new InMemoryRateLimiter(60_000, 15);
  const t0 = 1_700_000_000_000;
  for (let i = 0; i < 15; i += 1) assert.equal(limiter.check('ip-a', t0 + i * 100).allowed, true);
  assert.equal(limiter.check('ip-a', t0 + 2_000).allowed, false);
  assert.equal(limiter.check('ip-a', t0 + 61_000).allowed, true);
  for (let i = 0; i < 2005; i += 1) limiter.check(`stale-${i}`, t0);
  limiter.check('fresh-ip', t0 + 65_000);
  assert.ok(limiter.size <= 5);
});

test('11. HTTP POST /api/generate-plan returns 200 with sanitized items and synced Section 04 insights', async () => {
  await withTestServer({ generateContent: async () => ({ text: MOCK_PLAN_JSON }) }, async (base) => {
    const res = await fetch(`${base}/api/generate-plan`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(VALID_PROFILE),
    });
    assert.equal(res.status, 200);
    const { plan } = await res.json();
    assert.equal(plan.planTitle, 'Delhi Smog Shield');
    assert.equal(plan.simulatorHabits[0].label, 'Wear N95');
    assert.equal(plan.simulatorHabits[1].exposureReductionPct, 12); // NaN fallback clamped safely
    assert.equal(plan.directImpactInsights[0].quantifiedValue, '-968');
    assert.equal(plan.directImpactInsights[1].quantifiedValue, '4');
  });
});

test('12. HTTP POST /api/generate-plan returns 400 on invalid profile and 403 on foreign Origin', async () => {
  await withTestServer({ generateContent: async () => ({ text: MOCK_PLAN_JSON }) }, async (base) => {
    const bad = await fetch(`${base}/api/generate-plan`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ city: '', aqi: 999 }),
    });
    assert.equal(bad.status, 400);
    const cross = await fetch(`${base}/api/generate-plan`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' }, body: JSON.stringify(VALID_PROFILE),
    });
    assert.equal(cross.status, 403);
  });
});

test('13. HTTP POST /api/generate-plan enforces 429 rate limit with Retry-After header', async () => {
  const strictLimiter = new InMemoryRateLimiter(60_000, 1);
  await withTestServer({ generateContent: async () => ({ text: MOCK_PLAN_JSON }), rateLimiter: strictLimiter }, async (base) => {
    const first = await fetch(`${base}/api/generate-plan`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(VALID_PROFILE),
    });
    assert.equal(first.status, 200);
    const second = await fetch(`${base}/api/generate-plan`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(VALID_PROFILE),
    });
    assert.equal(second.status, 429);
    assert.ok(Number(second.headers.get('retry-after')) >= 1);
  });
});

test('14. HTTP POST /api/ask-vayucare forwards multi-turn history, normalizes bullets, and rejects empty questions', async () => {
  let capturedContents = [];
  await withTestServer({
    generateContent: async (params) => {
      capturedContents = params.contents;
      return { text: '- **Use N95** outdoors\n* Run wet mop indoors' };
    },
  }, async (base) => {
    const ok = await fetch(`${base}/api/ask-vayucare`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'Safe to walk?', history: [{ role: 'assistant', content: 'Hello' }], profile: VALID_PROFILE }),
    });
    assert.equal(ok.status, 200);
    const { answer } = await ok.json();
    assert.equal(answer, '• Use N95 outdoors\n• Run wet mop indoors');
    assert.equal(capturedContents[0].role, 'model');
    const bad = await fetch(`${base}/api/ask-vayucare`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: '   ' }),
    });
    assert.equal(bad.status, 400);
  });
});

test('15. HTTP GET /api/nonexistent returns 404 JSON and emits hardened production CSP & security headers', async () => {
  await withTestServer({ generateContent: async () => ({ text: '' }), isProduction: true }, async (base) => {
    const res = await fetch(`${base}/api/nonexistent`);
    assert.equal(res.status, 404);
    assert.match(res.headers.get('content-type') || '', /application\/json/);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    const csp = res.headers.get('content-security-policy') || '';
    assert.ok(csp.includes("script-src 'self'"));
    assert.ok(!csp.includes("'unsafe-eval'"));
    const body = await res.json();
    assert.equal(body.error, 'API endpoint not found.');
  });
});

test('16. HTTP malformed JSON payload returns clean 400 JSON without stack traces', async () => {
  await withTestServer({ generateContent: async () => ({ text: '' }) }, async (base) => {
    const res = await fetch(`${base}/api/ask-vayucare`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{invalid-json',
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, 'Invalid JSON payload.');
  });
});
