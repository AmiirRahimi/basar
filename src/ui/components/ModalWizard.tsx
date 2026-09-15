'use client';

import { useState, type ReactNode } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';
import { cn } from '../lib/cn';

export type ModalWizardLabels = {
  back?: string;
  next?: string;
  submit?: string;
  saveAsTemplate?: string;
};

export type ModalWizardProps = {
  steps: ReactNode[];
  isOpen: boolean;
  onClose: () => void;
  templateSave?: boolean;
  showButton?: boolean;
  onSubmit?: () => void;
  onSaveAsTemplate?: () => void;
  labels?: ModalWizardLabels;
  className?: string;
};

const DEFAULT_LABELS: Required<ModalWizardLabels> = {
  back: 'Back',
  next: 'Next',
  submit: 'Submit',
  saveAsTemplate: 'Save as a template',
};

export function ModalWizard({
  steps,
  isOpen,
  onClose,
  templateSave = false,
  showButton = true,
  onSubmit,
  onSaveAsTemplate,
  labels,
  className,
}: ModalWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const copy = { ...DEFAULT_LABELS, ...labels };
  const totalSteps = steps.length;
  const stepContent = steps[currentStep - 1];
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;

  const handleClose = () => {
    setCurrentStep(1);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      rounded="lg"
      overlayClassName="dark:bg-opacity-40 dark:backdrop-blur-lg"
      containerClassName={cn(
        'bg-white p-10 shadow-xl dark:bg-gray-900 md:p-12 lg:p-16',
        className
      )}
    >
      <div className="w-full">
        {stepContent}
        {showButton ? (
          <div
            className={cn(
              'flex items-center gap-3 pt-8 md:pt-12',
              isFirstStep ? 'justify-end' : 'justify-between'
            )}
          >
            {!isFirstStep ? (
              <Button
                size="lg"
                rounded="lg"
                variant="outline"
                onClick={() => setCurrentStep((step) => step - 1)}
              >
                {copy.back}
              </Button>
            ) : null}
            <div className="flex w-fit justify-end gap-3">
              {templateSave && isLastStep ? (
                <Button
                  size="lg"
                  rounded="lg"
                  variant="outline"
                  type="button"
                  onClick={() => onSaveAsTemplate?.()}
                >
                  {copy.saveAsTemplate}
                </Button>
              ) : null}
              <Button
                size="lg"
                rounded="lg"
                variant="primary"
                type="button"
                onClick={() => {
                  if (!isLastStep) {
                    setCurrentStep((step) => step + 1);
                    return;
                  }
                  onSubmit?.();
                  handleClose();
                }}
              >
                {isLastStep ? copy.submit : copy.next}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

export default ModalWizard;
