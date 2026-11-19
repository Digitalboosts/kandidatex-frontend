'use client';

import type { ScreenAlertDTO } from '@/types';
import { useEffect, useState } from 'react';
import { fromStoredAlert, type ScreenAlert, ScreenAlertDialog } from '@/components/screen-alert-dialog';
import { ScreenAlertsGallery } from '@/components/screen-alerts-gallery';
import { Card, ErrorNote, PageHeader } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<ScreenAlertDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<ScreenAlert | null>(null);

  useEffect(() => {
    api<{ screenAlerts: ScreenAlertDTO[] }>('/api/screen-alerts?limit=200')
      .then((body) => setAlerts(body.screenAlerts))
      .catch((caught) => setError(errorMessage(caught)));
  }, []);

  return (
    <>
      <PageHeader
        title="Screen alerts"
        description="Screens the AI flagged for review across your interviews, newest first. A flag is a prompt to look, not proof of wrongdoing."
      />
      <ErrorNote message={error} />
      <ScreenAlertDialog alert={viewing} onClose={() => setViewing(null)} />
      <Card>
        {alerts ? (
          <ScreenAlertsGallery
            alerts={alerts}
            showInterview
            onOpen={(alert) => setViewing(fromStoredAlert(alert))}
            emptyText="No screen alerts yet. They appear here when the AI flags a screen for review."
          />
        ) : error ? null : (
          <p className="px-4 py-8 text-center text-sm text-ink-muted">Loading…</p>
        )}
      </Card>
    </>
  );
}
