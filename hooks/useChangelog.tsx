import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { CHANGELOG_DATA, LATEST_VERSION, ChangelogEntry } from '../changelog';

interface ChangelogContextType {
  changelogData: ChangelogEntry[];
  hasNewUpdate: boolean;
  markUpdatesAsSeen: () => void;
}

const ChangelogContext = createContext<ChangelogContextType | undefined>(undefined);

const CHANGELOG_STORAGE_KEY = 'lastSeenChangelogVersion';

export const ChangelogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [hasNewUpdate, setHasNewUpdate] = useState(false);

  useEffect(() => {
    const lastSeenVersion = localStorage.getItem(CHANGELOG_STORAGE_KEY);
    if (lastSeenVersion !== LATEST_VERSION) {
      setHasNewUpdate(true);
    }
  }, []);

  const markUpdatesAsSeen = useCallback(() => {
    localStorage.setItem(CHANGELOG_STORAGE_KEY, LATEST_VERSION);
    setHasNewUpdate(false);
  }, []);
  
  const value = {
    changelogData: CHANGELOG_DATA,
    hasNewUpdate,
    markUpdatesAsSeen,
  };

  return (
    <ChangelogContext.Provider value={value}>
      {children}
    </ChangelogContext.Provider>
  );
};

export const useChangelog = () => {
  const context = useContext(ChangelogContext);
  if (context === undefined) {
    throw new Error('useChangelog must be used within a ChangelogProvider');
  }
  return context;
};
