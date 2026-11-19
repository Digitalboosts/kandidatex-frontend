'use client';

import type { RecordingDTO } from '@/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from './api';
import { type RecordingProgress, RecordingSession, recordingSupported } from './recording-session';

export type RecorderState =
  /** Not recording. */
  | 'idle'
  /** Asked to record, but the candidate isn't sending video right now. Recording resumes when they are. */
  | 'waiting'
  | 'recording';

export interface InterviewRecorder {
  supported: boolean;
  state: RecorderState;
  progress: RecordingProgress | null;
  /** Segments still uploading their last chunks or being completed. */
  finishing: number;
  /** Recordings completed during this visit, newest last. */
  saved: RecordingDTO[];
  error: string | null;
  start: () => void;
  stop: () => void;
}

/**
 * Records the candidate's video (and microphone, when present) while `active`.
 * Every unbroken stretch of video becomes one recording: if the candidate's
 * camera track ends or is replaced (for example after a reconnect), the
 * current recording is completed and a new one starts on the new track.
 */
export function useInterviewRecorder(
  interviewId: string,
  videoTrack: MediaStreamTrack | undefined,
  audioTrack: MediaStreamTrack | undefined,
): InterviewRecorder {
  const [active, setActive] = useState(false);
  const [recording, setRecording] = useState(false);
  const [progress, setProgress] = useState<RecordingProgress | null>(null);
  const [finishing, setFinishing] = useState(0);
  const [saved, setSaved] = useState<RecordingDTO[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Audio is read when a segment starts rather than being a dependency, so the
  // microphone appearing or dropping doesn't split the recording.
  const audioRef = useRef(audioTrack);
  useEffect(() => {
    audioRef.current = audioTrack;
  }, [audioTrack]);

  useEffect(() => {
    if (!active || !videoTrack || videoTrack.readyState === 'ended') return;
    const tracks = [videoTrack];
    if (audioRef.current && audioRef.current.readyState === 'live') tracks.push(audioRef.current);
    const session = new RecordingSession(interviewId, new MediaStream(tracks), setProgress);
    let cancelled = false;

    session
      .start()
      .then(() => {
        if (cancelled) return;
        setRecording(true);
        setError(null);
      })
      .catch((caught) => {
        if (cancelled) return;
        setError(errorMessage(caught));
        setActive(false);
      });

    return () => {
      cancelled = true;
      setRecording(false);
      setFinishing((count) => count + 1);
      // Finishes in the background, even after this component unmounts.
      session
        .stop()
        .then((done) => {
          if (done) setSaved((current) => [...current, done]);
        })
        .catch((caught) => setError(`Recording could not be saved: ${errorMessage(caught)}`))
        .finally(() => setFinishing((count) => count - 1));
    };
  }, [active, videoTrack, interviewId]);

  const start = useCallback(() => {
    setError(null);
    setActive(true);
  }, []);
  const stop = useCallback(() => setActive(false), []);

  return {
    supported: recordingSupported(),
    state: !active ? 'idle' : recording ? 'recording' : 'waiting',
    progress,
    finishing,
    saved,
    error,
    start,
    stop,
  };
}
