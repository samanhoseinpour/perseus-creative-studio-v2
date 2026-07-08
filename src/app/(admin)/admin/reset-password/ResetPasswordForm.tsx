'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import Button from '@/components/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';

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
  const [sent, setSent] = useState(false);

  // Valid token present → set-a-new-password step. Otherwise (or on a bad
  // token) → request-a-link step.
  const canSetPassword = Boolean(token) && !error;

  async function requestReset(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const res = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/admin/reset-password`,
    });
    setPending(false);
    if (res?.error) {
      toast.error(res.error.message ?? 'Could not send the reset email.');
    } else {
      setSent(true);
      toast.success('If that email has an account, a reset link is on its way.');
    }
  }

  async function submitNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setPending(true);
    const res = await authClient.resetPassword({ newPassword: password, token });
    setPending(false);
    if (res?.error) {
      toast.error(res.error.message ?? 'Could not reset your password.');
    } else {
      toast.success('Password updated — please sign in.');
      router.push('/admin/login');
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
            Perseus
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {canSetPassword ? 'Set a new password' : 'Reset your password'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {canSetPassword
              ? 'Choose a new password for your admin account.'
              : 'We’ll email you a link to set a new password.'}
          </p>
        </div>

        {error && !canSetPassword && (
          <p className="mb-6 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            That reset link is invalid or has expired. Request a new one below.
          </p>
        )}

        {canSetPassword ? (
          <form onSubmit={submitNewPassword} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                name="new-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={pending}
              />
            </div>
            <Button
              type="submit"
              disabled={pending}
              shimmer={false}
              className="mt-1 w-full"
            >
              {pending ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        ) : sent ? (
          <p className="text-sm text-muted-foreground">
            Check your inbox for the reset link. It expires shortly for security.
          </p>
        ) : (
          <form onSubmit={requestReset} className="flex flex-col gap-4">
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
                onChange={(e) => setEmail(e.target.value)}
                disabled={pending}
              />
            </div>
            <Button
              type="submit"
              disabled={pending}
              shimmer={false}
              className="mt-1 w-full"
            >
              {pending ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/admin/login"
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
