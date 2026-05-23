import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { CHANGELOG_DATA, LATEST_VERSION as FALLBACK_LATEST_VERSION, ChangelogEntry } from '../changelog';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

interface ChangelogContextType {
  changelogData: ChangelogEntry[];
  hasNewUpdate: boolean;
  markUpdatesAsSeen: () => void;
  latestVersion: string;
}

const ChangelogContext = createContext<ChangelogContextType | undefined>(undefined);

const CHANGELOG_STORAGE_KEY = 'lastSeenChangelogVersion';

export const ChangelogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [hasNewUpdate, setHasNewUpdate] = useState(false);
  const [changelogData, setChangelogData] = useState<ChangelogEntry[]>(CHANGELOG_DATA);
  const [latestVersion, setLatestVersion] = useState(FALLBACK_LATEST_VERSION);

  useEffect(() => {
    const q = query(collection(db, 'system_updates'), orderBy('releaseDate', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const updates = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            version: data.version,
            date: data.releaseDate,
            title: 'تحديث النظام ' + data.version,
            changes: (data.releaseNotes || '').split('\n').filter((l: string) => l.trim()).map((l: string) => ({
              type: 'improvement',
              description: l.trim().replace(/^- /, '')
            })),
            downloadUrl: data.downloadUrl
          } as ChangelogEntry & { downloadUrl?: string };
        });
        setChangelogData(updates);
        setLatestVersion(updates[0].version);
      }
    }, (err) => {
      console.warn("Failed to fetch system_updates, using fallback", err);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const lastSeenVersion = localStorage.getItem(CHANGELOG_STORAGE_KEY);
    if (lastSeenVersion !== latestVersion) {
      setHasNewUpdate(true);
    }
  }, [latestVersion]);

  const markUpdatesAsSeen = useCallback(() => {
    localStorage.setItem(CHANGELOG_STORAGE_KEY, latestVersion);
    setHasNewUpdate(false);
  }, [latestVersion]);
  
  const value = {
    changelogData,
    hasNewUpdate,
    markUpdatesAsSeen,
    latestVersion,
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
