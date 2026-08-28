'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import Button from '@/components/Button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import PasswordStrengthMeter from '@/components/Admin/PasswordStrengthMeter';
import { adminLink } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';
import { authClient } from '@/lib/auth-client';
import {
  resetRequestSchema,
  newPasswordSchema,
  flattenAuthIssues,
  fieldIssue,
} from '@/lib/authSchema';
import AdminAuthShell from '../_components/AdminAuthShell';

export default function ResetPasswordForm({
  token,
  error,
}: {
  token?: string;
  error?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [isNavigating, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Valid token present → set-a-new-password step. Otherwise (or on a bad
  // token) → request-a-link step.
  const canSetPassword = Boolean(token) && !error;

  const clearError = (key: string) =>
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const validateEmail = () => {
    const msg = fieldIssue(resetRequestSchema, { email }, 'email');
    setErrors((prev) => {
      const next = { ...prev };
      if (msg) next.email = msg;
      else delete next.email;
      return next;
    });
  };

  const validatePassword = () => {
    const msg = fieldIssue(newPasswordSchema, { password }, 'password');
    setErrors((prev) => {
      const next = { ...prev };
      if (msg) next.password = msg;
      else delete next.password;
      return next;
    });
  };

  async function requestReset(e: React.FormEvent) {
    e.preventDefault();
    const parsed = resetRequestSchema.safeParse({ email });
    if (!parsed.success) {
      setErrors(flattenAuthIssues(parsed.error));
      return;
    }
    setErrors({});
    setPending(true);
    // better-auth's client REJECTS on network-level failure (it only returns
    // { error } for HTTP failures) — guard both handlers or the form sticks
    // at "Sending…"/"Updating…" until a reload.
    try {
      const res = await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/admin/reset-password`,
      });
      if (res?.error) {
        toast.error(res.error.message ?? 'Could not send the reset email.');
      } else {
        setSent(true);
        toast.success('If that email has an account, a reset link is on its way.');
      }
    } catch {
      toast.error('Couldn’t reach the server. Check your connection.');
    } finally {
      setPending(false);
    }
  }

  async function submitNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    const parsed = newPasswordSchema.safeParse({ password });
    if (!parsed.success) {
      setErrors(flattenAuthIssues(parsed.error));
      return;
    }
    setErrors({});
    setPending(true);
    try {
      const res = await authClient.resetPassword({ newPassword: password, token });
      if (res?.error) {
        // Better Auth names the ordinary failures (an expired or already-used
        // link) and those messages beat anything generic, so they stand. The
        // FALLBACK had to change: the password is committed BEFORE the session
        // eviction that can now throw (password.mjs:158-164), and the one-use
        // token is consumed either way — so an unexplained failure no longer
        // proves nothing happened, and "could not reset your password" would
        // be a lie in exactly that case.
        toast.error(
          res.error.message ??
            'Couldn’t finish. Try signing in with the new password, and if that fails, request a fresh link.',
        );
        setPending(false);
      } else {
        toast.success('Password updated. Every device is signed out, so please sign in.');
        // Through a transition so the shell's orb covers the hop back to the
        // login page; a bare push left this screen frozen and unexplained.
        startTransition(() => router.push('/admin/login'));
      }
    } catch {
      toast.error('Couldn’t reach the server. Check your connection.');
      setPending(false);
    }
  }

  const busy = pending || isNavigating;

  // The orb carries the wait so the buttons can stay buttons — the same reason
  // the sign-in screen stopped reporting progress in its own label.
  const waitingFor = isNavigating
    ? 'Taking you to sign in…'
    : !pending
      ? null
      : canSetPassword
        ? 'Updating your password…'
        : 'Sending your link…';

  return (
    <AdminAuthShell pending={waitingFor}>
      <div className="mb-8 flex flex-col gap-1.5">
        <span className="text-[0.55rem] font-medium uppercase tracking-[0.28em] text-muted-foreground">
          Perseus Creative Studio
        </span>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {canSetPassword ? 'Set a new password' : 'Reset your password'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {canSetPassword
            ? 'Choose a new password for your admin account. Saving it signs you out everywhere, so you’ll sign in again on your other devices.'
            : 'We’ll email you a link to set a new password.'}
        </p>
      </div>

      {error && !canSetPassword && (
        <p className="mb-6 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          That reset link is invalid or has expired. Request a new one below.
        </p>
      )}

      {canSetPassword ? (
        <form
          onSubmit={submitNewPassword}
          aria-busy={busy}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-password">New password</Label>
            <PasswordInput
              id="new-password"
              name="new-password"
              required
              minLength={12}
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearError('password');
              }}
              onBlur={validatePassword}
              disabled={busy}
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={
                errors.password ? 'new-password-error' : undefined
              }
            />
            <PasswordStrengthMeter password={password} />
            {errors.password && (
              <p
                id="new-password-error"
                role="alert"
                className="px-1 text-xs text-destructive"
              >
                {errors.password}
              </p>
            )}
          </div>
          <Button
            type="submit"
            disabled={busy}
            shimmer={false}
            className="mt-1 w-full"
          >
            Update password
          </Button>
        </form>
      ) : sent ? (
        <p className="text-sm text-muted-foreground">
          Check your inbox for the reset link. It expires shortly for security.
        </p>
      ) : (
        <form
          onSubmit={requestReset}
          aria-busy={busy}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              placeholder="you@perseustudio.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearError('email');
              }}
              onBlur={validateEmail}
              disabled={busy}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && (
              <p
                id="email-error"
                role="alert"
                className="px-1 text-xs text-destructive"
              >
                {errors.email}
              </p>
            )}
          </div>
          <Button
            type="submit"
            disabled={busy}
            shimmer={false}
            className="mt-1 w-full"
          >
            Send reset link
          </Button>
        </form>
      )}

      <div className="mt-6 text-center">
        <Link
          href="/admin/login"
          className={cn(
            'text-xs text-muted-foreground hover:text-foreground',
            adminLink,
          )}
        >
          Back to sign in
        </Link>
      </div>
    </AdminAuthShell>
  );
}
