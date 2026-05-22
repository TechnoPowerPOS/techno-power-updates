import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback, useRef } from 'react';
import { api } from '../services/mockApi';
import type { Notification, ToastType } from '../types';
import { useToasts } from './useToasts';
import { collection, query, orderBy, getDocs, limit, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { handleFirestoreError, OperationType } from '../services/firestoreErrorHandler';
import { useLicense } from './useLicense';

interface NotificationsContextType {
  notifications: Notification[];
  hasUnread: boolean;
  markAsRead: () => void;
  clearNotifications: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

const NOTIFICATIONS_LAST_SEEN_KEY = 'pos_notifications_last_seen';
const NOTIFICATIONS_CLEARED_AT_KEY = 'pos_notifications_cleared_at';

export const NotificationsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasUnread, setHasUnread] = useState(false);
  const [lastSeenTimestamp, setLastSeenTimestamp] = useState<string | null>(
    () => localStorage.getItem(NOTIFICATIONS_LAST_SEEN_KEY)
  );
  const [clearedAtTimestamp, setClearedAtTimestamp] = useState<string | null>(
    () => localStorage.getItem(NOTIFICATIONS_CLEARED_AT_KEY)
  );
  const { addToast } = useToasts();
  const previousNotificationsRef = useRef<Notification[]>([]);
  const { deviceId, licenseInfo } = useLicense(); // Get these explicitly

  const fetchNotifications = useCallback(async () => {
    try {
      const fetchedLocalNotifications = await api.getNotifications();
      let globalNotifs: Notification[] = [];
      try {
          const q = query(collection(db, 'global_notifications'), orderBy('sentAt', 'desc'), limit(10));
          const snap = await getDocs(q);
          const globals = snap.docs.map(doc => {
              const data = doc.data();
              return {
                  id: doc.id,
                  title: data.title,
                  message: data.body,
                  type: data.type === 'warning' ? 'SYSTEM_ALERT' : 'INFO',
                  date: data.sentAt,
                  isRead: false
              } as Notification;
          });
          
          let personalNotifs: Notification[] = [];
          
          // Fetch targeted personal notifications
          const targetIds = [];
          if (deviceId) targetIds.push(deviceId);
          if (licenseInfo?.customerId) targetIds.push(licenseInfo.customerId);
          
          if (targetIds.length > 0) {
              const qDevice = query(collection(db, 'device_notifications'), where('targetId', 'in', targetIds));
              const snapDevice = await getDocs(qDevice);
              personalNotifs = snapDevice.docs.map(doc => {
                  const data = doc.data();
                  return {
                      id: doc.id,
                      title: data.title,
                      message: data.body,
                      type: data.type === 'warning' ? 'SYSTEM_ALERT' : 'INFO',
                      date: data.sentAt,
                      isRead: false
                  } as Notification;
              });
              // Sort client side to avoid missing index
              personalNotifs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          }

          globalNotifs = [...globals, ...personalNotifs];
      } catch (e) {
          handleFirestoreError(e, OperationType.GET, 'notifications');
      }

      let allNotifications = [...globalNotifs, ...fetchedLocalNotifications].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (clearedAtTimestamp) {
          const clearDate = new Date(clearedAtTimestamp).getTime();
          allNotifications = allNotifications.filter(n => new Date(n.date).getTime() > clearDate);
      }

      setNotifications(allNotifications);

      // Check for unread bell icon
      if (allNotifications.length > 0) {
        const latestNotificationDate = allNotifications[0].date;
        if (!lastSeenTimestamp || new Date(latestNotificationDate) > new Date(lastSeenTimestamp)) {
          setHasUnread(true);
        }
      } else {
        setHasUnread(false);
      }

      // Check for new notifications to show as toasts
      const previousIds = new Set(previousNotificationsRef.current.map(n => n.id));
      const newNotifications = allNotifications.filter(n => !previousIds.has(n.id));

      if (newNotifications.length > 0 && previousNotificationsRef.current.length > 0) {
        // Only show toast if something new arrived WHILE the app runs, not on first load
        const notification = newNotifications[0]; 
        let toastType: ToastType = 'info';
        if (notification.type === 'LOW_STOCK' || notification.type === 'SYSTEM_ALERT') toastType = 'warning';
        if (notification.type === 'PROFIT_ALERT' || notification.type === 'UNUSUAL_EXPENSE') toastType = 'error';
        
        // Use notification title if available, otherwise just use message
        const toastMsg = notification.title ? `${notification.title}: ${notification.message}` : notification.message;
        addToast(toastMsg, toastType);
      }
      
      previousNotificationsRef.current = allNotifications;

    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }, [lastSeenTimestamp, addToast, deviceId, licenseInfo?.customerId]);

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 60 seconds
    const intervalId = setInterval(fetchNotifications, 60000);
    return () => clearInterval(intervalId);
  }, [fetchNotifications]);

  const markAsRead = useCallback(() => {
    if (notifications.length > 0) {
      const latestTimestamp = notifications[0].date;
      localStorage.setItem(NOTIFICATIONS_LAST_SEEN_KEY, latestTimestamp);
      setLastSeenTimestamp(latestTimestamp);
      setHasUnread(false);
    }
  }, [notifications]);

  const clearNotifications = useCallback(() => {
      const now = new Date().toISOString();
      localStorage.setItem(NOTIFICATIONS_CLEARED_AT_KEY, now);
      setClearedAtTimestamp(now);
      setNotifications([]);
      setHasUnread(false);
      if (notifications.length > 0) {
        localStorage.setItem(NOTIFICATIONS_LAST_SEEN_KEY, now);
        setLastSeenTimestamp(now);
      }
  }, [notifications]);

  const value = { notifications, hasUnread, markAsRead, clearNotifications };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};