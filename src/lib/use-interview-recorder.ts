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

/** Remembers, per interview and per browser, that the interviewer switched recording off. */
const stoppedKey = (interviewId: string) => `kandidatex:recording-stopped:${interviewId}`;

function rememberStopped(interviewId: string, stopped: boolean) {
  try {
    if (stopped) localStorage.setItem(stoppedKey(interviewId), '1');
    else localStorage.removeItem(stoppedKey(interviewId));
  } catch {
    // Storage blocked (private mode): auto-recording simply turns back on after a reload.
  }
}

function wasStopped(interviewId: string): boolean {
  try {
    return localStorage.getItem(stoppedKey(interviewId)) === '1';
  } catch {
    return false;
  }
}

/**
 * Records the candidate's video (and microphone, when present) while `active`.
 * With `autoStart`, recording is on from the start (it begins as soon as video
 * arrives) unless the interviewer stopped it by hand for this interview.
 * Every unbroken stretch of video becomes one recording: if the candidate's
 * camera track ends or is replaced (for example after a reconnect), the
 * current recording is completed and a new one starts on the new track.
 */
export function useInterviewRecorder(
  interviewId: string,
  videoTrack: MediaStreamTrack | undefined,
  audioTrack: MediaStreamTrack | undefined,
  { autoStart = false }: { autoStart?: boolean } = {},
): InterviewRecorder {
  /** What the interviewer chose during this visit; null until they press a button. */
  const [choice, setChoice] = useState<'on' | 'off' | null>(null);
  /** A stop from an earlier visit to this page. */
  const [stoppedBefore] = useState(() => wasStopped(interviewId));
  // `autoStart` may turn true a moment after mount, once the signed-in user is known.
  const active = choice === 'on' || (choice === null && autoStart && !stoppedBefore);
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
        // Off for this visit only: the next visit tries again.
        setChoice('off');
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
    rememberStopped(interviewId, false);
    setError(null);
    setChoice('on');
  }, [interviewId]);
  const stop = useCallback(() => {
    rememberStopped(interviewId, true);
    setChoice('off');
  }, [interviewId]);

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
