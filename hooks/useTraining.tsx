import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';

interface TrainingContextType {
  isTrainingActive: boolean;
  currentStepIndex: number;
  startTraining: () => void;
  stopTraining: () => void;
  nextStep: () => void;
  prevStep: () => void;
}

const TrainingContext = createContext<TrainingContextType | undefined>(undefined);

export const TrainingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isTrainingActive, setIsTrainingActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const startTraining = useCallback(() => {
    setCurrentStepIndex(0);
    setIsTrainingActive(true);
  }, []);

  const stopTraining = useCallback(() => {
    setIsTrainingActive(false);
    setCurrentStepIndex(0);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStepIndex(prev => prev + 1);
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStepIndex(prev => Math.max(0, prev - 1));
  }, []);

  const value = {
    isTrainingActive,
    currentStepIndex,
    startTraining,
    stopTraining,
    nextStep,
    prevStep,
  };

  return (
    <TrainingContext.Provider value={value}>
      {children}
    </TrainingContext.Provider>
  );
};

export const useTraining = () => {
  const context = useContext(TrainingContext);
  if (context === undefined) {
    throw new Error('useTraining must be used within a TrainingProvider');
  }
  return context;
};
