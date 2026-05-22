import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { adminToolService } from '../services/adminToolService';
import { secureStorage } from '../utils/secureStorage';

import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from '../services/firebase';

type AdminAuthStatus = 'success' | 'failed' | 'locked' | 'tamper_detected';

interface AdminAuthContextType {
  isAdminLoggedIn: boolean;
  login: (email: string, codes: string[], securityAnswer: string) => Promise<{ status: AdminAuthStatus, message: string }>;
  logout: () => void;
  isLoading: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const ADMIN_AUTH_STORAGE_KEY = 'pos_admin_auth_session';

export const AdminAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let fired = false;
    // Safety timeout: if Firebase takes more than 10s to respond, stop loading
    const safetyTimeout = setTimeout(() => {
      if (!fired) {
        setIsLoading(false);
      }
    }, 10000);

    // Listen for auth changes to sync with local session
    const unsubscribe = auth.onAuthStateChanged((user) => {
      fired = true;
      clearTimeout(safetyTimeout);
      const sessionActive = secureStorage.getItem<boolean>(ADMIN_AUTH_STORAGE_KEY);
      const isAdminEmail = user?.email === 'm7mdshipl@gmail.com' || user?.email === 'admin@techno.com';

      if (sessionActive && isAdminEmail) {
        setIsAdminLoggedIn(true);
      } else if (!sessionActive || (user && !isAdminEmail)) {
        // If no local session, or if logged in but not as admin, force false
        setIsAdminLoggedIn(false);
      }
      
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  const login = async (email: string, codes: string[], securityAnswer: string): Promise<{ status: AdminAuthStatus, message: string }> => {
    // Check email requirement
    if (email !== 'm7mdshipl@gmail.com' && email !== 'admin@techno.com') {
      return { status: 'failed', message: 'الايميل غير مصرح له بالدخول للادارة.' };
    }

    try {
      // 1. Verify codes and security answer first
      const result = await adminToolService.verifyCredentials(codes, securityAnswer);
      if (result.status !== 'success') return result;

      // 2. Official Firebase Sign-in with Google to unlock Cloud Permissions
      // We check if already signed in with the correct account
      if (auth.currentUser?.email !== email) {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ login_hint: email });
        
        // Wrap signInWithPopup in a timeout
        const userCredential = await Promise.race([
          signInWithPopup(auth, provider),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Popup Timeout: يرجى التأكد من السماح بالرسائل المنبثقة أو فتح التطبيق في المتصفح')), 15000))
        ]) as any;
        
        // Ensure admin document exists for rules to work
        try {
          const { db } = await import('../services/firebase');
          const { doc, setDoc } = await import('firebase/firestore');
          await setDoc(doc(db, 'admins', userCredential.user.uid), {
            email: userCredential.user.email,
            role: 'super_admin',
            lastLogin: new Date().toISOString()
          }, { merge: true });
        } catch (adminDocErr) {
          console.warn("Could not create admin document, security rules might fail for this user.", adminDocErr);
        }
      }

      setIsAdminLoggedIn(true);
      secureStorage.setItem(ADMIN_AUTH_STORAGE_KEY, true);
      return result;
    } catch (error: any) {
      console.error("Firebase Login Error:", error);
      return { status: 'failed', message: 'فشل تسجيل الدخول بجوجل. يرجى التأكد من البريد الإلكتروني.' };
    }
  };

  const logout = async () => {
    await signOut(auth);
    setIsAdminLoggedIn(false);
    secureStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
  };
  
  const value = { isAdminLoggedIn, login, logout, isLoading };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};