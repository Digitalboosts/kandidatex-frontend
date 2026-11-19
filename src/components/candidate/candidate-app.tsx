'use client';

import { useState } from 'react';
import { BACK_CAMERA, type CameraChoice } from '@/lib/candidate-camera';
import type { CandidateSession, EndedInfo } from '@/lib/use-candidate-live-session';
import { CalibrationStep } from './calibration-step';
import { CameraSelectionStep } from './camera-selection-step';
import { LiveMonitoringStep } from './live-monitoring-step';
import { PermissionsStep } from './permissions-step';
import { SessionEndedStep } from './session-ended-step';
import { WelcomeStep } from './welcome-step';

type Step = 'welcome' | 'permissions' | 'camera' | 'calibration' | 'live' | 'ended';

/**
 * The candidate's whole session in the browser: join, permissions, camera choice,
 * calibration, live monitoring, ended.
 * The session is held in memory only, so closing the tab leaves no credential behind.
 */
export function CandidateApp({ interviewId }: { interviewId: string }) {
  const [step, setStep] = useState<Step>('welcome');
  const [session, setSession] = useState<CandidateSession | null>(null);
  // The back camera is the default because it's the one pointed at the laptop.
  const [camera, setCamera] = useState<CameraChoice>(BACK_CAMERA);
  const [ended, setEnded] = useState<EndedInfo | undefined>(undefined);

  const showEnded = (info?: EndedInfo) => {
    setEnded(info);
    setStep('ended');
  };

  if (step === 'ended') {
    return (
      <SessionEndedStep
        info={ended}
        onDone={() => {
          setSession(null);
          setEnded(undefined);
          setStep('welcome');
        }}
      />
    );
  }

  if (step === 'welcome' || !session) {
    return (
      <WelcomeStep
        linkedId={interviewId}
        onJoined={(joined) => {
          setSession(joined);
          setStep('permissions');
        }}
      />
    );
  }

  switch (step) {
    case 'permissions':
      return <PermissionsStep onGranted={() => setStep('camera')} />;
    case 'camera':
      return <CameraSelectionStep camera={camera} onChange={setCamera} onContinue={() => setStep('calibration')} />;
    case 'calibration':
      return (
        <CalibrationStep
          session={session}
          camera={camera}
          onCameraChange={setCamera}
          onPassed={() => setStep('live')}
          onEnded={showEnded}
        />
      );
    case 'live':
      return <LiveMonitoringStep session={session} camera={camera} onEnded={showEnded} />;
  }
}
