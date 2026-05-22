
import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import type { Shift } from '../types';
import { api } from '../services/mockApi';
import { useAuth } from './useAuth';
import { useToasts } from './useToasts';

interface ShiftContextType {
  currentShift: Shift | null;
  loading: boolean;
  openShift: (amount: number) => Promise<void>;
  closeShift: (endCash: number, notes?: string) => Promise<Shift>;
  refreshShift: () => Promise<void>;
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

export const ShiftProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { addToast } = useToasts();

  const refreshShift = useCallback(async () => {
    if (!user) {
        setCurrentShift(null);
        setLoading(false);
        return;
    }
    setLoading(true);
    try {
        const shift = await api.getCurrentShift(user.id);
        setCurrentShift(shift);
    } catch (e) {
        console.error("Failed to load active shift", e);
    } finally {
        setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshShift();
  }, [refreshShift]);

  const openShift = async (amount: number) => {
      if (!user) return;
      try {
          const shift = await api.openShift(user.id, amount);
          setCurrentShift(shift);
          addToast("تم فتح الوردية بنجاح.", "success");
      } catch (e: any) {
          addToast(e.message || "فشل فتح الوردية", "error");
          throw e;
      }
  };

  const closeShift = async (endCash: number, notes?: string) => {
      if (!currentShift) throw new Error("No active shift");
      try {
          const closedShift = await api.closeShift(currentShift.id, endCash, notes);
          setCurrentShift(null); // Clear current active shift
          addToast("تم إغلاق الوردية وحفظ التقرير.", "success");
          return closedShift;
      } catch (e: any) {
          addToast(e.message || "فشل إغلاق الوردية", "error");
          throw e;
      }
  };

  const value = { currentShift, loading, openShift, closeShift, refreshShift };

  return (
    <ShiftContext.Provider value={value}>
      {children}
    </ShiftContext.Provider>
  );
};

export const useShift = () => {
  const context = useContext(ShiftContext);
  if (context === undefined) {
    throw new Error('useShift must be used within a ShiftProvider');
  }
  return context;
};
