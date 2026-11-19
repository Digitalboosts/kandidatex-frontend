import { notFound } from 'next/navigation';
import { AnalyzerHarness } from './harness';

/** Development-only page that runs the stream analyzer on a drawn scene. Used by the e2e tests. */
export default function AnalyzerPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <AnalyzerHarness />;
}
