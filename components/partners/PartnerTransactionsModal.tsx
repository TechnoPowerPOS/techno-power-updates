import React, { useState, useEffect } from 'react';
import type { Partner, PartnerTransaction } from '../../types';
import { api } from '../../services/mockApi';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { PlusCircle, ArrowUpRight, ArrowDownRight, RefreshCw, Trash2, Download } from 'lucide-react';
import { formatCurrency } from '../../utils/localization';
import { useSettings } from '../../hooks/useSettings';
import { useToasts } from '../../hooks/useToasts';

interface PartnerTransactionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    partner: Partner | null;
    onTransactionAdded: () => void;
}

const PartnerTransactionsModal: React.FC<PartnerTransactionsModalProps> = ({ isOpen, onClose, partner, onTransactionAdded }) => {
    const [transactions, setTransactions] = useState<PartnerTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const { settings } = useSettings();
    const { addToast } = useToasts();

    const [formData, setFormData] = useState({
        type: 'Deposit' as 'Deposit' | 'Withdrawal' | 'ProfitDistribution' | 'LossDistribution',
        amount: 0,
        description: '',
        date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        if (isOpen && partner) {
            fetchTransactions();
            setShowAddForm(false);
            setFormData({
                type: 'Deposit',
                amount: 0,
                description: '',
                date: new Date().toISOString().split('T')[0]
            });
        }
    }, [isOpen, partner]);

    const fetchTransactions = async () => {
        if (!partner) return;
        setIsLoading(true);
        const data = await api.getPartnerTransactions(partner.id);
        setTransactions(data);
        setIsLoading(false);
    };

    const handleAddTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!partner) return;
        if (formData.amount <= 0) {
            addToast('المبلغ يجب أن يكون أكبر من صفر', 'error');
            return;
        }

        try {
            await api.addPartnerTransaction({
                partnerId: partner.id,
                type: formData.type,
                amount: formData.amount,
                description: formData.description,
                date: formData.date
            });
            addToast('تمت إضافة المعاملة بنجاح', 'success');
            setShowAddForm(false);
            fetchTransactions();
            onTransactionAdded(); // To refresh main partner list
        } catch (error) {
            addToast('حدث خطأ أثناء إضافة المعاملة', 'error');
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'Deposit': return <ArrowDownRight size={16} className="text-emerald-500" />;
            case 'Withdrawal': return <ArrowUpRight size={16} className="text-amber-500" />;
            case 'ProfitDistribution': return <RefreshCw size={16} className="text-blue-500" />;
            case 'LossDistribution': return <ArrowUpRight size={16} className="text-rose-500" />;
            default: return null;
        }
    };

    const getTypeName = (type: string) => {
        switch (type) {
            case 'Deposit': return 'إيداع نقدي / زيادة رأس مال';
            case 'Withdrawal': return 'سحب نقدي / تخفيض رأس مال';
            case 'ProfitDistribution': return 'توزيع أرباح';
            case 'LossDistribution': return 'توزيع خسائر';
            default: return type;
        }
    };

    if (!partner) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`السجل المالي للشريك: ${partner.name}`} size="2xl">
            <div className="space-y-6 print-area bg-white dark:bg-slate-900 print:bg-white print:text-black">
                <div className="hidden print:block mb-8 text-center border-b pb-4">
                    <h2 className="text-2xl font-black mb-2">كشف حساب شريك</h2>
                    <p className="text-sm font-bold text-slate-500">اسم الشريك: {partner.name}</p>
                    <p className="text-sm font-bold text-slate-500">تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</p>
                </div>
                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl print:bg-slate-100 print:border">
                    <div>
                        <p className="text-[10px] uppercase font-black text-slate-500 mb-1">الرصيد الحالي للشريك</p>
                        <p className={`text-2xl font-black ${partner.currentBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatCurrency(partner.currentBalance, settings?.currency)}
                        </p>
                    </div>
                    {!showAddForm && (
                        <div className="flex items-center gap-2 print:hidden">
                            <Button variant="secondary" onClick={() => window.print()} className="rounded-xl h-10 px-4 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200">
                                <Download size={16} className="me-2" /> طباعة الكشف
                            </Button>
                            <Button onClick={() => setShowAddForm(true)} className="rounded-xl h-10 px-4">
                                <PlusCircle size={16} className="me-2" /> عملية جديدة
                            </Button>
                        </div>
                    )}
                </div>

                {showAddForm && (
                    <form onSubmit={handleAddTransaction} className="bg-indigo-50/50 dark:bg-indigo-900/10 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 space-y-4 animate-fadeIn">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-black text-indigo-800 dark:text-indigo-300">تسجيل حركة مالية جديدة</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">نوع العملية</label>
                                <select 
                                    className="w-full p-2.5 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl font-bold outline-none text-sm"
                                    value={formData.type}
                                    onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                                >
                                    <option value="Deposit">إيداع (زيادة رصيد)</option>
                                    <option value="Withdrawal">سحب (خصم رصيد)</option>
                                    <option value="ProfitDistribution">توزيع أرباح (زيادة رصيد)</option>
                                    <option value="LossDistribution">توزيع خسائر (خصم رصيد)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">المبلغ</label>
                                <input 
                                    type="number" step="0.01" required
                                    className="w-full p-2.5 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl font-bold outline-none text-sm"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">التاريخ</label>
                                <input 
                                    type="date" required
                                    className="w-full p-2.5 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl font-bold outline-none text-sm"
                                    value={formData.date}
                                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">البيان / الوصف</label>
                            <input 
                                type="text" required
                                className="w-full p-2.5 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl font-bold outline-none text-sm"
                                placeholder="سبب المعاملة..."
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="secondary" onClick={() => setShowAddForm(false)} className="rounded-xl px-4 py-2 text-xs">إلغاء</Button>
                            <Button type="submit" className="rounded-xl px-6 py-2 text-xs">تأكيد العملية</Button>
                        </div>
                    </form>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase text-slate-500">
                            <tr>
                                <th className="px-4 py-3 text-start rounded-r-xl">التاريخ</th>
                                <th className="px-4 py-3 text-start">النوع</th>
                                <th className="px-4 py-3 text-start">البيان</th>
                                <th className="px-4 py-3 text-end rounded-l-xl">المبلغ</th>
                            </tr>
                        </thead>
                        {isLoading ? (
                            <tbody><tr><td colSpan={4} className="text-center py-10 animate-pulse text-slate-400">جاري التحميل...</td></tr></tbody>
                        ) : transactions.length === 0 ? (
                            <tbody><tr><td colSpan={4} className="text-center py-10 text-slate-400 font-bold">لا توجد حركات مالية مسجلة</td></tr></tbody>
                        ) : (
                            <tbody className="divide-y dark:divide-slate-800">
                                {transactions.map(trx => (
                                    <tr key={trx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-4 py-4 font-bold text-xs">{new Date(trx.date).toLocaleDateString('ar-EG')}</td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`p-1.5 rounded-lg ${trx.type === 'Deposit' ? 'bg-emerald-100 dark:bg-emerald-900/30' : trx.type === 'Withdrawal' ? 'bg-rose-100 dark:bg-rose-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                                                    {getTypeIcon(trx.type)}
                                                </div>
                                                <span className="font-bold text-xs">{getTypeName(trx.type)}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-xs font-bold text-slate-600 dark:text-slate-300">{trx.description}</td>
                                        <td className={`px-4 py-4 text-end font-black ${trx.type === 'Withdrawal' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            {trx.type === 'Withdrawal' ? '-' : '+'}{formatCurrency(trx.amount, settings?.currency)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        )}
                    </table>
                </div>
            </div>
        </Modal>
    );
};

export default PartnerTransactionsModal;
