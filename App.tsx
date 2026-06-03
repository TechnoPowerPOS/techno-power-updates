
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { LicenseProvider, useLicense } from './hooks/useLicense';
import { SettingsProvider, useSettings } from './hooks/useSettings';
import { ChangelogProvider } from './hooks/useChangelog';
import { NotificationsProvider } from './hooks/useNotifications';
import { LanguageProvider } from './hooks/useTranslation';
import { ToastProvider } from './hooks/useToasts';
import ToastContainer from './components/ui/ToastContainer';
import { ThemeProvider } from './hooks/useTheme';
import { DevModeProvider } from './hooks/useDevMode';
import { PWAInstallProvider } from './hooks/usePWAInstall';
import { ShiftProvider } from './hooks/useShift'; 
import MainLayout from './components/layout/MainLayout';
import SplashScreen from './components/layout/SplashScreen';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Button from './components/ui/Button';
import { Lock, LogOut } from 'lucide-react';
import { AdminAuthProvider } from './hooks/useAdminAuth';
import AdminLayout from './components/admin/AdminLayout';
import TermsModal from './components/layout/TermsModal';
import { useAppGuard } from './hooks/useAppGuard';
import ErrorBoundary from './components/Error/ErrorBoundary';
import ScrollToTop from './components/layout/ScrollToTop';

// Pages
import LoginPage from './pages/LoginPage';
import LicensePage from './pages/LicensePage';
import AdminLicensePage from './pages/AdminLicensePage';
import AdminExpiredLicensesPage from './pages/AdminExpiredLicensesPage';
import AdminUpdatesPage from './pages/AdminUpdatesPage';
import AdminNotificationsPage from './pages/AdminNotificationsPage';
import AdminPricingPage from './pages/AdminPricingPage';
import AdminPoliciesPage from './pages/AdminPoliciesPage';
import AdminSuggestionsPage from './pages/AdminSuggestionsPage';
import AdminPlanLimitsPage from './pages/AdminPlanLimitsPage';
import AdminPlanFeaturesPage from './pages/AdminPlanFeaturesPage';
import { GlobalUpdateOverlay } from './components/GlobalUpdateOverlay';
import { GlobalAnnouncementPopup } from './components/GlobalAnnouncementPopup';
import RegistrationForm from './components/registration/RegistrationForm';
import { useUserIdentity } from './hooks/useUserIdentity';
import DashboardPage from './pages/DashboardPage';
import HomePage from './pages/HomePage'; 
import PosPage from './pages/PosPage';
import ProductsPage from './pages/ProductsPage';
import CategoriesPage from './pages/CategoriesPage';
import InventoryAuditPage from './pages/InventoryAuditPage';
import SalesPage from './pages/SalesPage';
import PurchasesPage from './pages/PurchasesPage';
import AddPurchasePage from './pages/AddPurchasePage';
import CustomersPage from './pages/CustomersPage';
import SuppliersPage from './pages/SuppliersPage';
import PartnersPage from './pages/PartnersPage'; 
import { ShippingOperationsPage } from './pages/ShippingOperationsPage';
import TreasuryPage from './pages/TreasuryPage';
import WarehousesPage from './pages/WarehousesPage';
import StockTransferPage from './pages/StockTransferPage';
import SettingsPage from './pages/SettingsPage';
import { WhatsAppPage } from './pages/WhatsAppPage';
import AdvancedFinancialReports from './pages/accounts/AdvancedFinancialReports';
import PricingPage from './pages/PricingPage';
import FaqPage from './pages/FaqPage';
import AboutPage from './pages/AboutPage';
import SalesReturnsPage from './pages/SalesReturnsPage';
import PurchaseReturnsPage from './pages/PurchaseReturnsPage';
import InstallmentsPage from './pages/InstallmentsPage';
import EmployeePerformancePage from './pages/EmployeePerformancePage';
import ActivityLogsPage from './pages/ActivityLogsPage';
import SalesForecastPage from './pages/SalesForecastPage';
import SupplierAnalysisPage from './pages/SupplierAnalysisPage';
import InactiveCustomersPage from './pages/InactiveCustomersPage';
import StagnantProductsPage from './pages/StagnantProductsPage';
import FeaturesPage from './pages/FeaturesPage';
import AdminToolLoginPage from './pages/AdminToolLoginPage';
import AdminToolDashboardPage from './pages/AdminToolDashboardPage';
import AdminGlobalSettingsPage from './pages/AdminGlobalSettingsPage';
import AdminDevicesPage from './pages/AdminDevicesPage';
import AdminRequestsPage from './pages/AdminRequestsPage';
import AdminCustomersFilesPage from './pages/AdminCustomersFilesPage';
import AdminAnalyticsPage from './pages/AdminAnalyticsPage';
import AdminPerformancePage from './pages/AdminPerformancePage';
import AdminTamperingPage from './pages/AdminTamperingPage';
import AdminPromoCodesPage from './pages/AdminPromoCodesPage';
import AdminAffiliatesPage from './pages/AdminAffiliatesPage';
import ReportsPage from './pages/ReportsPage';
import AccountingToolsPage from './pages/AccountingToolsPage';
import SystemUpdatesPage from './pages/SystemUpdatesPage';
import NotesPage from './pages/NotesPage';
import CustomerDebtsPage from './pages/CustomerDebtsPage';
import FinancialAccountsPage from './pages/FinancialAccountsPage';
import FinancialSettlementPage from './pages/FinancialSettlementPage';
import CrmPage from './pages/CrmPage';
import EmployeesPage from './pages/EmployeesPage';
import ComingSoonPage from './pages/ComingSoonPage';
import ExpensesPage from './pages/accounts/ExpensesPage';
import AssetsPage from './pages/accounts/AssetsPage';
import ManufacturingManagementPage from './pages/operations/ManufacturingManagementPage';
import EmployeeManagementPage from './pages/hr/EmployeeManagementPage';
import CashierShiftsPage from './pages/CashierShiftsPage';
import SalesDraftsPage from './pages/SalesDraftsPage';
import AttendancePage from './pages/hr/AttendancePage';

const LockScreen: React.FC = () => {
    const { user, unlockSession, switchUser } = useAuth();
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        const success = await unlockSession(password);
        if (!success) {
            setError('كلمة المرور غير صحيحة.');
            const form = e.target as HTMLFormElement;
            form.classList.add('animate-cart-shake');
            setTimeout(() => form.classList.remove('animate-cart-shake'), 400);
            setIsLoading(false);
            setPassword('');
        }
    };

    const handleSwitchUser = () => {
        switchUser();
    };

    const inputStyle = "mt-1 block w-full px-3 py-2.5 bg-slate-200/50 dark:bg-white/5 border border-slate-300 dark:border-slate-300/20 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition text-slate-800 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400";

    return (
        <div className="relative flex items-center justify-center min-h-screen p-4 overflow-hidden bg-slate-50 dark:bg-slate-950">
            <div className="absolute inset-0 bg-blue-600/5 dark:bg-blue-600/10 backdrop-blur-3xl"></div>
            <div className="absolute w-[800px] h-[800px] bg-blue-400/20 dark:bg-blue-600/20 rounded-full blur-3xl -top-40 -left-40 animate-pulse-slow"></div>
            <div className="absolute w-[600px] h-[600px] bg-purple-400/20 dark:bg-purple-600/20 rounded-full blur-3xl bottom-0 right-0 animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
            
            <div className="relative z-10 w-full max-w-sm bg-white/70 dark:bg-slate-900/70 backdrop-blur-3xl border border-white/50 dark:border-slate-800/80 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.04)] p-10 animate-scaleUp text-slate-800 dark:text-white text-center">
                <div className="mb-8">
                    <div className="w-24 h-24 mx-auto rounded-[2rem] bg-gradient-to-br from-blue-500 to-indigo-600 shadow-[0_8px_24px_rgba(37,99,235,0.25)] flex items-center justify-center mb-6 text-white transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                        <Lock size={40} className="drop-shadow-md" />
                    </div>
                    <h2 className="text-3xl font-black tracking-tight">مرحباً بعودتك</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-bold mt-2 text-sm">{user?.name}</p>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="mb-6">
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="أدخل كلمة المرور لفتح الجلسة"
                            className="block w-full px-5 py-4 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-center placeholder:text-slate-400"
                            required
                            autoFocus
                        />
                    </div>
                    {error && <p className="text-rose-500 dark:text-rose-400 text-sm font-bold mb-4 bg-rose-50 dark:bg-rose-900/20 py-2 rounded-xl">{error}</p>}
                    <Button type="submit" className="w-full text-lg py-4 rounded-2xl shadow-blue-500/20" isLoading={isLoading}>
                        إلغاء القفل
                    </Button>
                </form>
                <div className="text-center mt-8">
                    <button onClick={handleSwitchUser} className="text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex items-center justify-center gap-2 mx-auto decoration-2 underline-offset-4 hover:underline">
                       <LogOut size={16} />
                       <span>تسجيل الدخول بحساب آخر</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

const HomeRouteWrapper: React.FC = () => {
    const { settings, isLoading } = useSettings();
    if (isLoading) return <SplashScreen />;
    return <HomePage />;
}

const LicenseGuard: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
    const { isLicensed, status, isLoading } = useLicense();
    const { user } = useAuth();
    const location = useLocation();
    const isAdmin = user?.roleId === 'r-1';

    const isPublicPath = location.pathname.includes('/login') || 
                        location.pathname.includes('/admin-tool') || 
                        location.pathname.includes('/license');

    if (isLoading) return null;

    const shouldRedirectToLicense = (status === 'blocked' || status === 'expired' || status === 'invalid' || status === 'mismatch' || status === 'tampered') && !isAdmin && !isPublicPath;

    if (shouldRedirectToLicense || (!isLicensed && !isAdmin && !isPublicPath)) {
        return <Navigate to="/license" replace />;
    }

    return children ? <>{children}</> : <Outlet />;
};

const AppRoutes: React.FC = () => {
    const { user } = useAuth();
    const { isLicensed } = useLicense();
    const isAdmin = user?.roleId === 'r-1';

    return (
        <>
        <GlobalUpdateOverlay />
        <GlobalAnnouncementPopup />
        <Routes>
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/license" element={isLicensed ? <Navigate to="/" replace /> : <LicensePage />} />
            <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
            
            <Route path="/admin-tool" element={<AdminLayout />}>
              <Route path="login" element={<AdminToolLoginPage />} />
              <Route path="requests" element={<AdminRequestsPage />} />
              <Route path="customers-files" element={<AdminCustomersFilesPage />} />
              <Route path="devices" element={<AdminDevicesPage />} />
              <Route path="licenses" element={<AdminLicensePage />} />
              <Route path="expired" element={<AdminExpiredLicensesPage />} />
              <Route path="pricing" element={<AdminPricingPage />} />
              <Route path="plan-limits" element={<AdminPlanLimitsPage />} />
              <Route path="features-manager" element={<AdminPlanFeaturesPage />} />
              <Route path="updates" element={<AdminUpdatesPage />} />
              <Route path="notifications" element={<AdminNotificationsPage />} />
              <Route path="policies" element={<AdminPoliciesPage />} />
              <Route path="suggestions" element={<AdminSuggestionsPage />} />
              <Route path="global-settings" element={<AdminGlobalSettingsPage />} />
              <Route path="performance" element={<AdminPerformancePage />} />
              <Route path="promo-codes" element={<AdminPromoCodesPage />} />
              <Route path="affiliates" element={<AdminAffiliatesPage />} />
              <Route index element={<AdminToolDashboardPage />} />
            </Route>

            <Route element={<LicenseGuard />}>
                <Route path="/" element={<MainLayout />}>
                    <Route index element={<HomeRouteWrapper />} />
                    <Route path="dashboard" element={<ProtectedRoute permission="view_dashboard"><DashboardPage /></ProtectedRoute>} />
                    <Route path="pos" element={<ProtectedRoute permission="manage_pos"><PosPage /></ProtectedRoute>} />
                    <Route path="products" element={<ProtectedRoute permission="manage_products"><ProductsPage /></ProtectedRoute>} />
                    <Route path="categories" element={<ProtectedRoute permission="manage_products"><CategoriesPage /></ProtectedRoute>} />
                    <Route path="inventory-audit" element={<ProtectedRoute permission="manage_products"><InventoryAuditPage /></ProtectedRoute>} />
                    <Route path="warehouses" element={<ProtectedRoute permission="manage_products"><WarehousesPage /></ProtectedRoute>} />
                    <Route path="stock-transfer" element={<ProtectedRoute permission="manage_products"><StockTransferPage /></ProtectedRoute>} />
                    <Route path="sales" element={<ProtectedRoute permission="view_sales"><SalesPage /></ProtectedRoute>} />
                    <Route path="purchases" element={<ProtectedRoute permission="manage_purchases"><PurchasesPage /></ProtectedRoute>} />
                    <Route path="purchases/new" element={<ProtectedRoute permission="manage_purchases"><AddPurchasePage /></ProtectedRoute>} />
                    <Route path="sales-returns" element={<ProtectedRoute permission="manage_sales_returns"><SalesReturnsPage /></ProtectedRoute>} />
                    <Route path="purchase-returns" element={<ProtectedRoute permission="manage_purchase_returns"><PurchaseReturnsPage /></ProtectedRoute>} />
                    <Route path="installments" element={<ProtectedRoute permission="manage_installments"><InstallmentsPage /></ProtectedRoute>} />
                    <Route path="reports" element={<ProtectedRoute permission="view_reports"><ReportsPage /></ProtectedRoute>} />
                    <Route path="employee-management" element={<ProtectedRoute permission="manage_hr_personnel"><EmployeeManagementPage /></ProtectedRoute>} />
                    <Route path="manufacturing-management" element={<ProtectedRoute permission="manage_op_manufacturing"><ManufacturingManagementPage /></ProtectedRoute>} />
                    <Route path="hr/attendance" element={<ProtectedRoute permission="manage_hr_personnel"><AttendancePage /></ProtectedRoute>} />
                    <Route path="tools/accounting" element={<ProtectedRoute permission="view_dashboard"><AccountingToolsPage /></ProtectedRoute>} />
                    <Route path="employee-performance" element={<ProtectedRoute permission="view_reports"><EmployeePerformancePage /></ProtectedRoute>} />
                    <Route path="sales-forecast" element={<ProtectedRoute permission="view_sales_forecast"><SalesForecastPage /></ProtectedRoute>} />
                    <Route path="supplier-analysis" element={<ProtectedRoute permission="view_supplier_analysis"><SupplierAnalysisPage /></ProtectedRoute>} />
                    <Route path="inactive-customers" element={<ProtectedRoute permission="view_inactive_customers_report"><InactiveCustomersPage /></ProtectedRoute>} />
                    <Route path="stagnant-products" element={<ProtectedRoute permission="view_stagnant_products_report"><StagnantProductsPage /></ProtectedRoute>} />
                    <Route path="customers" element={<ProtectedRoute permission="manage_customers"><CustomersPage /></ProtectedRoute>} />
                    <Route path="crm" element={<ProtectedRoute permission={['manage_customers', 'manage_suppliers']}><CrmPage /></ProtectedRoute>} />
                    <Route path="customer-debts" element={<ProtectedRoute permission="manage_customers"><CustomerDebtsPage /></ProtectedRoute>} />
                    <Route path="suppliers" element={<ProtectedRoute permission="manage_suppliers"><SuppliersPage /></ProtectedRoute>} />
                    <Route path="partners" element={<ProtectedRoute permission="manage_partners"><PartnersPage /></ProtectedRoute>} />
                    <Route path="employees" element={<ProtectedRoute permission="manage_settings"><EmployeesPage /></ProtectedRoute>} />
                    <Route path="shipping-operations" element={<ProtectedRoute permission="manage_settings"><ShippingOperationsPage /></ProtectedRoute>} />
                    <Route path="treasury" element={<ProtectedRoute permission="view_treasury"><TreasuryPage /></ProtectedRoute>} />
                    <Route path="financial-accounts" element={<ProtectedRoute permission="view_treasury"><FinancialAccountsPage /></ProtectedRoute>} />
                    <Route path="financial-settlement" element={<ProtectedRoute permission="view_treasury"><FinancialSettlementPage /></ProtectedRoute>} />
                    <Route path="shifts-log" element={<ProtectedRoute permission="view_treasury"><CashierShiftsPage /></ProtectedRoute>} />
                    <Route path="sales-drafts" element={<ProtectedRoute permission="view_sales"><SalesDraftsPage /></ProtectedRoute>} />
                    <Route path="whatsapp" element={<ProtectedRoute permission="manage_whatsapp"><WhatsAppPage /></ProtectedRoute>} />
                    <Route path="activity-logs" element={<ProtectedRoute permission="view_activity_logs"><ActivityLogsPage /></ProtectedRoute>} />
                    <Route path="settings" element={<ProtectedRoute permission={['manage_settings', 'manage_users', 'manage_backups']}><SettingsPage /></ProtectedRoute>} />
                    <Route path="system-updates" element={<SystemUpdatesPage />} />
                    <Route path="faq" element={<ProtectedRoute permission="view_faq"><FaqPage /></ProtectedRoute>} />
                    <Route path="about" element={<AboutPage />} />
                    <Route path="pricing" element={<PricingPage hideHeader={true} />} />
                    <Route path="features" element={<ProtectedRoute permission="view_faq"><FeaturesPage /></ProtectedRoute>} />
                    <Route path="notes" element={<ProtectedRoute permission="manage_notes"><NotesPage /></ProtectedRoute>} />
                    
                    {/* Simplified Accounts Routes */}
                    <Route path="accounts/advanced-reports" element={<ProtectedRoute permission="view_advanced_reports"><AdvancedFinancialReports /></ProtectedRoute>} />
                    <Route path="accounts/expenses" element={<ProtectedRoute permission="manage_acc_expenses"><ExpensesPage /></ProtectedRoute>} />
                    <Route path="accounts/assets" element={<ProtectedRoute permission="manage_acc_assets"><AssetsPage /></ProtectedRoute>} />

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
            </Route>
        </Routes>
        </>
    );
};

const AppContent: React.FC = () => {
    const { isBlocked, blockMessage, adminMessage, dismissAdminMessage, needsDataCompletion, dismissDataCompletion } = useAppGuard();
    const { isLoading: authLoading, isLocked } = useAuth();
    const { isLoading: licenseLoading, licenseType } = useLicense();
    const { identity, isRegistered, register, update, isLoading: identityLoading } = useUserIdentity();
    const [splashDone, setSplashDone] = useState(false);
    
    // Form logic for data completion
    const [updateName, setUpdateName] = useState('');
    const [updateEmail, setUpdateEmail] = useState('');
    const [updatePhone, setUpdatePhone] = useState('');
    const [updateCountry, setUpdateCountry] = useState('');
    const [isUpdatingData, setIsUpdatingData] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setSplashDone(true), 1500);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (identity && (identity.needsAdminDataCompletion || needsDataCompletion)) {
            setUpdateName(identity.name || '');
            setUpdateEmail(identity.email || '');
            setUpdatePhone(identity.phone || '');
            setUpdateCountry(identity.country || '');
        }
    }, [identity, needsDataCompletion]);

    const handleDataUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUpdatingData(true);
        
        // Safety timeout to prevent infinite loading (15 seconds)
        const timeoutId = setTimeout(() => {
            setIsUpdatingData(false);
        }, 15000);

        try {
            let ipAddress = 'unknown';
            try {
                // Fetch IP with a 5s timeout
                const controller = new AbortController();
                const id = setTimeout(() => controller.abort(), 5000);
                const response = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
                clearTimeout(id);
                const data = await response.json();
                ipAddress = data.ip;
            } catch (error) {
                console.error('Error fetching IP:', error);
            }

            const updatePromise = update({
                name: updateName,
                email: updateEmail,
                phone: updatePhone,
                country: updateCountry,
                updatedAt: new Date().toISOString(),
                ipAddress: ipAddress,
                plan: licenseType, // Automatically include the user's current plan
                needsAdminDataCompletion: false
            });

            await Promise.race([
                updatePromise,
                new Promise((_, reject) => setTimeout(() => reject(new Error('Update Timeout')), 10000))
            ]);
            
            // Sync device metadata automatically during update
            try {
                const { syncDeviceMetadata } = await import('./services/licenseService');
                await Promise.race([
                    syncDeviceMetadata(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Sync Timeout')), 5000))
                ]);
            } catch (e) {
                console.error('Error syncing device metadata after update:', e);
            }

            if (needsDataCompletion) {
                try {
                    await Promise.race([
                        dismissDataCompletion(),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Dismiss Timeout')), 5000))
                    ]);
                } catch (e) {
                    console.error('Error dismissing data completion:', e);
                }
            }
        } catch (err) {
            console.error("FATAL: Failed to update user data", err);
        } finally {
            clearTimeout(timeoutId);
            setIsUpdatingData(false);
        }
    };

    const isAppLoading = authLoading || licenseLoading || identityLoading || !splashDone;

    if (isBlocked) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-6" dir="rtl">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">النظام متوقف</h2>
                    <p className="text-slate-600 dark:text-slate-300 mb-6">{blockMessage}</p>
                    <p className="text-sm text-slate-400">للاستفسار، يرجى التواصل مع الدعم الفني.</p>
                </div>
            </div>
        );
    }

    if (isAppLoading) return <SplashScreen />;
    if (!isRegistered) return <RegistrationForm onRegister={register} />;
    if (isLocked) return <LockScreen />;
    
    return (
        <React.Fragment>
            <TermsModal />
            {(identity?.needsAdminDataCompletion || needsDataCompletion) && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4" dir="rtl">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl max-w-lg w-full animate-scaleUp">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">طلب تحديث بيانات</h2>
                            <p className="text-sm font-bold text-slate-500">طلبت الإدارة تحديث بياناتك للاستمرار في استخدام النظام. برجاء التأكد من صحتها.</p>
                        </div>
                        <form onSubmit={handleDataUpdate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">الاسم بالكامل</label>
                                <input type="text" required value={updateName} onChange={e => setUpdateName(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">البريد الإلكتروني</label>
                                <input type="email" required value={updateEmail} onChange={e => setUpdateEmail(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">رقم الهاتف (+966...)</label>
                                <input type="text" required dir="ltr" value={updatePhone} onChange={e => setUpdatePhone(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">الدولة</label>
                                <input type="text" required value={updateCountry} onChange={e => setUpdateCountry(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <Button type="submit" isLoading={isUpdatingData} className="w-full py-3 text-lg font-black mt-4">
                                حفظ وتحديث البيانات
                            </Button>
                        </form>
                    </div>
                </div>
            )}
            {adminMessage && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" dir="rtl">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl max-w-md w-full animate-scaleUp">
                        <div className="flex items-center gap-3 mb-4 text-indigo-600 dark:text-indigo-400">
                            <div className="bg-indigo-100 dark:bg-indigo-500/20 p-2 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">رسالة من الإدارة</h3>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 mb-8 whitespace-pre-wrap leading-relaxed">{adminMessage.text}</p>
                        <Button onClick={dismissAdminMessage} className="w-full">
                            حسناً، فهمت
                        </Button>
                    </div>
                </div>
            )}
            <AppRoutes />
        </React.Fragment>
    );
}

const App: React.FC = () => {
    return (
      <ErrorBoundary>
        <HashRouter>
          <ScrollToTop />
          <LanguageProvider>
            <PWAInstallProvider>
              <SettingsProvider>
                <ThemeProvider>
                  <DevModeProvider>
                    <ChangelogProvider>
                        <LicenseProvider>
                            <AuthProvider>
                              <AdminAuthProvider>
                                <ToastProvider>
                                  <NotificationsProvider>
                                    <ShiftProvider>
                                      <AppContent />
                                      <ToastContainer />
                                    </ShiftProvider>
                                  </NotificationsProvider>
                                </ToastProvider>
                              </AdminAuthProvider>
                            </AuthProvider>
                        </LicenseProvider>
                    </ChangelogProvider>
                  </DevModeProvider>
                </ThemeProvider>
              </SettingsProvider>
            </PWAInstallProvider>
          </LanguageProvider>
        </HashRouter>
      </ErrorBoundary>
    );
};

export default App;
