'use client';

import { Button } from './Button';

export type ModalFooterLabels = {
  cancel?: string;
  save?: string;
};

export type ModalFooterProps = {
  formId?: string;
  onCancel: () => void;
  onSave?: () => void;
  saving?: boolean;
  labels?: ModalFooterLabels;
};

const DEFAULT_LABELS: Required<ModalFooterLabels> = {
  cancel: 'Cancel',
  save: 'Save',
};

/**
 * Pure modal action footer — pass translated labels from the host.
 */
export function ModalFooter({
  formId,
  onCancel,
  onSave,
  saving = false,
  labels,
}: ModalFooterProps) {
  const copy = { ...DEFAULT_LABELS, ...labels };

  return (
    <div className="flex items-center justify-end gap-3 rounded-xl border border-gray-100/80 bg-gradient-to-r from-gray-50/80 via-white/50 to-gray-50/80 px-6 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] dark:border-gray-800/40 dark:from-gray-800/30 dark:via-gray-900/20 dark:to-gray-800/30 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
      <Button size="lg" type="button" variant="outline" onClick={onCancel}>
        {copy.cancel}
      </Button>
      {onSave ? (
        <Button size="lg" onClick={onSave} loading={saving}>
          {copy.save}
        </Button>
      ) : (
        <Button size="lg" type="submit" form={formId} loading={saving}>
          {copy.save}
        </Button>
      )}
    </div>
  );
}

export default ModalFooter;
