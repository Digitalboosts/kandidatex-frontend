'use client';

import { useEffect, useState } from 'react';
import { Button, Card } from '@/components/ui';
import { INSECURE_CONTEXT_MESSAGE, isPermissionError, mediaSupported } from '@/lib/candidate-camera';
import { Notice, StatusRow, StepShell } from './candidate-ui';

type PermissionValue = 'granted' | 'denied' | 'prompt' | 'unknown';

function Reason({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-6 text-ink-soft">{body}</p>
    </div>
  );
}

/** Reads the current permission without prompting. Not every browser can answer, so "unknown" is normal. */
function usePermission(name: 'camera' | 'microphone', refreshKey: number): PermissionValue {
  const [value, setValue] = useState<PermissionValue>('unknown');
  useEffect(() => {
    let status: PermissionStatus | null = null;
    let cancelled = false;
    const onChange = () => status && setValue(status.state);
    navigator.permissions
      ?.query({ name: name as PermissionName })
      .then((result) => {
        if (cancelled) return;
        status = result;
        setValue(result.state);
        result.addEventListener('change', onChange);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      status?.removeEventListener('change', onChange);
    };
  }, [name, refreshKey]);
  return value;
}

const LABEL: Record<PermissionValue, { value: string; tone: 'good' | 'warn' | 'bad' }> = {
  granted: { value: 'Allowed', tone: 'good' },
  denied: { value: 'Blocked', tone: 'bad' },
  prompt: { value: 'Not allowed', tone: 'warn' },
  unknown: { value: 'Not allowed', tone: 'warn' },
};

export function PermissionsStep({ onGranted }: { onGranted: () => void }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const camera = usePermission('camera', refreshKey);
  const microphone = usePermission('microphone', refreshKey);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);

  async function requestAll() {
    setError(null);
    if (!mediaSupported()) {
      setError(INSECURE_CONTEXT_MESSAGE);
      return;
    }
    setRequesting(true);
    try {
      // Asking once for both shows a single browser prompt. The tracks are only
      // needed for the answer, so they're stopped straight away.
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach((track) => track.stop());
      onGranted();
    } catch (caught) {
      setRefreshKey((key) => key + 1);
      setError(
        isPermissionError(caught)
          ? 'Both camera and microphone are needed to join. If you declined before, the browser won’t ask again: allow them for this site in your browser settings (the camera icon in the address bar), then select Continue.'
          : 'No camera or microphone could be opened. Check one is connected and not in use by another app, then try again.',
      );
    } finally {
      setRequesting(false);
    }
  }

  return (
    <StepShell>
      <Card className="p-6">
        <h1 className="text-xl font-semibold">Camera and microphone</h1>
        <p className="mt-2 text-sm text-ink-soft">Here&apos;s why this page needs them, before your browser asks you.</p>
        <div className="mt-5 space-y-4">
          <Reason
            title="Camera"
            body="Shows your laptop screen to your interviewer, and lets this page check the screen is in view. Frames for that check are processed in this browser and aren't stored."
          />
          <Reason title="Microphone" body="Lets your interviewer hear you during the session." />
          <Reason
            title="While monitoring"
            body="Video and audio go live to your interviewer only while the session runs, and stop when it ends. Your interviewer may record the session, and frames may be analysed by an AI service to identify the application on your screen; frames flagged for review are stored for your interviewer."
          />
        </div>
        <div className="mt-5 rounded-lg bg-canvas px-3 py-1">
          <StatusRow label="Camera" {...LABEL[camera]} />
          <StatusRow label="Microphone" {...LABEL[microphone]} />
        </div>
        {error ? (
          <div className="mt-4">
            <Notice text={error} />
          </div>
        ) : null}
        <Button data-testid="grant-permissions" className="mt-5 w-full" onClick={requestAll} disabled={requesting}>
          {requesting ? 'Waiting for your browser…' : 'Continue'}
        </Button>
      </Card>
    </StepShell>
  );
}
