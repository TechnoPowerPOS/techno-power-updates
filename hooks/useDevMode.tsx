
import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { secureStorage } from '../utils/secureStorage';

interface DevModeContextType {
  isDevMode: boolean;
  enableDevMode: (code: string) => boolean;
  disableDevMode: () => void;
}

const DevModeContext = createContext<DevModeContextType | undefined>(undefined);

const DEV_MODE_STORAGE_KEY = 'pos_dev_mode';
const DEV_MODE_SECRET_CODE = '219180729136';

export const DevModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isDevMode, setIsDevMode] = useState(false);

  useEffect(() => {
    const savedState = secureStorage.getItem<boolean>(DEV_MODE_STORAGE_KEY);
    if (savedState) {
      setIsDevMode(true);
    }
  }, []);

  const enableDevMode = useCallback((code: string): boolean => {
    if (code === DEV_MODE_SECRET_CODE) {
      secureStorage.setItem(DEV_MODE_STORAGE_KEY, true);
      setIsDevMode(true);
      window.location.reload();
      return true;
    }
    return false;
  }, []);

  const disableDevMode = useCallback(() => {
    if (isDevMode) {
      secureStorage.removeItem(DEV_MODE_STORAGE_KEY);
      setIsDevMode(false);
      window.location.reload();
    }
  }, [isDevMode]);

  const value = { isDevMode, enableDevMode, disableDevMode };

  return (
    <DevModeContext.Provider value={value}>
      {children}
    </DevModeContext.Provider>
  );
};

export const useDevMode = () => {
  const context = useContext(DevModeContext);
  if (context === undefined) {
    throw new Error('useDevMode must be used within a DevModeProvider');
  }
  return context;
};
