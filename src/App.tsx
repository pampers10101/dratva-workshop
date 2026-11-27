import { ArrowDownRight, CheckCircle2, Lock, Settings, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Routes, Route } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { AboutStory } from './components/AboutStory';
import { AdminPage } from './components/AdminPage';
import { CraftLoungeSection, type CraftLoungeTab } from './components/CraftLoungeSection';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { HeroWorkbench } from './components/HeroWorkbench';
import { PriceEstimator } from './components/PriceEstimator';
import { RestorationGallery } from './components/RestorationGallery';
import { RestorationMiniGame } from './components/RestorationMiniGame';
import { ScrollSeamRail } from './components/ScrollSeamRail';
import { ServicesSection } from './components/ServicesSection';
import { TestimonialsAndIntake } from './components/TestimonialsAndIntake';
import { AuthProvider } from './context/AuthContext';
import { StructuredData } from './components/StructuredData';
import {
  calculateEstimate,
  formatRubles,
  parsePromoDiscountPercent,
  type EstimateResult,
  type LeatherItemId,
  type RepairOperationId,
} from './utils/estimator';
import type { WorkbenchOutcome } from './utils/workbenchGame';
import { WORKSHOP_THEME_SCHEMES, applyThemeScheme, type ThemeScheme } from './utils/themes';

interface ServiceToastState {
  id: number;
  message: string;
  subline: string;
  added: boolean;
}

const STORAGE_KEY_BEST_PROMO = 'dratva_best_promo_v2';

function loadBestPromo(): { pct: number; code: string | null } {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_BEST_PROMO);
    if (!raw) return { pct: 0, code: null };
    const pct = parsePromoDiscountPercent(raw);
    return pct > 0 ? { pct, code: `DRATVA-${pct}` } : { pct: 0, code: null };
  } catch {
    return { pct: 0, code: null };
  }
}

/**
 * Smooth anchor scroll via delegated click handler.
 * Native scroll-behavior:smooth is intentionally NOT set in CSS — it fights with
 * scroll-spy, progress bar updates and animated card re-renders.
 * Here we manually animate scroll to target element using requestAnimationFrame
 * so the transition is buttery and never triggers a layout-jump re-render.
 */
function useSmoothAnchorScroll() {
  useEffect(() => {
    const handleAnchorClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || !target.closest) return;
      const anchor = target.closest('a[href^="#"]') as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute('href') || '';
      const id = href.slice(1);
      if (!id) return;

      // ALWAYS prevent default to avoid browser hard navigation / teleport / page reload
      event.preventDefault();
      event.stopPropagation();

      const element = document.getElementById(id);
      if (!element) {
        // Fallback: if element not yet in DOM (e.g. lazy section), try to find a
        // data-lazy-id marker, or estimate position by section order. As a last resort,
        // just scroll to the bottom so user lands near expected area.
        // We also trigger a re-query after a short delay in case lazy mount is pending.
        const lazyMarker = document.querySelector(`[data-lazy-id="${id}"]`);
        if (lazyMarker) {
          lazyMarker.scrollIntoView({ behavior: 'smooth' });
        } else {
          // As a robust fallback, scroll to bottom — most anchor targets are near end
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }
        return;
      }

      const startY = window.scrollY;
      const targetY = element.getBoundingClientRect().top + startY;
      const distance = targetY - startY;
      const duration = 780;
      let start: number | null = null;

      const tick = (now: number) => {
        if (start === null) start = now;
        const elapsed = now - start;
        const progress = Math.min(1, elapsed / duration);
        // easeInOutCubic
        const eased =
          progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        window.scrollTo(0, startY + distance * eased);
        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          window.scrollTo(0, targetY);
          // Update URL hash without jumping
          if (history.replaceState) {
            history.replaceState(null, '', `#${id}`);
          }
        }
      };

      requestAnimationFrame(tick);
    };

    document.addEventListener('click', handleAnchorClick, { capture: true });
    return () => document.removeEventListener('click', handleAnchorClick, { capture: true });
  }, []);
}

export default function App() {
  useSmoothAnchorScroll();

  // Apply the saved colour scheme from the admin panel to the main site on mount.
  // AdminPage persists the chosen theme id in localStorage and applies it only
  // to its own route; the main site must read the same key so the design
  // changes are visible everywhere, not just on /admin.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    try {
      const savedTheme = window.localStorage.getItem('dratva_admin_theme');
      const scheme = savedTheme
        ? WORKSHOP_THEME_SCHEMES.find((s) => s.id === savedTheme)
        : null;
      if (scheme) {
        applyThemeScheme(scheme);
      }
    } catch {
      // localStorage may be unavailable — fall back to default theme
    }
  }, []);

  const [itemType, setItemType] = useState<LeatherItemId>('briefcase');
  const [repairIds, setRepairIds] = useState<RepairOperationId[]>(['scuffs_dye', 'edge_handles']);
  const [activeServiceIndexes, setActiveServiceIndexes] = useState<number[]>([0]); // Track which services are explicitly toggled on
  const [urgent, setUrgent] = useState<boolean>(false);
  const [bestPromo, setBestPromo] = useState<{ pct: number; code: string | null }>(() =>
    typeof window !== 'undefined' ? loadBestPromo() : { pct: 0, code: null }
  );
  const [promoCode, setPromoCode] = useState<string>('');
  const [loungeTab, setLoungeTab] = useState<CraftLoungeTab>('emergency');
  const [adminOpen, setAdminOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<ServiceToastState | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showNotice = (message: string, subline: string, added: boolean) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast({ id: Date.now(), message, subline, added });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 5200);
  };

  const handleToggleRepair = (id: RepairOperationId) => {
    setRepairIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  /**
   * Adds or removes a service's operations in place WITHOUT scrolling the user away.
   * Displays a crisp non-intrusive toast with an optional click-only jump to #estimator.
   */
  const handleToggleServicePreset = (
    serviceTitle: string,
    nextItem: LeatherItemId,
    presetRepairs: RepairOperationId[],
    serviceIndex: number
  ) => {
    const isServiceActive = activeServiceIndexes.includes(serviceIndex);
    const SERVICE_PRESETS_LOCAL: Array<{ item: LeatherItemId; repairs: RepairOperationId[] }> = [
      { item: 'briefcase', repairs: ['scuffs_dye', 'edge_handles'] },
      { item: 'jacket', repairs: ['crack_patch', 'scuffs_dye'] },
      { item: 'bag', repairs: ['zipper'] },
      { item: 'briefcase', repairs: ['edge_handles'] },
      { item: 'boots', repairs: ['salt_wax'] },
    ];

    if (isServiceActive) {
      // Remove this service's repairs, but keep repairs from other active services
      setActiveServiceIndexes((prev) => prev.filter((idx) => idx !== serviceIndex));
      const otherActiveIndexes = activeServiceIndexes.filter((idx) => idx !== serviceIndex);
      const mergedRepairs = otherActiveIndexes.reduce(
        (acc, idx) => [...acc, ...SERVICE_PRESETS_LOCAL[idx].repairs],
        [] as RepairOperationId[]
      );
      const uniqueRepairs = Array.from(new Set(mergedRepairs));
      setRepairIds(uniqueRepairs);
      // Update itemType to match the last active service, or default
      if (otherActiveIndexes.length > 0) {
        const lastActiveIndex = otherActiveIndexes[otherActiveIndexes.length - 1];
        setItemType(SERVICE_PRESETS_LOCAL[lastActiveIndex].item);
      }
      showNotice(
        `Убрано из перечня: ${serviceTitle}`,
        uniqueRepairs.length > 0
          ? `В расчёте осталось этапов: ${uniqueRepairs.length}`
          : 'Перечень расчёта пуст — выберите нужные работы',
        false
      );
    } else {
      // Add this service
      setActiveServiceIndexes((prev) => [...prev, serviceIndex]);
      const merged = Array.from(new Set([...repairIds, ...presetRepairs]));
      setItemType(nextItem);
      setRepairIds(merged);
      showNotice(
        `Добавлено в перечень: ${serviceTitle}`,
        `Выбрано этапов в расчёте: ${merged.length}`,
        true
      );
    }
  };

  const handleAddEmergencyRepair = (
    label: string,
    item: LeatherItemId,
    repair: RepairOperationId
  ) => {
    const merged = Array.from(new Set([...repairIds, repair]));
    setItemType(item);
    setRepairIds(merged);
    showNotice(
      `Добавлено в перечень по ситуации «${label}»`,
      `Выбрано этапов в расчёте: ${merged.length}`,
      true
    );
  };

  const handleSelectGalleryPreset = (
    label: string,
    item: LeatherItemId,
    repairs: RepairOperationId[]
  ) => {
    setItemType(item);
    setRepairIds(repairs);
    showNotice(
      `Подставили кейс: ${label}`,
      `В расчёте выбрано этапов: ${repairs.length}`,
      true
    );
  };

  const liveEstimate = calculateEstimate({
    itemType,
    repairIds,
    urgent,
    promoCode,
  });
  const liveEstimateLabel = liveEstimate.isEmpty
    ? null
    : `от ${formatRubles(liveEstimate.minPrice)}`;

  const handleRecordGameResult = (outcome: WorkbenchOutcome) => {
    setBestPromo((prev) => {
      if (outcome.discountPct >= prev.pct) {
        try {
          window.localStorage.setItem(STORAGE_KEY_BEST_PROMO, outcome.promoCode);
        } catch {
          // ignore storage quota errors
        }
        return { pct: outcome.discountPct, code: outcome.promoCode };
      }
      return prev;
    });

    // Upgrade active promo automatically if newly earned discount beats current input
    setPromoCode((prev) => {
      const currentPct = parsePromoDiscountPercent(prev);
      return outcome.discountPct >= currentPct ? outcome.promoCode : prev;
    });
  };

  const handleApplyPromoToCalculator = (code: string) => {
    setPromoCode(code);
    // No scrollIntoView - prevents page jump on promo apply
  };

  const handleTransferToIntake = (_estimate: EstimateResult) => {
    // No scrollIntoView - prevents page jump on transfer
    // User can navigate via the toast "К расчёту" link or scroll naturally
  };

  const handleOpenCraftQuiz = () => {
    setLoungeTab('quiz');
    // No scrollIntoView - prevents page jump on tab switch
    // The tab content animates in place via Framer Motion
  };

  // JSX-разметка главной страницы собирается инлайн (НЕ как вложенный компонент),
  // иначе при каждом изменении state React перемонтировал бы всю страницу целиком.
  const mainContent = (
    <>
      <StructuredData />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-[#EEF1F6] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#0B0C10]"
      >
        Перейти к основному содержанию
      </a>

      <Header />
      <ScrollSeamRail />

      <main id="main-content">
        <HeroWorkbench />
        <AboutStory />
        <ServicesSection
          selectedRepairs={repairIds}
          activeServiceIndexes={activeServiceIndexes}
          liveEstimateLabel={liveEstimateLabel}
          onToggleServicePreset={handleToggleServicePreset}
        />
        <RestorationGallery onSelectCasePreset={handleSelectGalleryPreset} />
        {/* RestorationMiniGame and CraftLoungeSection are NO LONGER wrapped in LazySection.
            Their section IDs (workbench-game, craft-lounge) must ALWAYS be in the DOM
            so anchor links (#workbench-game, #craft-lounge) from Header, Hero, PriceEstimator,
            TestimonialsAndIntake, Footer, etc. work instantly without teleporting or
            opening as separate links. */}
        <RestorationMiniGame
          bestDiscountPct={bestPromo.pct}
          bestPromoCode={bestPromo.code}
          onRecordResult={handleRecordGameResult}
          onApplyPromoToCalculator={handleApplyPromoToCalculator}
        />
        <PriceEstimator
          itemType={itemType}
          repairIds={repairIds}
          urgent={urgent}
          promoCode={promoCode}
          bestPromoCode={bestPromo.code}
          bestDiscountPct={bestPromo.pct}
          onItemChange={setItemType}
          onToggleRepair={handleToggleRepair}
          onUrgentChange={setUrgent}
          onPromoCodeChange={setPromoCode}
          onTransferToIntake={handleTransferToIntake}
        />
        <CraftLoungeSection
          activeTab={loungeTab}
          onTabChange={setLoungeTab}
          onAddEmergencyRepair={handleAddEmergencyRepair}
        />
        <TestimonialsAndIntake
            itemType={itemType}
            repairIds={repairIds}
            urgent={urgent}
            promoCode={promoCode}
            bestDiscountPct={bestPromo.pct}
            onItemChange={setItemType}
            onToggleRepair={handleToggleRepair}
            onUrgentChange={setUrgent}
            onOpenCraftQuiz={handleOpenCraftQuiz}
          />
      </main>

      <Footer />

      {/* Non-Intrusive Workshop Action Toast (Never hijacks scroll position) */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            role="status"
            aria-live="polite"
            data-testid="service-added-toast"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl border border-[rgba(220,227,239,0.28)] bg-[#13161E]/96 px-4 py-3 shadow-[0_18px_46px_rgba(0,0,0,0.65)] sm:left-auto sm:right-6 sm:mx-0"
          >
            <div className="flex min-w-0 items-start gap-2.5">
              <CheckCircle2
                className={`mt-0.5 h-4 w-4 shrink-0 ${
                  toast.added ? 'text-[#52E0A1]' : 'text-[#A2ABBC]'
                }`}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-[#EEF1F6]">{toast.message}</p>
                <p className="mt-0.5 font-mono-craft text-[11px] text-[#A2ABBC]">
                  {toast.subline}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <a
                href="#estimator"
                onClick={() => setToast(null)}
                className="inline-flex min-h-[34px] items-center gap-1 rounded-md bg-[#E85D2A] px-2.5 py-1 text-[11px] font-bold text-[#0B0C10] hover:bg-[#FF713D] whitespace-nowrap"
              >
                <span>К расчёту</span>
                <ArrowDownRight className="h-3 w-3" aria-hidden="true" />
              </a>
              <button
                type="button"
                onClick={() => setToast(null)}
                aria-label="Скрыть уведомление"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[rgba(220,227,239,0.18)] bg-[#0B0C10] text-[#A2ABBC] hover:text-[#EEF1F6]"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#0B0C10] text-[#EEF1F6] antialiased selection:bg-[#E85D2A] selection:text-[#0B0C10]">
        <Routes>
          <Route path="/" element={mainContent} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}
