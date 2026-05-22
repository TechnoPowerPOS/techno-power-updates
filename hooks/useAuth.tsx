
import React, { createContext, useState, useContext, useEffect, ReactNode, useRef, useCallback } from 'react';
import type { User, PermissionKey } from '../types';
import { api } from '../services/mockApi';
import { secureStorage } from '../utils/secureStorage';
import { useSettings } from './useSettings';
import { useDevMode } from './useDevMode';

import { auth } from '../services/firebase';
import { signInAnonymously } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  login: (name: string, password: string) => Promise<void>;
  logout: () => void;
  switchUser: () => void;
  userHasPermission: (permission: PermissionKey) => boolean;
  isLoading: boolean;
  isLocked: boolean;
  lockSession: () => void;
  unlockSession: (password: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'pos_user_v2';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => secureStorage.getItem<User>(AUTH_STORAGE_KEY));
  const [isLoading, setIsLoading] = useState(false);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const { settings } = useSettings();
  const { isDevMode, disableDevMode } = useDevMode();
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let fired = false;
    const safetyTimeout = setTimeout(() => {
      if (!fired) setIsFirebaseReady(true);
    }, 10000);

    // Ensure Firebase auth is aligned with local auth
    const syncFirebaseAuth = async () => {
      // Check if we need to initialize Firebase Auth session
      if (!auth.currentUser) {
        try {
          // If we have a local session, just sign in anonymously to satisfy security rules
          // unless it's a real admin login which is handled separately.
          await Promise.race([
            signInAnonymously(auth),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Auth Timeout')), 8000))
          ]);
          console.log("Firebase Auth established (Anonymous)");
        } catch (e) {
          console.warn("Firebase Auth auto-sync failed", e);
        }
      }
      // Always set ready so the UI can mount even if Firebase sync fails
      fired = true;
      clearTimeout(safetyTimeout);
      setIsFirebaseReady(true);
    };
    syncFirebaseAuth();
  }, [user]);

  const login = async (name: string, password: string) => {
    const loggedInUser = await api.login(name, password);
    if (loggedInUser) {
      // Try to sign into Firebase Auth if possible
      try {
        await signInAnonymously(auth);
      } catch (e) {
        console.warn("Firebase Login Sync failed", e);
      }
      
      setUser(loggedInUser);
      secureStorage.setItem(AUTH_STORAGE_KEY, loggedInUser);
    } else {
      throw new Error('Invalid credentials');
    }
  };

  const logout = async () => {
    await auth.signOut();
    setUser(null);
    setIsLocked(false);
    secureStorage.removeItem(AUTH_STORAGE_KEY);
    disableDevMode(); 
  };
  
  const switchUser = () => {
    setUser(null);
    setIsLocked(false);
    secureStorage.removeItem(AUTH_STORAGE_KEY);
    api.reset();
    disableDevMode(); 
  };

  const userHasPermission = (permission: PermissionKey): boolean => {
      if (isDevMode) return true;
      if (!user) return false;
      if (user.email === 'm7mdshipl@gmail.com' || user.email === 'admin@techno.com') return true;

      if (!user.permissions) return false;
      return user.permissions[permission] === true;
  };

  const lockSession = useCallback(() => {
    if (user) setIsLocked(true);
  }, [user]);

  const unlockSession = async (password: string): Promise<boolean> => {
    if (!user) return false;
    const success = await api.verifyPassword(user.id, password);
    if (success) {
      setIsLocked(false);
      return true;
    }
    return false;
  };

  const resetIdleTimer = useCallback(() => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      const timeoutMinutes = settings?.autoLockTimeout ?? 0;
      if (timeoutMinutes <= 0) return;
      idleTimerRef.current = setTimeout(() => lockSession(), timeoutMinutes * 60 * 1000);
  }, [settings, lockSession]);

  useEffect(() => {
      const events: (keyof WindowEventMap)[] = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
      if (user && !isLocked) {
          resetIdleTimer();
          events.forEach(event => window.addEventListener(event, resetIdleTimer));
      }
      return () => {
          if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
          events.forEach(event => window.removeEventListener(event, resetIdleTimer));
      };
  }, [user, isLocked, resetIdleTimer]);

  const value = React.useMemo(() => ({ 
    user, 
    login, 
    logout, 
    switchUser, 
    userHasPermission, 
    isLoading, 
    isLocked, 
    lockSession, 
    unlockSession 
  }), [user, isLoading, isLocked, lockSession, userHasPermission]);

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && isFirebaseReady && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within a AuthProvider');
  return context;
};
