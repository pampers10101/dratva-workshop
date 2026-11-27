import { ArrowDownRight, Gamepad2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import {
  HERO_HOTSPOTS,
  HERO_STUDIO_PRESETS,
  MARQUEE_SPECS,
  STUDIO_MEDIA,
} from '../data/workshop';
import { ChromeTiltCard } from './ChromeTiltCard';

const HEADLINE_WORDS = [
  'Чиним',
  'кожу',
  'так,',
  'чтобы',
  'она',
  'пережила',
  'ещё',
  'десять',
  'зим',
];

export function HeroWorkbench() {
  const [presetId, setPresetId] = useState<(typeof HERO_STUDIO_PRESETS)[number]['id']>('chrome');
  const [activeSpotIndex, setActiveSpotIndex] = useState(0);
  const [imgFailed, setImgFailed] = useState(false);

  const activePreset =
    HERO_STUDIO_PRESETS.find((entry) => entry.id === presetId) ?? HERO_STUDIO_PRESETS[0];
  const activeSpot = HERO_HOTSPOTS[activeSpotIndex] ?? HERO_HOTSPOTS[0];

  const handlePresetChange = (id: (typeof HERO_STUDIO_PRESETS)[number]['id'], spotIdx: number) => {
    setPresetId(id);
    setActiveSpotIndex(spotIdx);
  };

  // Map hotspot index → preset id so clicking image hotspots also switches the bottom tabs
  const HOTSPOT_TO_PRESET: Record<number, (typeof HERO_STUDIO_PRESETS)[number]['id']> = {
    0: 'chrome',
    1: 'aniline',
    2: 'wax',
  };

  const handleSpotClick = (idx: number) => {
    const presetIdForSpot = HOTSPOT_TO_PRESET[idx];
    if (presetIdForSpot) {
      handlePresetChange(presetIdForSpot, idx);
    } else {
      setActiveSpotIndex(idx);
    }
  };

  return (
    <section
      id="top"
      className="workshop-atelier-dark seam-divider"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,rgba(220,227,239,0.095),transparent_70%)]"
      />

      <div className="relative mx-auto max-w-6xl px-4 pb-9 pt-7 sm:px-6 sm:pt-9 lg:px-8 lg:pb-11 lg:pt-10">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-10">
          {/* Left Neo-Y2K Craft Statement */}
          <div className="flex flex-col lg:col-span-6">
            <div>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-[#A2ABBC]">
                <span>Самара</span>
                <span aria-hidden="true" className="text-[#E85D2A]">
                  ·
                </span>
                <span>ул. Революционная, 70</span>
                <span aria-hidden="true" className="text-[#E85D2A]">
                  ·
                </span>
                <span className="font-mono-craft text-[#DCE3EF]">с 2015 года</span>
              </div>

              <h1
                className="font-display mt-3.5 text-[clamp(1.78rem,2.95vw,2.65rem)] font-extrabold leading-[1.12] tracking-[-0.02em] text-[#EEF1F6]"
                style={{ textWrap: 'balance' }}
              >
                {HEADLINE_WORDS.map((word, index) => {
                  const isMetallic = index >= 5;
                  return (
                    <span key={`${word}-${index}`} className="hero-word-mask mr-[0.26em]">
                      <span
                        className={`hero-word ${isMetallic ? 'chrome-metallic-text' : ''}`}
                        style={{ ['--word-delay' as string]: `${index * 45}ms` }}
                      >
                        {word}
                      </span>
                    </span>
                  );
                })}
              </h1>

              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.55, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
                style={{ transformOrigin: 'left center' }}
                className="mt-4 flex items-center gap-2"
                aria-hidden="true"
              >
                <span className="h-[2px] w-24 bg-[#E85D2A]" />
                <span className="h-[1px] w-32 bg-gradient-to-r from-[#DCE3EF]/70 to-transparent" />
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.22 }}
                className="mt-4 max-w-xl text-sm leading-[1.68] text-[#C6CEDB] sm:text-[15.5px]"
              >
                Я Алексей. Одиннадцать лет восстанавливаю в Самаре кожаные сумки, портфели,
                куртки и рантовую обувь. Без пластиковой краски, которая трескается за сезон —
                ручной седельный шов, хром-фурнитура YKK Excella и честная оценка до оплаты.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.32 }}
                className="mt-6 flex flex-wrap items-center gap-3.5"
              >
                <a
                  href="#estimator"
                  className="chrome-sheen inline-flex min-h-[46px] items-center gap-2 rounded-md bg-[#E85D2A] px-6 py-2.5 text-sm font-bold text-[#0B0C10] transition-colors hover:bg-[#FF713D] whitespace-nowrap shrink-0"
                >
                  Прикинуть стоимость
                  <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
                </a>

                <a
                  href="#workbench-game"
                  className="chrome-sheen inline-flex min-h-[46px] items-center gap-2 rounded-md border border-[rgba(220,227,239,0.22)] bg-[#13151B] px-5 py-2.5 text-sm font-semibold text-[#EEF1F6] transition-colors hover:border-[#DCE3EF] hover:bg-[#1A1D26] whitespace-nowrap shrink-0"
                >
                  <Gamepad2 className="h-4 w-4 text-[#E85D2A]" aria-hidden="true" />
                  Играть и забрать до −15%
                </a>
              </motion.div>
            </div>

            <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-[rgba(220,227,239,0.12)] pt-4">
              <p className="max-w-xs text-xs leading-relaxed text-[#A2ABBC] sm:text-sm">
                «Если вещь дешевле выкинуть, чем чинить — скажу об этом прямо на осмотре, денег за
                совет не беру.»
              </p>

              <div className="flex flex-col items-end">
                <svg
                  width="124"
                  height="36"
                  viewBox="0 0 124 36"
                  fill="none"
                  aria-label="Подпись мастера Алексея"
                >
                  <path
                    d="M6 29C14 13 21 5 24 5C27 5 22 26 29 25C36 24 42 12 48 14C53 16 48 25 55 24C62 23 69 11 76 15C81 18 79 25 87 22C95 19 106 13 118 12"
                    stroke="#DCE3EF"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M14 21C29 19 55 17 89 18"
                    stroke="#E85D2A"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="font-mono-craft text-[11px] text-[#A2ABBC]">
                  Алексей К. · мастер
                </span>
              </div>
            </div>
          </div>

          {/* Right 3D Photorealistic Studio Showcase */}
          <div className="relative lg:col-span-6">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-2 rounded-3xl bg-[radial-gradient(circle_at_55%_45%,rgba(232,93,42,0.12),rgba(220,227,239,0.05)_46%,transparent_74%)] blur-2xl sm:-inset-6"
            />
            <ChromeTiltCard
              testId="hero-workbench"
              glintColor={activePreset.sheenTint}
              maxTilt={4.5}
              className="chrome-surface chrome-surface-interactive relative rounded-xl p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 text-xs">
                <span className="font-semibold text-[#EEF1F6]">
                  Макро-стенд: кожа, хром и шов
                </span>
                <span className="font-mono-craft text-[#A2ABBC]">{activePreset.specLabel}</span>
              </div>

              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-[rgba(220,227,239,0.18)] bg-[#111319]">
                {!imgFailed ? (
                  <img
                    src={STUDIO_MEDIA.heroShowcase}
                    alt="Макро-фото кожаного портфеля с массивным матовым хром-карабином, вощёной дратвой и стальным шорным шилом на верстаке"
                    referrerPolicy="no-referrer"
                    onError={() => setImgFailed(true)}
                    style={{ filter: activePreset.filterCss }}
                    className="h-full w-full object-cover transition-[filter,transform] duration-500"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1B1E26] to-[#0B0C10] p-6 text-center text-sm text-[#A2ABBC]">
                    Кожаный портфель, хром-карабин и вощёная дратва на верстаке
                  </div>
                )}

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#0B0C10]/95 via-[#0B0C10]/55 to-transparent"
                />

                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-3 h-3 w-3 border-l border-t border-[#DCE3EF]/70"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-3 h-3 w-3 border-r border-t border-[#DCE3EF]/70"
                />

                {HERO_HOTSPOTS.map((spot, idx) => {
                  const selected = idx === activeSpotIndex;
                  return (
                    <button
                      key={spot.id}
                      type="button"
                      onClick={() => handleSpotClick(idx)}
                      aria-label={`Осмотреть узел: ${spot.title}`}
                      aria-pressed={selected}
                      style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                      className={`absolute z-20 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 font-mono-craft text-xs font-bold transition-transform duration-200 ${
                        selected
                          ? 'scale-110 border-[#EEF1F6] bg-[#E85D2A] text-[#0B0C10] shadow-[0_0_24px_rgba(232,93,42,0.5)]'
                          : 'border-[#DCE3EF] bg-[#0B0C10]/80 text-[#EEF1F6] hover:scale-105'
                      }`}
                    >
                      0{idx + 1}
                    </button>
                  );
                })}

                <div className="absolute inset-x-3 bottom-3 z-20">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeSpot.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2 }}
                      className="rounded-md border border-[rgba(220,227,239,0.2)] bg-[#0B0C10]/88 px-3.5 py-2.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-[#EEF1F6]">
                          {activeSpot.title}
                        </span>
                        <span className="font-mono-craft text-[11px] font-medium text-[#E85D2A]">
                          {activeSpot.metric}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-[#C6CEDB]">
                        {activeSpot.detail}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              <div className="mt-4">
                <div
                  role="tablist"
                  aria-label="Режим осмотра отделки"
                  className="grid grid-cols-3 gap-1.5 rounded-lg border border-[rgba(220,227,239,0.12)] bg-[#0B0C10]/70 p-1"
                >
                  {HERO_STUDIO_PRESETS.map((preset) => {
                    const active = preset.id === presetId;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => handlePresetChange(preset.id, preset.hotspotIndex)}
                        className={`relative min-h-[40px] rounded-md px-2.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap truncate ${
                          active ? 'text-[#0B0C10]' : 'text-[#A2ABBC] hover:text-[#EEF1F6]'
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="hero-preset-pill"
                            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                            className="absolute inset-0 rounded-md bg-gradient-to-b from-[#EEF1F6] to-[#BAC4D6]"
                          />
                        )}
                        <span className="relative z-10">{preset.label}</span>
                      </button>
                    );
                  })}
                </div>

                <p className="mt-3 text-xs leading-relaxed text-[#A2ABBC]">
                  {activePreset.caption}
                </p>
              </div>
            </ChromeTiltCard>
          </div>
        </div>
      </div>

      {/* Neo-Y2K Kinetic Craft Marquee Strip */}
      <div
        aria-hidden="true"
        className="marquee-shell overflow-hidden border-t border-[rgba(220,227,239,0.12)] bg-[#13151B] py-3"
      >
        <div className="marquee-track flex items-center gap-8 font-mono-craft text-xs text-[#A2ABBC]">
          {[...MARQUEE_SPECS, ...MARQUEE_SPECS].map((spec, idx) => (
            <span key={`${spec}-${idx}`} className="flex items-center gap-8 whitespace-nowrap">
              <span className={idx % 3 === 0 ? 'text-[#EEF1F6]' : 'text-[#A2ABBC]'}>{spec}</span>
              <span className="text-[#E85D2A]">✦</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
