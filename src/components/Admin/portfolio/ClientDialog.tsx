'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Dialog } from 'radix-ui';
import { toast } from 'sonner';
import { LuArrowRight, LuBuilding2 } from 'react-icons/lu';

import Button from '@/components/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { glassSurface, GlassRim } from '@/components/Admin/Glass';
import ConfirmDialog from '@/components/Admin/ConfirmDialog';
import ClientLogoField from './ClientLogoField';
import { ChipGroup } from './PortfolioChips';
import {
  createClient,
  deleteClient,
  updateClient,
  type ClientMutationResult,
} from '@/app/(admin)/admin/(protected)/_actions/clients';
import { clientSchema, flattenPortfolioIssues } from '@/lib/portfolioSchema';
import {
  CLIENT_LOGO_DISC_HELP,
  CLIENT_LOGO_DISC_LABELS,
  CLIENT_LOGO_DISC_OPTIONS,
  CLIENT_MARQUEE_HELP,
  type ClientLogoDiscField,
} from '@/lib/portfolioFields';
import { slugify } from '@/components/Projects/utils';
import { cn } from '@/lib/utils';

/** One roster row, serialized server-side ('' for empty optional fields;
 *  dates pre-formatted — the client never does Date math). */
export type AdminClientItem = {
  id: string;
  slug: string;
  name: string;
  industry: string;
  location: string;
  websiteUrl: string;
  instagram: string;
  bio: string;
  /** On the Partners logo wall (marquee_sort set). */
  marquee: boolean;
  /** Also on the home page's featured rail. */
  marqueeFeatured: boolean;
  logoDisc: ClientLogoDiscField;
  /** Rail order (null while off the wall). */
  marqueeSort: number | null;
  /** Current mark for display: uploaded blob URL ?? seeded static path. */
  logoUrl: string | null;
  hasUploadedLogo: boolean;
  projectCount: number;
  updatedLabel: string;
};

const SERVER_ERROR: ClientMutationResult = { ok: false, error: 'server' };

const DISC_OPTIONS = CLIENT_LOGO_DISC_OPTIONS.map((slug) => ({
  slug,
  label: CLIENT_LOGO_DISC_LABELS[slug],
}));

const BLANK = {
  name: '',
  slug: '',
  industry: '',
  location: '',
  websiteUrl: '',
  instagram: '',
  bio: '',
};

// The Input primitive's look on a native textarea (NewTicketForm's idiom).
const textareaClasses =
  'placeholder:text-muted-foreground border-input flex w-full min-w-0 resize-y rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[1px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive';

/**
 * Create/edit form for one portfolio client, in the admin's glass dialog
 * shell (AddUserButton's pattern). Create mode auto-derives the slug from the
 * name until the slug field is touched; edit mode never auto-rewrites a slug
 * (it's a live URL). Edit mode adds the logo section (uploads apply
 * immediately) and the delete affordance (refused while projects reference
 * the client — the FK restricts anyway; the button explains instead of 500s).
 */
export default function ClientDialog({
  open,
  onOpenChange,
  client,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create mode. */
  client: AdminClientItem | null;
}) {
  const router = useRouter();
  const [values, setValues] = useState(BLANK);
  const [marquee, setMarquee] = useState(false);
  const [marqueeFeatured, setMarqueeFeatured] = useState(false);
  const [logoDisc, setLogoDisc] = useState<ClientLogoDiscField>('none');
  const [sortValue, setSortValue] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const editing = client !== null;

  // Which client id the form was last seeded from. The grid derives `client`
  // from fresh server data, so a logo upload's router.refresh() swaps the
  // object identity mid-edit — this ref stops that from re-seeding (and
  // clobbering) typed-but-unsaved field values. Reset on close so reopening
  // the same client seeds fresh.
  const seededFor = useRef<string | null>(null);

  // Re-seed the form whenever the dialog opens on a (different) client.
  useEffect(() => {
    if (!open) {
      seededFor.current = null;
      return;
    }
    if (client && seededFor.current === client.id) return;
    if (client) {
      seededFor.current = client.id;
      setValues({
        name: client.name,
        slug: client.slug,
        industry: client.industry,
        location: client.location,
        websiteUrl: client.websiteUrl,
        instagram: client.instagram,
        bio: client.bio,
      });
      setMarquee(client.marquee);
      setMarqueeFeatured(client.marqueeFeatured);
      setLogoDisc(client.logoDisc);
      setSortValue(client.marqueeSort === null ? '' : String(client.marqueeSort));
      // An existing slug is referenced elsewhere — never auto-rewrite.
      setSlugTouched(true);
    } else {
      setValues(BLANK);
      setMarquee(false);
      setMarqueeFeatured(false);
      setLogoDisc('none');
      setSortValue('');
      setSlugTouched(false);
    }
    setIssues({});
  }, [open, client]);

  function close(next: boolean) {
    if (pending || deleting) return;
    onOpenChange(next);
  }

  function setValue(key: keyof typeof BLANK, value: string) {
    setValues((v) => {
      const next = { ...v, [key]: value };
      if (key === 'name' && !slugTouched) next.slug = slugify(value);
      return next;
    });
    setIssues(({ [key]: _cleared, ...rest }) => rest);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = clientSchema.safeParse({
      ...values,
      marquee,
      marqueeFeatured: marquee && marqueeFeatured,
      logoDisc,
      // Blank keeps the current slot (edit) / appends (join) — the action
      // resolves the actual value.
      marqueeSort: sortValue.trim() === '' ? undefined : Number(sortValue),
    });
    if (!parsed.success) {
      setIssues(flattenPortfolioIssues(parsed.error));
      return;
    }
    setPending(true);
    let res: ClientMutationResult;
    try {
      res =
        (editing
          ? await updateClient(client.id, parsed.data)
          : await createClient(parsed.data)) ?? SERVER_ERROR;
    } catch {
      res = SERVER_ERROR;
    }
    setPending(false);
    if (!res.ok) {
      if (res.error === 'validation') {
        setIssues(res.issues);
        return;
      }
      toast.error('Something went wrong — try again.');
      return;
    }
    toast.success(editing ? 'Client saved.' : `Client created: ${parsed.data.name}.`);
    onOpenChange(false);
    router.refresh();
  }

  async function onDelete() {
    if (!client) return;
    setDeleting(true);
    let res: Awaited<ReturnType<typeof deleteClient>>;
    try {
      res = (await deleteClient(client.id)) ?? {
        ok: false,
        error: 'Delete failed — try again.',
      };
    } catch {
      res = { ok: false, error: 'Delete failed — try again.' };
    }
    setDeleting(false);
    setConfirmingDelete(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success('Client deleted.');
    onOpenChange(false);
    router.refresh();
  }

  return (
    <>
      <Dialog.Root open={open} onOpenChange={close}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <div
            data-lenis-prevent
            className="fixed inset-0 z-50 overflow-y-auto overscroll-contain p-4"
          >
            <div className="flex min-h-full items-center justify-center">
              <Dialog.Content
                className={cn(
                  'relative w-[min(92vw,30rem)] p-6',
                  glassSurface,
                  'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
                )}
              >
                <GlassRim />
                <Dialog.Title className="text-base font-semibold tracking-tight text-foreground">
                  {editing ? client.name : 'Add client'}
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                  {editing
                    ? 'Company details shown wherever this client’s work appears.'
                    : 'Add a client to attribute projects to and place on the logo wall.'}
                </Dialog.Description>
                {editing && client.projectCount > 0 && (
                  <Link
                    href={`/admin/projects?client=${client.slug}`}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-foreground hover:underline"
                  >
                    View {client.projectCount} project
                    {client.projectCount === 1 ? '' : 's'}
                    <LuArrowRight className="size-3" aria-hidden="true" />
                  </Link>
                )}

                <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
                  <Field id="client-name" label="Name" error={issues.name}>
                    <Input
                      id="client-name"
                      value={values.name}
                      onChange={(e) => setValue('name', e.target.value)}
                      autoComplete="off"
                      disabled={pending}
                      aria-invalid={issues.name ? true : undefined}
                      aria-describedby={issues.name ? 'client-name-error' : undefined}
                    />
                  </Field>

                  <Field
                    id="client-slug"
                    label="Slug"
                    error={issues.slug}
                    hint="Stable ID used internally — safe to leave auto-generated."
                  >
                    <Input
                      id="client-slug"
                      value={values.slug}
                      onChange={(e) => {
                        setSlugTouched(true);
                        setValue('slug', e.target.value);
                      }}
                      autoComplete="off"
                      spellCheck={false}
                      disabled={pending}
                      aria-invalid={issues.slug ? true : undefined}
                      aria-describedby={issues.slug ? 'client-slug-error' : undefined}
                    />
                  </Field>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field id="client-industry" label="Industry" error={issues.industry}>
                      <Input
                        id="client-industry"
                        value={values.industry}
                        onChange={(e) => setValue('industry', e.target.value)}
                        placeholder="e.g. Construction & Development"
                        autoComplete="off"
                        disabled={pending}
                        aria-invalid={issues.industry ? true : undefined}
                      />
                    </Field>
                    <Field id="client-location" label="Location" error={issues.location}>
                      <Input
                        id="client-location"
                        value={values.location}
                        onChange={(e) => setValue('location', e.target.value)}
                        placeholder="e.g. Vancouver, BC"
                        autoComplete="off"
                        disabled={pending}
                        aria-invalid={issues.location ? true : undefined}
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field id="client-website" label="Website" error={issues.websiteUrl}>
                      <Input
                        id="client-website"
                        type="url"
                        value={values.websiteUrl}
                        onChange={(e) => setValue('websiteUrl', e.target.value)}
                        placeholder="https://…"
                        autoComplete="off"
                        spellCheck={false}
                        disabled={pending}
                        aria-invalid={issues.websiteUrl ? true : undefined}
                      />
                    </Field>
                    <Field id="client-instagram" label="Instagram" error={issues.instagram}>
                      <Input
                        id="client-instagram"
                        type="url"
                        value={values.instagram}
                        onChange={(e) => setValue('instagram', e.target.value)}
                        placeholder="https://www.instagram.com/…"
                        autoComplete="off"
                        spellCheck={false}
                        disabled={pending}
                        aria-invalid={issues.instagram ? true : undefined}
                      />
                    </Field>
                  </div>

                  <Field
                    id="client-bio"
                    label="Bio"
                    error={issues.bio}
                    hint="Blank line = new paragraph. Kept on file for future use."
                  >
                    <textarea
                      id="client-bio"
                      rows={4}
                      value={values.bio}
                      onChange={(e) => setValue('bio', e.target.value)}
                      disabled={pending}
                      aria-invalid={issues.bio ? true : undefined}
                      className={cn(textareaClasses, 'min-h-24')}
                    />
                  </Field>

                  {/* The logo wall — the client's only public switch now that
                      profile pages are gone. */}
                  <fieldset
                    disabled={pending}
                    className="flex flex-col gap-3 border-t border-white/40 pt-4 dark:border-white/10"
                  >
                    <legend className="float-left mb-2 text-sm font-medium text-foreground">
                      Logo wall
                    </legend>
                    <div className="flex flex-wrap gap-1.5">
                      <ToggleChip
                        checked={marquee}
                        onChange={setMarquee}
                        disabled={pending}
                      >
                        Show on the logo wall
                      </ToggleChip>
                      {marquee && (
                        <ToggleChip
                          checked={marqueeFeatured}
                          onChange={setMarqueeFeatured}
                          disabled={pending}
                        >
                          Feature on the home page
                        </ToggleChip>
                      )}
                    </div>
                    <p className="px-1 text-xs text-muted-foreground">
                      {CLIENT_MARQUEE_HELP}
                    </p>
                    {marquee && (
                      <>
                        <ChipGroup
                          legend="Coin face"
                          options={DISC_OPTIONS}
                          value={logoDisc}
                          onChange={(next) => {
                            setIssues(({ logoDisc: _cleared, ...rest }) => rest);
                            setLogoDisc(next);
                          }}
                          disabled={pending}
                          error={issues.logoDisc}
                          help={CLIENT_LOGO_DISC_HELP}
                        />
                        <Field
                          id="client-marquee-sort"
                          label="Order"
                          error={issues.marqueeSort}
                          hint="Lower shows earlier on the rails. Blank keeps the current slot, or appends at the end when joining."
                        >
                          <Input
                            id="client-marquee-sort"
                            type="number"
                            inputMode="numeric"
                            min={0}
                            step={1}
                            value={sortValue}
                            onChange={(e) => {
                              setSortValue(e.target.value);
                              setIssues(
                                ({ marqueeSort: _cleared, ...rest }) => rest,
                              );
                            }}
                            autoComplete="off"
                            disabled={pending}
                            aria-invalid={issues.marqueeSort ? true : undefined}
                            className="sm:w-40"
                          />
                        </Field>
                      </>
                    )}
                  </fieldset>

                  {editing && (
                    <div className="border-t border-white/40 pt-4 dark:border-white/10">
                      <ClientLogoField
                        clientId={client.id}
                        logoUrl={client.logoUrl}
                        hasUploadedLogo={client.hasUploadedLogo}
                      />
                    </div>
                  )}

                  <div className="mt-2 flex flex-col gap-2 sm:flex-row-reverse">
                    <Button
                      type="submit"
                      size="small"
                      shimmer={false}
                      showIcon={false}
                      disabled={pending || deleting}
                      className="w-full sm:w-auto"
                    >
                      {pending
                        ? 'Saving…'
                        : editing
                          ? 'Save changes'
                          : 'Create client'}
                    </Button>
                    <Dialog.Close asChild>
                      <Button
                        type="button"
                        variant="secondary"
                        size="small"
                        showIcon={false}
                        disabled={pending || deleting}
                        className="w-full sm:w-auto"
                      >
                        Cancel
                      </Button>
                    </Dialog.Close>
                    {editing && (
                      <div className="flex flex-1 items-center">
                        <Button
                          type="button"
                          variant="secondary"
                          size="small"
                          showIcon={false}
                          disabled={pending || deleting || client.projectCount > 0}
                          onClick={() => setConfirmingDelete(true)}
                          title={
                            client.projectCount > 0
                              ? 'Reassign or delete this client’s projects first.'
                              : undefined
                          }
                          className="text-destructive"
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                  {editing && client.projectCount > 0 && (
                    <p className="px-1 text-xs text-muted-foreground">
                      Deleting is disabled while {client.projectCount} project
                      {client.projectCount === 1 ? '' : 's'} still point
                      {client.projectCount === 1 ? 's' : ''} at this client.
                    </p>
                  )}
                </form>
              </Dialog.Content>
            </div>
          </div>
        </Dialog.Portal>
      </Dialog.Root>

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={(next) => !deleting && setConfirmingDelete(next)}
        title="Delete this client?"
        description="The client leaves the roster and the logo wall immediately. This can’t be undone."
        confirmLabel="Delete client"
        onConfirm={onDelete}
        destructive
        pending={deleting}
      />
    </>
  );
}

/** The roster header's "Add client" affordance — owns its dialog state. */
export function AddClientButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        size="small"
        icon={LuBuilding2}
        iconPosition="left"
        onClick={() => setOpen(true)}
      >
        Add client
      </Button>
      <ClientDialog open={open} onOpenChange={setOpen} client={null} />
    </>
  );
}

/** ProjectForm's "Featured" chip-checkbox idiom, extracted for the wall
 *  toggles. */
function ToggleChip({
  checked,
  onChange,
  disabled,
  children,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        'inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        'has-[:focus-visible]:ring-[1.5px] has-[:focus-visible]:ring-ring',
        checked
          ? 'border-transparent bg-foreground text-background'
          : 'border-foreground/15 bg-white/40 text-muted-foreground hover:text-foreground dark:bg-white/10',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      {children}
    </label>
  );
}

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error && (
        <p className="px-1 text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="px-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
