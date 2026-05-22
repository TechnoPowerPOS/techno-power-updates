
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/mockApi';
import type { Product, Warehouse, StockTransfer } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Search, ArrowRightLeft } from 'lucide-react';
import { toArabicIndic } from '../utils/localization';

const StockTransferPage: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [transfers, setTransfers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [fromWh, setFromWh] = useState('');
    const [toWh, setToWh] = useState('');
    const [productId, setProductId] = useState('');
    const [qty, setQty] = useState(1);
    const [selectedItems, setSelectedItems] = useState<{productId: string, quantity: number, name: string}[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        const [p, w, t] = await Promise.all([api.getProducts(), api.getWarehouses(), api.getStockTransfers()]);
        setProducts(p); setWarehouses(w); setTransfers(t);
        if (w.length > 1 && !fromWh) { setFromWh(w[0].id); setToWh(w[1].id); }
        if (p.length && !productId) setProductId(p[0].id);
        setLoading(false);
    }
    useEffect(() => {
        fetchData();
    }, []);

    const filteredTransfers = useMemo(() => {
        let res = transfers;
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            res = res.filter(t => {
                const p = products.find(prod => prod.id === t.productId);
                const pName = p?.name.toLowerCase() || '';
                const pSku = p?.sku.toLowerCase() || '';
                const tId = t.id.toLowerCase();
                return pName.includes(q) || pSku.includes(q) || tId.includes(q);
            });
        }
        if (dateFrom) res = res.filter(t => t.date.split('T')[0] >= dateFrom);
        if (dateTo) res = res.filter(t => t.date.split('T')[0] <= dateTo);
        return res;
    }, [transfers, searchTerm, products, dateFrom, dateTo]);

    const handleAddItem = () => {
        if (!productId || qty <= 0) return;
        
        const prod = products.find(p => p.id === productId);
        if (!prod) return;

        const availableInFrom = prod?.warehouseStocks?.[fromWh] || 0;
        const currentInList = selectedItems.find(i => i.productId === productId)?.quantity || 0;
        
        if (qty + currentInList > availableInFrom) {
            alert(`الكمية المتاحة في المستودع المختار هي ${availableInFrom} فقط.`);
            return;
        }

        setSelectedItems(prev => {
            const exists = prev.find(i => i.productId === productId);
            if (exists) {
                return prev.map(i => i.productId === productId ? { ...i, quantity: i.quantity + qty } : i);
            }
            return [...prev, { productId, quantity: qty, name: prod.name }];
        });
        setQty(1);
    };

    const handleTransfer = async () => {
        if (selectedItems.length === 0) return;
        if (fromWh === toWh) { alert('يجب اختيار مستودعين مختلفين'); return; }
        
        await api.saveStockTransfer({ fromWarehouseId: fromWh, toWarehouseId: toWh, items: selectedItems.map(i => ({productId: i.productId, quantity: i.quantity, name: i.name})) });
        
        fetchData();
        setSelectedItems([]);
        alert('تم التحويل بنجاح وتحديث أرصدة المستودعات'); 
    };

    return (
        <div className="space-y-8 pb-10 animate-fadeIn">
            <h1 className="text-4xl font-black text-slate-800 dark:text-white">إدارة تحويلات المخزون</h1>
            <Card title="إجراء تحويل بين المستودعات">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end mb-6">
                    <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">تحويل من</label><select value={fromWh} onChange={e => { setFromWh(e.target.value); setSelectedItems([]); }} className="w-full p-3 border rounded-xl dark:bg-slate-700 font-bold">{warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
                    <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">تحويل إلى</label><select value={toWh} onChange={e => setToWh(e.target.value)} className="w-full p-3 border rounded-xl dark:bg-slate-700 font-bold">{warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end mb-6 border-t pt-6">
                    <div className="md:col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">المنتج</label>
                        <select value={productId} onChange={e => setProductId(e.target.value)} className="w-full p-3 border rounded-xl dark:bg-slate-700 font-bold">
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name} (المتاح بالمصدر: {toArabicIndic(p.warehouseStocks?.[fromWh] || 0)})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">الكمية</label>
                        <input type="number" min="1" value={qty} onChange={e => setQty(parseInt(e.target.value)||1)} className="w-full p-3 border rounded-xl text-center font-bold" />
                    </div>
                    <Button onClick={handleAddItem} className="px-6 rounded-xl bg-slate-800 h-12">إضافة للقائمة</Button>
                </div>

                {selectedItems.length > 0 && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 mb-6">
                        <h4 className="font-black text-sm mb-4">المنتجات المحددة للتحويل:</h4>
                        <div className="space-y-2 mb-4">
                            {selectedItems.map(item => (
                                <div key={item.productId} className="flex justify-between items-center bg-white dark:bg-slate-700 p-3 rounded-xl border border-slate-200">
                                    <span className="font-bold text-sm">{item.name}</span>
                                    <div className="flex items-center gap-4">
                                        <span className="font-black text-indigo-600">{item.quantity}</span>
                                        <button onClick={() => setSelectedItems(prev => prev.filter(i => i.productId !== item.productId))} className="text-rose-500 font-bold text-sm hover:underline">إزالة</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button onClick={handleTransfer} className="w-full h-12 rounded-xl bg-indigo-600 font-black"><ArrowRightLeft className="me-2"/> تأكيد تحويل جميع المنتجات</Button>
                    </div>
                )}
            </Card>
            
            <Card className="p-0 overflow-hidden shadow-premium">
                <div className="p-6 border-b dark:border-slate-800 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4 flex-wrap">
                    <h3 className="font-black text-lg">سجل التحويلات التاريخي</h3>
                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        <input 
                            type="date" 
                            title="من تاريخ"
                            value={dateFrom} 
                            onChange={e => setDateFrom(e.target.value)} 
                            className="p-2 border rounded-xl dark:bg-slate-800 font-bold text-xs outline-none focus:border-indigo-500" 
                        />
                        <input 
                            type="date" 
                            title="إلى تاريخ"
                            value={dateTo} 
                            onChange={e => setDateTo(e.target.value)} 
                            className="p-2 border rounded-xl dark:bg-slate-800 font-bold text-xs outline-none focus:border-indigo-500" 
                        />
                        <div className="relative flex-grow">
                            <Search className="absolute top-1/2 -translate-y-1/2 start-3 text-slate-400" size={16}/>
                            <input 
                                type="text" 
                                placeholder="بحث باسم المنتج أو الباركود..." 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)} 
                                className="w-full p-2 ps-10 border rounded-xl dark:bg-slate-800 font-bold text-xs outline-none focus:border-indigo-500" 
                            />
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-start">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black uppercase text-slate-400">
                            <tr>
                                <th className="px-8 py-4">التاريخ</th>
                                <th className="px-8 py-4">المنتج</th>
                                <th className="px-8 py-4 text-center">الكمية</th>
                                <th className="px-8 py-4">من مستودع</th>
                                <th className="px-8 py-4">إلى مستودع</th>
                                <th className="px-8 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-slate-800">
                            {filteredTransfers.map(t => (
                                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                                    <td className="px-8 py-4 font-bold">{new Date(t.date).toLocaleDateString('ar-EG')}</td>
                                    <td className="px-8 py-4 font-black">
                                        {t.items && t.items.length > 0 ? (
                                            <div className="space-y-1">
                                                {t.items.map((item: any, idx: number) => (
                                                    <div key={idx} className="text-sm">{item.name || products.find(p => p.id === item.productId)?.name}</div>
                                                ))}
                                                <span className="block text-[10px] text-slate-400 font-normal">ID: {t.id}</span>
                                            </div>
                                        ) : (
                                            <>
                                                {products.find(p => p.id === t.productId)?.name}
                                                <span className="block text-[10px] text-slate-400 font-normal">ID: {t.id}</span>
                                            </>
                                        )}
                                    </td>
                                    <td className="px-8 py-4 text-center font-black text-indigo-600">
                                        {t.items && t.items.length > 0 ? (
                                            <div className="space-y-1">
                                                {t.items.map((item: any, idx: number) => (
                                                    <div key={idx}>{toArabicIndic(item.quantity)}</div>
                                                ))}
                                            </div>
                                        ) : toArabicIndic(t.quantity)}
                                    </td>
                                    <td className="px-8 py-4">{warehouses.find(w => w.id === t.fromWarehouseId)?.name}</td>
                                    <td className="px-8 py-4">{warehouses.find(w => w.id === t.toWarehouseId)?.name}</td>
                                    <td className="px-8 py-4 text-end">
                                        <button 
                                            onClick={async () => {
                                                const res = await api.deleteStockTransfer(t.id);
                                                if(res) {
                                                    alert('تم التراجع عن التحويل واسترجاع الكميات بنجاح');
                                                    fetchData();
                                                }
                                            }}
                                            className="p-2 text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredTransfers.length === 0 && (
                        <div className="text-center py-20 text-slate-400 font-bold">لا يوجد تحويلات تطابق البحث.</div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default StockTransferPage;
