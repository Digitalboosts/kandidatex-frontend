import Image from 'next/image';

export const BRAND_NAME = 'Kandidatex';

// Both files are 1200 × 196 (the wordmark trimmed tight to its edges).
const WIDTH = 1200;
const HEIGHT = 196;

/**
 * The Kandidatex wordmark. `tone="light"` swaps the navy lettering for white, for dark backgrounds.
 * Size it with a height class (e.g. `h-8`); the width follows the aspect ratio.
 */
export function BrandLogo({ tone = 'dark', className = 'h-8' }: { tone?: 'dark' | 'light'; className?: string }) {
  return (
    <Image
      src={tone === 'light' ? '/brand/kandidatex-light.png' : '/brand/kandidatex.png'}
      alt={BRAND_NAME}
      width={WIDTH}
      height={HEIGHT}
      loading="eager"
      className={`w-auto ${className}`}
    />
  );
}
