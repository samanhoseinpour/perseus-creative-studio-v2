// No 'use client' directive: a pure leaf of the inspector, which is already a
// client entry (the BlogRowMenu / TaskRowMenu precedent). It has no state and
// no handlers, so a directive here would buy nothing.
import {
  SNIPPET_DESCRIPTION_TARGET,
  SNIPPET_TITLE_TARGET,
  snippetClamp,
} from '@/lib/blogEditorFields';
import { snippetShell } from '@/components/Admin/blogs/postBox';
import { cn } from '@/lib/utils';

/**
 * What the post looks like in a search result, live as the two SEO fields are
 * typed.
 *
 * IT IS DRAWN ON WHITE, IN GOOGLE'S OWN COLOURS, IN BOTH THEMES, and that is
 * the editor canvas's rule rather than an exception to the house palette: the
 * canvas is white because it is a rendering of the public article, and this is
 * a rendering of somewhere else again. What a writer is judging here is
 * exactly how the line reads on that page, and a grey-on-glass version of it
 * would be a preview of nothing. The card is bordered and labelled so it reads
 * as a picture rather than as another field.
 *
 * The counts beside each field state the REAL length, never the truncated one.
 * The clamp is where Google usually cuts; it is not a limit, and the schema's
 * own cap is far higher. A preview that silently shortened a value and said
 * nothing would read as a refusal that never happened.
 */
export default function SnippetPreview({
  title,
  description,
  url,
  noindex,
}: {
  title: string;
  description: string;
  /** The canonical the post will carry: the override when set, else its own. */
  url: string;
  /** `robots_index` is off, so the preview is of a page Google is told to skip. */
  noindex: boolean;
}) {
  const shownTitle = snippetClamp(title, SNIPPET_TITLE_TARGET);
  const shownDescription = snippetClamp(description, SNIPPET_DESCRIPTION_TARGET);
  return (
    <div className="flex flex-col gap-2">
      <div className={cn(snippetShell, 'bg-white')}>
        <p className="truncate font-sans text-xs text-[#202124]">{url}</p>
        <p className="truncate font-sans text-base leading-snug text-[#1a0dab]">
          {shownTitle || 'Untitled'}
        </p>
        <p className="font-sans text-[0.8rem] leading-snug text-[#4d5156]">
          {shownDescription || 'No description yet.'}
        </p>
      </div>
      <p className="px-1 text-xs text-muted-foreground">
        Title {title.trim().length} characters, description{' '}
        {description.trim().length}. Google usually shows about{' '}
        {SNIPPET_TITLE_TARGET} and {SNIPPET_DESCRIPTION_TARGET}.
        {noindex ? ' Search engines are told to skip this page.' : ''}
      </p>
    </div>
  );
}
