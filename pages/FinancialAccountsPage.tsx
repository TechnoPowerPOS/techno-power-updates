import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Wallet, Landmark, CreditCard, ArrowUpRight, ArrowDownLeft, 
    DollarSign, Activity, History, Plus, Trash2, Edit2, ArrowRightLeft, Search
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { api } from '../services/mockApi';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency, toArabicIndic } from '../utils/localization';
import { useToasts } from '../hooks/useToasts';
import type { Treasury } from '../types';

const AccountCard: React.FC<{ 
    account: Treasury, 
    onDelete: (id: string) => void,
    onEdit: (acc: Treasury) => void,
    onHistory: () => void,
    onTransfer: (acc: Treasury) => void
}> = ({ account, onDelete, onEdit, onHistory, onTransfer }) => {
    const { settings } = useSettings();
    const getIcon = (name: string) => {
        if (name.includes('بنك')) return Landmark;
        if (name.includes('محفظة')) return CreditCard;
        return Wallet;
    };
    const getColor = (name: string) => {
        if (name.includes('بنك')) return 'bg-emerald-600';
        if (name.includes('محفظة')) return 'bg-rose-600';
        return 'bg-indigo-600';
    };

    const Icon = getIcon(account.name);
    const color = getColor(account.name);

    return (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-premium group hover:-translate-y-2 transition-all duration-500 relative">
            {!account.isDefault && (
                <button 
                    onClick={() => onDelete(account.id)}
                    className="absolute top-6 left-6 p-2 text-rose-500 hover:bg-rose-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <Trash2 size={16} />
                </button>
            )}
            <div className="flex justify-between items-start mb-8">
                <div className={`p-4 rounded-2xl ${color} bg-opacity-10 dark:bg-opacity-20 text-white`}>
                    <Icon size={24} className={color.replace('bg-', 'text-')} />
                </div>
                <div className="px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-full text-[10px] font-black uppercase">{account.isDefault ? 'الرئيسي' : 'نشط'}</div>
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{account.name}</p>
                <h3 className="text-3xl font-black text-slate-800 dark:text-white">{formatCurrency(account.balance, settings?.currency)}</h3>
            </div>
            <div className="mt-8 pt-6 border-t dark:border-slate-800 grid grid-cols-3 gap-2">
                <button onClick={() => onTransfer(account)} className="flex flex-col items-center gap-1.5 p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all">
                    <ArrowRightLeft size={16}/>
                    <span className="text-[9px] font-black uppercase">تحويل لخزينة</span>
                </button>
                <button onClick={() => onEdit(account)} className="flex flex-col items-center gap-1.5 p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all">
                    <Edit2 size={16}/>
                    <span className="text-[9px] font-black uppercase">تعديل</span>
                </button>
                <button onClick={onHistory} className="flex flex-col items-center gap-1.5 p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all">
                    <History size={16}/>
                    <span className="text-[9px] font-black uppercase">سجل</span>
                </button>
            </div>
        </div>
    );
};

const FinancialAccountsPage: React.FC = () => {
    const navigate = useNavigate();
    const { settings } = useSettings();
    const { addToast } = useToasts();
    const [accounts, setAccounts] = useState<Treasury[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedHistoryAccount, setSelectedHistoryAccount] = useState<Treasury | null>(null);
    const [historyTransactions, setHistoryTransactions] = useState<any[]>([]);
    const [editingAccount, setEditingAccount] = useState<Treasury | null>(null);
    const [formData, setFormData] = useState({ name: '', balance: 0, currency: 'SAR' });
    const [searchTerm, setSearchTerm] = useState('');

    const fetchAccounts = async () => {
        const data = await api.getFinancialAccounts();
        setAccounts(data);
    };

    const fetchHistory = async (id: string) => {
        const allTransactions = await api.getTransactions();
        const accTransactions = allTransactions.filter((t: any) => t.treasuryId === id);
        setHistoryTransactions(accTransactions);
    };

    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [transferType, setTransferType] = useState<'deposit' | 'withdrawal'>('deposit');
    const [transferData, setTransferData] = useState({ amount: 0, treasuryId: '', selectedAccountId: '', description: '' });
    const [allTreasuries, setAllTreasuries] = useState<Treasury[]>([]);

    useEffect(() => {
        fetchAccounts();
        api.getTreasuries().then(t => setAllTreasuries(t));
    }, []);

    const handleDelete = async (id: string) => {
        const acc = accounts.find(a => a.id === id);
        if (acc && acc.balance !== 0) {
            addToast('لا يمكن حذف حساب مالي يحتوي على رصيد. يرجى تصفيره أولاً.', 'error');
            return;
        }
        const success = await api.deleteTreasury(id);
        if (success) {
            addToast('تم حذف الحساب بنجاح', 'success');
            fetchAccounts();
        } else {
            addToast('لا يمكن حذف الحساب (قد يكون الحساب الرئيسي)', 'error');
        }
    };

    const handleDeleteTransaction = async (txId: string) => {
        const success = await api.deleteTreasuryTransaction(txId);
        if (success) {
            addToast('تم حذف الحركة وتعديل الرصيد', 'success');
            fetchAccounts();
            if (selectedHistoryAccount) fetchHistory(selectedHistoryAccount.id);
        }
    };

    const handleSaveAccount = async () => {
        if (!formData.name) return;
        await api.saveTreasury({
            ...editingAccount,
            ...formData,
            type: 'bank'
        });
        addToast(editingAccount ? 'تم تعديل الحساب' : 'تم إضافة حساب جديد', 'success');
        setIsModalOpen(false);
        setEditingAccount(null);
        setFormData({ name: '', balance: 0, currency: 'SAR' });
        fetchAccounts();
    };

    const openEdit = (acc: Treasury) => {
        setEditingAccount(acc);
        setFormData({ name: acc.name, balance: acc.balance, currency: acc.currency });
        setIsModalOpen(true);
    };

    const openHistory = (acc: Treasury) => {
        setSelectedHistoryAccount(acc);
        fetchHistory(acc.id);
        setIsHistoryModalOpen(true);
    };

    const handleTransferSubmit = async () => {
        if (!transferData.treasuryId || transferData.amount <= 0) return;
        
        let fromId = '';
        let toId = '';
        let desc = transferData.description;

        if (transferType === 'withdrawal') {
            fromId = transferData.selectedAccountId;
            toId = transferData.treasuryId;
            desc = desc || `سحب من الحساب البنكي لخزينة`;
        } else {
            fromId = transferData.treasuryId;
            toId = transferData.selectedAccountId;
            desc = desc || `إيداع في الحساب البنكي من خزينة`;
        }

        const success = await api.transferFunds(fromId, toId, transferData.amount, desc);
        if (success) {
            addToast('تم التحويل بنجاح', 'success');
            setIsTransferModalOpen(false);
            setTransferData({ amount: 0, treasuryId: '', selectedAccountId: '', description: '' });
            fetchAccounts();
        } else {
            addToast('تأكد من الرصيد الكافي', 'error');
        }
    };

    const openTransfer = (acc: Treasury) => {
        setTransferData({ ...transferData, selectedAccountId: acc.id, treasuryId: allTreasuries.filter(t=>t.type!=='bank')?.[0]?.id || '' });
        setIsTransferModalOpen(true);
    };

    return (
        <div className="animate-fadeIn pb-20 space-y-12">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                <div className="space-y-2 text-center md:text-start">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                        <DollarSign size={12}/> إدارة الأصول والسيولة النقديـة
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-white tracking-tight">الحسابات والذمم</h1>
                    <p className="text-slate-500 font-bold text-lg">تحكم كامل في تدفقاتك النقدية ومراقبة دقيقة للأرصدة البنكية والديون.</p>
                </div>
                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="بحث باسم الحساب..." 
                            className="w-full pr-10 pl-4 h-14 bg-white dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 shadow-sm outline-none transition-all font-bold text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button onClick={() => navigate('/reports')} variant="secondary" className="flex-1 md:flex-none rounded-2xl font-black h-14 px-8"><Activity size={18} className="me-2"/> تحليل الميزانية</Button>
                    <Button onClick={() => { setEditingAccount(null); setFormData({ name: '', balance: 0, currency: 'SAR' }); setIsModalOpen(true); }} className="flex-1 md:flex-none rounded-2xl font-black h-14 px-10 shadow-2xl shadow-indigo-500/30">إضافة حساب مالي</Button>
                </div>
            </div>

            {/* Account Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {accounts.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase())).map(acc => (
                    <AccountCard key={acc.id} account={acc} onDelete={handleDelete} onEdit={openEdit} onHistory={() => openHistory(acc)} onTransfer={openTransfer} />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Net Value Summary */}
                <div className="lg:col-span-12">
                    <div className="bg-indigo-600 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden flex justify-between items-center group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        <div className="relative z-10">
                            <h3 className="text-2xl font-black mb-2">صافي القيمة الحالية</h3>
                            <p className="text-indigo-100/60 font-bold">إجمالي الأرصدة المتوفرة في كافة الخزائن والحسابات البنكية.</p>
                        </div>
                        <div className="relative z-10 text-end">
                            <p className="text-4xl font-black">{formatCurrency(accounts.reduce((a, b) => a + b.balance, 0), settings?.currency)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal for Add/Edit Account */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingAccount ? 'تعديل الحساب المالي' : 'إضافة حساب جديد'}>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">اسم الحساب (مثلاً: البنك الأهلي، كاش، فودافون كاش)</label>
                        <input 
                            type="text" 
                            value={formData.name} 
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-black" 
                            placeholder="اسم الحساب..."
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">الرصيد الافتتاحي</label>
                        <input 
                            type="number" 
                            value={formData.balance} 
                            onChange={e => setFormData({...formData, balance: parseFloat(e.target.value)||0})}
                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-black text-indigo-600" 
                            placeholder="0.00"
                        />
                    </div>
                    <Button onClick={handleSaveAccount} className="w-full h-14 rounded-2xl font-black text-lg">حفظ البيانات</Button>
                </div>
            </Modal>

            {/* Modal for Account History */}
            <Modal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} title={`سجل عمليات: ${selectedHistoryAccount?.name}`}>
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                    {historyTransactions.length === 0 ? (
                        <div className="p-10 text-center text-slate-400 font-bold">لا يوجد عمليات مسجلة لهذا الحساب.</div>
                    ) : (
                        historyTransactions.map((tx: any) => (
                            <div key={tx.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex justify-between items-center group">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${tx.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                        {tx.type === 'income' ? <ArrowUpRight size={18}/> : <ArrowDownLeft size={18}/>}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-700 dark:text-white">{tx.description}</p>
                                        <p className="text-[10px] text-slate-400 font-bold">{new Date(tx.date).toLocaleString('ar-EG')}</p>
                                    </div>
                                </div>
                                <div className="text-end flex items-center gap-4">
                                    <p className={`text-lg font-black ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, settings?.currency)}
                                    </p>
                                    <button 
                                        onClick={() => handleDeleteTransaction(tx.id)}
                                        className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Modal>

            {/* Transfer Modal */}
            <Modal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} title="تسجيل حركة مع خزينة">
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => setTransferType('withdrawal')}
                            className={`p-4 rounded-2xl border-2 font-black transition-all ${transferType === 'withdrawal' ? 'border-rose-500 bg-rose-50 text-rose-600' : 'border-slate-100 text-slate-400'}`}
                        >
                            سحب (إلى خزينة)
                        </button>
                        <button 
                            onClick={() => setTransferType('deposit')}
                            className={`p-4 rounded-2xl border-2 font-black transition-all ${transferType === 'deposit' ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-100 text-slate-400'}`}
                        >
                            إيداع (من خزينة)
                        </button>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">الخزينة</label>
                        <select 
                            value={transferData.treasuryId}
                            onChange={e => setTransferData({...transferData, treasuryId: e.target.value})}
                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-black"
                        >
                            {allTreasuries.filter(t => t.type !== 'bank').map(t => <option key={t.id} value={t.id}>{t.name} ({formatCurrency(t.balance, settings?.currency)})</option>)}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">المبلغ</label>
                        <input 
                            type="number" 
                            value={transferData.amount || ''}
                            onChange={e => setTransferData({...transferData, amount: parseFloat(e.target.value)||0})}
                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-black" 
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">البيان (اختياري)</label>
                        <input 
                            type="text" 
                            value={transferData.description}
                            onChange={e => setTransferData({...transferData, description: e.target.value})}
                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-black" 
                        />
                    </div>

                    <Button onClick={handleTransferSubmit} className="w-full h-14 rounded-2xl font-black text-lg">تأكيد الحركة</Button>
                </div>
            </Modal>
        </div>
    );
};

export default FinancialAccountsPage;
