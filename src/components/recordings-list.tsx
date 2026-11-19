'use client';

import type { RecordingDTO, RecordingStatus } from '@/types';
import { Play, X } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { formatBytes, formatDateTime, formatDuration } from '@/lib/format';
import { Button, ErrorNote } from './ui';

const STATUS_STYLES: Record<RecordingStatus, { label: string; className: string }> = {
  RECORDING: { label: 'Uploading', className: 'bg-brand-50 text-brand-700' },
  READY: { label: 'Ready', className: 'bg-green-50 text-good' },
  FAILED: { label: 'Failed', className: 'bg-red-50 text-bad' },
};

/** While a recording is still uploading, refresh so it turns playable without a reload. */
const REFRESH_MS = 10_000;

export function RecordingStatusBadge({ status }: { status: RecordingStatus }) {
  const { label, className } = STATUS_STYLES[status];
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>{label}</span>;
}

/**
 * Recordings, newest first, each playable in place once READY. The video
 * streams from the API through this origin, so the session cookie authorizes
 * it and seeking uses ordinary Range requests.
 */
export function RecordingsList({ interviewId, showInterview = false }: { interviewId?: string; showInterview?: boolean }) {
  const [recordings, setRecordings] = useState<RecordingDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const query = new URLSearchParams({ limit: '200' });
    if (interviewId) query.set('interviewId', interviewId);
    const body = await api<{ recordings: RecordingDTO[] }>(`/api/recordings?${query}`);
    setRecordings(body.recordings);
    setError(null);
  }, [interviewId]);

  const uploading = recordings?.some((recording) => recording.status === 'RECORDING') ?? false;
  useEffect(() => {
    const first = setTimeout(() => load().catch((caught) => setError(errorMessage(caught))), 0);
    const timer = uploading ? setInterval(() => load().catch(() => undefined), REFRESH_MS) : undefined;
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [load, uploading]);

  if (!recordings) {
    return error ? (
      <div className="p-4">
        <ErrorNote message={error} />
      </div>
    ) : (
      <p className="px-4 py-6 text-center text-sm text-ink-muted">Loading…</p>
    );
  }
  return <RecordingsView recordings={recordings} showInterview={showInterview} />;
}

/** The list itself, for pages that already have the recordings (such as the interview report). */
export function RecordingsView({ recordings, showInterview = false }: { recordings: RecordingDTO[]; showInterview?: boolean }) {
  const [playing, setPlaying] = useState<string | null>(null);
  if (recordings.length === 0) {
    return (
      <p data-testid="no-recordings" className="px-4 py-6 text-center text-sm text-ink-muted">
        No recordings yet. Start one from the live monitor.
      </p>
    );
  }

  return (
    <ul data-testid="recordings-list" className="divide-y divide-line">
      {recordings.map((recording) => (
        <li key={recording.id} className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="min-w-0 flex-1">
              {showInterview ? (
                <p className="truncate text-sm font-medium">
                  <Link href={`/interviews/${recording.interviewId}`} className="text-brand-700 hover:underline">
                    {recording.interviewTitle}
                  </Link>
                  <span className="font-normal text-ink-soft"> · {recording.candidateName}</span>
                </p>
              ) : null}
              <p className={showInterview ? 'text-xs text-ink-muted' : 'text-sm'}>
                {formatDateTime(recording.startedAt)}
                <span className="text-ink-muted">
                  {' '}
                  · {recording.durationSeconds !== null ? formatDuration(recording.durationSeconds) : '—'} ·{' '}
                  {formatBytes(recording.sizeBytes)}
                </span>
              </p>
            </div>
            <RecordingStatusBadge status={recording.status} />
            {recording.videoUrl ? (
              playing === recording.id ? (
                <Button variant="secondary" onClick={() => setPlaying(null)} aria-label="Close player">
                  <X className="size-4" aria-hidden /> Close
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => setPlaying(recording.id)} data-testid="play-recording">
                  <Play className="size-4" aria-hidden /> Play
                </Button>
              )
            ) : null}
          </div>
          {playing === recording.id && recording.videoUrl ? (
            <video
              key={recording.id}
              data-testid="recording-player"
              controls
              autoPlay
              preload="metadata"
              src={recording.videoUrl}
              className="mt-3 aspect-video w-full rounded-lg bg-slate-900"
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}
