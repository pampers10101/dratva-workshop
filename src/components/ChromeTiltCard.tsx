import { motion, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion';
import { type MouseEvent, type ReactNode, useRef } from 'react';
import { usePrefersReducedMotion } from '../hooks/useWorkshopMotion';

interface ChromeTiltCardProps {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
  glintColor?: string;
  testId?: string;
}

export function ChromeTiltCard({
  children,
  className = '',
  maxTilt = 5,
  glintColor = 'rgba(220, 227, 239, 0.16)',
  testId,
}: ChromeTiltCardProps) {
  const reduced = usePrefersReducedMotion();
  const cardRef = useRef<HTMLDivElement | null>(null);

  const rawRotateX = useMotionValue(0);
  const rawRotateY = useMotionValue(0);
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(50);
  const glareOpacity = useMotionValue(0);

  const rotateX = useSpring(rawRotateX, { stiffness: 260, damping: 24, mass: 0.5 });
  const rotateY = useSpring(rawRotateY, { stiffness: 260, damping: 24, mass: 0.5 });
  const smoothGlareOpacity = useSpring(glareOpacity, { stiffness: 220, damping: 26 });

  const glareBg = useMotionTemplate`radial-gradient(360px circle at ${glareX}% ${glareY}%, ${glintColor}, transparent 68%)`;

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (reduced || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;

    rawRotateX.set((0.5 - py) * maxTilt * 2);
    rawRotateY.set((px - 0.5) * maxTilt * 2);
    glareX.set(px * 100);
    glareY.set(py * 100);
    glareOpacity.set(1);
  };

  const handleMouseLeave = () => {
    rawRotateX.set(0);
    rawRotateY.set(0);
    glareOpacity.set(0);
  };

  return (
    <div style={{ perspective: '1100px' }} className="h-full">
      <motion.div
        ref={cardRef}
        data-testid={testId}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={
          reduced
            ? undefined
            : {
                rotateX,
                rotateY,
                transformStyle: 'preserve-3d',
              }
        }
        className={`relative h-full will-change-transform ${className}`}
      >
        {children}
        {!reduced && (
          <motion.div
            aria-hidden="true"
            style={{ background: glareBg, opacity: smoothGlareOpacity }}
            className="pointer-events-none absolute inset-0 z-10 rounded-[inherit]"
          />
        )}
      </motion.div>
    </div>
  );
}

