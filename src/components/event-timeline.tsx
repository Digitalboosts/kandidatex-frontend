import type { EventSeverity, MonitoringEventDTO, MonitoringEventType, ScreenAlertLevel } from '@/types';
import {
  AppWindow,
  Bot,
  Camera,
  CameraOff,
  CircleAlert,
  Crosshair,
  EyeOff,
  FileCheck,
  ImageIcon,
  Info,
  LogIn,
  LogOut,
  Monitor,
  MonitorOff,
  Move,
  Pause,
  Play,
  Power,
  RefreshCw,
  Smartphone,
  TriangleAlert,
  UserCheck,
  UserX,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { capitalize, formatTime } from '@/lib/format';
import type { ScreenAnalysisEntry } from '@/lib/use-screen-analyzer';
import { CATEGORY_LABELS } from './screen-app-panel';

type Icon = typeof Info;

export const SEVERITY_STYLES: Record<EventSeverity, { icon: Icon; className: string; label: string }> = {
  INFO: { icon: Info, className: 'text-ink-muted', label: 'Info' },
  WARNING: { icon: TriangleAlert, className: 'text-warn', label: 'Warning' },
  CRITICAL: { icon: CircleAlert, className: 'text-bad', label: 'Critical' },
};

type Tone = 'neutral' | 'info' | 'good' | 'warn' | 'bad';

/** Icon badge colours. */
const TONE_BADGE: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-ink-muted',
  info: 'bg-brand-50 text-brand-700',
  good: 'bg-green-50 text-good',
  warn: 'bg-amber-50 text-warn',
  bad: 'bg-red-50 text-bad',
};

const TONE_CHIP: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-ink-soft',
  info: 'bg-brand-50 text-brand-700',
  good: 'bg-green-50 text-good',
  warn: 'bg-amber-50 text-warn',
  bad: 'bg-red-50 text-bad',
};

const SEVERITY_TONE: Record<EventSeverity, Tone> = { INFO: 'neutral', WARNING: 'warn', CRITICAL: 'bad' };

const EVENT_DISPLAY: Partial<Record<MonitoringEventType, { title: string; icon: Icon; good?: boolean }>> = {
  consent_accepted: { title: 'Consent given', icon: FileCheck },
  candidate_joined: { title: 'Candidate joined', icon: UserCheck, good: true },
  candidate_left: { title: 'Candidate left', icon: UserX },
  candidate_reconnecting: { title: 'Candidate reconnecting', icon: RefreshCw },
  candidate_reconnected: { title: 'Candidate reconnected', icon: Wifi, good: true },
  interviewer_joined: { title: 'Interviewer joined', icon: LogIn },
  interviewer_left: { title: 'Interviewer left', icon: LogOut },
  camera_connected: { title: 'Camera connected', icon: Camera, good: true },
  camera_disconnected: { title: 'Camera disconnected', icon: CameraOff },
  camera_permission_error: { title: 'Camera blocked', icon: CameraOff },
  calibration_passed: { title: 'Calibration passed', icon: Crosshair, good: true },
  monitoring_started: { title: 'Monitoring started', icon: Play, good: true },
  screen_detected: { title: 'Screen detected', icon: Monitor, good: true },
  screen_lost: { title: 'Screen lost', icon: MonitorOff },
  visibility_dropped: { title: 'Visibility dropped', icon: EyeOff },
  positioning_corrected: { title: 'Position corrected', icon: Move, good: true },
  video_stopped: { title: 'Video stopped', icon: Pause },
  video_resumed: { title: 'Video resumed', icon: Play, good: true },
  network_unstable: { title: 'Network unstable', icon: WifiOff },
  network_recovered: { title: 'Network recovered', icon: Wifi, good: true },
  app_backgrounded: { title: 'Candidate app in background', icon: Smartphone },
  app_foregrounded: { title: 'Candidate app back in focus', icon: Smartphone, good: true },
  session_ended: { title: 'Session ended', icon: Power },
  screen_app_review: { title: 'Review recommended', icon: Bot },
  screen_app_changed: { title: 'Application changed', icon: AppWindow },
};

const ALERT_TONE: Record<ScreenAlertLevel, Tone> = { HIGH: 'bad', MEDIUM: 'warn', LOW: 'info' };
const ALERT_LABEL: Record<ScreenAlertLevel, string> = {
  HIGH: 'Review recommended',
  MEDIUM: 'App changed',
  LOW: 'Normal',
};

const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '');

function Chip({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${TONE_CHIP[tone]}`}>{children}</span>;
}

function Item({
  icon: IconComponent,
  iconLabel,
  tone,
  title,
  time,
  emphasis,
  testId,
  children,
}: {
  icon: Icon;
  iconLabel: string;
  tone: Tone;
  title: ReactNode;
  time: string;
  emphasis?: boolean;
  testId?: string;
  children?: ReactNode;
}) {
  return (
    <li data-testid={testId} className="relative flex gap-3 px-4 py-2.5">
      <span
        className={`relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full ring-4 ring-white ${TONE_BADGE[tone]}`}
      >
        <IconComponent className="size-3.5" aria-label={iconLabel} />
      </span>
      <div
        className={`-my-1 min-w-0 flex-1 rounded-lg px-2.5 py-1.5 ${emphasis ? (tone === 'bad' ? 'bg-red-50/70' : 'bg-amber-50/70') : ''}`}
      >
        <div className="flex items-baseline justify-between gap-2">
          <p className="min-w-0 text-sm font-medium leading-5">{title}</p>
          <time className="shrink-0 text-[11px] tabular-nums text-ink-muted">{formatTime(time)}</time>
        </div>
        {children}
      </div>
    </li>
  );
}

/** Review events link to their stored screenshot through `metadata.screenAlertId`. */
const hasScreenshot = (event: MonitoringEventDTO) =>
  event.eventType === 'screen_app_review' && typeof event.metadata?.screenAlertId === 'string';

function EventItem({ event, onOpen }: { event: MonitoringEventDTO; onOpen?: (event: MonitoringEventDTO) => void }) {
  const display = EVENT_DISPLAY[event.eventType];
  const tone: Tone = event.severity === 'INFO' && display?.good ? 'good' : SEVERITY_TONE[event.severity];
  const title = display?.title ?? capitalize(event.eventType);
  const showMessage = event.message && normalize(event.message) !== normalize(title);
  return (
    <Item
      icon={display?.icon ?? SEVERITY_STYLES[event.severity].icon}
      iconLabel={SEVERITY_STYLES[event.severity].label}
      tone={tone}
      title={title}
      time={event.createdAt}
      emphasis={event.severity !== 'INFO'}
    >
      {showMessage ? <p className="mt-0.5 text-xs leading-5 text-ink-soft">{event.message}</p> : null}
      {onOpen && hasScreenshot(event) ? (
        <button
          type="button"
          onClick={() => onOpen(event)}
          data-testid="view-screenshot"
          className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-brand-700 hover:underline"
        >
          <ImageIcon className="size-3" aria-hidden /> View screenshot
        </button>
      ) : null}
    </Item>
  );
}

function ScreenItem({ entry, onOpen }: { entry: ScreenAnalysisEntry; onOpen?: (entry: ScreenAnalysisEntry) => void }) {
  const { result, error } = entry;
  const source = <Chip tone="neutral">AI scan</Chip>;

  if (!result || result.application === 'UNKNOWN') {
    return (
      <Item
        testId="screen-analysis-entry"
        icon={AppWindow}
        iconLabel="Screen analysis"
        tone="neutral"
        title={<span className="text-ink-muted">{result ? 'Screen unclear' : 'Frame skipped'}</span>}
        time={entry.at}
      >
        <p className="mt-0.5 text-xs leading-5 text-ink-muted">
          {result ? 'The AI could not read the screen in this frame.' : error}
        </p>
      </Item>
    );
  }

  const tone = ALERT_TONE[result.alert_level];
  const high = result.alert_level === 'HIGH';
  return (
    <Item
      testId="screen-analysis-entry"
      icon={result.category === 'AI_ASSISTANT' ? Bot : AppWindow}
      iconLabel={`Screen analysis: ${ALERT_LABEL[result.alert_level]}`}
      tone={tone}
      title={result.application}
      time={entry.at}
      emphasis={high}
    >
      <p className="mt-0.5 text-xs leading-5 text-ink-soft">{result.message || result.activity}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {source}
        <Chip tone="neutral">{CATEGORY_LABELS[result.category] ?? result.category}</Chip>
        {result.alert_level !== 'LOW' ? <Chip tone={tone}>{ALERT_LABEL[result.alert_level]}</Chip> : null}
        <span className="text-[11px] tabular-nums text-ink-muted">{Math.round(result.confidence * 100)}%</span>
        {high && onOpen ? (
          <button
            type="button"
            onClick={() => onOpen(entry)}
            className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-brand-700 hover:underline"
          >
            <ImageIcon className="size-3" aria-hidden /> {entry.image ? 'View frame' : 'Details'}
          </button>
        ) : null}
      </div>
    </Item>
  );
}

type Row = { at: string; event: MonitoringEventDTO } | { at: string; screen: ScreenAnalysisEntry };

/**
 * Timeline, newest first. Screen analysis responses, when given, are merged in
 * by time. They exist only in this browser; the server keeps just the
 * HIGH/MEDIUM ones, as ordinary events.
 */
export function EventTimeline({
  events,
  screenAnalyses = [],
  onOpenScreen,
  onOpenEvent,
}: {
  events: MonitoringEventDTO[];
  screenAnalyses?: ScreenAnalysisEntry[];
  onOpenScreen?: (entry: ScreenAnalysisEntry) => void;
  /** Opens a review event's stored screenshot. */
  onOpenEvent?: (event: MonitoringEventDTO) => void;
}) {
  const rows: Row[] = [
    ...events.map((event) => ({ at: event.createdAt, event })),
    ...screenAnalyses.map((screen) => ({ at: screen.at, screen })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  if (rows.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-ink-muted">No events yet.</p>;
  }
  return (
    <div className="relative py-2">
      {/* The line joining the icons, centred on them: 1rem padding + half of the 1.75rem badge. */}
      <span aria-hidden className="absolute bottom-6 left-[1.875rem] top-6 w-px bg-line" />
      <ol data-testid="event-timeline" className="relative">
        {rows.map((row) =>
          'screen' in row ? (
            <ScreenItem key={row.screen.id} entry={row.screen} onOpen={onOpenScreen} />
          ) : (
            <EventItem key={row.event.id} event={row.event} onOpen={onOpenEvent} />
          ),
        )}
      </ol>
    </div>
  );
}
