
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Product, Warehouse } from '../types';
import { api } from '../services/mockApi';
import Card from '../components/ui/Card';
import { ClipboardList, Warehouse as WhIcon, Search, Printer, Download, DollarSign, Edit3, Save, X, Barcode } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency, toArabicIndic } from '../utils/localization';
import { exportToCsv } from '../utils/export';
import { useToasts } from '../hooks/useToasts';
import TableSkeleton from '../components/ui/TableSkeleton';
import Button from '../components/ui/Button';

const InventoryAuditPage: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [selectedWhId, setSelectedWhId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [barcodeInput, setBarcodeInput] = useState('');
    
    // Adjustment Modal State
    const [adjustModal, setAdjustModal] = useState<{ open: boolean, product: Product | null }>({ open: false, product: null });
    const [physicalQty, setPhysicalQty] = useState<number>(0);
    const [adjustReason, setAdjustReason] = useState('جرد دوري');
    const [savingAdjust, setSavingAdjust] = useState(false);
    
    const { settings } = useSettings();
    const { addToast } = useToasts();

    const handleBarcodeScanSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!barcodeInput.trim()) return;

        // find product matching SKU (exact first, then case-insensitive)
        const matched = products.find(p => p.sku.trim() === barcodeInput.trim()) || 
                        products.find(p => p.sku.toLowerCase().trim() === barcodeInput.trim().toLowerCase());

        if (matched) {
            const qty = matched.warehouseStocks?.[selectedWhId] || 0;
            setAdjustModal({ open: true, product: matched });
            setPhysicalQty(qty);
            addToast(`تم العثور على المنتج: ${matched.name}`, "success");
            setBarcodeInput('');
        } else {
            addToast("لم يتم العثور على أي منتج بهذا الباركود", "error");
        }
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [pData, wData] = await Promise.all([api.getProducts(), api.getWarehouses()]);
            setProducts(pData);
            setWarehouses(wData);
            if (wData.length > 0 && !selectedWhId) setSelectedWhId(wData[0].id);
        } catch (e) {
            addToast("خطأ في تحميل البيانات", "error");
        } finally {
            setLoading(false);
        }
    }, [addToast, selectedWhId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const auditData = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 p.sku.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesSearch;
        });
    }, [products, searchTerm]);

    const totalValue = useMemo(() => {
        return auditData.reduce((sum, p) => sum + ((p.warehouseStocks?.[selectedWhId] || 0) * p.costPrice), 0);
    }, [auditData, selectedWhId]);

    const handleExport = () => {
        const whName = warehouses.find(w => w.id === selectedWhId)?.name || 'مخزن';
        const data = auditData.map(p => ({
            "الباركود": p.sku,
            "المنتج": p.name,
            "الفئة": p.category,
            "الكمية المتاحة": p.warehouseStocks?.[selectedWhId] || 0,
            "سعر التكلفة": p.costPrice,
            "إجمالي القيمة": (p.warehouseStocks?.[selectedWhId] || 0) * p.costPrice
        }));
        exportToCsv(`audit-${whName}-${new Date().toISOString().split('T')[0]}.csv`, data);
        addToast("تم تصدير التقرير بنجاح", "success");
    };

    const handleAdjust = async () => {
        if (!adjustModal.product || !selectedWhId) return;
        setSavingAdjust(true);
        try {
            const success = await api.adjustStock(adjustModal.product.id, selectedWhId, physicalQty, adjustReason);
            if (success) {
                addToast("تمت تسوية المخزون بنجاح", "success");
                setAdjustModal({ open: false, product: null });
                fetchData();
            } else {
                addToast("فشل في تسوية المخزون", "error");
            }
        } catch (e) {
            addToast("خطأ غير متوقع", "error");
        } finally {
            setSavingAdjust(false);
        }
    };

    return (
        <div className="animate-fadeIn pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
                        <ClipboardList className="text-indigo-600" /> جرد وتصحيح المخزون
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">جرد الكميات، تسوية الفروقات، وإدارة قيم المستودعات</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => window.print()} className="h-12 px-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-50 shadow-sm">
                        <Printer size={18} /> طباعة
                    </button>
                    <button onClick={handleExport} className="h-12 px-6 bg-indigo-600 text-white rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-indigo-500/20">
                        <Download size={18} /> تصدير التقرير
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                <Card className="lg:col-span-1 p-6 flex flex-col gap-6">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">المستودع المستهدف</label>
                        <select 
                            value={selectedWhId} 
                            onChange={e => setSelectedWhId(e.target.value)}
                            className="w-full p-3 bg-white dark:bg-slate-800 border rounded-2xl font-black outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>
                    
                    <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border-2 border-indigo-100 dark:border-indigo-900/40 rounded-3xl">
                        <label className="text-xs font-black text-indigo-700 dark:text-indigo-400 mb-2 flex items-center gap-1.5">
                            <Barcode size={16} /> جرد سريع بالباركود
                        </label>
                        <form onSubmit={handleBarcodeScanSubmit} className="relative">
                            <input 
                                type="text" 
                                placeholder="امسح الباركود واضغط Enter..." 
                                value={barcodeInput}
                                onChange={e => setBarcodeInput(e.target.value)}
                                className="w-full h-11 ps-3 pe-8 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 font-bold text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-center"
                                autoFocus
                            />
                            <div className="absolute top-1/2 -translate-y-1/2 end-3 text-indigo-500">
                                <Barcode size={16} />
                            </div>
                        </form>
                        <p className="text-[9px] font-bold text-slate-400 mt-2 text-center leading-normal">امسح باركود السلعة ليفتح نافذة الجرد والتعديل فوراً.</p>
                    </div>
                    
                    <div className="pt-6 border-t dark:border-slate-800 mt-auto">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">إجمالي قيمة المخزون الحالي</p>
                        <p className="text-3xl font-black text-emerald-600">{formatCurrency(totalValue, settings?.currency || 'SAR')}</p>
                        <p className="text-[10px] text-slate-400 mt-1 font-bold">بناءً على سعر التكلفة لـ {toArabicIndic(auditData.length)} منتج</p>
                    </div>
                </Card>

                <div className="lg:col-span-3">
                    <Card className="p-0 overflow-hidden shadow-premium border-none">
                        <div className="p-4 border-b dark:border-slate-800 bg-slate-50/50 flex items-center gap-4">
                            <div className="relative flex-grow">
                                <Search className="absolute top-1/2 -translate-y-1/2 start-3 text-slate-400" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="بحث سريع برمز أو اسم المنتج..." 
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full p-2.5 ps-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-xs"
                                />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-start">
                                <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] font-black uppercase text-slate-400">
                                    <tr>
                                        <th className="px-6 py-4">المنتج والباركود</th>
                                        <th className="px-6 py-4 text-center">الكمية المسجلة</th>
                                        <th className="px-6 py-4 text-center">التكلفة</th>
                                        <th className="px-6 py-4 text-center">الإجراء</th>
                                        <th className="px-6 py-4 text-end">إجمالي القيمة</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-slate-800">
                                    {loading ? <tr><td colSpan={5}><TableSkeleton cols={5} /></td></tr> : auditData.map(p => {
                                        const qty = p.warehouseStocks?.[selectedWhId] || 0;
                                        return (
                                            <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                                <td className="px-6 py-4">
                                                    <p className="font-black text-slate-800 dark:text-slate-200">{p.name}</p>
                                                    <p className="text-[10px] font-mono text-slate-400 uppercase">{p.sku}</p>
                                                </td>
                                                <td className="px-6 py-4 text-center font-black">
                                                    <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-lg">{toArabicIndic(qty)}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center font-bold text-slate-500">
                                                    {formatCurrency(p.costPrice, settings?.currency || 'SAR')}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button 
                                                        onClick={() => {
                                                            setAdjustModal({ open: true, product: p });
                                                            setPhysicalQty(qty);
                                                        }}
                                                        className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors"
                                                        title="تسوية الكمية"
                                                    >
                                                        <Edit3 size={18} />
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4 text-end font-black text-slate-800 dark:text-white">
                                                    {formatCurrency(qty * p.costPrice, settings?.currency || 'SAR')}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                            {!loading && auditData.length === 0 && (
                                <div className="p-20 text-center text-slate-400 font-bold">لا يوجد بيانات لعرضها</div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>

            {/* Adjustment Modal */}
            {adjustModal.open && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-scaleUp">
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                                    <Edit3 className="text-indigo-600" /> تسوية مخزن
                                </h3>
                                <button onClick={() => setAdjustModal({ open: false, product: null })} className="text-slate-400 hover:text-slate-600">
                                    <X size={24} />
                                </button>
                            </div>
                            
                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl mb-6">
                                <p className="text-xs font-black text-slate-400 uppercase mb-1">المنتج الحالي</p>
                                <p className="font-black text-lg">{adjustModal.product?.name}</p>
                                <div className="flex justify-between mt-2 pt-2 border-t dark:border-slate-700">
                                    <span className="text-xs font-bold text-slate-500 text-end">الكمية الحالية بالسجلات</span>
                                    <span className="font-black text-indigo-600">{toArabicIndic(adjustModal.product?.warehouseStocks?.[selectedWhId] || 0)}</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-black text-slate-500 mb-1 block">الكمية المكتشفة فعلياً</label>
                                    <input 
                                        type="number" 
                                        value={physicalQty}
                                        onChange={e => setPhysicalQty(parseFloat(e.target.value) || 0)}
                                        className="w-full h-12 px-4 rounded-2xl bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 focus:border-indigo-500 font-black text-center"
                                        placeholder="0"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-500 mb-1 block">سبب التسوية</label>
                                    <select 
                                        value={adjustReason}
                                        onChange={e => setAdjustReason(e.target.value)}
                                        className="w-full h-12 px-4 rounded-2xl bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 focus:border-indigo-500 font-bold"
                                    >
                                        <option value="جرد دوري">جرد دوري</option>
                                        <option value="تلف أو هالك">تلف أو هالك</option>
                                        <option value="خطأ في الإدخال">خطأ في الإدخال</option>
                                        <option value="سرقة أو فقدان">سرقة أو فقدان</option>
                                        <option value="بضاعة أمانة">بضاعة أمانة</option>
                                    </select>
                                </div>
                            </div>

                            <div className="mt-8 grid grid-cols-2 gap-4">
                                <Button variant="secondary" onClick={() => setAdjustModal({ open: false, product: null })} className="rounded-2xl h-12 font-bold">إلغاء</Button>
                                <Button onClick={handleAdjust} isLoading={savingAdjust} className="rounded-2xl h-12 font-black">
                                    <Save size={18} className="me-2" />
                                    حفظ التسوية
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryAuditPage;
