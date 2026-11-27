import { type ReactNode, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRevealOnScroll, usePrefersReducedMotion } from '../hooks/useWorkshopMotion';

/**
 * Mounts its children only once they enter the viewport (rootMargin -10% gives
 * a 10% lead so the canvas initialises before the user reaches it). While the
 * section is off-screen it renders a chrome placeholder of matching height so
 * layout never shifts and the page stays responsive.
 */
export function LazySection({
  children,
  heightClass = 'min-h-[40vh]',
  fallback = null,
}: {
  children: ReactNode;
  heightClass?: string;
  fallback?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const { ref, visible } = useRevealOnScroll<HTMLDivElement>();
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (visible && !mounted) {
      setMounted(true);
    }
  }, [visible, mounted]);

  return (
    <div ref={ref} className={mounted ? '' : heightClass}>
      <AnimatePresence mode="wait">
        {mounted ? (
          <motion.div
            key="content"
            initial={reduced ? { opacity: 1 } : { opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.215, 0.61, 0.355, 1] }}
          >
            {children}
          </motion.div>
        ) : (
          <div key="fallback" aria-busy="true">
            {fallback}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}