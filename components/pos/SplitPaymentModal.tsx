
import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useSettings } from '../../hooks/useSettings';
import { formatCurrency, formatAmount } from '../../utils/localization';
import { Banknote, CreditCard, ArrowRightLeft, Clock, Plus, Trash2 } from 'lucide-react';
import type { PaymentDetail } from '../../types';

interface SplitPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    totalAmount: number;
    onConfirm: (payments: PaymentDetail[]) => void;
}

const SplitPaymentModal: React.FC<SplitPaymentModalProps> = ({ isOpen, onClose, totalAmount, onConfirm }) => {
    const [payments, setPayments] = useState<PaymentDetail[]>([
        { method: 'Cash', amount: totalAmount }
    ]);
    const { settings } = useSettings();

    useEffect(() => {
        if (isOpen) {
            setPayments([{ method: 'Cash', amount: totalAmount }]);
        }
    }, [isOpen, totalAmount]);

    const handleAddPayment = () => {
        const currentTotal = payments.reduce((sum, p) => sum + p.amount, 0);
        const remaining = Math.max(0, totalAmount - currentTotal);
        
        // Auto-select next logical method
        const usedMethods = new Set(payments.map(p => p.method));
        let nextMethod: PaymentDetail['method'] = 'Cash';
        if (!usedMethods.has('Card')) nextMethod = 'Card';
        else if (!usedMethods.has('Transfer')) nextMethod = 'Transfer';
        else if (!usedMethods.has('Credit')) nextMethod = 'Credit';

        setPayments([...payments, { method: nextMethod, amount: remaining }]);
    };

    const handleRemovePayment = (index: number) => {
        const newPayments = payments.filter((_, i) => i !== index);
        setPayments(newPayments);
    };

    const handleChange = (index: number, field: keyof PaymentDetail, value: any) => {
        const newPayments = [...payments];
        if (field === 'amount') {
            newPayments[index].amount = parseFloat(value) || 0;
        } else {
            newPayments[index].method = value;
        }
        setPayments(newPayments);
    };

    const totalAllocated = payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = totalAmount - totalAllocated;
    const isValid = Math.abs(remaining) < 0.01 && payments.every(p => p.amount > 0);

    const getIcon = (method: string) => {
        switch(method) {
            case 'Cash': return <Banknote size={16} />;
            case 'Card': return <CreditCard size={16} />;
            case 'Transfer': return <ArrowRightLeft size={16} />;
            case 'Credit': return <Clock size={16} />;
            default: return null;
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="تجزئة الدفع (دفع مرن)"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>إلغاء</Button>
                    <Button onClick={() => onConfirm(payments)} disabled={!isValid}>تأكيد الدفع</Button>
                </>
            }
        >
            <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <div>
                        <p className="text-sm text-slate-500">إجمالي الفاتورة</p>
                        <p className="text-xl font-bold">{formatCurrency(totalAmount, settings?.currency)}</p>
                    </div>
                    <div className="text-end">
                        <p className="text-sm text-slate-500">المتبقي</p>
                        <p className={`text-xl font-bold ${Math.abs(remaining) < 0.01 ? 'text-green-500' : 'text-red-500'}`}>
                            {formatCurrency(remaining, settings?.currency)}
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    {payments.map((payment, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 border rounded-lg dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
                                {getIcon(payment.method)}
                            </div>
                            <div className="flex-grow grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">الطريقة</label>
                                    <select 
                                        value={payment.method} 
                                        onChange={(e) => handleChange(index, 'method', e.target.value)}
                                        className="w-full p-2 text-sm border rounded bg-white text-slate-900 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                                    >
                                        <option value="Cash">نقدي (Cash)</option>
                                        <option value="Card">فيزا (Visa/Mada)</option>
                                        <option value="Transfer">تحويل بنكي</option>
                                        <option value="Credit">آجل (دين)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">المبلغ</label>
                                    <input 
                                        type="number" 
                                        value={payment.amount} 
                                        onChange={(e) => handleChange(index, 'amount', e.target.value)}
                                        className="w-full p-2 text-sm border rounded font-bold bg-white text-slate-900 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                                        step="0.01"
                                    />
                                </div>
                            </div>
                            {payments.length > 1 && (
                                <button onClick={() => handleRemovePayment(index)} className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors">
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {remaining > 0.01 && (
                    <Button variant="secondary" className="w-full border-dashed border-2" onClick={handleAddPayment}>
                        <Plus size={16} /> إضافة طريقة دفع أخرى
                    </Button>
                )}
                
                {Math.abs(remaining) < 0.01 && (
                    <div className="p-3 bg-green-50 text-green-700 rounded text-center text-sm font-semibold">
                        تم توزيع المبلغ بالكامل ✅
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default SplitPaymentModal;
