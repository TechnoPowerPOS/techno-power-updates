
import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, getDocs, addDoc, serverTimestamp, orderBy, limit, doc, writeBatch, increment, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { handleFirestoreError, OperationType } from '../../services/firestoreErrorHandler';
import { useToasts } from '../../hooks/useToasts';
import { Wallet, Plus, Search, Filter, DollarSign, Tag, Calendar, User, FileText, ChevronDown, Building, Edit2, Trash2 } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/layout/PageHeader';
import { api } from '../../services/mockApi'; // Keep for types if needed
import type { Treasury } from '../../types';

import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Printer } from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/localization';

interface Expense {
    id: string;
    amount: number;
    category: string;
    description: string;
    paidTo: string;
    date: any;
    status: 'Paid' | 'Pending';
    treasuryId?: string;
}

interface ExpensesPageProps {
    hideHeader?: boolean;
}

const ExpensesPage: React.FC<ExpensesPageProps> = ({ hideHeader = false }) => {
    const navigate = useNavigate();
    const { addToast } = useToasts();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [treasuries, setTreasuries] = useState<Treasury[]>([]);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [formData, setFormData] = useState({
        amount: '',
        category: 'مصاريف عامة',
        description: '',
        paidTo: '',
        status: 'Paid' as const,
        treasuryId: ''
    });

    const CATEGORIES = [
        'مصاريف عامة',
        'إيجارات',
        'كهرباء ومياه',
        'مرتبات وأجور',
        'قرطاسية ومكتب',
        'صيانة وإصلاح',
        'مشتريات نقدية',
        'أخرى'
    ];

    useEffect(() => {
        fetchExpenses();
        fetchTreasuries();
    }, []);

    const fetchTreasuries = async () => {
        try {
            const snap = await getDocs(collection(db, 'treasuries'));
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Treasury));
            setTreasuries(data);
            if (data.length > 0 && !formData.treasuryId) {
                setFormData(prev => ({ ...prev, treasuryId: data[0].id }));
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchExpenses = async () => {
        setLoading(true);
        try {
            let qConstraints: any[] = [];
            if (startDate) qConstraints.push(where('date', '>=', new Date(startDate).toISOString()));
            if (endDate) qConstraints.push(where('date', '<=', new Date(endDate + 'T23:59:59.999Z').toISOString()));
            
            qConstraints.push(orderBy('date', 'desc'));
            qConstraints.push(limit(1000));

            const q = query(collection(db, 'acc_expenses'), ...qConstraints);
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => {
                const item = doc.data();
                return { 
                    id: doc.id, 
                    ...item,
                    date: item.date
                } as Expense;
            });
            setExpenses(data);
        } catch (error) {
            handleFirestoreError(error, OperationType.GET, 'acc_expenses');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, [startDate, endDate]);

    const { totalToday, totalMonth, totalYear } = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const firstOfYear = new Date(today.getFullYear(), 0, 1);
        
        let tToday = 0, tMonth = 0, tYear = 0;
        
        expenses.forEach(ex => {
            const d = ex.date?.seconds ? new Date(ex.date.seconds * 1000) : new Date();
            const amt = Number(ex.amount) || 0;
            if (d >= today) tToday += amt;
            if (d >= firstOfMonth) tMonth += amt;
            if (d >= firstOfYear) tYear += amt;
        });
        
        return { totalToday: tToday, totalMonth: tMonth, totalYear: tYear };
    }, [expenses]);

    const filteredExpenses = useMemo(() => {
        if (!searchQuery) return expenses;
        return expenses.filter(ex => 
            ex.description?.includes(searchQuery) || 
            ex.category?.includes(searchQuery) || 
            ex.paidTo?.includes(searchQuery)
        );
    }, [expenses, searchQuery]);

    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

    const handleOpenEdit = (ex: Expense) => {
        setEditingExpense(ex);
        setFormData({
            amount: ex.amount.toString(),
            category: ex.category,
            description: ex.description || '',
            paidTo: ex.paidTo || '',
            status: ex.status,
            treasuryId: ex.treasuryId || treasuries[0]?.id || ''
        });
        setIsModalOpen(true);
    };

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handlePrint = (ex: Expense) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        
        const content = `
            <div dir="rtl" style="font-family: Arial, sans-serif; padding: 40px; max-width: 500px; margin: auto; border: 2px solid #EEE; border-radius: 20px;">
                <h1 style="text-align: center; color: #4F46E5;">سند صرف مصروفات</h1>
                <hr/>
                <div style="margin-top: 20px; font-size: 18px;">
                    <p><b>المبلغ:</b> ${ex.amount.toLocaleString()} ر.س</p>
                    <p><b>التصنيف:</b> ${ex.category}</p>
                    <p><b>التاريخ:</b> ${new Date().toLocaleDateString('ar-EG')}</p>
                    <p><b>محرر لـ:</b> ${ex.paidTo || '--'}</p>
                    <p><b>البيان:</b> ${ex.description || '--'}</p>
                </div>
                <div style="margin-top: 40px; border-top: 1px solid #EEE; padding-top: 20px; display: flex; justify-content: space-between;">
                    <div>توقيع المستلم: .....................</div>
                    <div>توقيع المدير: .....................</div>
                </div>
            </div>
        `;
        
        printWindow.document.write(`
            <html>
                <head><title>طباعة مصروف</title></head>
                <body onload="window.print(); window.close();">${content}</body>
            </html>
        `);
    };

    const confirmDelete = async () => {
        if (!expenseToDelete) return;
        setIsDeleting(true);
        try {
            const batch = writeBatch(db);
            // 1. Delete expense
            batch.delete(doc(db, 'acc_expenses', expenseToDelete.id));
            
            // 2. Refund treasury
            if (expenseToDelete.treasuryId) {
                const tRef = doc(db, 'treasuries', expenseToDelete.treasuryId);
                batch.update(tRef, { balance: increment(expenseToDelete.amount) });
            
                // 3. Log refund transaction
                const transRef = doc(collection(db, 'treasury_transactions'));
                batch.set(transRef, {
                    treasuryId: expenseToDelete.treasuryId,
                    type: 'income',
                    amount: expenseToDelete.amount,
                    description: `استرجاع مبلغ مصروف محذوف: ${expenseToDelete.description || expenseToDelete.category}`,
                    category: 'استرجاع مصروفات',
                    date: new Date().toISOString()
                });
            }

            await batch.commit();
            addToast('تم حذف المصروف بنجاح', 'success');
            fetchExpenses();
            fetchTreasuries();
        } catch (err) {
            handleFirestoreError(err, OperationType.DELETE, 'acc_expenses');
        } finally {
            setIsDeleting(false);
            setIsDeleteModalOpen(false);
            setExpenseToDelete(null);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.treasuryId) {
            addToast('يجب اختيار خزينة للصرف', 'warning');
            return;
        }

        const treasury = treasuries.find(t => t.id === formData.treasuryId);
        const amountNum = Number(formData.amount);

        // If it's a new expense, check balance. 
        // If editing, we might need complex balance logic, but for simplicity we'll just update.
        if (!editingExpense && (!treasury || treasury.balance < amountNum)) {
            addToast('رصيد الخزينة غير كافٍ', 'error');
            return;
        }

        setSubmitting(true);
        try {
            const batch = writeBatch(db);
            
            if (editingExpense) {
                // UPDATE
                const expenseRef = doc(db, 'acc_expenses', editingExpense.id);
                batch.update(expenseRef, {
                    ...formData,
                    amount: amountNum,
                });

                // Financial Impact Adjustment (Refund old, subtract new)
                if (editingExpense.treasuryId) {
                    const oldTRef = doc(db, 'treasuries', editingExpense.treasuryId);
                    
                    if (editingExpense.treasuryId === formData.treasuryId) {
                        // Same treasury, update difference
                        const diff = editingExpense.amount - amountNum;
                        if (diff !== 0) {
                            batch.update(oldTRef, { balance: increment(diff) });
                        }
                    } else {
                        // Different treasury: Refund old, subtract from new
                        batch.update(oldTRef, { balance: increment(editingExpense.amount) });
                        const newTRef = doc(db, 'treasuries', formData.treasuryId);
                        batch.update(newTRef, { balance: increment(-amountNum) });
                    }
                }
            } else {
                // CREATE
                const expenseRef = doc(collection(db, 'acc_expenses'));
                batch.set(expenseRef, {
                    ...formData,
                    amount: amountNum,
                    date: new Date().toISOString(),
                });
                
                const treasuryRef = doc(db, 'treasuries', formData.treasuryId);
                batch.update(treasuryRef, { balance: increment(-amountNum) });

                const transRef = doc(collection(db, 'treasury_transactions'));
                batch.set(transRef, {
                    treasuryId: formData.treasuryId,
                    type: 'withdrawal',
                    amount: amountNum,
                    description: `مصروف: ${formData.description || formData.category} - مسدد لـ ${formData.paidTo}`,
                    category: 'مصاريف',
                    date: new Date().toISOString()
                });
            }

            await batch.commit();

            addToast(editingExpense ? 'تم تحديث المصروف بنجاح' : 'تم تسجيل المصروف بنجاح', 'success');
            setIsModalOpen(false);
            setEditingExpense(null);
            setFormData({ ...formData, amount: '', description: '', paidTo: '', status: 'Paid' });
            fetchExpenses();
            fetchTreasuries();
        } catch (error) {
            handleFirestoreError(error, editingExpense ? OperationType.UPDATE : OperationType.CREATE, 'acc_expenses');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            {!hideHeader && (
                <PageHeader title="إدارة المصروفات والنفقات" subtitle="تتبع وتسجيل جميع المصاريف التشغيلية والعمومية للمنشأة بدقة وربطها بالخزينة">
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => navigate('/treasury')} className="h-12 px-6 rounded-2xl border-slate-200 font-bold">
                            <Wallet className="me-2" size={18} />
                            الخزائن والحسابات
                        </Button>
                        <Button onClick={() => setIsModalOpen(true)} className="h-12 px-8 rounded-2xl bg-indigo-600 font-black shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">
                            <Plus className="me-2" size={18} />
                            تسجيل مصروف جديد
                        </Button>
                    </div>
                </PageHeader>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <Card className="p-6 bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/30">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/40 rounded-2xl flex items-center justify-center text-indigo-600">
                             <Wallet size={24} />
                        </div>
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Today</span>
                    </div>
                    <p className="text-sm font-bold text-slate-500 mb-1">مصروفات اليوم</p>
                    <p className="text-3xl font-black text-indigo-600">{formatCurrency(totalToday)}</p>
                 </Card>
                 <Card className="p-6 bg-rose-50/50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/30">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/40 rounded-2xl flex items-center justify-center text-rose-600">
                             <Calendar size={24} />
                        </div>
                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">This Month</span>
                    </div>
                    <p className="text-sm font-bold text-slate-500 mb-1">إجمالي هذا الشهر</p>
                    <p className="text-3xl font-black text-rose-600">{formatCurrency(totalMonth)}</p>
                 </Card>
                 <Card className="p-6 bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/40 rounded-2xl flex items-center justify-center text-amber-600">
                             <Tag size={24} />
                        </div>
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">This Year</span>
                    </div>
                    <p className="text-sm font-bold text-slate-500 mb-1">إجمالي هذا العام</p>
                    <p className="text-3xl font-black text-amber-600">{formatCurrency(totalYear)}</p>
                 </Card>
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-between bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="بحث برقم الوصف، التصنيف، أو المستفيد..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pe-12 ps-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <input 
                        type="date" 
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-slate-400 font-black">إلى</span>
                    <input 
                        type="date" 
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="تسجيل مصروف جديد">
                <form onSubmit={handleAdd} className="space-y-4 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 pr-2">المبلغ</label>
                            <div className="relative">
                                <DollarSign size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    required
                                    type="number"
                                    step="0.01"
                                    value={formData.amount}
                                    onChange={e => setFormData({...formData, amount: e.target.value})}
                                    placeholder="0.00"
                                    className="w-full h-12 pr-12 pl-4 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none font-bold text-lg"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 pr-2">التصنيف</label>
                            <select 
                                value={formData.category}
                                onChange={e => setFormData({...formData, category: e.target.value})}
                                className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none font-bold cursor-pointer"
                            >
                                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 pr-2">الخزينة / الحساب</label>
                            <div className="relative">
                                <Building size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <select 
                                    required
                                    value={formData.treasuryId}
                                    onChange={e => setFormData({...formData, treasuryId: e.target.value})}
                                    className="w-full h-12 pr-12 pl-4 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none font-bold cursor-pointer focus:ring-2 focus:ring-indigo-500"
                                >
                                    {treasuries.map(t => (
                                        <option key={t.id} value={t.id}>{t.name} (رصيد: {t.balance.toLocaleString()})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 pr-2">دفع لـ (المورد/الجهة)</label>
                            <input 
                                value={formData.paidTo}
                                onChange={e => setFormData({...formData, paidTo: e.target.value})}
                                placeholder="اسم الشركة أو الشخص"
                                className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none font-bold"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-black text-slate-500 pr-2">وصف المصروف</label>
                        <textarea 
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                            placeholder="اكتب تفاصيل المصروف هنا..."
                            className="w-full h-24 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none font-bold resize-none"
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <Button type="submit" disabled={submitting} className="flex-1 h-12 bg-indigo-600 rounded-xl font-black shadow-lg shadow-indigo-500/20">
                            {submitting ? 'جاري الحفظ...' : 'حفظ وتسجيل المصروف'}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="h-12 px-8 rounded-xl font-black">إلغاء</Button>
                    </div>
                </form>
            </Modal>

            {(startDate || endDate) && (
                <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-between dark:bg-rose-900/30 dark:border-rose-800/50">
                    <span className="font-bold text-rose-800 dark:text-rose-200">إجمالي مصروفات الفترة المحددة:</span>
                    <span className="text-xl font-black text-rose-900 dark:text-rose-100">{formatCurrency(filteredExpenses.reduce((a, b) => a + Number(b.amount || 0), 0), 'SAR')}</span>
                </div>
            )}

            <Card className="overflow-hidden border border-slate-100 dark:border-slate-800">
                <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-6 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <FileText className="text-slate-400" />
                        <h3 className="font-black text-lg">سجل المصروفات الأخير</h3>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                                <th className="px-6 py-4">التاريخ</th>
                                <th className="px-6 py-4">التصنيف</th>
                                <th className="px-6 py-4">البيان / الوصف</th>
                                <th className="px-6 py-4 text-start">المستفيد</th>
                                <th className="px-6 py-4 text-start">الخزينة</th>
                                <th className="px-6 py-4 text-left rtl:text-right">المبلغ</th>
                                <th className="px-6 py-4 text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => <tr key={i} className="h-16 animate-pulse bg-slate-50/50 dark:bg-slate-900/50"></tr>)
                            ) : filteredExpenses.length > 0 ? (
                                filteredExpenses.map(ex => (
                                    <tr key={ex.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                        <td className="px-6 py-5 text-start">
                                            <div className="flex items-center gap-2 text-slate-500 font-bold text-xs">
                                                <Calendar size={12} />
                                                {ex.date?.seconds 
                                                    ? new Date(ex.date.seconds * 1000).toLocaleDateString() 
                                                    : ex.date 
                                                        ? new Date(ex.date).toLocaleDateString()
                                                        : 'Just now'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-start">
                                            <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-black">
                                                {ex.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-start">
                                            <p className="font-bold text-sm text-slate-700 dark:text-slate-300">{ex.description || 'بدون وصف'}</p>
                                        </td>
                                        <td className="px-6 py-5 text-start">
                                            <div className="flex items-center gap-2 text-slate-500 font-bold text-xs">
                                                <User size={12} />
                                                {ex.paidTo || '--'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-start">
                                            <div className="flex items-center gap-2">
                                                <Building size={14} className="text-slate-400" />
                                                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                                                    {treasuries.find(t => t.id === ex.treasuryId)?.name || 'الخزينة الرئيسية'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-left rtl:text-right font-black text-slate-900 dark:text-white">
                                            {formatCurrency(ex.amount)}
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button 
                                                    onClick={() => handlePrint(ex)}
                                                    className="p-2 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900/20 rounded-xl transition-all"
                                                    title="طباعة"
                                                >
                                                    <Printer size={14} />
                                                </button>
                                                <button 
                                                    onClick={() => handleOpenEdit(ex)}
                                                    className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all"
                                                    title="تعديل"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        setExpenseToDelete(ex);
                                                        setIsDeleteModalOpen(true);
                                                    }}
                                                    className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                                                    title="حذف"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center text-slate-400 font-bold">لا توجد مصروفات مسجلة</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
            <ConfirmDialog 
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                isLoading={isDeleting}
                title="تأكيد حذف المصروف"
                message="هل أنت متأكد من حذف هذا المصروف؟ سيتم إرجاع المبلغ للخزينة المسجل بها."
                confirmText="نعم، حذف"
                cancelText="تراجع"
            />
        </div>
    );
};

export default ExpensesPage;
