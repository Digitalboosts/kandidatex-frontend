'use client';

import {
  Crosshair,
  Eye,
  MonitorCheck,
  Pause,
  Play,
  ScanLine,
  Sun,
  TriangleAlert,
  UserCheck,
  Wifi,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { CameraView, ChatScreen, CodeScreen } from './screen-mocks';

/**
 * The hero's product mock: the interviewer's live monitor on a calm loop.
 * Step 0 is an empty timeline; each later step adds one beat, ending with the
 * "Unusual screen activity" popup. With reduced motion it shows the last step.
 */

/** When each step begins, in ms from the start of the loop. */
const STEP_AT = [0, 900, 2100, 3500, 5700, 6700, 7500];
const FINAL_STEP = STEP_AT.length - 1;
const LOOP_MS = 12_500;

/** Steps that run a visible AI scan across the frame. */
const SCAN_STEPS = new Set([3, 5]);
/** From this step on, the candidate's screen shows the AI chat. */
const CHAT_FROM = 4;

type Tone = 'brand' | 'good' | 'warn';

const EVENTS: { step: number; time: string; title: string; detail: string; tone: Tone; icon: LucideIcon }[] = [
  { step: 1, time: '10:02:14', title: 'Candidate joined', detail: 'Phone camera connected', tone: 'brand', icon: UserCheck },
  { step: 2, time: '10:02:51', title: 'Calibration passed', detail: 'Framing, lighting, focus, stability', tone: 'good', icon: MonitorCheck },
  { step: 3, time: '10:09:37', title: 'VS Code · AI scan', detail: 'Code editor · Normal', tone: 'good', icon: ScanLine },
  { step: 5, time: '10:24:05', title: 'ChatGPT · Review recommended', detail: 'AI assistant · 96% confidence', tone: 'warn', icon: TriangleAlert },
];

const TONE_STYLES: Record<Tone, string> = {
  brand: 'bg-brand-50 text-brand-700 ring-brand-100',
  good: 'bg-green-50 text-good ring-green-100',
  warn: 'bg-amber-50 text-warn ring-amber-100',
};

const STATUS: { icon: LucideIcon; label: string; value: string }[] = [
  { icon: MonitorCheck, label: 'Screen', value: 'Detected' },
  { icon: Eye, label: 'Visibility', value: '94%' },
  { icon: Sun, label: 'Lighting', value: 'Good' },
  { icon: Crosshair, label: 'Stability', value: 'Steady' },
  { icon: Wifi, label: 'Network', value: 'Good' },
];

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const subscribeReducedMotion = (onChange: () => void) => {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};
const useReducedMotion = () =>
  useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia(REDUCED_MOTION).matches, () => false);

export function HeroMonitor() {
  const reducedMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [inView, setInView] = useState(false);
  const stepRef = useRef(0);
  const root = useRef<HTMLElement>(null);

  // Only animate while the mock is on screen.
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry?.isIntersecting ?? false));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reducedMotion || !playing || !inView) return;
    let timer = 0;
    const schedule = (current: number) => {
      const next = current >= FINAL_STEP ? 0 : current + 1;
      const delay = next === 0 ? LOOP_MS - STEP_AT[FINAL_STEP]! : STEP_AT[next]! - STEP_AT[current]!;
      timer = window.setTimeout(() => {
        stepRef.current = next;
        setStep(next);
        schedule(next);
      }, delay);
    };
    schedule(stepRef.current);
    return () => window.clearTimeout(timer);
  }, [reducedMotion, playing, inView]);

  const shown = reducedMotion ? FINAL_STEP : step;
  const chat = shown >= CHAT_FROM;
  const scanning = !reducedMotion && SCAN_STEPS.has(shown);
  const popup = shown >= FINAL_STEP;

  return (
    <figure ref={root} className="relative mx-auto max-w-5xl">
      <figcaption className="sr-only">
        Illustration of the Interview Monitor live dashboard. The candidate&rsquo;s laptop screen is shown through their
        phone camera with status cards for screen, visibility, lighting, stability and network. The event timeline fills
        with: candidate joined, calibration passed, VS Code scanned as normal, then ChatGPT with review recommended at 96%
        confidence, and an &ldquo;Unusual screen activity&rdquo; popup appears.
      </figcaption>

      <div aria-hidden className="absolute -inset-x-6 -inset-y-4 -z-10 rounded-[2rem] bg-brand-600/20 blur-3xl" />

      <div className="overflow-hidden rounded-2xl bg-white shadow-2xl shadow-navy-950/40 ring-1 ring-white/10">
        {/* Window bar */}
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <div aria-hidden className="hidden gap-1.5 sm:flex">
            <span className="size-2.5 rounded-full bg-slate-200" />
            <span className="size-2.5 rounded-full bg-slate-200" />
            <span className="size-2.5 rounded-full bg-slate-200" />
          </div>
          <div aria-hidden className="min-w-0 flex-1 truncate text-sm">
            <span className="font-semibold text-ink">Live monitor</span>
            <span className="text-ink-muted"> · Frontend Engineer, Round 2</span>
          </div>
          <span
            aria-hidden
            className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-bad"
          >
            <span className="size-1.5 rounded-full bg-bad motion-safe:animate-pulse-dot" />
            LIVE
          </span>
          {reducedMotion ? null : (
            <button
              type="button"
              onClick={() => setPlaying((value) => !value)}
              aria-label={playing ? 'Pause animation' : 'Play animation'}
              className="rounded-md p-1 text-ink-muted hover:bg-canvas hover:text-ink focus-visible:outline-2"
            >
              {playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
            </button>
          )}
        </div>

        <div aria-hidden className="grid gap-4 bg-canvas p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* Camera feed + status */}
          <div className="min-w-0 space-y-3">
            <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-navy-950">
              <CameraView>
                <div className="relative h-full w-full">
                  <div className={`absolute inset-0 transition-opacity duration-700 ${chat ? 'opacity-0' : 'opacity-100'}`}>
                    <CodeScreen />
                  </div>
                  <div className={`absolute inset-0 transition-opacity duration-700 ${chat ? 'opacity-100' : 'opacity-0'}`}>
                    <ChatScreen />
                  </div>
                </div>
              </CameraView>

              {scanning ? (
                <div key={shown} className="pointer-events-none absolute inset-0 overflow-hidden">
                  <div className="h-full w-full animate-scan bg-[linear-gradient(to_bottom,transparent_40%,rgb(59_130_246/0.28)_50%,transparent_60%)]" />
                </div>
              ) : null}

              <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2 py-1 text-[10px] font-medium text-white backdrop-blur sm:text-xs">
                <span className="size-1.5 rounded-full bg-emerald-400 motion-safe:animate-pulse-dot" />
                Phone camera
              </span>
              <span
                className={`absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium backdrop-blur transition-colors duration-500 sm:text-xs ${
                  chat ? 'bg-amber-500/90 text-navy-950' : 'bg-black/55 text-white'
                }`}
              >
                <ScanLine className="size-3" />
                {chat ? 'ChatGPT · AI assistant' : 'VS Code · Code editor'}
              </span>
            </div>

            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {STATUS.map(({ icon: Icon, label, value }, index) => (
                <li
                  key={label}
                  className={`min-w-0 rounded-lg border border-line bg-white px-2.5 py-2 ${index > 2 ? 'hidden sm:block' : ''}`}
                >
                  <p className="flex items-center gap-1.5 text-[11px] text-ink-muted">
                    <Icon className="size-3.5" />
                    {label}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-good">{value}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Event timeline: four fixed slots, so nothing shifts as events arrive. */}
          <div className="rounded-xl border border-line bg-white p-3">
            <div className="flex items-center justify-between px-1 pb-2">
              <p className="text-sm font-semibold text-ink">Event timeline</p>
              <p className="text-xs tabular-nums text-ink-muted">
                {EVENTS.filter((event) => shown >= event.step).length} events
              </p>
            </div>
            <ol className="relative space-y-1.5">
              <span className="absolute bottom-4 left-[1.15rem] top-4 w-px bg-line" />
              {EVENTS.map(({ step: at, time, title, detail, tone, icon: Icon }) => {
                const visible = shown >= at;
                return (
                  <li
                    key={title}
                    className={`relative flex gap-3 rounded-lg p-1.5 transition-all duration-500 ${
                      visible ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
                    } ${tone === 'warn' && visible ? 'bg-amber-50/60' : ''}`}
                  >
                    <span className={`relative flex size-7 shrink-0 items-center justify-center rounded-full ring-1 ${TONE_STYLES[tone]}`}>
                      <Icon className="size-3.5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-ink">{title}</span>
                      <span className="block truncate text-xs text-ink-muted">
                        <span className="tabular-nums">{time}</span> · {detail}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>

      {/* The alert popup the interviewer sees. */}
      <div
        aria-hidden
        className={`absolute inset-x-0 top-14 mx-auto w-[min(19rem,calc(100%-1.5rem))] rounded-xl sm:top-24 lg:inset-x-auto lg:bottom-8 lg:right-8 lg:top-auto lg:mx-0 border border-amber-200 bg-white p-4 shadow-2xl shadow-navy-950/25 transition-all duration-500 ${
          popup ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
        }`}
      >
        <div className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-warn">
            <TriangleAlert className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">Unusual screen activity</p>
            <p className="mt-0.5 text-xs text-ink-soft">ChatGPT appeared on screen at 10:24:05.</p>
          </div>
        </div>
        <div className="mt-3 rounded-lg bg-canvas p-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-muted">AI confidence</span>
            <span className="font-semibold tabular-nums text-ink">96%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
            <div
              className={`h-full rounded-full bg-warn transition-[width] delay-300 duration-700 ${popup ? 'w-[96%]' : 'w-0'}`}
            />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 text-xs">
          <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-warn">Review recommended</span>
          <span className="text-ink-muted">Screenshot saved</span>
        </div>
      </div>
    </figure>
  );
}
