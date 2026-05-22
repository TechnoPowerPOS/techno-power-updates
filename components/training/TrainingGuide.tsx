import React, { useEffect, useState, useRef } from 'react';
import { useTraining } from '../../hooks/useTraining';
import { TRAINING_STEPS } from '../../trainingSteps';
import Button from '../ui/Button';
import { useTranslation } from '../../hooks/useTranslation';

const TrainingGuide: React.FC = () => {
  const { currentStepIndex, stopTraining, nextStep, prevStep } = useTraining();
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const popoverRef = useRef<HTMLDivElement>(null);

  const currentStep = TRAINING_STEPS[currentStepIndex];

  useEffect(() => {
    const selector = currentStep?.selector;
    if (selector) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) {
        setHighlightedElement(element);
        element.style.zIndex = '10001';
        element.style.position = 'relative';

        const rect = element.getBoundingClientRect();
        const popoverRect = popoverRef.current?.getBoundingClientRect();

        let top = rect.bottom + 10;
        let left = rect.left + (rect.width / 2);

        if (popoverRect) {
            left -= popoverRect.width / 2;
             // Check if it goes off screen bottom
            if (top + popoverRect.height > window.innerHeight) {
                top = rect.top - popoverRect.height - 10;
            }
        }
        // Clamp to screen edges
        left = Math.max(10, Math.min(left, window.innerWidth - (popoverRect?.width || 300) - 10));


        setPopoverStyle({
          position: 'fixed',
          top: `${top}px`,
          left: `${left}px`,
          transform: 'translateX(0)',
        });
      } else {
        setHighlightedElement(null);
        setPopoverStyle({ // Center if no element
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
        });
      }
    } else {
      setHighlightedElement(null);
      setPopoverStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      });
    }

    return () => {
      if (highlightedElement) {
        highlightedElement.style.zIndex = '';
        highlightedElement.style.position = '';
      }
    };
  }, [currentStep, highlightedElement]);

  if (!currentStep) {
    stopTraining();
    return null;
  }
  
  const { t } = useTranslation();

  const isLastStep = currentStepIndex === TRAINING_STEPS.length - 1;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[10000] animate-fadeIn" onClick={stopTraining}></div>
      <div
        ref={popoverRef}
        style={popoverStyle}
        className="z-[10001] w-80 bg-white rounded-lg shadow-xl p-5 animate-scaleUp"
      >
        <h3 className="text-lg font-bold mb-2">{currentStep.title}</h3>
        <p className="text-sm text-slate-600 mb-4">{currentStep.content}</p>
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-500">
            {currentStepIndex + 1} / {TRAINING_STEPS.length}
          </span>
          <div className="flex gap-2">
            {currentStepIndex > 0 && (
              <Button size="sm" variant="secondary" onClick={prevStep}>
                {t('training.previous')}
              </Button>
            )}
            <Button size="sm" onClick={isLastStep ? stopTraining : nextStep}>
              {isLastStep ? t('training.finish') : t('training.next')}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default TrainingGuide;
