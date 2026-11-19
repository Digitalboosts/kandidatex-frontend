'use client';

import { useEffect, useRef, useState } from 'react';

const format = (n: number) => n.toLocaleString('en-IN');

/**
 * Counts a real number up from zero the first time it scrolls into view. The
 * server renders the final value; the final value also reserves the width, so
 * nothing shifts while it counts. Reduced motion keeps the final value.
 */
export function CountUp({ value, durationMs = 1100 }: { value: number; durationMs?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    // Already on screen: don't make it jump.
    if (element.getBoundingClientRect().top < window.innerHeight) return;

    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / durationMs);
          const eased = 1 - (1 - t) ** 3;
          setShown(Math.round(value * eased));
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        setShown(0);
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, durationMs]);

  return (
    <span ref={ref} className="inline-grid tabular-nums">
      <span className="sr-only">{format(value)}</span>
      <span aria-hidden className="invisible col-start-1 row-start-1">
        {format(value)}
      </span>
      <span aria-hidden className="col-start-1 row-start-1 text-right">
        {format(shown)}
      </span>
    </span>
  );
}
