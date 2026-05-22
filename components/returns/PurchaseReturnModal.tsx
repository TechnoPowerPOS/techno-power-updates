import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { api } from '../../services/mockApi';
import type { Purchase, PurchaseReturn, PurchaseReturnItem, Treasury } from '../../types';
import { useSettings } from '../../hooks/useSettings';
import { formatCurrency, toArabicIndic } from '../../utils/localization';
import { Search, User, FileText, ShoppingBag } from 'lucide-react';

interface PurchaseReturnModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<PurchaseReturn, 'id' | 'date' | 'user'> & { treasuryId: string }) => void;
    isLoading: boolean;
}

interface ItemToReturn {
    productId: string;
    name: string;
    costPrice: number;
    originalQuantity: number;
    returnQuantity: number;
}

const PurchaseReturnModal: React.FC<PurchaseReturnModalProps> = ({ isOpen, onClose, onSave, isLoading }) => {
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [treasuries, setTreasuries] = useState<Treasury[]>([]);
    const [selectedPurchaseId, setSelectedPurchaseId] = useState<string>('');
    const [selectedTreasuryId, setSelectedTreasuryId] = useState<string>('');
    const [items, setItems] = useState<ItemToReturn[]>([]);
    const [reason, setReason] = useState('');
    const [loadingPurchases, setLoadingPurchases] = useState(true);
    const { settings } = useSettings();

    // حالة البحث الجديدة
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearchResults, setShowSearchResults] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const fetchPurchases = async () => {
                setLoadingPurchases(true);
                const [purchasesData, treasuriesData] = await Promise.all([
                    api.getPurchases(),
                    api.getTreasuries()
                ]);
                setPurchases(purchasesData);
                setTreasuries(treasuriesData);
                const defaultTreasury = treasuriesData.find(t => t.isDefault) || treasuriesData[0];
                if(defaultTreasury) setSelectedTreasuryId(defaultTreasury.id);
                setLoadingPurchases(false);
            };
            fetchPurchases();
        } else {
            setSelectedPurchaseId('');
            setItems([]);
            setReason('');
            setSearchQuery('');
            setShowSearchResults(false);
        }
    }, [isOpen]);

    const [customRecoveredAmount, setCustomRecoveredAmount] = useState<number | null>(null);

    useEffect(() => {
        if (selectedPurchaseId) {
            const purchase = purchases.find(p => p.id === selectedPurchaseId);
            if (purchase) {
                setItems(purchase.items.map(item => ({
                    ...item,
                    originalQuantity: item.quantity,
                    returnQuantity: 0,
                })));
                setCustomRecoveredAmount(null);
            }
        } else {
            setItems([]);
            setCustomRecoveredAmount(null);
        }
    }, [selectedPurchaseId, purchases]);

    const filteredPurchases = useMemo(() => {
        if (!searchQuery.trim()) return [];
        return purchases.filter(p => 
            p.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
            p.supplier.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [purchases, searchQuery]);

    const handleQuantityChange = (productId: string, value: string) => {
        const newQuantity = parseInt(value, 10) || 0;
        setItems(prevItems => prevItems.map(item => {
            if (item.productId === productId) {
                const clampedQuantity = Math.max(0, Math.min(newQuantity, item.originalQuantity));
                return { ...item, returnQuantity: clampedQuantity };
            }
            return item;
        }));
        setCustomRecoveredAmount(null); // Reset manual override if they change items manually
    };

    const handleFullReturn = () => {
        const purchase = purchases.find(p => p.id === selectedPurchaseId);
        if (!purchase) return;
        setItems(items.map(item => ({ ...item, returnQuantity: item.originalQuantity })));
        setCustomRecoveredAmount(purchase.amountPaid > 0 ? purchase.amountPaid : purchase.total);
    };

    const totalRecoveredCalculated = useMemo(() => {
        return items.reduce((total, item) => total + (item.returnQuantity * item.costPrice), 0);
    }, [items]);

    const finalRecoveredAmount = customRecoveredAmount !== null ? customRecoveredAmount : totalRecoveredCalculated;

    const handleSubmit = () => {
        const itemsToReturn: PurchaseReturnItem[] = items
            .filter(item => item.returnQuantity > 0)
            .map(({ productId, name, costPrice, returnQuantity }) => ({
                productId, name, costPrice, quantity: returnQuantity
            }));

        if (itemsToReturn.length === 0) {
            alert('يجب تحديد كمية مرتجعة لمنتج واحد على الأقل.');
            return;
        }
        if (!selectedTreasuryId) {
            alert('يرجى تحديد الخزينة لاستلام المبلغ.');
            return;
        }

        onSave({
            originalPurchaseId: selectedPurchaseId,
            items: itemsToReturn,
            totalRecovered: finalRecoveredAmount,
            reason,
            treasuryId: selectedTreasuryId,
        });
    };
    
    const inputStyle = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 p-2.5";

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="إنشاء مرتجع مشتريات جديد"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>إلغاء</Button>
                    <Button onClick={handleSubmit} isLoading={isLoading} disabled={!selectedPurchaseId || finalRecoveredAmount <= 0}>
                        تأكيد المرتجع
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                        <label className="block text-sm font-black text-slate-600 dark:text-slate-300 mb-1">بحث عن طلب الشراء</label>
                        <div className="relative">
                            <Search className="absolute top-1/2 -translate-y-1/2 start-3 text-slate-400" size={16} />
                            <input 
                                type="text"
                                placeholder="رقم الطلب أو اسم المورد..."
                                value={searchQuery}
                                onChange={e => {
                                    setSearchQuery(e.target.value);
                                    setShowSearchResults(true);
                                }}
                                className={inputStyle + " ps-10"}
                            />
                        </div>
                        
                        {showSearchResults && searchQuery && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto">
                                {filteredPurchases.length === 0 ? (
                                    <div className="p-4 text-center text-xs text-slate-500">لا توجد طلبات مطابقة</div>
                                ) : (
                                    filteredPurchases.map(p => (
                                        <div 
                                            key={p.id}
                                            onClick={() => {
                                                setSelectedPurchaseId(p.id);
                                                setSearchQuery(p.id.toUpperCase());
                                                setShowSearchResults(false);
                                            }}
                                            className="p-3 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer border-b last:border-0 dark:border-slate-700 flex justify-between items-center"
                                        >
                                            <div>
                                                <p className="font-bold text-xs">{p.id.toUpperCase()}</p>
                                                <p className="text-[10px] text-slate-400">{p.supplier.name}</p>
                                            </div>
                                            <span className="text-xs font-black text-indigo-600">{formatCurrency(p.total, settings?.currency || 'EGP')}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-black text-slate-600 dark:text-slate-300 mb-1">الخزينة (استلام المبلغ)</label>
                        <select
                            value={selectedTreasuryId}
                            onChange={e => setSelectedTreasuryId(e.target.value)}
                            className={inputStyle}
                        >
                            <option value="" disabled>-- اختر الخزينة --</option>
                            {treasuries.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {items.length > 0 && settings && (
                    <div className="space-y-3 pt-4 border-t dark:border-gray-700 animate-fadeIn">
                        <div className="flex items-center gap-2 mb-2 justify-between">
                            <div className="flex items-center gap-2">
                                <ShoppingBag className="text-indigo-600" size={18} />
                                <h4 className="font-black text-sm">محتويات الطلب: <span className="text-indigo-600">{selectedPurchaseId.toUpperCase()}</span></h4>
                            </div>
                            <Button size="sm" variant="outline" className="text-xs" onClick={handleFullReturn}>إرجاع الفاتورة بالكامل</Button>
                        </div>
                        <div className="overflow-x-auto rounded-xl border dark:border-slate-800">
                            <table className="w-full text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-900 font-bold">
                                    <tr>
                                        <th className="p-3 text-start">المنتج</th>
                                        <th className="p-3 text-center">المشترى</th>
                                        <th className="p-3 text-center">الكمية المرتجعة</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map(item => (
                                        <tr key={item.productId} className="border-b dark:border-gray-700 last:border-0">
                                            <td className="p-3 font-bold">{item.name}</td>
                                            <td className="p-3 text-center">{toArabicIndic(item.originalQuantity)}</td>
                                            <td className="p-3 flex justify-center">
                                                <input
                                                    type="number"
                                                    value={item.returnQuantity || ''}
                                                    onChange={e => handleQuantityChange(item.productId, e.target.value)}
                                                    max={item.originalQuantity}
                                                    min="0"
                                                    className="w-16 text-center p-1.5 border rounded-lg dark:bg-gray-800 dark:border-gray-600 font-bold"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex justify-between items-center">
                            <span className="font-black text-indigo-900 dark:text-indigo-300">إجمالي المبلغ المسترجع:</span>
                            <input 
                                type="number" 
                                value={customRecoveredAmount !== null ? customRecoveredAmount : totalRecoveredCalculated} 
                                onChange={e => setCustomRecoveredAmount(parseFloat(e.target.value) || 0)} 
                                className="w-32 text-center p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 font-black text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500" 
                            />
                        </div>
                    </div>
                )}
                 <div>
                    <label className="block text-sm font-black text-slate-600 dark:text-slate-300 mb-1">سبب الإرجاع</label>
                    <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} className={inputStyle} placeholder="اكتب سبباً مختصراً..." />
                </div>
            </div>
        </Modal>
    );
};

export default PurchaseReturnModal;