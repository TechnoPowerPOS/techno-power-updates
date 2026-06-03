
import React, { useState, useEffect, useRef } from 'react';
import type { Product, ProductUnit, Category } from '../../types';
import Button from '../ui/Button';
import { AlertCircle, RefreshCw, Calendar, Lock, PlusCircle, Crown, ImageIcon, Upload, Trash2, Layers, Printer } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import { useLicense } from '../../hooks/useLicense';
import { getPlanLimits } from '../../utils/planPermissions';
import { api } from '../../services/mockApi';
import { processImageFile } from '../../utils/imageHelpers';

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
    productionDate: '',
    expiryDate: '',
    hasVariants: false,
    isSerialized: false,
    offerType: 'none',
    offerThreshold: '',
    offerDiscountType: 'percent',
    offerDiscountValue: ''
  });
  
  const [variants, setVariants] = useState<ProductVariant[]>(product?.variants || []);

  const { settings } = useSettings();
  const { licenseInfo } = useLicense();
  const limits = getPlanLimits(licenseInfo.type);
  const showExpiry = settings?.inventorySettings?.enableExpiryDates && limits.hasExpirationDates;
  const showVariants = settings?.inventorySettings?.enableProductVariants && limits.hasProductVariants;

  const [categories, setCategories] = useState<Category[]>([]);
  const [isCreatingNewCategory, setIsCreatingNewCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  useEffect(() => {
    if (limits.hasCategories) {
      api.getCategories().then(cats => {
        setCategories(cats);
        if (cats.length === 0) {
          setIsCreatingNewCategory(true);
        }
      }).catch(err => console.error("Error loading categories in product form", err));
    }
  }, [limits.hasCategories]);

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
        productionDate: product.productionDate || '',
        expiryDate: product.expiryDate || '',
        hasVariants: product.hasVariants || false,
        isSerialized: product.isSerialized || false,
        offerType: (product as any).offerType || 'none',
        offerThreshold: (product as any).offerThreshold || '',
        offerDiscountType: (product as any).offerDiscountType || 'percent',
        offerDiscountValue: (product as any).offerDiscountValue || ''
      });
      setVariants(product.variants || []);
    }
  }, [product]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    else setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
  };

  const addVariantRow = () => {
    setVariants([...variants, { id: Date.now().toString(), size: '', color: '', barcode: '', stock: 0 }]);
  };
  
  const handleVariantChange = (id: string, field: keyof ProductVariant, value: string | number) => {
    setVariants(variants.map(v => v.id === id ? { ...v, [field]: value } : v));
  };
  
  const deleteVariant = (id: string) => {
    setVariants(variants.filter(v => v.id !== id));
  };

  const generateSKU = () => {
    const randomSKU = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    setFormData(prev => ({ ...prev, sku: randomSKU }));
  };
  
  const generateVariantBarcode = (id: string) => {
      const bcode = Math.floor(100000000000 + Math.random() * 900000000000).toString();
      handleVariantChange(id, 'barcode', bcode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalCategory = formData.category;
    
    if (limits.hasCategories) {
      if (isCreatingNewCategory && newCatName.trim()) {
        const catName = newCatName.trim();
        try {
          const existing = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
          if (!existing) {
            await api.saveCategory({ name: catName, description: 'تم إنشاؤها تلقائياً عند إضافة المنتج' });
          }
          finalCategory = catName;
        } catch (err) {
          console.error("Error saving new category:", err);
        }
      } else if (!formData.category && categories.length > 0) {
        finalCategory = categories[0].name;
      }
    } else {
      finalCategory = 'عام';
    }

    onSave({
      ...formData,
      category: finalCategory,
      id: product?.id,
      variants: formData.hasVariants ? variants : undefined
    });
  };

  const inputStyle = "mt-1 block w-full rounded-xl border-slate-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-slate-800 dark:text-white p-2.5 border transition-all";

  return (
    <form onSubmit={handleSubmit} className="space-y-5 animate-fadeIn">
      {error && <div className="p-4 mb-4 text-sm text-red-800 rounded-xl bg-red-50 flex items-center gap-2 border border-red-100"><AlertCircle size={20} /> {error}</div>}
      
      {/* Product Image Upload Section */}
      <div className="p-5 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50 dark:bg-slate-900/30 relative overflow-hidden flex flex-col items-center justify-center min-h-[140px] text-center transition-all hover:border-indigo-500">
        {!limits.hasProductImage && (
          <div className="absolute inset-0 bg-white/75 dark:bg-slate-900/80 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center text-center p-4">
            <div className="p-2.5 bg-amber-100 text-amber-600 rounded-2xl mb-1.5"><Crown size={20}/></div>
            <h5 className="font-black text-slate-800 dark:text-white text-xs">صورة المنتج ميزة مغلقة</h5>
            <p className="text-[10px] font-bold text-slate-500 mt-0.5">رفع صور للمنتجات غير متاح في باقتك الحالية. قم بالترقية للوصول للميزة.</p>
          </div>
        )}
        
        {formData.imageUrl ? (
          <div className="relative group w-28 h-28 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
            <img src={formData.imageUrl} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                className="p-1.5 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-all shadow"
                title="إزالة الصورة"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ) : (
          <label className="cursor-pointer flex flex-col items-center gap-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors w-full h-full p-4">
            <Upload size={24} className="text-slate-300 dark:text-slate-700" />
            <div>
              <span className="text-xs font-black block">اضغط هنا لرفع صورة للمنتج</span>
              <span className="text-[9px] text-slate-400 font-bold block mt-0.5">بصيغة JPEG, PNG بحد أقصى 500 ك.ب</span>
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  try {
                    const base64 = await processImageFile(file, 400); // resize to 400px width
                    setFormData(prev => ({ ...prev, imageUrl: base64 }));
                  } catch (err: any) {
                    console.error("Error product image processing:", err);
                  }
                }
              }}
              disabled={!limits.hasProductImage}
            />
          </label>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-1">اسم المنتج</label><input type="text" name="name" value={formData.name} onChange={handleChange} required className={inputStyle} /></div>
          <div>
            <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-1">الفئة</label>
            {!limits.hasCategories ? (
              <div className="relative">
                <input 
                  type="text" 
                  value="عام (غير مفعّل في باقتك الحالية)" 
                  disabled 
                  className={`${inputStyle} pr-10 text-slate-400 bg-slate-100 dark:bg-slate-900/50 cursor-not-allowed`} 
                />
                <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            ) : (
              <div className="space-y-2">
                {!isCreatingNewCategory ? (
                  <div className="flex gap-2">
                    <select
                      name="category"
                      value={formData.category}
                      onChange={(e) => {
                        if (e.target.value === "__NEW__") {
                          setIsCreatingNewCategory(true);
                        } else {
                          setFormData(prev => ({ ...prev, category: e.target.value }));
                        }
                      }}
                      required
                      className="flex-1 rounded-xl border-slate-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-slate-800 dark:text-white p-2.5 border transition-all text-sm font-bold h-[46px]"
                    >
                      <option value="">-- اختر فئة المنتج --</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                      <option value="__NEW__" className="text-indigo-600 font-bold">+ إنشاء فئة جديدة...</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewCategory(true)}
                      className="p-2.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-950/45 transition-colors flex items-center gap-1.5 text-xs font-black shrink-0 border border-indigo-100 dark:border-indigo-900/50"
                    >
                      <PlusCircle size={16} /> فئة جديدة
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                      placeholder="اكتب اسم الفئة الجديدة هنا..."
                      required={isCreatingNewCategory}
                      className="flex-1 rounded-xl border-slate-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-slate-800 dark:text-white p-2.5 border transition-all text-sm font-bold h-[46px]"
                    />
                    {categories.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingNewCategory(false);
                          setNewCatName('');
                        }}
                        className="p-2.5 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 text-xs font-bold shrink-0 h-[46px]"
                      >
                        إلغاء
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
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

      {showExpiry && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20">
          <div className="md:col-span-2 flex items-center gap-2 mb-1 text-amber-800 dark:text-amber-400">
             <Calendar size={16} />
             <span className="text-xs font-black uppercase tracking-widest">تواريخ الصلاحية والإنتاج</span>
          </div>
          <div>
            <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-1">تاريخ الإنتاج</label>
            <input type="date" name="productionDate" value={formData.productionDate} onChange={handleChange} className={inputStyle} />
          </div>
          <div>
            <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-1">تاريخ الانتهاء</label>
            <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange} className={inputStyle} />
          </div>
        </div>
      )}

      {limits.hasOffers && (
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 mt-4 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-black text-sm text-slate-800 dark:text-slate-200">العروض والخصومات</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-600 dark:text-slate-400 mb-1">نوع العرض</label>
              <select name="offerType" value={formData.offerType || 'none'} onChange={handleChange} className={inputStyle}>
                <option value="none">بدون عرض</option>
                <option value="bundle">عرض حزمة (تجميع)</option>
                <option value="seasonal">عرض موسمي (مباشر)</option>
              </select>
            </div>
            {formData.offerType && formData.offerType !== 'none' && (
              <>
                {formData.offerType === 'bundle' && (
                  <div>
                    <label className="block text-xs font-black text-slate-600 dark:text-slate-400 mb-1">الكمية المطلوبة (Threshold)</label>
                    <input type="number" name="offerThreshold" value={formData.offerThreshold || ''} onChange={handleChange} placeholder="مثال: يطبق إذا اشترى 3 فأكثر" className={inputStyle} min={1}/>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-black text-slate-600 dark:text-slate-400 mb-1">نسبة/قيمة الخصم</label>
                  <div className="flex gap-2">
                    <input type="number" name="offerDiscountValue" value={formData.offerDiscountValue || ''} onChange={handleChange} placeholder="مثال: 10" className={`${inputStyle} flex-1`} min={0} step="0.01"/>
                    <select name="offerDiscountType" value={formData.offerDiscountType || 'percent'} onChange={handleChange} className={`${inputStyle} w-16 px-1`} title="نوع الخصم">
                      <option value="percent">%</option>
                      <option value="amount">$</option>
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showVariants && (
        <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/20 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-400">
               <Layers size={16} />
               <span className="text-xs font-black uppercase tracking-widest">إدارة المقاسات والألوان (المتغيرات)</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
               <input type="checkbox" name="hasVariants" checked={formData.hasVariants} onChange={handleChange} className="rounded text-indigo-600 focus:ring-indigo-500" />
               <span className="text-sm font-bold text-slate-700 dark:text-slate-300">تفعيل المتغيرات للمنتج</span>
            </label>
          </div>
          
          {formData.hasVariants && (
              <div className="space-y-3">
                 {variants.map((variant, index) => (
                    <div key={variant.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                       <div className="md:col-span-2">
                           <label className="block text-[10px] font-black text-slate-500 mb-1">المقاس</label>
                           <input type="text" value={variant.size || ''} onChange={(e) => handleVariantChange(variant.id, 'size', e.target.value)} className={inputStyle} placeholder="مثال: XL" />
                       </div>
                       <div className="md:col-span-2">
                           <label className="block text-[10px] font-black text-slate-500 mb-1">اللون</label>
                           <input type="text" value={variant.color || ''} onChange={(e) => handleVariantChange(variant.id, 'color', e.target.value)} className={inputStyle} placeholder="مثال: أحمر" />
                       </div>
                       <div className="md:col-span-3 relative">
                           <label className="block text-[10px] font-black text-slate-500 mb-1">باركود المتغير</label>
                           <input type="text" value={variant.barcode || ''} onChange={(e) => handleVariantChange(variant.id, 'barcode', e.target.value)} required className={inputStyle} />
                           <button type="button" onClick={() => generateVariantBarcode(variant.id)} className="absolute left-2 top-8 text-indigo-600 hover:text-indigo-800"><RefreshCw size={14} /></button>
                       </div>
                       <div className="md:col-span-3">
                           <label className="block text-[10px] font-black text-slate-500 mb-1">الكمية الإبتدائية للمتغير</label>
                           <input type="number" value={variant.stock || 0} onChange={(e) => handleVariantChange(variant.id, 'stock', parseFloat(e.target.value) || 0)} className={inputStyle} />
                       </div>
                       <div className="md:col-span-2 flex items-center justify-end gap-2">
                           {limits.hasBarcodePrinting && (
                              <button type="button" onClick={() => window.print()} title="طباعة باركود المتغير" className="p-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                                 <Printer size={16} />
                              </button>
                           )}
                           <button type="button" onClick={() => deleteVariant(variant.id)} className="p-2.5 bg-rose-100 text-rose-600 rounded-xl hover:bg-rose-200 transition-colors">
                               <Trash2 size={16} />
                           </button>
                       </div>
                    </div>
                 ))}
                 
                 <Button type="button" variant="secondary" onClick={addVariantRow} className="w-full rounded-xl border-dashed border-2 py-3">
                    <PlusCircle size={16} className="me-2" /> إضافة مقاس/لون جديد
                 </Button>
              </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-6 border-t dark:border-slate-700">
        <Button type="button" variant="secondary" onClick={onCancel} className="rounded-xl px-6">إلغاء</Button>
        <Button type="submit" isLoading={isLoading} className="rounded-xl px-10 bg-indigo-600 font-black">{product ? 'تحديث' : 'إضافة'}</Button>
      </div>
    </form>
  );
};

export default ProductForm;
