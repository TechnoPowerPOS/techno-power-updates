
import React, { useState, useMemo, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useSettings } from '../../hooks/useSettings';
import { formatCurrency } from '../../utils/localization';

interface InstallmentSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: { months: number; startDate: string; interestRate: number }) => void;
    totalAmount: number;
    downPayment: number;
    defaultInterestRate: number;
}

const InstallmentSetupModal: React.FC<InstallmentSetupModalProps> = ({ isOpen, onClose, onSave, totalAmount, downPayment, defaultInterestRate }) => {
    const [months, setMonths] = useState(12);
    const [interestRate, setInterestRate] = useState(defaultInterestRate);
    
    useEffect(() => {
      setInterestRate(defaultInterestRate);
    }, [defaultInterestRate, isOpen]);

    const getNextMonthFirstDay = () => {
        const today = new Date();
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        return nextMonth.toISOString().split('T')[0];
    };
    
    const [startDate, setStartDate] = useState(getNextMonthFirstDay());
    const { settings } = useSettings();

    const principal = useMemo(() => Math.max(0, totalAmount - downPayment), [totalAmount, downPayment]);
    const interestAmount = useMemo(() => {
        // Simple interest calculation: P * R * T
        // T (Time) is in years (months / 12)
        return principal * (interestRate / 100) * (months / 12);
    }, [principal, interestRate, months]);

    const totalWithInterest = useMemo(() => totalAmount + interestAmount, [totalAmount, interestAmount]);
    const remainingAmount = useMemo(() => principal + interestAmount, [principal, interestAmount]);
    const monthlyPayment = useMemo(() => (remainingAmount > 0 && months > 0 ? remainingAmount / months : 0), [remainingAmount, months]);

    const handleSubmit = () => {
        if (months > 0 && principal > 0) {
            onSave({ months, startDate, interestRate });
        } else {
            alert("لا يمكن إنشاء خطة تقسيط بدون مبلغ متبقي أو عدد شهور صحيح.");
        }
    };

    const inputStyle = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white";

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="إعداد خطة التقسيط"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>إلغاء</Button>
                    <Button onClick={handleSubmit} disabled={principal <= 0}>حفظ الخطة</Button>
                </>
            }
        >
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <p className="text-sm text-slate-500">الإجمالي الأساسي</p>
                        <p className="text-lg font-bold">{formatCurrency(totalAmount, settings?.currency)}</p>
                    </div>
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <p className="text-sm text-slate-500">الدفعة المقدمة</p>
                        <p className="text-lg font-bold">{formatCurrency(downPayment, settings?.currency)}</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium">عدد الأقساط (بالأشهر)</label>
                        <input type="number" value={months} onChange={e => setMonths(Math.max(1, parseInt(e.target.value, 10) || 1))} className={inputStyle} />
                    </div>
                     <div>
                        <label className="block text-sm font-medium">نسبة الفائدة السنوية (%)</label>
                        <input type="number" step="0.1" value={interestRate} onChange={e => setInterestRate(parseFloat(e.target.value) || 0)} className={inputStyle} />
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium">تاريخ أول قسط</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputStyle} />
                </div>
                
                <div className="space-y-3 pt-4 border-t dark:border-slate-700">
                    <div className="p-3 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg text-center">
                        <p className="text-sm text-yellow-800 dark:text-yellow-300">إجمالي الفائدة</p>
                        <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{formatCurrency(interestAmount, settings?.currency)}</p>
                    </div>
                     <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg text-center">
                        <p className="text-sm text-blue-800 dark:text-blue-300">الإجمالي بعد الفائدة</p>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(totalWithInterest, settings?.currency)}</p>
                    </div>
                    <div className="p-4 bg-green-100 dark:bg-green-900/50 rounded-lg text-center">
                        <p className="text-sm text-green-800 dark:text-green-300">القسط الشهري</p>
                        <p className="text-2xl font-extrabold text-green-600 dark:text-green-400">{formatCurrency(monthlyPayment, settings?.currency)}</p>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default InstallmentSetupModal;
