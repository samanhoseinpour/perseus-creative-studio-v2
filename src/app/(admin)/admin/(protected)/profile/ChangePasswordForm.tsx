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
}: {
  email?: string;
  name?: string;
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = changePasswordSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(flattenAuthIssues(parsed.error) as Partial<Record<Field, string>>);
      return;
    }
    setErrors({});
    setPending(true);
    const res = await authClient.changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
      revokeOtherSessions: false,
    });
    setPending(false);
    if (res?.error) {
      // The overwhelmingly common failure is a wrong current password — surface
      // it on that field (and toast) rather than leaving the form silent.
      const message = res.error.message ?? 'Could not change password.';
      setErrors({ currentPassword: message });
      toast.error(message);
      return;
    }
    toast.success('Password updated.');
    setValues({ currentPassword: '', newPassword: '', confirmPassword: '' });
  }

  return (
    <GlassPanel as="section" className="p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">Password</h2>
        <p className="text-xs text-muted-foreground">
          Use at least 12 characters and avoid common or reused passwords.
          Changing it keeps you signed in on this device.
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
          error={errors.confirmPassword}
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
