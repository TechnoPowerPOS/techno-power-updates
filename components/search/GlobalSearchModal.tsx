
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/mockApi';
import type { GlobalSearchResults } from '../../types';
import { Search, Package, User, FileText, CornerDownLeft, Truck, Building, Briefcase, Banknote, RefreshCcw, RefreshCw, ArrowRightLeft } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';

interface GlobalSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<GlobalSearchResults | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const debouncedQuery = useDebounce(query, 300);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            setQuery('');
            setResults(null);
        }
    }, [isOpen]);
    
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    useEffect(() => {
        const search = async () => {
            if (debouncedQuery.trim().length > 1) {
                setIsLoading(true);
                const searchResults = await api.globalSearch(debouncedQuery);
                setResults(searchResults);
                setIsLoading(false);
            } else {
                setResults(null);
            }
        };
        search();
    }, [debouncedQuery]);

    const handleNavigate = (path: string) => {
        navigate(path);
        onClose();
    };

    if (!isOpen) return null;
    
    const hasResults = results && Object.values(results).some((arr: any) => arr.length > 0);

    return (
        <div className="fixed inset-0 z-50 flex justify-center items-start pt-20 bg-black/70 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
            <div 
                className="relative w-full max-w-3xl bg-white dark:bg-slate-800 rounded-xl shadow-2xl border dark:border-slate-700 animate-slideDown"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center gap-3 p-4 border-b dark:border-slate-700">
                    <Search className="text-slate-400" size={22} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="ابحث عن منتج، عميل، فاتورة، مورد، شريك..."
                        className="w-full bg-transparent focus:outline-none text-lg text-slate-800 dark:text-slate-200"
                    />
                     <button onClick={onClose} className="text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded-md px-2 py-1 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600">ESC</button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {isLoading && <p className="p-6 text-center text-slate-500">جاري البحث...</p>}
                    {!isLoading && debouncedQuery && !hasResults && <p className="p-6 text-center text-slate-500">لم يتم العثور على نتائج لـ "{debouncedQuery}"</p>}
                    {!isLoading && !debouncedQuery && <p className="p-6 text-center text-slate-500">ابدأ بالكتابة للبحث في النظام.</p>}

                    {!isLoading && hasResults && results && (
                        <div className="p-2 space-y-4">
                            {results.products.length > 0 && (
                                <div className="p-2">
                                    <h3 className="text-xs font-semibold uppercase text-slate-400 px-3 mb-2 flex items-center gap-2"><Package size={14}/> المنتجات</h3>
                                    <ul>
                                        {results.products.map(p => (
                                            <li key={p.id} onClick={() => handleNavigate('/products')} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                                                <span>{p.name}</span>
                                                <span className="ms-auto text-xs text-slate-400">SKU: {p.sku}</span>
                                                <CornerDownLeft size={16} className="text-slate-400" />
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            
                            {results.sales.length > 0 && (
                                <div className="p-2 border-t dark:border-slate-700">
                                    <h3 className="text-xs font-semibold uppercase text-slate-400 px-3 mb-2 mt-2 flex items-center gap-2"><FileText size={14}/> فواتير المبيعات</h3>
                                    <ul>
                                        {results.sales.map(s => (
                                            <li key={s.id} onClick={() => handleNavigate('/sales')} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                                                <span className="font-mono">{s.id.toUpperCase()}</span>
                                                <span className="text-xs text-slate-500">({s.customer.name})</span>
                                                <span className="ms-auto text-xs text-slate-400">مبيعات</span>
                                                 <CornerDownLeft size={16} className="text-slate-400" />
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {results.customers.length > 0 && (
                                <div className="p-2 border-t dark:border-slate-700">
                                    <h3 className="text-xs font-semibold uppercase text-slate-400 px-3 mb-2 mt-2 flex items-center gap-2"><User size={14}/> العملاء</h3>
                                    <ul>
                                        {results.customers.map(c => (
                                            <li key={c.id} onClick={() => handleNavigate('/customers')} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                                                <span>{c.name}</span>
                                                <span className="ms-auto text-xs text-slate-400">{c.phone}</span>
                                                <CornerDownLeft size={16} className="text-slate-400" />
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {results.purchases.length > 0 && (
                                <div className="p-2 border-t dark:border-slate-700">
                                    <h3 className="text-xs font-semibold uppercase text-slate-400 px-3 mb-2 mt-2 flex items-center gap-2"><Truck size={14}/> المشتريات</h3>
                                    <ul>
                                        {results.purchases.map(p => (
                                            <li key={p.id} onClick={() => handleNavigate('/purchases')} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                                                <span className="font-mono">{p.id.toUpperCase()}</span>
                                                <span className="text-xs text-slate-500">({p.supplier.name})</span>
                                                <CornerDownLeft size={16} className="text-slate-400" />
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {results.suppliers.length > 0 && (
                                <div className="p-2 border-t dark:border-slate-700">
                                    <h3 className="text-xs font-semibold uppercase text-slate-400 px-3 mb-2 mt-2 flex items-center gap-2"><Building size={14}/> الموردين</h3>
                                    <ul>
                                        {results.suppliers.map(s => (
                                            <li key={s.id} onClick={() => handleNavigate('/suppliers')} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                                                <span>{s.name}</span>
                                                <span className="ms-auto text-xs text-slate-400">{s.phone}</span>
                                                <CornerDownLeft size={16} className="text-slate-400" />
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {results.partners.length > 0 && (
                                <div className="p-2 border-t dark:border-slate-700">
                                    <h3 className="text-xs font-semibold uppercase text-slate-400 px-3 mb-2 mt-2 flex items-center gap-2"><Briefcase size={14}/> الشركاء</h3>
                                    <ul>
                                        {results.partners.map(p => (
                                            <li key={p.id} onClick={() => handleNavigate('/partners')} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                                                <span>{p.name}</span>
                                                <span className="ms-auto text-xs text-slate-400">{p.sharePercentage}%</span>
                                                <CornerDownLeft size={16} className="text-slate-400" />
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {(results.salesReturns.length > 0 || results.purchaseReturns.length > 0) && (
                                <div className="p-2 border-t dark:border-slate-700">
                                    <h3 className="text-xs font-semibold uppercase text-slate-400 px-3 mb-2 mt-2 flex items-center gap-2"><RefreshCcw size={14}/> المرتجعات</h3>
                                    <ul>
                                        {results.salesReturns.map(r => (
                                            <li key={r.id} onClick={() => handleNavigate('/sales-returns')} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                                                <span className="font-mono">{r.id.toUpperCase()}</span>
                                                <span className="text-xs text-red-500 font-bold">م. مبيعات</span>
                                                <CornerDownLeft size={16} className="text-slate-400" />
                                            </li>
                                        ))}
                                        {results.purchaseReturns.map(r => (
                                            <li key={r.id} onClick={() => handleNavigate('/purchase-returns')} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                                                <span className="font-mono">{r.id.toUpperCase()}</span>
                                                <span className="text-xs text-green-500 font-bold">م. مشتريات</span>
                                                <CornerDownLeft size={16} className="text-slate-400" />
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {results.installments.length > 0 && (
                                <div className="p-2 border-t dark:border-slate-700">
                                    <h3 className="text-xs font-semibold uppercase text-slate-400 px-3 mb-2 mt-2 flex items-center gap-2"><Banknote size={14}/> الأقساط</h3>
                                    <ul>
                                        {results.installments.map(i => (
                                            <li key={i.id} onClick={() => handleNavigate('/installments')} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                                                <span>{i.customerName}</span>
                                                <span className="ms-auto text-xs text-slate-400">خطة تقسيط</span>
                                                <CornerDownLeft size={16} className="text-slate-400" />
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {results.stockTransfers.length > 0 && (
                                <div className="p-2 border-t dark:border-slate-700">
                                    <h3 className="text-xs font-semibold uppercase text-slate-400 px-3 mb-2 mt-2 flex items-center gap-2"><ArrowRightLeft size={14}/> نقل المخزون</h3>
                                    <ul>
                                        {results.stockTransfers.map(st => (
                                            <li key={st.id} onClick={() => handleNavigate('/stock-transfer')} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                                                <span className="font-mono">{st.id.toUpperCase()}</span>
                                                <span className="ms-auto text-xs text-slate-400">عملية نقل</span>
                                                <CornerDownLeft size={16} className="text-slate-400" />
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GlobalSearchModal;
