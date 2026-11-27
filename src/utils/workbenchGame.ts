import { formatPromoCode, type WorkshopDiscountTier } from './estimator';

export type GameRunState =
  | 'title'
  | 'playing'
  | 'stage_ready'
  | 'paused'
  | 'victory'
  | 'timeout';
export type RestorePhase = 'clean' | 'wax' | 'stitch';
export type StitchGrade = 'perfect' | 'good' | 'miss';
export type MasterRank = 'S+' | 'S' | 'A' | 'B';
export type GameDifficultyId = 'standard' | 'master';

export const STAGE_INTERMISSION_LOCK_MS = 480;
export const STITCH_LEAD_IN_MS = 340;

export interface StageIntermissionInfo {
  nextPhase: 'wax' | 'stitch';
  badge: string;
  completedLabel: string;
  completedValue: string;
  title: string;
  instruction: string;
  warningNote: string;
  ctaLabel: string;
}

export interface DamageHotspot {
  id: string;
  label: string;
  /** Normalized coordinates (0..1) aligned to the dedicated worn postman satchel image */
  nx: number;
  ny: number;
  radius: number;
}

export interface StitchNodeTarget {
  /** Normalized coordinates (0..1) tracing the frayed lower seam of the satchel */
  nx: number;
  ny: number;
  /** Target center position on the tension rail (0.28..0.72) */
  railTarget: number;
  /** Needle oscillation speed multiplier */
  speed: number;
}

export interface GameDifficultyConfig {
  id: GameDifficultyId;
  label: string;
  timeLimitSec: number;
  needleSpeedMultiplier: number;
  masteryBonus: number;
  hint: string;
}

export interface WorkbenchOutcome {
  masteryPct: number;
  cleanQualityPct: number;
  waxQualityPct: number;
  stitchQualityPct: number;
  discountPct: WorkshopDiscountTier;
  promoCode: string;
  rank: MasterRank;
  score: number;
  improvementTip: string;
}

export const WORKBENCH_GAME_MEDIA = {
  title: 'Почтальонский саквояж · Растительная кожа',
  subtitle: 'Соль, дождевые разводы, сухие царапины и распущенный нижний шов',
  beforeImage: '/images/game_saddlebag_worn_1795027263030.jpg',
  afterImage: '/images/game_saddlebag_clean_1795027240941.jpg',
} as const;

export const GAME_DIFFICULTIES: Record<GameDifficultyId, GameDifficultyConfig> = {
  standard: {
    id: 'standard',
    label: 'Стандарт · 36с',
    timeLimitSec: 36,
    needleSpeedMultiplier: 1.0,
    masteryBonus: 0,
    hint: 'Спокойный ритм верстака — реально взять −15% при аккуратной работе.',
  },
  master: {
    id: 'master',
    label: 'Срочный · 26с',
    timeLimitSec: 26,
    needleSpeedMultiplier: 1.18,
    masteryBonus: 4,
    hint: 'Быстрый маятник и меньше времени, но +4% к мастерству за скорость.',
  },
};

export const WORKBENCH_TIME_LIMIT_SEC = GAME_DIFFICULTIES.standard.timeLimitSec;
export const TOTAL_STITCH_NODES = 5;
export const DISCOUNT_TIERS: ReadonlyArray<{
  minMastery: number;
  discountPct: WorkshopDiscountTier;
  rank: MasterRank;
  label: string;
}> = [
  { minMastery: 92, discountPct: 15, rank: 'S+', label: 'Ювелир верстака' },
  { minMastery: 80, discountPct: 12, rank: 'S', label: 'Уверенный мастер' },
  { minMastery: 66, discountPct: 10, rank: 'A', label: 'Крепкая рука' },
  { minMastery: 48, discountPct: 8, rank: 'A', label: 'Хороший старт' },
  { minMastery: 0, discountPct: 5, rank: 'B', label: 'Ученик смены' },
];

/**
 * 5 concrete visible damage zones mapped directly onto game_saddlebag_worn_1795027263030.jpg
 */
export const SATCHEL_DAMAGE_HOTSPOTS: readonly DamageHotspot[] = [
  { id: 'salt-flap', label: 'Соль на клапане', nx: 0.41, ny: 0.30, radius: 0.092 },
  { id: 'rain-flap', label: 'Дождевые пятна', nx: 0.61, ny: 0.31, radius: 0.090 },
  { id: 'left-buckle', label: 'Окисел пряжки', nx: 0.35, ny: 0.48, radius: 0.088 },
  { id: 'front-scratches', label: 'Царапины корпуса', nx: 0.51, ny: 0.55, radius: 0.092 },
  { id: 'right-corner', label: 'Сбитый угол', nx: 0.63, ny: 0.65, radius: 0.092 },
];

/**
 * 5 saddle-stitch punch holes aligned directly along the frayed front lower edge of the satchel
 */
export const SATCHEL_STITCH_NODES: readonly StitchNodeTarget[] = [
  { nx: 0.30, ny: 0.72, railTarget: 0.50, speed: 0.96 },
  { nx: 0.38, ny: 0.75, railTarget: 0.36, speed: 1.12 },
  { nx: 0.46, ny: 0.78, railTarget: 0.64, speed: 1.24 },
  { nx: 0.54, ny: 0.80, railTarget: 0.44, speed: 1.38 },
  { nx: 0.62, ny: 0.83, railTarget: 0.56, speed: 1.52 },
];

/**
 * Applies a brush stroke at normalized coordinates (nx, ny) against the 5 wear hotspots.
 * Returns { progressAdded, hitAnyHotspot, allCleaned, overallPct }.
 */
export function applyHotspotScrub(
  progressList: number[],
  nx: number,
  ny: number,
  strokePower = 0.22
): {
  progressAdded: number;
  hitHotspotIndex: number;
  completedHotspotIndex: number;
  overallPct: number;
  allCleaned: boolean;
} {
  let progressAdded = 0;
  let hitHotspotIndex = -1;
  let completedHotspotIndex = -1;

  for (let i = 0; i < SATCHEL_DAMAGE_HOTSPOTS.length; i += 1) {
    const spot = SATCHEL_DAMAGE_HOTSPOTS[i];
    const current = progressList[i] ?? 0;
    if (current >= 1) continue;

    // Aspect-corrected distance (16:9 canvas)
    const dx = (nx - spot.nx) * 1.35;
    const dy = ny - spot.ny;
    const dist = Math.hypot(dx, dy);

    if (dist <= spot.radius * 1.38) {
      hitHotspotIndex = i;
      const falloff = Math.max(0.45, 1 - dist / (spot.radius * 1.5));
      const next = Math.min(1, current + strokePower * falloff);
      progressAdded += next - current;
      progressList[i] = next;
      if (next >= 1 && current < 1) {
        completedHotspotIndex = i;
      }
    }
  }

  let sum = 0;
  let clearedCount = 0;
  for (let i = 0; i < SATCHEL_DAMAGE_HOTSPOTS.length; i += 1) {
    const val = Math.min(1, Math.max(0, progressList[i] ?? 0));
    sum += val;
    if (val >= 1) clearedCount += 1;
  }

  const overallPct = Math.round((sum / SATCHEL_DAMAGE_HOTSPOTS.length) * 100);
  return {
    progressAdded,
    hitHotspotIndex,
    completedHotspotIndex,
    overallPct,
    allCleaned: clearedCount >= SATCHEL_DAMAGE_HOTSPOTS.length,
  };
}

/**
 * Checks if normalized coordinates (nx, ny) lie inside the central leather satchel silhouette.
 */
export function isInsideSatchelBody(nx: number, ny: number): boolean {
  return nx >= 0.20 && nx <= 0.80 && ny >= 0.14 && ny <= 0.87;
}

/**
 * Evaluates a waxing stroke cadence sample.
 * Ideal pointer speed (normalized units/sec) is smooth craftsman rubbing: 0.25..1.95.
 * Returns updated waxProgress (0..1), qualitySample (0..1), and zone ('sweet' | 'slow' | 'fast').
 */
export function evaluateWaxCadence(
  speedNormPerSec: number,
  insideBag: boolean
): { zone: 'sweet' | 'slow' | 'fast' | 'off'; qualityWeight: number; progressDelta: number } {
  if (!insideBag) {
    return { zone: 'off', qualityWeight: 0.15, progressDelta: 0.004 };
  }
  if (speedNormPerSec >= 0.22 && speedNormPerSec <= 2.1) {
    return { zone: 'sweet', qualityWeight: 1.0, progressDelta: 0.036 };
  }
  if (speedNormPerSec < 0.22) {
    return { zone: 'slow', qualityWeight: 0.62, progressDelta: 0.022 };
  }
  return { zone: 'fast', qualityWeight: 0.45, progressDelta: 0.026 };
}

/**
 * Evaluates a saddle-stitch timing strike where cursorPos oscillates in [0, 1]
 * around the active node's railTarget.
 */
export function evaluateStitchTiming(
  cursorPos: number,
  targetPos = 0.5
): { grade: StitchGrade; points: number; masteryPoints: number; label: string } {
  const distance = Math.abs(cursorPos - targetPos);

  if (distance <= 0.085) {
    return {
      grade: 'perfect',
      points: 260,
      masteryPoints: 7,
      label: 'В точку!',
    };
  }
  if (distance <= 0.20) {
    return {
      grade: 'good',
      points: 145,
      masteryPoints: 4.5,
      label: 'Ровный стежок',
    };
  }
  return {
    grade: 'miss',
    points: 40,
    masteryPoints: 1.2,
    label: 'Мимо ритма',
  };
}

/**
 * Maps a 0..100 mastery score + perfect stitches directly to a concrete discount tier (5%..15% max).
 * Reaching 15% requires genuinely high mastery (>= 92%) AND at least 4/5 perfect stitches.
 */
export function calculateDiscountTier(
  masteryPct: number,
  perfectStitches: number
): { discountPct: WorkshopDiscountTier; rank: MasterRank; tierLabel: string } {
  const clamped = Math.max(0, Math.min(100, Math.round(masteryPct)));

  if (clamped >= 92 && perfectStitches >= 4) {
    return { discountPct: 15, rank: 'S+', tierLabel: 'Ювелир верстака' };
  }
  if (clamped >= 80 && perfectStitches >= 2) {
    return { discountPct: 12, rank: 'S', tierLabel: 'Уверенный мастер' };
  }
  if (clamped >= 66) {
    return { discountPct: 10, rank: 'A', tierLabel: 'Крепкая рука' };
  }
  if (clamped >= 48) {
    return { discountPct: 8, rank: 'A', tierLabel: 'Хороший старт' };
  }
  return { discountPct: 5, rank: 'B', tierLabel: 'Ученик смены' };
}

/**
 * Pure stage 1 cleanliness quality calculation (0..100).
 */
export function computeStageCleanQualityPct(cleanHits: number, cleanMisses: number): number {
  const totalCleanStrokes = Math.max(1, cleanHits + cleanMisses);
  const cleanAccuracy = cleanHits / totalCleanStrokes;
  return Math.round(Math.max(30, Math.min(100, 35 + cleanAccuracy * 65)));
}

/**
 * Pure stage 2 wax cadence quality calculation (0..100).
 */
export function computeStageWaxQualityPct(waxQualitySum: number, waxSamples: number): number {
  const ratio = waxSamples > 0 ? waxQualitySum / waxSamples : 0.7;
  return Math.round(Math.max(25, Math.min(100, ratio * 100)));
}

/**
 * Returns true once the post-transition accidental-input lockout has elapsed.
 */
export function isInputUnlocked(nowMs: number, unlockAtMs: number): boolean {
  return nowMs >= unlockAtMs;
}

/**
 * Builds crisp Russian intermission gate copy between stages so players never misfire Stage 3.
 */
export function getStageIntermissionInfo(
  nextPhase: 'wax' | 'stitch',
  stats: {
    cleanQualityPct: number;
    waxQualityPct: number;
    timeLeftSec: number;
  }
): StageIntermissionInfo {
  if (nextPhase === 'wax') {
    return {
      nextPhase: 'wax',
      badge: 'ЭТАП 1 ЗАВЕРШЁН · ПАУЗА',
      completedLabel: 'Точность чистки',
      completedValue: `${stats.cleanQualityPct}%`,
      title: 'Дальше — натирка карнаубским воском',
      instruction:
        'Водите по саквояжу плавными кругами. Держите бегунок скорости в зелёной зоне — без резкой спешки.',
      warningNote: `Таймер остановлен (${stats.timeLeftSec}с в запасе) — начнёте, когда будете готовы.`,
      ctaLabel: 'Перейти к воску →',
    };
  }

  return {
    nextPhase: 'stitch',
    badge: 'ЭТАП 2 ЗАВЕРШЁН · ПАУЗА ПЕРЕД РЕАКЦИЕЙ',
    completedLabel: 'Ровность воска',
    completedValue: `${stats.waxQualityPct}%`,
    title: 'Впереди финал — 5 стежков на реакцию',
    instruction:
      'По нижней кромке побежит игла. Нажимайте по холсту, «Пробел» или кнопку снизу ровно в зелёном секторе.',
    warningNote: `Таймер на паузе (${stats.timeLeftSec}с в запасе) — случайный клик заблокирован, бегунок начнёт ход плавно.`,
    ctaLabel: 'Готов — начать прошивку →',
  };
}

/**
 * Computes the complete end-of-run performance breakdown, earned discount (5%..15% max),
 * promo code, and honest next-step tip so the player knows exactly how to improve on replay.
 */
export function calculateWorkbenchOutcome(params: {
  cleanHits: number;
  cleanMisses: number;
  waxSweetRatio: number; // 0..1
  stitchMasteryPoints: number; // 0..35
  perfectStitches: number;
  timeRemainingSec: number;
  timeLimitSec: number;
  difficultyId: GameDifficultyId;
  maxCombo: number;
  basePoints: number;
}): WorkbenchOutcome {
  const cleanQualityPct = computeStageCleanQualityPct(params.cleanHits, params.cleanMisses);

  const waxQualityPct = Math.round(
    Math.max(25, Math.min(100, params.waxSweetRatio * 100))
  );

  const stitchQualityPct = Math.round(
    Math.max(0, Math.min(100, (params.stitchMasteryPoints / 35) * 100))
  );

  const timeRatio = Math.max(0, Math.min(1, params.timeRemainingSec / Math.max(1, params.timeLimitSec)));
  const difficultyBonus = GAME_DIFFICULTIES[params.difficultyId]?.masteryBonus ?? 0;

  // Weighted mastery: Clean 30% + Wax 28% + Stitch 34% + Time speed up to 8% + Difficulty bonus
  const rawMastery =
    cleanQualityPct * 0.3 +
    waxQualityPct * 0.28 +
    stitchQualityPct * 0.34 +
    timeRatio * 8 +
    difficultyBonus;

  const masteryPct = Math.max(20, Math.min(100, Math.round(rawMastery)));
  const tier = calculateDiscountTier(masteryPct, params.perfectStitches);

  const timeBonus = Math.round(Math.max(0, params.timeRemainingSec) * 26);
  const precisionBonus = params.perfectStitches * 110 + params.maxCombo * 45;
  const score = Math.max(0, Math.round(params.basePoints + timeBonus + precisionBonus));

  let improvementTip =
    'Идеальная смена! Максимальная скидка −15% уже ваша и перенесена в смету.';
  if (tier.discountPct < 15) {
    if (params.perfectStitches < 4) {
      improvementTip = `Попали идеально в ${params.perfectStitches} из ${TOTAL_STITCH_NODES} стежков — возьмите 4–5 точных проколов ради максимальных −15%!`;
    } else if (waxQualityPct < 78) {
      improvementTip =
        'Держите более плавный темп при натирке воском в зелёной зоне — сразу дотянете до −15%.';
    } else if (cleanQualityPct < 78) {
      improvementTip =
        'В первом этапе чистите прицельно по 5 очагам на коже, не задевая стол — это даст максимум −15%.';
    } else {
      improvementTip =
        'Почти максимум! Попробуйте чуть быстрее пройти чистку или включите «Срочный» режим ради −15%.';
    }
  }

  return {
    masteryPct,
    cleanQualityPct,
    waxQualityPct,
    stitchQualityPct,
    discountPct: tier.discountPct,
    promoCode: formatPromoCode(tier.discountPct),
    rank: tier.rank,
    score,
    improvementTip,
  };
}

