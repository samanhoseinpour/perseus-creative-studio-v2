'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from 'radix-ui';
import { toast } from 'sonner';
import { LuUserPlus } from 'react-icons/lu';

import Button from '@/components/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import PasswordStrengthMeter from '@/components/Admin/PasswordStrengthMeter';
import { glassSurface, GlassRim } from '@/components/Admin/Glass';
import {
  createAdminUser,
  type CreateUserResult,
} from '@/app/(admin)/admin/(protected)/_actions/users';
import { createUserSchema } from '@/lib/usersSchema';
import { flattenAuthIssues } from '@/lib/authSchema';
import {
  ADMIN_AREAS,
  DEFAULT_AREAS,
  type AdminArea,
} from '@/lib/adminAreas';
import { AreaChipButton } from './AreaToggles';
import { generateTempPassword } from './generateTempPassword';
import { cn } from '@/lib/utils';

const SERVER_ERROR: CreateUserResult = {
  ok: false,
  error: 'server',
  message: 'Something went wrong — try again.',
};

const BLANK = { name: '', email: '', password: '' };

/**
 * The "Add user" affordance for /admin/users: a Button opening a glass form
 * dialog (ConfirmDialog's shell, form-sized). New accounts are always members
 * — role never appears here; the picker only chooses their starting areas.
 */
export default function AddUserButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(BLANK);
  const [areas, setAreas] = useState<AdminArea[]>(DEFAULT_AREAS);
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  function close(next: boolean) {
    if (pending) return;
    setOpen(next);
    if (!next) {
      setValues(BLANK);
      setAreas(DEFAULT_AREAS);
      setIssues({});
    }
  }

  function setValue(key: keyof typeof BLANK, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    setIssues(({ [key]: _cleared, ...rest }) => rest);
  }

  function toggleArea(area: AdminArea) {
    setAreas((current) =>
      current.includes(area)
        ? current.filter((a) => a !== area)
        : [...current, area],
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = createUserSchema.safeParse({ ...values, areas });
    if (!parsed.success) {
      setIssues(flattenAuthIssues(parsed.error));
      return;
    }
    setPending(true);
    let res: CreateUserResult;
    try {
      res = (await createAdminUser(parsed.data)) ?? SERVER_ERROR;
    } catch {
      res = SERVER_ERROR;
    }
    setPending(false);
    if (!res.ok) {
      if (res.error === 'validation') {
        setIssues(res.issues);
        return;
      }
      toast.error(res.message);
      return;
    }
    toast.success(`Account created for ${parsed.data.name}.`);
    close(false);
    router.refresh();
  }

  return (
    <>
      <Button
        type="button"
        size="small"
        icon={LuUserPlus}
        iconPosition="left"
        onClick={() => setOpen(true)}
      >
        Add user
      </Button>

      <Dialog.Root open={open} onOpenChange={close}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <div className="fixed inset-0 z-50 overflow-y-auto p-4">
            <div className="flex min-h-full items-center justify-center">
              <Dialog.Content
                className={cn(
                  'relative w-[min(92vw,28rem)] p-6',
                  glassSurface,
                  'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
                )}
              >
                <GlassRim />
                <Dialog.Title className="text-base font-semibold tracking-tight text-foreground">
                  Add user
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                  Create a member account with a temporary password and choose
                  which areas it can open — you can change access any time.
                </Dialog.Description>

                <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
                  <Field
                    id="add-user-name"
                    label="Name"
                    error={issues.name}
                  >
                    <Input
                      id="add-user-name"
                      value={values.name}
                      onChange={(e) => setValue('name', e.target.value)}
                      autoComplete="off"
                      disabled={pending}
                      aria-invalid={issues.name ? true : undefined}
                      aria-describedby={
                        issues.name ? 'add-user-name-error' : undefined
                      }
                    />
                  </Field>

                  <Field
                    id="add-user-email"
                    label="Email"
                    error={issues.email}
                  >
                    <Input
                      id="add-user-email"
                      type="email"
                      value={values.email}
                      onChange={(e) => setValue('email', e.target.value)}
                      autoComplete="off"
                      disabled={pending}
                      aria-invalid={issues.email ? true : undefined}
                      aria-describedby={
                        issues.email ? 'add-user-email-error' : undefined
                      }
                    />
                  </Field>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="add-user-password">
                        Temporary password
                      </Label>
                      <Button
                        type="button"
                        variant="secondary"
                        size="small"
                        showIcon={false}
                        disabled={pending}
                        onClick={() => setValue('password', generateTempPassword())}
                      >
                        Generate
                      </Button>
                    </div>
                    <PasswordInput
                      id="add-user-password"
                      value={values.password}
                      onChange={(e) => setValue('password', e.target.value)}
                      autoComplete="new-password"
                      disabled={pending}
                      aria-invalid={issues.password ? true : undefined}
                      aria-describedby={
                        issues.password ? 'add-user-password-error' : undefined
                      }
                    />
                    {issues.password && (
                      <p
                        id="add-user-password-error"
                        role="alert"
                        className="px-1 text-xs text-destructive"
                      >
                        {issues.password}
                      </p>
                    )}
                    <PasswordStrengthMeter
                      password={values.password}
                      email={values.email}
                      name={values.name}
                    />
                    <p className="px-1 text-xs text-muted-foreground">
                      Share it securely — they change it on their profile after
                      first sign-in (and should add a passkey).
                    </p>
                  </div>

                  <fieldset disabled={pending}>
                    <legend className="mb-2 text-sm font-medium text-foreground">
                      Access
                    </legend>
                    <div className="flex flex-wrap gap-1.5">
                      {ADMIN_AREAS.map((area) => (
                        <AreaChipButton
                          key={area}
                          area={area}
                          active={areas.includes(area)}
                          disabled={pending}
                          onToggle={toggleArea}
                        />
                      ))}
                    </div>
                  </fieldset>

                  <div className="mt-2 flex flex-col gap-2 sm:flex-row-reverse">
                    <Button
                      type="submit"
                      size="small"
                      shimmer={false}
                      showIcon={false}
                      disabled={pending}
                      className="w-full sm:w-auto"
                    >
                      {pending ? 'Creating…' : 'Create account'}
                    </Button>
                    <Dialog.Close asChild>
                      <Button
                        type="button"
                        variant="secondary"
                        size="small"
                        showIcon={false}
                        disabled={pending}
                        className="w-full sm:w-auto"
                      >
                        Cancel
                      </Button>
                    </Dialog.Close>
                  </div>
                </form>
              </Dialog.Content>
            </div>
          </div>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="px-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
