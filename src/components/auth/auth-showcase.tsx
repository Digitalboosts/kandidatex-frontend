import { CheckCircle2, Link2, MonitorCheck, ScanLine, ShieldCheck, Sparkles, Video, type LucideIcon } from 'lucide-react';
import type { CSSProperties } from 'react';
import { CameraView, CodeScreen } from '@/components/landing/screen-mocks';

/**
 * The dark panel beside the sign-in and sign-up forms (large screens only): a
 * small live-monitor mock and a few lines on what the product does. Decorative,
 * CSS-only motion that stops under reduced motion.
 */

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

const LOGIN_POINTS: { icon: LucideIcon; title: string; detail: string }[] = [
  { icon: ShieldCheck, title: 'Consent first', detail: 'Candidates see exactly what is shared.' },
  { icon: ScanLine, title: 'AI flags, you decide', detail: 'Assistants on screen are marked for review.' },
  { icon: Video, title: 'Recorded for review', detail: 'Replay any moment after the call.' },
];

const REGISTER_STEPS: { icon: LucideIcon; title: string; detail: string }[] = [
  { icon: Sparkles, title: 'Create an interview', detail: 'Add a title and the candidate name.' },
  { icon: Link2, title: 'Share the join link', detail: 'The candidate opens it on their phone.' },
  { icon: MonitorCheck, title: 'Watch the screen live', detail: 'With AI flags and a full timeline.' },
];

export function AuthShowcase({ mode }: { mode: 'login' | 'register' }) {
  const registering = mode === 'register';
  const items = registering ? REGISTER_STEPS : LOGIN_POINTS;

  return (
    <aside
      aria-hidden
      className="relative isolate hidden overflow-hidden bg-navy-950 lg:flex lg:flex-col lg:justify-center lg:px-12 xl:px-20"
    >
      <div className="landing-grid absolute inset-0 -z-10" />
      <div className="absolute left-1/2 top-[-12rem] -z-10 h-[36rem] w-[48rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(37_99_235/0.35),rgb(37_99_235/0.08)_55%,transparent)]" />
      <div className="absolute bottom-[-10rem] right-[-8rem] -z-10 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(closest-side,rgb(16_185_129/0.14),transparent)]" />

      <div className="mx-auto w-full max-w-xl">
        <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300 motion-safe:animate-rise">
          <span className="size-1.5 rounded-full bg-emerald-400 motion-safe:animate-pulse-dot" />
          Live interview integrity
        </p>
        <h2
          className="mt-5 text-4xl font-semibold tracking-tight text-balance text-white xl:text-[2.75rem] xl:leading-[1.1] motion-safe:animate-rise"
          style={delay(80)}
        >
          {registering ? 'Your first monitored interview is minutes away.' : 'Every interview, in full view.'}
        </h2>
        <p className="mt-4 max-w-md text-base leading-7 text-slate-300 motion-safe:animate-rise" style={delay(160)}>
          {registering
            ? 'Set it up once and see the candidate’s screen through their phone camera, live.'
            : 'Pick up right where you left off: live screens, AI flags and recordings in one place.'}
        </p>

        {/* Mini live monitor */}
        <div className="relative mt-10 motion-safe:animate-rise" style={delay(260)}>
          <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-brand-600/20 blur-2xl" />
          <div className="overflow-hidden rounded-2xl bg-white/[0.04] ring-1 ring-white/10 backdrop-blur">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
              <span className="size-2 rounded-full bg-white/15" />
              <span className="size-2 rounded-full bg-white/15" />
              <span className="size-2 rounded-full bg-white/15" />
              <span className="ml-2 flex-1 truncate text-xs text-slate-400">
                <span className="font-semibold text-slate-200">Live monitor</span> · Frontend Engineer, Round 2
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-300">
                <span className="size-1.5 rounded-full bg-red-400 motion-safe:animate-pulse-dot" />
                LIVE
              </span>
            </div>
            <div className="relative aspect-[16/9]">
              <CameraView>
                <CodeScreen />
              </CameraView>
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="h-full w-full bg-[linear-gradient(to_bottom,transparent_40%,rgb(59_130_246/0.25)_50%,transparent_60%)] opacity-0 motion-safe:animate-scan-loop" />
              </div>
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2 py-1 text-[10px] font-medium text-white backdrop-blur">
                <span className="size-1.5 rounded-full bg-emerald-400 motion-safe:animate-pulse-dot" />
                Phone camera
              </span>
            </div>
          </div>

          {/* Floating notifications */}
          <div className="absolute -left-6 top-[42%] motion-safe:animate-float">
            <div className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-2 shadow-xl shadow-navy-950/40 motion-safe:animate-rise" style={delay(700)}>
              <span className="flex size-7 items-center justify-center rounded-full bg-green-50 text-good">
                <CheckCircle2 className="size-4" />
              </span>
              <span>
                <span className="block text-xs font-semibold text-ink">Calibration passed</span>
                <span className="block text-[11px] text-ink-muted">Framing · lighting · focus</span>
              </span>
            </div>
          </div>
          <div className="absolute -bottom-5 -right-5 motion-safe:animate-float" style={delay(1500)}>
            <div className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-2 shadow-xl shadow-navy-950/40 motion-safe:animate-rise" style={delay(1100)}>
              <span className="flex size-7 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <ScanLine className="size-4" />
              </span>
              <span>
                <span className="block text-xs font-semibold text-ink">VS Code · AI scan</span>
                <span className="block text-[11px] text-ink-muted">Code editor · Normal</span>
              </span>
              <span className="ml-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-good">96%</span>
            </div>
          </div>
        </div>

        <ol className="mt-14 grid grid-cols-3 gap-4">
          {items.map(({ icon: Icon, title, detail }, index) => (
            <li key={title} className="motion-safe:animate-rise" style={delay(400 + index * 120)}>
              <span className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-white/5 text-brand-500 ring-1 ring-white/10">
                  <Icon className="size-4" />
                </span>
                {registering ? <span className="text-xs font-semibold text-slate-500">Step {index + 1}</span> : null}
              </span>
              <p className="mt-3 text-sm font-semibold text-white">{title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p>
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}
