'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { LuLoaderCircle, LuSearch } from 'react-icons/lu';

import { Input } from '@/components/ui/input';
import { Field, selectClasses, textareaClasses } from '@/components/Admin/careers/FormField';
import {
  AddRow,
  Group,
  RemoveRow,
  TextRows,
  Toggle,
} from '@/components/Admin/blogs/InspectorBits';
import {
  inspectorCard,
  inspectorDivider,
  inspectorRow,
} from '@/components/Admin/blogs/postBox';
import type {
  BlogEditorValues,
  BlogOption,
  BlogOptionGroup,
} from '@/components/Admin/blogs/postTypes';
import { searchPostLinks } from '@/app/(admin)/admin/(protected)/_actions/blogPosts';
import { BLOG_POST_STATUS_LABELS } from '@/lib/blogFields';
import { cn } from '@/lib/utils';

/** One searchable link target. Derived from the ACTION rather than imported
 *  from `@/db/blogAdminQueries`, which carries `server-only`: the type would be
 *  erased anyway, but taking it off the door the client actually calls means
 *  there is no import here that could ever become a value one. */
type LinkTarget = Awaited<ReturnType<typeof searchPostLinks>>[number];

/** The schema's own caps, restated at the controls so a list stops offering
 *  rows the door would refuse. Kept beside each other rather than imported,
 *  because `blogPostSchema.ts` reaches `blogBody.ts` and with it the whole
 *  Tiptap schema, which must never enter a client chunk. */
const TAKEAWAY_MAX = 5;
const TAKEAWAY_LENGTH = 240;
const FAQ_MAX = 30;
const SOURCE_MAX = 50;
const ENTITY_MAX = 30;
const ENTITY_LINK_MAX = 20;
const RELATED_MAX = 12;
/** `PORTFOLIO_SLUG_MAX`, which `BLOG_SLUG_MAX` is defined as. Restated rather
 *  than imported for the reason the caps above are. */
const SLUG_LENGTH = 120;
/** Below this a query is too short to be worth a round trip, and its results
 *  are not rendered at all. */
const MIN_QUERY = 2;
const SHORT_LENGTH = 300;
const LONG_LENGTH = 2000;

const REL_OPTIONS = [
  { value: '', label: 'Ordinary link' },
  { value: 'nofollow', label: 'nofollow' },
  { value: 'sponsored', label: 'sponsored' },
  { value: 'ugc', label: 'ugc' },
] as const;

export type SetValue = <K extends keyof BlogEditorValues>(
  key: K,
  value: BlogEditorValues[K],
) => void;

/**
 * The Post pane: everything about the article that is not the article.
 *
 * THE HERO IMAGE, ITS DESCRIPTION AND ITS CAPTION ARE NOT HERE. `HeroField`
 * owns all three and is mounted on the canvas, where the picture belongs. Two
 * sets of inputs bound to one value is a real defect, not a duplication of
 * effort, so this pane names none of them.
 *
 * THE SLUG LOCKS ONCE THE POST HAS BEEN PUBLISHED, and it says so rather than
 * silently refusing on save: the working row's slug is the public URL, so an
 * unlocked edit would move a live post the moment it saved and every inbound
 * link would 404. The lock lifts when the programme ships redirects.
 *
 * EVERY LIST DROPS ITS BLANK ROWS ON THE WAY OUT, in `compactPostLists`, not
 * here. An empty row on screen is an affordance; a whitespace-only stored
 * value is refused by the draft door as well as the publish door, so without
 * the drop a writer who clicked "Add FAQ" and typed one space would watch
 * every autosave fail while they were still thinking.
 */
export default function InspectorPost({
  idPrefix,
  values,
  set,
  issues,
  disabled,
  slugLocked,
  authors,
  categories,
  serviceGroups,
  onSlugEdited,
  publishedLabel,
  canAmendDate,
  onAmendDate,
}: {
  idPrefix: string;
  values: BlogEditorValues;
  set: SetValue;
  issues: Record<string, string>;
  disabled: boolean;
  slugLocked: boolean;
  authors: BlogOption[];
  categories: BlogOption[];
  serviceGroups: BlogOptionGroup[];
  onSlugEdited: () => void;
  publishedLabel: string;
  canAmendDate: boolean;
  onAmendDate: () => void;
}) {
  const id = (name: string) => `${idPrefix}-${name}`;
  const issue = (field: string): string | undefined =>
    issues[field] ??
    Object.entries(issues).find(([key]) => key.startsWith(`${field}.`))?.[1];

  return (
    <>
      <Field
        id={id('slug')}
        label="Address"
        error={issue('slug')}
        hint={
          slugLocked
            ? 'Fixed. This post has been published, so renaming it would break every link that points at it.'
            : 'The last part of the URL. It follows the title until you change it here.'
        }
      >
        <Input
          id={id('slug')}
          value={values.slug}
          maxLength={SLUG_LENGTH}
          disabled={disabled || slugLocked}
          aria-invalid={issue('slug') ? true : undefined}
          onChange={(e) => {
            onSlugEdited();
            set('slug', e.target.value);
          }}
        />
      </Field>

      <Field id={id('author')} label="Author" error={issue('authorSlug')}>
        <select
          id={id('author')}
          className={selectClasses}
          value={values.authorSlug}
          disabled={disabled}
          onChange={(e) => set('authorSlug', e.target.value)}
        >
          {authors.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </Field>

      <Field
        id={id('category')}
        label="Category"
        error={issue('categorySlug')}
        hint="A category needs its own SEO title and description before a post in it can go live."
      >
        <select
          id={id('category')}
          className={selectClasses}
          value={values.categorySlug}
          disabled={disabled}
          onChange={(e) => set('categorySlug', e.target.value)}
        >
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>

      <Field
        id={id('service')}
        label="Service to promote"
        error={issue('serviceSlug')}
        hint="Fills the card in the sidebar. Leave it blank to use the category's own pick."
      >
        <select
          id={id('service')}
          className={selectClasses}
          value={values.serviceSlug}
          disabled={disabled}
          onChange={(e) => set('serviceSlug', e.target.value)}
        >
          <option value="">{"The category's usual one"}</option>
          {serviceGroups.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </Field>

      <Field
        id={id('description')}
        label="Excerpt"
        error={issue('description')}
        hint="The sentence under the title on the blog index and on every card."
      >
        <textarea
          id={id('description')}
          rows={3}
          className={textareaClasses}
          value={values.description}
          maxLength={LONG_LENGTH}
          disabled={disabled}
          aria-invalid={issue('description') ? true : undefined}
          onChange={(e) => set('description', e.target.value)}
        />
      </Field>

      <div className={inspectorDivider} />

      <Group
        label="Key takeaways"
        hint="Up to five. They open the article as a summary box."
        error={issue('keyTakeaways')}
      >
        <TextRows
          idPrefix={id('takeaway')}
          values={values.keyTakeaways}
          onChange={(next) => set('keyTakeaways', next)}
          max={TAKEAWAY_MAX}
          maxLength={TAKEAWAY_LENGTH}
          placeholder="One sentence a reader should leave with"
          addLabel="Add a takeaway"
          removeLabel="Remove takeaway"
          disabled={disabled}
        />
      </Group>

      <Group
        label="FAQs"
        hint="Rendered as an accordion at the foot of the article, and published as FAQ structured data."
        error={issue('faqs')}
      >
        <div className="flex flex-col gap-2">
          {values.faqs.map((faq, index) => (
            <div key={index} className={inspectorCard}>
              <div className={inspectorRow}>
                <Input
                  aria-label={`Question ${index + 1}`}
                  value={faq.question}
                  maxLength={SHORT_LENGTH}
                  placeholder="Question"
                  disabled={disabled}
                  onChange={(e) =>
                    set(
                      'faqs',
                      values.faqs.map((f, i) =>
                        i === index ? { ...f, question: e.target.value } : f,
                      ),
                    )
                  }
                />
                <RemoveRow
                  label={`Remove FAQ ${index + 1}`}
                  disabled={disabled}
                  onRemove={() =>
                    set('faqs', values.faqs.filter((_, i) => i !== index))
                  }
                />
              </div>
              <textarea
                aria-label={`Answer ${index + 1}`}
                rows={3}
                className={textareaClasses}
                value={faq.answer}
                maxLength={LONG_LENGTH}
                placeholder="Answer"
                disabled={disabled}
                onChange={(e) =>
                  set(
                    'faqs',
                    values.faqs.map((f, i) =>
                      i === index ? { ...f, answer: e.target.value } : f,
                    ),
                  )
                }
              />
            </div>
          ))}
          <AddRow
            label="Add an FAQ"
            count={values.faqs.length}
            max={FAQ_MAX}
            disabled={disabled}
            onAdd={() => set('faqs', [...values.faqs, { question: '', answer: '' }])}
          />
        </div>
      </Group>

      <Group
        label="Sources"
        hint="Listed under the article and linked from it."
        error={issue('sources')}
      >
        <div className="flex flex-col gap-2">
          {values.sources.map((source, index) => (
            <div key={index} className={inspectorCard}>
              <div className={inspectorRow}>
                <Input
                  aria-label={`Source ${index + 1} title`}
                  value={source.title}
                  maxLength={SHORT_LENGTH}
                  placeholder="What it is"
                  disabled={disabled}
                  onChange={(e) =>
                    set(
                      'sources',
                      values.sources.map((s, i) =>
                        i === index ? { ...s, title: e.target.value } : s,
                      ),
                    )
                  }
                />
                <RemoveRow
                  label={`Remove source ${index + 1}`}
                  disabled={disabled}
                  onRemove={() =>
                    set('sources', values.sources.filter((_, i) => i !== index))
                  }
                />
              </div>
              <Input
                aria-label={`Source ${index + 1} link`}
                value={source.href}
                maxLength={2048}
                placeholder="https://"
                disabled={disabled}
                onChange={(e) =>
                  set(
                    'sources',
                    values.sources.map((s, i) =>
                      i === index ? { ...s, href: e.target.value } : s,
                    ),
                  )
                }
              />
              <select
                aria-label={`Source ${index + 1} link type`}
                className={selectClasses}
                value={source.rel ?? ''}
                disabled={disabled}
                onChange={(e) =>
                  set(
                    'sources',
                    values.sources.map((s, i) => {
                      if (i !== index) return s;
                      const picked = e.target.value;
                      if (picked === '') {
                        // `rel` is optional on the stored shape, and an
                        // "ordinary link" is spelled by the key being ABSENT
                        // rather than by an empty string the schema refuses.
                        const cleared = { ...s };
                        delete cleared.rel;
                        return cleared;
                      }
                      return { ...s, rel: picked as 'nofollow' | 'sponsored' | 'ugc' };
                    }),
                  )
                }
              >
                {REL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <AddRow
            label="Add a source"
            count={values.sources.length}
            max={SOURCE_MAX}
            disabled={disabled}
            onAdd={() => set('sources', [...values.sources, { title: '', href: '' }])}
          />
        </div>
      </Group>

      <Group
        label="Things the article is about"
        hint="Named entities with a link each, published as structured data so a search engine can tell which company or place is meant."
        error={issue('entities')}
      >
        <div className="flex flex-col gap-2">
          {values.entities.map((entity, index) => (
            <div key={index} className={inspectorCard}>
              <div className={inspectorRow}>
                <Input
                  aria-label={`Entity ${index + 1} name`}
                  value={entity.name}
                  maxLength={200}
                  placeholder="Name"
                  disabled={disabled}
                  onChange={(e) =>
                    set(
                      'entities',
                      values.entities.map((v, i) =>
                        i === index ? { ...v, name: e.target.value } : v,
                      ),
                    )
                  }
                />
                <RemoveRow
                  label={`Remove entity ${index + 1}`}
                  disabled={disabled}
                  onRemove={() =>
                    set('entities', values.entities.filter((_, i) => i !== index))
                  }
                />
              </div>
              <textarea
                aria-label={`Entity ${index + 1} links`}
                rows={2}
                className={textareaClasses}
                value={entity.sameAs.join('\n')}
                placeholder={'https://example.com\nOne link per line'}
                disabled={disabled}
                onChange={(e) =>
                  set(
                    'entities',
                    values.entities.map((v, i) =>
                      i === index
                        ? { ...v, sameAs: e.target.value.split('\n').slice(0, ENTITY_LINK_MAX) }
                        : v,
                    ),
                  )
                }
              />
              <Toggle
                id={id(`entity-primary-${index}`)}
                label="This is what the article is mainly about"
                checked={entity.primary}
                disabled={disabled}
                onChange={(next) =>
                  set(
                    'entities',
                    values.entities.map((v, i) =>
                      i === index ? { ...v, primary: next } : v,
                    ),
                  )
                }
              />
            </div>
          ))}
          <AddRow
            label="Add an entity"
            count={values.entities.length}
            max={ENTITY_MAX}
            disabled={disabled}
            onAdd={() =>
              set('entities', [
                ...values.entities,
                { name: '', sameAs: [''], primary: false },
              ])
            }
          />
        </div>
      </Group>

      <div className={inspectorDivider} />

      <RelatedPosts
        idPrefix={idPrefix}
        slugs={values.relatedSlugs}
        onChange={(next) => set('relatedSlugs', next)}
        disabled={disabled}
        error={issue('relatedSlugs')}
      />

      <div className={inspectorDivider} />

      <Group label="Publication date">
        <p className="text-xs text-muted-foreground">
          {publishedLabel
            ? `This post says it went out on ${publishedLabel}.`
            : 'Set when the post is first published.'}
        </p>
        {canAmendDate && (
          <div>
            <button
              type="button"
              disabled={disabled}
              onClick={onAmendDate}
              className="rounded-lg border border-foreground/15 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-foreground/[0.06] disabled:pointer-events-none disabled:opacity-40"
            >
              Change the date
            </button>
          </div>
        )}
      </Group>

      <Toggle
        id={id('llms')}
        label="List this post for AI crawlers"
        hint="Includes it in llms.txt, the reading list assistants pick up."
        checked={values.llmsInclude}
        disabled={disabled}
        onChange={(next) => set('llmsInclude', next)}
      />
    </>
  );
}

/**
 * Hand-picked related posts.
 *
 * SEARCHES THROUGH THE SERVER ACTION, never the query behind it:
 * `searchLinkTargets` is `server-only` and importing it here would fail the
 * build. `searchPostLinks` is the door, it gates on the blogs area like every
 * other action in the file, and it returns unpublished targets MARKED rather
 * than hidden, because linking to a post you are about to publish is an
 * ordinary thing to do and the publish door already warns about it.
 *
 * A chip is the SLUG, which is the value that is stored and the thing that
 * makes the link. The title rides along when the pick came from this search;
 * for a slug already on the post when the editor opened, the slug is all there
 * is, and showing it plainly is better than fetching a title nothing else
 * needs.
 */
function RelatedPosts({
  idPrefix,
  slugs,
  onChange,
  disabled,
  error,
}: {
  idPrefix: string;
  slugs: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  error?: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LinkTarget[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [searching, startSearch] = useTransition();
  // Every reply carries the query it answered, so a slow one landing after a
  // faster later one cannot overwrite it.
  const latest = useRef('');

  useEffect(() => {
    const term = query.trim();
    latest.current = term;
    // Nothing is cleared here on purpose: a short query simply stops RENDERING
    // the list (see `showResults` below), which keeps this effect free of a
    // synchronous setState and its cascading render.
    if (term.length < MIN_QUERY) return;
    const timer = setTimeout(() => {
      startSearch(async () => {
        const found = await searchPostLinks(term).catch(() => []);
        if (latest.current !== term) return;
        setResults(found);
        setTitles((prev) => {
          const next = { ...prev };
          for (const item of found) next[item.slug] = item.title;
          return next;
        });
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const full = slugs.length >= RELATED_MAX;
  // Whether the results state is CURRENT. A short query leaves whatever the
  // last search found sitting in state, unrendered, rather than clearing it
  // from inside the effect.
  const live = query.trim().length >= MIN_QUERY;
  const offered = live ? results.filter((item) => !slugs.includes(item.slug)) : [];

  return (
    <Group
      label="Related posts"
      hint="Up to twelve, shown at the foot of the article. Leave it empty and the category picks them."
      error={error}
    >
      {slugs.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {slugs.map((slug, index) => (
            <li
              key={slug}
              className="flex items-center gap-2 rounded-lg border border-foreground/10 bg-foreground/[0.02] px-2.5 py-1.5"
            >
              <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                {titles[slug] ?? slug}
              </span>
              <RemoveRow
                label={`Remove ${slug}`}
                disabled={disabled}
                onRemove={() => onChange(slugs.filter((_, i) => i !== index))}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <LuSearch
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id={`${idPrefix}-related-search`}
          value={query}
          placeholder={full ? 'Twelve is the limit' : 'Search posts to link'}
          disabled={disabled || full}
          className="pl-8"
          onChange={(e) => setQuery(e.target.value)}
        />
        {searching && (
          <LuLoaderCircle
            aria-hidden="true"
            className="absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground"
          />
        )}
      </div>

      {live && !searching && offered.length === 0 && (
        <p className="px-1 text-xs text-muted-foreground">Nothing matches.</p>
      )}

      {offered.length > 0 && !full && (
        <ul className="flex flex-col gap-1">
          {offered.map((item) => (
              <li key={item.slug}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange([...slugs, item.slug]);
                    setQuery('');
                    setResults([]);
                  }}
                  className={cn(
                    'flex w-full flex-col items-start gap-0.5 rounded-lg px-2.5 py-1.5 text-left transition-colors',
                    'hover:bg-foreground/[0.06] disabled:pointer-events-none disabled:opacity-40',
                  )}
                >
                  <span className="line-clamp-1 text-xs font-medium text-foreground">
                    {item.title || item.slug}
                  </span>
                  <span className="text-[0.7rem] text-muted-foreground">
                    {item.slug}
                    {item.status === 'published'
                      ? ''
                      : `, ${BLOG_POST_STATUS_LABELS[item.status].toLowerCase()} and not live yet`}
                  </span>
                </button>
              </li>
            ))}
        </ul>
      )}
    </Group>
  );
}
