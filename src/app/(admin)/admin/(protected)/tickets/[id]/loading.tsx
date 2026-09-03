import { SubmissionDetailSkeleton } from '@/components/Admin/skeletons/AdminSkeletons';

/**
 * `actions={0}`: TicketActions renders only for a triager, and the skeleton
 * cannot know who is reading. Reserving nothing is right for the reporter and
 * costs a triager one row appearing; reserving a row was wrong for every
 * reporter and drew pills that resolved to nothing.
 */
export default function Loading() {
  return <SubmissionDetailSkeleton label="Loading ticket" actions={0} />;
}
