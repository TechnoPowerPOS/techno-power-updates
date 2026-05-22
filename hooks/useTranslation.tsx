import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import arTranslations from '../public/locales/ar.json';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

type Language = 'ar';
type Translations = Record<string, string>;

interface LanguageContextType {
  language: Language;
  t: (key: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language] = useState<Language>('ar');
  const [translations, setTranslations] = useState<Translations>(arTranslations);
  const [customModuleNames, setCustomModuleNames] = useState<Record<string, string>>({});
  const isRTL = language === 'ar';

  useEffect(() => {
    // If we support multiple languages in future, we can load them dynamically here.
    // For now, Arabic is statically imported, so we just set it.
    if (language === 'ar') {
        setTranslations(arTranslations);
    }
  }, [language]);

  useEffect(() => {
    const fetchGlobalSettings = async () => {
      try {
        const snap = await getDoc(doc(db, 'adminSettings', 'globalAdmin'));
        if (snap.exists() && snap.data().customModuleNames) {
          setCustomModuleNames(snap.data().customModuleNames);
        }
      } catch (e) {
        console.error("Error fetching custom module names", e);
      }
    };
    fetchGlobalSettings();
    
    const handleUpdate = () => fetchGlobalSettings();
    window.addEventListener('adminGlobalUpdated', handleUpdate);
    return () => window.removeEventListener('adminGlobalUpdated', handleUpdate);
  }, []);

  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    if (isRTL) {
      body.setAttribute('dir', 'rtl');
      html.setAttribute('dir', 'rtl');
      html.setAttribute('lang', 'ar');
    } else {
      body.setAttribute('dir', 'ltr');
      html.setAttribute('dir', 'ltr');
      html.setAttribute('lang', 'en');
    }
  }, [isRTL]);

  const t = useCallback((key: string): string => {
    // Lookup by ID or translation key. In NAV_LINKS, id is mostly standard but we'll try both.
    // This allows renaming pages dynamically.
    if (customModuleNames[key]) return customModuleNames[key];
    
    // Find if the key matches a route id (e.g., if key 'المبيعات' corresponds to 'sales')
    const customMatchId = Object.keys(customModuleNames).find(id => {
        // Here we could map keys, but customModuleNames will store either the module id or the translation key.
        // Easiest is to save it by the t_key in the settings page.
        return false; 
    });

    return translations[key] || key;
  }, [translations, customModuleNames]);

  const value = { language, t, isRTL, setLanguage: () => {} };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
