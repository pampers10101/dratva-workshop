import { Calculator, Crosshair, Eye, MoveHorizontal } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RESTORATION_CASES, type RestorationCase } from '../data/workshop';
import type { LeatherItemId, RepairOperationId } from '../utils/estimator';

type CategoryFilter = 'all' | RestorationCase['category'];
type LoupeZoom = 2.5 | 3.5;

const FILTER_OPTIONS: Array<{ id: CategoryFilter; label: string; shortLabel: string }> = [
  { id: 'all', label: 'Все примеры', shortLabel: 'Все' },
  { id: 'bags', label: 'Портфели и сумки', shortLabel: 'Портфели' },
  { id: 'jackets', label: 'Куртки', shortLabel: 'Куртки' },
  { id: 'shoes', label: 'Обувь', shortLabel: 'Обувь' },
];

const CASE_TO_PRESET: Record<
  string,
  { item: LeatherItemId; repairs: RepairOperationId[]; label: string }
> = {
  'briefcase-1998': {
    item: 'briefcase',
    repairs: ['scuffs_dye', 'edge_handles'],
    label: 'Реставрация портфеля (углы + урез)',
  },
  'jacket-cuff': {
    item: 'jacket',
    repairs: ['crack_patch', 'scuffs_dye'],
    label: 'Ремонт порыва и тонировка куртки',
  },
  'chelsea-salt': {
    item: 'boots',
    repairs: ['salt_wax'],
    label: 'Вытяжка соли и жирование обуви',
  },
};

const SLIDER_MIN = 3;
const SLIDER_MAX = 97;

// Module-level decoded image retention so browser never evicts gallery bitmaps between hovers/tabs
const preloadedGalleryBitmaps = new Map<string, HTMLImageElement>();

function preloadAndDecodeUrl(url: string) {
  if (typeof window === 'undefined' || preloadedGalleryBitmaps.has(url)) return;
  const img = new Image();
  img.decoding = 'async';
  img.referrerPolicy = 'no-referrer';
  img.src = url;
  if (typeof img.decode === 'function') {
    img.decode().catch(() => {});
  }
  preloadedGalleryBitmaps.set(url, img);
}

interface RestorationGalleryProps {
  onSelectCasePreset?: (
    label: string,
    item: LeatherItemId,
    repairs: RepairOperationId[]
  ) => void;
}

export function RestorationGallery({ onSelectCasePreset }: RestorationGalleryProps) {
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [selectedId, setSelectedId] = useState<string>(RESTORATION_CASES[0].id);
  const [split, setSplit] = useState<number>(52);
  const [loupeEnabled, setLoupeEnabled] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<LoupeZoom>(2.5);
  const [activePointIdx, setActivePointIdx] = useState<number>(0);
  const [loupePos, setLoupePos] = useState<{
    x: number;
    y: number;
    visible: boolean;
    locked: boolean;
  }>({
    x: 50,
    y: 50,
    visible: false,
    locked: false,
  });
  const [stageSize, setStageSize] = useState<{ width: number; height: number }>({
    width: 720,
    height: 405,
  });
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const stageRef = useRef<HTMLDivElement | null>(null);

  // Eagerly preload & decode ALL 6 before/after photos on mount for 0ms optical loupe response
  useEffect(() => {
    RESTORATION_CASES.forEach((entry) => {
      preloadAndDecodeUrl(entry.beforeImage);
      preloadAndDecodeUrl(entry.afterImage);
    });
  }, []);

  // Track exact rendered stage dimensions for mathematically true distortion-free magnification
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setStageSize((prev) =>
          Math.abs(prev.width - rect.width) < 1 && Math.abs(prev.height - rect.height) < 1
            ? prev
            : { width: rect.width, height: rect.height }
        );
      }
    };

    measure();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', measure, { passive: true });
    return () => window.removeEventListener('resize', measure);
  }, []);

  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryFilter, number> = {
      all: RESTORATION_CASES.length,
      bags: 0,
      jackets: 0,
      shoes: 0,
    };
    RESTORATION_CASES.forEach((entry) => {
      counts[entry.category] += 1;
    });
    return counts;
  }, []);

  const visibleCases =
    filter === 'all'
      ? RESTORATION_CASES
      : RESTORATION_CASES.filter((item) => item.category === filter);

  const activeCase = visibleCases.find((item) => item.id === selectedId) ?? visibleCases[0];
  const activePoint = activeCase.loupePoints[activePointIdx] ?? activeCase.loupePoints[0];
  const activePreset = CASE_TO_PRESET[activeCase.id];

  const handleCategoryChange = (nextFilter: CategoryFilter) => {
    setFilter(nextFilter);
    const matching =
      nextFilter === 'all'
        ? RESTORATION_CASES
        : RESTORATION_CASES.filter((item) => item.category === nextFilter);
    if (matching.length > 0 && !matching.some((item) => item.id === selectedId)) {
      setSelectedId(matching[0].id);
      setActivePointIdx(0);
      setSplit(52);
      setLoupePos({
        x: matching[0].loupePoints[0]?.x ?? 50,
        y: matching[0].loupePoints[0]?.y ?? 50,
        visible: loupeEnabled,
        locked: loupeEnabled,
      });
    }
  };

  const handleSelectCase = (entry: RestorationCase) => {
    setSelectedId(entry.id);
    setActivePointIdx(0);
    setSplit(52);
    if (loupeEnabled) {
      const firstPt = entry.loupePoints[0];
      setLoupePos({
        x: firstPt?.x ?? 50,
        y: firstPt?.y ?? 50,
        visible: true,
        locked: true,
      });
    }
  };

  const handleToggleLoupe = () => {
    setLoupeEnabled((prev) => {
      const next = !prev;
      if (next) {
        const pt = activeCase.loupePoints[activePointIdx] ?? activeCase.loupePoints[0];
        setLoupePos({
          x: pt?.x ?? 50,
          y: pt?.y ?? 50,
          visible: true,
          locked: true,
        });
      } else {
        setLoupePos((curr) => ({ ...curr, visible: false, locked: false }));
      }
      return next;
    });
  };

  const handleSelectFocusPoint = (index: number) => {
    const pt = activeCase.loupePoints[index];
    if (!pt) return;
    setActivePointIdx(index);
    setLoupeEnabled(true);
    setLoupePos({
      x: pt.x,
      y: pt.y,
      visible: true,
      locked: true,
    });
  };

  const updateLoupeFromClientPoint = (clientX: number, clientY: number) => {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const x = Math.max(3, Math.min(97, ((clientX - rect.left) / Math.max(1, rect.width)) * 100));
    const y = Math.max(5, Math.min(95, ((clientY - rect.top) / Math.max(1, rect.height)) * 100));
    setLoupePos({ x, y, visible: true, locked: false });
  };

  const handleStagePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!loupeEnabled) return;
    updateLoupeFromClientPoint(event.clientX, event.clientY);
  };

  const handleStagePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!loupeEnabled) return;
    updateLoupeFromClientPoint(event.clientX, event.clientY);
  };

  const handleStagePointerLeave = () => {
    if (!loupeEnabled) return;
    // Keep locked preview visible if user tapped a focus chip, otherwise gently tuck away
    setLoupePos((prev) => (prev.locked ? prev : { ...prev, visible: false }));
  };

  // True optical lens geometry (exact aspect-preserving zoom, zero shrinkage or squash!)
  const lensDiameter = stageSize.width < 520 ? 142 : 192;
  const magnifiedWidth = stageSize.width * zoomLevel;
  const magnifiedHeight = stageSize.height * zoomLevel;
  const innerTranslateX = lensDiameter / 2 - (loupePos.x / 100) * magnifiedWidth;
  const innerTranslateY = lensDiameter / 2 - (loupePos.y / 100) * magnifiedHeight;

  const straddlesSplit = Math.abs(loupePos.x - split) <= 4.5;
  const loupeShowsBefore = loupePos.x < split;
  const loupeReadoutText = straddlesSplit
    ? `${zoomLevel}× · ДО | ПОСЛЕ`
    : `${zoomLevel}× · ${loupeShowsBefore ? 'ДО' : 'ПОСЛЕ'}`;

  return (
    <section id="gallery" className="workshop-atelier-slate seam-divider" style={{ overflowAnchor: 'none' }}>
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24" style={{ overflowAnchor: 'none' }}>
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-[#A2ABBC]">Живые примеры с верстака</p>
            <h2
              className="font-display mt-2.5 text-[clamp(1.65rem,2.9vw,2.6rem)] font-bold leading-[1.12] text-[#EEF1F6]"
              style={{ textWrap: 'balance' }}
            >
              Тяните шторку — предмет на фото совпадает до миллиметра
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-[#A2ABBC]">
              Один и тот же ракурс, масштаб и свет «До» и «После». Шторка ходит от края до края
              (3%–97%), а оптическая лупа 2.5× / 3.5× мгновенно приближает поры кожи, шов и даже
              саму линию стыка «До | После».
            </p>
          </div>
        </div>

        {/* Modernized Architectural Category Console */}
        <div
          role="tablist"
          aria-label="Фильтр примеров реставрации"
          className="mt-8 grid grid-cols-2 gap-2 rounded-xl border border-[rgba(220,227,239,0.14)] bg-[#0B0C10]/90 p-2 sm:grid-cols-4"
          style={{ overflowAnchor: 'none' }}
        >
          {FILTER_OPTIONS.map((option) => {
            const active = filter === option.id;
            const count = categoryCounts[option.id];
            return (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => handleCategoryChange(option.id)}
                className={`relative flex min-h-[46px] items-center justify-between gap-2 rounded-lg px-3.5 py-2.5 text-left text-xs font-semibold transition-colors sm:px-4 ${
                  active ? 'text-[#0B0C10]' : 'text-[#A2ABBC] hover:bg-[#151821] hover:text-[#EEF1F6]'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="gallery-cat-active"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    className="absolute inset-0 rounded-lg bg-gradient-to-b from-[#F4F7FC] to-[#C2CCE0] shadow-[0_6px_20px_rgba(220,227,239,0.16)]"
                  />
                )}
                <span className="relative z-10 truncate sm:hidden">{option.shortLabel}</span>
                <span className="relative z-10 hidden truncate sm:inline">{option.label}</span>
                <span
                  className={`relative z-10 font-mono-craft text-[11px] font-bold ${
                    active ? 'text-[#0B0C10]/75' : 'text-[#768095]'
                  }`}
                >
                  0{count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Interactive Case Workbench */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          {/* Left: Case Selector Cards */}
          <div className="flex flex-col gap-3 lg:col-span-4" style={{ overflowAnchor: 'none' }}>
            {visibleCases.map((entry) => {
              const selected = entry.id === activeCase.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => handleSelectCase(entry)}
                  aria-pressed={selected}
                  className={`group rounded-xl border p-4 text-left transition-all ${
                    selected
                      ? 'border-[#EEF1F6]/50 bg-[#1A1D26] shadow-[0_12px_32px_rgba(0,0,0,0.4)]'
                      : 'border-[rgba(220,227,239,0.12)] bg-[#13151B] hover:border-[rgba(220,227,239,0.3)] hover:bg-[#171A22]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span
                      className={`font-semibold ${
                        selected ? 'text-[#E85D2A]' : 'text-[#A2ABBC]'
                      }`}
                    >
                      {entry.categoryLabel}
                    </span>
                    <span className="font-mono-craft text-[#A2ABBC]">{entry.pricePaid}</span>
                  </div>

                  <p className="mt-2 text-sm font-bold leading-snug text-[#EEF1F6]">
                    {entry.title}
                  </p>

                  <p className="mt-1.5 font-mono-craft text-[11px] text-[#768095]">
                    {entry.daysSpent} · {entry.location}
                  </p>
                </button>
              );
            })}

            {/* Master Technical Note for Currently Selected Control Point */}
            <div className="chrome-surface rounded-xl p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono-craft text-[11px] font-semibold text-[#E85D2A]">
                  ЗОНА КОНТРОЛЯ · 0{activePointIdx + 1}
                </span>
                <span className="font-mono-craft text-[11px] text-[#768095]">
                  {loupeEnabled ? `Лупа ${zoomLevel}× активна` : 'Выберите точку справа'}
                </span>
              </div>
              <p className="mt-2 text-sm font-bold text-[#EEF1F6]">{activePoint.label}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-[#C6CEDB]">{activePoint.detail}</p>
            </div>
          </div>

          {/* Right: Exact 1:1 Photorealistic Before / After Stage */}
          <div className="chrome-surface rounded-xl p-4 sm:p-5 lg:col-span-8">
            {/* Top Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 text-xs">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span className="font-semibold text-[#EEF1F6]">{activeCase.title}</span>
                <span aria-hidden="true" className="text-[#E85D2A]">
                  ·
                </span>
                <span className="font-mono-craft text-[#A2ABBC]">{activeCase.year}</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {loupeEnabled && (
                  <div
                    role="group"
                    aria-label="Кратность лупы"
                    className="inline-flex rounded-md border border-[rgba(220,227,239,0.2)] bg-[#0B0C10] p-0.5"
                  >
                    {([2.5, 3.5] as LoupeZoom[]).map((z) => (
                      <button
                        key={z}
                        type="button"
                        aria-pressed={zoomLevel === z}
                        onClick={() => setZoomLevel(z)}
                        className={`min-h-[34px] rounded-xs px-2.5 font-mono-craft text-[11px] font-bold transition-colors ${
                          zoomLevel === z
                            ? 'bg-[#EEF1F6] text-[#0B0C10]'
                            : 'text-[#A2ABBC] hover:text-[#EEF1F6]'
                        }`}
                      >
                        {z}×
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  aria-pressed={loupeEnabled}
                  onClick={handleToggleLoupe}
                  className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    loupeEnabled
                      ? 'border-[#52E0A1] bg-[#52E0A1] text-[#0B0C10]'
                      : 'border-[rgba(220,227,239,0.24)] bg-[#0B0C10] text-[#EEF1F6] hover:border-[#EEF1F6]'
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  {loupeEnabled ? `Лупа ${zoomLevel}× вкл.` : 'Лупа мастера 2.5×'}
                </button>
              </div>
            </div>

            {/* 16:9 Exact-Geometry Comparison Frame */}
            <div
              ref={stageRef}
              data-testid="before-after-stage"
              onPointerMove={handleStagePointerMove}
              onPointerDown={handleStagePointerDown}
              onPointerLeave={handleStagePointerLeave}
              className={`relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-[rgba(220,227,239,0.18)] bg-[#090A0E] select-none ${
                loupeEnabled ? 'cursor-none touch-none' : 'cursor-ew-resize'
              }`}
              style={{ overflowAnchor: 'none' }}
            >
              {/* Shared Image Layer Container - ensures pixel-perfect alignment for both before/after */}
              <div className="absolute inset-0" style={{ overflowAnchor: 'none' }}>
                {/* AFTER Layer (Base — Restored) - rendered as background for perfect alignment */}
                {!failedImages[`after-${activeCase.id}`] ? (
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `url("${activeCase.afterImage}")`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                    }}
                    aria-hidden="true"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#181B22] p-6 text-xs text-[#A2ABBC]">
                    {activeCase.afterSummary}
                  </div>
                )}

                {/* BEFORE Layer (Clipped horizontally at exact split 3%..97%) - same background approach */}
                <div
                  aria-hidden="true"
                  style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
                  className="pointer-events-none absolute inset-0"
                >
                  {!failedImages[`before-${activeCase.id}`] ? (
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `url("${activeCase.beforeImage}")`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#1F1A18] p-6 text-xs text-[#A2ABBC]">
                      {activeCase.beforeSummary}
                    </div>
                  )}
                </div>
              </div>

              {/* Clean edge badges that fade smoothly when divider reaches 3% or 97% */}
              <span
                style={{ opacity: split > 14 ? 0.92 : 0 }}
                className="pointer-events-none absolute left-3 top-3 z-10 rounded-xs bg-[#0B0C10]/82 px-2.5 py-1 font-mono-craft text-[11px] font-semibold text-[#EEF1F6] transition-opacity duration-150"
              >
                ДО
              </span>
              <span
                style={{ opacity: split < 86 ? 0.92 : 0 }}
                className="pointer-events-none absolute right-3 top-3 z-10 rounded-xs bg-[#0B0C10]/82 px-2.5 py-1 font-mono-craft text-[11px] font-semibold text-[#52E0A1] transition-opacity duration-150"
              >
                ПОСЛЕ
              </span>

              {/* Brushed Chrome Vertical Divider Handle (travels 3%..97% so line always stays visible) */}
              <div
                aria-hidden="true"
                style={{ left: `${split}%` }}
                className="pointer-events-none absolute inset-y-0 z-20 w-[2px] -translate-x-1/2 bg-gradient-to-b from-[#EEF1F6] via-[#E85D2A] to-[#EEF1F6] shadow-[0_0_14px_rgba(0,0,0,0.9)]"
              >
                <div className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#0B0C10] bg-gradient-to-br from-[#FFFFFF] to-[#B3BDCE] text-[#0B0C10] shadow-[0_6px_22px_rgba(0,0,0,0.65)]">
                  <MoveHorizontal className="h-4 w-4 stroke-[2.2]" />
                </div>
              </div>

              {/* Subtle non-blocking focus crosshair indicator ONLY when loupe is parked on a chosen control zone */}
              {loupeEnabled && loupePos.locked && (
                <div
                  aria-hidden="true"
                  key={`${activeCase.id}-${activePointIdx}`}
                  style={{ left: `${activePoint.x}%`, top: `${activePoint.y}%` }}
                  className="loupe-reticle-lock pointer-events-none absolute z-20 h-9 w-9 rounded-full border border-[#52E0A1]/80"
                />
              )}

              {/* True 2.5× / 3.5× Zero-Lag Optical Glass Loupe (live magnified DOM layers, zero distortion!) */}
              {loupeEnabled && loupePos.visible && (
                <div
                  aria-hidden="true"
                  data-testid="master-loupe-lens"
                  data-zoom={zoomLevel}
                  style={{
                    left: `${loupePos.x}%`,
                    top: `${loupePos.y}%`,
                    width: `${lensDiameter}px`,
                    height: `${lensDiameter}px`,
                  }}
                  className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border-2 border-[#EEF1F6] bg-[#090A0E] shadow-[0_18px_46px_rgba(0,0,0,0.88),0_0_0_1px_rgba(11,12,16,0.9),inset_0_0_0_2px_rgba(11,12,16,0.75)]"
                >
                  {/* Exact-Scale Magnified Stage (width = stageWidth * zoom, height = stageHeight * zoom) */}
                  <div
                    data-testid="master-loupe-inner"
                    style={{
                      width: `${magnifiedWidth}px`,
                      height: `${magnifiedHeight}px`,
                      transform: `translate3d(${innerTranslateX}px, ${innerTranslateY}px, 0)`,
                      willChange: 'transform',
                    }}
                    className="relative"
                  >
                    {/* AFTER Layer (magnified) - using background-image for pixel-perfect alignment */}
                    {!failedImages[`after-${activeCase.id}`] && (
                      <div
                        className="absolute inset-0"
                        style={{
                          backgroundImage: `url("${activeCase.afterImage}")`,
                          backgroundSize: `${magnifiedWidth}px ${magnifiedHeight}px`,
                          backgroundPosition: '0 0',
                          backgroundRepeat: 'no-repeat',
                        }}
                        aria-hidden="true"
                      />
                    )}

                    {/* BEFORE Layer (magnified, clipped at split) - using background-image for pixel-perfect alignment */}
                    {!failedImages[`before-${activeCase.id}`] && (
                      <div
                        style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
                        className="absolute inset-0"
                      >
                        <div
                          style={{
                            backgroundImage: `url("${activeCase.beforeImage}")`,
                            backgroundSize: `${magnifiedWidth}px ${magnifiedHeight}px`,
                            backgroundPosition: '0 0',
                            backgroundRepeat: 'no-repeat',
                          }}
                          className="absolute inset-0"
                        />
                      </div>
                    )}

                    {/* Live magnified split hairline visible inside glass when hovering across divider */}
                    <span
                      style={{ left: `${split}%` }}
                      className="absolute inset-y-0 w-[2px] -translate-x-1/2 bg-gradient-to-b from-[#EEF1F6] via-[#E85D2A] to-[#EEF1F6]"
                    />
                  </div>

                  {/* Subtle optical glass dome specular highlight */}
                  <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.16),transparent_48%)]" />

                  {/* Fine optical crosshair */}
                  <span className="pointer-events-none absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-[#EEF1F6]/22" />
                  <span className="pointer-events-none absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 bg-[#EEF1F6]/22" />
                  <span className="pointer-events-none absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#52E0A1]/80" />

                  {/* Crisp magnification readout pill */}
                  <span className="pointer-events-none absolute bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xs border border-[rgba(220,227,239,0.22)] bg-[#0B0C10]/92 px-2 py-0.5 font-mono-craft text-[9px] font-bold text-[#EEF1F6] sm:text-[10px]">
                    {loupeReadoutText}
                  </span>
                </div>
              )}

              {/* Full-frame Accessible Range Overlay (active whenever loupe is off) */}
              {!loupeEnabled && (
                <input
                  type="range"
                  min={SLIDER_MIN}
                  max={SLIDER_MAX}
                  value={split}
                  onChange={(e) => setSplit(Number(e.target.value))}
                  aria-label="Переместить ползунок сравнения До и После (от 3 до 97 процентов)"
                  className="comparison-slider absolute inset-0 z-20 h-full w-full opacity-0"
                />
              )}
            </div>

            {/* External Macro Control Points Bar (completely outside photo — zero interference with loupe!) */}
            <div className="mt-4 rounded-lg border border-[rgba(220,227,239,0.12)] bg-[#0B0C10]/75 p-3" style={{ overflowAnchor: 'none' }}>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1.5 font-mono-craft font-medium text-[#A2ABBC]">
                  <Crosshair className="h-3.5 w-3.5 text-[#E85D2A]" aria-hidden="true" />
                  Точки контроля мастера (наводят лупу без помех на фото)
                </span>
                {loupeEnabled && (
                  <span className="font-mono-craft text-[#52E0A1]">
                    Водите по фото или двигайте ползунок ниже
                  </span>
                )}
              </div>

              <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {activeCase.loupePoints.map((pt, idx) => {
                  const isCurrent = idx === activePointIdx;
                  return (
                    <button
                      key={pt.label}
                      type="button"
                      data-testid="loupe-point-btn"
                      aria-pressed={isCurrent && loupeEnabled}
                      onClick={() => handleSelectFocusPoint(idx)}
                      className={`flex min-h-[44px] items-center gap-2 rounded-md border px-2.5 py-2 text-left text-[11.5px] font-semibold leading-snug transition-colors ${
                        isCurrent && loupeEnabled
                          ? 'border-[#52E0A1] bg-[#52E0A1]/14 text-[#EEF1F6]'
                          : isCurrent
                          ? 'border-[rgba(220,227,239,0.35)] bg-[#161922] text-[#EEF1F6]'
                          : 'border-[rgba(220,227,239,0.12)] bg-[#11131A] text-[#A2ABBC] hover:border-[rgba(220,227,239,0.3)] hover:text-[#EEF1F6]'
                      }`}
                    >
                      <span
                        className={`font-mono-craft text-[11px] font-bold shrink-0 ${
                          isCurrent && loupeEnabled ? 'text-[#52E0A1]' : 'text-[#E85D2A]'
                        }`}
                      >
                        0{idx + 1}
                      </span>
                      <span>{pt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Precision Slider Scrubber (3%..97%) + Quick Snap Presets — works smoothly even with loupe open! */}
            <div className="mt-4 flex flex-wrap items-center gap-3" style={{ overflowAnchor: 'none' }}>
              <button
                type="button"
                onClick={() => setSplit(SLIDER_MIN)}
                className={`min-h-[34px] rounded-md border px-2.5 font-mono-craft text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  split <= 6
                    ? 'border-[#52E0A1] bg-[#52E0A1]/15 text-[#52E0A1]'
                    : 'border-[rgba(220,227,239,0.16)] bg-[#0B0C10] text-[#A2ABBC] hover:text-[#EEF1F6]'
                }`}
              >
                После (3%)
              </button>

              <input
                type="range"
                min={SLIDER_MIN}
                max={SLIDER_MAX}
                value={split}
                onChange={(e) => setSplit(Number(e.target.value))}
                aria-label="Шкала ползунка До и После"
                className="h-1.5 min-w-[120px] flex-1 accent-[#E85D2A] cursor-pointer"
              />

              <button
                type="button"
                onClick={() => setSplit(SLIDER_MAX)}
                className={`min-h-[34px] rounded-md border px-2.5 font-mono-craft text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  split >= 94
                    ? 'border-[#E85D2A] bg-[#E85D2A]/15 text-[#E85D2A]'
                    : 'border-[rgba(220,227,239,0.16)] bg-[#0B0C10] text-[#A2ABBC] hover:text-[#EEF1F6]'
                }`}
              >
                До (97%)
              </button>

              <span
                data-testid="gallery-split-readout"
                className="font-mono-craft text-xs font-semibold text-[#DCE3EF]"
              >
                {split}%
              </span>
            </div>

            {/* Case Before / After Breakdown + Direct Estimate Bridge */}
            <div style={{ overflowAnchor: 'none' }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeCase.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22 }}
                  className="mt-5 border-t border-[rgba(220,227,239,0.12)] pt-4"
                  style={{ overflowAnchor: 'none' }}
                >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold text-[#E85D2A]">{activeCase.beforeTitle}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#C6CEDB]">
                      {activeCase.beforeSummary}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#52E0A1]">{activeCase.afterTitle}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#C6CEDB]">
                      {activeCase.afterSummary}
                    </p>
                  </div>
                </div>

                {onSelectCasePreset && activePreset && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(220,227,239,0.08)] pt-3.5 text-xs">
                    <span className="font-mono-craft text-[11px] text-[#A2ABBC]">
                      Итоговый чек по кейсу: <strong className="text-[#EEF1F6]">{activeCase.pricePaid}</strong> ·{' '}
                      {activeCase.daysSpent}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onSelectCasePreset(
                          activePreset.label,
                          activePreset.item,
                          activePreset.repairs
                        )
                      }
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-[rgba(220,227,239,0.22)] bg-[#0B0C10] px-3 py-1.5 text-xs font-semibold text-[#EEF1F6] transition-colors hover:border-[#E85D2A] hover:text-[#E85D2A] whitespace-nowrap"
                    >
                      <Calculator className="h-3.5 w-3.5 text-[#E85D2A]" aria-hidden="true" />
                      Прикинуть похожий ремонт
                    </button>
                  </div>
                )}
              </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
