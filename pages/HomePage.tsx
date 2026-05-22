
import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
    ShoppingCart, Package, Users, BarChart3, Settings, Truck, Wallet, 
    ChevronLeft, ArrowRight, Sparkles, LayoutGrid, Clock, CreditCard,
    TrendingUp, HelpCircle, Activity
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { useLicense } from '../hooks/useLicense';
import { useTranslation } from '../hooks/useTranslation';
import { api } from '../services/mockApi';

import { toArabicIndic, formatCurrency } from '../utils/localization';
import { NAV_LINKS, NavLinkType } from '../constants';
import { getPlanLimits } from '../utils/planPermissions';

const QuickAction: React.FC<{ to: string, icon: any, label: string, color: string }> = ({ to, icon: Icon, label, color }) => (
    <Link to={to} className="flex flex-col items-center gap-3 group">
        <div className={`p-4 rounded-2xl ${color} text-white shadow-lg group-hover:scale-110 transition-transform`}>
            <Icon size={24} />
        </div>
        <span className="text-xs font-black text-slate-600 dark:text-slate-400">{label}</span>
    </Link>
);

const StatCard: React.FC<{ label: string, value: string, icon: any, color: string }> = ({ label, value, icon: Icon, color }) => (
    <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex items-center gap-4 transition-all hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none">
        <div className={`p-3 rounded-2xl ${color} bg-opacity-10 dark:bg-opacity-20`}>
            <Icon size={24} className={color.replace('bg-', 'text-').replace('-500', '-600')} />
        </div>
        <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
            <p className="text-xl font-black text-slate-800 dark:text-white">{value}</p>
        </div>
    </div>
);

export const useFilteredNavLinks = (settings: any, licenseInfo: any, isFree: boolean, userHasPermission: any) => {
    return useMemo(() => {
        if (!settings) return [];

        const fallbackIds: string[] = [];
        NAV_LINKS.forEach(link => {
            if ('children' in link) {
                (link as any).children.forEach((c: any) => fallbackIds.push(c.id));
            } else {
                fallbackIds.push(link.id);
            }
        });

        const targetIds = (settings.homeGridItems && settings.homeGridItems.length > 0) 
            ? settings.homeGridItems 
            : fallbackIds;

        const flattenedLinks: NavLinkType[] = [];
        
        NAV_LINKS.forEach(link => {
            if ('children' in link) {
                const group = link as any;
                if (group.children && Array.isArray(group.children)) {
                    flattenedLinks.push(...group.children);
                }
            } else {
                flattenedLinks.push(link as NavLinkType);
            }
        });

        const filtered = flattenedLinks.filter(item => {
            if (!item) return false;
            
            const limits = getPlanLimits(licenseInfo.type);
            if (item.id === 'accounting_tools' && !limits.hasAccounting) return false;
            if (item.id === 'chat_power' && !limits.hasAI) return false;
            if (item.id === 'sales_forecast' && !limits.hasAI) return false;
            if (item.id === 'partners' && !limits.hasPartners) return false;
            if (item.id === 'employee_performance' && !limits.hasEmployeePerformance) return false;
            if (item.id === 'inventory_audit' && !limits.hasInventoryAudit) return false;
            if (item.id === 'stock_transfer' && !limits.hasStockTransfer) return false;
            if (item.id === 'installments' && !limits.hasInstallments) return false;
            if (item.id === 'customer_satisfaction' && !limits.hasCustomerSatisfaction) return false;
            if (item.id === 'activity_logs' && !limits.hasActivityLogs) return false;

            if (isFree) {
                const restrictedForFree = ['dashboard', 'financial_reports'];
                if (restrictedForFree.includes(item.id)) return false;
            }

            const isTarget = targetIds.includes(item.id) || item.id === 'about';
            const hasPermission = !item.permission || userHasPermission(item.permission as any);
            return isTarget && hasPermission;
        });

        // Sort properly by the order specified in settings.homeGridItems if available
        return filtered.sort((a, b) => {
            const indexA = targetIds.indexOf(a.id);
            const indexB = targetIds.indexOf(b.id);
            if (indexA === -1 && indexB === -1) return 0;
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });
    }, [settings, userHasPermission, licenseInfo, isFree]);
};

export const ModernDashboardItemWrapper: React.FC<{ item: any, t: any }> = ({ item, t }) => {
    const meta: Record<string, { color: string, description: string, stat: string }> = {
        'pos': { color: 'from-indigo-600 to-blue-500', description: 'إدارة عمليات البيع، الفواتير، ونقطة البيع السريعة POS', stat: 'نقطة البيع' },
        'purchases': { color: 'from-amber-600 to-orange-500', description: 'تسجيل فواتير المشتريات ومتابعة الموردين', stat: 'الفواتير الواردة' },
        'purchases_returns': { color: 'from-red-600 to-rose-500', description: 'إدارة مردودات المشتريات للشركة', stat: 'إرجاع للفواتير' },
        'products': { color: 'from-emerald-600 to-teal-500', description: 'إدارة رصيد المنتجات والباركود والمستودعات', stat: 'الرصيد' },
        'customers': { color: 'from-rose-600 to-pink-500', description: 'بيانات العملاء وسجلاتهم ومتابعات الديون', stat: 'العملاء' },
        'customer_debts': { color: 'from-purple-600 to-indigo-500', description: 'متابعة الديون وجدول السداد المالي للعملاء', stat: 'الذمم' },
        'reports': { color: 'from-blue-600 to-cyan-500', description: 'نظرة شاملة على أدائك ومدخولاتك', stat: 'التحليلات' },
        'settings': { color: 'from-slate-700 to-slate-900', description: 'تخصيص كامل لإعدادت نظامك وصلاحيات الموظفين', stat: 'الإدارة' }
    };
    
    // Fallback if metadata not present
    const m = meta[item.id] || { color: 'from-slate-500 to-slate-700', description: 'ميزة من ميزات النظام المتقدمة.', stat: 'أداة مساعدة' };
    
    const dashboardItem = {
        id: item.id,
        title: t(item.t_key),
        description: m.description,
        icon: item.icon,
        link: item.href,
        color: m.color,
        stat: m.stat
    };
    
    return <DashboardCard item={dashboardItem} />;
};

const ClassicHomePage: React.FC<{ user: any, settings: any, currentTime: Date, t: any, licenseInfo: any, userHasPermission: any }> = ({ user, settings, currentTime, t, licenseInfo, userHasPermission }) => {
    const isFree = licenseInfo.type === 'Free';
    const [stats, setStats] = useState({ salesToday: 0, activeProducts: 0, customerCount: 0, totalBalance: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [analytics, products, customers, treasuries] = await Promise.all([
                    api.getDashboardAnalytics(),
                    api.getProducts(),
                    api.getCustomers(),
                    api.getTreasuries(true) // Pass true to include banks
                ]);
                setStats({
                    salesToday: analytics.totalSalesToday || 0,
                    activeProducts: products.filter(p => (p.stock || 0) > 0).length,
                    customerCount: customers.length,
                    totalBalance: treasuries.reduce((sum, t) => sum + (t.balance || 0), 0)
                });
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const gridItems = useFilteredNavLinks(settings, licenseInfo, isFree, userHasPermission);

    const meta: Record<string, { color: string, iconColor: string }> = {
        'dashboard': { color: 'from-blue-500/10 to-indigo-500/10', iconColor: 'bg-indigo-600' },
        'pos': { color: 'from-violet-500/10 to-purple-500/10', iconColor: 'bg-purple-600' },
        'products': { color: 'from-emerald-500/10 to-teal-500/10', iconColor: 'bg-emerald-600' },
        'warehouses': { color: 'from-teal-500/10 to-emerald-500/10', iconColor: 'bg-teal-600' },
        'inventory_audit': { color: 'from-indigo-500/10 to-blue-500/10', iconColor: 'bg-indigo-500' },
        'stock_transfer': { color: 'from-amber-500/10 to-orange-500/10', iconColor: 'bg-amber-600' },
        'sales': { color: 'from-orange-500/10 to-red-500/10', iconColor: 'bg-orange-600' },
        'purchases': { color: 'from-indigo-500/10 to-blue-500/10', iconColor: 'bg-indigo-500' },
        'sales_returns': { color: 'from-rose-500/10 to-pink-500/10', iconColor: 'bg-rose-600' },
        'purchase_returns': { color: 'from-red-500/10 to-orange-500/10', iconColor: 'bg-red-600' },
        'installments': { color: 'from-green-500/10 to-emerald-500/10', iconColor: 'bg-green-600' },
        'customers': { color: 'from-pink-500/10 to-rose-500/10', iconColor: 'bg-pink-600' },
        'suppliers': { color: 'from-cyan-500/10 to-blue-600/10', iconColor: 'bg-cyan-600' },
        'treasury': { color: 'from-amber-500/10 to-yellow-500/10', iconColor: 'bg-amber-600' },
        'settings': { color: 'from-slate-500/10 to-slate-700/10', iconColor: 'bg-slate-700' },
        'reports': { color: 'from-blue-500/10 to-sky-500/10', iconColor: 'bg-blue-600' },
        'financial_reports': { color: 'from-blue-500/10 to-sky-500/10', iconColor: 'bg-blue-600' },
        'employee_performance': { color: 'from-amber-400/10 to-orange-400/10', iconColor: 'bg-orange-500' },
        'customer_satisfaction': { color: 'from-emerald-400/10 to-green-400/10', iconColor: 'bg-emerald-500' },
        'activity_logs': { color: 'from-slate-400/10 to-slate-500/10', iconColor: 'bg-slate-500' },
        'features': { color: 'from-purple-500/10 to-indigo-500/10', iconColor: 'bg-purple-600' },
        'faq': { color: 'from-slate-300/10 to-slate-400/10', iconColor: 'bg-slate-400' },
        'admin_tool': { color: 'from-red-500/10 to-rose-600/10', iconColor: 'bg-red-600' },
        'partners': { color: 'from-emerald-500/10 to-green-600/10', iconColor: 'bg-emerald-600' },
        'shipping_companies': { color: 'from-sky-400/10 to-blue-500/10', iconColor: 'bg-sky-600' },
        'sales_forecast': { color: 'from-fuchsia-500/10 to-purple-600/10', iconColor: 'bg-fuchsia-600' },
        'supplier_analysis': { color: 'from-blue-600/10 to-cyan-500/10', iconColor: 'bg-blue-700' },
        'inactive_customers': { color: 'from-rose-600/10 to-red-700/10', iconColor: 'bg-rose-700' },
        'stagnant_products': { color: 'from-slate-700/10 to-slate-900/10', iconColor: 'bg-slate-800' },
        'about': { color: 'from-indigo-400/10 to-blue-400/10', iconColor: 'bg-indigo-500' }
    };

    return (
        <div className="animate-fade-in-up pb-20 space-y-12">
            {/* Elegant Header Section */}
            <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 to-sky-600/10 blur-3xl rounded-[4rem] -z-10 group-hover:scale-105 transition-transform duration-700"></div>
                <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 md:p-16 border border-slate-100 dark:border-slate-800 shadow-2xl flex flex-col lg:flex-row justify-between items-center gap-12 overflow-hidden">
                    <div className="flex-1 space-y-8 relative z-10 text-center lg:text-start">
                        <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest">
                            <Sparkles size={14} className="animate-pulse" />
                            {isFree ? 'النسخة المجانية الذكية' : 'نظام متصل ومؤمن بالكامل'}
                        </div>
                        
                        <div className="space-y-4">
                            <h1 className="text-5xl md:text-7xl font-black text-slate-800 dark:text-white leading-tight tracking-tighter">
                                مرحباً، <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400">{user?.name?.split(' ')[0]}</span>
                            </h1>
                            <p className="text-xl md:text-2xl text-slate-500 dark:text-slate-400 font-medium max-w-xl mx-auto lg:mx-0">مساعدك الذكي لإدارة التجارة والمخزون بكل احترافية وسهولة.</p>
                        </div>

                        <div className="flex flex-wrap justify-center lg:justify-start gap-5 pt-4">
                            <Link to="/pos" className="bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black flex items-center gap-3 hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-indigo-500/30 text-lg">
                                <ShoppingCart size={24} />
                                بدء بيع جديد
                                <ArrowRight size={20} className="ms-2" />
                            </Link>
                            <Link to="/products" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 px-10 py-5 rounded-2xl font-black flex items-center gap-3 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-lg">
                                <Package size={24} />
                                المخزون
                            </Link>
                        </div>
                    </div>

                    {/* Dynamic Time/Date Module */}
                    <div className="w-full lg:w-[400px] bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden ring-8 ring-slate-100/50 dark:ring-slate-800/50">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                        <div className="relative z-10 flex flex-col justify-between h-full">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-widest text-indigo-400 mb-1">{new Date().toLocaleDateString('ar-EG', { weekday: 'long' })}</p>
                                    <p className="text-2xl font-black">{new Date().toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })}</p>
                                </div>
                                <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-xl border border-white/10">
                                    <Clock size={28} className="text-indigo-400" />
                                </div>
                            </div>
                            <div className="mt-12">
                                <p className="text-7xl font-black font-mono tracking-tighter text-center lg:text-start leading-none">
                                    {toArabicIndic(currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }))}
                                </p>
                                <div className="mt-4 flex items-center justify-center lg:justify-start gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">النظام يعمل في وضع الاتصال</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="مبيعات اليوم" value={loading ? '...' : formatCurrency(stats.salesToday, settings.currency)} icon={TrendingUp} color="bg-indigo-500" />
                <StatCard label="المنتجات النشطة" value={loading ? '...' : toArabicIndic(stats.activeProducts.toString())} icon={Package} color="bg-emerald-500" />
                <StatCard label="قاعدة العملاء" value={loading ? '...' : toArabicIndic(stats.customerCount.toString())} icon={Users} color="bg-amber-500" />
                <StatCard label="رصيد الحسابات" value={loading ? '...' : formatCurrency(stats.totalBalance, settings.currency)} icon={Wallet} color="bg-rose-500" />
            </div>

            {/* Main Navigation Grid */}
            <div className="space-y-8">
                <div className="flex items-center justify-between px-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 rounded-2xl flex items-center justify-center">
                            <LayoutGrid size={24} />
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 dark:text-white">أدوات الوصول السريع</h2>
                    </div>
                    <Link to="/settings" className="px-6 py-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-xs font-black text-indigo-600 dark:text-indigo-400 shadow-sm hover:shadow-lg transition-all">تخصيص اللوحة</Link>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-8">
                    {gridItems.map((item) => {
                        const Icon = item.icon;
                        const iconColorClass = item.color || 'text-indigo-600';
                        const bgColorClass = item.iconBgColor || 'bg-indigo-600';
                        
                        return (
                            <Link 
                                key={item.id} to={item.href}
                                className="group relative h-52 md:h-60 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-3 transition-all duration-500"
                            >
                                <div className={`absolute inset-0 ${bgColorClass.replace('bg-', 'bg-').split(' ')[0]}/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-[3rem]`}></div>
                                <div className={`w-20 h-20 mb-5 rounded-3xl ${bgColorClass} text-white flex items-center justify-center shadow-2xl relative z-10 transition-all duration-700 group-hover:rotate-[15deg] group-hover:scale-110`}>
                                    <Icon size={36} />
                                </div>
                                <div className="text-center z-10 px-4">
                                    <h3 className={`text-base md:text-lg font-black ${iconColorClass} transition-colors tracking-tight`}>{t(item.t_key)}</h3>
                                    <div className={`mt-3 w-0 group-hover:w-12 h-1.5 ${bgColorClass} mx-auto rounded-full transition-all duration-500`}></div>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {gridItems.length === 0 && (
                    <div className="p-32 text-center bg-white/50 dark:bg-slate-900/50 rounded-[4rem] border-2 border-dashed border-slate-200 dark:border-slate-800 backdrop-blur-xl">
                        <LayoutGrid size={64} className="mx-auto text-slate-200 dark:text-slate-800 mb-6" />
                        <p className="text-slate-400 font-bold text-xl">لا توجد عناصر مفعلة للوصول السريع.</p>
                        <Link to="/settings" className="text-indigo-600 font-black hover:underline mt-4 inline-block">انتقل للإعدادات للتخصيص</Link>
                    </div>
                )}
            </div>

            {/* Secondary Toolbar */}
            <div className="bg-slate-900 text-white p-8 rounded-[3.5rem] shadow-premium flex flex-wrap justify-around items-center gap-10 ring-1 ring-white/10">
                <QuickAction to="/reports" icon={TrendingUp} label="التقارير" color="bg-indigo-500" />
                <QuickAction to="/faq" icon={HelpCircle} label="المساعدة" color="bg-slate-500" />
                <QuickAction to="/activity-logs" icon={Activity} label="السجلات" color="bg-orange-500" />
                <QuickAction to="/settings" icon={Settings} label="الإعدادات" color="bg-indigo-400" />
            </div>
        </div>
    );
};

interface DashboardItem {
    id: string;
    title: string;
    description: string;
    icon: any;
    link: string;
    color: string;
    stat?: string;
}

const DashboardCard: React.FC<{ item: DashboardItem }> = ({ item }) => {
    const { icon: Icon } = item;
    
    return (
        <motion.div
            whileHover={{ y: -8, scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="group relative"
        >
            <Link to={item.link}>
                <div className="h-full bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 flex flex-col justify-between overflow-hidden">
                    {/* Background Decorative Blob */}
                    <div className={`absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-10 dark:group-hover:opacity-20 rounded-full blur-3xl transition-opacity duration-700`}></div>
                    
                    <div>
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white shadow-lg mb-6 group-hover:rotate-6 transition-transform duration-500`}>
                            <Icon size={32} />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {item.title}
                        </h3>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                            {item.description}
                        </p>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                        {item.stat ? (
                            <span className="px-3 py-1 bg-slate-50 dark:bg-slate-800 text-[10px] font-black text-slate-500 dark:text-slate-400 rounded-full border border-slate-100 dark:border-slate-800">
                                {item.stat}
                            </span>
                        ) : (
                            <span></span>
                        )}
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-500">
                            <ChevronLeft size={20} />
                        </div>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
};

const BentoHomePage: React.FC<{ user: any, currentTime: Date, t: any, gridItems: any[], settings: any }> = ({ user, currentTime, t, gridItems, settings }) => {
    const [stats, setStats] = useState({ dailySales: 0, activeProducts: 0, totalCustomers: 0, totalBalance: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [analytics, products, customers, treasuries] = await Promise.all([
                    api.getDashboardAnalytics(),
                    api.getProducts(),
                    api.getCustomers(),
                    api.getTreasuries(true)
                ]);
                setStats({
                    dailySales: analytics.totalSalesToday || 0,
                    activeProducts: products.filter(p => (p.stock || 0) > 0).length,
                    totalCustomers: customers.length,
                    totalBalance: treasuries.reduce((sum: number, t: any) => sum + (t.balance || 0), 0)
                });
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    return (
        <div className="animate-fadeIn p-4 md:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black text-slate-800 dark:text-white tracking-tight mb-2">
                        مرحباً بك، <span className="text-indigo-600 dark:text-indigo-400">{user?.name?.split(' ')[0] || 'مدير النظام'}</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-bold">مساحة عملك جاهزة، ماذا تود أن تفعل اليوم؟</p>
                </div>
                <div className="flex items-center gap-4 bg-white dark:bg-slate-900 md:px-6 md:py-4 px-4 py-3 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="bg-indigo-50 dark:bg-indigo-900/40 p-3 rounded-2xl text-indigo-600 dark:text-indigo-400">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-black text-slate-400">{currentTime.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <p className="text-xl font-black text-slate-800 dark:text-white">{currentTime.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                </div>
            </div>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6 md:auto-rows-[160px]">
                
                {/* Main Action - POS (Spans 2 cols, 2 rows) */}
                <motion.div whileHover={{ scale: 0.98 }} className="md:col-span-2 md:row-span-2 group">
                    <Link to="/pos" className="block w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl shadow-indigo-500/20">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                        <div className="relative z-10 h-full flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md">
                                    <ShoppingCart size={40} className="text-white" />
                                </div>
                                <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md flex items-center gap-1">
                                    <Sparkles size={12} /> سريع
                                </div>
                            </div>
                            <div className="mt-8">
                                <h3 className="text-3xl lg:text-4xl font-black mb-2">نقطة البيع</h3>
                                <p className="text-indigo-100 text-sm font-bold opacity-90 group-hover:opacity-100 transition-opacity">إصدار الفواتير وتسجيل المبيعات فوراً</p>
                            </div>
                            <div className="absolute bottom-8 left-8 w-12 h-12 bg-white text-indigo-600 rounded-full flex items-center justify-center -translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 shadow-xl">
                                <ArrowRight size={24} />
                            </div>
                        </div>
                    </Link>
                </motion.div>

                {/* Dashboard Stats (Spans 2 cols, 1 row) */}
                <motion.div whileHover={{ scale: 0.98 }} className="md:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 rounded-3xl flex items-center justify-center shadow-inner">
                            <TrendingUp size={32} />
                        </div>
                        <div>
                            <p className="text-slate-400 font-bold text-sm mb-1">مبيعات اليوم</p>
                            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.dailySales, settings?.currency || 'SAR')}</p>
                        </div>
                    </div>
                    <Link to="/reports" className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors">
                        <ChevronLeft size={20} />
                    </Link>
                </motion.div>

                {/* Products Quick Link (Spans 1 col, 1 row) */}
                <motion.div whileHover={{ scale: 0.95 }} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <Link to="/products" className="w-full h-full flex flex-col justify-center items-center p-6 text-center z-10 relative">
                        <div className="w-14 h-14 bg-amber-50 dark:bg-amber-900/30 text-amber-500 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:-translate-y-2 group-hover:scale-110 group-hover:rotate-12 shadow-sm group-hover:shadow-amber-500/20">
                            <Package size={28} />
                        </div>
                        <h4 className="font-black text-slate-800 dark:text-white">المنتجات النشطة</h4>
                        <p className="text-xs font-bold text-slate-400 mt-1">{toArabicIndic(stats.activeProducts.toString())} صنف</p>
                    </Link>
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-amber-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                </motion.div>

                {/* Customers Quick Link (Spans 1 col, 1 row) */}
                <motion.div whileHover={{ scale: 0.95 }} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <Link to="/customers" className="w-full h-full flex flex-col justify-center items-center p-6 text-center z-10 relative">
                        <div className="w-14 h-14 bg-pink-50 dark:bg-pink-900/30 text-pink-500 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:-translate-y-2 group-hover:scale-110 group-hover:-rotate-12 shadow-sm group-hover:shadow-pink-500/20">
                            <Users size={28} />
                        </div>
                        <h4 className="font-black text-slate-800 dark:text-white">قاعدة العملاء</h4>
                        <p className="text-xs font-bold text-slate-400 mt-1">{toArabicIndic(stats.totalCustomers.toString())} عميل</p>
                    </Link>
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-pink-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                </motion.div>

                {/* Purchases Quick Link (Spans 2 cols, 1 row) */}
                <motion.div whileHover={{ scale: 0.98 }} className="md:col-span-2 bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2.5rem] p-6 shadow-xl relative overflow-hidden group text-white">
                    <Link to="/purchases" className="w-full h-full flex items-center justify-between z-10 relative">
                        <div>
                            <div className="bg-white/10 w-fit p-3 rounded-2xl backdrop-blur-md mb-3 text-cyan-400">
                                <Truck size={24} />
                            </div>
                            <h4 className="font-black text-xl mb-1">المشتريات</h4>
                            <p className="text-slate-400 text-xs font-bold">إدارة الموردين والفواتير الواردة</p>
                        </div>
                        <div className="opacity-50 group-hover:opacity-100 group-hover:-translate-x-2 transition-all">
                            <ChevronLeft size={32} />
                        </div>
                    </Link>
                </motion.div>

                {/* Reports Link (Spans 1 col, 1 row) */}
                <motion.div whileHover={{ scale: 0.95 }} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <Link to="/reports" className="w-full h-full flex items-center justify-center p-6 z-10 relative">
                        <div className="flex flex-col items-center">
                           <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 text-blue-500 rounded-auto rounded-full flex items-center justify-center mb-3">
                               <BarChart3 size={28} />
                           </div>
                           <h4 className="font-black text-slate-800 dark:text-white text-sm">أداء وتتبع</h4>
                        </div>
                    </Link>
                </motion.div>

                {/* Settings Link (Spans 1 col, 1 row) */}
                <motion.div whileHover={{ scale: 0.95 }} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <Link to="/settings" className="w-full h-full flex items-center justify-center p-6 z-10 relative">
                        <div className="flex flex-col items-center">
                           <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-auto rounded-full flex items-center justify-center mb-3 group-hover:rotate-180 transition-transform duration-700">
                               <Settings size={28} />
                           </div>
                           <h4 className="font-black text-slate-800 dark:text-white text-sm">الاعدادات</h4>
                        </div>
                    </Link>
                </motion.div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                 {/* Debts Link */}
                <motion.div whileHover={{ scale: 0.98 }} className="bg-indigo-50 dark:bg-indigo-900/10 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-900/30 p-6 flex items-center justify-between group">
                     <div className="flex items-center gap-5">
                         <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white p-4 rounded-2xl shadow-xl shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                             <CreditCard size={28} />
                         </div>
                         <div>
                             <h4 className="font-black text-indigo-900 dark:text-indigo-200 text-lg">إجمالي رصيد الحسابات</h4>
                             <p className="text-indigo-600 dark:text-indigo-400 text-2xl font-black mt-1">{formatCurrency(stats.totalBalance, settings?.currency || 'SAR')}</p>
                         </div>
                     </div>
                     <Link to="/customer-debts" className="px-5 py-2.5 bg-indigo-600 text-white font-black rounded-xl text-sm opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all shadow-md">
                         عرض التفاصيل
                     </Link>
                </motion.div>

                 {/* Help & Support */}
                 <motion.div whileHover={{ scale: 0.98 }} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-6 flex flex-col justify-center group overflow-hidden relative">
                    <div className="absolute right-0 top-0 w-32 h-full bg-slate-50 dark:bg-slate-800/50 -skew-x-12 translate-x-10 group-hover:w-full group-hover:translate-x-0 transition-all duration-500 z-0"></div>
                     <div className="relative z-10 flex items-center justify-between">
                         <div className="flex items-center gap-4">
                             <div className="text-slate-400 group-hover:text-amber-500 transition-colors">
                                 <HelpCircle size={32} />
                             </div>
                             <div>
                                 <h4 className="font-black text-slate-800 dark:text-white">تحتاج لمساعدة؟</h4>
                                 <Link to="/faq" className="text-slate-500 text-sm font-bold hover:text-indigo-600 hover:underline inline-flex items-center gap-1 mt-1">الأسئلة الشائعة <ChevronLeft size={14}/></Link>
                             </div>
                         </div>
                     </div>
                 </motion.div>
            </div>

            {gridItems.length > 0 && (
                <div className="mt-8 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 rounded-xl flex items-center justify-center">
                            <LayoutGrid size={20} />
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white">أدوات إضافية</h2>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {gridItems.map(item => (
                            <Link key={item.id} to={item.href} className="group relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-xl transition-all flex items-center gap-4">
                                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-500 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <item.icon size={24} />
                                </div>
                                <h4 className="font-black text-slate-700 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors shrink-0">{t(item.t_key)}</h4>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const HomePage: React.FC = () => {
    const { user, userHasPermission } = useAuth();
    const { settings } = useSettings();
    const { licenseInfo } = useLicense();
    const { t } = useTranslation();
    const [currentTime, setCurrentTime] = useState(new Date());

    const isFree = licenseInfo?.type === 'Free';
    const gridItems = useFilteredNavLinks(settings, licenseInfo, isFree, userHasPermission);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    if (!settings) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
    );

    if (settings.homePageStyle === 'classic') {
        return <ClassicHomePage user={user} settings={settings} currentTime={currentTime} t={t} licenseInfo={licenseInfo} userHasPermission={userHasPermission} />;
    }
    
    if (settings.homePageStyle === 'bento') {
        return <BentoHomePage user={user} currentTime={currentTime} t={t} gridItems={gridItems} settings={settings} />;
    }

    return (
        <div className="animate-fadeIn pb-20 space-y-12">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-center gap-10">
                <div className="space-y-4 text-center lg:text-start">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest"
                    >
                        <Sparkles size={14} className="animate-pulse" />
                        نظام تكنو باور المحاسبي الذكي
                    </motion.div>
                    <h1 className="text-4xl md:text-6xl font-black text-slate-800 dark:text-white leading-tight">
                        أهلاً بك، <span className="text-indigo-600">{user?.name?.split(' ')[0]}</span>
                    </h1>
                    <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 font-bold max-w-xl">
                        كل أدواتك لإدارة أعمالك بنجاح في مكان واحد. اختر القسم الذي تريد البدء به.
                    </p>
                </div>

                {/* Clock Card */}
                <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl flex items-center gap-8 min-w-[300px]">
                    <div className="p-4 bg-indigo-600 rounded-3xl shadow-lg ring-4 ring-indigo-600/20">
                        <Clock size={32} />
                    </div>
                    <div>
                        <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1">
                            {currentTime.toLocaleDateString('ar-EG', { weekday: 'long' })}
                        </p>
                        <p className="text-3xl font-black">
                            {currentTime.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {gridItems.map((item) => (
                    <ModernDashboardItemWrapper key={item.id} item={item} t={t} />
                ))}
            </div>

            {gridItems.length === 0 && (
                <div className="p-20 text-center bg-white/50 dark:bg-slate-900/50 rounded-[4rem] border-2 border-dashed border-slate-200 dark:border-slate-800 backdrop-blur-xl">
                    <LayoutGrid size={64} className="mx-auto text-slate-200 dark:text-slate-800 mb-6" />
                    <p className="text-slate-400 font-bold text-xl">لا توجد عناصر مفعلة للوصول السريع.</p>
                    <Link to="/settings" className="text-indigo-600 font-black hover:underline mt-4 inline-block">انتقل للاعدادات للتخصيص</Link>
                </div>
            )}

            {/* Help & Support Footer */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl flex items-center justify-center">
                        <Sparkles size={24} />
                    </div>
                    <div>
                        <h4 className="text-lg font-black text-slate-800 dark:text-white">هل تحتاج للمساعدة؟</h4>
                        <p className="text-xs font-bold text-slate-500">فريق الدعم الفني متاح دائماً لخدمتك.</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <Link to="/faq" className="px-6 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-black text-slate-600 dark:text-slate-400 hover:bg-slate-100 transition-all">الأسئلة الشائعة</Link>
                    <Link to="/about" className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all">عن النظام</Link>
                </div>
            </div>
        </div>
    );
};

export default HomePage;

