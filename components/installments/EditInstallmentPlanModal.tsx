import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import type { InstallmentPlan } from '../../types';
import { api } from '../../services/mockApi';
import { useSettings } from '../../hooks/useSettings';
import { useToasts } from '../../hooks/useToasts';
import { Save } from 'lucide-react';

interface EditInstallmentPlanModalProps {
    isOpen: boolean;
    onClose: () => void;
    plan: InstallmentPlan | null;
    onSuccess: () => void;
}

const EditInstallmentPlanModal: React.FC<EditInstallmentPlanModalProps> = ({ isOpen, onClose, plan, onSuccess }) => {
    const [interestRate, setInterestRate] = useState(0);
    const [numberOfInstallments, setNumberOfInstallments] = useState(0);
    const [loading, setLoading] = useState(false);
    const { addToast } = useToasts();
    const { settings } = useSettings();

    useEffect(() => {
        if (plan) {
            setInterestRate(plan.interestRate || 0);
            setNumberOfInstallments(plan.numberOfInstallments || 0);
        }
    }, [plan]);

    if (!plan || !settings) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Recalculate
            const durationInYears = numberOfInstallments / 12;
            const originalPrincipal = plan.totalWithInterest / (1 + (plan.interestRate / 100) * (plan.numberOfInstallments / 12));
            const newInterestAmount = originalPrincipal * (interestRate / 100) * (numberOfInstallments / 12);
            const newTotalWithInterest = originalPrincipal + newInterestAmount;
            
            const paidPayments = plan.payments.filter(p => p.status === 'Paid');
            const totalPaidSoFar = paidPayments.reduce((a, b) => a + b.amount, 0);
            const newRemaining = newTotalWithInterest - plan.downPayment - totalPaidSoFar;
            
            const newMonthlyPayment = numberOfInstallments > 0 ? newRemaining / numberOfInstallments : 0;
            
            // Generate new pending payments
            const newPending = Array.from({ length: numberOfInstallments }).map((_, i) => {
                const date = new Date();
                date.setMonth(date.getMonth() + i + 1);
                return {
                    id: `pay-${Date.now()}-${i}`,
                    dueDate: date.toISOString(),
                    amount: newMonthlyPayment,
                    status: 'Pending' as 'Pending' | 'Paid'
                };
            });

            const updatedPlan = {
                ...plan,
                interestRate,
                interestAmount: newInterestAmount,
                totalWithInterest: newTotalWithInterest,
                remainingAmount: newRemaining,
                monthlyPayment: newMonthlyPayment,
                numberOfInstallments,
                payments: [...paidPayments, ...newPending],
                status: newRemaining <= 0 ? 'Paid Off' : 'Active'
            };

            await (api as any).saveInstallmentPlan(updatedPlan);
            addToast('تم تعديل القسط بنجاح', 'success');
            onSuccess();
        } catch (error) {
            addToast('حدث خطأ أثناء تعديل القسط', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`تعديل القسط - ${plan.customerName}`}>
            <form onSubmit={handleSave} className="space-y-4">
                <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">نسبة الفائدة (%)</label>
                    <input 
                        type="number" 
                        value={interestRate} 
                        onChange={e => setInterestRate(Number(e.target.value))} 
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold"
                        min="0"
                    />
                </div>
                <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">المدة (أشهر المتبقية)</label>
                    <input 
                        type="number" 
                        value={numberOfInstallments} 
                        onChange={e => setNumberOfInstallments(Number(e.target.value))} 
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold"
                        min="1"
                    />
                </div>

                <div className="flex gap-2 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose} className="flex-1 rounded-xl font-bold h-12">إلغاء</Button>
                    <Button type="submit" isLoading={loading} className="flex-1 rounded-xl font-bold h-12">
                        <Save className="me-2" size={18} /> حفظ التعديل
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default EditInstallmentPlanModal;
