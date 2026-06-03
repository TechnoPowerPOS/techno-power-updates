import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLicense } from '../hooks/useLicense';
import { useToasts } from '../hooks/useToasts';
import { getPlanLimits } from '../utils/planPermissions';
import { api } from '../services/mockApi';
import type { Category, Product } from '../types';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { 
  Plus, Pencil, Trash2, FolderPlus, HelpCircle, ArrowRight, Lock, 
  Folder, Layers, AlertCircle, RefreshCw, Check, Copy
} from 'lucide-react';

const CategoriesPage: React.FC = () => {
    const navigate = useNavigate();
    const { addToast } = useToasts();
    const { licenseInfo } = useLicense();
    const limits = getPlanLimits(licenseInfo?.type || 'Free');

    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    // Form states
    const [id, setId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const loadData = async () => {
        setLoading(true);
        try {
            const [catsData, prodsData] = await Promise.all([
                api.getCategories(),
                api.getProducts()
            ]);
            setCategories(catsData);
            setProducts(prodsData);
        } catch (error) {
            addToast('فشل تحميل الفئات والمنتجات.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (limits.hasCategories) {
            loadData();
        }
    }, [limits.hasCategories]);

    // Upgrade Lock Wall
    if (!limits.hasCategories) {
        return (
            <div className="flex flex-col items-center justify-center p-8 md:p-16 text-center animate-fadeIn">
                <div className="w-24 h-24 bg-amber-50 dark:bg-amber-950/20 text-amber-600 rounded-full flex items-center justify-center mb-8 shadow-inner border border-amber-100 dark:border-amber-900/40">
                    <Lock size={48} />
                </div>
                <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-4">ميزة إدارة الفئات غير مفعلة</h2>
                <p className="text-slate-500 font-bold max-w-sm mb-8 leading-relaxed">
                    أداة تصنيف المنتجات وإنشاء فئات مخصصة ميزة حصرية للباقات الأعلى. يرجى ترقية باقتك للاستفادة منها وتنظيم منتجاتك باحترافية.
                </p>
                <div className="flex items-center gap-4">
                    <Button onClick={() => navigate('/pricing')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-8 py-3 rounded-2xl shadow-lg shadow-indigo-500/20 border-none">
                        عرض باقات الاشتراك والترقية
                    </Button>
                    <Button onClick={() => navigate('/')} className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold px-6 py-3 rounded-2xl border-none">
                        الرئيسية
                    </Button>
                </div>
            </div>
        );
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            addToast('يرجى إدخال اسم الفئة بشكل صحيح.', 'warning');
            return;
        }

        // Avoid exact name duplication on create
        if (!id && categories.some(c => c.name.trim().toLowerCase() === name.trim().toLowerCase())) {
            addToast('هذه الفئة موجودة بالفعل في النظام.', 'warning');
            return;
        }

        setSaving(true);
        try {
            await api.saveCategory({
                id: id || undefined,
                name: name.trim(),
                description: description.trim()
            } as any);

            addToast(id ? 'تم تعديل الفئة بنجاح.' : 'تم إضافة الفئة الجديدة بنجاح.', 'success');
            
            // Clear Form
            handleResetForm();
            await loadData();
        } catch (error) {
            addToast('فشل حفظ الفئة.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (cat: Category) => {
        setId(cat.id);
        setName(cat.name);
        setDescription(cat.description || '');
    };

    const handleDelete = async (catId: string, catName: string) => {
        // Find if products are linked to this category - trimmed and case-insensitive check
        const cleanCatName = (catName || '').trim().toLowerCase();
        const count = products.filter(p => (p.category || '').trim().toLowerCase() === cleanCatName).length;
        
        if (count > 0) {
            addToast(`لا يمكن حذف هذه الفئة لأنها تحتوي على ${count} من المنتجات المرتبطة بها حالياً.`, 'warning');
            return;
        }


        try {
            await api.deleteCategory(catId);
            addToast('تم حذف الفئة بنجاح.', 'success');
            await loadData();
        } catch (error) {
            addToast('فشل حذف الفئة المستهدفة.', 'error');
        }
    };

    const handleResetForm = () => {
        setId(null);
        setName('');
        setDescription('');
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 animate-fadeIn">
            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Layers className="text-indigo-600" size={28} />
                        إدارة فئات المنتجات
                    </h1>
                    <p className="text-xs md:text-sm font-bold text-slate-400 mt-1">
                        فرز وتصنيف المنتجات لتبسيط الكاشير وإدارة المخازن
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        onClick={loadData} 
                        variant="ghost" 
                        className="p-2.5 rounded-xl text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="إعادة تحميل البيانات"
                    >
                        <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    </Button>
                    <span className="px-4 py-1.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 font-black text-xs md:text-sm rounded-xl">
                        إجمالي الفئات: {categories.length}
                    </span>
                </div>
            </div>

            {/* Grid system */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Save/Edit form column */}
                <div className="lg:col-span-1">
                    <Card className="p-6 border-none shadow-md sticky top-6">
                        <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-100 dark:border-slate-800">
                            <FolderPlus size={18} className="text-indigo-600" />
                            <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm md:text-base">
                                {id ? 'تعديل بيانات الفئة' : 'إضافة فئة جديدة'}
                            </h3>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-500 mb-1.5">اسم الفئة <span className="text-rose-500">*</span></label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="مثال: مشروبات باردة، إلكترونيات..."
                                    className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-900 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                                    required
                                    disabled={saving}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-500 mb-1.5 font-bold">وصف وتعليقات</label>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="اكتب وصفاً قصيراً لمحتويات الفئة..."
                                    className="w-full min-h-[100px] p-4 bg-slate-50 dark:bg-slate-900 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm resize-none"
                                    disabled={saving}
                                />
                            </div>

                            <div className="pt-2 flex flex-col gap-2">
                                <Button
                                    type="submit"
                                    className="w-full h-11 rounded-2xl font-black bg-indigo-600 text-white hover:bg-indigo-700 shadow-md border-none"
                                    disabled={saving}
                                >
                                    {saving ? 'جاري الحفظ والتحميل...' : id ? 'تعديل وحفظ التغييرات' : 'إضافة الفئة الآن'}
                                </Button>
                                
                                {id && (
                                    <Button
                                        type="button"
                                        onClick={handleResetForm}
                                        variant="ghost"
                                        className="w-full h-11 rounded-2xl font-bold text-slate-600 hover:bg-slate-100"
                                        disabled={saving}
                                    >
                                        إلغاء التعديل والرجوع
                                    </Button>
                                )}
                            </div>
                        </form>
                    </Card>
                </div>

                {/* Categories Table/Cards List */}
                <div className="lg:col-span-2 space-y-4">
                    {loading ? (
                        <Card className="p-12 text-center text-slate-400 font-bold border-none shadow-sm flex flex-col items-center justify-center gap-2">
                            <RefreshCw className="animate-spin text-indigo-600 mb-2" size={32} />
                            <span>جاري تحميل قائمة الفئات وتعداد منتجاتها...</span>
                        </Card>
                    ) : categories.length === 0 ? (
                        <Card className="p-12 text-center text-slate-400 font-bold border-none shadow-sm flex flex-col items-center justify-center gap-2">
                            <AlertCircle size={32} className="text-amber-500 mb-1" />
                            <span className="text-slate-700 dark:text-slate-300">لا توجد أي فئات مسجلة حالياً.</span>
                            <p className="text-xs text-slate-400 mt-1 max-w-sm">يرجى إضافة فئتك الأولى من خلال النموذج الجانبي لتصنيف وتنظيم المنتجات.</p>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {categories.map(cat => {
                                const productCount = products.filter(p => p.category === cat.name).length;
                                return (
                                    <Card 
                                        key={cat.id} 
                                        className="p-5 flex flex-col justify-between border-none shadow-md hover:shadow-lg transition-all border-r-4 border-r-indigo-500"
                                    >
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-2 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 rounded-xl">
                                                        <Folder size={20} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm md:text-base">
                                                            {cat.name}
                                                        </h4>
                                                        <span className="text-[10px] font-mono text-slate-400">ID: {cat.id}</span>
                                                    </div>
                                                </div>
                                                
                                                <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-black text-xs rounded-full">
                                                    {productCount} منتج
                                                </span>
                                            </div>

                                            <p className="text-xs md:text-sm text-slate-500 line-clamp-2 h-10 font-bold font-sans">
                                                {cat.description || 'لا يوجد وصف تفصيلي مسجل لهذه الفئة حالياً...'}
                                            </p>
                                        </div>

                                        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800 mt-2">
                                            <Button
                                                onClick={() => handleEdit(cat)}
                                                variant="ghost"
                                                className="h-9 px-3 scale-95 font-bold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-xl"
                                                title="تعديل الفئة"
                                            >
                                                <Pencil size={14} className="me-1 inline" /> تعديل
                                            </Button>
                                            
                                            {deleteConfirmId === cat.id ? (
                                                <Button
                                                    onClick={() => {
                                                        setDeleteConfirmId(null);
                                                        handleDelete(cat.id, cat.name);
                                                    }}
                                                    className="h-9 px-3 scale-95 font-black bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
                                                >
                                                    تأكيد الحذف
                                                </Button>
                                            ) : (
                                                <Button
                                                    onClick={() => setDeleteConfirmId(cat.id)}
                                                    variant="ghost"
                                                    className="h-9 px-3 scale-95 font-black text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl"
                                                    title="حذف الفئة"
                                                >
                                                    <Trash2 size={14} className="me-1 inline" /> حذف
                                                </Button>
                                            )}
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CategoriesPage;
