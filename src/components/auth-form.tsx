'use client';

import type { AuthResponse } from '@/types';
import { ScreenShare } from 'lucide-react';
import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { Button, Card, ErrorNote, Field } from './ui';

/** Only same-site paths, so a crafted login link can't redirect somewhere else. */
function safeNext(): string {
  const next = new URLSearchParams(window.location.search).get('next');
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
}

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const registering = mode === 'register';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setError(null);
    try {
      const adminCode = String(form.get('adminCode') ?? '');
      await api<AuthResponse>(`/api/auth/${mode}`, {
        body: {
          email: form.get('email'),
          password: form.get('password'),
          ...(registering ? { name: form.get('name'), ...(adminCode ? { adminCode } : {}) } : {}),
        },
      });
      window.location.assign(safeNext());
    } catch (caught) {
      setError(errorMessage(caught));
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <ScreenShare className="size-5" aria-hidden />
          </span>
          <span className="text-lg font-semibold tracking-tight">Interview Monitor</span>
        </div>
        <h1 className="mb-4 text-xl font-semibold">{registering ? 'Create your account' : 'Sign in'}</h1>
        <form onSubmit={submit} className="space-y-4">
          {registering ? <Field label="Name" name="name" autoComplete="name" required /> : null}
          <Field label="Email" name="email" type="email" autoComplete="email" required />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete={registering ? 'new-password' : 'current-password'}
            hint={registering ? 'At least 10 characters.' : undefined}
            minLength={registering ? 10 : undefined}
            required
          />
          {registering ? <Field label="Admin code (optional)" name="adminCode" autoComplete="off" /> : null}
          <ErrorNote message={error} />
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Please wait…' : registering ? 'Create account' : 'Sign in'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-ink-soft">
          {registering ? 'Already have an account? ' : 'New here? '}
          <Link href={registering ? '/login' : '/register'} className="font-medium text-brand-700 hover:underline">
            {registering ? 'Sign in' : 'Create an account'}
          </Link>
        </p>
      </Card>
    </main>
  );
}
