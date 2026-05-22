
import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, limit, writeBatch, doc, deleteDoc, updateDoc, serverTimestamp, where, increment } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { api } from '../../services/mockApi';
import { handleFirestoreError, OperationType } from '../../services/firestoreErrorHandler';
import { useToasts } from '../../hooks/useToasts';
import { Wallet, DollarSign, Users, Calendar, Download, Filter, Search, CheckCircle2, AlertCircle, RefreshCcw, Trash2, Edit3, Banknote } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/layout/PageHeader';
import Modal from '../../components/ui/Modal';

import { useSettings } from '../../hooks/useSettings';

interface SalaryRecord {
    id: string;
    employeeName: string;
    basicSalary: number;
    allowances: number;
    deductions: number;
    netSalary: number;
    month: string;
    status: 'Processed' | 'Pending' | 'Paid';
}

import { formatCurrency } from '../../utils/localization';

const PayrollPage: React.FC = () => {
    const { settings } = useSettings();
    const { addToast } = useToasts();
    const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
    const [treasuries, setTreasuries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Pay Modal
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [selectedSal, setSelectedSal] = useState<SalaryRecord | null>(null);
    const [selectedTreasuryId, setSelectedTreasuryId] = useState('');
    const [isPaying, setIsPaying] = useState(false);

    useEffect(() => {
        fetchSalaries();
        fetchTreasuries();
    }, []);

    const fetchSalaries = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'hr_payroll'), orderBy('month', 'desc'), limit(100));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalaryRecord));
            setSalaries(data);
        } catch (error) {
            handleFirestoreError(error, OperationType.GET, 'hr_payroll');
        } finally {
            setLoading(false);
        }
    };

    const fetchTreasuries = async () => {
        try {
            const snap = await getDocs(collection(db, 'treasuries'));
            setTreasuries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error("Failed to fetch treasuries", error);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'hr_payroll', id));
            setSalaries(prev => prev.filter(s => s.id !== id));
            addToast('تم حذف السجل بنجاح', 'success');
        } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, 'hr_payroll');
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: SalaryRecord['status']) => {
        try {
            await updateDoc(doc(db, 'hr_payroll', id), { status: newStatus });
            setSalaries(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
            addToast(`تم تحديث الحالة إلى ${newStatus === 'Paid' ? 'تم الصرف' : newStatus === 'Processed' ? 'معتمد' : 'معلق'}`, 'success');
        } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, 'hr_payroll');
        }
    };

    const handlePay = async () => {
        if (!selectedSal) return;
        if (!selectedTreasuryId) {
            addToast('يرجى اختيار الخزينة أولاً', 'warning');
            return;
        }
        if (selectedSal.status === 'Paid') {
            addToast('هذا الراتب تم صرفه بالفعل', 'warning');
            setIsPayModalOpen(false);
            return;
        }
        
        setIsPaying(true);
        try {
            const batch = writeBatch(db);
            
            // 1. Find selected treasury
            const treasury = treasuries.find(t => t.id === selectedTreasuryId);
            if (!treasury) {
                addToast('الخزينة المختارة غير موجودة', 'error');
                setIsPaying(false);
                return;
            }

            if ((treasury.balance || 0) < selectedSal.netSalary) {
                if (!window.confirm(`رصيد الخزينة (${treasury.balance || 0}) أقل من مبلغ الراتب (${selectedSal.netSalary}). هل تريد المتابعة (سيكون الرصيد سالباً)؟`)) {
                    setIsPaying(false);
                    return;
                }
            }
            
            const treasuryRef = doc(db, 'treasuries', selectedTreasuryId);
            batch.update(treasuryRef, { balance: increment(-selectedSal.netSalary) });

            // 2. Create Treasury Transaction
            const transRef = doc(collection(db, 'treasury_transactions'));
            batch.set(transRef, {
                treasuryId: selectedTreasuryId,
                type: 'Expense',
                amount: selectedSal.netSalary,
                description: `صرف راتب شهر ${selectedSal.month} للموظف ${selectedSal.employeeName}`,
                date: new Date().toISOString(),
                refId: selectedSal.id,
                category: 'رواتب'
            });

            // 3. Create Expense Record
            const expenseRef = doc(collection(db, 'acc_expenses'));
            batch.set(expenseRef, {
                amount: selectedSal.netSalary,
                category: 'رواتب وأجور',
                description: `راتب شهر ${selectedSal.month} - ${selectedSal.employeeName}`,
                paidTo: selectedSal.employeeName,
                date: new Date().toISOString(),
                status: 'Paid',
                refId: selectedSal.id,
                treasuryId: selectedTreasuryId
            });

            // 4. Update Payroll Status
            const payrollRef = doc(db, 'hr_payroll', selectedSal.id);
            batch.update(payrollRef, { 
                status: 'Paid', 
                paidAt: serverTimestamp(), 
                paidByTreasury: selectedTreasuryId 
            });

            await batch.commit();
            addToast('تم صرف الراتب وتحديث الحسابات بنجاح', 'success');
            
            // Update local state
            setSalaries(prev => prev.map(s => s.id === selectedSal.id ? { ...s, status: 'Paid' } : s));
            
            setIsPayModalOpen(false);
            setSelectedSal(null);
            fetchTreasuries(); // Refresh balance cache
        } catch (error) {
            console.error("Payment failed:", error);
            addToast('حدث خطأ أثناء صرف الراتب: ' + (error instanceof Error ? error.message : 'خطأ غير معروف'), 'error');
        } finally {
            setIsPaying(false);
        }
    };

    const generatePayroll = async () => {
        const currentMonth = new Date().toISOString().substring(0, 7);
        const existing = salaries.filter(s => s.month === currentMonth);
        if (existing.length > 0) {
            if (existing.some(s => s.status === 'Paid')) {
                addToast('لا يمكن إعادة توليد كشف الرواتب لأنه يحتوي على رواتب تم صرفها', 'error');
                return;
            }
            if (!window.confirm('كشف الرواتب لهذا الشهر موجود بالفعل، هل تريد إعادة توليده؟ (سيتم تحديث البيانات الحالية)')) return;
        }

        setIsGenerating(true);
        try {
            // 1. Fetch all active employees
            const empSnapshot = await getDocs(collection(db, 'hr_personnel'));
            const employees = empSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

            if (employees.length === 0) {
                addToast('لا يوجد موظفين مسجلين', 'warning');
                return;
            }

            // 2. Fetch approved vacation deductions for this month
            const requestsQ = query(
                collection(db, 'hr_requests'), 
                where('status', '==', 'Approved'),
                where('type', '==', 'Vacation')
            );
            const requestsSnap = await getDocs(requestsQ);
            
            // 3. Fetch sales to calculate commissions
            const allSales = await api.getSales();
            const monthlySales = allSales.filter((s:any) => s.date.startsWith(currentMonth));
            
            const batch = writeBatch(db);
            
            for (const emp of employees) {
                const payrollId = `${emp.id}_${currentMonth}`;
                const basic = (emp as any).salary || 0;
                let allowances = 0;
                let deductions = 0;
                let commissions = 0;
                
                // Calculate commissions from sales
                monthlySales.forEach((sale: any) => {
                    if (sale.employeeId === emp.id) {
                        // Some sales might already record commissionAmount
                        if (sale.commissionAmount) {
                            commissions += sale.commissionAmount;
                        } else if ((emp as any).commissionPercentage) {
                            // Or we calculate based on the employee's commission percentage
                            // provided the discount wasn't above maxDiscountLimit
                            let discountPercent = 0;
                            if (sale.subtotal > 0) {
                                discountPercent = (sale.discount / sale.subtotal) * 100;
                            }
                            const maxAllowed = (emp as any).maxDiscountLimit || 100; // if 0, then maybe they can't discount?
                            if (discountPercent <= maxAllowed) {
                                commissions += ((sale.total || sale.subtotal) * ((emp as any).commissionPercentage / 100));
                            }
                        }
                    }
                });
                
                // Calculate dynamic deductions from vacations
                requestsSnap.docs.forEach(d => {
                    const req = d.data();
                    if (req.employeeId === emp.id && req.startDate && req.startDate.startsWith(currentMonth)) {
                        deductions += (req.deductionAmount || 0);
                    }
                });
                
                allowances += commissions;

                const payrollData = {
                    employeeName: (emp as any).name,
                    employeeId: emp.id,
                    basicSalary: basic,
                    allowances,
                    deductions,
                    commissions,
                    netSalary: basic + allowances - deductions,
                    month: currentMonth,
                    status: 'Pending',
                    createdAt: serverTimestamp()
                };
                
                const ref = doc(db, 'hr_payroll', payrollId);
                batch.set(ref, payrollData);
            }

            await batch.commit();
            addToast('تم توليد كشف الرواتب بنجاح', 'success');
            fetchSalaries();
        } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, 'hr_payroll');
        } finally {
            setIsGenerating(false);
        }
    };

    const totalNet = salaries
        .filter(s => s.month === new Date().toISOString().substring(0, 7))
        .reduce((sum, s) => sum + s.netSalary, 0);

    return (
        <div className="space-y-6">
            <PageHeader title="إدارة المرتبات والأجور" subtitle="حساب الرواتب، البدلات، والاقتطاعات الشهرية للموظفين" />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6 bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-800/30">
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">صافي الرواتب (هذا الشهر)</p>
                    <p className="text-2xl font-black text-indigo-700 dark:text-indigo-400">{formatCurrency(totalNet)}</p>
                </Card>
                <Card className="p-6 bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/30">
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">حالة الصرف</p>
                    <p className="text-lg font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                        <CheckCircle2 size={18} /> انتظار الاعتماد
                    </p>
                </Card>
            </div>

            <Card className="overflow-hidden border border-slate-100 dark:border-slate-800 font-bold">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center bg-slate-50/50 dark:bg-slate-900 gap-4">
                    <h3 className="font-black text-lg">كشف الرواتب لشهر {new Date().toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })}</h3>
                    <div className="flex gap-2 w-full md:w-auto">
                        <Button 
                            onClick={generatePayroll}
                            disabled={isGenerating}
                            className="flex-1 md:flex-none bg-indigo-600 rounded-xl px-4 h-10 text-xs font-black"
                        >
                            {isGenerating ? <RefreshCcw size={14} className="animate-spin" /> : 'احتساب الرواتب'}
                        </Button>
                        <Button variant="outline" className="flex-1 md:flex-none rounded-xl px-4 h-10 text-xs font-black">
                            <Download size={14} className="me-2" /> تصدير PDF
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                                <th className="px-6 py-4">الموظف</th>
                                <th className="px-6 py-4">الراتب الأساسي</th>
                                <th className="px-6 py-4">البدلات</th>
                                <th className="px-6 py-4 text-rose-500">الاستقطاعات</th>
                                <th className="px-6 py-4 text-emerald-600">صافي المستحق</th>
                                <th className="px-6 py-4 text-center">الحالة</th>
                                <th className="px-6 py-4 text-center">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                             {loading ? (
                                Array(5).fill(0).map((_, i) => <tr key={i}><td colSpan={7} className="p-4"><div className="h-4 bg-slate-100 dark:bg-slate-800 animate-pulse rounded"></div></td></tr>)
                             ) : salaries.length > 0 ? (
                                 salaries.map(sal => (
                                     <tr key={sal.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                         <td className="px-6 py-4 font-black">{sal.employeeName}</td>
                                    <td className="px-6 py-4 font-bold">{formatCurrency(sal.basicSalary)}</td>
                                    <td className="px-6 py-4 font-bold text-slate-400">{formatCurrency(sal.allowances)}</td>
                                    <td className="px-6 py-4 font-bold text-rose-400">{formatCurrency(sal.deductions)}</td>
                                         <td className="px-6 py-4 font-black text-emerald-600">{formatCurrency(sal.netSalary)}</td>
                                         <td className="px-6 py-4 text-center">
                                             <select 
                                                value={sal.status}
                                                onChange={(e) => handleUpdateStatus(sal.id, e.target.value as any)}
                                                className={`px-2 py-1 rounded-lg text-[10px] font-black border-none outline-none cursor-pointer ${
                                                    sal.status === 'Paid' ? 'bg-emerald-100 text-emerald-600' : 
                                                    sal.status === 'Processed' ? 'bg-indigo-100 text-indigo-600' : 
                                                    'bg-amber-100 text-amber-600'
                                                }`}
                                             >
                                                <option value="Pending">معلق</option>
                                                <option value="Processed">معتمد</option>
                                                <option value="Paid">تم الصرف</option>
                                             </select>
                                         </td>
                                         <td className="px-6 py-4 text-center">
                                             <div className="flex justify-center gap-2">
                                                 {sal.status !== 'Paid' && (
                                                     <Button 
                                                        variant="ghost"
                                                        onClick={() => {
                                                            setSelectedSal(sal);
                                                            setSelectedTreasuryId(treasuries.find(t => t.isDefault)?.id || treasuries[0]?.id || '');
                                                            setIsPayModalOpen(true);
                                                        }}
                                                        className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                                                        title="صرف الراتب"
                                                     >
                                                         <Banknote size={16} />
                                                     </Button>
                                                 )}
                                                 <Button 
                                                    variant="ghost"
                                                    onClick={() => handleDelete(sal.id)}
                                                    className="p-2 text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                                 >
                                                     <Trash2 size={16} />
                                                 </Button>
                                             </div>
                                         </td>
                                     </tr>
                                 ))
                             ) : (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center text-slate-400">
                                        <Users size={48} className="mx-auto mb-4 opacity-20" />
                                        لا توجد بيانات رواتب مكتشفة لهذا الشهر. اضغط "احتساب الرواتب" للبدء.
                                    </td>
                                </tr>
                             )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Pay Salary Modal */}
            <Modal isOpen={isPayModalOpen} onClose={() => setIsPayModalOpen(false)} title="تأكيد صرف الراتب">
                {selectedSal && (
                    <div className="space-y-6">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-slate-500 text-xs font-black uppercase tracking-widest">اسم الموظف</span>
                                <span className="font-black text-slate-800 dark:text-white">{selectedSal.employeeName}</span>
                            </div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-slate-500 text-xs font-black uppercase tracking-widest">الشهر</span>
                                <span className="font-black text-slate-800 dark:text-white">{selectedSal.month}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t dark:border-slate-700">
                                <span className="text-slate-500 text-xs font-black uppercase tracking-widest">صافي المستحق</span>
                                <span className="font-black text-xl text-emerald-600">{formatCurrency(selectedSal.netSalary)}</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ms-1">اختر الخزينة الصارفة</label>
                            <div className="grid grid-cols-1 gap-3">
                                {treasuries.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setSelectedTreasuryId(t.id)}
                                        className={`flex flex-col p-4 rounded-2xl border-2 transition-all text-start ${
                                            selectedTreasuryId === t.id
                                                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 shadow-lg shadow-indigo-500/10'
                                                : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-700 shadow-sm'
                                        }`}
                                    >
                                        <div className="flex justify-between items-center w-full mb-1">
                                            <span className="font-black text-slate-800 dark:text-white">{t.name}</span>
                                            {t.isDefault && <span className="text-[9px] font-black bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">الافتراضية</span>}
                                        </div>
                                        <span className="text-xs font-bold text-slate-500">الرصيد المتاح: {formatCurrency(t.balance)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button variant="secondary" onClick={() => setIsPayModalOpen(false)} className="flex-1 rounded-xl h-12 font-black">إلغاء</Button>
                            <Button 
                                onClick={handlePay} 
                                isLoading={isPaying} 
                                disabled={!selectedTreasuryId}
                                className="flex-[2] rounded-xl h-12 font-black bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20"
                            >
                                تأكيد صرف الراتب
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default PayrollPage;
