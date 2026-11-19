import type { RecordingContentType, RecordingDTO } from '@/types';
import { api, ApiRequestError, apiPutBlob } from './api';

/** About 5 s of video per chunk, far below the 16 MB chunk limit. */
const CHUNK_MS = 5000;
const MAX_ATTEMPTS = 6;
const MAX_BACKOFF_MS = 30_000;

/** Errors a retry can't fix. Anything else (network, 429, 5xx) is retried. */
const PERMANENT = new Set([400, 401, 403, 404, 409, 413]);

const MIME_CANDIDATES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
  'video/mp4',
];

export const recordingSupported = () => typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined';

function pickMimeType(hasAudio: boolean): string | undefined {
  return MIME_CANDIDATES.filter((type) => hasAudio || !type.includes('opus')).find((type) =>
    MediaRecorder.isTypeSupported(type),
  );
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface RecordingProgress {
  recordingId: string | null;
  /** Chunks the recorder produced so far. */
  chunks: number;
  /** Chunks the server has acknowledged. */
  uploaded: number;
  uploadedBytes: number;
  /** The last upload problem, cleared by the next success. */
  uploadError: string | null;
}

/**
 * One recording: records a MediaStream with MediaRecorder and uploads it in
 * numbered chunks (POST /api/recordings, PUT …/chunks/{i}, POST …/complete).
 * Chunks are uploaded one at a time, in order, and retried; a chunk is kept in
 * memory only until the server has it.
 */
export class RecordingSession {
  private recorder: MediaRecorder | null = null;
  private recordingId: string | null = null;
  private nextIndex = 0;
  private readonly unsent = new Map<number, Blob>();
  private readonly acknowledged = new Set<number>();
  private uploadedBytes = 0;
  private uploadError: string | null = null;
  private queue: Promise<void> = Promise.resolve();
  private startedAt = 0;
  private starting: Promise<void> | null = null;
  private stopping: Promise<RecordingDTO | null> | null = null;
  private completed = false;

  constructor(
    private readonly interviewId: string,
    private readonly stream: MediaStream,
    private readonly onProgress: (progress: RecordingProgress) => void,
  ) {}

  /** Creates the recording on the server, then starts recording. Throws ApiRequestError if the server refuses. */
  start(): Promise<void> {
    this.starting ??= this.begin();
    return this.starting;
  }

  private async begin(): Promise<void> {
    const mimeType = pickMimeType(this.stream.getAudioTracks().length > 0);
    const recorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);
    const contentType: RecordingContentType = recorder.mimeType.startsWith('video/mp4') ? 'video/mp4' : 'video/webm';

    const { recording } = await api<{ recording: RecordingDTO }>('/api/recordings', {
      body: { interviewId: this.interviewId, contentType },
    });
    this.recordingId = recording.id;
    this.recorder = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.enqueue(this.nextIndex++, event.data);
    };
    window.addEventListener('pagehide', this.onPageHide);
    this.startedAt = Date.now();
    recorder.start(CHUNK_MS);
    this.report();
  }

  /** Stops recording, waits for every chunk to upload and completes the recording. Safe to call twice. */
  stop(): Promise<RecordingDTO | null> {
    this.stopping ??= this.finish();
    return this.stopping;
  }

  private async finish(): Promise<RecordingDTO | null> {
    // A stop that arrives mid-start waits for it, so a recorder never starts after being stopped.
    await this.starting?.catch(() => undefined);
    const recorder = this.recorder;
    if (!recorder || !this.recordingId) return null;
    const durationSeconds = Math.round((Date.now() - this.startedAt) / 1000);
    if (recorder.state !== 'inactive') {
      // The last chunk arrives in a dataavailable event just before `stop`.
      const stopped = new Promise((resolve) => recorder.addEventListener('stop', resolve, { once: true }));
      recorder.stop();
      await stopped;
    }
    await this.queue;
    if (this.nextIndex === 0) {
      window.removeEventListener('pagehide', this.onPageHide);
      return null;
    }
    const path = `/api/recordings/${this.recordingId}/complete`;
    const body = { chunkCount: this.nextIndex, durationSeconds };
    try {
      return await this.complete(path, body);
    } catch (caught) {
      // Upload whatever the server says is missing (if we still have it), then try once more.
      const missing = caught instanceof ApiRequestError && caught.code === 'chunks_missing'
        ? ((caught.details as { missing?: number[] } | undefined)?.missing ?? [])
        : null;
      if (!missing || missing.some((index) => !this.unsent.has(index))) throw caught;
      missing.forEach((index) => this.enqueue(index, this.unsent.get(index)!));
      await this.queue;
      return await this.complete(path, body);
    } finally {
      window.removeEventListener('pagehide', this.onPageHide);
    }
  }

  private async complete(path: string, body: { chunkCount: number; durationSeconds: number }) {
    const { recording } = await api<{ recording: RecordingDTO }>(path, { body });
    this.completed = true;
    return recording;
  }

  private enqueue(index: number, blob: Blob) {
    this.unsent.set(index, blob);
    this.report();
    this.queue = this.queue.then(() => this.upload(index, blob));
  }

  private async upload(index: number, blob: Blob) {
    if (this.acknowledged.has(index)) return;
    for (let attempt = 1; ; attempt++) {
      try {
        await apiPutBlob(`/api/recordings/${this.recordingId}/chunks/${index}`, blob);
        this.unsent.delete(index);
        this.acknowledged.add(index);
        this.uploadedBytes += blob.size;
        this.uploadError = null;
        this.report();
        return;
      } catch (caught) {
        const status = caught instanceof ApiRequestError ? caught.status : 0;
        this.uploadError = caught instanceof Error ? caught.message : 'Upload failed';
        this.report();
        // Give up on this chunk but keep it: `complete` reports it missing and it is tried again there.
        if (PERMANENT.has(status) || attempt >= MAX_ATTEMPTS) return;
        await wait(Math.min(1000 * 2 ** (attempt - 1), MAX_BACKOFF_MS));
      }
    }
  }

  /**
   * The tab is closing, so nothing async will finish. Complete the recording
   * with the chunks already uploaded so at least those are playable.
   */
  private readonly onPageHide = () => {
    if (this.completed || !this.recordingId) return;
    let contiguous = 0;
    while (this.acknowledged.has(contiguous)) contiguous++;
    if (contiguous === 0) return;
    void fetch(`/api/recordings/${this.recordingId}/complete`, {
      method: 'POST',
      credentials: 'same-origin',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chunkCount: contiguous, durationSeconds: Math.round((Date.now() - this.startedAt) / 1000) }),
    }).catch(() => undefined);
  };

  private report() {
    this.onProgress({
      recordingId: this.recordingId,
      chunks: this.nextIndex,
      uploaded: this.acknowledged.size,
      uploadedBytes: this.uploadedBytes,
      uploadError: this.uploadError,
    });
  }
}
