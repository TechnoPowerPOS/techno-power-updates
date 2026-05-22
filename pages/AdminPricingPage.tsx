import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { adminToolService } from '../services/adminToolService';
import { Crown, DollarSign, Save } from 'lucide-react';
import { useToasts } from '../hooks/useToasts';

export default function AdminPricingPage() {
    const { addToast } = useToasts();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [pricing, setPricing] = useState({
        basicMonthly: { price: '', oldPrice: '', discount: '' },
        proMonthly: { price: '', oldPrice: '', discount: '' },
        businessMonthly: { price: '', oldPrice: '', discount: '' },
        basicYearly: { price: '', oldPrice: '', discount: '' },
        proYearly: { price: '', oldPrice: '', discount: '' },
        businessYearly: { price: '', oldPrice: '', discount: '' }
    });

    useEffect(() => {
        adminToolService.getGlobalPricing().then(data => {
            // Fill any missing keys with defaults from getDefaultAdminData if needed
            setPricing(prev => ({
                ...prev,
                ...data
            }));
            setLoading(false);
        });
    }, []);

    const handleChange = (plan: keyof typeof pricing, field: string, value: string) => {
        setPricing(prev => ({
            ...prev,
            [plan]: { ...(prev[plan] as any), [field]: value }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await adminToolService.saveGlobalPricing(pricing as any);
            addToast('تم حفظ خطط الأسعار بنجاح', 'success');
        } catch (e) {
            addToast('حدث خطأ أثناء الحفظ', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-10 text-center text-slate-500">جاري التحميل...</div>;

    const plans = [
        { id: 'basicMonthly', title: 'Basic (شهري)', color: 'text-zinc-500', bg: 'bg-zinc-50 dark:bg-zinc-900/20' },
        { id: 'proMonthly', title: 'Pro (شهري)', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
        { id: 'businessMonthly', title: 'Business (شهري)', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
        { id: 'basicYearly', title: 'Basic (سنوي)', color: 'text-zinc-600', bg: 'bg-zinc-100 dark:bg-zinc-900/40' },
        { id: 'proYearly', title: 'Pro (سنوي)', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/40' },
        { id: 'businessYearly', title: 'Business (سنوي)', color: 'text-amber-700', bg: 'bg-amber-100 dark:bg-amber-900/40' }
    ] as const;

    return (
        <div className="p-4 sm:p-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                        <DollarSign /> تعديل أسعار التراخيص
                    </h1>
                    <p className="text-slate-500 font-bold mt-2">يمكنك تعديل الأسعار وعروض الخصم التي تظهر للعملاء في صفحة الترقية.</p>
                </div>
                <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 px-6 h-12 rounded-2xl flex items-center gap-2 font-bold shadow-lg shadow-indigo-600/20">
                    <Save size={18} /> {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map(plan => (
                    <Card key={plan.id} className="border-2 border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                        <div className={`p-4 rounded-2xl ${plan.bg} ${plan.color} mb-6 flex items-center gap-3 font-black text-lg`}>
                            <Crown size={24} /> {plan.title}
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">السعر الحالي (بعد الخصم)</label>
                                <input 
                                    type="text" 
                                    value={pricing[plan.id].price}
                                    onChange={(e) => handleChange(plan.id, 'price', e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">السعر القديم (قبل الخصم)</label>
                                <input 
                                    type="text" 
                                    value={pricing[plan.id].oldPrice}
                                    onChange={(e) => handleChange(plan.id, 'oldPrice', e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-500 line-through focus:ring-2 focus:ring-indigo-500 focus:line-through-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">نص الخصم (مثل: 25%)</label>
                                <input 
                                    type="text" 
                                    value={pricing[plan.id].discount}
                                    onChange={(e) => handleChange(plan.id, 'discount', e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-rose-500 focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
