'use client';

import { Check } from 'lucide-react';
import { cn } from '../lib/cn';

export type WizardStepItem = {
  label: string;
  key?: string;
};

export type FormSummaryLabels = {
  step?: string;
  clickToEdit?: string;
};

export type FormSummaryProps = {
  title: string;
  description?: string;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  currentStep: number;
  totalSteps: number;
  steps?: WizardStepItem[];
  onStepClick?: (step: number) => void;
  mode?: 'create' | 'edit';
  labels?: FormSummaryLabels;
};

const DEFAULT_LABELS: Required<FormSummaryLabels> = {
  step: 'Step',
  clickToEdit: 'Click a step to edit',
};

export function FormSummary({
  title,
  description,
  className,
  titleClassName,
  descriptionClassName,
  currentStep,
  totalSteps,
  steps = [],
  onStepClick,
  mode = 'create',
  labels,
}: FormSummaryProps) {
  const copy = { ...DEFAULT_LABELS, ...labels };

  const stepItems: WizardStepItem[] =
    steps.length > 0
      ? steps
      : Array.from({ length: totalSteps }, (_, index) => ({
          label: `${copy.step} ${index + 1}`,
          key: `step-${index + 1}`,
        }));

  const canNavigateToStep = (step: number) => {
    if (!onStepClick || step === currentStep) return false;
    if (mode === 'edit') return true;
    return step < currentStep;
  };

  const handleStepClick = (step: number) => {
    if (!canNavigateToStep(step)) return;
    onStepClick?.(step);
  };

  return (
    <div
      className={cn(
        'mb-6 rounded-xl border border-gray-200/80 bg-gray-50/80 p-4 md:mb-8 md:p-5',
        'dark:border-gray-700/50 dark:bg-gray-800/40',
        className
      )}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-row items-center justify-between">
          <h3
            className={cn(
              'mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100',
              titleClassName
            )}
          >
            {title}
          </h3>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {copy.step} {currentStep} / {totalSteps}
          </p>
          {description ? (
            <p
              className={cn(
                'mt-1 text-sm text-gray-500 dark:text-gray-400',
                descriptionClassName
              )}
            >
              {description}
            </p>
          ) : null}
        </div>
      </div>

      <nav aria-label="Wizard steps" className="flex justify-center overflow-x-auto custom-scrollbar pb-1">
        <ol className="flex min-w-max items-start gap-0 pt-2">
          {stepItems.map((stepItem, index) => {
            const stepNumber = index + 1;
            const isCompleted = stepNumber < currentStep;
            const isCurrent = stepNumber === currentStep;
            const isUpcoming = stepNumber > currentStep;
            const isClickable = canNavigateToStep(stepNumber);

            return (
              <li key={stepItem.key ?? stepItem.label} className="flex items-start">
                <button
                  type="button"
                  onClick={() => handleStepClick(stepNumber)}
                  disabled={!isClickable}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={cn(
                    'group flex min-w-[7.5rem] max-w-[10rem] flex-col items-center gap-2 px-1 text-center transition-colors',
                    isClickable ? 'cursor-pointer' : 'cursor-default'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all',
                      isCurrent &&
                        'border-primary bg-primary text-white shadow-md ring-4 ring-primary/15',
                      isCompleted &&
                        'border-primary bg-primary/10 text-primary group-hover:bg-primary/20 dark:bg-primary/15',
                      isUpcoming &&
                        'border-gray-300 bg-white text-gray-400 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-500',
                      isClickable &&
                        !isCurrent &&
                        'group-hover:border-primary group-hover:text-primary'
                    )}
                  >
                    {isCompleted ? <Check className="h-3.5 w-3.5" /> : stepNumber}
                  </span>

                  <span
                    className={cn(
                      'line-clamp-2 text-xs font-medium leading-tight',
                      isCurrent && 'text-primary',
                      isCompleted && 'text-gray-700 dark:text-gray-300',
                      isUpcoming && 'text-gray-400 dark:text-gray-500',
                      isClickable && !isCurrent && 'group-hover:text-primary'
                    )}
                  >
                    {stepItem.label}
                  </span>
                </button>

                {stepNumber < totalSteps ? (
                  <div
                    aria-hidden
                    className={cn(
                      'mx-1 mt-4 h-0.5 w-8 shrink-0 rounded-full md:w-12',
                      stepNumber < currentStep ? 'bg-primary/50' : 'bg-gray-200 dark:bg-gray-700'
                    )}
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      </nav>

      {mode === 'edit' && onStepClick ? (
        <p className="mt-3 text-xs text-gray-700 dark:text-gray-300">{copy.clickToEdit}</p>
      ) : null}
    </div>
  );
}

export default FormSummary;
