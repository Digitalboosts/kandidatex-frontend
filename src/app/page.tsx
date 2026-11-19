import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { FaqSection, FinalCta, SiteFooter } from '@/components/landing/closing';
import { FAQ_ITEMS } from '@/components/landing/faq-data';
import { Features } from '@/components/landing/features';
import { inter } from '@/components/landing/fonts';
import { Hero } from '@/components/landing/hero';
import { HowItWorks } from '@/components/landing/how-it-works';
import { Pricing } from '@/components/landing/pricing';
import { Problem } from '@/components/landing/problem';
import { DemoSection, ReportPreview } from '@/components/landing/report-preview';
import { RevealOnScroll } from '@/components/landing/reveal-on-scroll';
import { SiteNav } from '@/components/landing/site-nav';
import { Trust } from '@/components/landing/trust';

const TITLE = 'Interview Monitor: see the screen your webcam can’t';
const DESCRIPTION =
  'Remote technical interviews with the whole screen in view. The candidate points a phone at their laptop, you watch live, and AI flags AI assistants on screen for your review.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Interview Monitor',
    locale: 'en_IN',
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: { '@type': 'Answer', text: item.answer },
  })),
};

export default async function LandingPage() {
  // Only decides which nav buttons to show; the backend still checks the session on every request.
  const signedIn = (await cookies()).has('im_session');

  return (
    <div className={`landing-page bg-navy-950 ${inter.className}`}>
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-white px-4 py-2 text-sm font-medium text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <SiteNav signedIn={signedIn} />
      <main id="main">
        <Hero signedIn={signedIn} />
        <Problem />
        <HowItWorks />
        <Features />
        <DemoSection />
        <ReportPreview />
        {/*
          TODO(social-proof): add real customer quotes or logos here once you have
          written permission to use them. Don't ship placeholders or invented numbers.
        */}
        <Trust />
        <Pricing signedIn={signedIn} />
        <FaqSection />
        <FinalCta signedIn={signedIn} />
      </main>
      <SiteFooter />
      <RevealOnScroll />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }}
      />
    </div>
  );
}
