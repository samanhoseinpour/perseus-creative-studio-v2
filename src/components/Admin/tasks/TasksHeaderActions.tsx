'use client';

import { useState } from 'react';
import { LuPlus, LuRepeat, LuSettings2 } from 'react-icons/lu';

import Button from '@/components/Button';
import CategoryManageDialog, {
  type CategoryManageItem,
} from './CategoryManageDialog';
import TaskDialog from './TaskDialog';
import TaskTemplatesDialog, { type TemplateItem } from './TaskTemplatesDialog';
import type { TaskFormOptions } from './types';

/**
 * The tasks header's right side: "New task" (the full-field alternative to
 * the quick-add row — notes, due date, deliverable at creation), the template
 * manager, and, for superadmins, the category manager. Owns every dialog's
 * open state.
 */
export default function TasksHeaderActions({
  formOptions,
  categories,
  templates,
  todayKey,
}: {
  formOptions: TaskFormOptions;
  /** Present only for superadmins — gates the Categories button. */
  categories?: CategoryManageItem[];
  templates: TemplateItem[];
  /** Server-computed Vancouver today, for the dialog's start-date default. */
  todayKey: string;
}) {
  const [creating, setCreating] = useState(false);
  const [managing, setManaging] = useState(false);
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
