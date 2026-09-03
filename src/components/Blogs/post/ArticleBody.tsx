import Image from '@/components/Mdx/Image';
import Instagram from '@/components/Mdx/Instagram';
import HowTo, { Step } from '@/components/Mdx/HowTo';
import ProsCons, { Cons, Pros } from '@/components/Mdx/ProsCons';
import SmartLink from '@/components/Mdx/SmartLink';
import YouTube from '@/components/YouTube';
import type { BlogDoc } from '@/lib/blogBody';
import { logError } from '@/lib/log';
import { renderArticle } from './articleMapping';

/**
 * The article body wrapper: the exact class list the MDX render carried, so
 * the direct-child prose selectors keep matching. Block children sit DIRECTLY
 * under it (the doc mapping is a Fragment).
 */
export const ARTICLE_BODY_CLASS = [
  'article-body',
  'text-black/90 text-md leading-md',
  '[&>h2]:scroll-mt-24 [&>h2]:mt-12 [&>h2]:mb-6 [&>h2]:text-2xl sm:[&>h2]:text-3xl [&>h2]:font-bold [&>h2]:text-black [&>h2]:max-w-2xl [&>h2]:border-l-3 [&>h2]:border-black/20 [&>h2]:pl-4',
  '[&>h3]:scroll-mt-24 [&>h3]:mt-8 [&>h3]:mb-2 [&>h3]:text-lg  sm:[&>h3]:text-xl [&>h3]:font-semibold [&>h3]:text-black',
  '[&>h4]:scroll-mt-24 [&>h4]:mt-6 [&>h4]:mb-2 [&>h4]:text-md  sm:[&>h4]:text-lg [&>h4]:font-semibold [&>h4]:text-black',
  '[&_a]:text-black [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:opacity-80',
  '[&>ul]:my-4 [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:text-sm [&>ul]:leading-sm',
  '[&>ol]:my-4 [&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:text-sm [&>ol]:leading-sm',
  '[&_li]:my-1',
  '[&>blockquote]:my-6 [&>blockquote]:border-l-2 [&>blockquote]:border-black/20 [&>blockquote]:pl-4 [&>blockquote]:text-black/80',
  '[&>hr]:my-10 [&>hr]:border-black/20',
  '[&>pre]:my-6 [&>pre]:overflow-x-auto [&>pre]:rounded-xl [&>pre]:bg-black/5 [&>pre]:p-4',
  '[&_code]:rounded [&_code]:bg-black/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-black',
  '[&_table]:w-full',
  '[&_table]:border-separate [&_table]:border-spacing-0',
  '[&_th]:border-b [&_th]:border-white/20 [&_th]:p-3 [&_th]:align-top',
  '[&_th:not(:last-child)]:border-r',
  '[&_td]:border-b [&_td]:border-black/20 [&_td]:p-3 [&_td]:align-top [&_td]:text-sm',
  '[&_td:not(:last-child)]:border-r',
  '[&_tbody_tr:last-child_td]:border-b-0',
  '[&_thead_th]:bg-black [&_th]:text-white',
  '[&_tbody_tr:nth-child(odd)]:bg-black/10',
  '[&_tbody_tr:nth-child(even)]:bg-white',
  'hover:[&_tbody_tr]:bg-black/10',
].join(' ');

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
