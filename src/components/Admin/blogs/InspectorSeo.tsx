'use client';

import { Input } from '@/components/ui/input';
import { Field, selectClasses, textareaClasses } from '@/components/Admin/careers/FormField';
import { Group, TextRows, Toggle } from '@/components/Admin/blogs/InspectorBits';
import SnippetPreview from '@/components/Admin/blogs/SnippetPreview';
import { inspectorDivider } from '@/components/Admin/blogs/postBox';
import type { BlogEditorValues } from '@/components/Admin/blogs/postTypes';
import type { SetValue } from '@/components/Admin/blogs/InspectorPost';
import {
  ROBOTS_EXTRA_KEYS,
  ROBOTS_EXTRA_KINDS,
  ROBOTS_PREVIEW_VALUES,
  type RobotsExtraKey,
} from '@/lib/blogFields';

const KEYWORD_MAX = 30;
const KEYWORD_LENGTH = 80;
const SHORT_LENGTH = 300;
const LONG_LENGTH = 2000;

/** What each extra directive does, in the words a writer needs. The KEYS come
 *  from `blogFields.ts`, so a directive added there appears here with a blank
 *  explanation rather than being silently unofferable. */
const ROBOTS_HINTS: Record<RobotsExtraKey, string> = {
  'max-snippet': 'How many characters Google may quote. -1 means no limit, 0 means none at all.',
  'max-video-preview': 'How many seconds of a video may be previewed. -1 means no limit.',
  'max-image-preview': 'How big an image preview may be.',
  noarchive: 'No cached copy of the page.',
  nosnippet: 'No text snippet at all.',
  noimageindex: 'Keep the images out of image search.',
  notranslate: 'No offer to translate the page.',
  unavailable_after: 'Drop the page from search after this moment. An ISO date and time.',
};

const TWITTER_OPTIONS = [
  { value: 'summary_large_image', label: 'Large image' },
  { value: 'summary', label: 'Small square' },
] as const;

/**
 * The SEO pane: what the post says about itself to a search engine.
 *
 * THE SNIPPET PREVIEW SHOWS THE CANONICAL THE POST WILL REALLY CARRY, which is
 * the override when one is set and the post's own URL otherwise, because that
 * is the rule `blogStore.ts` applies. A preview that always showed the post's
 * own URL would be right up until the one case where the field matters.
 *
 * THE EXTRA DIRECTIVES ARE TYPED, NEVER FREE TEXT, and that is a correctness
 * rule rather than a convenience. Next serialises the resolved entries joined
 * with ', ' into both `robots` and `googleBot`, so a string value carrying a
 * comma injects a SECOND directive into the meta tag. Each control is built
 * from `ROBOTS_EXTRA_KINDS`, so the editor and the validator cannot offer
 * different keys or different value shapes.
 *
 * An unticked directive is REMOVED from the object rather than stored as
 * false: `blogRobotsExtraSchema` is `.strict()` with every key optional, and
 * an absent key is the only spelling of "we say nothing about this".
 */
export default function InspectorSeo({
  idPrefix,
  values,
  set,
  issues,
  disabled,
  canonicalUrl,
}: {
  idPrefix: string;
  values: BlogEditorValues;
  set: SetValue;
  issues: Record<string, string>;
  disabled: boolean;
  /** The URL the post will declare as canonical, resolved by the caller. */
  canonicalUrl: string;
}) {
  const id = (name: string) => `${idPrefix}-${name}`;
  const issue = (field: string): string | undefined =>
    issues[field] ??
    Object.entries(issues).find(([key]) => key.startsWith(`${field}.`))?.[1];

  const setExtra = (key: RobotsExtraKey, value: string | number | boolean | undefined) => {
    const next = { ...values.robotsExtra };
    if (value === undefined) delete next[key];
    else next[key] = value;
    set('robotsExtra', next);
  };

  return (
    <>
      <Field id={id('seo-title')} label="Search title" error={issue('seoTitle')}>
        <Input
          id={id('seo-title')}
          value={values.seoTitle}
          maxLength={SHORT_LENGTH}
          disabled={disabled}
          aria-invalid={issue('seoTitle') ? true : undefined}
          onChange={(e) => set('seoTitle', e.target.value)}
        />
      </Field>

      <Field
        id={id('seo-description')}
        label="Search description"
        error={issue('seoDescription')}
      >
        <textarea
          id={id('seo-description')}
          rows={3}
          className={textareaClasses}
          value={values.seoDescription}
          maxLength={LONG_LENGTH}
          disabled={disabled}
          aria-invalid={issue('seoDescription') ? true : undefined}
          onChange={(e) => set('seoDescription', e.target.value)}
        />
      </Field>

      <SnippetPreview
        title={values.seoTitle}
        description={values.seoDescription}
        url={canonicalUrl}
        noindex={!values.robotsIndex}
      />

      <div className={inspectorDivider} />

      <Field
        id={id('canonical')}
        label="Canonical URL"
        error={issue('canonicalOverride')}
        hint="Leave it empty unless this article was first published somewhere else. An https address, no fragment."
      >
        <Input
          id={id('canonical')}
          value={values.canonicalOverride}
          maxLength={2048}
          placeholder={canonicalUrl}
          disabled={disabled}
          aria-invalid={issue('canonicalOverride') ? true : undefined}
          onChange={(e) => set('canonicalOverride', e.target.value)}
        />
      </Field>

      <Group label="Search engines" error={issue('robotsExtra')}>
        <div className="flex flex-col gap-2.5">
          <Toggle
            id={id('robots-index')}
            label="Let this page be indexed"
            checked={values.robotsIndex}
            disabled={disabled}
            onChange={(next) => set('robotsIndex', next)}
          />
          <Toggle
            id={id('robots-follow')}
            label="Let its links be followed"
            checked={values.robotsFollow}
            disabled={disabled}
            onChange={(next) => set('robotsFollow', next)}
          />
        </div>
      </Group>

      <Group
        label="Extra directives"
        hint="Rarely needed. Each one is added to the robots tag exactly as named."
      >
        <div className="flex flex-col gap-2.5">
          {ROBOTS_EXTRA_KEYS.map((key) => {
            const kind = ROBOTS_EXTRA_KINDS[key];
            const stored = values.robotsExtra[key];
            if (kind === 'bool') {
              return (
                <Toggle
                  key={key}
                  id={id(`robots-${key}`)}
                  label={key}
                  hint={ROBOTS_HINTS[key]}
                  checked={stored === true}
                  disabled={disabled}
                  onChange={(next) => setExtra(key, next ? true : undefined)}
                />
              );
            }
            if (kind === 'preview') {
              return (
                <Field key={key} id={id(`robots-${key}`)} label={key} hint={ROBOTS_HINTS[key]}>
                  <select
                    id={id(`robots-${key}`)}
                    className={selectClasses}
                    value={typeof stored === 'string' ? stored : ''}
                    disabled={disabled}
                    onChange={(e) =>
                      setExtra(key, e.target.value === '' ? undefined : e.target.value)
                    }
                  >
                    <option value="">Not set</option>
                    {ROBOTS_PREVIEW_VALUES.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </Field>
              );
            }
            return (
              <Field
                key={key}
                id={id(`robots-${key}`)}
                label={key}
                hint={ROBOTS_HINTS[key]}
                error={issue(`robotsExtra.${key}`)}
              >
                <Input
                  id={id(`robots-${key}`)}
                  type={kind === 'int' ? 'number' : 'text'}
                  value={
                    stored === undefined || typeof stored === 'boolean' ? '' : String(stored)
                  }
                  placeholder={kind === 'int' ? 'Not set' : '2026-12-31T23:59:59Z'}
                  disabled={disabled}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') return setExtra(key, undefined);
                    if (kind !== 'int') return setExtra(key, raw);
                    const parsed = Number(raw);
                    // A half-typed "-" is not a number yet, and coercing it to
                    // NaN would store a value the schema then refuses with a
                    // message about a field the writer is still in.
                    return Number.isFinite(parsed)
                      ? setExtra(key, Math.trunc(parsed))
                      : setExtra(key, undefined);
                  }}
                />
              </Field>
            );
          })}
        </div>
      </Group>

      <div className={inspectorDivider} />

      <Field id={id('og-title')} label="Social title" error={issue('ogTitle')}>
        <Input
          id={id('og-title')}
          value={values.ogTitle}
          maxLength={SHORT_LENGTH}
          disabled={disabled}
          aria-invalid={issue('ogTitle') ? true : undefined}
          onChange={(e) => set('ogTitle', e.target.value)}
        />
      </Field>

      <Field
        id={id('og-description')}
        label="Social description"
        error={issue('ogDescription')}
      >
        <textarea
          id={id('og-description')}
          rows={3}
          className={textareaClasses}
          value={values.ogDescription}
          maxLength={LONG_LENGTH}
          disabled={disabled}
          aria-invalid={issue('ogDescription') ? true : undefined}
          onChange={(e) => set('ogDescription', e.target.value)}
        />
      </Field>

      <Field
        id={id('og-image')}
        label="Social image"
        error={issue('ogImageStaticPath')}
        hint="A path under /images. Leave it empty and the hero image is used."
      >
        <Input
          id={id('og-image')}
          value={values.ogImageStaticPath}
          maxLength={300}
          placeholder="/images/blogs/example.avif"
          disabled={disabled}
          aria-invalid={issue('ogImageStaticPath') ? true : undefined}
          onChange={(e) => set('ogImageStaticPath', e.target.value)}
        />
      </Field>

      <Field id={id('twitter')} label="X card shape" error={issue('twitterCard')}>
        <select
          id={id('twitter')}
          className={selectClasses}
          value={values.twitterCard}
          disabled={disabled}
          onChange={(e) =>
            set('twitterCard', e.target.value as BlogEditorValues['twitterCard'])
          }
        >
          {TWITTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>

      <div className={inspectorDivider} />

      <Group
        label="Focus keywords"
        hint="What this post is trying to rank for. Shown on the posts list so you can spot two posts chasing the same phrase."
        error={issue('focusKeywords')}
      >
        <TextRows
          idPrefix={id('keyword')}
          values={values.focusKeywords}
          onChange={(next) => set('focusKeywords', next)}
          max={KEYWORD_MAX}
          maxLength={KEYWORD_LENGTH}
          placeholder="drone videography vancouver"
          addLabel="Add a keyword"
          removeLabel="Remove keyword"
          disabled={disabled}
        />
      </Group>

      <Toggle
        id={id('legacy-keywords')}
        label="Emit the old keywords meta tag"
        hint="No search engine has used it since 2009. On only for posts that carried it before."
        checked={values.emitLegacyMetaKeywords}
        disabled={disabled}
        onChange={(next) => set('emitLegacyMetaKeywords', next)}
      />
    </>
  );
}
