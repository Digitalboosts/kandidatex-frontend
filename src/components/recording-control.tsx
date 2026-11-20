import { Circle, Square } from 'lucide-react';
import { formatBytes } from '@/lib/format';
import type { InterviewRecorder } from '@/lib/use-interview-recorder';
import { Button } from './ui';

/** Start/stop button for the live monitor. */
export function RecordingButton({ recorder }: { recorder: InterviewRecorder }) {
  if (!recorder.supported) return null;
  return recorder.state === 'idle' ? (
    <Button variant="secondary" onClick={recorder.start} data-testid="start-recording">
      <Circle className="size-3.5 fill-bad text-bad" aria-hidden /> Record
    </Button>
  ) : (
    <Button variant="secondary" onClick={recorder.stop} data-testid="stop-recording">
      <Square className="size-3.5 fill-ink text-ink" aria-hidden /> Stop recording
    </Button>
  );
}

/** Overlay on the video while recording, with upload progress. */
export function RecordingIndicator({ recorder }: { recorder: InterviewRecorder }) {
  const { state, progress, finishing } = recorder;
  if (state === 'idle' && finishing === 0) return null;

  let label: string;
  if (state === 'recording') label = 'REC';
  else if (state === 'waiting') label = 'Recording starts when video arrives';
  else label = 'Saving recording…';

  const backlog = progress ? progress.chunks - progress.uploaded : 0;
  const uploadError = progress?.uploadError ?? null;
  return (
    <div data-testid="recording-indicator" className="absolute left-3 top-3 max-w-[calc(100%-6rem)] space-y-1.5">
      <div className="flex w-fit items-center gap-2 rounded-md bg-black/70 px-2.5 py-1 text-xs font-medium text-white">
        <span className={`size-2 rounded-full ${state === 'recording' ? 'animate-pulse bg-red-500' : 'bg-slate-400'}`} aria-hidden />
        <span>{label}</span>
        {state === 'recording' && progress ? (
          <span className="tabular-nums text-slate-300">
            {formatBytes(progress.uploadedBytes)} uploaded{backlog > 1 ? ` · ${backlog} chunks queued` : ''}
          </span>
        ) : null}
      </div>
      {/* Chunks are retried, so this can clear by itself; until then the interviewer should know. */}
      {uploadError ? (
        <p role="status" data-testid="recording-upload-error" className="rounded-md bg-bad/90 px-2.5 py-1 text-xs text-white">
          Upload failing, retrying: {uploadError}
        </p>
      ) : null}
    </div>
  );
}
