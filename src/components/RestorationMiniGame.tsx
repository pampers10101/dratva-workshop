import {
  Award,
  Brush,
  Pause,
  Play,
  RotateCcw,
  Scissors,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../hooks/useWorkshopMotion';
import {
  applyHotspotScrub,
  calculateWorkbenchOutcome,
  computeStageCleanQualityPct,
  computeStageWaxQualityPct,
  DISCOUNT_TIERS,
  evaluateStitchTiming,
  evaluateWaxCadence,
  GAME_DIFFICULTIES,
  getStageIntermissionInfo,
  isInputUnlocked,
  isInsideSatchelBody,
  SATCHEL_DAMAGE_HOTSPOTS,
  SATCHEL_STITCH_NODES,
  STAGE_INTERMISSION_LOCK_MS,
  STITCH_LEAD_IN_MS,
  TOTAL_STITCH_NODES,
  WORKBENCH_GAME_MEDIA,
  type GameDifficultyId,
  type GameRunState,
  type RestorePhase,
  type StageIntermissionInfo,
  type WorkbenchOutcome,
} from '../utils/workbenchGame';

interface RestorationMiniGameProps {
  bestDiscountPct: number;
  bestPromoCode: string | null;
  onRecordResult: (outcome: WorkbenchOutcome) => void;
  onApplyPromoToCalculator: (code: string) => void;
}

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface FloatingFeedback {
  active: boolean;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

const CANVAS_W = 960;
const CANVAS_H = 540;
const PARTICLE_POOL_SIZE = 96;

interface HudSnapshot {
  runState: GameRunState;
  phase: RestorePhase;
  cleanPct: number;
  cleanSpotsCleared: number;
  waxPct: number;
  waxZone: 'sweet' | 'slow' | 'fast' | 'off';
  stitchesDone: number;
  perfectStitches: number;
  score: number;
  combo: number;
  timeLeft: number;
  statusBanner: string;
  intermissionInfo: StageIntermissionInfo | null;
  lastOutcome: WorkbenchOutcome | null;
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number
) {
  const imgRatio = img.naturalWidth / Math.max(1, img.naturalHeight);
  const canvasRatio = width / height;
  let drawW = width;
  let drawH = height;
  let offsetX = 0;
  let offsetY = 0;

  if (imgRatio > canvasRatio) {
    drawW = height * imgRatio;
    offsetX = (width - drawW) / 2;
  } else {
    drawH = width / imgRatio;
    offsetY = (height - drawH) / 2;
  }

  ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
}

export function RestorationMiniGame({
  bestDiscountPct,
  bestPromoCode,
  onRecordResult,
  onApplyPromoToCalculator,
}: RestorationMiniGameProps) {
  const reduced = usePrefersReducedMotion();
  const [difficultyId, setDifficultyId] = useState<GameDifficultyId>('standard');
  const [muted, setMuted] = useState(false);
  const [intermissionReady, setIntermissionReady] = useState(true);
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);

  const activeDifficulty = GAME_DIFFICULTIES[difficultyId];

  const [hud, setHud] = useState<HudSnapshot>({
    runState: 'title',
    phase: 'clean',
    cleanPct: 0,
    cleanSpotsCleared: 0,
    waxPct: 0,
    waxZone: 'sweet',
    stitchesDone: 0,
    perfectStitches: 0,
    score: 0,
    combo: 0,
    timeLeft: activeDifficulty.timeLimitSec,
    statusBanner: 'Нажмите «Начать смену», чтобы побороться за скидку до −15%',
    intermissionInfo: null,
    lastOutcome: null,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const beforeMaskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const waxLayerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const beforeImgRef = useRef<HTMLImageElement | null>(null);
  const afterImgRef = useRef<HTMLImageElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const intermissionTimerRef = useRef<number | null>(null);
  const ensureLoopRef = useRef<() => void>(() => {});
  const mutedRef = useRef(muted);
  const difficultyRef = useRef(difficultyId);
  const onRecordResultRef = useRef(onRecordResult);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    difficultyRef.current = difficultyId;
  }, [difficultyId]);

  useEffect(() => {
    onRecordResultRef.current = onRecordResult;
  }, [onRecordResult]);

  // Mutable simulation ref decoupled from React reconciliation (zero 60Hz setState)
  const simRef = useRef({
    runState: 'title' as GameRunState,
    phase: 'clean' as RestorePhase,
    hotspotProgress: SATCHEL_DAMAGE_HOTSPOTS.map(() => 0),
    cleanPct: 0,
    cleanHits: 0,
    cleanMisses: 0,
    waxProgress: 0, // 0..1
    waxPct: 0,
    waxSamples: 0,
    waxQualitySum: 0,
    waxSpeedSmoothed: 0.85,
    waxZone: 'sweet' as 'sweet' | 'slow' | 'fast' | 'off',
    stitchesDone: 0,
    perfectStitches: 0,
    stitchMasteryPoints: 0,
    basePoints: 0,
    score: 0,
    combo: 0,
    maxCombo: 0,
    timeLimit: activeDifficulty.timeLimitSec,
    timeLeft: activeDifficulty.timeLimitSec,
    lastIntTime: activeDifficulty.timeLimitSec,
    pointerDown: false,
    pointerX: CANVAS_W * 0.5,
    pointerY: CANVAS_H * 0.5,
    lastBrushX: -1,
    lastBrushY: -1,
    lastBrushTime: 0,
    gaugePos: 0.14,
    gaugeDir: 1,
    hitstopTimer: 0,
    shakeTrauma: 0,
    flashAlpha: 0,
    lastAudioTime: 0,
    intermissionUnlockAt: 0,
    stitchStrikeUnlockAt: 0,
    intermissionInfo: null as StageIntermissionInfo | null,
    keysPressed: new Set<string>(),
    particles: Array.from({ length: PARTICLE_POOL_SIZE }, (): Particle => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 0.4,
      size: 3,
      color: '#DCE3EF',
    })),
    particleCursor: 0,
    popup: {
      active: false,
      x: CANVAS_W / 2,
      y: CANVAS_H / 2,
      text: '',
      color: '#52E0A1',
      life: 0,
    } as FloatingFeedback,
    lastOutcome: null as WorkbenchOutcome | null,
  });

  useEffect(() => {
    return () => {
      if (intermissionTimerRef.current) {
        window.clearTimeout(intermissionTimerRef.current);
      }
    };
  }, []);

  const playCraftTone = useCallback(
    (type: 'brush' | 'wax' | 'spot' | 'perfect' | 'good' | 'miss' | 'stage' | 'victory') => {
      if (mutedRef.current) return;
      const now = performance.now();
      if ((type === 'brush' || type === 'wax') && now - simRef.current.lastAudioTime < 85) {
        return;
      }
      simRef.current.lastAudioTime = now;

      try {
        if (!audioCtxRef.current) {
          const Ctx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          if (!Ctx) return;
          audioCtxRef.current = new Ctx();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }

        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const jitter = 0.94 + Math.random() * 0.12;
        if (type === 'brush') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(195 * jitter, t);
          osc.frequency.exponentialRampToValueAtTime(98, t + 0.055);
          gain.gain.setValueAtTime(0.032, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
          osc.start(t);
          osc.stop(t + 0.065);
        } else if (type === 'wax') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(320 * jitter, t);
          osc.frequency.exponentialRampToValueAtTime(410 * jitter, t + 0.075);
          gain.gain.setValueAtTime(0.025, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.085);
          osc.start(t);
          osc.stop(t + 0.09);
        } else if (type === 'spot') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(520, t);
          osc.frequency.setValueAtTime(740, t + 0.05);
          gain.gain.setValueAtTime(0.05, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
          osc.start(t);
          osc.stop(t + 0.19);
        } else if (type === 'perfect') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(620, t);
          osc.frequency.setValueAtTime(930, t + 0.055);
          gain.gain.setValueAtTime(0.068, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
          osc.start(t);
          osc.stop(t + 0.23);
        } else if (type === 'good') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(440, t);
          osc.frequency.setValueAtTime(554, t + 0.05);
          gain.gain.setValueAtTime(0.052, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
          osc.start(t);
          osc.stop(t + 0.17);
        } else if (type === 'miss') {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(168, t);
          osc.frequency.exponentialRampToValueAtTime(106, t + 0.12);
          gain.gain.setValueAtTime(0.04, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
          osc.start(t);
          osc.stop(t + 0.14);
        } else if (type === 'stage') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(523, t);
          osc.frequency.setValueAtTime(659, t + 0.07);
          osc.frequency.setValueAtTime(784, t + 0.14);
          gain.gain.setValueAtTime(0.058, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.27);
          osc.start(t);
          osc.stop(t + 0.28);
        } else if (type === 'victory') {
          [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'triangle';
            o.frequency.setValueAtTime(freq, t + idx * 0.07);
            g.gain.setValueAtTime(0.055, t + idx * 0.07);
            g.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.07 + 0.34);
            o.connect(g);
            g.connect(ctx.destination);
            o.start(t + idx * 0.07);
            o.stop(t + idx * 0.07 + 0.35);
          });
        }
      } catch {
        // Ignore Web Audio autoplay restriction
      }
    },
    []
  );

  const spawnBurst = useCallback((x: number, y: number, count: number, color: string) => {
    const sim = simRef.current;
    for (let i = 0; i < count; i += 1) {
      const p = sim.particles[sim.particleCursor];
      sim.particleCursor = (sim.particleCursor + 1) % PARTICLE_POOL_SIZE;
      const angle = Math.random() * Math.PI * 2;
      const speed = 45 + Math.random() * 145;
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 24;
      p.life = 0.28 + Math.random() * 0.28;
      p.maxLife = p.life;
      p.size = 2 + Math.random() * 3.5;
      p.color = color;
    }
  }, []);

  const showPopup = useCallback((x: number, y: number, text: string, color: string) => {
    simRef.current.popup = { active: true, x, y, text, color, life: 0.78 };
  }, []);

  const resetOffscreenLayers = useCallback(() => {
    if (!beforeMaskCanvasRef.current) {
      beforeMaskCanvasRef.current = document.createElement('canvas');
      beforeMaskCanvasRef.current.width = CANVAS_W;
      beforeMaskCanvasRef.current.height = CANVAS_H;
    }
    if (!waxLayerCanvasRef.current) {
      waxLayerCanvasRef.current = document.createElement('canvas');
      waxLayerCanvasRef.current.width = CANVAS_W;
      waxLayerCanvasRef.current.height = CANVAS_H;
    }

    const maskCtx = beforeMaskCanvasRef.current.getContext('2d');
    if (maskCtx) {
      maskCtx.globalCompositeOperation = 'source-over';
      maskCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      if (
        beforeImgRef.current &&
        beforeImgRef.current.complete &&
        beforeImgRef.current.naturalWidth > 0
      ) {
        drawCoverImage(maskCtx, beforeImgRef.current, CANVAS_W, CANVAS_H);
      } else {
        maskCtx.fillStyle = '#2A221C';
        maskCtx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      }
    }

    const waxCtx = waxLayerCanvasRef.current.getContext('2d');
    if (waxCtx) {
      waxCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    }
  }, []);

  const syncHudFromSim = useCallback((statusBanner?: string) => {
    const sim = simRef.current;
    const spotsCleared = sim.hotspotProgress.filter((v) => v >= 1).length;
    setHud((prev) => ({
      runState: sim.runState,
      phase: sim.phase,
      cleanPct: sim.cleanPct,
      cleanSpotsCleared: spotsCleared,
      waxPct: sim.waxPct,
      waxZone: sim.waxZone,
      stitchesDone: sim.stitchesDone,
      perfectStitches: sim.perfectStitches,
      score: sim.score,
      combo: sim.combo,
      timeLeft: Math.ceil(sim.timeLeft),
      statusBanner: statusBanner ?? prev.statusBanner,
      intermissionInfo: sim.intermissionInfo,
      lastOutcome: sim.lastOutcome,
    }));
  }, []);

  const enterStageIntermission = useCallback(
    (nextPhase: 'wax' | 'stitch', banner: string) => {
      const sim = simRef.current;
      sim.phase = nextPhase;
      sim.runState = 'stage_ready';
      sim.pointerDown = false;
      sim.keysPressed.clear();
      sim.intermissionUnlockAt = performance.now() + STAGE_INTERMISSION_LOCK_MS;
      sim.intermissionInfo = getStageIntermissionInfo(nextPhase, {
        cleanQualityPct: computeStageCleanQualityPct(sim.cleanHits, sim.cleanMisses),
        waxQualityPct: computeStageWaxQualityPct(sim.waxQualitySum, sim.waxSamples),
        timeLeftSec: Math.ceil(sim.timeLeft),
      });
      if (nextPhase === 'stitch') {
        sim.gaugePos = 0.08;
        sim.gaugeDir = 1;
      }
      document.body.dataset.state = 'stage_ready';
      setIntermissionReady(false);
      if (intermissionTimerRef.current) {
        window.clearTimeout(intermissionTimerRef.current);
      }
      intermissionTimerRef.current = window.setTimeout(() => {
        setIntermissionReady(true);
      }, STAGE_INTERMISSION_LOCK_MS);
      ensureLoopRef.current();
      syncHudFromSim(banner);
    },
    [syncHudFromSim]
  );

  const resumeFromIntermission = useCallback(() => {
    const sim = simRef.current;
    if (sim.runState !== 'stage_ready') return;
    if (!isInputUnlocked(performance.now(), sim.intermissionUnlockAt)) return;

    sim.runState = 'playing';
    sim.intermissionInfo = null;
    sim.pointerDown = false;
    sim.keysPressed.clear();
    sim.lastBrushX = -1;
    sim.lastBrushY = -1;
    sim.lastBrushTime = performance.now();

    if (sim.phase === 'stitch') {
      sim.gaugePos = 0.08;
      sim.gaugeDir = 1;
      sim.stitchStrikeUnlockAt = performance.now() + STITCH_LEAD_IN_MS;
    }

    document.body.dataset.state = 'playing';
    ensureLoopRef.current();
    playCraftTone('stage');
    syncHudFromSim(
      sim.phase === 'wax'
        ? 'Этап 2: растирайте карнаубский воск плавно — держите бегунок в зелёной зоне'
        : 'Этап 3: нажимайте по холсту, «Пробел» или кнопку снизу ровно в зелёном секторе'
    );
  }, [playCraftTone, syncHudFromSim]);

  const startGameRun = useCallback(
    (overrideDiff?: GameDifficultyId) => {
      if (intermissionTimerRef.current) {
        window.clearTimeout(intermissionTimerRef.current);
      }
      setIntermissionReady(true);
      setAppliedPromoCode(null);
      const diffKey = overrideDiff ?? difficultyRef.current;
      const diffCfg = GAME_DIFFICULTIES[diffKey];
      const sim = simRef.current;
      sim.runState = 'playing';
      sim.phase = 'clean';
      sim.hotspotProgress = SATCHEL_DAMAGE_HOTSPOTS.map(() => 0);
      sim.cleanPct = 0;
      sim.cleanHits = 0;
      sim.cleanMisses = 0;
      sim.waxProgress = 0;
      sim.waxPct = 0;
      sim.waxSamples = 0;
      sim.waxQualitySum = 0;
      sim.waxSpeedSmoothed = 0.85;
      sim.waxZone = 'sweet';
      sim.stitchesDone = 0;
      sim.perfectStitches = 0;
      sim.stitchMasteryPoints = 0;
      sim.basePoints = 0;
      sim.score = 0;
      sim.combo = 0;
      sim.maxCombo = 0;
      sim.timeLimit = diffCfg.timeLimitSec;
      sim.timeLeft = diffCfg.timeLimitSec;
      sim.lastIntTime = diffCfg.timeLimitSec;
      sim.pointerDown = false;
      sim.lastBrushX = -1;
      sim.lastBrushY = -1;
      sim.lastBrushTime = performance.now();
      sim.gaugePos = 0.08;
      sim.gaugeDir = 1;
      sim.hitstopTimer = 0;
      sim.shakeTrauma = 0;
      sim.flashAlpha = 0.24;
      sim.intermissionUnlockAt = 0;
      sim.stitchStrikeUnlockAt = 0;
      sim.intermissionInfo = null;
      sim.lastOutcome = null;
      sim.keysPressed.clear();
      document.body.dataset.state = 'playing';
      resetOffscreenLayers();
      ensureLoopRef.current();
      playCraftTone('stage');
      syncHudFromSim('Этап 1: прицельно зачистите 5 очагов соли и царапин на саквояже');
    },
    [playCraftTone, resetOffscreenLayers, syncHudFromSim]
  );

  const togglePause = useCallback(() => {
    const sim = simRef.current;
    if (sim.runState === 'playing') {
      sim.runState = 'paused';
      sim.pointerDown = false;
      sim.keysPressed.clear();
      document.body.dataset.state = 'paused';
      ensureLoopRef.current();
      syncHudFromSim('Пауза');
    } else if (sim.runState === 'paused') {
      sim.runState = 'playing';
      if (sim.phase === 'stitch') {
        sim.stitchStrikeUnlockAt = performance.now() + 260;
      }
      document.body.dataset.state = 'playing';
      ensureLoopRef.current();
      syncHudFromSim(
        sim.phase === 'clean'
          ? 'Этап 1: зачистите оставшиеся очаги на саквояже'
          : sim.phase === 'wax'
          ? 'Этап 2: растирайте воск плавно в зелёной зоне темпа'
          : 'Этап 3: ловите зелёный сектор и прошивайте 5 стежков'
      );
    }
  }, [syncHudFromSim]);

  const applyToolStroke = useCallback(
    (x: number, y: number, speedNormPerSec: number) => {
      const sim = simRef.current;
      if (sim.runState !== 'playing') return;

      const nx = x / CANVAS_W;
      const ny = y / CANVAS_H;

      if (sim.phase === 'clean') {
        // Erase worn top layer visually where player rubs
        const maskCtx = beforeMaskCanvasRef.current?.getContext('2d');
        if (maskCtx) {
          maskCtx.save();
          maskCtx.globalCompositeOperation = 'destination-out';
          const grad = maskCtx.createRadialGradient(x, y, 16, x, y, 66);
          grad.addColorStop(0, 'rgba(0,0,0,1)');
          grad.addColorStop(0.65, 'rgba(0,0,0,0.85)');
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          maskCtx.fillStyle = grad;
          maskCtx.beginPath();
          maskCtx.arc(x, y, 66, 0, Math.PI * 2);
          maskCtx.fill();
          maskCtx.restore();
        }

        const res = applyHotspotScrub(sim.hotspotProgress, nx, ny, 0.28);
        if (res.hitHotspotIndex >= 0) {
          sim.cleanHits += 1;
          sim.basePoints += Math.round(res.progressAdded * 160);
          sim.score = sim.basePoints;
          spawnBurst(x, y, 4, '#DCE3EF');
          playCraftTone('brush');

          if (res.completedHotspotIndex >= 0) {
            const spot = SATCHEL_DAMAGE_HOTSPOTS[res.completedHotspotIndex];
            sim.basePoints += 90;
            sim.score = sim.basePoints;
            sim.flashAlpha = 0.2;
            spawnBurst(spot.nx * CANVAS_W, spot.ny * CANVAS_H, 16, '#52E0A1');
            showPopup(spot.nx * CANVAS_W, spot.ny * CANVAS_H - 22, `${spot.label} ✓`, '#52E0A1');
            playCraftTone('spot');
          }
        } else if (!isInsideSatchelBody(nx, ny)) {
          sim.cleanMisses += 1;
        }

        if (res.overallPct !== sim.cleanPct || res.allCleaned) {
          sim.cleanPct = res.overallPct;
          if (res.allCleaned) {
            beforeMaskCanvasRef.current?.getContext('2d')?.clearRect(0, 0, CANVAS_W, CANVAS_H);
            sim.cleanPct = 100;
            sim.basePoints += 240;
            sim.score = sim.basePoints;
            sim.flashAlpha = 0.34;
            sim.hitstopTimer = 0.04;
            spawnBurst(CANVAS_W / 2, CANVAS_H * 0.48, 22, '#52E0A1');
            showPopup(CANVAS_W / 2, CANVAS_H * 0.42, 'Очаги сняты · Пауза!', '#52E0A1');
            playCraftTone('stage');
            enterStageIntermission(
              'wax',
              'Этап 1 выполнен — таймер на паузе. Нажмите «Перейти к воску», когда будете готовы'
            );
          } else {
            syncHudFromSim();
          }
        }
      } else if (sim.phase === 'wax') {
        const insideBag = isInsideSatchelBody(nx, ny);
        sim.waxSpeedSmoothed = sim.waxSpeedSmoothed * 0.65 + speedNormPerSec * 0.35;
        const cadence = evaluateWaxCadence(sim.waxSpeedSmoothed, insideBag);
        sim.waxZone = cadence.zone;
        sim.waxSamples += 1;
        sim.waxQualitySum += cadence.qualityWeight;
        sim.waxProgress = Math.min(1, sim.waxProgress + cadence.progressDelta);

        if (insideBag) {
          const waxCtx = waxLayerCanvasRef.current?.getContext('2d');
          if (waxCtx) {
            waxCtx.save();
            const grad = waxCtx.createRadialGradient(x, y, 8, x, y, 56);
            grad.addColorStop(0, 'rgba(255, 234, 188, 0.25)');
            grad.addColorStop(0.55, 'rgba(242, 193, 114, 0.11)');
            grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            waxCtx.fillStyle = grad;
            waxCtx.beginPath();
            waxCtx.arc(x, y, 56, 0, Math.PI * 2);
            waxCtx.fill();
            waxCtx.restore();
          }

          sim.basePoints += cadence.zone === 'sweet' ? 14 : 6;
          sim.score = sim.basePoints;
          spawnBurst(x, y, cadence.zone === 'sweet' ? 5 : 2, cadence.zone === 'sweet' ? '#F2C172' : '#E85D2A');
          playCraftTone('wax');
        }

        const nextPct = Math.min(100, Math.round(sim.waxProgress * 100));
        if (nextPct !== sim.waxPct || nextPct >= 100) {
          sim.waxPct = nextPct;
          if (nextPct >= 100) {
            sim.basePoints += 280;
            sim.score = sim.basePoints;
            sim.flashAlpha = 0.34;
            sim.hitstopTimer = 0.045;
            spawnBurst(CANVAS_W / 2, CANVAS_H * 0.52, 22, '#F2C172');
            showPopup(CANVAS_W / 2, CANVAS_H * 0.44, 'Воск готов · Пауза перед швом!', '#F2C172');
            playCraftTone('stage');
            enterStageIntermission(
              'stitch',
              'Этап 2 выполнен — таймер на паузе. Спокойно переведите дух перед финальной прошивкой'
            );
          } else {
            syncHudFromSim();
          }
        }
      }
    },
    [enterStageIntermission, playCraftTone, showPopup, spawnBurst, syncHudFromSim]
  );

  const pullStitchStrike = useCallback(() => {
    const sim = simRef.current;
    if (sim.runState !== 'playing' || sim.phase !== 'stitch') return;
    if (!isInputUnlocked(performance.now(), sim.stitchStrikeUnlockAt)) return;

    const currentNode =
      SATCHEL_STITCH_NODES[Math.min(sim.stitchesDone, TOTAL_STITCH_NODES - 1)];
    const evalRes = evaluateStitchTiming(sim.gaugePos, currentNode.railTarget);
    sim.stitchesDone += 1;
    sim.stitchMasteryPoints += evalRes.masteryPoints;

    if (evalRes.grade === 'perfect') {
      sim.perfectStitches += 1;
      sim.combo += 1;
      sim.maxCombo = Math.max(sim.maxCombo, sim.combo);
      sim.hitstopTimer = 0.048;
      sim.shakeTrauma = 0.42;
      sim.flashAlpha = 0.3;
      playCraftTone('perfect');
    } else if (evalRes.grade === 'good') {
      sim.combo += 1;
      sim.maxCombo = Math.max(sim.maxCombo, sim.combo);
      sim.hitstopTimer = 0.025;
      sim.shakeTrauma = 0.2;
      playCraftTone('good');
    } else {
      sim.combo = 0;
      sim.shakeTrauma = 0.32;
      playCraftTone('miss');
    }

    sim.basePoints += evalRes.points;
    const nodeX = currentNode.nx * CANVAS_W;
    const nodeY = currentNode.ny * CANVAS_H;
    const burstColor =
      evalRes.grade === 'perfect' ? '#52E0A1' : evalRes.grade === 'good' ? '#DCE3EF' : '#E85D2A';
    spawnBurst(nodeX, nodeY, evalRes.grade === 'perfect' ? 22 : 11, burstColor);
    showPopup(nodeX, nodeY - 34, `${evalRes.label} +${evalRes.points}`, burstColor);

    if (sim.stitchesDone >= TOTAL_STITCH_NODES) {
      const waxSweetRatio =
        sim.waxSamples > 0 ? sim.waxQualitySum / sim.waxSamples : 0.7;
      const outcome = calculateWorkbenchOutcome({
        cleanHits: sim.cleanHits,
        cleanMisses: sim.cleanMisses,
        waxSweetRatio,
        stitchMasteryPoints: sim.stitchMasteryPoints,
        perfectStitches: sim.perfectStitches,
        timeRemainingSec: sim.timeLeft,
        timeLimitSec: sim.timeLimit,
        difficultyId: difficultyRef.current,
        maxCombo: sim.maxCombo,
        basePoints: sim.basePoints,
      });

      sim.score = outcome.score;
      sim.lastOutcome = outcome;
      sim.runState = 'victory';
      sim.flashAlpha = 0.42;
      document.body.dataset.state = 'gameover';
      spawnBurst(CANVAS_W / 2, CANVAS_H * 0.5, 36, '#52E0A1');
      playCraftTone('victory');
      onRecordResultRef.current(outcome);
      syncHudFromSim(
        `Саквояж спасён · Мастерство ${outcome.masteryPct}% · Скидка −${outcome.discountPct}% (${outcome.promoCode})`
      );
    } else {
      sim.score = sim.basePoints;
      syncHudFromSim(`Стежок ${sim.stitchesDone} из ${TOTAL_STITCH_NODES} · ${evalRes.label}`);
    }
  }, [playCraftTone, showPopup, spawnBurst, syncHudFromSim]);

  // Load brand-new dedicated postman satchel Before & After photography once
  useEffect(() => {
    let active = true;
    const beforeImg = new Image();
    const afterImg = new Image();
    beforeImg.referrerPolicy = 'no-referrer';
    afterImg.referrerPolicy = 'no-referrer';

    let loaded = 0;
    const onLoad = () => {
      loaded += 1;
      if (active && loaded >= 2) {
        beforeImgRef.current = beforeImg;
        afterImgRef.current = afterImg;
        resetOffscreenLayers();
        ensureLoopRef.current();
        if (
          typeof window !== 'undefined' &&
          new URLSearchParams(window.location.search).get('autostart') === '1' &&
          simRef.current.runState === 'title'
        ) {
          startGameRun();
        }
      }
    };

    beforeImg.onload = onLoad;
    afterImg.onload = onLoad;
    beforeImg.src = WORKBENCH_GAME_MEDIA.beforeImage;
    afterImg.src = WORKBENCH_GAME_MEDIA.afterImage;
    if (typeof beforeImg.decode === 'function') beforeImg.decode().catch(() => {});
    if (typeof afterImg.decode === 'function') afterImg.decode().catch(() => {});

    return () => {
      active = false;
    };
  }, [resetOffscreenLayers, startGameRun]);

  // Keyboard controls (WASD/Arrows + Space scrub/stitch, Enter/Space stage confirm, P Pause, R Restart, M Mute)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')
      ) {
        return;
      }

      const sim = simRef.current;
      const key = event.key.toLowerCase();

      if (sim.runState === 'stage_ready') {
        if ((event.code === 'Space' || event.code === 'Enter') && !event.repeat) {
          event.preventDefault();
          resumeFromIntermission();
        }
        return;
      }

      if (key === 'p' || (key === 'escape' && (sim.runState === 'playing' || sim.runState === 'paused'))) {
        if (sim.runState === 'playing' || sim.runState === 'paused') {
          event.preventDefault();
          togglePause();
        }
        return;
      }

      if (key === 'm' && sim.runState !== 'title') {
        setMuted((prev) => !prev);
        return;
      }

      if (
        key === 'r' &&
        (sim.runState === 'playing' ||
          sim.runState === 'paused' ||
          sim.runState === 'victory' ||
          sim.runState === 'timeout')
      ) {
        startGameRun();
        return;
      }

      if (sim.runState === 'playing') {
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
          event.preventDefault();
          sim.keysPressed.add(key);
        }
        if (event.code === 'Space') {
          event.preventDefault();
          if (sim.phase === 'stitch') {
            if (!event.repeat) pullStitchStrike();
          } else {
            sim.keysPressed.add('space');
            applyToolStroke(sim.pointerX, sim.pointerY, 0.9);
          }
        }
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const sim = simRef.current;
      const key = event.key.toLowerCase();
      sim.keysPressed.delete(key);
      if (event.code === 'Space') {
        sim.keysPressed.delete('space');
      }
    };

    const onBlur = () => {
      simRef.current.keysPressed.clear();
      simRef.current.pointerDown = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [applyToolStroke, pullStitchStrike, resumeFromIntermission, startGameRun, togglePause]);

  // On-demand 60 FPS Canvas Simulation & Render Loop (0% idle CPU when paused/title)
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const frame = (now: number) => {
      rafId = 0;
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0), 0.05);

      const sim = simRef.current;

      // Visual decay in real dt
      if (sim.flashAlpha > 0) sim.flashAlpha = Math.max(0, sim.flashAlpha - dt * 1.45);
      if (sim.shakeTrauma > 0) sim.shakeTrauma = Math.max(0, sim.shakeTrauma - dt * 2.4);
      if (sim.popup.active) {
        sim.popup.life -= dt;
        sim.popup.y -= dt * 36;
        if (sim.popup.life <= 0) sim.popup.active = false;
      }

      // Update pooled particles in place
      let anyParticleActive = false;
      for (let i = 0; i < PARTICLE_POOL_SIZE; i += 1) {
        const p = sim.particles[i];
        if (!p.active) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
          continue;
        }
        anyParticleActive = true;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 260 * dt;
      }

      // Advance simulation logic when playing
      if (sim.runState === 'playing') {
        if (sim.hitstopTimer > 0) {
          sim.hitstopTimer = Math.max(0, sim.hitstopTimer - dt);
        } else {
          sim.timeLeft = Math.max(0, sim.timeLeft - dt);
          const intSec = Math.ceil(sim.timeLeft);
          if (intSec !== sim.lastIntTime) {
            sim.lastIntTime = intSec;
            setHud((prev) => ({ ...prev, timeLeft: intSec }));
          }

          if (sim.timeLeft <= 0) {
            sim.runState = 'timeout';
            sim.pointerDown = false;
            document.body.dataset.state = 'gameover';
            playCraftTone('miss');
            syncHudFromSim('Время смены вышло — перезапустите и заберите до −15%!');
          }

          // Keyboard cursor movement (WASD / Arrows + Space)
          const moveSpeed = 380;
          let moveX = 0;
          let moveY = 0;
          if (sim.keysPressed.has('arrowleft') || sim.keysPressed.has('a')) moveX -= 1;
          if (sim.keysPressed.has('arrowright') || sim.keysPressed.has('d')) moveX += 1;
          if (sim.keysPressed.has('arrowup') || sim.keysPressed.has('w')) moveY -= 1;
          if (sim.keysPressed.has('arrowdown') || sim.keysPressed.has('s')) moveY += 1;
          if (moveX !== 0 || moveY !== 0) {
            sim.pointerX = Math.max(36, Math.min(CANVAS_W - 36, sim.pointerX + moveX * moveSpeed * dt));
            sim.pointerY = Math.max(36, Math.min(CANVAS_H - 36, sim.pointerY + moveY * moveSpeed * dt));
            if (sim.keysPressed.has('space') && sim.phase !== 'stitch') {
              applyToolStroke(sim.pointerX, sim.pointerY, 0.92);
            }
          }

          // Gentle cadence relaxation when idle during wax phase
          if (sim.phase === 'wax' && !sim.pointerDown && !sim.keysPressed.has('space')) {
            sim.waxSpeedSmoothed = Math.max(0, sim.waxSpeedSmoothed - dt * 1.4);
          }

          // Dynamic stitch tension needle oscillation
          if (sim.phase === 'stitch') {
            const node =
              SATCHEL_STITCH_NODES[Math.min(sim.stitchesDone, TOTAL_STITCH_NODES - 1)];
            const diffMult = GAME_DIFFICULTIES[difficultyRef.current].needleSpeedMultiplier;
            const speed = node.speed * diffMult;
            sim.gaugePos += sim.gaugeDir * speed * dt;
            if (sim.gaugePos >= 0.96) {
              sim.gaugePos = 0.96;
              sim.gaugeDir = -1;
            } else if (sim.gaugePos <= 0.04) {
              sim.gaugePos = 0.04;
              sim.gaugeDir = 1;
            }
          }
        }
      }

      // Render Canvas2D scene
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.save();
      if (sim.shakeTrauma > 0) {
        const mag = sim.shakeTrauma * sim.shakeTrauma * 11;
        ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
      }

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // 1. Base Layer: Restored Clean Satchel Photo
      if (
        afterImgRef.current &&
        afterImgRef.current.complete &&
        afterImgRef.current.naturalWidth > 0
      ) {
        drawCoverImage(ctx, afterImgRef.current, CANVAS_W, CANVAS_H);
      } else {
        ctx.fillStyle = '#181A22';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      }

      // 2. Wax Polish Luster Layer (soft-light preserves rich dark slate background)
      if (waxLayerCanvasRef.current) {
        ctx.save();
        ctx.globalCompositeOperation = 'soft-light';
        ctx.drawImage(waxLayerCanvasRef.current, 0, 0);
        ctx.restore();
      }

      // 3. Worn Before Photo Layer (gets scrubbed away live during Stage 1)
      if (
        beforeMaskCanvasRef.current &&
        (sim.runState === 'title' || sim.phase === 'clean')
      ) {
        ctx.drawImage(beforeMaskCanvasRef.current, 0, 0);
      }

      // Subtle perimeter vignette for HUD contrast
      const vig = ctx.createRadialGradient(
        CANVAS_W / 2,
        CANVAS_H / 2,
        CANVAS_W * 0.28,
        CANVAS_W / 2,
        CANVAS_H / 2,
        CANVAS_W * 0.68
      );
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(11,12,16,0.52)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // 4. Stage 1: 5 Precision Wear Hotspots on the Satchel
      if (sim.runState === 'playing' && sim.phase === 'clean') {
        const pulse = 0.5 + 0.5 * Math.sin(now * 0.006);
        for (let i = 0; i < SATCHEL_DAMAGE_HOTSPOTS.length; i += 1) {
          const spot = SATCHEL_DAMAGE_HOTSPOTS[i];
          const progress = sim.hotspotProgress[i] ?? 0;
          const sx = spot.nx * CANVAS_W;
          const sy = spot.ny * CANVAS_H;
          const r = 34;

          if (progress >= 1) {
            ctx.save();
            ctx.strokeStyle = 'rgba(82, 224, 161, 0.55)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(sx, sy, 14, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#52E0A1';
            ctx.font = '700 13px "IBM Plex Mono", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('✓', sx, sy + 1);
            ctx.restore();
            continue;
          }

          ctx.save();
          // Outer pulsing target ring
          ctx.strokeStyle = `rgba(232, 93, 42, ${0.55 + pulse * 0.35})`;
          ctx.lineWidth = 2.2;
          ctx.setLineDash([6, 5]);
          ctx.beginPath();
          ctx.arc(sx, sy, r + pulse * 3, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);

          // Progress arc fill (mint)
          if (progress > 0) {
            ctx.strokeStyle = '#52E0A1';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(sx, sy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
            ctx.stroke();
          }

          // Number badge
          ctx.fillStyle = 'rgba(11, 12, 16, 0.84)';
          ctx.beginPath();
          ctx.arc(sx, sy, 13, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#EEF1F6';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fillStyle = '#EEF1F6';
          ctx.font = '700 12px "IBM Plex Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(i + 1), sx, sy + 0.5);
          ctx.restore();
        }
      }

      // 5. Stage 2: Live Wax Cadence Gauge along bottom safe zone
      if (sim.runState === 'playing' && sim.phase === 'wax') {
        const barW = 360;
        const barH = 18;
        const barX = (CANVAS_W - barW) / 2;
        const barY = CANVAS_H - 46;

        ctx.save();
        ctx.fillStyle = 'rgba(11, 12, 16, 0.88)';
        ctx.strokeStyle = 'rgba(220, 227, 239, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH, 6);
        ctx.fill();
        ctx.stroke();

        // Ideal sweet cadence zone (mint)
        ctx.fillStyle = 'rgba(82, 224, 161, 0.52)';
        ctx.fillRect(barX + barW * 0.14, barY + 2, barW * 0.58, barH - 4);

        // Overheat fast zone (ember)
        ctx.fillStyle = 'rgba(232, 93, 42, 0.42)';
        ctx.fillRect(barX + barW * 0.74, barY + 2, barW * 0.24, barH - 4);

        const normSpeed = Math.max(0.03, Math.min(0.97, sim.waxSpeedSmoothed / 2.8));
        const markerX = barX + normSpeed * barW;
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = sim.waxZone === 'sweet' ? '#52E0A1' : '#E85D2A';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(markerX - 5, barY - 4, 10, barH + 8, 3);
        ctx.fill();
        ctx.stroke();

        ctx.font = '700 12px "IBM Plex Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#EEF1F6';
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#0B0C10';
        const cadenceLabel =
          sim.waxZone === 'sweet'
            ? 'ТЕМП ВОСКА: ИДЕАЛЬНЫЙ'
            : sim.waxZone === 'fast'
            ? 'ЧУТЬ ПЛАВНЕЕ · НЕ ПЕРЕГРЕВАЙТЕ'
            : 'ВОДИТЕ ПЛАВНЫМИ КРУГАМИ ПО КОЖЕ';
        ctx.strokeText(cadenceLabel, CANVAS_W / 2, barY - 10);
        ctx.fillText(cadenceLabel, CANVAS_W / 2, barY - 10);
        ctx.restore();
      }

      // 6. Stage 3: Live Saddle-Stitch Seam Along Lower Satchel Edge + Dynamic Target Rail
      if (sim.runState === 'playing' && sim.phase === 'stitch') {
        const activeIdx = Math.min(sim.stitchesDone, TOTAL_STITCH_NODES - 1);
        const activeNode = SATCHEL_STITCH_NODES[activeIdx];

        // Dashed stitch guide tracing exact satchel edge
        ctx.save();
        ctx.strokeStyle = 'rgba(220, 227, 239, 0.45)';
        ctx.lineWidth = 2;
        ctx.setLineDash([7, 5]);
        ctx.beginPath();
        SATCHEL_STITCH_NODES.forEach((node, idx) => {
          const x = node.nx * CANVAS_W;
          const y = node.ny * CANVAS_H;
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.setLineDash([]);

        // Drawn waxed thread segments & diamond punch holes
        for (let i = 0; i < TOTAL_STITCH_NODES; i += 1) {
          const node = SATCHEL_STITCH_NODES[i];
          const hx = node.nx * CANVAS_W;
          const hy = node.ny * CANVAS_H;
          const completed = i < sim.stitchesDone;
          const isCurrent = i === sim.stitchesDone;

          if (completed && i > 0) {
            const prev = SATCHEL_STITCH_NODES[i - 1];
            ctx.strokeStyle = '#E85D2A';
            ctx.lineWidth = 5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(prev.nx * CANVAS_W, prev.ny * CANVAS_H);
            ctx.lineTo(hx, hy);
            ctx.stroke();
          }

          if (isCurrent) {
            const pulse = 0.5 + 0.5 * Math.sin(now * 0.009);
            ctx.strokeStyle = `rgba(232, 93, 42, ${0.42 + pulse * 0.45})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(hx, hy, 18 + pulse * 5, 0, Math.PI * 2);
            ctx.stroke();
          }

          ctx.fillStyle = completed ? '#52E0A1' : isCurrent ? '#E85D2A' : '#0B0C10';
          ctx.strokeStyle = '#EEF1F6';
          ctx.lineWidth = isCurrent ? 3 : 2;
          ctx.beginPath();
          ctx.arc(hx, hy, isCurrent ? 12 : 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }

        // Dynamic tension rail at bottom
        const barW = 440;
        const barH = 22;
        const barX = (CANVAS_W - barW) / 2;
        const barY = CANVAS_H - 44;

        ctx.fillStyle = 'rgba(11, 12, 16, 0.9)';
        ctx.strokeStyle = 'rgba(220, 227, 239, 0.48)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH, 6);
        ctx.fill();
        ctx.stroke();

        // Good zone centered at activeNode.railTarget (±0.20)
        const goodStart = Math.max(0.02, activeNode.railTarget - 0.20);
        const goodEnd = Math.min(0.98, activeNode.railTarget + 0.20);
        ctx.fillStyle = 'rgba(242, 193, 114, 0.36)';
        ctx.fillRect(barX + barW * goodStart, barY + 2, barW * (goodEnd - goodStart), barH - 4);

        // Tight Perfect zone centered at activeNode.railTarget (±0.085)
        const perfStart = Math.max(0.02, activeNode.railTarget - 0.085);
        const perfEnd = Math.min(0.98, activeNode.railTarget + 0.085);
        ctx.fillStyle = 'rgba(82, 224, 161, 0.8)';
        ctx.fillRect(barX + barW * perfStart, barY + 2, barW * (perfEnd - perfStart), barH - 4);

        // Moving chrome-ember needle
        const needleX = barX + sim.gaugePos * barW;
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#E85D2A';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(needleX - 6, barY - 6, 12, barH + 12, 4);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // 7. Active Tool Reticle during Clean / Wax (live cadence ring tint in Stage 2)
      if (sim.runState === 'playing' && (sim.phase === 'clean' || sim.phase === 'wax')) {
        const ringColor =
          sim.phase === 'clean'
            ? '#DCE3EF'
            : sim.waxZone === 'sweet'
            ? '#52E0A1'
            : sim.waxZone === 'fast'
            ? '#E85D2A'
            : '#F2C172';
        ctx.save();
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = sim.pointerDown ? 3 : 1.8;
        ctx.beginPath();
        ctx.arc(sim.pointerX, sim.pointerY, sim.pointerDown ? 38 : 44, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle =
          sim.phase === 'clean'
            ? 'rgba(220,227,239,0.12)'
            : sim.waxZone === 'sweet'
            ? 'rgba(82,224,161,0.14)'
            : 'rgba(242,193,114,0.14)';
        ctx.fill();
        ctx.restore();
      }

      // 8. Pooled Particles
      for (let i = 0; i < PARTICLE_POOL_SIZE; i += 1) {
        const p = sim.particles[i];
        if (!p.active) continue;
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // 9. Floating Feedback Text
      if (sim.popup.active) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, sim.popup.life * 1.8);
        ctx.font = '700 20px "IBM Plex Mono", monospace';
        ctx.textAlign = 'center';
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#0B0C10';
        ctx.strokeText(sim.popup.text, sim.popup.x, sim.popup.y);
        ctx.fillStyle = sim.popup.color;
        ctx.fillText(sim.popup.text, sim.popup.x, sim.popup.y);
        ctx.restore();
      }

      // 10. Stage / Hit Specular Flash
      if (sim.flashAlpha > 0) {
        ctx.fillStyle = `rgba(238, 241, 246, ${sim.flashAlpha * 0.42})`;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      }

      ctx.restore();

      const needsNextFrame =
        sim.runState === 'playing' ||
        sim.flashAlpha > 0 ||
        sim.shakeTrauma > 0 ||
        sim.popup.active ||
        anyParticleActive;

      if (needsNextFrame) {
        rafId = window.requestAnimationFrame(frame);
      }
    };

    const ensureLoop = () => {
      if (rafId === 0) {
        lastTime = performance.now();
        rafId = window.requestAnimationFrame(frame);
      }
    };

    ensureLoopRef.current = ensureLoop;
    ensureLoop();

    return () => {
      if (rafId !== 0) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
      ensureLoopRef.current = () => {};
    };
  }, [applyToolStroke, playCraftTone, syncHudFromSim]);

  const toCanvasCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: CANVAS_W / 2, y: CANVAS_H / 2 };
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / Math.max(1, rect.width)) * CANVAS_W;
    const y = ((clientY - rect.top) / Math.max(1, rect.height)) * CANVAS_H;
    return {
      x: Math.max(0, Math.min(CANVAS_W, x)),
      y: Math.max(0, Math.min(CANVAS_H, y)),
    };
  };

  const handleCanvasPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const sim = simRef.current;
    if (sim.runState !== 'playing') return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const pt = toCanvasCoords(event.clientX, event.clientY);
    sim.pointerX = pt.x;
    sim.pointerY = pt.y;
    sim.pointerDown = true;
    sim.lastBrushX = pt.x;
    sim.lastBrushY = pt.y;
    sim.lastBrushTime = performance.now();

    if (sim.phase === 'stitch') {
      pullStitchStrike();
    } else {
      applyToolStroke(pt.x, pt.y, 0.85);
    }
  };

  const handleCanvasPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const sim = simRef.current;
    const pt = toCanvasCoords(event.clientX, event.clientY);
    sim.pointerX = pt.x;
    sim.pointerY = pt.y;

    if (sim.runState === 'playing' && sim.pointerDown && sim.phase !== 'stitch') {
      const dx = pt.x - sim.lastBrushX;
      const dy = pt.y - sim.lastBrushY;
      const dist = Math.hypot(dx, dy);
      if (dist >= 16) {
        const now = performance.now();
        const dtSec = Math.max(0.016, (now - sim.lastBrushTime) / 1000);
        const speedNormPerSec = dist / CANVAS_W / dtSec;
        const steps = Math.min(6, Math.ceil(dist / 22));
        for (let s = 1; s <= steps; s += 1) {
          applyToolStroke(
            sim.lastBrushX + (dx * s) / steps,
            sim.lastBrushY + (dy * s) / steps,
            speedNormPerSec
          );
        }
        sim.lastBrushX = pt.x;
        sim.lastBrushY = pt.y;
        sim.lastBrushTime = now;
      }
    }
  };

  const handleCanvasPointerUp = () => {
    simRef.current.pointerDown = false;
  };

  const handleDifficultySelect = (nextDiff: GameDifficultyId) => {
    setDifficultyId(nextDiff);
    const sim = simRef.current;
    if (sim.runState === 'title') {
      sim.timeLimit = GAME_DIFFICULTIES[nextDiff].timeLimitSec;
      sim.timeLeft = GAME_DIFFICULTIES[nextDiff].timeLimitSec;
      syncHudFromSim('Нажмите «Начать смену», чтобы побороться за скидку до −15%');
    } else {
      startGameRun(nextDiff);
    }
  };

  const stageIndex = hud.phase === 'clean' ? 1 : hud.phase === 'wax' ? 2 : 3;

  return (
    <section
      id="workbench-game"
      data-game-state={hud.runState}
      data-game-phase={hud.phase}
      className="workshop-atelier-dark seam-divider"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        {/* Section Header + Difficulty Mode Selector */}
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-[#A2ABBC]">
              Испытание на верстаке · Скидка зависит от точности
            </p>
            <h2
              className="font-display mt-2 text-[clamp(1.65rem,2.9vw,2.55rem)] font-bold leading-[1.12] text-[#EEF1F6]"
              style={{ textWrap: 'balance' }}
            >
              Спасите саквояж за 30 секунд — заберите до −15%
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-[#A2ABBC]">
              От вашей аккуратности на трёх этапах зависит размер скидки: от −5% за старт до
              максимальных −15% за ювелирную работу. Переигрывать можно сколько угодно — лучшая
              скидка сохраняется.
            </p>
          </div>

          {/* Difficulty + Best Earned Record */}
          <div className="flex flex-wrap items-center gap-3">
            {bestDiscountPct > 0 && bestPromoCode && (
              <div
                data-testid="game-best-record"
                className="flex items-center gap-2 rounded-lg border border-[#52E0A1]/40 bg-[#13151B] px-3.5 py-2 text-xs"
              >
                <Award className="h-4 w-4 text-[#52E0A1] shrink-0" aria-hidden="true" />
                <span className="text-[#A2ABBC]">Ваш рекорд:</span>
                <span className="font-mono-craft font-bold text-[#52E0A1]">
                  −{bestDiscountPct}% ({bestPromoCode})
                </span>
              </div>
            )}

            <div
              role="tablist"
              aria-label="Режим смены на верстаке"
              className="inline-flex gap-1 rounded-lg border border-[rgba(220,227,239,0.16)] bg-[#13151B] p-1"
            >
              {(Object.keys(GAME_DIFFICULTIES) as GameDifficultyId[]).map((diffKey) => {
                const cfg = GAME_DIFFICULTIES[diffKey];
                const active = diffKey === difficultyId;
                return (
                  <button
                    key={cfg.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => handleDifficultySelect(cfg.id)}
                    className={`min-h-[38px] rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-[#EEF1F6] text-[#0B0C10]'
                        : 'text-[#A2ABBC] hover:text-[#EEF1F6]'
                    }`}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Neo-Y2K Chrome Game Cabinet */}
        <div className="chrome-surface mt-8 overflow-hidden rounded-xl">
          {/* Unified Perimeter HUD Strip (Never overlaps live canvas) */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(220,227,239,0.12)] bg-[#12141B] px-4 py-3 sm:px-6">
            {/* 3 Craft Stages Progress */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
              <span
                className={`inline-flex items-center gap-1.5 font-semibold ${
                  stageIndex === 1 && hud.runState !== 'victory'
                    ? 'text-[#EEF1F6]'
                    : stageIndex > 1 || hud.runState === 'victory'
                    ? 'text-[#52E0A1]'
                    : 'text-[#768095]'
                }`}
              >
                <Brush className="h-3.5 w-3.5" aria-hidden="true" />
                1. Очаги ({hud.cleanSpotsCleared}/{SATCHEL_DAMAGE_HOTSPOTS.length})
              </span>
              <span aria-hidden="true" className="text-[#4B5263]">
                →
              </span>
              <span
                className={`inline-flex items-center gap-1.5 font-semibold ${
                  stageIndex === 2 && hud.runState !== 'victory'
                    ? 'text-[#F2C172]'
                    : stageIndex > 2 || hud.runState === 'victory'
                    ? 'text-[#52E0A1]'
                    : 'text-[#768095]'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                2. Воск ({hud.waxPct}%)
              </span>
              <span aria-hidden="true" className="text-[#4B5263]">
                →
              </span>
              <span
                className={`inline-flex items-center gap-1.5 font-semibold ${
                  hud.runState === 'victory'
                    ? 'text-[#52E0A1]'
                    : stageIndex === 3
                    ? 'text-[#E85D2A]'
                    : 'text-[#768095]'
                }`}
              >
                <Scissors className="h-3.5 w-3.5" aria-hidden="true" />
                3. Шов ({hud.stitchesDone}/{TOTAL_STITCH_NODES})
              </span>
            </div>

            {/* Live Tabular Metrics + Utility Controls */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex items-baseline gap-3.5 font-mono-craft text-xs">
                <div>
                  <span className="text-[#768095]">ВРЕМЯ </span>
                  <span
                    data-testid="game-timer"
                    className={`text-sm font-bold ${
                      hud.timeLeft <= 8 && hud.runState === 'playing'
                        ? 'text-[#E85D2A]'
                        : 'text-[#EEF1F6]'
                    }`}
                  >
                    {hud.timeLeft}с
                  </span>
                </div>
                <div>
                  <span className="text-[#768095]">ОЧКИ </span>
                  <span data-testid="game-score" className="text-sm font-bold text-[#DCE3EF]">
                    {hud.score}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    setMuted((prev) => !prev);
                  }}
                  aria-label={muted ? 'Включить звук [M]' : 'Выключить звук [M]'}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[rgba(220,227,239,0.18)] bg-[#0B0C10] text-[#DCE3EF] hover:border-[#EEF1F6]"
                >
                  {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                {(hud.runState === 'playing' || hud.runState === 'paused') && (
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      togglePause();
                    }}
                    aria-label={hud.runState === 'paused' ? 'Продолжить [P]' : 'Пауза [P]'}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[rgba(220,227,239,0.18)] bg-[#0B0C10] text-[#DCE3EF] hover:border-[#EEF1F6]"
                  >
                    {hud.runState === 'paused' ? (
                      <Play className="h-4 w-4" />
                    ) : (
                      <Pause className="h-4 w-4" />
                    )}
                  </button>
                )}
                {hud.runState !== 'title' && (
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      startGameRun();
                    }}
                    aria-label="Переиграть смену [R]"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[rgba(220,227,239,0.18)] bg-[#0B0C10] text-[#DCE3EF] hover:border-[#EEF1F6]"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Interactive 16:9 Canvas Stage (Zero backdrop-blur over live canvas; clean mobile overlay reflow) */}
          <div
            className={`relative w-full bg-[#090A0E] select-none ${
              hud.runState === 'playing' ? 'aspect-[16/9]' : 'sm:aspect-[16/9]'
            }`}
          >
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              data-testid="workbench-game-canvas"
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handleCanvasPointerUp}
              onPointerCancel={handleCanvasPointerUp}
              className={`block touch-none cursor-crosshair ${
                hud.runState === 'playing'
                  ? 'h-full w-full'
                  : 'absolute inset-0 h-full w-full object-cover sm:static'
              }`}
            />

            {/* Title Screen Overlay (Interactive Centerpiece + Bespoke Inline SVG Crest) */}
            {hud.runState === 'title' && (
              <div className="relative z-20 flex min-h-[280px] flex-col items-center justify-center bg-[#0B0C10]/74 p-4 text-center sm:absolute sm:inset-0 sm:min-h-0 sm:p-6">
                <div className="max-w-lg rounded-xl border border-[rgba(220,227,239,0.22)] bg-[#11131A]/95 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.65)] sm:p-6">
                  {/* Bespoke inline SVG crest lockup */}
                  <div className="mx-auto flex items-center justify-center gap-2.5">
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 28 28"
                      fill="none"
                      aria-hidden="true"
                    >
                      <rect
                        x="2"
                        y="2"
                        width="24"
                        height="24"
                        rx="6"
                        stroke="#DCE3EF"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M7 19L19 7M14 7H21V14"
                        stroke="#E85D2A"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="9" cy="19" r="2" fill="#52E0A1" />
                    </svg>
                    <span className="font-mono-craft text-[11px] font-semibold tracking-wider text-[#E85D2A]">
                      {WORKBENCH_GAME_MEDIA.title.toUpperCase()}
                    </span>
                  </div>

                  <h3 className="font-display mt-2.5 text-lg font-bold text-[#EEF1F6] sm:text-xl">
                    Верстак на точность: выиграйте до −15%
                  </h3>

                  <p className="mt-2 text-xs leading-relaxed text-[#C6CEDB] sm:text-sm">
                    1) Прицельно очистите 5 очагов соли · 2) Натрите кожу воском в ровном темпе ·
                    3) Протяните 5 стежков в зелёный сектор.
                  </p>

                  {/* Transparent 5-tier discount ladder */}
                  <div className="mt-4 grid grid-cols-5 gap-1 rounded-lg border border-[rgba(220,227,239,0.12)] bg-[#0B0C10] p-2 font-mono-craft text-[11px]">
                    {[...DISCOUNT_TIERS].reverse().map((tier) => (
                      <div key={tier.discountPct} className="flex flex-col items-center">
                        <span
                          className={`font-bold ${
                            tier.discountPct === 15 ? 'text-[#52E0A1]' : 'text-[#EEF1F6]'
                          }`}
                        >
                          −{tier.discountPct}%
                        </span>
                        <span className="text-[10px] text-[#768095]">
                          {tier.minMastery === 0 ? 'старт' : `${tier.minMastery}%+`}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    data-start="true"
                    onClick={() => startGameRun()}
                    className="chrome-sheen mt-4 inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-md bg-[#E85D2A] px-6 py-2.5 text-sm font-bold text-[#0B0C10] transition-colors hover:bg-[#FF713D] sm:w-auto"
                  >
                    <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                    Начать смену ({activeDifficulty.timeLimitSec}с)
                  </button>

                  <p className="mt-2.5 font-mono-craft text-[11px] text-[#768095]">
                    Мышь или палец на телефоне · Клавиатура: WASD + Пробел · P пауза
                  </p>
                </div>
              </div>
            )}

            {/* Stage Intermission Gate Card (Pauses timer & prevents accidental Stage 3 misfires!) */}
            {hud.runState === 'stage_ready' && hud.intermissionInfo && (
              <motion.div
                className="relative z-20 flex min-h-[270px] items-center justify-center bg-[#0B0C10]/82 p-3 text-center sm:absolute sm:inset-0 sm:min-h-0 sm:p-5"
                initial={{ opacity: reduced ? 1 : 0, scale: reduced ? 1 : 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: reduced ? 0 : 0.3 }}
                exit={{ opacity: reduced ? 0 : 0.6, scale: reduced ? 0.8 : 1 }}
              >
                <div
                  data-testid="stage-intermission-card"
                  className="w-full max-w-md rounded-xl border border-[#52E0A1]/50 bg-[#12151C]/96 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.75)] sm:p-5"
                >
                  <p className="font-mono-craft text-[11px] font-bold tracking-wider text-[#52E0A1]">
                    {hud.intermissionInfo.badge}
                  </p>

                  <h3 className="font-display mt-1.5 text-base font-bold text-[#EEF1F6] sm:text-lg">
                    {hud.intermissionInfo.title}
                  </h3>

                  <div className="mt-2.5 flex items-center justify-center gap-3 rounded-lg border border-[rgba(220,227,239,0.14)] bg-[#0B0C10] px-3 py-1.5 font-mono-craft text-xs">
                    <span className="text-[#A2ABBC]">{hud.intermissionInfo.completedLabel}:</span>
                    <span className="font-bold text-[#52E0A1]">
                      {hud.intermissionInfo.completedValue}
                    </span>
                    <span className="text-[#4B5263]">·</span>
                    <span className="text-[#DCE3EF]">Таймер: {hud.timeLeft}с</span>
                  </div>

                  <p className="mt-2.5 text-xs leading-relaxed text-[#DCE3EF] sm:text-[13px]">
                    {hud.intermissionInfo.instruction}
                  </p>

                  <p className="mt-1.5 font-mono-craft text-[11px] text-[#A2ABBC]">
                    {hud.intermissionInfo.warningNote}
                  </p>

                  <button
                    type="button"
                    data-testid="stage-intermission-continue"
                    disabled={!intermissionReady}
                    onClick={resumeFromIntermission}
                    className={`chrome-sheen mt-3.5 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md px-5 py-2 text-sm font-bold transition-colors sm:w-auto ${
                      intermissionReady
                        ? 'bg-[#E85D2A] text-[#0B0C10] hover:bg-[#FF713D]'
                        : 'cursor-wait bg-[#272C38] text-[#A2ABBC]'
                    }`}
                  >
                    <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                    {intermissionReady ? hud.intermissionInfo.ctaLabel : 'Пауза безопасности...'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Pause Modal */}
            {hud.runState === 'paused' && (
              <motion.div
                className="relative z-20 flex min-h-[260px] items-center justify-center bg-[#0B0C10]/82 p-4 sm:absolute sm:inset-0 sm:min-h-0"
                initial={{ opacity: reduced ? 1 : 0, scale: reduced ? 1 : 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: reduced ? 0 : 0.3 }}
                exit={{ opacity: reduced ? 0 : 0.6, scale: reduced ? 0.8 : 1 }}
              >
                <div className="w-full max-w-sm rounded-xl border border-[rgba(220,227,239,0.24)] bg-[#13151B] p-6 text-center">
                  <p className="font-mono-craft text-xs text-[#A2ABBC]">ВЕРСТАК НА ПАУЗЕ</p>
                  <h3 className="font-display mt-2 text-lg font-bold text-[#EEF1F6]">
                    Осталось {hud.timeLeft} сек.
                  </h3>
                  <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={togglePause}
                      className="min-h-[42px] rounded-md bg-[#E85D2A] px-5 py-2 text-xs font-bold text-[#0B0C10] hover:bg-[#FF713D]"
                    >
                      Продолжить
                    </button>
                    <button
                      type="button"
                      onClick={() => startGameRun()}
                      className="min-h-[42px] rounded-md border border-[rgba(220,227,239,0.24)] bg-[#0B0C10] px-4 py-2 text-xs font-semibold text-[#EEF1F6] hover:border-[#EEF1F6]"
                    >
                      Заново
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Timeout Modal */}
            {hud.runState === 'timeout' && (
              <motion.div
                className="relative z-20 flex min-h-[260px] items-center justify-center bg-[#0B0C10]/86 p-4 sm:absolute sm:inset-0 sm:min-h-0"
                initial={{ opacity: reduced ? 1 : 0, scale: reduced ? 1 : 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: reduced ? 0 : 0.3 }}
                exit={{ opacity: reduced ? 0 : 0.6, scale: reduced ? 0.8 : 1 }}
              >
                <div className="w-full max-w-md rounded-xl border border-[#E85D2A]/50 bg-[#13151B] p-6 text-center">
                  <p className="font-mono-craft text-xs font-semibold text-[#E85D2A]">
                    ВРЕМЯ СМЕНЫ ВЫШЛО
                  </p>
                  <h3 className="font-display mt-2 text-lg font-bold text-[#EEF1F6]">
                    Саквояж почти готов — попробуйте ещё раз
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#A2ABBC]">
                    Очищено очагов: {hud.cleanSpotsCleared}/{SATCHEL_DAMAGE_HOTSPOTS.length} · Воск:{' '}
                    {hud.waxPct}% · Стежков: {hud.stitchesDone}/{TOTAL_STITCH_NODES}.
                  </p>
                  <button
                    type="button"
                    data-start="true"
                    onClick={() => startGameRun()}
                    className="chrome-sheen mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-md bg-[#E85D2A] px-6 py-2.5 text-sm font-bold text-[#0B0C10] hover:bg-[#FF713D]"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Переиграть заново
                  </button>
                </div>
              </motion.div>
            )}

            {/* Victory Outcome Card (Skill-Based 5%-15% Discount Breakdown + Instant Replay) */}
            {hud.runState === 'victory' && hud.lastOutcome && (
              <motion.div
                className="relative z-20 flex min-h-[300px] items-center justify-center bg-[#0B0C10]/84 p-3 sm:absolute sm:inset-0 sm:min-h-0 sm:overflow-y-auto sm:p-5"
                initial={{ opacity: reduced ? 1 : 0, scale: reduced ? 1 : 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: reduced ? 0 : 0.3 }}
                exit={{ opacity: reduced ? 0 : 0.6, scale: reduced ? 0.8 : 1 }}
              >
                <div
                  data-testid="game-victory-card"
                  className="w-full max-w-lg rounded-xl border border-[#52E0A1]/55 bg-[#12151C] p-4 text-center shadow-[0_24px_60px_rgba(0,0,0,0.75)] sm:p-6"
                >
                  <div className="flex flex-wrap items-center justify-center gap-2 font-mono-craft text-xs">
                    <span className="font-bold text-[#52E0A1]">
                      РАНГ {hud.lastOutcome.rank} · МАСТЕРСТВО {hud.lastOutcome.masteryPct}%
                    </span>
                    <span className="text-[#768095]">·</span>
                    <span className="text-[#DCE3EF]">{hud.lastOutcome.score} ОЧКОВ</span>
                  </div>

                  <h3 className="font-display mt-2 text-lg font-bold text-[#EEF1F6] sm:text-xl">
                    Ваша скидка за смену:{' '}
                    <span className="text-[#52E0A1]">−{hud.lastOutcome.discountPct}%</span>
                  </h3>

                  {/* Detailed 3-Stage Performance Breakdown */}
                  <div className="mt-3.5 grid grid-cols-3 gap-2 rounded-lg border border-[rgba(220,227,239,0.12)] bg-[#0B0C10] p-2.5 font-mono-craft text-xs">
                    <div>
                      <span className="block text-[10px] text-[#768095]">ЧИСТКА</span>
                      <span className="font-bold text-[#EEF1F6]">
                        {hud.lastOutcome.cleanQualityPct}%
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#768095]">ТЕМП ВОСКА</span>
                      <span className="font-bold text-[#F2C172]">
                        {hud.lastOutcome.waxQualityPct}%
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#768095]">ШОВ В ТОЧКУ</span>
                      <span className="font-bold text-[#52E0A1]">
                        {hud.perfectStitches}/{TOTAL_STITCH_NODES}
                      </span>
                    </div>
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-[#C6CEDB]">
                    {hud.lastOutcome.improvementTip}
                  </p>

                  {bestDiscountPct > hud.lastOutcome.discountPct && bestPromoCode && (
                    <p className="mt-2 font-mono-craft text-[11px] font-semibold text-[#52E0A1]">
                      Ваш лучший рекорд −{bestDiscountPct}% ({bestPromoCode}) сохранён!
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                    <button
                      type="button"
                      disabled={appliedPromoCode === (bestPromoCode && bestDiscountPct >= hud.lastOutcome!.discountPct ? bestPromoCode : hud.lastOutcome!.promoCode)}
                      onClick={() => {
                        const codeToApply = bestPromoCode && bestDiscountPct >= hud.lastOutcome!.discountPct
                          ? bestPromoCode
                          : hud.lastOutcome!.promoCode;
                        onApplyPromoToCalculator(codeToApply);
                        setAppliedPromoCode(codeToApply);
                      }}
                      className={`chrome-sheen min-h-[44px] rounded-md px-5 py-2.5 text-xs font-bold text-[#0B0C10] transition-colors whitespace-nowrap ${
                        appliedPromoCode === (bestPromoCode && bestDiscountPct >= hud.lastOutcome!.discountPct ? bestPromoCode : hud.lastOutcome!.promoCode)
                          ? 'bg-[#52E0A1]/50 cursor-default'
                          : 'bg-[#52E0A1] hover:bg-[#72EBB5]'
                      }`}
                    >
                      {appliedPromoCode === (bestPromoCode && bestDiscountPct >= hud.lastOutcome!.discountPct ? bestPromoCode : hud.lastOutcome!.promoCode)
                        ? 'Скидка применена!'
                        : `Применить −${Math.max(bestDiscountPct, hud.lastOutcome.discountPct)}% в расчёт`}
                    </button>

                    <button
                      type="button"
                      data-start="true"
                      onClick={() => startGameRun()}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-[rgba(220,227,239,0.26)] bg-[#0B0C10] px-4 py-2.5 text-xs font-semibold text-[#EEF1F6] hover:border-[#E85D2A] hover:text-[#E85D2A] whitespace-nowrap"
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      {Math.max(bestDiscountPct, hud.lastOutcome.discountPct) < 15
                        ? 'Переиграть ради −15%'
                        : 'Сыграть ещё раз'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Bottom Tactile Action & Live Guidance Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(220,227,239,0.12)] bg-[#12141B] px-4 py-3 sm:px-6">
            <p className="text-xs font-medium text-[#C6CEDB]">{hud.statusBanner}</p>

            <div className="flex items-center gap-2">
              {hud.runState === 'playing' && hud.phase === 'stitch' && (
                <button
                  type="button"
                  onClick={pullStitchStrike}
                  className="chrome-sheen min-h-[40px] rounded-md bg-[#E85D2A] px-4 py-2 text-xs font-bold text-[#0B0C10] hover:bg-[#FF713D] whitespace-nowrap"
                >
                  Протянуть стежок (Пробел)
                </button>
              )}

              {bestPromoCode && bestDiscountPct > 0 && hud.runState !== 'victory' && (
                <button
                  type="button"
                  disabled={appliedPromoCode === bestPromoCode}
                  onClick={() => {
                    onApplyPromoToCalculator(bestPromoCode);
                    setAppliedPromoCode(bestPromoCode);
                  }}
                  className={`min-h-[38px] rounded-md border px-3 py-1.5 font-mono-craft text-[11px] font-semibold whitespace-nowrap transition-colors ${
                    appliedPromoCode === bestPromoCode
                      ? 'bg-[#52E0A1]/50 text-[#52E0A1] border-[#52E0A1]/50 cursor-default'
                      : 'border-[#52E0A1]/45 bg-[#0B0C10] text-[#52E0A1] hover:bg-[#52E0A1] hover:text-[#0B0C10]'
                  }`}
                >
                  {appliedPromoCode === bestPromoCode ? 'Скидка применена!' : `В смету: ${bestPromoCode} (−${bestDiscountPct}%)`}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

