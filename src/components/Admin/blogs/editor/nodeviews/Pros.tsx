'use client';

import ProsConsColumn from '@/components/Admin/blogs/editor/nodeviews/ProsConsColumn';

/**
 * The `pros` column. Like `step`, it has NO `group` in the schema and exists
 * only inside its parent, so nothing here offers a way to create one on its
 * own: it arrives with the pros-and-cons block.
 */
export default function ProsNodeView() {
  return <ProsConsColumn label="Pros" glyph="+" />;
}
