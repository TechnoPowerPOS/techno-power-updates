import React, { useState, useEffect } from 'react';
import { api } from '../services/mockApi';
import { useLicense } from '../hooks/useLicense';
import { getPlanLimits } from '../utils/planPermissions';
import { useSettings } from '../hooks/useSettings';
import { useToasts } from '../hooks/useToasts';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { FileEdit, Trash2, ShoppingCart, RefreshCw, Calendar, Search, ArrowLeft, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils/localization';

interface SalesDraftItem {
    id: string;
    customerId: string;
    customerName?: string;
    items: any[];
    total: number;
    warehouseId?: string;
    treasuryId?: string;
    date: string;
}

const SalesDraftsPage: React.FC = () => {
    const navigate = useNavigate();
    const { addToast } = useToasts();
    const { settings } = useSettings();
    const { licenseInfo } = useLicense();
    const limits = getPlanLimits(licenseInfo?.type || 'Free');

    const [drafts, setDrafts] = useState<SalesDraftItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const loadDrafts = async () => {
        setLoading(true);
        try {
            const data = await api.getSalesDrafts();
            setDrafts(data);
        } catch (error) {
            addToast('فضل تحميل المسودات.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (limits.hasSalesDrafts) {
            loadDrafts();
        }
    }, [limits.hasSalesDrafts]);

    const handleDeleteDraft = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('هل أنت متأكد من حذف هذه المسودة نهائياً؟')) return;
        try {
            await api.deleteSalesDraft(id);
            addToast('تم حذف المسودة بنجاح.', 'success');
            loadDrafts();
        } catch (error) {
            addToast('فشل حذف المسودة.', 'error');
        }
    };

    const handleLoadDraft = (id: string) => {
        navigate(`/pos?draftId=${id}`);
    };

    // Subscription block
    if (!limits.hasSalesDrafts) {
        return (
            <div className="flex flex-col items-center justify-center p-8 md:p-16 text-center animate-fadeIn">
                <div className="w-24 h-24 bg-amber-50 dark:bg-amber-950/20 text-amber-600 rounded-full flex items-center justify-center mb-8 shadow-inner border border-amber-100 dark:border-amber-900/40">
                    <Lock size={48} />
                </div>
                <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-4">ميزة مسودات فواتير المبيعات غير مفعلة</h2>
                <p className="text-slate-500 font-bold max-w-md mb-8 leading-relaxed">أداة حفظ فواتير المبيعات كمسودة واستدعائها للاستكمال ميزة متقدمة وحصرية في الباقات الأعلى. يرجى ترقيه باقتك للوصول إلى هذه الميزة.</p>
                <div className="flex items-center gap-4">
                    <Button onClick={() => navigate('/pricing')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-8 py-3 rounded-2xl shadow-lg shadow-indigo-500/20">عرض باقات الاشتراك والترقية</Button>
                    <Button onClick={() => navigate('/')} className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold px-6 py-3 rounded-2xl">الرئيسية</Button>
                </div>
            </div>
        );
    }

    const filteredDrafts = drafts.filter(d => {
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const idMatch = d.id.toLowerCase().includes(query);
            const customerMatch = d.customerName?.toLowerCase().includes(query);
            return idMatch || customerMatch;
        }
        return true;
    });

    const retentionDays = settings?.maxDraftDays || 7;

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-600/10">
                        <FileEdit size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white">مسودات الفواتير المعلقة</h1>
                        <p className="text-xs text-slate-500 font-bold">حفظ مؤقت لفواتير العملاء الحالية لاستدعائها بنقرة واحدة وإكمالها فورا.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 self-stretch md:self-auto">
                    <Button onClick={loadDrafts} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700">
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </Button>
                    <Button onClick={() => navigate('/pos')} className="flex items-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-black text-xs shadow-md">
                        <ShoppingCart size={16} /> فتح الكاشير
                    </Button>
                    <Button onClick={() => navigate(-1)} className="flex items-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-xs">
                        <ArrowLeft size={16} /> العودة
                    </Button>
                </div>
            </div>

            {/* Retention alert */}
            <div className="p-4 bg-amber-50/60 dark:bg-amber-950/10 rounded-2xl border border-amber-100/60 dark:border-amber-900/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <Calendar className="text-amber-600 shrink-0" size={20} />
                    <p className="text-xs font-bold text-slate-600 dark:text-amber-400">
                        سياسة الصيانة النشطة: يتم تلقائياً حذف المسودات التي يمر عليها أكثر من <span className="font-mono text-sm underline text-indigo-600">{retentionDays} أيام</span> دون استكمال، لتوفير مساحة للتخزين المحلي.
                    </p>
                </div>
                <Button onClick={() => navigate('/settings?tab=pos')} className="bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/30 text-amber-900 dark:text-amber-300 font-black px-4 py-2 rounded-xl text-[10px]">
                    تغيير المدة من الإعدادات
                </Button>
            </div>

            {/* Search Input */}
            <Card>
                <div className="relative w-full">
                    <Search className="absolute right-3.5 top-3.5 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="البحث باسم العميل أو رقم المسودة المؤقت..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pr-10 pl-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                </div>
            </Card>

            {/* Draft Cards List */}
            {loading ? (
                <div className="py-20 text-center text-slate-500 font-bold">جاري تحميل مسودات المبيعات...</div>
            ) : filteredDrafts.length === 0 ? (
                <Card>
                    <div className="py-20 text-center text-slate-400 font-bold flex flex-col items-center gap-4">
                        <FileEdit size={48} className="text-slate-300 dark:text-slate-700" />
                        <div>
                            <h3 className="text-base text-slate-700 dark:text-white font-black">لا توجد مسودات معلقة حالياً</h3>
                            <p className="text-xs text-slate-400 font-bold mt-1">يمكنك البدء بحفظ أي فاتورة كمسودة من شاشة الكاشير للوصول إليها لاحقاً.</p>
                        </div>
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {filteredDrafts.map((d) => (
                        <div
                            key={d.id}
                            onClick={() => handleLoadDraft(d.id)}
                            className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl dark:hover:border-indigo-500/30 hover:border-indigo-100 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between group h-64"
                        >
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-[10px] font-mono font-black text-slate-400 select-all">{d.id}</span>
                                    <span className="text-[10px] font-bold text-slate-400 font-mono">
                                        {new Date(d.date).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                                    </span>
                                </div>
                                <h3 className="font-black text-sm text-slate-800 dark:text-white capitalize group-hover:text-indigo-600 transition-colors">
                                    {d.customerName || 'عميل نقدي سريع'}
                                </h3>
                                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-2">
                                    يحتوي على <span className="font-mono text-xs text-indigo-500">{d.items?.length || 0} منتجات</span> في السلة
                                </p>
                            </div>

                            <div className="pt-4 border-t dark:border-slate-800 border-slate-100 flex items-center justify-between mt-auto">
                                <div>
                                    <p className="text-[9px] font-bold text-slate-400">القيمة الإجمالية</p>
                                    <p className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                                        {formatCurrency(d.total, settings?.currency)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button
                                        onClick={(e) => handleDeleteDraft(d.id, e)}
                                        className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 rounded-xl"
                                        title="حذف المسودة"
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                    <button
                                        onClick={() => handleLoadDraft(d.id)}
                                        className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black rounded-xl transition-all shadow-md shadow-indigo-600/10"
                                    >
                                        استرجاع <ShoppingCart size={13} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SalesDraftsPage;
