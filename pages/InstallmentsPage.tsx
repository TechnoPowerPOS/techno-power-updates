
import React, { useState, useEffect, useCallback, Fragment } from 'react';
import type { InstallmentPlan } from '../types';
import Card from '../components/ui/Card';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency, toArabicIndic } from '../utils/localization';
import { ChevronDown, CheckCircle, Clock, XCircle, Calendar, Banknote, Search, Trash2, Edit } from 'lucide-react';
import Button from '../components/ui/Button';
import RecordPaymentModal from '../components/installments/RecordPaymentModal';
import EditInstallmentPlanModal from '../components/installments/EditInstallmentPlanModal';
import TableSkeleton from '../components/ui/TableSkeleton';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToasts } from '../hooks/useToasts';
import { api as mockApi } from '../services/mockApi';

const InstallmentsPage: React.FC = () => {
    const [plans, setPlans] = useState<InstallmentPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
    const [paymentToRecordId, setPaymentToRecordId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Paid Off'>('All');
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [editPlan, setEditPlan] = useState<InstallmentPlan | null>(null);
    
    const { settings } = useSettings();
    const { addToast } = useToasts();

    const fetchPlans = useCallback(async () => {
        setLoading(true);
        try {
            const data = await mockApi.getInstallmentPlans();
            setPlans(data);
        } catch (e) {
            console.error("Failed to fetch installments", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPlans();
    }, [fetchPlans]);

    const handleToggleExpand = (planId: string) => {
        setExpandedPlanId(prev => (prev === planId ? null : planId));
    };

    const handleRecordPaymentSuccess = () => {
        setPaymentToRecordId(null);
        fetchPlans();
    };
    
    const getPlanStatusChip = (status: string) => {
        switch (status) {
            case 'Active': return <span className="px-2 py-1 text-[10px] font-black text-blue-800 bg-blue-100 rounded-full dark:bg-blue-900/40 dark:text-blue-300">نشطة</span>;
            case 'Paid Off': return <span className="px-2 py-1 text-[10px] font-black text-green-800 bg-green-100 rounded-full dark:bg-green-900/40 dark:text-green-300">مدفوعة بالكامل</span>;
            default: return <span className="px-2 py-1 text-[10px] font-black text-slate-500 bg-slate-100 rounded-full">غير معروف</span>;
        }
    };
    
    const getPaymentStatusIcon = (status: 'Pending' | 'Paid' | 'Overdue') => {
        if (status === 'Paid') return <CheckCircle className="text-green-500" size={18}/>;
        if (status === 'Overdue') return <XCircle className="text-red-500" size={18} />;
        return <Clock className="text-yellow-500" size={18} />;
    };
    
    const checkOverdue = (dueDate: string, status: string) => {
        if (status === 'Paid') return 'Paid';
        if (!dueDate) return 'Pending';
        const today = new Date();
        today.setHours(0,0,0,0);
        return new Date(dueDate) < today ? 'Overdue' : 'Pending';
    };

    const handleDeletePlanConfirm = (id: string) => {
        const plan = plans.find(p => p.id === id);
        if (plan) {
            if (plan.remainingAmount > 0 && plan.payments.some(p => p.status === 'Paid')) {
                addToast('عذراً، لا يمكن حذف خطة تقسيط تم تسديد بعض دفعاتها ولم يتم تصفيتها بالكامل.', 'warning');
                return;
            }
        }
        setConfirmDeleteId(id);
    };

    const handleEditSuccess = () => {
        setEditPlan(null);
        fetchPlans();
    };

    const handleDeletePlan = async () => {
        if(!confirmDeleteId) return;
        try {
            await mockApi.deleteInstallmentPlan(confirmDeleteId);
            addToast('تم حذف خطة التقسيط بنجاح', 'success');
            fetchPlans();
        } catch (e: any) {
            addToast(e.message || 'فشل حذف خطة التقسيط', 'error');
        } finally {
            setConfirmDeleteId(null);
        }
    };

    const filteredPlans = plans.filter(p => {
        const matchesSearch = p.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || p.saleId.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' ? true : p.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    if (loading || !settings) {
        return (
             <div className="animate-fadeIn">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white">إدارة الأقساط والتحصيل</h1>
                </div>
                <Card className="p-0 border-none shadow-premium"><TableSkeleton cols={5} /></Card>
            </div>
        )
    };

    const currency = settings.currency || 'SAR';

    return (
        <div className="animate-fadeIn pb-10">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white">إدارة الأقساط والتحصيل</h1>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="بحث بالعميل أو الطلب..." 
                            className="w-full pr-10 pl-4 py-2.5 bg-white dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 shadow-sm outline-none transition-all font-bold text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="py-2.5 px-4 bg-white dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 shadow-sm outline-none transition-all font-bold text-sm"
                    >
                        <option value="All">جميع الحالات</option>
                        <option value="Active">نشطة</option>
                        <option value="Paid Off">مدفوعة بالكامل</option>
                    </select>
                </div>
            </div>
            <Card className="p-0 border-none shadow-premium overflow-hidden">
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-start">
                        <thead className="text-[10px] font-black uppercase text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-4 w-10"></th>
                                <th className="px-6 py-4">العميل</th>
                                <th className="px-6 py-4 text-center">الإجمالي بالفائدة</th>
                                <th className="px-6 py-4 text-center">المتبقي</th>
                                <th className="px-6 py-4 text-center">الحالة</th>
                                <th className="px-6 py-4 text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-slate-800">
                            {filteredPlans.map((plan, index) => (
                                <Fragment key={plan.id}>
                                    <tr 
                                        className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-all animate-slideDown"
                                        style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'backwards' }}
                                        onClick={() => handleToggleExpand(plan.id)}
                                    >
                                        <td className="px-6 py-4">
                                            <ChevronDown size={18} className={`transition-transform duration-300 ${expandedPlanId === plan.id ? 'rotate-180 text-indigo-600' : 'text-slate-400'}`} />
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-black text-slate-800 dark:text-white">{plan.customerName || 'عميل غير معروف'}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Sale: {(plan.saleId || '').toUpperCase()}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold">{formatCurrency(plan.totalWithInterest || 0, currency)}</td>
                                        <td className={`px-6 py-4 text-center font-black ${plan.remainingAmount > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{formatCurrency(plan.remainingAmount || 0, currency)}</td>
                                        <td className="px-6 py-4 text-center">{getPlanStatusChip(plan.status)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex gap-2 justify-center">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setEditPlan(plan); }} 
                                                    className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all"
                                                    title="تعديل القسط"
                                                >
                                                    <Edit size={16}/>
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleDeletePlanConfirm(plan.id); }} 
                                                    className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                                                    title="حذف القسط"
                                                >
                                                    <Trash2 size={16}/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedPlanId === plan.id && (
                                        <tr className="bg-slate-50 dark:bg-slate-800/50 animate-fadeIn">
                                            <td colSpan={6} className="p-6">
                                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                                                    <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border shadow-sm text-center">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">الدفعة المقدمة</p>
                                                        <p className="font-black text-emerald-600">{formatCurrency(plan.downPayment || 0, currency)}</p>
                                                    </div>
                                                    <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border shadow-sm text-center">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">نسبة الفائدة</p>
                                                        <p className="font-black text-amber-600">{toArabicIndic(plan.interestRate || 0)}%</p>
                                                    </div>
                                                     <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border shadow-sm text-center">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">قيمة الفائدة</p>
                                                        <p className="font-black text-amber-600">{formatCurrency(plan.interestAmount || 0, currency)}</p>
                                                    </div>
                                                    <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border shadow-sm text-center">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">القسط الشهري</p>
                                                        <p className="font-black text-indigo-600">{formatCurrency(plan.monthlyPayment || 0, currency)}</p>
                                                    </div>
                                                    <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border shadow-sm text-center">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">عدد الأقساط</p>
                                                        <p className="font-black">{toArabicIndic(plan.numberOfInstallments || 0)} شهر</p>
                                                    </div>
                                                </div>
                                                
                                                <h4 className="font-black text-xs text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                    <Calendar size={14}/> جدول الدفعات المستحقة
                                                </h4>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {Array.isArray(plan.payments) && plan.payments.map((p, pIdx) => {
                                                        const status = checkOverdue(p.dueDate, p.status);
                                                        const isPreviousUnpaid = plan.payments.slice(0, pIdx).some(prev => prev.status !== 'Paid');
                                                        return (
                                                            <div key={p.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 shadow-sm group hover:border-indigo-300 transition-colors">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:text-indigo-600 transition-colors">
                                                                        {getPaymentStatusIcon(status as any)}
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-black text-xs">دفعة #{toArabicIndic(pIdx + 1)}</p>
                                                                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">استحقاق: {p.dueDate ? new Date(p.dueDate).toLocaleDateString('ar-EG') : '---'}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-4">
                                                                    <div className="text-end">
                                                                        <p className="font-black text-sm text-slate-800 dark:text-white">{formatCurrency(p.amount || 0, currency)}</p>
                                                                        {p.status === 'Paid' && <p className="text-[8px] font-black text-emerald-500 uppercase">تم التحصيل</p>}
                                                                    </div>
                                                                    {(p.status === 'Pending' || p.status === 'Overdue') && (
                                                                        <Button size="sm" onClick={(e) => { 
                                                                            e.stopPropagation(); 
                                                                            if (isPreviousUnpaid) { addToast('عذراً، يجب سداد الأقساط السابقة أولاً', 'error'); return; }
                                                                            setPaymentToRecordId(p.id); 
                                                                        }} 
                                                                        className={`rounded-xl h-9 px-4 text-[10px] font-black ${isPreviousUnpaid ? 'bg-slate-300 text-slate-500 border-none' : 'bg-emerald-600 shadow-emerald-500/10'}`}>
                                                                            تحصيل
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                    {(!Array.isArray(plan.payments) || plan.payments.length === 0) && (
                                                        <div className="col-span-full text-center p-4 text-slate-400 font-bold text-xs bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 overflow-hidden">
                                                            لم يتم جدولة دفعات لهذه الخطة
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                    {plans.length === 0 && (
                        <div className="text-center py-32 text-slate-400">
                            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 opacity-40">
                                <Banknote size={40}/>
                            </div>
                            <p className="font-black text-lg">لا يوجد خطط تقسيط مسجلة</p>
                        </div>
                    )}
                 </div>
            </Card>
            {paymentToRecordId && (
                <RecordPaymentModal
                    isOpen={!!paymentToRecordId}
                    onClose={() => setPaymentToRecordId(null)}
                    onSuccess={handleRecordPaymentSuccess}
                    paymentId={paymentToRecordId}
                />
            )}
            {editPlan && (
                <EditInstallmentPlanModal
                    isOpen={!!editPlan}
                    onClose={() => setEditPlan(null)}
                    onSuccess={() => { setEditPlan(null); fetchPlans(); }}
                    plan={editPlan}
                />
            )}
            <ConfirmDialog 
                isOpen={!!confirmDeleteId} 
                onClose={() => setConfirmDeleteId(null)} 
                onConfirm={handleDeletePlan} 
                title="تأكيد حذف الخطة" 
                message="هل أنت متأكد من حذف خطة التقسيط؟ سيتم إزالة جميع العمليات المرتبطة بها."
            />
        </div>
    );
};

export default InstallmentsPage;
