'use client';

import { useEffect } from 'react';

/**
 * Fades [data-reveal] elements in as they scroll into view. Only elements that
 * are still below the fold on load are hidden first, so nothing on screen ever
 * flickers, and without JavaScript (or with reduced motion) everything just shows.
 */
export function RevealOnScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute('data-reveal', 'shown');
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );

    for (const element of document.querySelectorAll<HTMLElement>('[data-reveal]')) {
      if (element.getBoundingClientRect().top < window.innerHeight) continue;
      element.setAttribute('data-reveal', 'pending');
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, []);

  return null;
}
