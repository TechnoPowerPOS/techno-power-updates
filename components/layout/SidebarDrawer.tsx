import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSettings } from '../../hooks/useSettings';
import { useAuth } from '../../hooks/useAuth';
import { X } from 'lucide-react';
import { NAV_LINKS, NavLinkType } from '../../constants';
import { useTranslation } from '../../hooks/useTranslation';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const SidebarDrawer: React.FC<SidebarDrawerProps> = ({ isOpen, onClose }) => {
    const { settings } = useSettings();
    const { userHasPermission } = useAuth();
    const { t } = useTranslation();
    
    if (!settings?.enableSidebar) return null;

    const navGroups = NAV_LINKS.reduce<{category: string, links: NavLinkType[]}[]>((acc, item) => {
        if ('children' in item) {
            acc.push({
                category: item.t_key, // We'll translate this in the render
                links: item.children.filter(link => {
                    if (settings?.homeGridItems && !settings.homeGridItems.includes(link.id)) return false;
                    if (link.permission) return userHasPermission(link.permission as any);
                    return true;
                })
            });
        } else {
            // direct link, put it in a "General" category or find existing
            if (settings?.homeGridItems && !settings.homeGridItems.includes(item.id)) return acc;
            if (item.permission && !userHasPermission(item.permission as any)) return acc;
            
            let generalGroup = acc.find(g => g.category === 'nav.general');
            if (!generalGroup) {
                generalGroup = { category: 'nav.general', links: [] };
                acc.unshift(generalGroup);
            }
            generalGroup.links.push(item as NavLinkType);
        }
        return acc;
    }, []).filter(cat => cat.links.length > 0);

    return (
        <>
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[90] transition-opacity"
                    onClick={onClose}
                />
            )}
            <aside 
                className={`fixed top-0 right-0 h-full bg-white dark:bg-slate-900 shadow-2xl z-[100] w-72 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                <div className="flex items-center justify-between p-6 border-b dark:border-slate-800 border-slate-100">
                    <h2 className="font-black text-xl text-slate-800 dark:text-white uppercase tracking-wider">{t('nav.dashboard')}</h2>
                    <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 space-y-8 overflow-y-auto max-h-[calc(100vh-80px)] custom-scrollbar">
                    {navGroups.map(category => (
                        <div key={category.category}>
                            <h3 className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 mb-4 tracking-wider">{t(category.category)}</h3>
                            <div className="space-y-1">
                                {category.links.map(link => {
                                    const Icon = link.icon;
                                    return (
                                        <NavLink
                                            key={link.id}
                                            to={link.href}
                                            onClick={onClose}
                                            className={({ isActive }) => 
                                                `flex items-center gap-3 px-4 py-3 rounded-2xl transition-all capitalize font-bold text-sm ${
                                                    isActive 
                                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' 
                                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                                                }`
                                            }
                                        >
                                            <Icon size={18} className={link.color} />
                                            <span>{t(link.t_key)}</span>
                                        </NavLink>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </aside>
        </>
    );
};

export default SidebarDrawer;
