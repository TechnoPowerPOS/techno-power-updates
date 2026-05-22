
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLicense } from '../../hooks/useLicense';
import type { PermissionKey } from '../../types';
import { Lock, Crown } from 'lucide-react';
import Button from '../ui/Button';
import { Link } from 'react-router-dom';
import { getPlanLimits } from '../../utils/planPermissions';

interface ProtectedRouteProps {
  permission: PermissionKey | PermissionKey[];
  children: React.ReactElement;
}

const LockedFeature: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-[70vh] animate-fadeIn text-center p-6">
        <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <Lock size={48} className="text-slate-400" />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2 font-black">ميزة حصرية للمشتركين</h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-md mb-8 font-bold">هذه الميزة غير متاحة في الخطة المجانية. يرجى الترقية لدعم نمو عملك.</p>
        <Link to="/pricing"><Button className="gap-2 px-10 py-4 text-lg bg-indigo-600 rounded-2xl font-black shadow-xl"><Crown size={20} /> عرض خطط الترقية</Button></Link>
    </div>
);

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ permission, children }) => {
  const { user, userHasPermission } = useAuth();
  const { isLicensed, licenseType, licenseInfo } = useLicense();
  const location = useLocation();
  
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  // السماح بالوصول لصفحة البداية '/' فقط لتجنب التعليق، ولكن فحص لوحة التحكم والصفحات الأخرى
  if (location.pathname === '/') return children;

  const hasAccess = Array.isArray(permission) 
    ? permission.some(p => userHasPermission(p))
    : userHasPermission(permission);

  if (!hasAccess) {
    // إذا لم يملك المستخدم صلاحية، يتم توجيهه للرئيسية بدلاً من لوحة التحكم لتجنب التكرار
    return <Navigate to="/" replace />;
  }

  // Use getPlanLimits for more granular control
  const limits = getPlanLimits(licenseInfo.type);
  const isAdmin = user.email === 'm7mdshipl@gmail.com' || user.email === 'admin@techno.com';

  if (!isAdmin) {
    const isRestrictedTarget = Array.isArray(permission) ? permission : [permission];
    
    // Check key features based on plan limits or specific paths
    const needsAI = isRestrictedTarget.some(p => ['view_sales_forecast', 'use_ai_chat'].includes(p as string)) || location.pathname.includes('sales-forecast');
    const needsAdvancedReports = isRestrictedTarget.some(p => ['view_advanced_reports'].includes(p as string)) || location.pathname.includes('advanced-reports');
    const needsPartners = isRestrictedTarget.some(p => ['manage_partners'].includes(p as string)) || location.pathname.includes('partners');
    const needsBackup = isRestrictedTarget.some(p => ['manage_backups'].includes(p as string));
    const needsReports = isRestrictedTarget.some(p => ['view_reports'].includes(p as string)) || location.pathname.includes('reports');
    const needsInventoryAudit = isRestrictedTarget.some(p => ['view_inventory_audit'].includes(p as string)) || location.pathname.includes('inventory-audit');
    const needsStockTransfer = isRestrictedTarget.some(p => ['manage_stock_transfers'].includes(p as string)) || location.pathname.includes('stock-transfer');
    const needsInstallments = isRestrictedTarget.some(p => ['manage_installments'].includes(p as string)) || location.pathname.includes('installments');
    const needsEmployeePerformance = isRestrictedTarget.some(p => ['view_employee_performance'].includes(p as string)) || location.pathname.includes('employee-performance');
    const needsSatisfaction = isRestrictedTarget.some(p => ['view_satisfaction_reports'].includes(p as string)) || location.pathname.includes('customer-satisfaction');
    const needsActivityLogs = isRestrictedTarget.some(p => ['view_activity_logs'].includes(p as string)) || location.pathname.includes('activity-logs');
    const needsWhatsApp = isRestrictedTarget.some(p => ['manage_whatsapp'].includes(p as string)) || location.pathname.includes('whatsapp');
    
    // HR & Manufacturing specific checks
    const needsHR = isRestrictedTarget.some(p => String(p).includes('manage_hr')) || location.pathname.includes('employee-management');
    const needsOperations = isRestrictedTarget.some(p => String(p).includes('manage_op')) || location.pathname.includes('manufacturing-management');
    const needsShipping = isRestrictedTarget.some(p => String(p).includes('manage_shipping')) || location.pathname.includes('shipping');
    
    const needsCRM = location.pathname.includes('crm');
    const needsNotes = location.pathname.includes('notes');
    const needsFinancialSettlements = location.pathname.includes('financial-settlement');
    const needsAccountStatements = location.pathname.includes('financial-accounts');
    const needsDetailedTreasury = location.pathname.includes('treasury'); 
    const needsExpenses = location.pathname.includes('expenses');
    const needsCheckManagement = location.pathname.includes('checks') || isRestrictedTarget.some(p => String(p).includes('manage_checks'));

    if (needsAI && !limits.hasAI) return <LockedFeature />;
    if (needsPartners && !limits.hasPartners) return <LockedFeature />;
    if (needsBackup && !limits.hasBackup) return <LockedFeature />;
    if (needsInventoryAudit && !limits.hasInventoryAudit) return <LockedFeature />;
    if (needsStockTransfer && !limits.hasStockTransfer) return <LockedFeature />;
    if (needsInstallments && !limits.hasInstallments) return <LockedFeature />;
    if (needsEmployeePerformance && !limits.hasEmployeePerformance) return <LockedFeature />;
    if (needsSatisfaction && !limits.hasCustomerSatisfaction) return <LockedFeature />;
    if (needsActivityLogs && !limits.hasActivityLogs) return <LockedFeature />;
    if (needsWhatsApp && !limits.hasWhatsApp) return <LockedFeature />;
    
    if (needsCRM && limits.maxCustomers <= 50) return <LockedFeature />;
    if (needsNotes && !limits.hasNotes) return <LockedFeature />;
    if (needsFinancialSettlements && !limits.hasFinancialSettlements) return <LockedFeature />;
    if (needsAccountStatements && !limits.hasAccountStatements) return <LockedFeature />;
    if (needsExpenses && !limits.hasExpenses) return <LockedFeature />;
    if (needsCheckManagement && !limits.hasChecksManagement) return <LockedFeature />;
    
    if (needsHR && !limits.hasHR) return <LockedFeature />;
    if (needsOperations && !limits.hasOperations) return <LockedFeature />;
    if (needsShipping && !limits.hasShipping) return <LockedFeature />;
    if (needsAdvancedReports && !limits.hasAdvancedReports) return <LockedFeature />;
    
    if (needsReports && licenseType === 'Free') return <LockedFeature />; 
    if (needsAdvancedReports && licenseType === 'Free') return <LockedFeature />;
    if (isRestrictedTarget.includes('view_dashboard') && licenseType === 'Free') return <LockedFeature />;
  }

  return children;
};

export default ProtectedRoute;
