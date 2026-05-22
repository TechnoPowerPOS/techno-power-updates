import React, { useState, useEffect } from 'react';
import { Store, ChevronRight, RefreshCw, Layers } from 'lucide-react';
import { getBranches, getCurrentBranchId, setCurrentBranchId, Branch } from '../../services/branchService';
import { useToasts } from '../../hooks/useToasts';

interface SidebarBranchSwitcherProps {
    isOpen: boolean;
}

const SidebarBranchSwitcher: React.FC<SidebarBranchSwitcherProps> = ({ isOpen }) => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [currentBranchId, setLocalCurrentBranchId] = useState<string>('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSwitching, setIsSwitching] = useState(false);
    const { addToast } = useToasts();

    useEffect(() => {
        setBranches(getBranches());
        setLocalCurrentBranchId(getCurrentBranchId());
    }, []);

    const currentBranch = branches.find(b => b.id === currentBranchId) || branches[0];

    const handleSwitch = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (id === currentBranchId) return;
        setIsSwitching(true);
        // We set the ID and reload immediately to avoid stale state issues between branches
        setCurrentBranchId(id);
        window.location.reload();
    };

    if (isSwitching) {
        return (
            <div className="fixed inset-0 z-[9999] bg-white/80 dark:bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center animate-fadeIn">
                <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-lg font-black text-slate-800 dark:text-white">جاري التبديل للفرع المختار...</p>
            </div>
        );
    }

    if (!isOpen) {
        return (
            <div className="relative group px-3 py-2 mt-2">
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center justify-center w-full h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/30"
                >
                    <Store size={20} />
                </button>
                {isMenuOpen && (
                    <div className="absolute end-full ms-2 top-0 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-2 z-50 animate-fadeIn">
                        <p className="text-[10px] font-black text-slate-400 px-3 py-2 uppercase tracking-widest border-b dark:border-slate-700 mb-1">تبديل الفرع</p>
                        {branches.map(b => (
                            <button
                                key={b.id}
                                onClick={(e) => handleSwitch(b.id, e)}
                                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${b.id === currentBranchId ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                            >
                                <Store size={14} />
                                {b.name}
                                {b.id === currentBranchId && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ms-auto"></span>}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="px-3 mt-4 mb-2 space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ms-3">الفرع الحالي</label>
            <div className="relative">
                <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center justify-between gap-3 w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-900/40 transition-all text-start group shadow-sm"
                >
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 bg-white dark:bg-slate-700 rounded-xl text-indigo-600 shadow-sm border border-slate-100 dark:border-slate-600">
                            <Store size={16} />
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-xs font-black text-slate-800 dark:text-white truncate leading-tight">{currentBranch?.name}</p>
                            <p className="text-[9px] font-bold text-slate-500 mt-0.5">تبديل المتجر</p>
                        </div>
                    </div>
                    <ChevronRight size={14} className={`text-slate-400 transition-transform ${isMenuOpen ? 'rotate-90' : 'rotate-180'}`} />
                </button>

                {isMenuOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 p-2 z-50 animate-slideDown overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
                        <div className="p-3 border-b dark:border-slate-700 mb-2 px-4 flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">اختر فرع للعمل عليه</span>
                            <Layers size={14} className="text-slate-300" />
                        </div>
                        {branches.map(b => (
                            <button
                                key={b.id}
                                onClick={(e) => handleSwitch(b.id, e)}
                                className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-xs font-bold transition-all ${b.id === currentBranchId ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                            >
                                <Store size={16} />
                                <span className="truncate">{b.name}</span>
                                {b.id === currentBranchId ? (
                                    <RefreshCw size={12} className="ms-auto opacity-70 animate-spin-slow" />
                                ) : (
                                    <span className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700 ms-auto"></span>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SidebarBranchSwitcher;
