'use client';

import ProsConsColumn from '@/components/Admin/blogs/editor/nodeviews/ProsConsColumn';

/**
 * The `cons` column. No `group` in the schema, so it exists only inside its
 * parent and nothing here creates one standing alone. The glyph is a MINUS
 * SIGN rather than a hyphen, matching `Mdx/ProsCons`.
 */
export default function ConsNodeView() {
  return <ProsConsColumn label="Cons" glyph="−" />;
}
