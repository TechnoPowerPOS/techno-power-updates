
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/mockApi';
import type { Customer, CustomerDebtTransaction, Treasury } from '../types';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency, toArabicIndic } from '../utils/localization';
import { 
    Search, 
    Filter, 
    Plus, 
    HandCoins, 
    MessageCircle, 
    ChevronLeft, 
    AlertTriangle, 
    CheckCircle2, 
    ArrowUpRight, 
    ArrowDownLeft,
    Clock,
    History,
    MoreVertical,
    FileText,
    TrendingUp,
    Trash2
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import TableSkeleton from '../components/ui/TableSkeleton';

const CustomerDebtsPage: React.FC = () => {
    const { settings } = useSettings();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'debtor' | 'healthy'>('all');
    
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerTransactions, setCustomerTransactions] = useState<CustomerDebtTransaction[]>([]);
    const [loadingTransactions, setLoadingTransactions] = useState(false);

    const [isAddDebtModalOpen, setIsAddDebtModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [treasuries, setTreasuries] = useState<Treasury[]>([]);

    // Form states
    const [debtAmount, setDebtAmount] = useState('');
    const [debtDueDate, setDebtDueDate] = useState('');
    const [debtDescription, setDebtDescription] = useState('');

    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDescription, setPaymentDescription] = useState('');
    const [selectedTreasuryId, setSelectedTreasuryId] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [custs, trs] = await Promise.all([
                api.getCustomers(),
                api.getTreasuries()
            ]);
            setCustomers(custs);
            setTreasuries(trs);
            if (trs.length > 0) setSelectedTreasuryId(trs[0].id);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const fetchTransactions = useCallback(async (customerId: string) => {
        setLoadingTransactions(true);
        try {
            const trs = await api.getCustomerDebtTransactions(customerId);
            setCustomerTransactions(trs);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingTransactions(false);
        }
    }, []);

    useEffect(() => {
        if (selectedCustomer) {
            fetchTransactions(selectedCustomer.id);
        }
    }, [selectedCustomer, fetchTransactions]);

    const filteredCustomers = useMemo(() => {
        return customers.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                c.phone.includes(searchTerm);
            const matchesFilter = filterStatus === 'all' ? true : 
                                 filterStatus === 'debtor' ? c.debt > 0 : 
                                 c.debt === 0;
            return matchesSearch && matchesFilter;
        });
    }, [customers, searchTerm, filterStatus]);

    const stats = useMemo(() => {
        const total = customers.reduce((sum, c) => sum + (c.debt || 0), 0);
        const debtorsCount = customers.filter(c => c.debt > 0).length;
        const largeDebts = customers.filter(c => c.debt > 5000).length; // Thresold 5000
        return { total, debtorsCount, largeDebts };
    }, [customers]);

    const handleAddDebt = async () => {
        if (!selectedCustomer || !debtAmount) return;
        const success = await api.addCustomerDebt(
            selectedCustomer.id, 
            parseFloat(debtAmount), 
            debtDueDate, 
            debtDescription
        );
        if (success) {
            setIsAddDebtModalOpen(false);
            setDebtAmount('');
            setDebtDueDate('');
            setDebtDescription('');
            fetchData();
            fetchTransactions(selectedCustomer.id);
            // Refresh detail to show updated debt
            const updatedCust = (await api.getCustomers()).find(c => c.id === selectedCustomer.id);
            if (updatedCust) setSelectedCustomer(updatedCust);
        }
    };

    const handleRecordPayment = async () => {
        if (!selectedCustomer || !paymentAmount || !selectedTreasuryId) return;
        const success = await api.recordCustomerPayment(
            selectedCustomer.id,
            parseFloat(paymentAmount),
            paymentDescription,
            selectedTreasuryId
        );
        if (success) {
            setIsPaymentModalOpen(false);
            setPaymentAmount('');
            setPaymentDescription('');
            fetchData();
            fetchTransactions(selectedCustomer.id);
            // Refresh detail
            const updatedCust = (await api.getCustomers()).find(c => c.id === selectedCustomer.id);
            if (updatedCust) setSelectedCustomer(updatedCust);
        }
    };

    const sendWhatsAppMessage = (customer: Customer) => {
        const message = `مرحباً ${customer.name}، نود تذكيركم بأن إجمالي المديونية المستحقة لديكم هي ${formatCurrency(customer.debt, settings?.currency || 'SAR')}. يرجى السداد في أقرب وقت. شكراً لكم.`;
        window.open(`https://wa.me/${customer.phone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    if (loading || !settings) return <div className="p-6"><TableSkeleton cols={5} /></div>;

    const currency = settings.currency || 'SAR';

    return (
        <div className="p-4 md:p-6 space-y-6 dir-rtl max-h-screen overflow-y-auto custom-scrollbar pb-20">
            {/* Header and Quick Stats */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white">إدارة مديونيات العملاء</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">تتبع المديونيات، التحصيلات، والتنبيهات بشكل مفصل</p>
                </div>
                <div className="flex gap-2">
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-none relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-indigo-100 text-sm font-bold opacity-80 uppercase tracking-wider">إجمالي المديونيات</p>
                        <h3 className="text-3xl font-black mt-1">{formatCurrency(stats.total, currency)}</h3>
                        <div className="flex items-center gap-1 mt-4 text-indigo-100 text-xs">
                            <TrendingUp size={14} />
                            <span>موزعة على {toArabicIndic(stats.debtorsCount)} عميل</span>
                        </div>
                    </div>
                    <ArrowUpRight className="absolute -bottom-4 -left-4 w-24 h-24 text-white opacity-10" />
                </Card>

                <Card className="p-6 bg-white dark:bg-slate-900 border-none shadow-premium">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">عملاء مدينون</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white mt-1">{toArabicIndic(stats.debtorsCount)}</h3>
                        </div>
                        <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-2xl">
                            <AlertTriangle size={24} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                        <p className="text-xs text-rose-600 font-bold">يتطلب المتابعة الفورية</p>
                    </div>
                </Card>

                <Card className="p-6 bg-white dark:bg-slate-900 border-none shadow-premium">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">مديونيات كبيرة (+5000)</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white mt-1">{toArabicIndic(stats.largeDebts)}</h3>
                        </div>
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-2xl">
                            <TrendingUp size={24} />
                        </div>
                    </div>
                    <div className="mt-4 text-xs text-slate-500 font-bold">
                        تنبيه للديون المتجاوزة للحد الائتماني
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Customer List */}
                <div className={`lg:col-span-${selectedCustomer ? '5' : '12'} space-y-6 transition-all duration-300`}>
                    <Card className="p-0 border-none shadow-premium overflow-hidden">
                        <div className="p-4 border-b dark:border-slate-800 flex flex-col md:flex-row gap-4 md:items-center justify-between">
                            <div className="relative flex-1">
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="بحث عن عميل بالاسم أو الهاتف..." 
                                    className="w-full pr-10 pl-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setFilterStatus('all')}
                                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${filterStatus === 'all' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-500'}`}
                                >الكل</button>
                                <button 
                                    onClick={() => setFilterStatus('debtor')}
                                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${filterStatus === 'debtor' ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-500'}`}
                                >مدينون</button>
                                <button 
                                    onClick={() => setFilterStatus('healthy')}
                                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${filterStatus === 'healthy' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-500'}`}
                                >سليم</button>
                            </div>
                        </div>
                        
                        <div className="overflow-x-auto overflow-y-auto max-h-[500px] custom-scrollbar">
                            <table className="w-full text-sm text-start">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-black text-slate-400">
                                    <tr>
                                        <th className="px-6 py-4">العميل</th>
                                        <th className="px-6 py-4">الهاتف</th>
                                        <th className="px-6 py-4 text-center">إجمالي الدين</th>
                                        <th className="px-6 py-4 text-center">الحالة</th>
                                        <th className="px-6 py-4 text-start"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-slate-800">
                                    {filteredCustomers.map(customer => (
                                        <tr key={customer.id} 
                                            onClick={() => setSelectedCustomer(customer)}
                                            className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors ${selectedCustomer?.id === customer.id ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}
                                        >
                                            <td className="px-6 py-4">
                                                <p className="font-black text-slate-800 dark:text-white">{customer.name}</p>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 font-bold">{toArabicIndic(customer.phone)}</td>
                                            <td className={`px-6 py-4 text-center font-black ${customer.debt > 0 ? 'text-rose-500 font-black text-base' : 'text-slate-400 font-medium'}`}>
                                                {formatCurrency(customer.debt, currency)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {customer.debt > 0 ? (
                                                    <span className="px-3 py-1 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-full text-[10px] font-black underline-offset-4">مدين</span>
                                                ) : (
                                                    <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-full text-[10px] font-black">سليم</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 justify-end">
                                                    <button 
                                                        title="مراسلة"
                                                        onClick={(e) => { e.stopPropagation(); sendWhatsAppMessage(customer); }}
                                                        className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors"
                                                    >
                                                        <MessageCircle size={18} />
                                                    </button>
                                                   <button className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-xl hover:text-indigo-600 transition-colors">
                                                        <ChevronLeft size={18} />
                                                   </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {filteredCustomers.length === 0 && (
                            <div className="py-20 text-center text-slate-400">
                                <Search size={48} className="mx-auto mb-4 opacity-10" />
                                <p className="font-bold">لم يتم العثور على عملاء يطابقون البحث</p>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Customer Details Section */}
                {selectedCustomer && (
                    <div className="lg:col-span-7 space-y-6 animate-slideInLeft relative lg:sticky lg:top-4 h-full">
                        <Card className="p-0 border-none shadow-2xl dark:shadow-indigo-900/10 overflow-hidden ring-1 ring-slate-200 dark:ring-white/5">
                            {/* Detail Header */}
                            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h2 className="text-xl font-black text-slate-800 dark:text-white">{selectedCustomer.name}</h2>
                                        <span className="text-[10px] font-black px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded-md text-slate-500">ID: {selectedCustomer.id}</span>
                                    </div>
                                    <p className="text-slate-500 font-bold text-sm tracking-widest">{toArabicIndic(selectedCustomer.phone)}</p>
                                </div>
                                <div className="flex gap-2 w-full md:w-auto">
                                    <Button size="sm" variant="outline" className="flex-1 md:flex-none border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 rounded-xl" onClick={() => setIsPaymentModalOpen(true)}>
                                        <ArrowDownLeft size={16} />
                                        تحصيل دفعة
                                    </Button>
                                    <Button size="sm" variant="primary" className="flex-1 md:flex-none bg-rose-600 hover:bg-rose-700 rounded-xl" onClick={() => setIsAddDebtModalOpen(true)}>
                                        <ArrowUpRight size={16} />
                                        إضافة دين
                                    </Button>
                                    <button 
                                        onClick={() => setSelectedCustomer(null)}
                                        className="p-2 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl text-slate-400 hover:text-rose-500 transition-colors"
                                    >
                                        <ChevronLeft className="rotate-180" size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Detail Info */}
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                    <div className="p-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl shadow-sm text-center">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">الرصيد المستحق</p>
                                        <p className={`text-2xl font-black ${selectedCustomer.debt > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{formatCurrency(selectedCustomer.debt, currency)}</p>
                                    </div>
                                    <div className="p-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl shadow-sm text-center">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">إجمالي المدفوع</p>
                                        <p className="text-2xl font-black text-emerald-600">{formatCurrency(customerTransactions.filter(t => t.type.toLowerCase() === 'payment').reduce((s, t) => s + t.amount, 0), currency)}</p>
                                    </div>
                                    <div className="p-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl shadow-sm text-center">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">آخر عملية</p>
                                        <p className="text-sm font-black text-slate-800 dark:text-white mt-2">
                                            {customerTransactions.length > 0 ? new Date(customerTransactions[0].date).toLocaleDateString('ar-EG') : '---'}
                                        </p>
                                    </div>
                                </div>

                                <h3 className="font-black text-xs text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <History size={14} className="text-indigo-500" /> سجـــل العمليـــات
                                </h3>

                                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {loadingTransactions ? (
                                        <div className="space-y-3">
                                            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl animate-pulse"></div>)}
                                        </div>
                                    ) : customerTransactions.length === 0 ? (
                                        <div className="text-center py-10 text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                            <FileText size={40} className="mx-auto mb-2 opacity-20" />
                                            <p className="text-xs font-bold uppercase tracking-widest">لا يوجد سجل عمليات لهذا العميل</p>
                                        </div>
                                    ) : (
                                        customerTransactions.map(transaction => (
                                            <div key={transaction.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl shadow-premium group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all border-r-4 border-r-transparent hover:border-r-indigo-500">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-3 rounded-xl ${transaction.type === 'Debt' ? 'bg-rose-50 text-rose-500 dark:bg-rose-900/20' : 'bg-emerald-50 text-emerald-500 dark:bg-emerald-900/20'}`}>
                                                        {transaction.type === 'Debt' ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-black text-slate-800 dark:text-white">{transaction.type === 'Debt' ? 'إضافة دين' : 'سداد دفعة'}</p>
                                                            {transaction.dueDate && (
                                                                <span className="flex items-center gap-1 text-[8px] font-black bg-amber-50 text-amber-600 px-2 py-0.5 rounded uppercase">
                                                                    <Clock size={8} /> استحقاق: {new Date(transaction.dueDate).toLocaleDateString('ar-EG')}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">{transaction.description || 'لا يوجد وصف'}</p>
                                                        <p className="text-[8px] text-slate-300 font-bold mt-0.5">{new Date(transaction.date).toLocaleString('ar-EG')}</p>
                                                    </div>
                                                </div>
                                                <div className="text-end px-2 flex items-center gap-4">
                                                    <div>
                                                        <p className={`text-lg font-black ${transaction.type === 'Debt' ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                            {transaction.type === 'Debt' ? '+' : '-'}{formatCurrency(transaction.amount, currency)}
                                                        </p>
                                                        <p className="text-[10px] text-slate-300 font-bold mt-0.5">{new Date(transaction.date).toLocaleString('ar-EG')}</p>
                                                    </div>
                                                    <button 
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            if (window.confirm('هل أنت متأكد من حذف هذه الحركة؟ سيتم تعديل مديونية العميل تلقائياً.')) {
                                                                await api.deleteCustomerTransaction(transaction.id);
                                                                fetchData();
                                                                fetchTransactions(selectedCustomer.id);
                                                            }
                                                        }}
                                                        className="p-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </Card>
                    </div>
                )}
            </div>

            {/* Modals */}
            <Modal
                isOpen={isAddDebtModalOpen}
                onClose={() => setIsAddDebtModalOpen(false)}
                title={`إضافة دين جديد - ${selectedCustomer?.name}`}
            >
                <div className="space-y-4 p-2 dir-rtl">
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">المبلغ المستحق</label>
                        <input 
                            type="number" 
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none outline-none focus:ring-2 focus:ring-rose-500 font-black text-xl"
                            placeholder="0.00"
                            value={debtAmount}
                            onChange={(e) => setDebtAmount(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">تاريخ الاستحقاق (اختياري)</label>
                        <input 
                            type="date" 
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none outline-none focus:ring-2 focus:ring-indigo-500"
                            value={debtDueDate}
                            onChange={(e) => setDebtDueDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">ملاحظات / السبب</label>
                        <textarea 
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
                            placeholder="مثال: سحب بضاعة بالأجل، خدمات إضافية..."
                            value={debtDescription}
                            onChange={(e) => setDebtDescription(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <Button className="flex-1 py-4 bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-600/10 font-black" onClick={handleAddDebt}>
                            تأكيد إضافة الدين
                        </Button>
                        <Button variant="outline" className="px-6" onClick={() => setIsAddDebtModalOpen(false)}>إلغاء</Button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                title={`تحصيل دفعة مالية - ${selectedCustomer?.name}`}
            >
                <div className="space-y-4 p-2 dir-rtl">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl flex items-center justify-between">
                         <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">الدين المتبقي للعميل</p>
                         <p className="text-xl font-black text-emerald-600">{formatCurrency(selectedCustomer?.debt || 0, currency)}</p>
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">المبلغ المدفوع</label>
                        <input 
                            type="number" 
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none outline-none focus:ring-2 focus:ring-emerald-500 font-black text-xl"
                            placeholder="0.00"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">إيداع في خزينة</label>
                        <select 
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none outline-none focus:ring-2 focus:ring-indigo-500"
                            value={selectedTreasuryId}
                            onChange={(e) => setSelectedTreasuryId(e.target.value)}
                        >
                            {treasuries.map(t => <option key={t.id} value={t.id}>{t.name} ({formatCurrency(t.balance, currency)})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">ملاحظات / السند</label>
                        <textarea 
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
                            placeholder="رقم سند القبض، ملاحظات الدفع..."
                            value={paymentDescription}
                            onChange={(e) => setPaymentDescription(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <Button className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/10 font-black" onClick={handleRecordPayment}>
                            تأكيد التحصيل
                        </Button>
                        <Button variant="outline" className="px-6" onClick={() => setIsPaymentModalOpen(false)}>إلغاء</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default CustomerDebtsPage;
