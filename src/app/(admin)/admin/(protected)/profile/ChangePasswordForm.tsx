'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import Button from '@/components/Button';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { GlassPanel } from '@/components/Admin/Glass';
import PasswordStrengthMeter from '@/components/Admin/PasswordStrengthMeter';
import { authClient } from '@/lib/auth-client';
import { changePasswordSchema, flattenAuthIssues } from '@/lib/authSchema';

type Field = 'currentPassword' | 'newPassword' | 'confirmPassword';

// `email`/`name` are only used to penalise a password that reuses the admin's
// own identity in the strength meter — the server never sees them here.
export default function ChangePasswordForm({
  email,
  name,
  passkeyCount = 0,
}: {
  email?: string;
  name?: string;
  /**
   * How many passkeys this account has, purely so the copy can say so.
   *
   * A passkey is a SEPARATE credential — its private key never derived from
   * the password and a change cannot touch it — but "I changed my password,
   * so my account is locked down" is the natural reading, and the one door a
   * rotation does not close is the one that never expires. Naming the number
   * here is what turns "you had to know to look" into something on screen at
   * the moment the assumption is made.
   */
  passkeyCount?: number;
}) {
  const [values, setValues] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [pending, setPending] = useState(false);

  const set = (field: Field) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // Surface the confirm/new mismatch live (before submit) — same wording as the
  // schema's on-submit check, so the hint is consistent either way.
  const liveMismatch =
    values.confirmPassword.length > 0 &&
    values.newPassword !== values.confirmPassword;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = changePasswordSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(flattenAuthIssues(parsed.error) as Partial<Record<Field, string>>);
      return;
    }
    setErrors({});
    setPending(true);
    // better-auth's client REJECTS on network-level failure (only HTTP
    // failures come back as { error }) — without the guard the form sticks
    // at "Updating…" until a reload.
    try {
      const res = await authClient.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        // A password change is the instinctive remediation for a suspected
        // stolen session — it must actually evict the thief. Only this
        // device's session survives (OWASP session-management guidance).
        revokeOtherSessions: true,
      });
      if (res?.error) {
        // The overwhelmingly common failure is a wrong current password — surface
        // it on that field (and toast) rather than leaving the form silent.
        const message = res.error.message ?? 'Could not change password.';
        setErrors({ currentPassword: message });
        toast.error(message);
        return;
      }
      toast.success(
        passkeyCount > 0
          ? `Password updated. ${passkeyCount} passkey${passkeyCount === 1 ? '' : 's'} still open this account. Review them below.`
          : 'Password updated.',
      );
      setValues({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch {
      toast.error('Couldn’t reach the server. Check your connection.');
    } finally {
      setPending(false);
    }
  }

  return (
    <GlassPanel as="section" className="p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">Password</h2>
        <p className="text-xs text-muted-foreground">
          Use at least 12 characters and avoid common or reused passwords.
          Changing it signs you out everywhere except this device.
          {passkeyCount > 0
            ? ` Your ${passkeyCount} passkey${passkeyCount === 1 ? '' : 's'} keep${passkeyCount === 1 ? 's' : ''} working because passkeys are separate from your password.`
            : ''}
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <PasswordField
          id="current-password"
          label="Current password"
          autoComplete="current-password"
          value={values.currentPassword}
          onChange={set('currentPassword')}
          error={errors.currentPassword}
          disabled={pending}
        />
        <div className="flex flex-col gap-2">
          <PasswordField
            id="new-password"
            label="New password"
            autoComplete="new-password"
            value={values.newPassword}
            onChange={set('newPassword')}
            error={errors.newPassword}
            disabled={pending}
          />
          <PasswordStrengthMeter
            password={values.newPassword}
            email={email}
            name={name}
          />
        </div>
        <PasswordField
          id="confirm-password"
          label="Confirm new password"
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={set('confirmPassword')}
          error={
            errors.confirmPassword ??
            (liveMismatch ? 'Passwords do not match.' : undefined)
          }
          disabled={pending}
        />
        <Button
          type="submit"
          size="small"
          shimmer={false}
          showIcon={false}
          disabled={pending}
          className="w-full sm:w-auto sm:self-start"
        >
          {pending ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </GlassPanel>
  );
}

function PasswordField({
  id,
  label,
  autoComplete,
  value,
  onChange,
  error,
  disabled,
}: {
  id: string;
  label: string;
  autoComplete: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <PasswordInput
        id={id}
        name={id}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="px-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
