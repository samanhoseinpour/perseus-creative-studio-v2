'use client';

import type { AnyExtension, Node as TiptapNode } from '@tiptap/core';
import { ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react';
import type { ComponentType } from 'react';

import ConsNodeView from '@/components/Admin/blogs/editor/nodeviews/Cons';
import FigureNodeView from '@/components/Admin/blogs/editor/nodeviews/Figure';
import HowToNodeView from '@/components/Admin/blogs/editor/nodeviews/HowTo';
import InstagramNodeView from '@/components/Admin/blogs/editor/nodeviews/Instagram';
import ProsNodeView from '@/components/Admin/blogs/editor/nodeviews/Pros';
import ProsConsNodeView from '@/components/Admin/blogs/editor/nodeviews/ProsCons';
import StepNodeView from '@/components/Admin/blogs/editor/nodeviews/Step';
import YoutubeNodeView from '@/components/Admin/blogs/editor/nodeviews/Youtube';
import type { BlogCustomNodeName } from '@/lib/blogBody';

/**
 * The eight node views, as overrides for `overrideByName`.
 *
 * THEY RIDE `.extend()` AND ADD NOTHING BUT `addNodeView`. That is the whole
 * contract of this file, and it is what keeps the schema-identity assertion in
 * `scripts/check-blogs.mts` true: `addNodeView` never reaches the node SPEC
 * (Tiptap collects it into the editor's `nodeViews` prop), so a node's name,
 * content, group, atom flag and attribute defaults are untouched. Anything
 * schema-shaped added here would be a change to the vocabulary the public
 * renderer validates against, and it belongs in `blogBody.ts` if it belongs
 * anywhere.
 *
 * They are NOT in `blogEditorExtensions.ts` because that leaf is React-free by
 * design: it is imported by the check script, which runs under plain node.
 * `BodyEditor` merges this map into the one `overrideByName` call it already
 * makes, so there is still exactly one composition and still no appending. The
 * clipboard half (`renderHTML` / `parseHTML`) DOES live in the leaf, because
 * that half changes the schema's DOM spec and the check script has to see it.
 */
const view =
  (
    Component: ComponentType<ReactNodeViewProps>,
    options?: Parameters<typeof ReactNodeViewRenderer>[1],
  ) =>
  (extension: AnyExtension): AnyExtension =>
    (extension as TiptapNode).extend({
      addNodeView() {
        return ReactNodeViewRenderer(Component, options);
      },
    });

export const BLOG_NODE_VIEWS: Record<
  BlogCustomNodeName,
  (extension: AnyExtension) => AnyExtension
> = {
  youtube: view(YoutubeNodeView),
  instagram: view(InstagramNodeView),
  figure: view(FigureNodeView),
  howTo: view(HowToNodeView),
  // The outer element is the `<li>` inside the how-to's `<ol>`, which is what
  // numbers the steps: a step cannot see its own index without
  // `trackNodeViewPosition`, and the browser's list counter needs nothing.
  step: view(StepNodeView, { as: 'li' }),
  prosCons: view(ProsConsNodeView),
  pros: view(ProsNodeView),
  cons: view(ConsNodeView),
};
