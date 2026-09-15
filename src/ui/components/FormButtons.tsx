'use client';

import { Button } from './Button';
import { cn } from '../lib/cn';

export type FormButtonsLabels = {
  back?: string;
  cancel?: string;
  next?: string;
  save?: string;
  submit?: string;
};

export type FormButtonsProps = {
  isInWizard?: boolean;
  isFirstStep?: boolean;
  isLastStep?: boolean;
  isInFilter?: boolean;
  isInModal?: boolean;
  mode?: 'create' | 'edit' | 'view' | string;
  formId?: string;
  loading?: boolean;
  onBack?: () => void;
  onCancel?: () => void;
  setCurrentStep?: (updater: number | ((prev: number) => number)) => void;
  buttons?: {
    showCancel?: boolean;
    showSubmit?: boolean;
  };
  labels?: FormButtonsLabels;
  className?: string;
};

const DEFAULT_LABELS: Required<FormButtonsLabels> = {
  back: 'Back',
  cancel: 'Cancel',
  next: 'Next',
  save: 'Save',
  submit: 'Submit',
};

export function FormButtons({
  isInWizard,
  isFirstStep,
  isLastStep,
  isInFilter,
  isInModal,
  mode,
  formId,
  loading = false,
  onBack,
  onCancel,
  setCurrentStep,
  buttons,
  labels,
  className,
}: FormButtonsProps) {
  const copy = { ...DEFAULT_LABELS, ...labels };

  if (isInFilter) return null;

  if (isInWizard) {
    return (
      <div
        className={cn(
          'action-strip sticky bottom-0 z-[5] mt-4 rounded-lg',
          isFirstStep ? 'justify-end' : 'justify-between',
          className
        )}
      >
        {!isFirstStep ? (
          <Button
            size="md"
            variant="outline"
            disabled={loading}
            onClick={() =>
              onBack ? onBack() : setCurrentStep?.((prev) => prev - 1)
            }
          >
            {copy.back}
          </Button>
        ) : null}
        <div className="flex gap-2">
          <Button
            size="md"
            variant="outline"
            type="button"
            disabled={loading}
            onClick={() => onCancel?.()}
          >
            {copy.cancel}
          </Button>
          <Button size="md" type="submit" form={formId} loading={loading}>
            {isLastStep ? (mode === 'edit' ? copy.save : copy.submit) : copy.next}
          </Button>
        </div>
      </div>
    );
  }

  if (mode === 'view') return null;

  return (
    <div className={cn('action-strip sticky bottom-0 z-[5] mt-4 rounded-lg', className)}>
      {buttons?.showCancel ? (
        <Button
          size="md"
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() => onCancel?.()}
        >
          {isInModal ? copy.cancel : copy.back}
        </Button>
      ) : null}
      {buttons?.showSubmit ? (
        <Button size="md" type="submit" form={formId} loading={loading}>
          {mode === 'edit' ? copy.save : copy.submit}
        </Button>
      ) : null}
    </div>
  );
}

export default FormButtons;
