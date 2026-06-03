import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';
import { useLicense } from '../../hooks/useLicense';
import { useSettings } from '../../hooks/useSettings';
import SplashScreen from './SplashScreen';
import ToastContainer from '../ui/ToastContainer';
import { Menu, Search, Bell, Settings as SettingsIcon, LogOut, ChevronDown, Sun, Moon, X, Home, PlusCircle } from 'lucide-react';
import { NAV_LINKS, NavLinkType, NavLinkGroup } from '../../constants';
import { useTranslation } from '../../hooks/useTranslation';
import { getPlanLimits } from '../../utils/planPermissions';
import Tooltip from '../ui/Tooltip';
import GlobalSearchModal from '../search/GlobalSearchModal';
import NotificationsDropdown from './NotificationsDropdown';
import SidebarBranchSwitcher from './SidebarBranchSwitcher';
import { useNotifications } from '../../hooks/useNotifications';
import { useTheme } from '../../hooks/useTheme';
import { useShift } from '../../hooks/useShift';
import { GlobalSettings } from '../../types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { handleFirestoreError, OperationType } from '../../services/firestoreErrorHandler';

interface ModernLayoutProps {
    layoutType?: 'modern' | 'ultra' | string;
}

const ModernLayout: React.FC<ModernLayoutProps> = ({ layoutType = 'modern' }) => {
    const { user, isLoading: authLoading, logout, userHasPermission } = useAuth();
    const { isLicensed, isLoading: licenseLoading, licenseType } = useLicense();
    const { settings } = useSettings();
    const { currentShift } = useShift();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [userDropdownOpen, setUserDropdownOpen] = useState(false);
    const { hasUnread, markAsRead } = useNotifications();
    const { theme, toggleTheme } = useTheme();
    const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);

    useEffect(() => {
        const loadGlobals = async () => {
            const path = 'adminSettings/globalAdmin';
            try {
                const snap = await getDoc(doc(db, 'adminSettings', 'globalAdmin'));
                if (snap.exists()) setGlobalSettings(snap.data() as GlobalSettings);
            } catch (e) {
                handleFirestoreError(e, OperationType.GET, path);
            }
        };
        loadGlobals();
        
        const handleUpdate = () => loadGlobals();
        window.addEventListener('adminGlobalUpdated', handleUpdate);
        return () => window.removeEventListener('adminGlobalUpdated', handleUpdate);
    }, []);

    const hiddenModules = globalSettings?.hiddenModules || [];
    const planLimits = getPlanLimits(licenseType);
    
    // Filter and Sort Nav Links
    let filteredNavLinks = NAV_LINKS.filter(link => {
        // First filter by hidden modules in settings
        if (hiddenModules.includes(link.id)) return false;
        
        // Filter by user permissions
        if (link.permission && !userHasPermission(link.permission as any)) return false;
        
        if (link.id === 'sales_crm') {
             // Let the category be visible, but filter its children based on permissions/limits
             return true;
        }

        // Then filter by plan limits
        if (link.planKey && !planLimits[link.planKey]) return false;
        
        return true;
    }).map(link => {
        if ('children' in link) {
            return {
                ...link,
                children: link.children.filter(child => {
                    if (hiddenModules.includes(child.id)) return false;
                    
                    // Filter by user permissions
                    if (child.permission && !userHasPermission(child.permission as any)) return false;
                    
                    if (child.id === 'crm' && planLimits.maxCustomers <= 50) return false;
                    
                    // Filter children by plan limits
                    if (child.planKey && !planLimits[child.planKey]) return false;
                    
                    return true;
                }).sort((a,b) => {
                    const order = globalSettings?.moduleOrder || [];
                    const aIdx = order.indexOf(a.id);
                    const bIdx = order.indexOf(b.id);
                    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
                    if (aIdx !== -1) return -1;
                    if (bIdx !== -1) return 1;
                    return 0;
                })
            } as NavLinkGroup;
        }
        return link;
    });

    if (globalSettings?.moduleOrder) {
        const order = globalSettings.moduleOrder;
        filteredNavLinks.sort((a, b) => {
            const aIdx = order.indexOf(a.id);
            const bIdx = order.indexOf(b.id);
            if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
            if (aIdx !== -1) return -1;
            if (bIdx !== -1) return 1;
            return 0;
        });
    }

    filteredNavLinks = filteredNavLinks.filter(link => {
        if ('children' in link) return link.children.length > 0;
        return true;
    });

    // Sidebar Tabs Logic
    const [openTabsIds, setOpenTabsIds] = useState<string[]>([]);
    
    // Initial fetch from localStorage
    useEffect(() => {
        if (user?.id) {
            try {
                const saved = localStorage.getItem(`pos_open_tabs_${user.id}`);
                if (saved) setOpenTabsIds(JSON.parse(saved));
            } catch {}
        }
    }, [user?.id]);

    const flattenedLinks: NavLinkType[] = [];
    filteredNavLinks.forEach(link => {
        if ('children' in link) {
            flattenedLinks.push(...(link.children as any));
        } else {
            flattenedLinks.push(link as NavLinkType);
        }
    });

    useEffect(() => {
        if (user?.id && openTabsIds.length > 0) {
            localStorage.setItem(`pos_open_tabs_${user.id}`, JSON.stringify(openTabsIds));
        } else if (user?.id && openTabsIds.length === 0) {
            localStorage.setItem(`pos_open_tabs_${user.id}`, JSON.stringify([]));
        }
    }, [openTabsIds, user?.id]);

    const isSidebarEnabled = settings?.enableSidebar ?? false;

    // Sidebar Sorting Logic based on user preferences
    const [sortedLinks, setSortedLinks] = useState<NavLinkType[]>([]);
    
    useEffect(() => {
        if (isSidebarEnabled) {
            setIsSidebarOpen(false);
        }
    }, [isSidebarEnabled]);

    useEffect(() => {
        const loadSettings = () => {
            try {
                const savedOrder = user?.id ? localStorage.getItem(`pos_sidebar_order_${user.id}`) : null;
                const savedHidden = user?.id ? localStorage.getItem(`pos_sidebar_hidden_groups_${user.id}`) : null;
                
                let navLinksToProcess = [...filteredNavLinks];
                let hiddenGroups: string[] = [];
                
                if (savedHidden) {
                    hiddenGroups = JSON.parse(savedHidden);
                }

                // Filter out hidden groups/items
                navLinksToProcess = navLinksToProcess.filter(link => !hiddenGroups.includes(link.id));

                // Apply order
                if (savedOrder) {
                    const orderedIds: string[] = JSON.parse(savedOrder);
                    navLinksToProcess.sort((a, b) => {
                        const indexA = orderedIds.indexOf(a.id);
                        const indexB = orderedIds.indexOf(b.id);
                        if (indexA === -1 && indexB === -1) return 0;
                        if (indexA === -1) return 1;
                        if (indexB === -1) return -1;
                        return indexA - indexB;
                    });
                }

                // Flatten the final sorted and filtered links
                const finalFlattened: NavLinkType[] = [];
                navLinksToProcess.forEach(link => {
                    if ('children' in link) {
                        finalFlattened.push(...(link.children as NavLinkType[]));
                    } else {
                        finalFlattened.push(link as NavLinkType);
                    }
                });

                setSortedLinks(finalFlattened);
            } catch (err) {
                console.error('Error loading sidebar settings', err);
                setSortedLinks(flattenedLinks);
            }
        };

        loadSettings();
        window.addEventListener('sidebar_updated', loadSettings);
        return () => window.removeEventListener('sidebar_updated', loadSettings);
    }, [pathname, globalSettings, user?.id, filteredNavLinks.length]); 

    const currentLink = flattenedLinks.find(link => link.href === pathname);

    useEffect(() => {
        if (currentLink && currentLink.id !== 'home') {
            setOpenTabsIds(prev => {
                if (!prev.includes(currentLink.id)) {
                    return [...prev, currentLink.id];
                }
                return prev;
            });
        }
    }, [currentLink]);

    const handleCloseTab = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const updated = openTabsIds.filter(t => t !== id);
        setOpenTabsIds(updated);
        
        if (currentLink?.id === id) {
            const lastTabId = updated[updated.length - 1];
            if (lastTabId) {
                const link = flattenedLinks.find(l => l.id === lastTabId);
                if (link) navigate(link.href);
                else navigate('/');
            } else {
                navigate('/');
            }
        }
    };

    const handleCloseAllTabs = () => {
        setOpenTabsIds([]);
        navigate('/');
    };

    if (authLoading || licenseLoading) return <SplashScreen />;
    if (!user) return <Navigate to="/login" replace />;

    const isUltra = layoutType === 'ultra';
    const isManyTabs = openTabsIds.length > 5;

    return (
        <div className={`flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 overflow-hidden font-sans`} dir="rtl">
            {/* Overlay for sidebar when it's in drawer mode */}
            {isSidebarEnabled && isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 animate-fadeIn"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`transition-all duration-300 flex flex-col z-40 bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 ${isSidebarEnabled ? (isSidebarOpen ? 'fixed inset-y-0 right-0 w-72 shadow-2xl' : 'fixed inset-y-0 -right-72 w-72') : (isSidebarOpen ? 'w-64' : 'w-20')} ${isUltra ? 'shadow-[4px_0_24px_rgba(0,0,0,0.02)] border-transparent' : ''}`}>
                <div className={`flex items-center justify-between px-4 shrink-0 h-16 ${isUltra ? '' : 'border-b border-slate-200 dark:border-slate-800'}`}>
                    {(isSidebarOpen || isSidebarEnabled) && (
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className={`w-9 h-9 flex items-center justify-center text-white shrink-0 rounded-xl shadow-lg ${isUltra ? 'bg-blue-600' : 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}>
                                <span className="font-black text-sm">⚡</span>
                            </div>
                            <span className="font-black text-slate-800 dark:text-white truncate tracking-tight">{settings?.storeName || 'Techno'}</span>
                        </div>
                    )}
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`p-2.5 rounded-xl text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800`}>
                        {isSidebarEnabled ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1.5 mt-2">
                    {sortedLinks.map(link => {
                        const Icon = link.icon;
                        if (link.id === 'pos') {
                            return (
                                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} key={link.id} className="mb-6">
                                    <Link 
                                        to={link.href} 
                                        onClick={() => isSidebarEnabled && setIsSidebarOpen(false)}
                                        className={`flex items-center gap-3 px-3 py-3 rounded-2xl transition-all shadow-sm group ${isUltra ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/25 hover:shadow-blue-500/40' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/20'}`}
                                    >
                                        <Icon size={20} className="shrink-0" />
                                        {(isSidebarOpen || isSidebarEnabled) && <span className="font-bold text-sm truncate">{t(link.t_key)}</span>}
                                    </Link>
                                </motion.div>
                            );
                        }
                        return (
                            <React.Fragment key={link.id}>
                                <NavLink
                                    to={link.href}
                                    title={(!isSidebarOpen && !isSidebarEnabled) ? t(link.t_key) : undefined}
                                    onClick={() => isSidebarEnabled && setIsSidebarOpen(false)}
                                    className={({ isActive }) => 
                                        `flex items-center gap-3 px-3 py-2.5 transition-all font-bold tracking-wide text-sm rounded-2xl ${
                                            isActive 
                                                ? (isUltra ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400')
                                                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
                                        }`
                                    }
                                >
                                    <Icon size={20} className="shrink-0" />
                                    {(isSidebarOpen || isSidebarEnabled) && <span className="truncate">{t(link.t_key)}</span>}
                                </NavLink>
                                {link.id === 'settings' && (
                                    <SidebarBranchSwitcher isOpen={isSidebarOpen || isSidebarEnabled} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </aside>

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col min-w-0 bg-transparent`}>
                {/* Topbar */}
                <header className={`flex items-center justify-between shrink-0 relative z-[150] px-4 md:px-8 bg-white dark:bg-slate-950 flex-col md:flex-row shadow-[0_4px_24px_rgba(0,0,0,0.02)] border-b border-slate-100 dark:border-slate-800/50 py-3 md:py-0 md:h-20 gap-3 md:gap-0`}>
                    
                    {/* Left/Right Container for Search & Tabs */}
                    <div className="flex items-center flex-1 w-full gap-4 overflow-hidden">
                        <div className="flex items-center gap-2 shrink-0">
                            {isSidebarEnabled && (
                                <button 
                                    onClick={() => setIsSidebarOpen(true)}
                                    className={`p-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors`}
                                >
                                    <Menu size={24} />
                                </button>
                            )}
                            <Tooltip text="الرئيسية">
                                <Link 
                                    to="/" 
                                    className={`p-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors`}
                                >
                                    <Home size={22} />
                                </Link>
                            </Tooltip>
                        </div>
                        
                        <div className={`flex items-center text-slate-500 shrink-0 border border-transparent transition-all shadow-sm ${isUltra ? 'bg-slate-50 dark:bg-slate-900 rounded-full px-5 py-3 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10' : 'bg-slate-100 dark:bg-slate-900/50 rounded-2xl px-4 py-2.5 focus-within:border-indigo-500 focus-within:bg-white dark:focus-within:bg-slate-950'}`}>
                            <Search size={18} className={`me-3 ${isUltra ? 'text-slate-400' : 'opacity-50'}`} />
                            <input 
                                type="text" 
                                placeholder="البحث السريع..." 
                                className="bg-transparent border-none outline-none w-32 md:w-48 text-sm font-bold placeholder-slate-400"
                                onClick={() => setIsSearchOpen(true)}
                                readOnly
                            />
                        </div>

                        {/* Open Tabs */}
                        {settings?.enableHeaderTabs !== false && openTabsIds.length > 0 && (
                            <div className="hidden md:flex items-center gap-2 overflow-x-auto custom-scrollbar flex-nowrap pb-1 fade-mask-right w-full">
                                {openTabsIds.map(id => {
                                    const link = flattenedLinks.find(l => l.id === id);
                                    if (!link) return null;
                                    const Icon = link.icon;
                                    const isActive = currentLink?.id === id;
                                    return (
                                        <Link 
                                            key={id} 
                                            to={link.href} 
                                            title={t(link.t_key)}
                                            className={`group flex items-center gap-2 shrink-0 transition-all border ${
                                                isUltra ? 'rounded-full' : 'rounded-xl'
                                            } ${
                                                isActive 
                                                    ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800 text-blue-700 dark:text-blue-300 shadow-sm' 
                                                    : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
                                            } ${isManyTabs ? 'px-3 py-2' : 'px-4 py-2'}`}
                                        >
                                            <Icon size={16} className={isActive ? 'text-blue-600 dark:text-blue-400' : ''} />
                                            {(!isManyTabs || isActive) ? (
                                                <span className="text-xs font-bold whitespace-nowrap max-w-[120px] truncate">
                                                    {t(link.t_key)}
                                                </span>
                                            ) : (
                                                <span className="text-xs font-bold whitespace-nowrap max-w-0 overflow-hidden opacity-0 group-hover:max-w-[120px] group-hover:opacity-100 group-hover:ms-2 transition-all duration-300">
                                                    {t(link.t_key)}
                                                </span>
                                            )}
                                            <button 
                                                onClick={(e) => handleCloseTab(id, e)}
                                                className={`p-0.5 rounded-full transition-all ms-1 ${isActive ? 'hover:bg-blue-200/50 dark:hover:bg-blue-800' : 'hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                                            >
                                                <X size={12} className="opacity-70 group-hover:opacity-100" />
                                            </button>
                                        </Link>
                                    );
                                })}
                                {openTabsIds.length > 1 && (
                                    <button
                                        onClick={handleCloseAllTabs}
                                        className={`flex items-center gap-1 px-2.5 py-1 shrink-0 transition-all bg-rose-50 border border-rose-100 dark:bg-rose-900/20 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 ${isUltra ? 'rounded-full' : 'rounded-lg'}`}
                                        title="إغلاق جميع التبويبات"
                                    >
                                        <X size={12} strokeWidth={3} />
                                        <span className="text-[10px] font-bold whitespace-nowrap">إغلاق الكل</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2 md:gap-4 shrink-0 mt-3 md:mt-0">
                        {settings?.enableShiftManagement && !currentShift && (
                            <button 
                                onClick={() => navigate('/pos')} 
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-full text-xs font-black hover:bg-emerald-200 dark:hover:bg-emerald-900/40 transition-all border border-emerald-200 dark:border-emerald-900 animate-pulse-slow shadow-sm"
                            >
                                <PlusCircle size={14} /> فتح وردية جديدة 🔓
                            </button>
                        )}

                        <Tooltip text={theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}>
                            <button onClick={toggleTheme} className={`p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors ${isUltra ? 'rounded-full' : 'rounded-xl'}`}>
                                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                            </button>
                        </Tooltip>

                        <div className="relative border-l border-slate-200 dark:border-slate-800 ltr:border-l-0 ltr:border-r pl-4" dir="rtl">
                            <button 
                                onClick={() => { setNotificationsOpen(!notificationsOpen); markAsRead(); }}
                                className={`p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors relative ${isUltra ? 'rounded-full' : 'rounded-xl'}`}
                            >
                                <Bell size={20} />
                                {hasUnread && <span className={`absolute bg-rose-500 rounded-full border-2 border-white dark:border-slate-950 ${isUltra ? 'top-2 right-2.5 w-2.5 h-2.5' : 'top-2 right-2 w-2.5 h-2.5'}`}></span>}
                            </button>
                            {notificationsOpen && (
                                <div className="absolute left-0 mt-2">
                                    <NotificationsDropdown onClose={() => setNotificationsOpen(false)} />
                                </div>
                            )}
                        </div>

                        <div className="relative">
                            <button 
                                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                                className={`flex items-center gap-3 p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all shadow-sm ${isUltra ? 'rounded-full pr-4' : 'rounded-2xl pr-4'}`}
                            >
                                <div className="hidden md:block text-start">
                                    <p className="text-sm font-black text-slate-800 dark:text-white capitalize leading-tight">{user.name}</p>
                                    <p className="text-[10px] font-bold text-slate-500 capitalize">{user.role}</p>
                                </div>
                                <div className={`w-9 h-9 flex items-center justify-center font-black text-lg ${isUltra ? 'bg-blue-100 text-blue-600 rounded-full' : 'bg-indigo-100 text-indigo-600 rounded-xl'}`}>
                                    {user.name?.charAt(0).toUpperCase()}
                                </div>
                                <ChevronDown size={14} className="text-slate-400 ms-1 hidden md:block" />
                            </button>

                            {userDropdownOpen && (
                                <div className="absolute left-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50 animate-fadeIn">
                                    <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                                        <p className="font-black text-sm text-slate-800 dark:text-white truncate">{user.name}</p>
                                        <p className="text-xs font-bold text-slate-500 truncate mt-1">{user.email}</p>
                                    </div>
                                    <div className="p-3 space-y-1">
                                        <Link to="/settings" onClick={() => setUserDropdownOpen(false)} className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl transition-colors font-bold">
                                            <SettingsIcon size={18} /> الإعدادات
                                        </Link>
                                        <button onClick={() => { setUserDropdownOpen(false); logout(); }} className="flex items-center gap-3 w-full px-4 py-3 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl transition-colors font-bold">
                                            <LogOut size={18} /> تسجيل الخروج
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className={`flex-1 overflow-x-hidden overflow-y-auto scroll-smooth ${isUltra ? 'bg-slate-50/50 dark:bg-slate-900 flex flex-col' : 'bg-slate-50 dark:bg-slate-950/20 flex flex-col'}`}>
                    <div className={`max-w-[2000px] w-full mx-auto flex-1 ${isUltra ? 'p-6 md:p-8' : 'p-4 md:p-6 lg:p-8'}`}>
                        <Outlet />
                    </div>
                </main>
            </div>
            
            <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
            <ToastContainer />
        </div>
    );
};

export default ModernLayout;

