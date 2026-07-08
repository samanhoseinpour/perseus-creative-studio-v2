'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LuFingerprint } from 'react-icons/lu';

import Button from '@/components/Button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import { signInSchema, flattenAuthIssues, fieldIssue } from '@/lib/authSchema';
import AdminAuthShell from '../_components/AdminAuthShell';

type Pending = 'email' | 'passkey' | null;

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState<Pending>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearError = (key: string) =>
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const validateField = (key: 'email' | 'password') => {
    const msg = fieldIssue(signInSchema, { email, password }, key);
    setErrors((prev) => {
      const next = { ...prev };
      if (msg) next[key] = msg;
      else delete next[key];
      return next;
    });
  };

  function goToDashboard() {
    router.push('/admin');
    router.refresh();
  }

  // Conditional-UI passkey autofill: if the browser can surface discoverable
  // passkeys inline, offer them in the email field's autocomplete. Silently a
  // no-op when unsupported or when the user has no passkey on this device.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!window.PublicKeyCredential?.isConditionalMediationAvailable)
          return;
        const available =
          await window.PublicKeyCredential.isConditionalMediationAvailable();
        if (!available || !active) return;
        const res = await authClient.signIn.passkey({ autoFill: true });
        if (active && res && !res.error) goToDashboard();
      } catch {
        /* no discoverable passkey / dismissed — ignore */
      }
    })();
    return () => {
      active = false;
    };
    // authClient is a stable module singleton; router is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function onPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(flattenAuthIssues(parsed.error));
      return;
    }
    setErrors({});
    setPending('email');
    const res = await authClient.signIn.email({ email, password });
    if (res?.error) {
      toast.error(res.error.message ?? 'Invalid email or password.');
      setPending(null);
    } else {
      goToDashboard();
    }
  }

  async function onPasskeySignIn() {
    setPending('passkey');
    try {
      const res = await authClient.signIn.passkey();
      if (res?.error) {
        toast.error(res.error.message ?? 'Passkey sign-in failed.');
        setPending(null);
      } else {
        goToDashboard();
      }
    } catch {
      toast.error('Passkey sign-in was cancelled.');
      setPending(null);
    }
  }

  const busy = pending !== null;

  return (
    <AdminAuthShell>
      <div className="mb-8 flex flex-col gap-1.5">
        <span className="text-[0.55rem] font-medium uppercase tracking-[0.28em] text-muted-foreground">
          Perseus Creative Studio
        </span>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Welcome back to the studio
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign in to manage inquiries and projects.
        </p>
      </div>

      <form onSubmit={onPasswordSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoFocus
            autoComplete="username webauthn"
            placeholder="you@perseustudio.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearError('email');
            }}
            onBlur={() => validateField('email')}
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

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/admin/reset-password"
              className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            name="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearError('password');
            }}
            onBlur={() => validateField('password')}
            disabled={busy}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? 'password-error' : undefined}
          />
          {errors.password && (
            <p
              id="password-error"
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
          {pending === 'email' ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="secondary"
        onClick={onPasskeySignIn}
        disabled={busy}
        icon={LuFingerprint}
        iconPosition="left"
        className="w-full"
      >
        {pending === 'passkey'
          ? 'Waiting for device…'
          : 'Sign in with a passkey'}
      </Button>
    </AdminAuthShell>
  );
}
