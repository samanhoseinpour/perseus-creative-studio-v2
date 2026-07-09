'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  LuReply,
  LuMail,
  LuArchive,
  LuArchiveRestore,
  LuShieldCheck,
  LuTrash2,
} from 'react-icons/lu';

import Button from '@/components/Button';
import type { ContactSubmission } from '@/db/schema';
import {
  setSubmissionStatus,
  deleteSubmission,
} from '@/app/(admin)/admin/(protected)/_actions/inbox';
import { safeAction } from './safeAction';

type Status = ContactSubmission['status'];

type Props = {
  id: string;
  status: Status;
  email: string;
  replySubject: string;
  /** Where to return after an action that removes the row from the current view. */
  listHref: string;
};

export default function SubmissionActions({
  id,
  status,
  email,
  replySubject,
  listHref,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // `back` = the change moves the row out of the current tab, so return to the
  // list; otherwise stay and refresh so the buttons/badge reflect the new state.
  async function move(next: Status, success: string, back: boolean) {
    setPending(true);
    const res = await safeAction(setSubmissionStatus(id, next));
    if (!res.ok) {
      setPending(false);
      toast.error(res.error);
      return;
    }
    toast.success(success);
    if (back) {
      router.push(listHref);
    } else {
      setPending(false);
      router.refresh();
    }
  }

  async function onDelete() {
    setPending(true);
    const res = await safeAction(deleteSubmission(id));
    if (!res.ok) {
      setPending(false);
      toast.error(res.error);
      return;
    }
    toast.success('Submission deleted.');
    router.replace(listHref);
  }

  function reply() {
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(
      replySubject,
    )}`;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="small"
        variant="secondary"
        icon={LuReply}
        iconPosition="left"
        onClick={reply}
      >
        Reply
      </Button>

      {status === 'read' && (
        <Button
          type="button"
          size="small"
          variant="secondary"
          icon={LuMail}
          iconPosition="left"
          disabled={pending}
          onClick={() => move('new', 'Marked unread.', false)}
        >
          Mark unread
        </Button>
      )}

      {(status === 'new' || status === 'read') && (
        <Button
          type="button"
          size="small"
          variant="secondary"
          icon={LuArchive}
          iconPosition="left"
          disabled={pending}
          onClick={() => move('archived', 'Archived.', true)}
        >
          Archive
        </Button>
      )}

      {status === 'archived' && (
        <Button
          type="button"
          size="small"
          variant="secondary"
          icon={LuArchiveRestore}
          iconPosition="left"
          disabled={pending}
          onClick={() => move('read', 'Restored to inbox.', true)}
        >
          Unarchive
        </Button>
      )}

      {status === 'spam' && (
        <Button
          type="button"
          size="small"
          variant="secondary"
          icon={LuShieldCheck}
          iconPosition="left"
          disabled={pending}
          onClick={() => move('new', 'Restored — marked not spam.', true)}
        >
          Not spam
        </Button>
      )}

      {confirming ? (
        <span className="flex items-center gap-2">
          <Button
            type="button"
            size="small"
            background="var(--destructive)"
            icon={LuTrash2}
            iconPosition="left"
            disabled={pending}
            className="border-transparent [color:#fafafa]"
            onClick={onDelete}
          >
            {pending ? 'Deleting…' : 'Confirm delete'}
          </Button>
          <Button
            type="button"
            size="small"
            variant="secondary"
            showIcon={false}
            disabled={pending}
            onClick={() => setConfirming(false)}
          >
            Cancel
          </Button>
        </span>
      ) : (
        <Button
          type="button"
          size="small"
          variant="secondary"
          icon={LuTrash2}
          iconPosition="left"
          disabled={pending}
          className="text-destructive hover:text-destructive"
          onClick={() => setConfirming(true)}
        >
          Delete
        </Button>
      )}
    </div>
  );
}
