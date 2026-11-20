'use client';

import type { AuthResponse } from '@/types';
import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, Loader2, Lock, Mail, User, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { type FormEvent, type InputHTMLAttributes, type ReactNode, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { AuthShowcase } from './auth/auth-showcase';
import { BrandLogo } from './brand-logo';
import { inter } from './landing/fonts';
import { ErrorNote } from './ui';

/** Only same-site paths, so a crafted login link can't redirect somewhere else. */
function safeNext(): string {
  const next = new URLSearchParams(window.location.search).get('next');
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
}

const MIN_PASSWORD = 10;

const STRENGTH = [
  { label: 'Too short', bar: 'bg-bad', text: 'text-bad' },
  { label: 'Fair', bar: 'bg-amber-500', text: 'text-warn' },
  { label: 'Good', bar: 'bg-brand-500', text: 'text-brand-700' },
  { label: 'Strong', bar: 'bg-emerald-500', text: 'text-good' },
] as const;

/** 0 (below the minimum) to 3 (long and varied). */
function passwordStrength(value: string): number {
  if (value.length < MIN_PASSWORD) return 0;
  let score = 1;
  if (/\d/.test(value) && (/[^A-Za-z0-9]/.test(value) || (/[a-z]/.test(value) && /[A-Z]/.test(value)))) score++;
  if (value.length >= 14) score++;
  return score;
}

function AuthField({
  label,
  icon: Icon,
  trailing,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; icon: LucideIcon; trailing?: ReactNode }) {
  return (
    <div>
      <label htmlFor={props.id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="group relative">
        <Icon
          aria-hidden
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted transition-colors group-focus-within:text-brand-600"
        />
        <input
          {...props}
          className={`h-11 w-full rounded-xl border border-line bg-white pl-10 text-sm text-ink shadow-xs shadow-slate-900/5 transition placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 ${trailing ? 'pr-11' : 'pr-3.5'}`}
        />
        {trailing}
      </div>
    </div>
  );
}

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const registering = mode === 'register';
  const strength = passwordStrength(password);

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
    <main className={`min-h-dvh bg-white lg:grid lg:grid-cols-2 ${inter.className}`}>
      <section className="relative isolate flex min-h-dvh flex-col px-5 py-6 sm:px-10 lg:px-14">
        {/* A soft glow behind the form, so the page doesn't feel flat on small screens. */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,rgb(59_130_246/0.12),transparent)] lg:hidden"
        />

        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            aria-label="Kandidatex home"
            className="inline-flex rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            <BrandLogo className="h-7" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to site
          </Link>
        </header>

        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
          <div className="motion-safe:animate-rise">
            <h1 className="text-3xl font-semibold tracking-tight text-ink">
              {registering ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              {registering
                ? 'Start monitoring remote interviews in a few minutes.'
                : 'Sign in to see your live interviews, alerts and recordings.'}
            </p>
          </div>

          {/* Switch between the two pages */}
          <nav
            aria-label="Account"
            className="mt-7 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-medium motion-safe:animate-rise"
            style={{ animationDelay: '60ms' }}
          >
            {(['login', 'register'] as const).map((tab) => (
              <Link
                key={tab}
                href={tab === 'login' ? '/login' : '/register'}
                aria-current={tab === mode ? 'page' : undefined}
                className={`rounded-lg px-3 py-2 text-center transition ${
                  tab === mode ? 'bg-white text-ink shadow-sm shadow-slate-900/10' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {tab === 'login' ? 'Sign in' : 'Sign up'}
              </Link>
            ))}
          </nav>

          <form
            onSubmit={submit}
            className="mt-7 space-y-5 motion-safe:animate-rise"
            style={{ animationDelay: '120ms' }}
          >
            {registering ? (
              <AuthField
                id="name"
                label="Name"
                name="name"
                icon={User}
                autoComplete="name"
                placeholder="Your full name"
                required
              />
            ) : null}
            <AuthField
              id="email"
              label="Email"
              name="email"
              type="email"
              icon={Mail}
              autoComplete="email"
              placeholder="you@company.com"
              required
            />
            <div>
              <AuthField
                id="password"
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                icon={Lock}
                autoComplete={registering ? 'new-password' : 'current-password'}
                placeholder={registering ? `At least ${MIN_PASSWORD} characters` : 'Your password'}
                minLength={registering ? MIN_PASSWORD : undefined}
                aria-describedby={registering ? 'password-hint' : undefined}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Hide characters' : 'Show characters'}
                    aria-pressed={showPassword}
                    className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-slate-100 hover:text-ink"
                  >
                    {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                  </button>
                }
              />
              {registering ? (
                <div id="password-hint" className="mt-2" aria-live="polite">
                  <div aria-hidden className="grid grid-cols-4 gap-1.5">
                    {[0, 1, 2, 3].map((segment) => (
                      <span
                        key={segment}
                        className={`h-1 rounded-full transition-colors duration-300 ${
                          password && segment <= strength ? STRENGTH[strength]!.bar : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="mt-1.5 flex justify-between text-xs text-ink-muted">
                    {password ? (
                      <>
                        <span className={`font-medium ${STRENGTH[strength]!.text}`}>{STRENGTH[strength]!.label}</span>
                        {password.length < MIN_PASSWORD ? (
                          <span className="tabular-nums">
                            {password.length}/{MIN_PASSWORD} characters
                          </span>
                        ) : (
                          <span>Mix numbers and symbols to make it stronger.</span>
                        )}
                      </>
                    ) : (
                      <span>At least {MIN_PASSWORD} characters.</span>
                    )}
                  </p>
                </div>
              ) : null}
            </div>
            {registering ? (
              <AuthField
                id="adminCode"
                label="Admin code (optional)"
                name="adminCode"
                icon={KeyRound}
                autoComplete="off"
                placeholder="Only if your team gave you one"
              />
            ) : null}

            <ErrorNote message={error} />

            <button
              type="submit"
              disabled={submitting}
              className="group inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700 hover:shadow-brand-600/35 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.99] disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Please wait…
                </>
              ) : (
                <>
                  {registering ? 'Create account' : 'Sign in'}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-soft">
            {registering ? 'Already have an account? ' : 'New to Kandidatex? '}
            <Link href={registering ? '/login' : '/register'} className="font-semibold text-brand-700 hover:underline">
              {registering ? 'Sign in' : 'Create an account'}
            </Link>
          </p>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
          <span>© {new Date().getFullYear()} Kandidatex</span>
          <span className="flex gap-4">
            <Link href="/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-ink">
              Terms
            </Link>
          </span>
        </footer>
      </section>

      <AuthShowcase mode={mode} />
    </main>
  );
}
