import type { Metadata } from 'next';
import { CandidateApp } from '@/components/candidate/candidate-app';

export const metadata: Metadata = { title: 'Join your interview · Interview Monitor' };

/**
 * Where a candidate's joining link lands. The whole candidate session runs here in
 * the browser: join, camera permissions, calibration and live monitoring. It reveals
 * nothing beyond the ID already in the URL until the candidate's name matches.
 */
export default async function JoinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let interviewId = id;
  try {
    interviewId = decodeURIComponent(id);
  } catch {
    // Not percent-encoded after all: use it as given.
  }
  return <CandidateApp interviewId={interviewId} />;
}
