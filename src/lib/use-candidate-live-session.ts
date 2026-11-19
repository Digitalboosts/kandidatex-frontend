'use client';

import { CANDIDATE_IDENTITY_PREFIX, type CandidateInterviewDTO, REALTIME_TOPIC, type RealtimeMessage } from '@/types';
import {
  ConnectionQuality,
  DisconnectReason,
  type LocalParticipant,
  type LocalVideoTrack,
  Room,
  RoomEvent,
  Track,
  VideoPresets,
} from 'livekit-client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CandidateApiError, getInterview, getLiveKitToken, isInterviewEnded, reportEvent } from './candidate-api';
import { type CameraChoice, isPermissionError } from './candidate-camera';

export interface CandidateSession {
  token: string;
  interview: CandidateInterviewDTO;
  readinessThreshold: number;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
export type CameraStatus = 'starting' | 'streaming' | 'error';

export interface EndedInfo {
  endedBy?: 'interviewer' | 'candidate' | 'system';
  message?: string;
}

export interface LiveSessionState {
  connection: ConnectionStatus;
  camera: CameraStatus;
  cameraError: string | null;
  online: boolean;
  poorNetwork: boolean;
  interviewerPresent: boolean;
  /** What the interviewer's stream analysis currently wants fixed, if anything. */
  notice: string | null;
  track: LocalVideoTrack | undefined;
  ended: EndedInfo | null;
  startedAt: number | null;
}

const RECONNECT_DELAY_MS = 3000;
const STATUS_POLL_MS = 10000;
/** The calibration preview may take a moment to let go of the camera. */
const CAMERA_ATTEMPTS = 5;
const CAMERA_RETRY_MS = 800;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function publishCamera(participant: LocalParticipant, choice: CameraChoice): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < CAMERA_ATTEMPTS; attempt++) {
    try {
      await participant.setCameraEnabled(true, {
        ...(choice.deviceId
          ? { deviceId: { exact: choice.deviceId } }
          : { facingMode: choice.facing === 'front' ? 'user' : 'environment' }),
        resolution: VideoPresets.h720.resolution,
      });
      return;
    } catch (error) {
      lastError = error;
      if (isPermissionError(error)) break;
      await wait(CAMERA_RETRY_MS);
    }
  }
  throw lastError;
}

/**
 * The candidate's live session: it owns the candidate's
 * LiveKit connection, publishes the camera and microphone, reconnects with fresh
 * tokens, and notices the end of the session through any of three routes (a
 * realtime message, the room being deleted, or polling).
 */
export function useCandidateLiveSession(session: CandidateSession, choice: CameraChoice) {
  const { token, interview } = session;
  const interviewId = interview.id;
  const choiceKey = choice.key;
  const choiceRef = useRef(choice);
  useEffect(() => {
    choiceRef.current = choice;
  }, [choice]);

  const [state, setState] = useState<LiveSessionState>(() => ({
    connection: 'connecting',
    camera: 'starting',
    cameraError: null,
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    poorNetwork: false,
    interviewerPresent: false,
    notice: null,
    track: undefined,
    ended: null,
    startedAt: null,
  }));
  const update = useCallback((patch: Partial<LiveSessionState>) => {
    setState((current) => ({ ...current, ...patch }));
  }, []);

  const endedRef = useRef(false);
  const markEnded = useCallback(
    (info: EndedInfo) => {
      if (endedRef.current) return;
      endedRef.current = true;
      update({ ended: info });
    },
    [update],
  );

  const report = useCallback(
    (eventType: Parameters<typeof reportEvent>[2]) => {
      reportEvent(token, interviewId, eventType).catch((error) => {
        if (isInterviewEnded(error)) markEnded({});
      });
    },
    [token, interviewId, markEnded],
  );

  const cameraRetry = useRef<() => void>(() => undefined);

  useEffect(() => {
    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    const room = new Room({
      adaptiveStream: false,
      dynacast: false,
      publishDefaults: { simulcast: false, videoEncoding: VideoPresets.h720.encoding },
    });

    const refreshTrack = () => {
      const publication = room.localParticipant.getTrackPublication(Track.Source.Camera);
      update({ track: publication?.videoTrack });
    };

    const refreshInterviewer = () => {
      const present = [...room.remoteParticipants.values()].some(
        (participant) => !participant.identity.startsWith(CANDIDATE_IDENTITY_PREFIX),
      );
      update({ interviewerPresent: present });
    };

    const startCamera = async () => {
      update({ camera: 'starting', cameraError: null });
      try {
        await publishCamera(room.localParticipant, choiceRef.current);
        if (disposed) return;
        refreshTrack();
        update({ camera: 'streaming' });
        setState((current) => ({ ...current, startedAt: current.startedAt ?? Date.now() }));
      } catch (error) {
        if (disposed) return;
        const denied = isPermissionError(error);
        update({
          camera: 'error',
          cameraError: denied
            ? 'Camera access is blocked. Allow it for this site in your browser settings, then try again.'
            : 'The camera could not be started. Close other apps or tabs using it and try again.',
        });
        if (denied) report('camera_permission_error');
      }
      // The microphone is secondary: losing it shouldn't stop the video monitoring.
      await room.localParticipant.setMicrophoneEnabled(true).catch(() => undefined);
    };
    cameraRetry.current = () => void startCamera();

    const connect = async () => {
      if (disposed || endedRef.current) return;
      update({ connection: 'connecting' });
      try {
        const credentials = await getLiveKitToken(token, interviewId);
        if (disposed) return;
        await room.connect(credentials.url, credentials.token);
        if (disposed) return;
        update({ connection: 'connected' });
        refreshInterviewer();
        await startCamera();
      } catch (error) {
        if (disposed) return;
        if (isInterviewEnded(error)) {
          markEnded({});
          return;
        }
        update({ connection: 'disconnected' });
        reconnectTimer = setTimeout(() => void connect(), RECONNECT_DELAY_MS);
        if (!(error instanceof CandidateApiError)) console.warn('LiveKit connection failed', error);
      }
    };

    room
      .on(RoomEvent.Reconnecting, () => {
        update({ connection: 'reconnecting' });
        report('candidate_reconnecting');
      })
      .on(RoomEvent.Reconnected, () => {
        update({ connection: 'connected' });
        report('candidate_reconnected');
      })
      .on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
        if (disposed) return;
        update({ connection: 'disconnected', track: undefined, camera: 'starting', interviewerPresent: false });
        if (reason === DisconnectReason.ROOM_DELETED) {
          markEnded({});
        } else if (reason === DisconnectReason.DUPLICATE_IDENTITY) {
          markEnded({ message: 'This interview was opened in another browser or device, so it was closed here.' });
        } else {
          // LiveKit gave up on resuming. Start over with a fresh token, as the old one may have expired.
          reconnectTimer = setTimeout(() => void connect(), RECONNECT_DELAY_MS);
        }
      })
      .on(RoomEvent.ParticipantConnected, refreshInterviewer)
      .on(RoomEvent.ParticipantDisconnected, refreshInterviewer)
      .on(RoomEvent.LocalTrackPublished, refreshTrack)
      .on(RoomEvent.LocalTrackUnpublished, refreshTrack)
      .on(RoomEvent.MediaDevicesError, () => {
        update({ camera: 'error', cameraError: 'The camera stopped working. Try starting it again.' });
      })
      .on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
        if (participant.isLocal) {
          update({ poorNetwork: quality === ConnectionQuality.Poor || quality === ConnectionQuality.Lost });
        }
      })
      .on(RoomEvent.DataReceived, (payload, _participant, _kind, topic) => {
        if (topic !== REALTIME_TOPIC) return;
        let message: RealtimeMessage;
        try {
          message = JSON.parse(new TextDecoder().decode(payload)) as RealtimeMessage;
        } catch {
          return;
        }
        if (message.type === 'session_ended') {
          markEnded({ endedBy: message.endedBy });
        } else if (message.type === 'event') {
          const { eventType } = message.event;
          if (eventType === 'screen_lost') {
            update({ notice: 'Your screen is no longer visible to the interviewer. Please reposition the camera.' });
          } else if (eventType === 'visibility_dropped') {
            update({ notice: 'Part of your screen is out of view. Please reposition the camera.' });
          } else if (eventType === 'screen_detected' || eventType === 'positioning_corrected') {
            update({ notice: null });
          }
        }
      });

    void connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      room.removeAllListeners();
      void room.disconnect();
    };
  }, [token, interviewId, choiceKey, update, report, markEnded]);

  // A fallback for missing the realtime message, for example while offline.
  useEffect(() => {
    const timer = setInterval(() => {
      getInterview(token, interviewId)
        .then(({ interview: current }) => {
          if (current.status === 'COMPLETED' || current.status === 'CANCELLED') markEnded({});
        })
        .catch(() => undefined);
    }, STATUS_POLL_MS);
    return () => clearInterval(timer);
  }, [token, interviewId, markEnded]);

  // Tracks the browser's own view of whether it's online.
  useEffect(() => {
    const offline = () => update({ online: false });
    const online = () => {
      update({ online: true });
      report('network_recovered');
    };
    window.addEventListener('offline', offline);
    window.addEventListener('online', online);
    return () => {
      window.removeEventListener('offline', offline);
      window.removeEventListener('online', online);
    };
  }, [update, report]);

  // Switching tab or app, or locking a phone, can pause the camera, so the interviewer should know.
  useEffect(() => {
    const onVisibility = () => report(document.visibilityState === 'hidden' ? 'app_backgrounded' : 'app_foregrounded');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [report]);

  const retryCamera = useCallback(() => cameraRetry.current(), []);

  return { state, retryCamera };
}

/** Keeps the screen on while live: a sleeping phone stops the camera, and with it the session. */
export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let disposed = false;
    const acquire = () => {
      if (document.visibilityState !== 'visible') return;
      navigator.wakeLock
        .request('screen')
        .then((sentinel) => {
          if (disposed) void sentinel.release();
          else lock = sentinel;
        })
        .catch(() => undefined);
    };
    acquire();
    // The browser drops the lock whenever the page is hidden.
    document.addEventListener('visibilitychange', acquire);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', acquire);
      void lock?.release().catch(() => undefined);
    };
  }, [enabled]);
}
