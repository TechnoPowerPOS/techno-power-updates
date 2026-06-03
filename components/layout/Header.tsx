
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLicense } from '../../hooks/useLicense';
import { Bell, Sun, Moon, Search, ChevronDown, Settings as SettingsIcon, LayoutGrid, LogOut, Crown, Home, Menu, X } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import { useNotifications } from '../../hooks/useNotifications';
import { useTheme } from '../../hooks/useTheme';
import Tooltip from '../ui/Tooltip';
import GlobalSearchModal from '../search/GlobalSearchModal';
import NotificationsDropdown from './NotificationsDropdown';
import { useToasts } from '../../hooks/useToasts';
import { NAV_LINKS, NavLinkType } from '../../constants';
import { useTranslation } from '../../hooks/useTranslation';
import { getPlanLimits } from '../../utils/planPermissions';
import { getCurrentBranchId, getBranches } from '../../services/branchService';
import { useShift } from '../../hooks/useShift';
import { PlusCircle } from 'lucide-react';

interface HeaderProps {
  toggleSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { user, logout, switchUser } = useAuth();
  const { licenseInfo } = useLicense();
  const { settings, updateSettings } = useSettings();
  const { theme, toggleTheme } = useTheme();
  const { hasUnread, markAsRead } = useNotifications();
  const { addToast } = useToasts();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { currentShift } = useShift();

  const [globalLogo, setGlobalLogo] = useState<string | null>(null);
  useEffect(() => {
        const logo = localStorage.getItem('tp_global_logo');
        if (logo) setGlobalLogo(logo);
        const listenForLogo = () => {
            const upLogo = localStorage.getItem('tp_global_logo');
            setGlobalLogo(upLogo || null);
        };
        window.addEventListener('globalSettingsUpdated', listenForLogo);
        return () => window.removeEventListener('globalSettingsUpdated', listenForLogo);
  }, []);
  
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const flattenedLinks = useMemo(() => {
    const links: NavLinkType[] = [];
    NAV_LINKS.forEach(link => {
      if ('children' in link) {
          // @ts-ignore
          links.push(...link.children);
      } else {
          links.push(link as NavLinkType);
      }
    });
    return links;
  }, []);

  const currentLink = flattenedLinks.find(link => link.href === pathname);
  
  const [openTabsIds, setOpenTabsIds] = useState<string[]>(() => {
    try {
        const saved = localStorage.getItem('pos_open_tabs');
        if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  useEffect(() => {
    if (currentLink && currentLink.id !== 'home') {
        setOpenTabsIds(prev => {
            if (!prev.includes(currentLink.id)) {
                const updated = [...prev, currentLink.id];
                localStorage.setItem('pos_open_tabs', JSON.stringify(updated));
                return updated;
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
    localStorage.setItem('pos_open_tabs', JSON.stringify(updated));
    
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
    localStorage.setItem('pos_open_tabs', JSON.stringify([]));
    navigate('/');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
            setUserDropdownOpen(false);
        }
        if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
            setNotificationsOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleNotifications = () => {
    if (!notificationsOpen) markAsRead();
    setNotificationsOpen(!notificationsOpen);
  };

  return (
    <>
    <div className="fixed top-0 left-0 right-0 z-[160] flex justify-center p-4 md:p-6 pointer-events-none">
        <header 
            ref={headerRef} 
            className="w-full max-w-7xl h-16 glass-panel rounded-full flex items-center justify-between px-6 shadow-premium pointer-events-auto border-white/60 dark:border-white/10"
        >
            <div className="flex items-center gap-4">
                {toggleSidebar && (
                    <button 
                        onClick={toggleSidebar}
                        className={`p-2 -ml-2 rounded-full text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all ${settings?.enableSidebar ? '' : 'lg:hidden'}`}
                    >
                        <Menu size={24} />
                    </button>
                )}
                <Link to="/" className="flex items-center gap-3 group">
                    {(globalLogo || settings?.logoUrl) ? (
                         <div className="w-10 h-10 rounded-2xl overflow-hidden bg-white/50 dark:bg-slate-800/50 flex items-center justify-center shadow-sm">
                             <img src={globalLogo || settings!.logoUrl} alt="Store Logo" className="w-full h-full object-contain p-1" />
                         </div>
                    ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:rotate-12 transition-transform">
                            <span className="text-2xl font-black">⚡</span>
                        </div>
                    )}
                    <div className="hidden sm:block">
                        <h1 className="text-lg font-black text-slate-800 dark:text-white leading-none flex items-center gap-2">
                            {settings?.storeName || 'Techno Power'}
                            {getPlanLimits(licenseInfo?.type || 'Free').maxBranches > 1 && (
                                <span className="bg-indigo-100 text-indigo-800 text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap">
                                    {getBranches().find(b => b.id === getCurrentBranchId())?.name || 'الفرع'}
                                </span>
                            )}
                        </h1>
                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest opacity-80">
                            v1.18.0
                        </span>
                    </div>
                </Link>
                
                <Tooltip text="الرئيسية">
                    <Link to="/" className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95">
                        <Home size={20} />
                    </Link>
                </Tooltip>
            </div>

            <div className="flex-1 mx-4 hidden md:flex items-center gap-4 justify-between">
                
                {/* Search Bar */}
                <div className="flex-1 max-w-sm">
                    <button 
                        onClick={() => setIsSearchOpen(true)}
                        className="w-full flex items-center gap-3 px-5 py-2.5 bg-slate-100/50 dark:bg-slate-800/50 border border-transparent rounded-full text-slate-500 text-sm hover:bg-white dark:hover:bg-slate-800 hover:shadow-inner transition-all group"
                    >
                        <Search size={18} className="group-hover:text-indigo-500 transition-colors" />
                        <span className="font-medium">بحث سريع...</span>
                    </button>
                </div>

                {/* Open Tabs */}
                {settings?.enableHeaderTabs !== false && (
                <div className="hidden lg:flex items-center gap-2 overflow-x-auto custom-scrollbar flex-nowrap max-w-xl pb-1 fade-mask-right">
                    {openTabsIds.map(id => {
                        const link = flattenedLinks.find(l => l.id === id);
                        if (!link) return null;
                        const Icon = link.icon;
                        const isActive = currentLink?.id === id;
                        const isManyTabs = openTabsIds.length > 5;
                        return (
                            <Link 
                                key={id} 
                                to={link.href} 
                                title={t(link.t_key)}
                                className={`group flex items-center gap-2 px-3 py-1.5 rounded-full transition-all shrink-0 border ${isActive ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'}`}
                            >
                                <Icon size={14} className={isActive ? 'text-indigo-600 dark:text-indigo-400' : ''} />
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
                                    className={`p-0.5 rounded-full transition-all ${isActive ? 'hover:bg-indigo-200/50 dark:hover:bg-indigo-800' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                >
                                    <X size={12} className="opacity-70 group-hover:opacity-100" />
                                </button>
                            </Link>
                        );
                    })}
                    {openTabsIds.length > 1 && (
                        <button
                            onClick={handleCloseAllTabs}
                            className="flex items-center gap-1 px-2.5 py-1 shrink-0 rounded-full transition-all bg-rose-50 border border-rose-100 dark:bg-rose-900/20 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40"
                            title="إغلاق جميع التبويبات"
                        >
                            <X size={12} strokeWidth={3} />
                            <span className="text-[10px] font-bold whitespace-nowrap">إغلاق الكل</span>
                        </button>
                    )}
                </div>
                )}
            </div>

            <div className="flex items-center gap-1 md:gap-3">
                {settings?.enableShiftManagement && !currentShift && (
                    <button 
                        onClick={() => navigate('/pos')} 
                        className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-xs font-black hover:bg-emerald-200 transition-all border border-emerald-200 animate-pulse"
                    >
                        <PlusCircle size={14} /> فتح وردية جديدة
                    </button>
                )}

                {licenseInfo?.status !== 'LICENSED' && (
                    <Link to="/pricing" className="hidden lg:flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-full text-xs font-black hover:bg-amber-200 transition-all">
                        <Crown size={14} /> ترقية الاشتراك
                    </Link>
                )}

                <div className="flex items-center gap-1 bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-full border dark:border-slate-700/50">
                    {getPlanLimits(licenseInfo?.type || 'Free').hasNotifications && (
                        <div className="relative" ref={notificationsRef}>
                            <Tooltip text="الإشعارات">
                                <button onClick={handleToggleNotifications} className="p-2 rounded-full text-slate-500 hover:bg-white dark:hover:bg-slate-700 relative transition-all">
                                    <Bell size={20} />
                                    {hasUnread && <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse"></span>}
                                </button>
                            </Tooltip>
                            {notificationsOpen && <NotificationsDropdown />}
                        </div>
                    )}
                    
                    <Tooltip text={theme === 'dark' ? 'الوضع المضيء' : 'الوضع المظلم'}>
                        <button onClick={toggleTheme} className="p-2 rounded-full text-slate-500 hover:bg-white dark:hover:bg-slate-700 transition-all">
                            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                    </Tooltip>
                </div>

                {user && (
                    <div className="relative">
                        <button 
                            onClick={() => setUserDropdownOpen(!userDropdownOpen)} 
                            className="flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                        >
                            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-sm">
                                {user.name?.charAt(0) || 'U'}
                            </div>
                            <ChevronDown size={14} className={`text-slate-400 hidden sm:block transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {userDropdownOpen && (
                            <div className="absolute end-0 top-full mt-3 w-64 glass-panel rounded-3xl shadow-premium py-3 animate-slide-up origin-top-right z-[70] overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                                    <p className="text-sm font-black text-slate-800 dark:text-white truncate">{user.name}</p>
                                    <p className="text-[10px] font-bold text-indigo-500 uppercase mt-0.5">مدير النظام</p>
                                </div>
                                <div className="p-2 space-y-1">
                                    <button onClick={() => {navigate('/settings'); setUserDropdownOpen(false);}} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-2xl font-bold transition-all">
                                        <SettingsIcon size={16} /> الإعدادات
                                    </button>
                                    {licenseInfo?.status !== 'LICENSED' && (
                                        <button onClick={() => {navigate('/pricing'); setUserDropdownOpen(false);}} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-amber-600 hover:bg-amber-50 rounded-2xl font-bold transition-all">
                                            <Crown size={16} /> خطط الأسعار
                                        </button>
                                    )}
                                </div>
                                <div className="p-2 mt-1 border-t border-slate-100 dark:border-slate-800">
                                    <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-rose-600 hover:bg-rose-50 rounded-2xl font-black transition-all">
                                        <LogOut size={16} /> تسجيل الخروج
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </header>
    </div>
    <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};

export default Header;
