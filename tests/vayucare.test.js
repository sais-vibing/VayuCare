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
  sanitizePlainText,
  validateAndSanitizeAskRequest,
  validateAndSanitizePlanRequest,
} from '../src/utils/securityValidation.ts';

// (a) Indian CPCB NAQI and cigarette-smoke equivalence calculations
test('CPCB NAQI classifies severity breakpoints and computes sub-indices from PM2.5/PM10', () => {
  assert.equal(classifyAqiCategory(150), 'Moderate');
  assert.equal(classifyAqiCategory(245), 'Poor');
  assert.equal(classifyAqiCategory(350), 'Severe');
  assert.equal(classifyAqiCategory(445), 'Hazardous');

  const moderateNaqi = calculateIndianAqiFromPollutants(75, 140);
  assert.ok(moderateNaqi >= 101 && moderateNaqi <= 200);

  const severeNaqi = calculateIndianAqiFromPollutants(185, 390);
  assert.ok(severeNaqi >= 301 && severeNaqi <= 400);

  const hazardousNaqi = calculateIndianAqiFromPollutants(310, 460);
  assert.ok(hazardousNaqi >= 401 && hazardousNaqi <= 500);
});

test('Cigarette-smoke equivalence uses ~22 ug/m3 PM2.5 per cigarette baseline', () => {
  // Exact 110 ug/m3 live PM2.5 => 5.0 cigarettes/day
  const metaLive = getAqiBadgeMeta(265, 110);
  assert.equal(metaLive.category, 'Poor');
  assert.equal(metaLive.pm25EstimateUgM3, 110);
  assert.equal(metaLive.cigaretteEquivalentPerDay, 5.0);

  // Fallback PM2.5 estimate from AQI when live telemetry is absent
  const metaEstimated = getAqiBadgeMeta(400);
  assert.equal(metaEstimated.pm25EstimateUgM3, 272);
  assert.equal(metaEstimated.cigaretteEquivalentPerDay, Number((272 / 22).toFixed(1)));
});

// (b) Dynamic exposure reduction math in the "What-If" Impact Simulator
test('What-If Impact Simulator dynamically updates exposure reduction, effective AQI, and Section 04 insights', () => {
  const habits = [
    {
      id: 'sim-n95',
      label: 'Wear fitted N95 respirator outdoors',
      category: 'Commute & Masking',
      exposureReductionPct: 24,
      pm25SavedUg: 680,
      co2SavedGrams: 50,
      ecoScorePoints: 20,
      defaultEnabled: true,
      description: 'Filters fine PM2.5 during commutes.',
    },
    {
      id: 'sim-hepa',
      label: 'Run bedroom HEPA purifier overnight',
      category: 'Indoor Air',
      exposureReductionPct: 30,
      pm25SavedUg: 850,
      co2SavedGrams: 80,
      ecoScorePoints: 30,
      defaultEnabled: true,
      description: 'Lowers indoor sleep zone PM2.5.',
    },
    {
      id: 'sim-metro',
      label: 'Shift car trips to Metro',
      category: 'Community Eco',
      exposureReductionPct: 12,
      pm25SavedUg: 340,
      co2SavedGrams: 1200,
      ecoScorePoints: 25,
      defaultEnabled: false,
      description: 'Cuts street-level tailpipe NO2 and CO2.',
    },
  ];

  // Zero active habits
  const noneActive = calculateSimulatorImpact(400, habits, {});
  assert.equal(noneActive.activeHabitCount, 0);
  assert.equal(noneActive.totalExposureReductionPct, 0);
  assert.equal(noneActive.effectivePersonalAqi, 400);
  assert.equal(noneActive.dailyPm25AvoidedUg, 0);

  // Partial active habits
  const partialActive = calculateSimulatorImpact(400, habits, {
    'sim-n95': true,
    'sim-hepa': true,
    'sim-metro': false,
  });
  assert.equal(partialActive.activeHabitCount, 2);
  assert.equal(partialActive.totalExposureReductionPct, 54);
  assert.equal(partialActive.effectivePersonalAqi, 184);
  assert.equal(partialActive.dailyPm25AvoidedUg, 1530);
  assert.equal(partialActive.dailyCo2SavedGrams, 130);
  assert.equal(partialActive.ecoImpactScore, 50);

  // Synced Section 04 Direct Impact Insights must match simulator metrics dynamically
  const syncedInsights = buildSyncedDirectImpactInsights(400, 'Delhi NCR', partialActive);
  assert.equal(syncedInsights[0].quantifiedValue, '-1,530');
  assert.equal(syncedInsights[1].quantifiedValue, `${partialActive.equivalentCigarettesAvoided}`);
  assert.equal(syncedInsights[2].quantifiedValue, '130 g');
  assert.equal(syncedInsights[3].quantifiedValue, '50 / 100');
});

// (c) API input sanitization (HTML stripping, 300-char limit enforcement, enum checks, rate limiting)
test('Input sanitization strips HTML/script tags and dangerous URI schemes', () => {
  const dirtyInput =
    '<script>alert("xss")</script><b>Lucknow</b> <img src=x onerror=alert(1)> javascript:steal()';
  const sanitized = sanitizePlainText(dirtyInput);
  assert.equal(sanitized, 'Lucknow steal()');
  assert.ok(!sanitized.includes('<'));
  assert.ok(!sanitized.includes('script'));
  assert.ok(!sanitized.includes('javascript:'));
});

test('Plan and Ask VayuCare validators enforce 300-character max length and strict enums', () => {
  const validPlan = validateAndSanitizePlanRequest({
    city: '<em>Delhi NCR</em>',
    aqi: 350,
    aqiCategory: 'Severe',
    householdTags: ['Infants/Toddlers', 'Elderly'],
    commuteMode: 'Metro/Bus',
    homeType: 'Apartment',
    purifier: 'DIY',
  });
  assert.equal(validPlan.valid, true);
  assert.equal(validPlan.data?.city, 'Delhi NCR');

  // >300 char city rejected
  const oversizedCity = validateAndSanitizePlanRequest({
    city: 'C'.repeat(301),
    aqi: 350,
    commuteMode: 'Car',
    homeType: 'Apartment',
    purifier: 'Yes',
  });
  assert.equal(oversizedCity.valid, false);

  // Invalid enum rejected
  const invalidCommute = validateAndSanitizePlanRequest({
    city: 'Mumbai',
    aqi: 180,
    commuteMode: 'Jetpack',
    homeType: 'Apartment',
    purifier: 'No',
  });
  assert.equal(invalidCommute.valid, false);

  // >300 char question rejected
  const oversizedQuestion = validateAndSanitizeAskRequest({
    question: 'Q'.repeat(301),
  });
  assert.equal(oversizedQuestion.valid, false);

  // Script-only question rejected after sanitization
  const scriptOnlyQuestion = validateAndSanitizeAskRequest({
    question: '<script>alert(1)</script>',
  });
  assert.equal(scriptOnlyQuestion.valid, false);
});

test('Rate limiter enforces max 15 requests per minute with cooldown recovery', () => {
  const limiter = new InMemoryRateLimiter(60_000, 15);
  const start = 1_700_000_000_000;

  for (let i = 0; i < 15; i += 1) {
    const result = limiter.check('client-session', start + i * 250);
    assert.equal(result.allowed, true);
  }

  const blocked = limiter.check('client-session', start + 5_000);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
  assert.ok(blocked.retryAfterSeconds > 0);

  const recovered = limiter.check('client-session', start + 61_000);
  assert.equal(recovered.allowed, true);
});
