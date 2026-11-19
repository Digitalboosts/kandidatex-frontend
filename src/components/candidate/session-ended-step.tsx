'use client';

import { Button, Card } from '@/components/ui';
import type { EndedInfo } from '@/lib/use-candidate-live-session';
import { StepShell } from './candidate-ui';

const REASONS = {
  interviewer: 'Your interviewer ended the session.',
  candidate: 'You ended the session.',
  system: 'The session was closed.',
};

export function SessionEndedStep({ info, onDone }: { info?: EndedInfo; onDone: () => void }) {
  const message = info?.message ?? (info?.endedBy ? REASONS[info.endedBy] : 'This interview has ended.');
  return (
    <StepShell>
      <Card className="p-6">
        <h1 data-testid="session-ended" className="text-xl font-semibold">
          Session ended
        </h1>
        <p className="mt-3 text-base">{message}</p>
        <p className="mt-2 text-sm text-ink-soft">Your camera and microphone are off. You can close this tab.</p>
        <Button variant="secondary" className="mt-5 w-full" onClick={onDone}>
          Done
        </Button>
      </Card>
    </StepShell>
  );
}
