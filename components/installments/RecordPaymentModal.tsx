
import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { api } from '../../services/mockApi';
import { useToasts } from '../../hooks/useToasts';

interface RecordPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    paymentId: string;
}

const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({ isOpen, onClose, onSuccess, paymentId }) => {
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useToasts();

    const handleConfirm = async () => {
        setIsLoading(true);
        try {
            const success = await api.recordInstallmentPayment(paymentId);
            if (success) {
                addToast('تم تسجيل الدفعة بنجاح وتحديث الرصيد.', 'success');
                onSuccess();
            } else {
                addToast("فشل تسجيل الدفعة. قد تكون مسجلة بالفعل.", 'error');
            }
        } catch (error) {
            addToast("فشل تسجيل الدفعة.", 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="تأكيد تحصيل القسط"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={isLoading}>إلغاء</Button>
                    <Button variant="success" onClick={handleConfirm} isLoading={isLoading}>تأكيد التحصيل</Button>
                </>
            }
        >
            <p>هل أنت متأكد من أنك استلمت هذا القسط وتريد تسجيله كـ "مدفوع"؟ هذا الإجراء سيقوم بتحديث ديون العميل ورصيد الخزينة.</p>
        </Modal>
    );
};

export default RecordPaymentModal;
