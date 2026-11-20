import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useRevealOnScroll } from '../hooks/useWorkshopMotion';

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

  useEffect(() => {
    if (visible && !mounted) {
      setMounted(true);
    }
  }, [visible, mounted]);

  if (mounted) {
    return <div ref={ref}>{children}</div>;
  }

  return (
    <div ref={ref} className={heightClass} aria-busy="true">
      {fallback}
    </div>
  );
}