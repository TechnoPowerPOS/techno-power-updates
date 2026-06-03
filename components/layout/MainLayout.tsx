
import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import Header from './Header';
import SidebarDrawer from './SidebarDrawer';
import { useAuth } from '../../hooks/useAuth';
import { useLicense } from '../../hooks/useLicense';
import { useSettings } from '../../hooks/useSettings';
import SplashScreen from './SplashScreen';
import ToastContainer from '../ui/ToastContainer';
import { AlertTriangle } from 'lucide-react';
import { api } from '../../services/mockApi';
import { useToasts } from '../../hooks/useToasts';
import ModernLayout from './ModernLayout';
import { getPlanLimits } from '../../utils/planPermissions';

const MainLayout: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { isLicensed, isLoading: licenseLoading, licenseInfo } = useLicense();
  const { settings, updateSettings } = useSettings();
  const { addToast } = useToasts();
  const navigate = useNavigate();
  const [isSidebarDrawerOpen, setIsSidebarDrawerOpen] = useState(false);

  useEffect(() => {
      if (!settings || !settings.autoBackup || !settings.autoBackup.enabled) return;
      
      const limits = getPlanLimits(licenseInfo?.type || 'Free');
      if (!limits.hasAutoBackup) return;

      const checkBackup = async () => {
          const now = Date.now();
          const { lastBackupAt, intervalMinutes, localPath } = settings.autoBackup!;
          const intervalMs = (intervalMinutes || 1440) * 60 * 1000;

          if (now - lastBackupAt > intervalMs) {
              try {
                  const d = await api.getBackupData();
                  const b = new Blob([d], { type: 'application/json' });
                  const u = URL.createObjectURL(b);
                  const l = document.createElement('a');
                  l.href = u;
                  
                  const cleanPath = localPath ? localPath.trim() : '';
                  const pathMarker = cleanPath ? `_at_${cleanPath.replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '_')}_` : '';
                  l.download = `tp_auto_backup${pathMarker}${new Date().toISOString().split('T')[0]}.json`;
                  
                  l.click();
                  
                  const newSettings = { 
                      ...settings, 
                      autoBackup: { ...settings.autoBackup!, lastBackupAt: now } 
                  };
                  await updateSettings(newSettings);
                  addToast(
                      cleanPath 
                      ? `تم حفظ النسخة الاحتياطية التلقائية بنجاح في المسار: ${cleanPath}` 
                      : 'تم حفظ النسخة الاحتياطية التلقائية بنجاح.', 
                      'success'
                  );
              } catch (e) {
                  console.error("Auto backup failed", e);
              }
          }
      };

      const intervalId = setInterval(checkBackup, 60000);
      checkBackup();

      return () => clearInterval(intervalId);
  }, [settings, licenseInfo?.type, updateSettings, addToast]);

  // اختصارات الكيبورد
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    switch(e.key) {
        case 'F1': e.preventDefault(); navigate('/pos'); break;
        case 'F2': e.preventDefault(); navigate('/products'); break;
        case 'F3': e.preventDefault(); navigate('/'); break;
        case 'F4': e.preventDefault(); navigate('/customers'); break;
        case 'F9': e.preventDefault(); navigate('/reports'); break;
    }
  }, [navigate]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
      if (!settings) return;

      const checkSystemEvents = async () => {
          const todayStr = new Date().toISOString().split('T')[0];
          const lastCheckDate = localStorage.getItem('pos_last_system_check_date');

          if (lastCheckDate === todayStr) return;

          // فحص تأخير السداد
          if (settings.notificationSettings?.paymentDelays !== false) {
             const allSales = await api.getSales();
             const overdueCount = allSales.filter(s => {
                 if (s.paymentMethod !== 'Credit' || s.status === 'Refunded') return false;
                 const diff = Date.now() - new Date(s.date).getTime();
                 return diff > (30 * 24 * 60 * 60 * 1000); // 30 يوماً
             }).length;
             
             if (overdueCount > 0) {
                 await api.addNotification({
                     type: 'PAYMENT_DELAY',
                     message: `تنبيه: يوجد ${overdueCount} فاتورة آجلة متأخرة السداد لأكثر من ٣٠ يوماً.`,
                 });
             }

             // فحص الديون الكبيرة
             const allCustomers = await api.getCustomers();
             const largeDebtCount = allCustomers.filter(c => (c.debt || 0) > 10000).length;
             if (largeDebtCount > 0) {
                await api.addNotification({
                    type: 'INFO',
                    message: `تنبيه: يوجد ${largeDebtCount} عميل لديهم مديونيات تتجاوز ١٠,٠٠٠.`,
                });
             }
          }

          localStorage.setItem('pos_last_system_check_date', todayStr);
      };
      checkSystemEvents();
  }, [settings]);

  const isAdmin = user?.roleId === 'r-1';
  
  if (authLoading || licenseLoading) return <SplashScreen />;
  if (!user) return <Navigate to="/login" replace />;

  return <ModernLayout layoutType="ultra" />;
};

export default MainLayout;
