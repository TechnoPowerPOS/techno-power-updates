
import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { secureStorage } from '../utils/secureStorage';

interface DevModeContextType {
  isDevMode: boolean;
  enableDevMode: (code: string) => boolean;
  disableDevMode: () => void;
}

const DevModeContext = createContext<DevModeContextType | undefined>(undefined);

const DEV_MODE_STORAGE_KEY_BASE = 'pos_dev_mode';
const DEV_MODE_SECRET_CODE = '219180729136';

export const DevModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isDevMode, setIsDevMode] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Sync with auth state (hacky since we can't easily use useAuth here due to circular deps)
  // We'll read the user from session storage directly or wait for an event
  useEffect(() => {
    const checkUser = () => {
        try {
            const authData = secureStorage.getItem<any>('pos_user_v2');
            if (authData?.id && authData.id !== currentUserId) {
                setCurrentUserId(authData.id);
            } else if (!authData && currentUserId) {
                setCurrentUserId(null);
                setIsDevMode(false);
            }
        } catch(e) {}
    };

    checkUser();
    const interval = setInterval(checkUser, 1000);
    return () => clearInterval(interval);
  }, [currentUserId]);

  useEffect(() => {
    if (currentUserId) {
      const savedState = secureStorage.getItem<boolean>(`${DEV_MODE_STORAGE_KEY_BASE}_${currentUserId}`);
      setIsDevMode(!!savedState);
    } else {
      setIsDevMode(false);
    }
  }, [currentUserId]);

  const enableDevMode = useCallback((code: string): boolean => {
    if (code === DEV_MODE_SECRET_CODE && currentUserId) {
      secureStorage.setItem(`${DEV_MODE_STORAGE_KEY_BASE}_${currentUserId}`, true);
      setIsDevMode(true);
      window.location.reload();
      return true;
    }
    return false;
  }, [currentUserId]);

  const disableDevMode = useCallback(() => {
    if (isDevMode && currentUserId) {
      secureStorage.removeItem(`${DEV_MODE_STORAGE_KEY_BASE}_${currentUserId}`);
      setIsDevMode(false);
      window.location.reload();
    }
  }, [isDevMode, currentUserId]);

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
