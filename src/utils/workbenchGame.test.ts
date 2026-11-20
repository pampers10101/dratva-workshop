import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyHotspotScrub,
  calculateDiscountTier,
  calculateWorkbenchOutcome,
  computeStageCleanQualityPct,
  evaluateStitchTiming,
  evaluateWaxCadence,
  getStageIntermissionInfo,
  isInputUnlocked,
  SATCHEL_DAMAGE_HOTSPOTS,
  STAGE_INTERMISSION_LOCK_MS,
} from './workbenchGame';

test('applyHotspotScrub cleans all 5 wear hotspots cleanly when brushed directly', () => {
  const progress = SATCHEL_DAMAGE_HOTSPOTS.map(() => 0);

  // Off-target scrub does not clean hotspots
  const miss = applyHotspotScrub(progress, 0.04, 0.04, 0.4);
  assert.equal(miss.hitHotspotIndex, -1);
  assert.equal(miss.overallPct, 0);

  // Brush directly across each hotspot until cleaned
  for (const spot of SATCHEL_DAMAGE_HOTSPOTS) {
    for (let step = 0; step < 5; step += 1) {
      applyHotspotScrub(progress, spot.nx, spot.ny, 0.35);
    }
  }

  const finalCheck = applyHotspotScrub(progress, 0.5, 0.5, 0.1);
  assert.equal(finalCheck.allCleaned, true);
  assert.equal(finalCheck.overallPct, 100);
});

test('evaluateWaxCadence distinguishes smooth craft rhythm from slow, frantic, and off-bag', () => {
  assert.equal(evaluateWaxCadence(0.9, true).zone, 'sweet');
  assert.equal(evaluateWaxCadence(0.1, true).zone, 'slow');
  assert.equal(evaluateWaxCadence(3.2, true).zone, 'fast');
  assert.equal(evaluateWaxCadence(0.9, false).zone, 'off');
});

test('evaluateStitchTiming grades perfect, good, and miss accurately around dynamic targets', () => {
  assert.equal(evaluateStitchTiming(0.36, 0.36).grade, 'perfect');
  assert.equal(evaluateStitchTiming(0.49, 0.36).grade, 'good');
  assert.equal(evaluateStitchTiming(0.82, 0.36).grade, 'miss');
});

test('skill-based discount tiers scale strictly from 5% to 15% max based on performance', () => {
  assert.equal(calculateDiscountTier(32, 0).discountPct, 5);
  assert.equal(calculateDiscountTier(55, 1).discountPct, 8);
  assert.equal(calculateDiscountTier(72, 2).discountPct, 10);
  assert.equal(calculateDiscountTier(85, 3).discountPct, 12);
  // High mastery without >= 4 perfect stitches caps at 12%
  assert.equal(calculateDiscountTier(95, 2).discountPct, 12);
  // True mastery >= 92% AND >= 4 perfect stitches unlocks maximum 15%
  assert.equal(calculateDiscountTier(95, 4).discountPct, 15);
});

test('calculateWorkbenchOutcome returns lower discount for sloppy run and 15% max for master run', () => {
  const sloppy = calculateWorkbenchOutcome({
    cleanHits: 12,
    cleanMisses: 28,
    waxSweetRatio: 0.45,
    stitchMasteryPoints: 12,
    perfectStitches: 1,
    timeRemainingSec: 4,
    timeLimitSec: 36,
    difficultyId: 'standard',
    maxCombo: 1,
    basePoints: 800,
  });

  const master = calculateWorkbenchOutcome({
    cleanHits: 36,
    cleanMisses: 2,
    waxSweetRatio: 0.94,
    stitchMasteryPoints: 35,
    perfectStitches: 5,
    timeRemainingSec: 18,
    timeLimitSec: 36,
    difficultyId: 'standard',
    maxCombo: 5,
    basePoints: 2100,
  });

  assert.ok(sloppy.discountPct < 15);
  assert.ok(sloppy.discountPct >= 5);
  assert.equal(sloppy.promoCode, `DRATVA-${sloppy.discountPct}`);
  assert.ok(sloppy.improvementTip.includes('−15%'));

  assert.equal(master.discountPct, 15);
  assert.equal(master.promoCode, 'DRATVA-15');
  assert.equal(master.rank, 'S+');
  assert.ok(master.score > sloppy.score);
});

test('stage intermission lockout blocks stray clicks until safety window clears', () => {
  const unlockAt = 1000 + STAGE_INTERMISSION_LOCK_MS;
  assert.equal(isInputUnlocked(1000, unlockAt), false);
  assert.equal(isInputUnlocked(1000 + STAGE_INTERMISSION_LOCK_MS - 1, unlockAt), false);
  assert.equal(isInputUnlocked(unlockAt, unlockAt), true);
  assert.equal(isInputUnlocked(unlockAt + 120, unlockAt), true);
});

test('getStageIntermissionInfo provides accurate stage metrics and clear Stage 3 reaction cue', () => {
  const waxGate = getStageIntermissionInfo('wax', {
    cleanQualityPct: computeStageCleanQualityPct(28, 2),
    waxQualityPct: 0,
    timeLeftSec: 25,
  });
  assert.equal(waxGate.nextPhase, 'wax');
  assert.ok(waxGate.completedValue.includes('%'));
  assert.ok(waxGate.ctaLabel.includes('воск'));

  const stitchGate = getStageIntermissionInfo('stitch', {
    cleanQualityPct: 95,
    waxQualityPct: 92,
    timeLeftSec: 16,
  });
  assert.equal(stitchGate.nextPhase, 'stitch');
  assert.equal(stitchGate.completedValue, '92%');
  assert.ok(stitchGate.warningNote.includes('Таймер'));
  assert.ok(stitchGate.ctaLabel.includes('прошивку'));
});
