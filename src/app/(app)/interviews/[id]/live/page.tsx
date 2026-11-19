'use client';

import type { InterviewDTO, LiveKitTokenResponse } from '@/types';
import { LiveKitRoom } from '@livekit/components-react';
import { DisconnectReason } from 'livekit-client';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { use, useCallback, useEffect, useState } from 'react';
import { LiveMonitor } from '@/components/live-monitor';
import { Card, ErrorNote } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';

const RECONNECT_DELAY_MS = 4000;
const roomOptions = {
  // The analyzer needs full frames regardless of the player's size or visibility.
  adaptiveStream: false,
  dynacast: false,
};

export default function LivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [interview, setInterview] = useState<InterviewDTO | null>(null);
  const [connection, setConnection] = useState<LiveKitTokenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshInterview = useCallback(async () => {
    const body = await api<{ interview: InterviewDTO }>(`/api/interviews/${id}`);
    setInterview(body.interview);
    return body.interview;
  }, [id]);

  // Each change of `attempt` makes one connection attempt. Retrying is just bumping it.
  const [attempt, setAttempt] = useState(0);
  const retrySoon = useCallback(() => {
    setTimeout(() => setAttempt((current) => current + 1), RECONNECT_DELAY_MS);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function connect() {
      try {
        const current = await refreshInterview();
        if (cancelled) return;
        if (current.status === 'COMPLETED' || current.status === 'CANCELLED') {
          setConnection(null);
          return;
        }
        const next = await api<LiveKitTokenResponse>('/api/livekit/token', { body: { interviewId: id } });
        if (cancelled) return;
        setConnection(next);
        setError(null);
      } catch (caught) {
        if (cancelled) return;
        setError(errorMessage(caught));
        retrySoon();
      }
    }
    const timer = setTimeout(() => void connect(), 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [attempt, id, refreshInterview, retrySoon]);

  /** A fresh token is needed for a new connection: the old one may have expired by now. */
  const onDisconnected = useCallback(
    (reason?: DisconnectReason) => {
      setConnection(null);
      if (reason === DisconnectReason.CLIENT_INITIATED) return;
      if (reason === DisconnectReason.ROOM_DELETED) {
        void refreshInterview();
        return;
      }
      retrySoon();
    },
    [refreshInterview, retrySoon],
  );

  const ended = interview?.status === 'COMPLETED' || interview?.status === 'CANCELLED';

  return (
    <>
      <Link href={`/interviews/${id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Interview details
      </Link>
      <ErrorNote message={error} />
      {ended ? (
        <Card className="mt-4 p-8 text-center">
          <p data-testid="session-ended" className="font-medium">This session has ended.</p>
          <p className="mt-1 text-sm text-ink-soft">
            The report, with the AI summary, screen alerts, recordings and timeline, is on the{' '}
            <Link href={`/interviews/${id}`} className="text-brand-700 hover:underline">
              interview details page
            </Link>
            .
          </p>
        </Card>
      ) : null}
      {!ended && interview && connection ? (
        <LiveKitRoom
          serverUrl={connection.url}
          token={connection.token}
          connect
          audio={false}
          video={false}
          options={roomOptions}
          onDisconnected={onDisconnected}
          onError={(caught) => setError(caught.message)}
        >
          <LiveMonitor interview={interview} onInterviewChanged={setInterview} />
        </LiveKitRoom>
      ) : null}
      {!ended && !connection && !error ? <p className="text-sm text-ink-muted">Connecting…</p> : null}
    </>
  );
}
