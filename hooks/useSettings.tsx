
import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import type { StoreSettings } from '../types';
import { api } from '../services/mockApi';

interface SettingsContextType {
  settings: StoreSettings | null;
  updateSettings: (newSettings: StoreSettings) => Promise<void>;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const fetchedSettings = await api.getSettings();
      setSettings(fetchedSettings);
    } catch (error) {
      console.error("Failed to fetch settings", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();

    const handleStorageUpdate = () => {
        fetchSettings();
    };

    window.addEventListener('storage_updated', handleStorageUpdate);
    return () => window.removeEventListener('storage_updated', handleStorageUpdate);
  }, [fetchSettings]);

  useEffect(() => {
    if (settings?.fontSize) {
      const root = document.documentElement;
      root.classList.remove('font-small', 'font-medium', 'font-large');
      root.classList.add(`font-${settings.fontSize}`);
    }
  }, [settings?.fontSize]);

  const updateSettings = async (newSettings: StoreSettings) => {
    // 1. حفظ في قاعدة البيانات (LocalStorage)
    const updatedSettings = await api.saveSettings(newSettings);
    // 2. تحديث الحالة فوراً لضمان استجابة React
    setSettings({...updatedSettings});
    // 3. إطلاق حدث للتزامن عبر التبويبات الأخرى إن وجدت
    window.dispatchEvent(new Event('storage_updated'));
  };

  const value = React.useMemo(() => ({ settings, updateSettings, isLoading }), [settings, isLoading]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
