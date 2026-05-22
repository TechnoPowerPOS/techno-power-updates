
import React, { useState, useMemo } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Percent, TrendingUp, TrendingDown, AlertCircle, Filter, CheckSquare, List } from 'lucide-react';
import { toArabicIndic } from '../../utils/localization';
import type { Product } from '../../types';

interface BulkPriceUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (percentage: number, targetType: 'all' | 'category' | 'specific', selection: string[]) => void;
    isLoading: boolean;
    productCount: number;
    products: Product[];
}

const BulkPriceUpdateModal: React.FC<BulkPriceUpdateModalProps> = ({ isOpen, onClose, onConfirm, isLoading, productCount, products }) => {
    const [percentage, setPercentage] = useState<number>(0);
    const [targetType, setTargetType] = useState<'all' | 'category' | 'specific'>('all');
    
    const categories = useMemo(() => Array.from(new Set(products.map(p => p.category))), [products]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    
    // For specific selection, we can just use categories for simplicity, or we let them select products.
    // The user requested: "يقدر يحدد منتجات معينه فقط او مجموعات محدده".
    // Let's do multi-select for categories, and multi-select for products.
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    const [productSearch, setProductSearch] = useState('');

    const filteredProductsForSelect = useMemo(() => {
        if (!productSearch) return products;
        return products.filter(p => p.name.includes(productSearch) || p.sku.includes(productSearch));
    }, [products, productSearch]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (percentage === 0) return;
        
        const selection = targetType === 'all' ? [] 
                        : targetType === 'category' ? selectedCategories 
                        : selectedProducts;
                        
        if (targetType !== 'all' && selection.length === 0) {
             // Handle error/validation implicitly
             return;
        }

        onConfirm(percentage, targetType, selection);
    };

    const toggleCategory = (cat: string) => {
        setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
    };

    const toggleProduct = (id: string) => {
        setSelectedProducts(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const expectedCount = targetType === 'all' ? productCount 
                        : targetType === 'category' ? products.filter(p => selectedCategories.includes(p.category)).length
                        : selectedProducts.length;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="تحديث الأسعار جماعياً">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800 flex items-start gap-3">
                    <AlertCircle className="text-indigo-600 shrink-0 mt-0.5" size={20} />
                    <p className="text-sm text-indigo-700 dark:text-indigo-300">
                        سيتم تطبيق هذه النسبة على <b>سعر البيع</b>. اختر طريقة التحديد المناسبة لك.
                    </p>
                </div>

                <div className="space-y-3">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ms-1">نطاق التحديث</label>
                    <div className="grid grid-cols-3 gap-2">
                        <button type="button" onClick={() => setTargetType('all')} className={`p-3 rounded-xl border-2 text-xs font-bold transition-all flex flex-col items-center gap-2 ${targetType === 'all' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-indigo-300'}`}>
                            <List size={20} /> كل المنتجات
                        </button>
                        <button type="button" onClick={() => setTargetType('category')} className={`p-3 rounded-xl border-2 text-xs font-bold transition-all flex flex-col items-center gap-2 ${targetType === 'category' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-indigo-300'}`}>
                            <Filter size={20} /> حسب المجموعة
                        </button>
                        <button type="button" onClick={() => setTargetType('specific')} className={`p-3 rounded-xl border-2 text-xs font-bold transition-all flex flex-col items-center gap-2 ${targetType === 'specific' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-indigo-300'}`}>
                            <CheckSquare size={20} /> تحديد يدوي
                        </button>
                    </div>
                </div>

                {targetType === 'category' && (
                    <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl max-h-40 overflow-y-auto w-full custom-scrollbar grid grid-cols-2 gap-2">
                        {categories.map(c => (
                            <label key={c} className="flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer">
                                <input type="checkbox" checked={selectedCategories.includes(c)} onChange={() => toggleCategory(c)} className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                                <span className="font-bold text-xs">{c}</span>
                            </label>
                        ))}
                    </div>
                )}

                {targetType === 'specific' && (
                    <div className="space-y-2 border border-slate-200 dark:border-slate-700 rounded-xl p-2 w-full">
                         <input type="text" placeholder="ابحث عن منتج..." value={productSearch} onChange={e => setProductSearch(e.target.value)} className="w-full text-xs p-2 rounded-lg bg-slate-100 dark:bg-slate-800 outline-none" />
                         <div className="max-h-40 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                             {filteredProductsForSelect.map(p => (
                                 <label key={p.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer">
                                     <input type="checkbox" checked={selectedProducts.includes(p.id)} onChange={() => toggleProduct(p.id)} className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 shrink-0" />
                                     <div className="flex flex-col">
                                         <span className="font-bold text-xs">{p.name}</span>
                                         <span className="text-[10px] text-slate-400">{p.sku} | {p.category}</span>
                                     </div>
                                 </label>
                             ))}
                         </div>
                         {selectedProducts.length > 0 && <div className="text-[10px] text-indigo-600 font-bold p-1 text-center">تم تحديد {toArabicIndic(selectedProducts.length)} منتج</div>}
                    </div>
                )}

                <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ms-1">نسبة التغير (%)</label>
                    <div className="relative">
                        <Percent className="absolute top-1/2 -translate-y-1/2 start-4 text-slate-400" size={18} />
                        <input 
                            type="number" 
                            step="0.1"
                            value={percentage || ''} 
                            onChange={e => setPercentage(parseFloat(e.target.value) || 0)}
                            placeholder="مثال: 10 للزيادة أو -5 للخصم"
                            className="w-full h-14 ps-12 pe-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 outline-none font-black text-lg transition-all"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
                    <div className="flex items-center gap-2">
                        {percentage > 0 ? <TrendingUp className="text-emerald-500" /> : <TrendingDown className="text-rose-500" />}
                        <span className="text-sm font-bold">الحالة: تحديث {toArabicIndic(expectedCount)} منتج</span>
                    </div>
                    <span className={`font-black ${percentage > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {percentage > 0 ? `زيادة بـ ${toArabicIndic(percentage)}%` : percentage < 0 ? `خصم بـ ${toArabicIndic(Math.abs(percentage))}%` : 'لا تغيير'}
                    </span>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t dark:border-slate-700">
                    <Button type="button" variant="secondary" onClick={onClose} className="rounded-xl">إلغاء</Button>
                    <Button 
                        type="submit" 
                        isLoading={isLoading} 
                        disabled={percentage === 0 || expectedCount === 0}
                        className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-8 font-black"
                    >
                        تطبيق التحديث الآن
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default BulkPriceUpdateModal;
