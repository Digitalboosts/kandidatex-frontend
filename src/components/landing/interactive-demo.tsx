'use client';

import {
  Circle,
  CircleCheck,
  EyeOff,
  Film,
  LogOut,
  MonitorCheck,
  ScanLine,
  TriangleAlert,
  UserCheck,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { CameraView, ChatScreen } from './screen-mocks';

type Kind = 'info' | 'good' | 'muted' | 'review';

interface DemoEvent {
  id: string;
  time: string;
  title: string;
  detail: string;
  kind: Kind;
  icon: LucideIcon;
  /** Present on "review recommended" events: what the AI scan saw. */
  review?: { app: string; category: string; confidence: number };
}

const EVENTS: DemoEvent[] = [
  { id: 'joined', time: '10:02:14', title: 'Candidate joined', detail: 'The candidate gave consent and connected their phone camera.', kind: 'info', icon: UserCheck },
  { id: 'calibrated', time: '10:02:51', title: 'Calibration passed', detail: 'Framing, lighting, focus and stability checks passed. The whole screen is in view.', kind: 'good', icon: MonitorCheck },
  { id: 'recording', time: '10:03:02', title: 'Recording started', detail: 'The interviewer started a session recording.', kind: 'info', icon: Film },
  { id: 'vscode', time: '10:09:37', title: 'VS Code · AI scan · Normal', detail: 'The AI scan named VS Code (code editor). No action needed.', kind: 'good', icon: ScanLine },
  { id: 'lost', time: '10:15:20', title: 'Screen not visible', detail: 'The laptop screen left the camera frame for a few seconds, then came back.', kind: 'muted', icon: EyeOff },
  {
    id: 'chatgpt',
    time: '10:24:05',
    title: 'ChatGPT · Review recommended',
    detail: 'The AI scan named an AI assistant on screen and saved a screenshot.',
    kind: 'review',
    icon: TriangleAlert,
    review: { app: 'ChatGPT', category: 'AI assistant', confidence: 96 },
  },
  { id: 'vscode-2', time: '10:25:12', title: 'App changed · VS Code', detail: 'The screen returned to the code editor.', kind: 'good', icon: CircleCheck },
  {
    id: 'claude',
    time: '10:41:48',
    title: 'Claude · Review recommended',
    detail: 'The AI scan named an AI assistant on screen and saved a screenshot.',
    kind: 'review',
    icon: TriangleAlert,
    review: { app: 'Claude', category: 'AI assistant', confidence: 91 },
  },
  { id: 'ended', time: '10:54:22', title: 'Interview ended', detail: 'The session closed. The report is ready.', kind: 'muted', icon: LogOut },
];

const KIND_STYLES: Record<Kind, string> = {
  info: 'bg-brand-50 text-brand-700 ring-brand-100',
  good: 'bg-green-50 text-good ring-green-100',
  muted: 'bg-slate-100 text-ink-soft ring-slate-200',
  review: 'bg-amber-50 text-warn ring-amber-200',
};

export function InteractiveDemo() {
  const [selectedId, setSelectedId] = useState('joined');
  const [dialogEvent, setDialogEvent] = useState<DemoEvent | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  const detailId = useId();

  const selected = EVENTS.find((event) => event.id === selectedId) ?? EVENTS[0]!;

  function choose(event: DemoEvent, button: HTMLButtonElement) {
    setSelectedId(event.id);
    if (!event.review) return;
    trigger.current = button;
    setDialogEvent(event);
    dialog.current?.showModal();
  }

  // Up/Down/Home/End move between events, like a list.
  function onListKeyDown(event: KeyboardEvent<HTMLOListElement>) {
    const buttons = Array.from(list.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0) return;
    const target =
      event.key === 'ArrowDown' ? buttons[Math.min(index + 1, buttons.length - 1)]
      : event.key === 'ArrowUp' ? buttons[Math.max(index - 1, 0)]
      : event.key === 'Home' ? buttons[0]
      : event.key === 'End' ? buttons[buttons.length - 1]
      : undefined;
    if (!target) return;
    event.preventDefault();
    target.focus();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="rounded-2xl border border-line bg-white p-3 shadow-sm sm:p-4">
        <div className="flex items-center justify-between px-2 pb-3">
          <p className="text-sm font-semibold text-ink">Event timeline</p>
          <p className="text-xs text-ink-muted">Frontend Engineer, Round 2</p>
        </div>
        <ol ref={list} onKeyDown={onListKeyDown} aria-label="Interview events" className="space-y-1">
          {EVENTS.map((event) => {
            const active = event.id === selectedId;
            const Icon = event.icon;
            return (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={(click) => choose(event, click.currentTarget)}
                  aria-current={active ? 'true' : undefined}
                  aria-haspopup={event.review ? 'dialog' : undefined}
                  aria-controls={event.review ? undefined : detailId}
                  className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-brand-500 ${
                    active ? 'bg-canvas ring-1 ring-line' : 'hover:bg-canvas'
                  }`}
                >
                  <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ring-1 ${KIND_STYLES[event.kind]}`}>
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm font-medium ${event.review ? 'text-warn' : 'text-ink'}`}>{event.title}</span>
                    <span className="block text-xs tabular-nums text-ink-muted">{event.time}</span>
                  </span>
                  {event.review ? (
                    <span className="hidden shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-warn sm:inline">
                      Open screenshot
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="flex flex-col gap-4">
        <div id={detailId} aria-live="polite" className="rounded-2xl border border-line bg-white p-6 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Selected event</p>
          <p className="mt-3 text-lg font-semibold text-ink">{selected.title}</p>
          <p className="mt-1 text-sm tabular-nums text-ink-muted">{selected.time}</p>
          <p className="mt-3 text-sm leading-6 text-ink-soft">{selected.detail}</p>
        </div>
        <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 p-5 text-sm leading-6 text-ink-soft">
          <p className="flex items-center gap-2 font-semibold text-warn">
            <TriangleAlert className="size-4" aria-hidden /> Try it
          </p>
          <p className="mt-1">
            Open a <span className="font-medium text-ink">Review recommended</span> event to see the screenshot alert an
            interviewer gets.
          </p>
        </div>
      </div>

      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onClose={() => {
          setDialogEvent(null);
          trigger.current?.focus();
        }}
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current?.close();
        }}
        className="m-auto w-[min(32rem,calc(100%-2rem))] max-w-none rounded-2xl border-0 bg-white p-0 text-ink shadow-2xl backdrop:bg-navy-950/60 backdrop:backdrop-blur-sm"
      >
        {dialogEvent?.review ? (
          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-warn">
                <TriangleAlert className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h3 id={titleId} className="font-semibold text-ink">
                  Unusual screen activity
                </h3>
                <p className="mt-0.5 text-sm text-ink-soft">
                  {dialogEvent.review.app} appeared on screen at <span className="tabular-nums">{dialogEvent.time}</span>.
                </p>
              </div>
              <button
                type="button"
                autoFocus
                onClick={() => dialog.current?.close()}
                aria-label="Close"
                className="-m-1 rounded-lg p-1.5 text-ink-muted hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-500"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <figure className="mt-5">
              <div className="aspect-[16/10] overflow-hidden rounded-xl ring-1 ring-line">
                <CameraView framed={false}>
                  <ChatScreen app={dialogEvent.review.app} />
                </CameraView>
              </div>
              <figcaption className="mt-2 text-xs text-ink-muted">
                Example screenshot: the candidate&rsquo;s laptop screen through the phone camera, showing an AI chat window.
              </figcaption>
            </figure>

            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-canvas p-3">
                <dt className="text-xs text-ink-muted">Application</dt>
                <dd className="mt-0.5 font-semibold">{dialogEvent.review.app}</dd>
              </div>
              <div className="rounded-lg bg-canvas p-3">
                <dt className="text-xs text-ink-muted">Category</dt>
                <dd className="mt-0.5 font-semibold">{dialogEvent.review.category}</dd>
              </div>
              <div className="col-span-2 rounded-lg bg-canvas p-3">
                <dt className="flex items-center justify-between text-xs text-ink-muted">
                  AI confidence
                  <span className="font-semibold tabular-nums text-ink">{dialogEvent.review.confidence}%</span>
                </dt>
                <dd className="mt-2">
                  <div
                    role="meter"
                    aria-label="AI confidence"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={dialogEvent.review.confidence}
                    className="h-2 overflow-hidden rounded-full bg-line"
                  >
                    <div className="h-full rounded-full bg-warn" style={{ width: `${dialogEvent.review.confidence}%` }} />
                  </div>
                </dd>
              </div>
            </dl>

            <p className="mt-5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-ink-soft">
              <Circle className="mt-1 size-2 shrink-0 fill-warn text-warn" aria-hidden />
              <span>
                <span className="font-semibold text-warn">Review recommended.</span> This asks a person to take a look.
                It isn&rsquo;t a verdict on the candidate.
              </span>
            </p>
          </div>
        ) : null}
      </dialog>
    </div>
  );
}
