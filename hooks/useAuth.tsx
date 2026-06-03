
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
  userHasPermission: (permission: PermissionKey | PermissionKey[]) => boolean;
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

  const logout = async () => {
    await auth.signOut();
    setUser(null);
    setIsLocked(false);
    secureStorage.removeItem(AUTH_STORAGE_KEY);
    disableDevMode(); 
  };

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

  const switchUser = () => {
    setUser(null);
    setIsLocked(false);
    secureStorage.removeItem(AUTH_STORAGE_KEY);
    api.reset();
    disableDevMode(); 
  };

  // Sync user state with local database when it changes (role/permission updates)
  useEffect(() => {
    const handleStorageUpdate = async () => {
      if (!user) return;
      const allUsers = (await api.getUsers()) as User[];
      const latestUser = allUsers.find(u => u.id === user.id);
      if (latestUser) {
        // Only update if there's a difference to avoid infinite loops
        if (JSON.stringify(latestUser.permissions) !== JSON.stringify(user.permissions)) {
          setUser(latestUser);
          secureStorage.setItem(AUTH_STORAGE_KEY, latestUser);
        }
      } else {
        // User was deleted
        logout();
      }
    };

    window.addEventListener('storage_updated', handleStorageUpdate);
    return () => window.removeEventListener('storage_updated', handleStorageUpdate);
  }, [user, logout]);

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

  const userHasPermission = (permission: PermissionKey | PermissionKey[]): boolean => {
      if (isDevMode) return true;
      if (!user) return false;
      
      // Check if user is the main administrator (role r-1)
      if (user.roleId === 'r-1') return true;

      if (!user.permissions) return false;

      if (Array.isArray(permission)) {
          return permission.some(p => user.permissions![p] === true);
      }

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
