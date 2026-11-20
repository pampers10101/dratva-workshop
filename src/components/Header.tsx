import { Menu, Phone, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

const NAV_ITEMS = [
  { href: '#services', id: 'services', label: 'Услуги' },
  { href: '#gallery', id: 'gallery', label: 'До / После' },
  { href: '#workbench-game', id: 'workbench-game', label: 'Игра −15%' },
  { href: '#estimator', id: 'estimator', label: 'Расчёт' },
  { href: '#craft-lounge', id: 'craft-lounge', label: 'Шпаргалка' },
  { href: '#reviews', id: 'reviews', label: 'Отзывы' },
];

const TRACKED_SECTION_IDS = [
  'services',
  'gallery',
  'workbench-game',
  'estimator',
  'craft-lounge',
  'reviews',
  'intake',
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string>('');
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let rafId = 0;
    let lastKnownSection = '';

    const updateOnScroll = () => {
      rafId = 0;
      const el = progressBarRef.current;
      if (el) {
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const ratio = docHeight > 0 ? Math.max(0, Math.min(1, window.scrollY / docHeight)) : 0;
        el.style.transform = `scaleX(${ratio})`;
      }

      // Crisp deterministic scroll-spy without layout thrashing
      const triggerY = window.innerHeight * 0.34;
      let current = '';
      for (const id of TRACKED_SECTION_IDS) {
        const sectionEl = document.getElementById(id);
        if (!sectionEl) continue;
        const rect = sectionEl.getBoundingClientRect();
        if (rect.top <= triggerY && rect.bottom > 96) {
          current = id;
        }
      }
      // Only update React state when section actually changes - prevents scroll-frame re-renders
      if (current !== lastKnownSection) {
        lastKnownSection = current;
        setActiveSectionId(current);
      }
    };

    const onScroll = () => {
      if (!rafId) rafId = window.requestAnimationFrame(updateOnScroll);
    };

    updateOnScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const intakeActive = activeSectionId === 'intake';

  return (
    <header className="sticky top-0 z-40 border-b border-[rgba(220,227,239,0.12)] bg-[#0B0C10]/92 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a
          href="#top"
          className="font-display chrome-metallic-text text-lg font-extrabold tracking-[0.04em] whitespace-nowrap shrink-0 sm:text-xl"
        >
          ДРАТВА
        </a>

        <nav
          aria-label="Основная навигация"
          className="hidden md:flex items-center gap-3.5 lg:gap-5 text-[13px] lg:text-sm font-medium text-[#A2ABBC]"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeSectionId === item.id;
            return (
              <a
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'location' : undefined}
                className={`nav-chrome-link py-1 transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'is-active font-semibold text-[#EEF1F6]'
                    : 'text-[#A2ABBC] hover:text-[#EEF1F6]'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5 shrink-0">
          <a
            href="#intake"
            aria-current={intakeActive ? 'location' : undefined}
            className={`chrome-sheen hidden sm:inline-flex items-center justify-center rounded-md px-3.5 lg:px-4 py-2 text-xs font-bold tracking-wide transition-all whitespace-nowrap shrink-0 ${
              intakeActive
                ? 'bg-[#EEF1F6] text-[#0B0C10] ring-1 ring-[#E85D2A]'
                : 'bg-[#E85D2A] text-[#0B0C10] hover:bg-[#FF713D]'
            }`}
          >
            Приёмка и заявка
          </a>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-workshop-nav"
            aria-label={mobileOpen ? 'Закрыть меню навигации' : 'Открыть меню навигации'}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-[rgba(220,227,239,0.2)] bg-[#13151B] text-[#EEF1F6] md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Zero-re-render brushed metallic scroll progress hairline */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[1.5px] bg-transparent"
      >
        <div
          ref={progressBarRef}
          style={{ transform: 'scaleX(0)', transformOrigin: 'left center' }}
          className="h-full w-full bg-gradient-to-r from-[#E85D2A] via-[#DCE3EF] to-[#52E0A1]"
        />
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            id="mobile-workshop-nav"
            aria-label="Мобильная навигация"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="border-t border-[rgba(220,227,239,0.12)] bg-[#0B0C10]/98 px-4 py-4 shadow-[0_24px_48px_rgba(0,0,0,0.75)] md:hidden"
          >
            <div className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const isActive = activeSectionId === item.id;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex min-h-[44px] items-center justify-between border-b border-[rgba(220,227,239,0.08)] text-base font-medium ${
                      isActive ? 'text-[#E85D2A]' : 'text-[#EEF1F6]'
                    }`}
                  >
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="font-mono-craft text-[11px] text-[#E85D2A]">здесь</span>
                    )}
                  </a>
                );
              })}
              <a
                href="#intake"
                onClick={() => setMobileOpen(false)}
                className="mt-3 inline-flex min-h-[46px] items-center justify-center rounded-md bg-[#E85D2A] px-4 py-2.5 text-sm font-bold text-[#0B0C10]"
              >
                Приёмка в работу и статус
              </a>

              <div className="mt-3 flex items-center justify-between border-t border-[rgba(220,227,239,0.08)] pt-3 text-xs text-[#A2ABBC]">
                <span>ул. Революционная, 70</span>
                <a
                  href="tel:+79608115424"
                  className="inline-flex items-center gap-1.5 font-mono-craft font-semibold text-[#EEF1F6]"
                >
                  <Phone className="h-3.5 w-3.5 text-[#E85D2A]" aria-hidden="true" />
                  +7 (960) 811-54-24
                </a>
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
