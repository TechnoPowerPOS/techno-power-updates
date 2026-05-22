
import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { api } from '../../services/mockApi';
import type { Sale, Customer } from '../../types';
import { useToasts } from '../../hooks/useToasts';

interface EditSaleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    sale: Sale | null;
}

const EditSaleModal: React.FC<EditSaleModalProps> = ({ isOpen, onClose, onSave, sale }) => {
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useToasts();
    
    useEffect(() => {
        if (isOpen) {
            const fetchCustomers = async () => {
                const data = await api.getCustomers();
                setCustomers(data);
                if (sale) {
                    setSelectedCustomerId(sale.customer.id);
                }
            };
            fetchCustomers();
        }
    }, [isOpen, sale]);

    const handleSave = async () => {
        if (!sale || !selectedCustomerId) return;
        setIsLoading(true);
        try {
            const customer = customers.find(c => c.id === selectedCustomerId);
            if (customer) {
                await api.updateSale(sale.id, { customer: { id: customer.id, name: customer.name } });
            }
            onSave();
            onClose();
        } catch (error) {
            addToast('فشل تحديث الفاتورة.', 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    const inputStyle = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white";

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`تعديل فاتورة ${sale?.id.toUpperCase()}`}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>إلغاء</Button>
                    <Button onClick={handleSave} isLoading={isLoading}>حفظ التعديلات</Button>
                </>
            }
        >
            <div className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">يمكنك تعديل العميل المرتبط بهذه الفاتورة. لن يؤثر هذا التغيير على الأرصدة أو الديون.</p>
                <div>
                    <label className="block text-sm font-medium">العميل</label>
                    <select
                        value={selectedCustomerId}
                        onChange={e => setSelectedCustomerId(e.target.value)}
                        className={inputStyle}
                    >
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
            </div>
        </Modal>
    );
};

export default EditSaleModal;
