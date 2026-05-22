
import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { api } from '../../services/mockApi';
import type { ShippingCompany, Sale } from '../../types';
import { useToasts } from '../../hooks/useToasts';
import { Truck, MapPin, Phone, User, DollarSign, Building } from 'lucide-react';

interface ShippingModalProps {
    isOpen: boolean;
    onClose: () => void;
    sale: Sale | null;
    onSuccess?: () => void;
}

const ShippingModal: React.FC<ShippingModalProps> = ({ isOpen, onClose, sale, onSuccess }) => {
    const [companies, setCompanies] = useState<ShippingCompany[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [cost, setCost] = useState(0);
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [loading, setLoading] = useState(false);
    const { addToast } = useToasts();

    useEffect(() => {
        const load = async () => {
            const data = await api.getShippingCompanies();
            setCompanies(data);
        };
        if (isOpen) {
            load();
            if (sale) {
                setCustomerName(sale.customer.name || '');
                setPhone(sale.customer.phone || '');
                setCost(sale.shipping || 0);
                // Try to find customer address if possible
                const loadCust = async () => {
                    const customers = await api.getCustomers();
                    const c = customers.find(cust => cust.id === sale.customer.id);
                    if (c && c.address) setAddress(c.address);
                };
                loadCust();
            }
        }
    }, [isOpen, sale]);

    const handleSave = async () => {
        if (!selectedCompanyId) {
            addToast('الرجاء اختيار شركة شحن', 'warning');
            return;
        }
        if (!customerName || !phone || !address) {
            addToast('الرجاء إكمال بيانات العميل', 'warning');
            return;
        }

        setLoading(true);
        try {
            const company = companies.find(c => c.id === selectedCompanyId);
            await api.saveShippingOperation({
                saleId: sale?.id || '',
                customerName,
                customerPhone: phone,
                customerAddress: address,
                shippingCompanyId: selectedCompanyId,
                shippingCompanyName: company?.name || '',
                trackingNumber: `SO-${Date.now()}`,
                cost: cost,
                status: 'Pending',
                date: new Date().toISOString()
            });
            addToast('تمت إضافة عملية الشحن بنجاح', 'success');
            onSuccess?.();
            onClose();
        } catch (error) {
            addToast('فشل في إضافة عملية الشحن', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="إرسال للشحن">
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">
                            <User size={10} /> العميل
                        </label>
                        <input 
                            type="text" 
                            value={customerName} 
                            onChange={e => setCustomerName(e.target.value)}
                            className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border-none rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">
                            <Phone size={10} /> رقم الهاتف
                        </label>
                        <input 
                            type="text" 
                            value={phone} 
                            onChange={e => setPhone(e.target.value)}
                            className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border-none rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">
                        <MapPin size={10} /> عنوان التسليم
                    </label>
                    <input 
                        type="text" 
                        value={address} 
                        onChange={e => setAddress(e.target.value)}
                        placeholder="أدخل عنوان التسليم بالتفصيل..."
                        className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border-none rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">
                            <Building size={10} /> شركة الشحن
                        </label>
                        <select 
                            value={selectedCompanyId} 
                            onChange={e => setSelectedCompanyId(e.target.value)}
                            className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border-none rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                        >
                            <option value="">اختر شركة شحن...</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">
                            <DollarSign size={10} /> تكلفة الشحن
                        </label>
                        <input 
                            type="number" 
                            value={cost} 
                            onChange={e => setCost(Number(e.target.value))}
                            className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border-none rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm font-mono"
                        />
                    </div>
                </div>

                <div className="pt-4 flex gap-3">
                    <Button 
                        onClick={handleSave} 
                        isLoading={loading}
                        className="flex-1 rounded-2xl h-12 bg-indigo-600 text-white font-black shadow-lg shadow-indigo-600/20"
                    >
                        <Truck className="me-2" size={18} /> تأكيد الشحن
                    </Button>
                    <Button variant="secondary" onClick={onClose} className="rounded-2xl px-6 h-12 font-bold">
                        إلغاء
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default ShippingModal;
