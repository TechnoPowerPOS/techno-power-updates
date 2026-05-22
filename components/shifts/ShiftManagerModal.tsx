
import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useShift } from '../../hooks/useShift';
import { formatCurrency } from '../../utils/localization';
import { useSettings } from '../../hooks/useSettings';
import { Lock, Unlock, DollarSign, Calculator, AlertTriangle, Printer, CheckCircle } from 'lucide-react';
import { api } from '../../services/mockApi'; // Used to fetch sales for preview

interface ShiftManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ShiftManagerModal: React.FC<ShiftManagerModalProps> = ({ isOpen, onClose }) => {
    const { currentShift, openShift, closeShift } = useShift();
    const { settings } = useSettings();
    const currency = settings?.currency || 'SAR';
    
    // Open Shift State
    const [openingBalance, setOpeningBalance] = useState<number>(0);
    
    // Close Shift State
    const [actualCash, setActualCash] = useState<number>(0);
    const [notes, setNotes] = useState('');
    const [previewData, setPreviewData] = useState<{ expected: number, sales: number, cashSales: number } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [step, setStep] = useState<'input' | 'summary'>('input');

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep('input');
            setIsSubmitting(false);
            if (currentShift) {
                // Calculate expected cash dynamically for preview
                calculatePreview();
            } else {
                setOpeningBalance(0);
            }
        }
    }, [isOpen, currentShift]);

    const calculatePreview = async () => {
        if (!currentShift) return;
        // In a real app, this would be an API call to get live totals.
        // For mock, we fetch all sales and filter. 
        // NOTE: This logic duplicates api.closeShift logic slightly for UI preview.
        const allSales = await api.getSales();
        const shiftSales = allSales.filter(s => s.shiftId === currentShift.id);
        
        let totalSales = 0;
        let cashSales = 0;
        
        shiftSales.forEach(s => {
            totalSales += s.total;
            if(s.paymentMethod === 'Cash') cashSales += s.amountPaid;
            // Handle split payments if necessary (simplified here)
            if(s.payments) {
               cashSales += s.payments.filter(p => p.method === 'Cash').reduce((sum, p) => sum + p.amount, 0); 
            }
        });

        const expected = currentShift.startCash + cashSales;
        setPreviewData({ expected, sales: totalSales, cashSales });
    };

    const handleOpenShift = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await openShift(openingBalance);
            onClose();
        } catch (e) {
            // Toast handled in hook
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCloseShift = async () => {
        setIsSubmitting(true);
        try {
            await closeShift(actualCash, notes);
            onClose();
        } catch (e) {
            // Toast handled in hook
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputClass = "w-full p-3 text-lg border rounded-xl dark:bg-slate-700 dark:border-slate-600 font-bold text-center";

    // --- RENDER: OPEN SHIFT ---
    if (!currentShift) {
        return (
            <Modal isOpen={isOpen} onClose={onClose} title="فتح وردية جديدة">
                <form onSubmit={handleOpenShift} className="space-y-6">
                    <div className="text-center p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 dark:text-blue-300">
                            <Unlock size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-blue-900 dark:text-blue-200">بداية العمل</h3>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">يرجى إدخال المبلغ الموجود في الخزينة (العهدة) لبدء الوردية.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-2 text-center">الرصيد الافتتاحي (Cash Float)</label>
                        <div className="relative max-w-xs mx-auto">
                            <input 
                                type="number" 
                                min="0" 
                                step="0.01" 
                                value={openingBalance} 
                                onChange={e => setOpeningBalance(parseFloat(e.target.value) || 0)} 
                                className={inputClass}
                                autoFocus
                            />
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currency}</span>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="secondary" type="button" onClick={onClose}>إلغاء</Button>
                        <Button type="submit" isLoading={isSubmitting}>فتح الوردية</Button>
                    </div>
                </form>
            </Modal>
        );
    }

    // --- RENDER: CLOSE SHIFT (Z-REPORT) ---
    const variance = actualCash - (previewData?.expected || 0);
    const isShortage = variance < 0;
    const isOverage = variance > 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="إغلاق الوردية (Z-Report)">
            {step === 'input' ? (
                <div className="space-y-6">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border dark:border-slate-700 flex justify-between items-center">
                        <div>
                            <p className="text-xs text-slate-500">وقت البدء</p>
                            <p className="font-bold text-sm">{new Date(currentShift.startTime).toLocaleString('en-GB')}</p>
                        </div>
                        <div className="text-end">
                            <p className="text-xs text-slate-500">العهدة الافتتاحية</p>
                            <p className="font-bold text-blue-600">{formatCurrency(currentShift.startCash, currency)}</p>
                        </div>
                    </div>

                    <div className="text-center">
                        <label className="block text-lg font-bold mb-3">أدخل النقد الفعلي في الدرج</label>
                        <div className="relative max-w-xs mx-auto">
                            <input 
                                type="number" 
                                min="0" 
                                step="0.01" 
                                value={actualCash} 
                                onChange={e => setActualCash(parseFloat(e.target.value) || 0)} 
                                className={`${inputClass} text-2xl py-4 bg-white shadow-inner`}
                                autoFocus
                            />
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currency}</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">ملاحظات (اختياري)</label>
                        <textarea 
                            className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600" 
                            rows={2}
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="أي ملاحظات حول العجز أو مشاكل الوردية..."
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="secondary" onClick={onClose}>إلغاء</Button>
                        <Button onClick={() => setStep('summary')}>التالي: مراجعة التقرير</Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-slideDown">
                    <div className="text-center border-b pb-4 dark:border-slate-700">
                        <div className="inline-block p-3 bg-slate-100 dark:bg-slate-800 rounded-full mb-2">
                            <Printer size={24} className="text-slate-600 dark:text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold">ملخص الإغلاق</h3>
                        <p className="text-sm text-slate-500">الرجاء مراجعة الأرقام قبل التأكيد النهائي.</p>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-2 border-b border-dashed dark:border-slate-700">
                            <span>الرصيد الافتتاحي</span>
                            <span className="font-mono">{formatCurrency(currentShift.startCash, currency)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 border-b border-dashed dark:border-slate-700">
                            <span>+ المبيعات النقدية</span>
                            <span className="font-mono">{formatCurrency(previewData?.cashSales || 0, currency)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-slate-100 dark:bg-slate-800 font-bold rounded">
                            <span>= النقد المتوقع</span>
                            <span className="font-mono">{formatCurrency(previewData?.expected || 0, currency)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 border-b border-dashed dark:border-slate-700">
                            <span>النقد الفعلي (المدخل)</span>
                            <span className="font-mono font-bold text-blue-600">{formatCurrency(actualCash, currency)}</span>
                        </div>
                    </div>

                    {variance !== 0 && (
                        <div className={`p-4 rounded-xl flex items-center gap-3 ${isShortage ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                            <AlertTriangle size={24} />
                            <div className="flex-grow">
                                <p className="font-bold">{isShortage ? 'عجز في الصندوق' : 'زيادة في الصندوق'}</p>
                                <p className="text-sm">الفرق: {formatCurrency(Math.abs(variance), currency)}</p>
                            </div>
                        </div>
                    )}
                    
                    {variance === 0 && (
                        <div className="p-3 bg-green-50 text-green-700 rounded-xl text-center border border-green-200">
                            <p className="font-bold flex items-center justify-center gap-2"><CheckCircle size={18}/> الصندوق متطابق تماماً</p>
                        </div>
                    )}

                    <div className="flex justify-between gap-2 pt-4">
                        <Button variant="secondary" onClick={() => setStep('input')}>رجوع للتعديل</Button>
                        <Button variant={isShortage ? 'danger' : 'success'} onClick={handleCloseShift} isLoading={isSubmitting}>
                            تأكيد وإغلاق الوردية
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default ShiftManagerModal;
