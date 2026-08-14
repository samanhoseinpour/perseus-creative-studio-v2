'use client';

import { useState } from 'react';
import { LuPlus, LuSettings2 } from 'react-icons/lu';

import Button from '@/components/Button';
import CategoryManageDialog, {
  type CategoryManageItem,
} from './CategoryManageDialog';
import TaskDialog from './TaskDialog';
import type { TaskFormOptions } from './types';

/**
 * The tasks header's right side: "New task" (the full-field alternative to
 * the quick-add row — notes, due date, deliverable at creation) and, for
 * superadmins, the category manager. Owns both dialogs' open state.
 */
export default function TasksHeaderActions({
  formOptions,
  categories,
}: {
  formOptions: TaskFormOptions;
  /** Present only for superadmins — gates the Categories button. */
  categories?: CategoryManageItem[];
}) {
  const [creating, setCreating] = useState(false);
  const [managing, setManaging] = useState(false);

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
      />
    </div>
  );
}
