import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { api } from '../services/mockApi';

interface SyncContextType {
  isOnline: boolean;
  queueCount: number;
  isSyncing: boolean;
  forceSync: () => Promise<void>;
  setOnline: (online: boolean) => void;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [queueCount, setQueueCount] = useState(0);

  const updateQueueCount = useCallback(async () => {
    const count = await api.getQueueCount();
    setQueueCount(count);
  }, []);
  
  const processTheQueue = useCallback(async () => {
    if (isSyncing || !isOnline) return;
    setIsSyncing(true);
    try {
        await api.processQueue();
        await updateQueueCount();
    } catch (e) {
        console.error("Sync failed", e);
    } finally {
        setIsSyncing(false);
    }
  }, [isSyncing, isOnline, updateQueueCount]);

  useEffect(() => {
    updateQueueCount();
    
    const handleOnline = () => {
        setIsOnline(true);
        api.setOnlineStatus(true);
        processTheQueue();
    };
    const handleOffline = () => {
        setIsOnline(false);
        api.setOnlineStatus(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial sync check on load
    if (navigator.onLine) {
        processTheQueue();
    }

    // Periodically check queue count
    const interval = setInterval(updateQueueCount, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [processTheQueue, updateQueueCount]);

  const forceSync = async () => {
    if (isOnline) {
      await processTheQueue();
    }
  };
  
  const setOnline = (online: boolean) => {
    setIsOnline(online);
    api.setOnlineStatus(online);
    if(online) {
      processTheQueue();
    }
  }

  const value = { isOnline, queueCount, isSyncing, forceSync, setOnline };

  return (
    <SyncContext.Provider value={value}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};
