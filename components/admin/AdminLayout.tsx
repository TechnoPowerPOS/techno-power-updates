import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import SplashScreen from '../layout/SplashScreen';
import { LayoutDashboard, Users, Key, AlertTriangle, Bell, UploadCloud, LogOut, Menu, X, Settings, ShieldCheck, DollarSign, MessageSquare, MonitorSmartphone, TrendingUp, LifeBuoy, Zap, Tag, FolderOpen } from 'lucide-react';
import { useLicense } from '../../hooks/useLicense';

const AdminLayout: React.FC = () => {
    const { isAdminLoggedIn, isLoading, logout } = useAdminAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(true);

    useEffect(() => {
        if (!isLoading) {
            const isLoginPage = location.pathname === '/admin-tool/login';
            
            if (isAdminLoggedIn && isLoginPage) {
                navigate('/admin-tool', { replace: true });
            } else if (!isAdminLoggedIn && !isLoginPage) {
                navigate('/admin-tool/login', { replace: true });
            }
        }
    }, [isAdminLoggedIn, isLoading, navigate, location.pathname]);

    if (isLoading) {
        return <SplashScreen />;
    }

    const isLoginPage = location.pathname === '/admin-tool/login';

    if (isLoginPage || !isAdminLoggedIn) {
        return (
            <div className="bg-slate-100 dark:bg-slate-950 min-h-screen">
                <Outlet />
            </div>
        );
    }

    const navItems = [
        { path: '/admin-tool', icon: LayoutDashboard, label: 'لوحة القيادة (Dashboard)' },
        { path: '/admin-tool/requests', icon: Users, label: 'طلبات العملاء (جديد)' },
        { path: '/admin-tool/customers-files', icon: FolderOpen, label: 'ملفات العملاء' },
        { path: '/admin-tool/affiliates', icon: Key, label: 'نظام الإحالات (Affiliates)' },
        { path: '/admin-tool/performance', icon: Zap, label: 'مراقبة أداء النظام' },
        { path: '/admin-tool/promo-codes', icon: Tag, label: 'الأكواد والعروض' },
        { path: '/admin-tool/devices', icon: MonitorSmartphone, label: 'إدارة أجهزة الوصول' },
        { path: '/admin-tool/licenses', icon: Key, label: 'نظام التراخيص' },
        { path: '/admin-tool/pricing', icon: DollarSign, label: 'تعديل الأسعار' },
        { path: '/admin-tool/plan-limits', icon: ShieldCheck, label: 'صلاحيات الباقات' },
        { path: '/admin-tool/expired', icon: AlertTriangle, label: 'الاشتراكات المنتهية' },
        { path: '/admin-tool/updates', icon: UploadCloud, label: 'تحديثات النظام' },
        { path: '/admin-tool/notifications', icon: Bell, label: 'الإشعارات العامة' },
        { path: '/admin-tool/policies', icon: Settings, label: 'إدارة سياسات التطبيق' },
        { path: '/admin-tool/suggestions', icon: MessageSquare, label: 'الاقتراحات' },
    ];

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 dir-rtl overflow-hidden">
            {/* Sidebar */}
            <aside className={`fixed inset-y-0 right-0 z-50 w-72 bg-white dark:bg-slate-900 border-l dark:border-slate-800 shadow-xl transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'} md:relative md:translate-x-0 flex flex-col h-full`}>
                <div className="flex items-center justify-between p-6 border-b dark:border-slate-800">
                    <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-500">
                        <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-xl">
                            <ShieldCheck size={28} />
                        </div>
                        <span className="text-xl font-black tracking-widest">Super Admin</span>
                    </div>
                    <button className="md:hidden text-slate-400 hover:text-slate-600" onClick={() => setSidebarOpen(false)}>
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
                    {navItems.map(item => {
                        const active = location.pathname === item.path;
                        return (
                            <Link 
                                key={item.path} 
                                to={item.path}
                                onClick={() => { if(window.innerWidth < 768) setSidebarOpen(false); }}
                                className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all font-bold ${
                                    active 
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-indigo-600 dark:hover:text-indigo-400'
                                }`}
                            >
                                <item.icon size={20} className={active ? '' : 'opacity-70'} />
                                {item.label}
                            </Link>
                        )
                    })}
                </div>

                <div className="p-6 border-t dark:border-slate-800">
                    <button onClick={() => logout()} className="flex items-center gap-4 px-4 py-3.5 w-full rounded-2xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors font-bold text-start">
                        <LogOut size={20} /> الخروج بأمان
                    </button>
                    <Link to="/" className="block text-center mt-3 text-xs text-slate-500 hover:underline">
                        العودة لنظام المبيعات
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden">
                <header className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 py-4 px-6 flex items-center justify-between shadow-sm md:hidden shrink-0">
                    <button onClick={() => setSidebarOpen(true)} className="p-2 -mx-2 text-slate-500 hover:bg-slate-100 rounded-lg">
                        <Menu size={24} />
                    </button>
                    <span className="font-bold text-slate-800 dark:text-white">لوحة التحكم</span>
                    <div className="w-8"></div>
                </header>
                <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;