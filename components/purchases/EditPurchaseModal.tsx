
import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { api } from '../../services/mockApi';
import type { Purchase, Supplier } from '../../types';
import { useToasts } from '../../hooks/useToasts';

interface EditPurchaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    purchase: Purchase | null;
}

const EditPurchaseModal: React.FC<EditPurchaseModalProps> = ({ isOpen, onClose, onSave, purchase }) => {
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [status, setStatus] = useState<Purchase['status']>('Unpaid');
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useToasts();
    
    useEffect(() => {
        if (isOpen) {
            const fetchSuppliers = async () => {
                const data = await api.getSuppliers();
                setSuppliers(data);
                if (purchase) {
                    setSelectedSupplierId(purchase.supplier.id);
                    setStatus(purchase.status);
                }
            };
            fetchSuppliers();
        }
    }, [isOpen, purchase]);

    const handleSave = async () => {
        if (!purchase || !selectedSupplierId) return;
        setIsLoading(true);
        try {
            await api.updatePurchase(purchase.id, { supplierId: selectedSupplierId, status });
            onSave();
            onClose();
        } catch (error) {
            addToast('فشل تحديث طلب الشراء.', 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    const inputStyle = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white";

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`تعديل طلب الشراء ${purchase?.id.toUpperCase()}`}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>إلغاء</Button>
                    <Button onClick={handleSave} isLoading={isLoading}>حفظ التعديلات</Button>
                </>
            }
        >
            <div className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">يمكنك تعديل المورد وحالة الدفع لهذا الطلب.</p>
                <div>
                    <label className="block text-sm font-medium">المورد</label>
                    <select
                        value={selectedSupplierId}
                        onChange={e => setSelectedSupplierId(e.target.value)}
                        className={inputStyle}
                    >
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium">حالة الدفع</label>
                    <select
                        value={status}
                        onChange={e => setStatus(e.target.value as Purchase['status'])}
                        className={inputStyle}
                    >
                        <option value="Unpaid">غير مدفوع</option>
                        <option value="Partial">جزئي</option>
                        <option value="Paid">مدفوع</option>
                    </select>
                </div>
            </div>
        </Modal>
    );
};

export default EditPurchaseModal;
