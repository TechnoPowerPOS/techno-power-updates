
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Transaction, Treasury } from '../types';
import { collection, query, getDocs, addDoc, serverTimestamp, writeBatch, doc, deleteDoc, updateDoc, orderBy, limit, where, increment } from 'firebase/firestore';
import { db } from '../services/firebase';
import { handleFirestoreError, OperationType } from '../services/firestoreErrorHandler';
import Card from '../components/ui/Card';
import { api } from '../services/mockApi'; // Keep for some types/helpers if needed
import { PlusCircle as PlusCircleIcon, Wallet, ArrowRightLeft, RefreshCw, Search, Trash2, Building, ExternalLink, Calendar, Filter, CreditCard, Receipt, Edit3 } from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import TransactionFormModal from '../components/treasury/TransactionFormModal';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency, toArabicIndic } from '../utils/localization';
import TreasurySkeleton from '../components/treasury/TreasurySkeleton';
import { useToasts } from '../hooks/useToasts';
import { useLicense } from '../hooks/useLicense';
import { getPlanLimits } from '../utils/planPermissions';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ExpensesPage from './accounts/ExpensesPage';
import ChecksPage from './accounts/ChecksPage';
import TreasuryLedgerTab from '../components/treasury/TreasuryLedgerTab';

const TreasuryPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState('treasury');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [treasuries, setTreasuries] = useState<Treasury[]>([]);
    const [financialAccounts, setFinancialAccounts] = useState<Treasury[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTreasuryModalOpen, setIsTreasuryModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    
    const [isSaving, setIsSaving] = useState(false);
    const [editingTreasury, setEditingTreasury] = useState<Treasury | null>(null);

    const { licenseInfo } = useLicense();
    const limits = getPlanLimits(licenseInfo.type);

    const tabs = [
        { id: 'treasury', label: 'الخزائن والحسابات', icon: Wallet },
        ...(limits.hasDetailedTreasury ? [{ id: 'ledger', label: 'كشف الخزينة المفصل', icon: Receipt }] : []),
        ...(limits.hasExpenses ? [{ id: 'expenses', label: 'سجل المصروفات', icon: Receipt }] : []),
        ...(limits.hasChecksManagement ? [{ id: 'checks', label: 'إدارة الشيكات', icon: CreditCard }] : []),
    ];

    // Check if current tab is allowed
    useEffect(() => {
        const allowedTabs = tabs.map(t => t.id);
        if (!allowedTabs.includes(activeTab)) {
            setActiveTab('treasury');
        }
    }, [activeTab, limits]);

    // Search & Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [filterType, setFilterType] = useState('all');
    
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [transactionToUndo, setTransactionToUndo] = useState<Transaction | null>(null);

    // Form States
    const [newTreasury, setNewTreasury] = useState({ name: '', currency: 'SAR', balance: 0 });
    const [transferData, setTransferData] = useState({ from: '', to: '', amount: 0, desc: '' });
    const [exportData, setExportData] = useState({ from: '', dest: '', amount: 0, desc: '', targetAccountId: '' });

    const { settings } = useSettings();
    const { addToast } = useToasts();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const treasuriesSnap = await getDocs(collection(db, 'treasuries'));
            const treasuryData = treasuriesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Treasury));

            const q = query(collection(db, 'treasury_transactions'), orderBy('date', 'desc'), limit(100));
            const transSnap = await getDocs(q);
            const transData = transSnap.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    ...data,
                    category: data.category || data.type || 'Other'
                } as Transaction;
            });

            setTreasuries(treasuryData);
            setTransactions(transData);
            setFinancialAccounts(treasuryData.filter((t: Treasury) => t.type === 'bank'));

            if (treasuryData.length > 0) {
                setTransferData(prev => ({ ...prev, from: treasuryData[0].id, to: treasuryData[1]?.id || treasuryData[0].id }));
                setExportData(prev => ({ ...prev, from: treasuryData[0].id }));
            }
        } catch (e) { 
            addToast('فشل في تحميل البيانات', 'error');
        } finally { 
            setLoading(false); 
        }
    }, [addToast]);

    const initializeMainTreasury = async () => {
        setIsSaving(true);
        try {
            const mainTreasury = {
                name: 'الخزينة الرئيسية',
                balance: 0,
                currency: settings.currency || 'SAR',
                isDefault: true,
                createdAt: serverTimestamp()
            };
            await addDoc(collection(db, 'treasuries'), mainTreasury);
            addToast('تم إنشاء الخزينة الرئيسية بنجاح', 'success');
            fetchData();
        } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, 'treasuries');
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleCreateTreasury = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTreasury.name) return;
        
        if (treasuries.length >= limits.maxTreasuries) {
            addToast(`عذراً، باقتك الحالية تسمح بحد أقصى ${limits.maxTreasuries} خزينة/حساب. يرجى الترقية لإضافة المزيد.`, "error");
            return;
        }

        setIsSaving(true);
        try {
            await addDoc(collection(db, 'treasuries'), { 
                ...newTreasury, 
                isDefault: treasuries.length === 0,
                createdAt: serverTimestamp() 
            });
            addToast("تم إنشاء الخزينة بنجاح", "success");
            setIsTreasuryModalOpen(false);
            setNewTreasury({ name: '', currency: settings?.currency || 'SAR', balance: 0 });
            await fetchData();
        } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'treasuries'); } finally { setIsSaving(false); }
    };

    const handleUpdateTreasury = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTreasury || !editingTreasury.name) return;
        setIsSaving(true);
        try {
            const batch = writeBatch(db);
            const ref = doc(db, 'treasuries', editingTreasury.id);

            if (editingTreasury.isDefault) {
                // remove isDefault from others
                treasuries.forEach(t => {
                    if (t.id !== editingTreasury.id && t.isDefault) {
                        batch.update(doc(db, 'treasuries', t.id), { isDefault: false });
                    }
                });
            }

            batch.update(ref, {
                name: editingTreasury.name,
                currency: editingTreasury.currency,
                balance: editingTreasury.balance,
                isDefault: editingTreasury.isDefault || false
            });

            await batch.commit();
            addToast("تم تحديث بيانات الخزينة بنجاح", "success");
            setIsEditModalOpen(false);
            setEditingTreasury(null);
            await fetchData();
        } catch (e) { handleFirestoreError(e, OperationType.UPDATE, 'treasuries'); } finally { setIsSaving(false); }
    };

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (transferData.from === transferData.to) { addToast("لا يمكن التحويل لنفس الخزينة", "warning"); return; }
        
        const amt = parseFloat(transferData.amount as any) || 0;
        const fromTreasury = treasuries.find(t => t.id === transferData.from);
        if (!fromTreasury || fromTreasury.balance < amt) {
            addToast("رصيد غير كافٍ في الخزينة المصدر", "error");
            return;
        }

        setIsSaving(true);
        try {
            const batch = writeBatch(db);
            const fromRef = doc(db, 'treasuries', transferData.from);
            const toRef = doc(db, 'treasuries', transferData.to);

            // Use increment for atomic updates
            batch.update(fromRef, { balance: increment(-amt) });
            batch.update(toRef, { balance: increment(amt) });

            const transRef = doc(collection(db, 'treasury_transactions'));
            batch.set(transRef, {
                treasuryId: transferData.from, // Source
                toTreasuryId: transferData.to, // Destination
                type: 'transfer',
                amount: amt,
                description: transferData.desc || 'تحويل بين الخزائن',
                category: 'تحويل',
                date: new Date().toISOString()
            });

            await batch.commit();
            addToast("تم التحويل بنجاح", "success");
            setIsTransferModalOpen(false);
            setTransferData({ ...transferData, amount: 0, desc: '' });
            await fetchData();
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'treasuries'); } finally { setIsSaving(false); }
    };

    const handleExport = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const amt = parseFloat(exportData.amount as any) || 0;
        const fromTreasury = treasuries.find(t => t.id === exportData.from);
        if (!fromTreasury || fromTreasury.balance < amt) {
            addToast("رصيد غير كافٍ في الخزينة المصدر", "error");
            return;
        }

        setIsSaving(true);
        try {
            const batch = writeBatch(db);
            const fromRef = doc(db, 'treasuries', exportData.from);
            
            // 1. Decrease source balance
            batch.update(fromRef, { balance: increment(-amt) });

            // 2. Increase target financial account if selected
            if (exportData.targetAccountId) {
                const targetRef = doc(db, 'treasuries', exportData.targetAccountId);
                batch.update(targetRef, { balance: increment(amt) });
                
                // Log income for target account
                const targetTransRef = doc(collection(db, 'treasury_transactions'));
                batch.set(targetTransRef, {
                    treasuryId: exportData.targetAccountId,
                    type: 'income',
                    amount: amt,
                    description: `إيداع عبر الخزينة: ${exportData.desc || ''}`,
                    category: 'إيداع',
                    date: new Date().toISOString()
                });
            }

            // 3. Log export for source account
            const exportTransRef = doc(collection(db, 'treasury_transactions'));
            batch.set(exportTransRef, {
                treasuryId: exportData.from,
                type: 'export',
                amount: amt,
                description: exportData.desc || `تصدير إلى ${exportData.dest}`,
                category: 'تصدير',
                destinationAccount: exportData.dest,
                date: new Date().toISOString()
            });

            await batch.commit();
            addToast("تم التصدير المالي بنجاح", "success");
            setIsExportModalOpen(false);
            setExportData({ ...exportData, amount: 0, dest: '', desc: '', targetAccountId: '' });
            await fetchData();
        } catch (err) { 
            handleFirestoreError(err, OperationType.WRITE, 'treasury_transactions'); 
        } finally { 
            setIsSaving(false); 
        }
    };

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || t.category.toLowerCase().includes(searchTerm.toLowerCase());
            const tDate = t.date;
            let transDate = '';
            if (tDate) {
                if (typeof tDate === 'string') {
                    transDate = tDate.split('T')[0];
                } else if (typeof tDate.toDate === 'function') {
                    transDate = tDate.toDate().toISOString().split('T')[0];
                } else if (tDate instanceof Date) {
                    transDate = tDate.toISOString().split('T')[0];
                }
            }
            const matchesDate = (!startDate || transDate >= startDate) && (!endDate || transDate <= endDate);
            const matchesType = filterType === 'all' || t.type === filterType;
            return matchesSearch && matchesDate && matchesType;
        });
    }, [transactions, searchTerm, startDate, endDate, filterType]);

    const handleSaveTransaction = async (data: any) => {
        setIsSaving(true);
        try {
            const batch = writeBatch(db);
            const treasuryRef = doc(db, 'treasuries', data.treasuryId);
            
            const amount = parseFloat(data.amount);
            const isIncome = data.type === 'income' || data.type === 'Income';

            // Use increment for atomic safety
            batch.update(treasuryRef, { balance: increment(isIncome ? amount : -amount) });

            const transRef = doc(collection(db, 'treasury_transactions'));
            
            const submitData = { ...data };
            if (submitData.id === undefined) delete submitData.id;

            batch.set(transRef, {
                ...submitData,
                type: isIncome ? 'income' : 'withdrawal',
                amount: amount, // Ensure number
                date: new Date().toISOString()
            });

            await batch.commit();
            await fetchData();
            setIsModalOpen(false);
            addToast("تم تسجيل الحركة بنجاح", "success");
        } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, 'treasury_transactions');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading || !settings) return <TreasurySkeleton />;
    
    return (
        <div className="animate-fadeIn pb-10 space-y-8">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">الخزينة والحسابات</h1>
                    <p className="text-slate-500 font-bold mt-1">مركز التحكم في السيولة النقدية وتدفق الأموال.</p>
                </div>
                {activeTab === 'treasury' && (
                    <div className="flex flex-wrap gap-3">
                        <Button onClick={() => setIsExportModalOpen(true)} variant="secondary" className="rounded-2xl h-12 px-6 font-black bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100 shadow-sm border">
                            <ExternalLink size={18} className="me-2" /> تصدير مالي
                        </Button>
                        <Button onClick={() => setIsTransferModalOpen(true)} variant="secondary" className="rounded-2xl h-12 px-6 font-black border-indigo-100 text-indigo-600 bg-white dark:bg-slate-900 shadow-sm">
                            <ArrowRightLeft size={18} className="me-2" /> تحويل بين الخزائن
                        </Button>
                        <Button onClick={() => setIsTreasuryModalOpen(true)} variant="secondary" className="rounded-2xl h-12 px-6 font-black border-slate-200 bg-white dark:bg-slate-900 shadow-sm">
                            <Building size={18} className="me-2" /> إضافة خزينة
                        </Button>
                        <Button onClick={() => setIsModalOpen(true)} className="rounded-2xl h-12 px-8 shadow-xl shadow-indigo-500/20 font-black">
                            <PlusCircleIcon size={18} className="me-2" /> تسجيل سحب أو إيداع
                        </Button>
                    </div>
                )}
            </div>

            <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs transition-all whitespace-nowrap ${
                            activeTab === tab.id
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                : 'bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800'
                        }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'treasury' ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                        {loading ? (
                            Array(4).fill(0).map((_, i) => <TreasurySkeleton key={i} />)
                        ) : treasuries.filter(t => t.type !== 'bank').length > 0 ? treasuries.filter(t => t.type !== 'bank').map(t => (
                            <div key={t.id} className="bg-white dark:bg-slate-900 p-8 rounded-4xl border border-slate-100 dark:border-slate-800 shadow-premium relative group overflow-hidden">
                                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform text-indigo-500 pointer-events-none"><Wallet size={120} /></div>
                                <div className="flex justify-between items-start mb-6 relative z-20">
                                    <div className="flex items-center gap-4">
                                        <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-500/20"><Wallet size={24} /></div>
                                        <div>
                                            <h4 className="font-black text-slate-800 dark:text-white text-lg">{t.name}</h4>
                                            {t.isDefault && <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">الافتراضية</span>}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => {
                                                setEditingTreasury(t);
                                                setIsEditModalOpen(true);
                                            }} 
                                            className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-900/50 rounded-xl transition-colors"
                                            title="تعديل الخزينة"
                                        >
                                            <Edit3 size={18} />
                                        </button>
                                        <button onClick={() => setConfirmDeleteId(t.id)} className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-900/50 rounded-xl transition-colors" title="حذف الخزينة">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-3xl font-black text-slate-800 dark:text-white relative z-10">{formatCurrency(t.balance || 0, t.currency || settings.currency)}</p>
                            </div>
                        )) : (
                            <div className="col-span-full py-16 flex flex-col items-center justify-center bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem]">
                                <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 rounded-full flex items-center justify-center mb-6">
                                    <PlusCircleIcon size={40} />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">لا توجد خزائن حالياً</h3>
                                <p className="text-slate-500 dark:text-slate-400 font-bold mb-8">ابدأ بإنشاء الخزينة الرئيسية لتمكين الحركات المالية</p>
                                <Button onClick={initializeMainTreasury} loading={isSaving} className="px-8 !rounded-2xl">
                                    إنشاء الخزينة الرئيسية الآمنة
                                </Button>
                            </div>
                        )}
                    </div>

                    <Card className="p-0 border-none shadow-premium overflow-hidden">

                <div className="p-8 bg-slate-50 dark:bg-slate-900/50 border-b dark:border-slate-800 space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="font-black text-xl flex items-center gap-2">
                            <Filter size={20} className="text-indigo-600"/>
                            سجل الحركات المفصل
                        </h3>
                        <button onClick={fetchData} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><RefreshCw size={20}/></button>
                    </div>
                    
                    {/* Advanced Search & Filtering */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="lg:col-span-2 relative">
                            <Search className="absolute top-1/2 -translate-y-1/2 start-4 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="ابحث في الوصف أو الفئة..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full h-12 ps-12 pe-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 font-bold text-xs outline-none focus:border-indigo-500 shadow-sm"
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                            <div className="flex items-center gap-1 px-2 border-e dark:border-slate-700">
                                <span className="text-[10px] font-black text-slate-400 uppercase">من</span>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-1 text-[10px] border-none bg-transparent font-bold outline-none dark:text-white" />
                            </div>
                            <div className="flex items-center gap-1 px-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase">إلى</span>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-1 text-[10px] border-none bg-transparent font-bold outline-none dark:text-white" />
                            </div>
                        </div>
                        <select 
                            value={filterType} 
                            onChange={e => setFilterType(e.target.value)}
                            className="h-12 px-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 font-bold text-xs outline-none focus:border-indigo-500 shadow-sm"
                        >
                            <option value="all">كل الأنواع</option>
                            <option value="income">إيداع (وارد)</option>
                            <option value="withdrawal">سحب (منصرف)</option>
                            <option value="transfer">تحويل</option>
                            <option value="export">تصدير</option>
                        </select>
                        <Button onClick={() => { setSearchTerm(''); setStartDate(''); setEndDate(''); setFilterType('all'); }} variant="secondary" className="h-12 rounded-2xl font-black text-xs border-slate-100">إعادة ضبط</Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-start">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b dark:border-slate-800">
                            <tr>
                                <th className="px-8 py-5">التاريخ</th>
                                <th className="px-8 py-5">النوع</th>
                                <th className="px-8 py-5">الفئة</th>
                                <th className="px-8 py-5">البيان</th>
                                <th className="px-8 py-5 text-end">المبلغ</th>
                                <th className="px-8 py-5 text-center">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-slate-800">
                            {filteredTransactions.map(t => (
                                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2 font-bold text-xs text-slate-600 dark:text-slate-400">
                                            <Calendar size={14} className="opacity-50"/>
                                            {(() => {
                                                const d = t.date;
                                                if (!d) return '---';
                                                try {
                                                    const dateObj = typeof d === 'string' ? new Date(d) : d.toDate?.() || new Date(d);
                                                    return isNaN(dateObj.getTime()) ? '---' : dateObj.toLocaleString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
                                                } catch (e) {
                                                    return '---';
                                                }
                                            })()}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`px-3 py-1.5 text-[10px] font-black rounded-xl border ${
                                            t.type === 'income' || t.type === 'Income' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                            t.type === 'expense' || t.type === 'withdrawal' || t.type === 'Expense' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                                            t.type === 'transfer' || t.type === 'Transfer' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                                            'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                            {t.type === 'income' || t.type === 'Income' ? 'إيداع' : t.type === 'withdrawal' || t.type === 'expense' || t.type === 'Expense' ? 'سحب' : t.type === 'transfer' || t.type === 'Transfer' ? 'تحويل' : 'تصدير'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5"><span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-wide">{t.category}</span></td>
                                    <td className="px-8 py-5 font-bold text-xs text-slate-700 dark:text-slate-300 max-w-md truncate">
                                        {t.description} 
                                        {t.destinationAccount && <span className="ms-2 text-indigo-500 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg font-black text-[10px]">[{t.destinationAccount}]</span>}
                                        {t.toTreasuryId && <span className="ms-2 text-indigo-500 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg font-black text-[10px] items-center gap-1"> إلى: {treasuries.find(tr => tr.id === t.toTreasuryId)?.name || 'خزينة أخرى'}</span>}
                                    </td>
                                    <td className={`px-8 py-5 text-end font-black text-xl ${t.type === 'income' || t.type === 'Income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {formatCurrency(t.amount || 0, settings.currency)}
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <button 
                                            onClick={() => setTransactionToUndo(t)}
                                            className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors flex items-center gap-1"
                                            title="تراجع عن الحركة"
                                        >
                                            <RefreshCw size={14} />
                                            <span className="text-xs font-bold">تراجع</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredTransactions.length === 0 && (
                        <div className="p-32 text-center text-slate-400 font-bold">
                            <p className="text-lg">لا توجد حركات مطابقة لمعايير البحث.</p>
                            <p className="text-xs mt-2 opacity-70">جرب تغيير الفلاتر أو تنظيف حقل البحث.</p>
                        </div>
                    )}
                </div>
            </Card>
            </>
            ) : activeTab === 'ledger' ? (
                <div className="animate-fadeIn">
                    <TreasuryLedgerTab treasuries={treasuries} onRequestUndo={setTransactionToUndo} />
                </div>
            ) : activeTab === 'expenses' ? (
                <div className="animate-fadeIn">
                    <ExpensesPage hideHeader />
                </div>
            ) : (
                <div className="animate-fadeIn">
                    <ChecksPage hideHeader />
                </div>
            )}

            {/* Modal: Edit Treasury */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="تعديل بيانات الخزينة">
                {editingTreasury && (
                    <form onSubmit={handleUpdateTreasury} className="space-y-6">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ms-1">اسم الخزينة</label>
                            <input type="text" required value={editingTreasury.name} onChange={e => setEditingTreasury({...editingTreasury, name: e.target.value})} className="w-full h-12 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold outline-none focus:border-indigo-500 text-slate-800 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ms-1">الرصيد الحالي</label>
                            <input type="number" value={editingTreasury.balance} onChange={e => setEditingTreasury({...editingTreasury, balance: parseFloat(e.target.value) || 0})} className="w-full h-12 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl font-black outline-none focus:border-indigo-500 text-slate-800 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ms-1">العملة</label>
                            <select value={editingTreasury.currency || settings.currency} onChange={e => setEditingTreasury({...editingTreasury, currency: e.target.value})} className="w-full h-12 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold outline-none focus:border-indigo-500 text-slate-800 dark:text-white">
                                <option value="SAR" className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white">ريال سعودي</option>
                                <option value="USD" className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white">دولار أمريكي</option>
                                <option value="EUR" className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white">يورو</option>
                                <option value="EGP" className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white">جنيه مصري</option>
                                <option value="SDG" className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white">جنيه سوداني</option>
                            </select>
                        </div>
                        <div>
                            <label className="flex items-center gap-3 cursor-pointer mt-2 p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-800/20">
                                <input type="checkbox" checked={editingTreasury.isDefault || false} onChange={e => setEditingTreasury({...editingTreasury, isDefault: e.target.checked})} className="w-5 h-5 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 bg-white" />
                                <span className="font-bold text-indigo-700 dark:text-indigo-300">تعيين كخزينة افتراضية للنظام</span>
                            </label>
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                            <Button variant="secondary" type="button" onClick={() => setIsEditModalOpen(false)} className="rounded-xl px-6">إلغاء</Button>
                            <Button type="submit" isLoading={isSaving} className="rounded-xl px-10 font-black shadow-lg">حفظ التغييرات</Button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Modal: Create Treasury */}
            <Modal isOpen={isTreasuryModalOpen} onClose={() => setIsTreasuryModalOpen(false)} title="إضافة خزينة جديدة">
                <form onSubmit={handleCreateTreasury} className="space-y-6">
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ms-1">اسم الخزينة</label>
                        <input type="text" required value={newTreasury.name} onChange={e => setNewTreasury({...newTreasury, name: e.target.value})} className="w-full h-12 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold outline-none focus:border-indigo-500 text-slate-800 dark:text-white" placeholder="مثال: الخزينة الفرعية، حساب البنك الأهلي..." />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ms-1">الرصيد الافتتاحي</label>
                        <input type="number" value={newTreasury.balance} onChange={e => setNewTreasury({...newTreasury, balance: parseFloat(e.target.value) || 0})} className="w-full h-12 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl font-black outline-none focus:border-indigo-500 text-slate-800 dark:text-white" />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="secondary" type="button" onClick={() => setIsTreasuryModalOpen(false)} className="rounded-xl px-6">إلغاء</Button>
                        <Button type="submit" isLoading={isSaving} className="rounded-xl px-10 font-black shadow-lg">حفظ الخزينة</Button>
                    </div>
                </form>
            </Modal>

            {/* Modal: Transfer Funds */}
            <Modal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} title="تحويل مالي بين الخزائن">
                <form onSubmit={handleTransfer} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase mb-2 ms-1">من خزينة (المصدر)</label>
                            <select value={transferData.from} onChange={e => setTransferData({...transferData, from: e.target.value})} className="w-full h-12 px-4 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:bg-slate-800 dark:text-white">
                                {treasuries.map(t => <option key={t.id} value={t.id}>{t.name} ({formatCurrency(t.balance, settings.currency)})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase mb-2 ms-1">إلى خزينة (المستهدف)</label>
                            <select value={transferData.to} onChange={e => setTransferData({...transferData, to: e.target.value})} className="w-full h-12 px-4 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:bg-slate-800 dark:text-white">
                                {treasuries.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase mb-2 ms-1">المبلغ المراد تحويله</label>
                        <input type="number" required min="0.01" step="0.01" value={transferData.amount || ''} onChange={e => setTransferData({...transferData, amount: e.target.value as any})} className="w-full h-14 p-4 border border-slate-100 dark:border-slate-700 rounded-2xl font-black text-2xl text-center text-indigo-600 outline-none focus:border-indigo-500 bg-slate-50 dark:bg-slate-800" />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase mb-2 ms-1">بيان التحويل</label>
                        <input type="text" value={transferData.desc} onChange={e => setTransferData({...transferData, desc: e.target.value})} className="w-full h-12 p-4 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold outline-none dark:bg-slate-800 dark:text-white" placeholder="مثال: تغذية عهدة الكاشير، تحويل للأمانات..." />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="secondary" type="button" onClick={() => setIsTransferModalOpen(false)} className="rounded-xl px-6">إلغاء</Button>
                        <Button type="submit" isLoading={isSaving} className="rounded-xl px-10 font-black shadow-lg">إتمام التحويل</Button>
                    </div>
                </form>
            </Modal>

            {/* Modal: Export Funds */}
            <Modal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} title="تصدير مالي خارجي">
                <form onSubmit={handleExport} className="space-y-6">
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase mb-2 ms-1">من خزينة</label>
                        <select value={exportData.from} onChange={e => setExportData({...exportData, from: e.target.value})} className="w-full h-12 px-4 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:bg-slate-800 dark:text-white">
                            {treasuries.map(t => <option key={t.id} value={t.id}>{t.name} ({formatCurrency(t.balance, settings.currency)})</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase mb-2 ms-1">الجهة المستلمة</label>
                            <input type="text" required value={exportData.dest} onChange={e => setExportData({...exportData, dest: e.target.value})} className="w-full h-12 p-4 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold outline-none dark:bg-slate-800 dark:text-white" placeholder="اسم البنك، المالك، المورد..." />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase mb-2 ms-1">حساب مالي للإيداع فيه (اختياري)</label>
                            <select value={exportData.targetAccountId} onChange={e => setExportData({...exportData, targetAccountId: e.target.value})} className="w-full h-12 px-4 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:bg-slate-800 dark:text-white">
                                <option value="">لا يوجد (تصدير كاش خارجي)</option>
                                {financialAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase mb-2 ms-1">المبلغ</label>
                            <input type="number" required min="0.01" step="0.01" value={exportData.amount || ''} onChange={e => setExportData({...exportData, amount: e.target.value as any})} className="w-full h-12 p-4 border border-slate-100 dark:border-slate-700 rounded-2xl font-black text-indigo-600 outline-none text-center bg-slate-50 dark:bg-slate-800" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase mb-2 ms-1">البيان</label>
                        <input type="text" value={exportData.desc} onChange={e => setExportData({...exportData, desc: e.target.value})} className="w-full h-12 p-4 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold outline-none dark:bg-slate-800 dark:text-white" placeholder="إيداع بنكي، سحب للمالك..." />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="secondary" type="button" onClick={() => setIsExportModalOpen(false)} className="rounded-xl px-6">إلغاء</Button>
                        <Button type="submit" isLoading={isSaving} className="rounded-xl px-10 font-black bg-emerald-600 hover:bg-emerald-700 shadow-lg">تأكيد التصدير</Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="تسجيل حركة يدوية">
                <TransactionFormModal transaction={null} onSave={handleSaveTransaction} onCancel={() => setIsModalOpen(false)} isLoading={isSaving} treasuries={treasuries} />
            </Modal>

            <ConfirmDialog 
                isOpen={!!confirmDeleteId} 
                onClose={() => setConfirmDeleteId(null)} 
                onConfirm={async () => {
                    try {
                        if (treasuries.length <= 1) {
                            addToast('لا يمكن حذف آخر خزينة متبقية', 'warning');
                            return;
                        }
                        const tr = treasuries.find(t => t.id === confirmDeleteId);
                        if (tr && tr.isDefault) {
                            addToast('لا يمكن حذف الخزينة الافتراضية للكيان', 'error');
                            return;
                        }
                        if (tr && tr.balance !== 0) {
                            addToast('لا يمكن حذف خزينة بها رصيد، وجه الرصيد لخزينة أخرى أولاً', 'error');
                            return;
                        }
                        const success = await api.deleteTreasury(confirmDeleteId!);
                        if (success) {
                            addToast('تم الحذف بنجاح', 'success');
                            await fetchData();
                        } else {
                            addToast('حدث خطأ أثناء الحذف', 'error');
                        }
                    } catch (e) {
                        handleFirestoreError(e, OperationType.DELETE, 'treasuries');
                    }
                    setConfirmDeleteId(null);
                }} 
                title="حذف الخزينة" 
                message="هل أنت متأكد من حذف هذه الخزينة؟ لا يمكن حذف الخزينة إلا إذا كان رصيدها صفراً."
            />

            <ConfirmDialog
                isOpen={!!transactionToUndo}
                onClose={() => setTransactionToUndo(null)}
                title="التراجع عن الحركة"
                message="هل أنت متأكد من التراجع عن هذه الحركة؟ سيتم عكس تأثير المبلغ على رصيد الخزينة المتعلقة بها."
                onConfirm={async () => {
                    if (!transactionToUndo) return;
                    setIsSaving(true);
                    try {
                        const batch = writeBatch(db);
                        const t = transactionToUndo;
                        
                        // Revert Balance
                        if (t.type === 'transfer' || t.type === 'Transfer') {
                            if (t.treasuryId && treasuries.some(tr => tr.id === t.treasuryId)) batch.update(doc(db, 'treasuries', t.treasuryId), { balance: increment(t.amount) });
                            if (t.toTreasuryId && treasuries.some(tr => tr.id === t.toTreasuryId)) batch.update(doc(db, 'treasuries', t.toTreasuryId), { balance: increment(-t.amount) });
                        } else if (t.type === 'export' || t.type === 'Export') {
                            if (t.treasuryId && treasuries.some(tr => tr.id === t.treasuryId)) batch.update(doc(db, 'treasuries', t.treasuryId), { balance: increment(t.amount) });
                        } else {
                            if (t.treasuryId && treasuries.some(tr => tr.id === t.treasuryId)) {
                                const tRef = doc(db, 'treasuries', t.treasuryId);
                                const isIncome = t.type === 'income' || t.type === 'Income';
                                batch.update(tRef, { balance: increment(isIncome ? -t.amount : t.amount) });
                            }
                        }
                        
                        batch.delete(doc(db, 'treasury_transactions', t.id));
                        await batch.commit();
                        addToast('تم التراجع عن الحركة وعكس الرصيد بنجاح', 'success');
                        await fetchData();
                    } catch (e: any) {
                        addToast('تعذر التراجع، تأكد من وجود الخزينة', 'error');
                        console.error("Delete tx error:", e);
                    } finally {
                        setIsSaving(false);
                        setTransactionToUndo(null);
                    }
                }}
            />
        </div>
    );
};

export default TreasuryPage;
