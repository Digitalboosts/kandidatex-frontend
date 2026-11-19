'use client';

import { type FormEvent, useState } from 'react';
import { Button, Card, Field } from '@/components/ui';
import { CandidateApiError, joinInterview } from '@/lib/candidate-api';
import type { CandidateSession } from '@/lib/use-candidate-live-session';
import { Notice, StepShell } from './candidate-ui';

export function WelcomeStep({ linkedId, onJoined }: { linkedId: string; onJoined: (session: CandidateSession) => void }) {
  const [interviewId, setInterviewId] = useState(linkedId);
  const [candidateName, setCandidateName] = useState('');
  const [consented, setConsented] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const joined = await joinInterview(interviewId.trim(), candidateName.trim());
      onJoined({ token: joined.token, interview: joined.interview, readinessThreshold: joined.readinessThreshold });
    } catch (caught) {
      setError(caught instanceof CandidateApiError ? caught.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  const canStart = interviewId.trim().length > 0 && candidateName.trim().length > 0 && consented;

  return (
    <StepShell>
      <Card className="p-6">
        <h1 className="text-xl font-semibold">Join your interview</h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          Use this device&apos;s camera so your interviewer can see your laptop screen. Everything runs here in the
          browser, so there&apos;s nothing to install.
        </p>
        <form onSubmit={start} className="mt-5 space-y-4">
          <Field
            label="Interview ID"
            data-testid="interview-id-input"
            value={interviewId}
            onChange={(event) => setInterviewId(event.target.value)}
            placeholder="XXXX-XXXX-XXXX"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
          />
          <Field
            label="Your name"
            data-testid="candidate-name-input"
            value={candidateName}
            onChange={(event) => setCandidateName(event.target.value)}
            placeholder="As given to your interviewer"
            autoCapitalize="words"
            autoComplete="name"
          />
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-5 text-ink-soft">
            <input
              type="checkbox"
              data-testid="consent-toggle"
              checked={consented}
              onChange={(event) => setConsented(event.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-brand-600"
            />
            <span>
              I understand my interviewer will see and hear this device&apos;s camera and microphone live during this
              session, may record it, and that camera frames may be analysed by an AI service to identify the
              application on my screen, with frames flagged for review stored for the interviewer.
            </span>
          </label>
          {error ? <Notice text={error} /> : null}
          <Button type="submit" data-testid="start-interview" className="w-full" disabled={!canStart || submitting}>
            {submitting ? 'Joining…' : 'Start Interview'}
          </Button>
        </form>
      </Card>
    </StepShell>
  );
}
