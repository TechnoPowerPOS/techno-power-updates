
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import type { AppTheme } from '../types';
import { useSettings } from './useSettings';

interface ThemeContextType {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<AppTheme>('light');
  const { settings } = useSettings();

  // Sync with Settings if available
  useEffect(() => {
    if (settings) {
        if(settings.activeTheme) setTheme(settings.activeTheme);
        
        // Apply Fonts
        const root = document.documentElement;
        // Remove existing font classes
        root.classList.remove('font-cairo', 'font-tajawal', 'font-amiri', 'font-almarai', 'font-ibm');
        if (settings.fontFamily) {
            const fontClass = `font-${settings.fontFamily.toLowerCase().split(' ')[0]}`;
            root.classList.add(fontClass);
        }

        // Apply Font Size Scaling
        if (settings.fontSize) {
             if (settings.fontSize === 'small') root.style.fontSize = '14px';
             else if (settings.fontSize === 'large') root.style.fontSize = '18px';
             else root.style.fontSize = '16px';
        } else {
             root.style.fontSize = '16px';
        }

        // Apply Animations
        const body = document.body;
        // Remove existing animation classes
        body.classList.remove('anim-fade', 'anim-slide', 'anim-zoom', 'anim-bounce', 'anim-none');
        if (settings.animationPreset) {
            body.classList.add(`anim-${settings.animationPreset}`);
        }
    }
  }, [settings]);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    
    // Remove all previous theme classes/attributes
    root.classList.remove('dark', 'light');
    body.removeAttribute('data-theme');

    if (theme === 'dark') {
      root.classList.add('dark');
      body.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
      body.classList.remove('dark');
    } else {
        // Advanced themes (Gold, Ramadan, Neumorphism, Forbed, Cyberpunk)
        if (theme === 'gold' || theme === 'ramadan' || theme === 'cyberpunk') {
             root.classList.add('dark');
        } else {
             root.classList.remove('dark');
        }
        body.setAttribute('data-theme', theme);
    }
    
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
