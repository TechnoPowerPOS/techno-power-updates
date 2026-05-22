
import React, { useState, useEffect, useRef } from 'react';
import type { Product, ProductUnit } from '../../types';
import Button from '../ui/Button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ProductFormProps {
  product: Product | null;
  onSave: (product: Omit<Product, 'id'> & { id?: string }) => void;
  onCancel: () => void;
  isLoading: boolean;
  error?: string;
}

const ProductForm: React.FC<ProductFormProps> = ({ product, onSave, onCancel, isLoading, error }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    sku: '',
    stock: 0,
    reorderLevel: 10,
    costPrice: 0,
    sellPrice: 0,
    unit: 'Piece' as ProductUnit,
    description: '',
    imageUrl: '',
    isFeatured: false,
    expiryDate: '',
    hasVariants: false,
    isSerialized: false,
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        category: product.category,
        sku: product.sku,
        stock: product.stock,
        reorderLevel: product.reorderLevel,
        costPrice: product.costPrice,
        sellPrice: product.sellPrice,
        unit: product.unit || 'Piece',
        description: product.description || '',
        imageUrl: product.imageUrl || '',
        isFeatured: product.isFeatured || false,
        expiryDate: product.expiryDate || '',
        hasVariants: product.hasVariants || false,
        isSerialized: product.isSerialized || false,
      });
    }
  }, [product]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    else setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
  };

  const generateSKU = () => {
    const randomSKU = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    setFormData(prev => ({ ...prev, sku: randomSKU }));
  };
  
  const inputStyle = "mt-1 block w-full rounded-xl border-slate-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-slate-800 dark:text-white p-2.5 border transition-all";

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave({ ...formData, id: product?.id }); }} className="space-y-5 animate-fadeIn">
      {error && <div className="p-4 mb-4 text-sm text-red-800 rounded-xl bg-red-50 flex items-center gap-2 border border-red-100"><AlertCircle size={20} /> {error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-1">اسم المنتج</label><input type="text" name="name" value={formData.name} onChange={handleChange} required className={inputStyle} /></div>
          <div><label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-1">الفئة</label><input type="text" name="category" value={formData.category} onChange={handleChange} required className={inputStyle} /></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
            <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-1">الباركود (SKU)</label>
            <div className="relative">
                <input type="text" name="sku" value={formData.sku} onChange={handleChange} required className={inputStyle} />
                <button type="button" onClick={generateSKU} className="absolute end-2 top-1/2 -translate-y-1/2 p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors" title="توليد باركود تلقائي">
                    <RefreshCw size={16} />
                </button>
            </div>
        </div>
        <div><label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-1">وحدة الصنف</label>
          <select name="unit" value={formData.unit} onChange={handleChange} className={inputStyle}>
            <option value="Piece">قطعة</option>
            <option value="Box">كرتونة</option>
            <option value="KG">كيلو جرام</option>
            <option value="Meter">متر</option>
            <option value="Litre">لتر</option>
            <option value="Set">طقم / مجموعة</option>
          </select>
        </div>
        <div><label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-1">المخزون الكلي</label><input type="number" name="stock" value={formData.stock} onChange={handleChange} required className={inputStyle} /></div>
        <div><label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-1">حد الطلب (النواقص)</label><input type="number" name="reorderLevel" value={formData.reorderLevel} onChange={handleChange} required className={inputStyle} /></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-1">سعر التكلفة</label><input type="number" step="0.01" name="costPrice" value={formData.costPrice} onChange={handleChange} required className={inputStyle} /></div>
          <div><label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-1">سعر البيع</label><input type="number" step="0.01" name="sellPrice" value={formData.sellPrice} onChange={handleChange} required className={inputStyle} /></div>
      </div>
      <div className="flex justify-end gap-3 pt-6 border-t dark:border-slate-700">
        <Button type="button" variant="secondary" onClick={onCancel} className="rounded-xl px-6">إلغاء</Button>
        <Button type="submit" isLoading={isLoading} className="rounded-xl px-10 bg-indigo-600 font-black">{product ? 'تحديث' : 'إضافة'}</Button>
      </div>
    </form>
  );
};

export default ProductForm;
