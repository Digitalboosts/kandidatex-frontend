import { Card, PageHeader } from '@/components/ui';
import { RecordingsList } from '@/components/recordings-list';

export default function RecordingsPage() {
  return (
    <>
      <PageHeader title="Recordings" description="Past interview recordings. Each interview's timeline is on its details page." />
      <Card>
        <RecordingsList showInterview />
      </Card>
    </>
  );
}
