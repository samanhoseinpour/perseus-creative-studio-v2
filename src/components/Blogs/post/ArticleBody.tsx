import Image from '@/components/Mdx/Image';
import Instagram from '@/components/Mdx/Instagram';
import HowTo, { Step } from '@/components/Mdx/HowTo';
import ProsCons, { Cons, Pros } from '@/components/Mdx/ProsCons';
import SmartLink from '@/components/Mdx/SmartLink';
import YouTube from '@/components/YouTube';
import { ARTICLE_BODY_CLASS } from '@/lib/articleBodyClass';
import type { BlogDoc } from '@/lib/blogBody';
import { logError } from '@/lib/log';
import { renderArticle } from './articleMapping';

/* The wrapper's class list moved to `@/lib/articleBodyClass`, a zero-import
 * leaf, and is imported above rather than re-exported from here: the /admin
 * editor puts the same string on its ProseMirror root and cannot import this
 * Server Component, and a second door onto one string is how two surfaces
 * stop looking alike. */

type Props = { doc: BlogDoc; headingIds: string[] };

/** Server Component (verified: the pm/react entry runs under the react-server
 *  condition). Never add 'use client' here. */
export default function ArticleBody({ doc, headingIds }: Props) {
  return (
    <div className={ARTICLE_BODY_CLASS}>
      {renderArticle(
        doc,
        headingIds,
        {
          Image,
          YouTube,
          Instagram,
          HowTo,
          Step,
          ProsCons,
          Pros,
          Cons,
          SmartLink,
          onUnhandled: (name) =>
            logError('blog body node has no mapping', new Error(name), { event: 'blog.body.unhandled', node: name }),
        },
        process.env.NODE_ENV === 'development' ? 'development' : 'production',
      )}
    </div>
  );
}
