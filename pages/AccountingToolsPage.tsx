
import React, { useState, useEffect, useMemo } from 'react';
import Card from '../components/ui/Card';
import { Calculator, Percent, DollarSign, ArrowRightLeft, TrendingUp, CreditCard, Banknote, RefreshCcw, FileText, Search } from 'lucide-react';
import { formatCurrency, toArabicIndic } from '../utils/localization';
import { useSettings } from '../hooks/useSettings';
import { api } from '../services/mockApi';
import type { JournalEntry } from '../types';

const ToolCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-all duration-300">
        <div className="p-4 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                {icon}
            </div>
            <h3 className="font-bold text-slate-800 dark:text-white">{title}</h3>
        </div>
        <div className="p-5 space-y-4">
            {children}
        </div>
    </div>
);

import { useLicense } from '../hooks/useLicense';
import { getPlanLimits } from '../utils/planPermissions';
import { Lock } from 'lucide-react';
import Button from '../components/ui/Button';
import { Link } from 'react-router-dom';

const AccountingToolsPage: React.FC = () => {
    const { settings } = useSettings();
    const currency = settings?.currency || 'SAR';
    const { licenseInfo } = useLicense();
    const limits = getPlanLimits(licenseInfo.type);
    
    const [journal, setJournal] = useState<JournalEntry[]>([]);
    const [ledgerSearch, setLedgerSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'calculators' | 'ledger'>('calculators');

    useEffect(() => {
        if (!limits.hasAccounting) return;
        const fetchJournal = async () => {
            const data = await api.getJournalEntries();
            setJournal(data);
        };
        fetchJournal();
    }, [limits.hasAccounting]);

    if (!limits.hasAccounting) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fadeIn">
                <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-4">
                    <Lock size={64} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">الأدوات المحاسبية (Premium)</h1>
                    <p className="text-slate-500 mt-2 max-w-md mx-auto">دفتر الأستاذ العام والحسابات المتقدمة متوفرة في الخطط المدفوعة.</p>
                </div>
                <Link to="/pricing">
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-lg px-8 rounded-2xl">
                        ترقية الاشتراك
                    </Button>
                </Link>
            </div>
        );
    }

    const filteredJournal = useMemo(() => {
        if (!ledgerSearch) return journal;
        return journal.filter(j => 
            j.description.toLowerCase().includes(ledgerSearch.toLowerCase()) || 
            j.reference.toLowerCase().includes(ledgerSearch.toLowerCase())
        );
    }, [journal, ledgerSearch]);

    // Calculators States
    const [vatAmount, setVatAmount] = useState<number>(0);
    const [vatRate, setVatRate] = useState<number>(15);
    const [isInclusive, setIsInclusive] = useState(true);
    const vatResult = useMemo(() => {
        let tax = 0, net = 0, total = 0;
        if (isInclusive) {
            net = vatAmount / (1 + vatRate / 100);
            tax = vatAmount - net;
            total = vatAmount;
        } else {
            net = vatAmount;
            tax = vatAmount * (vatRate / 100);
            total = vatAmount + tax;
        }
        return { tax, net, total };
    }, [vatAmount, vatRate, isInclusive]);

    const [costPrice, setCostPrice] = useState<number>(0);
    const [sellPrice, setSellPrice] = useState<number>(0);
    const marginResult = useMemo(() => {
        const profit = sellPrice - costPrice;
        const margin = sellPrice > 0 ? (profit / sellPrice) * 100 : 0;
        return { profit, margin };
    }, [costPrice, sellPrice]);

    const [cashCounts, setCashCounts] = useState<Record<number, number>>({});
    const denominations = [1000, 500, 200, 100, 50, 20, 10, 5, 1, 0.5, 0.25];
    const totalCash = useMemo(() => denominations.reduce((sum, denom) => sum + (denom * (cashCounts[denom] || 0)), 0), [cashCounts]);

    const inputClass = "w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all";
    const labelClass = "block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1";
    const resultBoxClass = "bg-slate-100 dark:bg-slate-900 p-3 rounded-lg flex justify-between items-center text-sm";

    return (
        <div className="space-y-6 animate-fadeIn pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-600 rounded-xl text-white shadow-lg">
                        <Calculator size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">الأدوات المحاسبية</h1>
                        <p className="text-slate-500 text-sm">حاسبات سريعة</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ToolCard title="عداد النقود" icon={<Banknote size={20}/>}>
                        <div className="grid grid-cols-3 gap-3 max-h-[300px] overflow-y-auto p-1">
                            {denominations.map(denom => (
                                <div key={denom}>
                                    <span className={labelClass}>{denom}</span>
                                    <input type="number" min="0" value={cashCounts[denom] || ''} onChange={(e) => setCashCounts({...cashCounts, [denom]: parseInt(e.target.value)||0})} className={`${inputClass} text-center font-bold`} />
                                </div>
                            ))}
                        </div>
                        <div className={`${resultBoxClass} bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 py-4`}>
                            <span className="font-bold text-emerald-800 dark:text-emerald-300">إجمالي النقد:</span> 
                            <span className="font-mono font-black text-2xl text-emerald-600">{formatCurrency(totalCash, currency)}</span>
                        </div>
                    </ToolCard>

                    <ToolCard title="ضريبة القيمة المضافة" icon={<Percent size={20}/>}>
                        <div className="flex gap-2 mb-4">
                            <button onClick={() => setIsInclusive(true)} className={`flex-1 py-1 text-xs rounded border ${isInclusive ? 'bg-blue-50 border-blue-500 text-blue-600' : ''}`}>شامل</button>
                            <button onClick={() => setIsInclusive(false)} className={`flex-1 py-1 text-xs rounded border ${!isInclusive ? 'bg-blue-50 border-blue-500 text-blue-600' : ''}`}>غير شامل</button>
                        </div>
                        <input type="number" value={vatAmount || ''} onChange={e => setVatAmount(parseFloat(e.target.value)||0)} className={inputClass} placeholder="المبلغ" />
                        <div className="space-y-2 mt-4 pt-4 border-t dark:border-slate-700">
                            <div className={resultBoxClass}><span>الصافي:</span> <span className="font-bold">{formatCurrency(vatResult.net, currency)}</span></div>
                            <div className={resultBoxClass}><span>الضريبة:</span> <span className="font-bold text-red-500">{formatCurrency(vatResult.tax, currency)}</span></div>
                        </div>
                    </ToolCard>
                </div>
        </div>
    );
};

export default AccountingToolsPage;
