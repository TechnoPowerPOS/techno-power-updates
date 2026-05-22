
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

const MainLayout: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { isLicensed, isLoading: licenseLoading, licenseInfo } = useLicense();
  const { settings, updateSettings } = useSettings();
  const { addToast } = useToasts();
  const navigate = useNavigate();
  const [isSidebarDrawerOpen, setIsSidebarDrawerOpen] = useState(false);

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

  const isAdmin = user?.email === 'm7mdshipl@gmail.com' || user?.email === 'admin@techno.com';
  
  if (authLoading || licenseLoading) return <SplashScreen />;
  if (!user) return <Navigate to="/login" replace />;

  return <ModernLayout layoutType="ultra" />;
};

export default MainLayout;
