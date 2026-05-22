
import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { api } from '../../services/mockApi';
import type { Sale, Warehouse, Treasury } from '../../types';
import { useSettings } from '../../hooks/useSettings';
import { formatCurrency, toArabicIndic } from '../../utils/localization';
import { Search, User, Phone } from 'lucide-react';

interface SalesReturnModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    isLoading: boolean;
}

const SalesReturnModal: React.FC<SalesReturnModalProps> = ({ isOpen, onClose, onSave, isLoading }) => {
    const [sales, setSales] = useState<Sale[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [treasuries, setTreasuries] = useState<Treasury[]>([]);
    const [selectedSaleId, setSelectedSaleId] = useState<string>('');
    const [selectedWhId, setSelectedWhId] = useState<string>('');
    const [selectedTrId, setSelectedTrId] = useState<string>('');
    const [query, setQuery] = useState('');
    const [items, setItems] = useState<any[]>([]);
    const { settings } = useSettings();

    useEffect(() => {
        if (isOpen) {
            Promise.all([api.getSales(), api.getWarehouses(), api.getTreasuries()]).then(([s, w, t]) => {
                setSales(s); setWarehouses(w); setTreasuries(t);
                if (w.length) setSelectedWhId(w.find(i => i.isDefault)?.id || w[0].id);
                if (t.length) setSelectedTrId(t.find(i => i.isDefault)?.id || t[0].id);
            });
        }
    }, [isOpen]);

    const filteredSales = useMemo(() => {
        if (!query.trim()) return [];
        const q = query.toLowerCase();
        return sales.filter(s => 
            s.id.toLowerCase().includes(q) || 
            s.customer.name.toLowerCase().includes(q) ||
            // افترضنا أن بيانات العميل متاحة من خلال api.getCustomers أو أننا سنبحث في الاسم فقط حالياً لضمان الدقة
            s.customer.id.includes(q)
        ).slice(0, 8);
    }, [sales, query]);

    useEffect(() => {
        if (selectedSaleId) {
            const sale = sales.find(s => s.id === selectedSaleId);
            if (sale) {
                setItems(sale.items.map(i => ({ 
                    ...i, 
                    originalQuantity: i.quantity, 
                    returnQuantity: 0 
                })));
            }
        }
    }, [selectedSaleId, sales]);

    const totalRefund = items.reduce((sum, i) => sum + (i.returnQuantity * i.sellPrice), 0);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="تسجيل مرتجع مبيعات جديد">
            <div className="space-y-6">
                <div className="relative">
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">ابحث عن الفاتورة (رقم الفاتورة / اسم العميل)</label>
                    <div className="relative">
                        <Search className="absolute top-1/2 -translate-y-1/2 start-3 text-slate-400" size={16}/>
                        <input 
                            type="text" 
                            value={query} 
                            onChange={e => setQuery(e.target.value)} 
                            className="w-full p-3 ps-10 border rounded-xl dark:bg-slate-800 font-bold outline-none focus:border-indigo-500" 
                            placeholder="أدخل رقم الفاتورة أو اسم العميل..."
                        />
                    </div>
                    {filteredSales.length > 0 && !selectedSaleId && (
                        <div className="absolute top-full left-0 right-0 z-[100] mt-1 bg-white dark:bg-slate-800 border rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                            {filteredSales.map(s => (
                                <button 
                                    key={s.id} 
                                    onClick={() => { setSelectedSaleId(s.id); setQuery(s.id.toUpperCase()); }} 
                                    className="w-full p-4 text-start hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border-b last:border-0 font-black text-xs flex justify-between items-center"
                                >
                                    <div>
                                        <span className="block">{s.id.toUpperCase()}</span>
                                        <span className="text-slate-400 font-normal">العميل: {s.customer.name}</span>
                                    </div>
                                    <span className="text-indigo-600">{formatCurrency(s.total, settings?.currency)}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">المستودع (استلام البضاعة)</label>
                        <select 
                            value={selectedWhId} 
                            onChange={e => setSelectedWhId(e.target.value)} 
                            className="w-full p-2.5 border rounded-xl dark:bg-slate-800 font-bold border-indigo-200"
                        >
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">الخزينة (رد المبلغ)</label>
                        <select 
                            value={selectedTrId} 
                            onChange={e => setSelectedTrId(e.target.value)} 
                            className="w-full p-2.5 border rounded-xl dark:bg-slate-800 font-bold"
                        >
                            {treasuries.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                </div>

                {selectedSaleId && (
                    <div className="space-y-3 animate-fadeIn">
                        <div className="flex items-center justify-between">
                            <h4 className="font-black text-xs text-indigo-600">الأصناف المتاحة للإرجاع:</h4>
                            <button onClick={() => { setSelectedSaleId(''); setQuery(''); setItems([]); }} className="text-[10px] text-rose-500 font-black hover:underline">إلغاء الفاتورة المختارة</button>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {items.map(item => (
                                <div key={item.id} className="flex items-center justify-between p-3 border rounded-xl dark:bg-slate-800/50 bg-slate-50/50">
                                    <div className="text-xs font-black">
                                        {item.name} 
                                        <span className="block text-[10px] text-slate-400 font-normal">المباع: {toArabicIndic(item.originalQuantity)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-slate-400">المرتجع:</span>
                                        <input 
                                            type="number" 
                                            min="0" 
                                            max={item.originalQuantity} 
                                            value={item.returnQuantity} 
                                            onChange={e => setItems(items.map(i => i.id === item.id ? {...i, returnQuantity: parseInt(e.target.value)||0} : i))} 
                                            className="w-16 p-2 border rounded-lg text-center font-bold" 
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="p-6 bg-rose-600 text-white rounded-3xl text-center shadow-xl">
                    <p className="text-[10px] font-black opacity-80 uppercase tracking-widest">إجمالي المبلغ المطلوب رده</p>
                    <p className="text-3xl font-black mt-1">{formatCurrency(totalRefund, settings?.currency)}</p>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t dark:border-slate-800">
                    <Button variant="secondary" onClick={onClose} className="rounded-xl">إلغاء</Button>
                    <Button 
                        onClick={() => onSave({ 
                            originalSaleId: selectedSaleId, 
                            items: items.filter(i => i.returnQuantity > 0), 
                            totalRefund, 
                            treasuryId: selectedTrId, 
                            warehouseId: selectedWhId 
                        })} 
                        isLoading={isLoading} 
                        disabled={totalRefund <= 0 || !selectedWhId}
                        className="rounded-xl px-8"
                    >
                        تأكيد المرتجع
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default SalesReturnModal;
