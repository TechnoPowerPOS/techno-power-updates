
import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { adminToolService, PromoCode } from '../services/adminToolService';
import { toArabicIndic } from '../utils/localization';
import { useToasts } from '../hooks/useToasts';
import { useSettings } from '../hooks/useSettings';
import { 
    Tag, Plus, Trash2, Calendar, 
    Hash, DollarSign, Percent, Copy,
    Clock, CheckCircle, XCircle, MessageSquare 
} from 'lucide-react';

const AdminPromoCodesPage: React.FC = () => {
    const [promos, setPromos] = useState<PromoCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const { addToast } = useToasts();
    const { settings } = useSettings();

    const [newPromo, setNewPromo] = useState<Omit<PromoCode, 'id' | 'usageCount' | 'status'>>({
        code: '',
        discountType: 'percentage',
        discountValue: 0,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        usageLimit: 100
    });

    const loadPromos = async () => {
        const data = await adminToolService.getPromoCodes();
        setPromos(data);
        setLoading(false);
    };

    useEffect(() => {
        loadPromos();
    }, []);

    const handleDelete = async (id: string) => {
        if(window.confirm('هل أنت متأكد من حذف هذا الكود؟')){
            await adminToolService.deletePromoCode(id);
            addToast('تم حذف الكود بنجاح', 'success');
            loadPromos();
        }
    };

    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code);
        addToast('تم نسخ الكود الترويجي', 'success');
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        await adminToolService.addPromoCode(newPromo);
        setIsAdding(false);
        loadPromos();
        setNewPromo({
            code: '',
            discountType: 'percentage',
            discountValue: 0,
            expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            usageLimit: 100
        });
    };

    if (loading) return <div className="p-10 text-center text-slate-500">جاري تحميل نظام الكوبونات...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8" dir="rtl">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white">إدارة الكوبونات والأكواد الترويجية</h1>
                    <p className="text-slate-500 mt-1">إنشاء خصومات مخصصة، تحديد صلاحيتها، وتتبع استخدامها.</p>
                </div>
                <Button variant="primary" onClick={() => setIsAdding(true)} icon={<Plus size={18}/>}>
                    إنشاء كود ترويجي جديد
                </Button>
            </header>

            {isAdding && (
                <Card className="animate-slideDown border-indigo-200 bg-indigo-50/30 dark:bg-indigo-900/10" title="إضافة كود جديد">
                    <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end py-2">
                        <div>
                            <label className="block text-xs font-black text-slate-500 mb-1">كود الخصم (Promo Code)</label>
                            <input 
                                type="text" value={newPromo.code} onChange={e => setNewPromo({...newPromo, code: e.target.value.toUpperCase()})}
                                className="w-full p-2.5 rounded-xl border dark:border-slate-700 bg-white dark:bg-slate-800 font-black uppercase text-center"
                                placeholder="E.G. RAMADAN20" required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-500 mb-1">نوع الخصم</label>
                            <select 
                                value={newPromo.discountType} onChange={e => setNewPromo({...newPromo, discountType: e.target.value as any})}
                                className="w-full p-2.5 rounded-xl border dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                            >
                                <option value="percentage">نسبة مئوية (%)</option>
                                <option value="fixed">مبلغ ثابت ({settings?.currency || 'EGP'})</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-500 mb-1">القيمة</label>
                            <input 
                                type="number" value={newPromo.discountValue} onChange={e => setNewPromo({...newPromo, discountValue: Number(e.target.value)})}
                                className="w-full p-2.5 rounded-xl border dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-center"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-500 mb-1">مرات الاستخدام المسموحة</label>
                            <input 
                                type="number" value={newPromo.usageLimit} onChange={e => setNewPromo({...newPromo, usageLimit: Number(e.target.value)})}
                                className="w-full p-2.5 rounded-xl border dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-center"
                                required min="1"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-500 mb-1">تاريخ الانتهاء</label>
                            <input 
                                type="date" value={newPromo.expiryDate} onChange={e => setNewPromo({...newPromo, expiryDate: e.target.value})}
                                className="w-full p-2.5 rounded-xl border dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                                required
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit" className="flex-grow">تنشيط</Button>
                            <Button variant="ghost" type="button" onClick={() => setIsAdding(false)}>إلغاء</Button>
                        </div>
                    </form>
                </Card>
            )}

            <div className="grid grid-cols-1 gap-6">
                <Card title="الأكواد النشطة والتاريخ">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-start">
                             <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 border-b dark:border-slate-700">
                                <tr>
                                    <th className="px-4 py-4 text-start font-bold uppercase tracking-wider text-[10px]">الكود</th>
                                    <th className="px-4 py-4 text-start font-bold uppercase tracking-wider text-[10px]">الخصم</th>
                                    <th className="px-4 py-4 text-start font-bold uppercase tracking-wider text-[10px]">تاريخ الانتهاء</th>
                                    <th className="px-4 py-4 text-start font-bold uppercase tracking-wider text-[10px]">الاستخدام</th>
                                    <th className="px-4 py-4 text-start font-bold uppercase tracking-wider text-[10px]">الحالة</th>
                                    <th className="px-4 py-4"></th>
                                </tr>
                             </thead>
                             <tbody className="divide-y dark:divide-slate-700">
                                {promos.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-16 text-center text-slate-400 font-bold italic">
                                            لم تقم بإنشاء أي أكواد ترويجية بعد. ابدأ بتحفيز المبيعات الآن!
                                        </td>
                                    </tr>
                                ) : promos.map(promo => (
                                    <tr key={promo.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">
                                                    <Tag size={16}/>
                                                </div>
                                                <span className="font-black text-indigo-600 dark:text-indigo-400 tracking-wider font-mono">{promo.code}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-1 font-black text-slate-800 dark:text-white">
                                                {toArabicIndic(promo.discountValue)}
                                                {promo.discountType === 'percentage' ? <Percent size={14}/> : <span className="text-[10px] opacity-60">{settings?.currency || 'EGP'}</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-xs font-bold text-slate-500">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14}/>
                                                {toArabicIndic(promo.expiryDate)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-col gap-1 w-24">
                                                <div className="flex justify-between text-[10px] font-black text-slate-400">
                                                    <span>{toArabicIndic(promo.usageCount)}</span>
                                                    <span>{toArabicIndic(promo.usageLimit)}</span>
                                                </div>
                                                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                                                    <div className="bg-indigo-500 h-full" style={{width: `${(promo.usageCount/promo.usageLimit) * 100}%`}}></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                                promo.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                                {promo.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-end space-x-reverse space-x-1 flex justify-end">
                                            <Button variant="ghost" size="sm" onClick={() => handleCopy(promo.code)} className="text-slate-500 hover:text-indigo-600"><Copy size={16}/></Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete(promo.id)} className="text-rose-500"><Trash2 size={16}/></Button>
                                        </td>
                                    </tr>
                                ))}
                             </tbody>
                        </table>
                    </div>
                </Card>
            </div>
            
            <footer className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card title="إحصائيات استخدام الكوبونات" icon={<Hash size={18} className="text-indigo-500"/>}>
                    <div className="flex items-center justify-around py-4">
                        <div className="text-center">
                            <span className="text-2xl font-black text-slate-800 dark:text-white block">
                                {toArabicIndic(promos.reduce((total, p) => total + p.usageCount, 0))}
                            </span>
                            <span className="text-xs text-slate-400 font-bold">إجمالي الخصومات الممنوحة</span>
                        </div>
                        <div className="w-px h-12 bg-slate-100 dark:bg-slate-800"></div>
                        <div className="text-center">
                            <span className="text-2xl font-black text-emerald-600 block">
                                {toArabicIndic(
                                    Math.round(promos.reduce((total, p) => {
                                        if (p.discountType === 'fixed') return total + (p.discountValue * p.usageCount);
                                        return total + (400 * (p.discountValue / 100) * p.usageCount); // Assuming 400 currency avg
                                    }, 0))
                                )} {settings?.currency || 'EGP'}
                            </span>
                            <span className="text-xs text-slate-400 font-bold">قيمة الخصومات المقدرة</span>
                        </div>
                    </div>
                </Card>

                <Card title="الأكواد الأكثر استخداماً" icon={<MessageSquare size={18} className="text-amber-500"/>}>
                    <div className="space-y-3 py-2">
                        {[...promos]
                            .filter(p => p.usageCount > 0)
                            .sort((a, b) => b.usageCount - a.usageCount)
                            .slice(0, 3)
                            .map((c, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <span className="text-xs font-black bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-indigo-600 uppercase tracking-wider">{c.code}</span>
                                <span className="text-xs font-bold text-slate-500">
                                    {toArabicIndic(c.usageCount)} مستخدم ({toArabicIndic(Math.round((c.usageCount / (promos.reduce((sum, p) => sum + p.usageCount, 0) || 1)) * 100))}%)
                                </span>
                            </div>
                        ))}
                        {promos.filter(p => p.usageCount > 0).length === 0 && (
                            <div className="text-center text-xs font-bold text-slate-400 italic">لا يوجد أكواد مستخدمة بعد</div>
                        )}
                    </div>
                </Card>
            </footer>
        </div>
    );
};

export default AdminPromoCodesPage;
