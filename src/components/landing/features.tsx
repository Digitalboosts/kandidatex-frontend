import { Circle, Crosshair, Eye, FileText, Lock, MonitorCheck, Play, Sun, TriangleAlert, Wifi } from 'lucide-react';
import type { ReactNode } from 'react';
import { SectionHeading, reveal } from './primitives';
import { CameraView, ChatScreen, CodeScreen } from './screen-mocks';

function Tile({
  title,
  body,
  children,
  className = '',
  delay = 0,
}: {
  title: string;
  body: string;
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <li
      {...reveal(delay)}
      className={`group flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition duration-300 motion-safe:hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5 ${className}`}
    >
      <div aria-hidden className="flex flex-1 items-center justify-center bg-canvas/70 p-5 sm:p-6">
        {children}
      </div>
      <div className="border-t border-line p-6">
        <h3 className="font-semibold text-ink">{title}</h3>
        <p className="mt-1.5 text-sm leading-6 text-ink-soft">{body}</p>
      </div>
    </li>
  );
}

function LiveMonitorFragment() {
  const chips = [
    { icon: MonitorCheck, label: 'Screen found' },
    { icon: Sun, label: 'Lighting good' },
    { icon: Crosshair, label: 'Steady' },
    { icon: Wifi, label: 'Network good' },
  ];
  return (
    <div className="grid w-full max-w-xl gap-3 sm:grid-cols-[1.3fr_1fr]">
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl ring-1 ring-line">
        <CameraView>
          <CodeScreen dense />
        </CameraView>
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
          <span className="size-1.5 rounded-full bg-red-500" /> Live
        </span>
      </div>
      <div className="space-y-2">
        <div className="rounded-lg border border-line bg-white p-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-ink-muted">
              <Eye className="size-3.5" /> Visibility
            </span>
            <span className="font-semibold tabular-nums text-ink">94%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
            <div className="h-full w-[94%] rounded-full bg-good" />
          </div>
        </div>
        <ul className="grid grid-cols-2 gap-2">
          {chips.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-2 py-1.5 text-[11px] font-medium text-good">
              <Icon className="size-3.5 shrink-0" />
              <span className="truncate">{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function DetectionFragment() {
  const rows = [
    { app: 'VS Code', category: 'Code editor', review: false },
    { app: 'Terminal', category: 'Terminal', review: false },
    { app: 'Chrome', category: 'Web browser', review: false },
    { app: 'Claude', category: 'AI assistant', review: true },
  ];
  return (
    <ul className="w-full max-w-xs space-y-1.5">
      {rows.map((row) => (
        <li
          key={row.app}
          className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs ${
            row.review ? 'border-amber-200 bg-amber-50' : 'border-line bg-white'
          }`}
        >
          <span className="min-w-0 truncate">
            <span className="font-semibold text-ink">{row.app}</span>
            <span className="text-ink-muted"> · {row.category}</span>
          </span>
          <span className={`shrink-0 font-medium ${row.review ? 'text-warn' : 'text-good'}`}>{row.review ? 'Review' : 'Normal'}</span>
        </li>
      ))}
    </ul>
  );
}

function ScreenshotFragment() {
  return (
    <div className="w-full max-w-[15rem]">
      <div className="relative aspect-[16/10] overflow-hidden rounded-lg shadow-md ring-1 ring-line">
        <CameraView framed={false}>
          <ChatScreen dense />
        </CameraView>
        <span className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white">
          <Lock className="size-2.5" /> Private
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1 font-medium text-warn">
          <TriangleAlert className="size-3" /> ChatGPT
        </span>
        <span className="tabular-nums text-ink-muted">10:24:05</span>
      </div>
    </div>
  );
}

function SummaryFragment() {
  return (
    <div className="w-full max-w-xl rounded-xl border border-line bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
          <FileText className="size-3.5 text-brand-600" /> AI summary
        </p>
        <span className="rounded-full bg-canvas px-2 py-0.5 text-[10px] font-medium text-ink-muted ring-1 ring-line">
          From alert text only
        </span>
      </div>
      <div className="relative mt-3 max-h-24 overflow-hidden">
        <p className="text-[13px] leading-6 text-ink-soft">
          For most of the 52-minute session the screen showed VS Code and a terminal. At 10:24 the AI scan identified
          ChatGPT on screen and a screenshot was saved; the screen returned to VS Code shortly after. A second reading at
          10:41 named Claude. Both moments are marked review recommended, so the interviewer may want to look at the
          screenshots and recording around those times before deciding.
        </p>
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white" />
      </div>
    </div>
  );
}

function RecordingFragment() {
  return (
    <div className="w-full max-w-[15rem] space-y-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-bad px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
          <Circle className="size-2.5 fill-current" /> Recording
        </span>
        <span className="font-mono text-xs tabular-nums text-ink-soft">00:24:05</span>
      </div>
      <div className="rounded-lg border border-line bg-white p-2.5">
        <div className="flex items-center gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ink text-white">
            <Play className="size-3 fill-current" />
          </span>
          <div className="relative h-1.5 flex-1 rounded-full bg-line">
            <div className="h-full w-2/5 rounded-full bg-brand-600" />
            <span className="absolute left-2/5 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brand-600 shadow" />
          </div>
        </div>
        <p className="mt-1.5 text-right text-[10px] tabular-nums text-ink-muted">21:12 / 52:08</p>
      </div>
    </div>
  );
}

function TimelineFragment() {
  const events = [
    { time: '10:02', label: 'Candidate joined', dot: 'bg-brand-600' },
    { time: '10:15', label: 'Screen not visible', dot: 'bg-slate-400' },
    { time: '10:24', label: 'App changed to ChatGPT', dot: 'bg-warn' },
    { time: '10:24', label: 'Review recommended', dot: 'bg-warn' },
  ];
  return (
    <ol className="relative w-full max-w-md space-y-3 pl-5">
      <span className="absolute bottom-1.5 left-[0.3rem] top-1.5 w-px bg-line" />
      {events.map((event) => (
        <li key={event.label} className="relative flex items-baseline gap-3 text-sm">
          <span className={`absolute -left-[1.05rem] top-1.5 size-2 rounded-full ring-4 ring-canvas ${event.dot}`} />
          <span className="w-11 shrink-0 font-mono text-xs tabular-nums text-ink-muted">{event.time}</span>
          <span className="font-medium text-ink">{event.label}</span>
        </li>
      ))}
    </ol>
  );
}

export function Features() {
  return (
    <section id="features" aria-labelledby="features-title" className="bg-canvas py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          id="features-title"
          eyebrow="Features"
          title="Everything you need to review a remote round"
          description="See it live, get a nudge when something needs a look, and keep a clear record for afterwards."
        />
        <ul className="mt-14 grid gap-4 lg:grid-cols-3">
          <Tile
            className="lg:col-span-2"
            title="Live monitor"
            body="Watch the candidate’s screen through their phone camera, with live cards for screen detection, visibility, lighting, stability and network."
          >
            <LiveMonitorFragment />
          </Tile>
          <Tile
            delay={80}
            title="AI screen detection"
            body="At random moments 1–10 s apart, an AI vision model names the app on screen. AI assistants raise an “Unusual screen activity” popup."
          >
            <DetectionFragment />
          </Tile>
          <Tile
            title="Screenshot evidence"
            body="Each flagged frame is saved as a screenshot alert in private storage, with the app name and time."
          >
            <ScreenshotFragment />
          </Tile>
          <Tile
            delay={80}
            className="lg:col-span-2"
            title="AI summary"
            body="After the interview, a 100–120 word summary of the alerts. It’s written from alert text only; screenshots are never sent to the model."
          >
            <SummaryFragment />
          </Tile>
          <Tile title="One-click recording" body="Record the session with one click and play it back later, seeking to any moment.">
            <RecordingFragment />
          </Tile>
          <Tile
            delay={80}
            className="lg:col-span-2"
            title="Event timeline"
            body="Everything that happened, in order: joined, screen lost, app changed, review recommended."
          >
            <TimelineFragment />
          </Tile>
        </ul>
      </div>
    </section>
  );
}
