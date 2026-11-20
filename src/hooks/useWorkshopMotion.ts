import { useEffect, useRef, useState } from 'react';

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const handler = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener('change', handler);
    return () => query.removeEventListener('change', handler);
  }, []);

  return reduced;
}

export function useScrollProgress(): number {
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const reduced = usePrefersReducedMotion();
  const lastUpdateRef = useRef(0);
  const UPDATE_THROTTLE_MS = 33; // ~30fps max - prevents scroll-frame re-renders

  useEffect(() => {
    if (reduced) {
      setProgress(1);
      return;
    }

    let rafId = 0;
    const update = () => {
      rafId = 0;
      const scrollTop = window.scrollY;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const newProgress = Math.min(1, Math.max(0, scrollTop / maxScroll));

      // Throttle React state updates to max ~30fps to prevent layout thrashing
      const now = performance.now();
      if (now - lastUpdateRef.current >= UPDATE_THROTTLE_MS) {
        lastUpdateRef.current = now;
        progressRef.current = newProgress;
        setProgress(newProgress);
      } else {
        // Update ref but defer state update
        progressRef.current = newProgress;
        rafId = window.requestAnimationFrame(update);
      }
    };

    const onScroll = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [reduced]);

  return progress;
}

export function useRevealOnScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) {
      setVisible(true);
      return;
    }

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -32px 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [reduced]);

  return { ref, visible };
}
