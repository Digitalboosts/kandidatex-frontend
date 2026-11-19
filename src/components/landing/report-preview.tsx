import { FileText, Play, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { InteractiveDemo } from './interactive-demo';
import { SectionHeading, reveal } from './primitives';
import { CameraView, ChatScreen } from './screen-mocks';

export function DemoSection() {
  return (
    <section aria-labelledby="demo-title" className="border-y border-line bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          id="demo-title"
          eyebrow="Try it"
          title="Click through a real-looking timeline"
          description="This is what an interviewer sees during a session. Pick any event, or open a flagged one to see its screenshot alert."
        />
        <div className="mt-12" {...reveal(80)}>
          <InteractiveDemo />
        </div>
      </div>
    </section>
  );
}

function Marker({ n }: { n: number }) {
  return (
    <span className="absolute -left-2.5 -top-2.5 z-10 flex size-6 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white shadow-md ring-4 ring-canvas">
      {n}
    </span>
  );
}

function Block({ n, children, className = '' }: { n: number; children: ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-xl border border-line bg-white p-4 ${className}`}>
      <Marker n={n} />
      {children}
    </div>
  );
}

const CALLOUTS = [
  { title: 'AI summary', body: '100–120 words written from alert text only. Screenshots are never sent to the model.' },
  { title: 'Screenshots', body: 'Every flagged frame with the app name and time, kept in private storage.' },
  { title: 'Recording', body: 'Play the session back and seek straight to the moments that matter.' },
  { title: 'Timeline', body: 'Everything that happened, in order, so the alerts have context.' },
];

function ReportMock() {
  return (
    <div className="rounded-2xl border border-line bg-canvas p-4 shadow-xl shadow-slate-900/5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
        <div>
          <p className="text-xs text-ink-muted">Interview report</p>
          <p className="mt-0.5 font-semibold text-ink">Frontend Engineer, Round 2</p>
          <p className="text-xs text-ink-muted">18 Nov 2026 · 52 min</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-warn ring-1 ring-amber-200">
          <TriangleAlert className="size-3.5" /> 2 alerts · review recommended
        </span>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <Block n={1} className="md:col-span-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
            <FileText className="size-3.5 text-brand-600" /> AI summary
          </p>
          <p className="mt-2 text-[13px] leading-6 text-ink-soft">
            The screen showed VS Code and a terminal for most of the session. At 10:24 the AI scan named ChatGPT and a
            screenshot was saved; at 10:41 it named Claude. Both are marked review recommended&hellip;
          </p>
        </Block>

        <Block n={2}>
          <p className="text-xs font-semibold text-ink">Screenshots</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              { app: 'ChatGPT', time: '10:24:05' },
              { app: 'Claude', time: '10:41:48' },
            ].map((shot) => (
              <div key={shot.app}>
                <div className="aspect-[16/10] overflow-hidden rounded-md ring-1 ring-line">
                  <CameraView framed={false}>
                    <ChatScreen app={shot.app} dense />
                  </CameraView>
                </div>
                <p className="mt-1 flex justify-between text-[10px]">
                  <span className="font-medium text-warn">{shot.app}</span>
                  <span className="tabular-nums text-ink-muted">{shot.time}</span>
                </p>
              </div>
            ))}
          </div>
        </Block>

        <div className="space-y-5">
          <Block n={3}>
            <p className="text-xs font-semibold text-ink">Recording</p>
            <div className="mt-3 flex items-center gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-white">
                <Play className="size-3 fill-current" />
              </span>
              <div className="relative h-1.5 flex-1 rounded-full bg-line">
                <div className="h-full w-[42%] rounded-full bg-brand-600" />
                <span className="absolute left-[42%] top-1/2 h-3 w-0.5 -translate-y-1/2 rounded bg-warn" />
                <span className="absolute left-[75%] top-1/2 h-3 w-0.5 -translate-y-1/2 rounded bg-warn" />
              </div>
              <span className="text-[10px] tabular-nums text-ink-muted">52:08</span>
            </div>
          </Block>
          <Block n={4}>
            <p className="text-xs font-semibold text-ink">Timeline</p>
            <ol className="mt-2 space-y-1.5 text-xs">
              {[
                ['10:02', 'Candidate joined', 'text-ink'],
                ['10:24', 'ChatGPT · Review recommended', 'text-warn'],
                ['10:25', 'App changed · VS Code', 'text-ink'],
              ].map(([time, label, color]) => (
                <li key={label} className="flex gap-3">
                  <span className="w-9 shrink-0 font-mono tabular-nums text-ink-muted">{time}</span>
                  <span className={`truncate font-medium ${color}`}>{label}</span>
                </li>
              ))}
            </ol>
          </Block>
        </div>
      </div>
    </div>
  );
}

export function ReportPreview() {
  return (
    <section aria-labelledby="report-title" className="bg-canvas py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div>
          <SectionHeading
            id="report-title"
            align="left"
            eyebrow="The report"
            title="One page to review the whole interview"
            description="When the interview ends, the summary, screenshots, recordings and timeline sit together, so you can decide with the full picture."
          />
          <ol className="mt-8 space-y-4">
            {CALLOUTS.map((callout, index) => (
              <li key={callout.title} className="flex gap-4" {...reveal(index * 80)}>
                <span
                  aria-hidden
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white"
                >
                  {index + 1}
                </span>
                <p className="text-sm leading-6 text-ink-soft">
                  <span className="font-semibold text-ink">{callout.title}.</span> {callout.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
        <div
          {...reveal(120)}
          role="img"
          aria-label="Example post-interview report with an AI summary, two screenshot alerts for ChatGPT and Claude, a session recording with two alert markers, and a timeline excerpt."
        >
          <ReportMock />
        </div>
      </div>
    </section>
  );
}
