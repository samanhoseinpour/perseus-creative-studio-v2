'use client';

import { useState } from 'react';
import { LuPlus, LuRepeat, LuSettings2, LuTags } from 'react-icons/lu';

import Button from '@/components/Button';
import CategoryManageDialog, {
  type CategoryManageItem,
} from './CategoryManageDialog';
import TagManageDialog, {
  type TagManageItem,
  type TagScopeCategory,
} from './TagManageDialog';
import TaskDialog from './TaskDialog';
import TaskTemplatesDialog, { type TemplateItem } from './TaskTemplatesDialog';
import type { TaskFormOptions } from './types';

/**
 * The tasks header's right side: "New task" (the full-field alternative to
 * the quick-add row — notes, due date, deliverable at creation), the template
 * manager, and, for superadmins, the category and tag managers. Owns every
 * dialog's open state.
 */
export default function TasksHeaderActions({
  formOptions,
  categories,
  tags,
  scopeCategories,
  templates,
  todayKey,
}: {
  formOptions: TaskFormOptions;
  /** Present only for superadmins — gates the Categories button. */
  categories?: CategoryManageItem[];
  /** Present only for superadmins — gates the Tags button. */
  tags?: TagManageItem[];
  /** Every task category, id-valued, for the tag scope pickers. */
  scopeCategories: TagScopeCategory[];
  templates: TemplateItem[];
  /** The reader's today, server-computed — the dialog's start-date default. */
  todayKey: string;
}) {
  const [creating, setCreating] = useState(false);
  const [managing, setManaging] = useState(false);
  const [taggingVocab, setTaggingVocab] = useState(false);
  const [templating, setTemplating] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {categories && (
        <>
          <Button
            type="button"
            size="small"
            variant="secondary"
            icon={LuSettings2}
            iconPosition="left"
            onClick={() => setManaging(true)}
          >
            Categories
          </Button>
          <CategoryManageDialog
            open={managing}
            onOpenChange={setManaging}
            categories={categories}
          />
        </>
      )}
      {tags && (
        <>
          <Button
            type="button"
            size="small"
            variant="secondary"
            icon={LuTags}
            iconPosition="left"
            onClick={() => setTaggingVocab(true)}
          >
            Tags
          </Button>
          <TagManageDialog
            open={taggingVocab}
            onOpenChange={setTaggingVocab}
            tags={tags}
            categories={scopeCategories}
          />
        </>
      )}
      <Button
        type="button"
        size="small"
        variant="secondary"
        icon={LuRepeat}
        iconPosition="left"
        onClick={() => setTemplating(true)}
      >
        Templates
      </Button>
      <TaskTemplatesDialog
        open={templating}
        onOpenChange={setTemplating}
        templates={templates}
        options={formOptions}
      />
      <Button
        type="button"
        size="small"
        icon={LuPlus}
        iconPosition="left"
        shimmer={false}
        onClick={() => setCreating(true)}
      >
        New task
      </Button>
      <TaskDialog
        open={creating}
        onOpenChange={setCreating}
        task={null}
        options={formOptions}
        todayKey={todayKey}
      />
    </div>
  );
}
