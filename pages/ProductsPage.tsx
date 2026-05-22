
import React, { useState, useEffect, useCallback } from 'react';
import type { Product, Warehouse } from '../types';
import { api } from '../services/mockApi';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import ProductForm from '../components/products/ProductForm';
import ExcelImportModal from '../components/products/ExcelImportModal';
import BulkPriceUpdateModal from '../components/products/BulkPriceUpdateModal';
import { PlusCircle, Edit, Trash2, Search, Package, RefreshCw, Download, Upload, Tags, Lock, Warehouse as WhIcon } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency, toArabicIndic } from '../utils/localization';
import { exportToCsv } from '../utils/export';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToasts } from '../hooks/useToasts';
import { useLicense } from '../hooks/useLicense';
import { getPlanLimits } from '../utils/planPermissions';
import ProductTableSkeleton from '../components/products/ProductTableSkeleton';
import Tooltip from '../components/ui/Tooltip';

const ProductsPage: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [selectedWhId, setSelectedWhId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
    const [showShortagesOnly, setShowShortagesOnly] = useState(false);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const { settings } = useSettings();
    const { addToast } = useToasts();
    const { licenseInfo } = useLicense();
    const limits = getPlanLimits(licenseInfo.type);

    const isFree = licenseInfo.type === 'Free';

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [pData, wData] = await Promise.all([api.getProducts(), api.getWarehouses()]);
            setProducts(pData);
            setWarehouses(wData);
        } catch (e) {
            addToast("خطأ في تحميل البيانات", "error");
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchData();
        window.addEventListener('storage_updated', fetchData);
        return () => window.removeEventListener('storage_updated', fetchData);
    }, [fetchData]);

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             p.category.toLowerCase().includes(searchTerm.toLowerCase());
        
        let matchesShortage = true;
        if (showShortagesOnly && selectedWhId) {
            const stockInWh = p.warehouseStocks?.[selectedWhId] || 0;
            matchesShortage = stockInWh <= (p.reorderLevel || 0);
        }

        return matchesSearch && matchesShortage;
    });

    const handleExportExcel = () => {
        if (isFree) {
            addToast("ميزة تصدير البيانات حصرية للنسخ المدفوعة.", "warning");
            return;
        }
        const data = products.map(p => ({
            sku: p.sku,
            name: p.name,
            category: p.category,
            stock: p.stock,
            costPrice: p.costPrice,
            sellPrice: p.sellPrice
        }));
        exportToCsv(`inventory-${new Date().toISOString().split('T')[0]}.csv`, data);
        addToast("تم تصدير ملف الإكسيل بنجاح", "success");
    };

    const handleImportExcel = async (importedData: any[], warehouseId: string) => {
        if (isFree) return;
        setIsSaving(true);
        try {
            for (const item of importedData) {
                await api.saveProduct({
                    name: item.name || item.item || "منتج مستورد",
                    category: item.category || "عام",
                    sku: item.sku || `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    stock: parseFloat(item.stock) || 0,
                    costPrice: parseFloat(item.costPrice) || 0,
                    sellPrice: parseFloat(item.sellPrice) || 0,
                    reorderLevel: 5,
                    warehouseStocks: { [warehouseId]: parseFloat(item.stock) || 0 }
                });
            }
            await fetchData();
            addToast(`تم استيراد ${importedData.length} منتج بنجاح`, "success");
            setIsImportModalOpen(false);
        } catch (e) {
            addToast("فشل استيراد البيانات", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleBulkPriceUpdate = async (percentage: number, targetType: 'all' | 'category' | 'specific', selection: string[]) => {
        if (isFree) return;
        setIsSaving(true);
        try {
            const updated = products.map(p => {
                let shouldUpdate = false;
                if (targetType === 'all') shouldUpdate = true;
                else if (targetType === 'category' && selection.includes(p.category)) shouldUpdate = true;
                else if (targetType === 'specific' && selection.includes(p.id)) shouldUpdate = true;

                if (shouldUpdate) {
                    return {
                        ...p,
                        sellPrice: Math.round((p.sellPrice * (1 + percentage / 100)) * 100) / 100
                    };
                }
                return p;
            });

            // If no changes, skip API call to save time
            const changedProducts = updated.filter((p, i) => p.sellPrice !== products[i].sellPrice);
            if (changedProducts.length > 0) {
                await api.bulkUpdateProducts(updated);
                await fetchData();
                addToast(`تم تحديث أسعار ${changedProducts.length} منتج بنسبة ${percentage}%`, "success");
            } else {
                addToast("لم يتم تحديث أي منتجات", "warning");
            }
            
            setIsBulkUpdateOpen(false);
        } catch (e) {
            addToast("فشل تحديث الأسعار", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleOpenModal = (product: Product | null = null) => {
        if (!product && products.length >= limits.maxProducts) {
            addToast(`لقد هداف الحد الأقصى للمنتجات في خطتك (${limits.maxProducts} منتج). يرجى الترقية لإضافة المزيد.`, "warning");
            return;
        }
        if (product && selectedWhId) {
            setEditingProduct({
                ...product,
                stock: product.warehouseStocks?.[selectedWhId] || 0
            });
        } else {
            setEditingProduct(product);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingProduct(null);
    };

    const handleSaveProduct = async (productData: any) => {
        setIsSaving(true);
        try {
            const finalData = { ...productData };
            if (selectedWhId) {
                const originalProduct = products.find(p => p.id === productData.id);
                finalData.warehouseStocks = { 
                    ...(originalProduct?.warehouseStocks || {}),
                    [selectedWhId]: Number(finalData.stock)
                };
                finalData.stock = Object.values(finalData.warehouseStocks).reduce((sum: number, val: any) => sum + Number(val), 0);
            }
            await api.saveProduct(finalData);
            await fetchData();
            addToast(productData.id ? 'تم تحديث المنتج' : 'تم إضافة المنتج بنجاح', 'success');
            handleCloseModal();
        } catch (e) {
            addToast('فشل في حفظ المنتج', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (confirmDeleteId) {
            const product = products.find(p => p.id === confirmDeleteId);
            if (product && product.stock > 0) {
                addToast(`لا يمكن حذف منتج لا يزال يتوفر منه كميات في المستودعات (إجمالي: ${product.stock}). يرجى تصفية المخزون أولاً.`, 'error');
                setConfirmDeleteId(null);
                return;
            }
            
            try {
                await api.deleteProduct(confirmDeleteId);
                await fetchData();
                addToast('تم حذف المنتج بنجاح', 'success');
                setSelectedItems(prev => prev.filter(id => id !== confirmDeleteId));
            } catch (e) {
                addToast('فشل في الحذف', 'error');
            } finally {
                setConfirmDeleteId(null);
            }
        }
    };

    const handleBulkDelete = async () => {
        if (selectedItems.length === 0) return;
        
        const productsWithStock = selectedItems.map(id => products.find(p => p.id === id)).filter(p => p && p.stock > 0);
        if (productsWithStock.length > 0) {
            addToast(`لا يمكن حذف بعض المنتجات المحددة لوجود مخزون متوفر لها (${productsWithStock.length} منتج).`, 'error');
            setConfirmBulkDelete(false);
            return;
        }

        setIsSaving(true);
        try {
            await api.bulkDeleteProducts(selectedItems);
            await fetchData();
            setSelectedItems([]);
            addToast(`تم حذف ${selectedItems.length} منتج بنجاح`, 'success');
        } catch (e) {
            addToast('فشل في حذف بعض المنتجات', 'error');
        } finally {
            setIsSaving(false);
            setConfirmBulkDelete(false);
        }
    };

    const toggleSelectItem = (id: string) => {
        setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (selectedItems.length === filteredProducts.length) {
            setSelectedItems([]);
        } else {
            setSelectedItems(filteredProducts.map(p => p.id));
        }
    };

    return (
        <div className="animate-fadeIn pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">إدارة المنتجات</h1>
                    <p className="text-slate-500 font-medium mt-1">عرض وتحرير قائمة الأصناف الخاصة بك</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <Tooltip text={isFree ? "تصدير الملفات متاح في النسخ المدفوعة فقط" : "تصدير إكسيل"}>
                        <button 
                            onClick={handleExportExcel} 
                            disabled={isFree}
                            className={`h-12 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl transition-all flex items-center gap-2 shadow-sm font-bold text-xs ${isFree ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:bg-slate-50 text-slate-600 dark:text-slate-300'}`}
                        >
                            {isFree ? <Lock size={16} /> : <Download size={18} className="text-emerald-500" />} تصدير
                        </button>
                    </Tooltip>

                    <Tooltip text={isFree ? "استيراد الملفات متاح في النسخ المدفوعة فقط" : "استيراد من إكسيل"}>
                        <button 
                            onClick={() => !isFree && setIsImportModalOpen(true)} 
                            disabled={isFree}
                            className={`h-12 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl transition-all flex items-center gap-2 shadow-sm font-bold text-xs ${isFree ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:bg-slate-50 text-slate-600 dark:text-slate-300'}`}
                        >
                            {isFree ? <Lock size={16} /> : <Upload size={18} className="text-indigo-500" />} استيراد
                        </button>
                    </Tooltip>

                    <Tooltip text={isFree ? "تحديث الأسعار متاح في النسخ المدفوعة فقط" : "تعديل الأسعار جماعياً"}>
                        <button 
                            onClick={() => !isFree && setIsBulkUpdateOpen(true)} 
                            disabled={isFree}
                            className={`h-12 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl transition-all flex items-center gap-2 shadow-sm font-bold text-xs ${isFree ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:bg-slate-50 text-slate-600 dark:text-slate-300'}`}
                        >
                            {isFree ? <Lock size={16} /> : <Tags size={18} className="text-amber-500" />} تعديل الأسعار
                        </button>
                    </Tooltip>

                    {selectedItems.length > 0 && (
                        <button 
                            onClick={() => setConfirmBulkDelete(true)}
                            disabled={isSaving}
                            className="h-12 px-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl transition-all flex items-center gap-2 shadow-sm font-bold text-xs hover:bg-rose-100"
                        >
                            <Trash2 size={18} /> حذف المحدد ({selectedItems.length})
                        </button>
                    )}

                    <Button onClick={() => handleOpenModal()} className="h-12 rounded-2xl px-6 bg-indigo-600 font-black shadow-lg shadow-indigo-500/20 gap-2">
                        <PlusCircle size={20} /> إضافة منتج
                    </Button>
                </div>
            </div>

            <div className="mb-6 grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-8 relative">
                    <Search className="absolute top-1/2 -translate-y-1/2 start-4 text-slate-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="ابحث بالاسم أو الباركود أو الفئة..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full h-14 ps-12 pe-6 rounded-2xl bg-white dark:bg-slate-900 border border-white dark:border-slate-800 outline-none focus:border-indigo-500 font-bold transition-all shadow-sm"
                    />
                </div>
                <div className="md:col-span-3">
                    <div className="relative">
                        <WhIcon className="absolute top-1/2 -translate-y-1/2 start-3 text-slate-400" size={18} />
                        <select 
                            value={selectedWhId} 
                            onChange={e => setSelectedWhId(e.target.value)}
                            className="w-full h-14 ps-10 pe-4 rounded-2xl bg-white dark:bg-slate-900 border border-white dark:border-slate-800 font-bold outline-none focus:border-indigo-500 shadow-sm"
                        >
                            <option value="">-- اختر المخزن للعرض --</option>
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>
                </div>
                <div className="md:col-span-1">
                    <button onClick={fetchData} className={`w-full h-14 bg-white dark:bg-slate-900 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all shadow-sm flex items-center justify-center ${loading ? 'animate-spin' : ''}`}>
                        <RefreshCw size={22} />
                    </button>
                </div>
            </div>

            <div className="mb-6 flex flex-wrap items-center gap-3">
                <button 
                    onClick={() => setShowShortagesOnly(!showShortagesOnly)}
                    className={`h-12 px-6 rounded-2xl font-black text-xs transition-all flex items-center gap-2 shadow-sm ${showShortagesOnly ? 'bg-rose-600 text-white shadow-rose-500/20' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800'}`}
                >
                    <Package size={18} className={showShortagesOnly ? 'text-white' : 'text-rose-500'} />
                    {showShortagesOnly ? 'عرض كل المنتجات' : 'عرض النواقص فقط'}
                </button>

                <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden md:block"></div>

                <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar flex-grow">
                <button 
                    onClick={() => {
                        const newTerm = "";
                        setSearchTerm(newTerm);
                    }}
                    className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all ${searchTerm === "" ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50'}`}
                >
                    الكل
                </button>
                {Array.from(new Set(products.map(p => p.category))).map(cat => (
                    <button 
                        key={cat}
                        onClick={() => setSearchTerm(cat)}
                        className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all ${searchTerm === cat ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50'}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>
            </div>

            <Card className="p-0 overflow-hidden shadow-premium border-none">
                {!selectedWhId ? (
                    <div className="p-32 text-center text-slate-400">
                        <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <WhIcon size={48} className="text-indigo-500" />
                        </div>
                        <p className="font-black text-2xl text-slate-600 dark:text-slate-300">الرجاء اختيار مستودع أولاً</p>
                        <p className="text-sm mt-2">يجب تحديد مستودع لعرض المنتجات والكميات المتاحة فيه.</p>
                    </div>
                ) : loading ? <ProductTableSkeleton /> : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-start">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-black border-b dark:border-slate-800">
                                <tr>
                                    <th className="px-6 py-5 w-10">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedItems.length === filteredProducts.length && filteredProducts.length > 0} 
                                            onChange={toggleSelectAll} 
                                            className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                        />
                                    </th>
                                    <th className="px-8 py-5">المنتج</th>
                                    <th className="px-6 py-5">الفئة</th>
                                    <th className="px-6 py-5 text-center">المخزون بالمخزن</th>
                                    <th className="px-6 py-5 text-center">سعر البيع</th>
                                    <th className="px-8 py-5 text-center">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-slate-800">
                                {filteredProducts.map((p) => {
                                    const stockInWh = p.warehouseStocks?.[selectedWhId] || 0;
                                    const isSelected = selectedItems.includes(p.id);
                                    return (
                                        <tr key={p.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                                            <td className="px-6 py-5 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    checked={isSelected} 
                                                    onChange={() => toggleSelectItem(p.id)} 
                                                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-slate-800 flex items-center justify-center text-indigo-600 font-black shadow-inner">
                                                        {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover rounded-2xl" /> : <Package size={24}/>}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-800 dark:text-slate-200 text-base">{p.name}</p>
                                                        <p className="text-xs font-mono text-slate-400 tracking-wider uppercase">{p.sku}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-xs">
                                                    {p.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className={`px-4 py-1.5 rounded-full font-black text-xs shadow-sm ${stockInWh <= p.reorderLevel ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                    {toArabicIndic(stockInWh)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-center font-black text-indigo-600 text-lg">
                                                {formatCurrency(p.sellPrice, settings?.currency || 'SAR')}
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex justify-center gap-3">
                                                    <button onClick={() => handleOpenModal(p)} className="p-2.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"><Edit size={20} /></button>
                                                    <button onClick={() => setConfirmDeleteId(p.id)} className="p-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"><Trash2 size={20} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filteredProducts.length === 0 && (
                            <div className="p-32 text-center text-slate-400">
                                <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 opacity-40">
                                    <Package size={48} />
                                </div>
                                <p className="font-black text-2xl text-slate-600 dark:text-slate-300">لا يوجد منتجات في هذا المخزن</p>
                                <p className="text-sm mt-2">ابدأ بإضافة أول صنف أو استورد ملف إكسيل جاهز</p>
                            </div>
                        )}
                    </div>
                )}
            </Card>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingProduct ? 'تحديث بيانات المنتج' : 'إضافة منتج جديد للمخزن'}>
                <ProductForm 
                    product={editingProduct} 
                    onSave={handleSaveProduct} 
                    onCancel={handleCloseModal} 
                    isLoading={isSaving} 
                />
            </Modal>

            <ExcelImportModal 
                isOpen={isImportModalOpen} 
                onClose={() => setIsImportModalOpen(false)} 
                onImport={handleImportExcel} 
                isLoading={isSaving} 
            />

            <BulkPriceUpdateModal 
                isOpen={isBulkUpdateOpen} 
                onClose={() => setIsBulkUpdateOpen(false)} 
                onConfirm={handleBulkPriceUpdate} 
                isLoading={isSaving} 
                productCount={products.length} 
                products={products}
            />

            <ConfirmDialog 
                isOpen={!!confirmDeleteId} 
                onClose={() => setConfirmDeleteId(null)} 
                onConfirm={confirmDelete} 
                title="تأكيد الحذف النهائي" 
                message="هل أنت متأكد من حذف هذا المنتج؟ سيتم حذفه نهائياً من قاعدة البيانات ولن تتمكن من استعادته."
            />
            <ConfirmDialog 
                isOpen={confirmBulkDelete} 
                onClose={() => setConfirmBulkDelete(false)} 
                onConfirm={handleBulkDelete} 
                title="تأكيد الحذف الجماعي" 
                message={`هل أنت متأكد من حذف ${selectedItems.length} منتج نهائياً؟ سيتم حذفها نهائياً من قاعدة البيانات.`}
            />
        </div>
    );
};

export default ProductsPage;
