import { Check, Copy, Link2, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { SectionHeading, reveal } from './primitives';
import { CameraView, ChatScreen, CodeScreen } from './screen-mocks';

function ShareIllustration() {
  return (
    <div className="w-full max-w-[17rem] rounded-xl border border-line bg-white p-3 shadow-sm">
      <p className="text-xs font-medium text-ink-muted">Joining link</p>
      <div className="mt-2 flex items-center gap-2 rounded-lg border border-line bg-canvas px-2.5 py-2">
        <Link2 className="size-3.5 shrink-0 text-ink-muted" />
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink-soft">/join/k7f3-q2mx</span>
        <span className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-2 py-1 text-[11px] font-medium text-white">
          <Copy className="size-3" />
          Copy
        </span>
      </div>
      <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-good">
        <Check className="size-3" /> Link copied, send it to the candidate
      </p>
    </div>
  );
}

const CHECKS = ['Framing', 'Lighting', 'Focus', 'Stability'];

function CalibrateIllustration() {
  return (
    <div className="flex items-end gap-3">
      <div className="w-24 rounded-[1.25rem] bg-navy-950 p-1.5 shadow-lg ring-1 ring-black/10">
        <div className="aspect-[9/16] overflow-hidden rounded-2xl">
          <CameraView>
            <CodeScreen dense />
          </CameraView>
        </div>
      </div>
      <ul className="mb-2 space-y-1.5">
        {CHECKS.map((check) => (
          <li
            key={check}
            className="flex items-center gap-1.5 rounded-full bg-white px-2 py-1 text-[11px] font-medium text-ink shadow-sm ring-1 ring-line"
          >
            <span className="flex size-3.5 items-center justify-center rounded-full bg-green-100 text-good">
              <Check className="size-2.5" />
            </span>
            {check}
          </li>
        ))}
      </ul>
    </div>
  );
}

function WatchIllustration() {
  return (
    <div className="w-full max-w-[17rem]">
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl shadow-sm ring-1 ring-line">
        <CameraView>
          <ChatScreen dense />
        </CameraView>
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
          <span className="size-1.5 rounded-full bg-red-500" /> Live
        </span>
      </div>
      <div className="relative z-10 -mt-4 ml-auto mr-2 w-fit rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 shadow-md">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-warn">
          <TriangleAlert className="size-3" /> ChatGPT · Review recommended
        </p>
      </div>
    </div>
  );
}

const STEPS: { title: string; body: string; art: ReactNode }[] = [
  {
    title: 'Share the link',
    body: 'Create an interview and send the candidate its joining link. They don’t need an account or an app.',
    art: <ShareIllustration />,
  },
  {
    title: 'The candidate points their phone at the screen',
    body: 'On their phone or a second device, they give consent and aim the camera at their laptop. Live checks for framing, lighting, focus and stability guide them until the whole screen is visible.',
    art: <CalibrateIllustration />,
  },
  {
    title: 'Watch live while AI flags what needs a look',
    body: 'You see their screen in your dashboard. At random moments, AI names the app on screen and raises a popup if an AI assistant shows up.',
    art: <WatchIllustration />,
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="border-t border-line bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          id="how-title"
          eyebrow="How it works"
          title="Set up in three steps"
          description="No installs, no browser extensions. A phone camera on their screen and a dashboard on yours."
        />
        <ol className="mt-14 grid gap-6 lg:grid-cols-3">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              {...reveal(index * 110)}
              className="flex flex-col overflow-hidden rounded-2xl border border-line bg-canvas"
            >
              <div
                aria-hidden
                className="flex h-56 items-center justify-center border-b border-line bg-[radial-gradient(circle_at_50%_0%,#eff6ff,transparent_70%)] px-6"
              >
                {step.art}
              </div>
              <div className="p-6">
                <p className="flex size-7 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">
                  <span className="sr-only">Step </span>
                  {index + 1}
                </p>
                <h3 className="mt-4 text-lg font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-soft">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
