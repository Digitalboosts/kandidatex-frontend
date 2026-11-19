'use client';

import type { InterviewReport, InterviewSummaryDTO, MonitoringEventDTO } from '@/types';
import { Check, Copy, Film, ListChecks, Radio, Timer, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { use, useCallback, useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { EventTimeline } from '@/components/event-timeline';
import { InterviewSummary } from '@/components/interview-summary';
import { RecordingsView } from '@/components/recordings-list';
import { fromReviewEvent, fromStoredAlert, type ScreenAlert, ScreenAlertDialog } from '@/components/screen-alert-dialog';
import { ScreenAlertsGallery } from '@/components/screen-alerts-gallery';
import { Button, buttonClass, Card, ErrorNote, PageHeader, StatusBadge } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { formatDateTime, formatDuration } from '@/lib/format';

/** While live, the report changes every few seconds; afterwards only the summary and uploads still arrive. */
const POLL_LIVE_MS = 5000;
const POLL_ENDED_MS = 20_000;

function CopyRow({ label, value, testId }: { label: string; value: string; testId: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div>
      <p className="mb-1 text-sm font-medium">{label}</p>
      <div className="flex items-center gap-2">
        <code data-testid={testId} className="min-w-0 flex-1 truncate rounded-lg bg-canvas px-3 py-2 text-sm">
          {value}
        </code>
        <Button type="button" variant="secondary" onClick={copy} aria-label={`Copy ${label}`}>
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        </Button>
      </div>
    </div>
  );
}

/** The current time, ticking every second while `live`. */
function useNow(live: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!live) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [live]);
  return now;
}

function Fact({ icon: Icon, label, value, tone = 'text-ink' }: { icon: typeof Film; label: string; value: string; tone?: string }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-canvas text-ink-muted">
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-ink-muted">{label}</p>
        <p className={`text-lg font-semibold tabular-nums leading-6 ${tone}`}>{value}</p>
      </div>
    </Card>
  );
}

function SectionTitle({ children, count }: { children: string; count?: number }) {
  return (
    <h2 className="flex items-center gap-2 border-b border-line px-4 py-3 text-sm font-semibold">
      {children}
      {count !== undefined ? (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-ink-soft">{count}</span>
      ) : null}
    </h2>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );
}

export default function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState('');
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [viewing, setViewing] = useState<ScreenAlert | null>(null);

  /** One call for everything stored: interview, recordings, alerts, summary and timeline. */
  const load = useCallback(async () => {
    setReport(await api<InterviewReport>(`/api/interviews/${id}/report`));
  }, [id]);

  const status = report?.interview.status;
  const isEnded = status === 'COMPLETED' || status === 'CANCELLED';
  useEffect(() => {
    const timer = setTimeout(() => {
      setOrigin(window.location.origin);
      load().catch((caught) => setError(errorMessage(caught)));
    }, 0);
    const poll = setInterval(() => load().catch(() => undefined), isEnded ? POLL_ENDED_MS : POLL_LIVE_MS);
    return () => {
      clearTimeout(timer);
      clearInterval(poll);
    };
  }, [load, isEnded]);

  const now = useNow(status === 'ACTIVE');

  const setSummary = useCallback(
    (summary: InterviewSummaryDTO) => setReport((current) => (current ? { ...current, summary } : current)),
    [],
  );

  /** A review event opens its stored alert when the report has it, else whatever the event carries. */
  const openEvent = useCallback(
    (event: MonitoringEventDTO) => {
      const alertId = event.metadata?.screenAlertId;
      const stored = report?.screenAlerts.find((alert) => alert.id === alertId);
      setViewing(stored ? fromStoredAlert(stored) : fromReviewEvent(event));
    },
    [report],
  );

  /** Errors are shown inside the dialog, which stays open. */
  async function end() {
    await api(`/api/interviews/${id}/end`, { body: {} });
    setConfirmingEnd(false);
    await load().catch((caught) => setError(errorMessage(caught)));
  }

  if (!report) {
    return error ? <ErrorNote message={error} /> : <p className="text-sm text-ink-muted">Loading…</p>;
  }
  const { interview, recordings, screenAlerts, summary, events } = report;
  const ended = isEnded;
  const durationSeconds = interview.startedAt
    ? ((interview.endedAt ? new Date(interview.endedAt).getTime() : now) - new Date(interview.startedAt).getTime()) / 1000
    : null;
  const readyRecordings = recordings.filter((recording) => recording.status === 'READY').length;

  return (
    <>
      <PageHeader
        title={interview.title}
        description={`Candidate: ${interview.candidateName}`}
        action={
          ended ? null : (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setConfirmingEnd(true)}>
                End interview
              </Button>
              <Link href={`/interviews/${id}/live`} className={buttonClass()}>
                <Radio className="size-4" aria-hidden /> Open live monitor
              </Link>
            </div>
          )
        }
      />
      <ErrorNote message={error} />
      <ConfirmDialog
        open={confirmingEnd}
        title="End this interview?"
        description={
          <>
            The interview with <span className="font-medium text-ink">{interview.candidateName}</span> ends for everyone,
            and the candidate can no longer join. This can&apos;t be undone.
          </>
        }
        confirmLabel="End interview"
        busyLabel="Ending…"
        onConfirm={end}
        onCancel={() => setConfirmingEnd(false)}
      />
      <ScreenAlertDialog alert={viewing} onClose={() => setViewing(null)} />
      <section aria-label="At a glance" className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Fact
          icon={TriangleAlert}
          label="Screen alerts"
          value={String(screenAlerts.length)}
          tone={screenAlerts.length > 0 ? 'text-bad' : 'text-ink'}
        />
        <Fact icon={Film} label="Recordings ready" value={`${readyRecordings} / ${recordings.length}`} />
        <Fact icon={Timer} label={ended ? 'Duration' : 'Running for'} value={durationSeconds === null ? '—' : formatDuration(durationSeconds)} />
        <Fact icon={ListChecks} label="Timeline events" value={String(events.length)} />
      </section>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <Card className="space-y-4 p-5">
            <CopyRow label="Interview ID" value={interview.id} testId="interview-id" />
            <CopyRow label="Candidate joining link" value={`${origin}/join/${interview.id}`} testId="join-link" />
            <p className="text-xs text-ink-muted">
              Anyone with this ID and the candidate&apos;s name can join as the candidate, so share it only with them.
            </p>
          </Card>
          <Card className="p-5">
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-ink-muted">Status</dt>
                <dd className="mt-1" data-testid="interview-status">
                  <StatusBadge status={interview.status} />
                </dd>
              </div>
              <Detail label="Candidate" value={interview.candidateName} />
              <Detail label="Scheduled" value={formatDateTime(interview.scheduledAt)} />
              <Detail label="Candidate joined" value={formatDateTime(interview.candidateJoinedAt)} />
              <Detail label="Started" value={formatDateTime(interview.startedAt)} />
              <Detail label="Ended" value={formatDateTime(interview.endedAt)} />
            </dl>
          </Card>
        </div>
        <div className="space-y-4 lg:col-span-2">
          <InterviewSummary
            interviewId={id}
            summary={summary}
            alertCount={screenAlerts.length}
            ended={ended}
            onChange={setSummary}
          />
          <Card>
            <SectionTitle count={screenAlerts.length}>Screen alerts</SectionTitle>
            <ScreenAlertsGallery alerts={screenAlerts} onOpen={(alert) => setViewing(fromStoredAlert(alert))} />
          </Card>
          <Card>
            <SectionTitle count={recordings.length}>Recordings</SectionTitle>
            <RecordingsView recordings={recordings} />
          </Card>
          <Card>
            <SectionTitle count={events.length}>Event timeline</SectionTitle>
            <EventTimeline events={events} onOpenEvent={openEvent} />
          </Card>
        </div>
      </div>
    </>
  );
}
