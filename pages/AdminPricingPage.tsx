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
        enableInstallmentDemo: true,
        basicYearly: { price: '', oldPrice: '', discount: '', note: 'ادفع 9 جنيه فليوم', installmentPlan: '', installment: { downPayment: '', monthlyPayment: '', months: '12', interest: '40' } },
        proYearly: { price: '', oldPrice: '', discount: '', note: 'ادفع 20 جنيه فليوم', installmentPlan: '', installment: { downPayment: '', monthlyPayment: '', months: '12', interest: '40' } },
        businessYearly: { price: '', oldPrice: '', discount: '', note: 'ادفع 38 جنيه فليوم', installmentPlan: '', installment: { downPayment: '', monthlyPayment: '', months: '12', interest: '40' } }
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

    const handleInstallmentChange = (plan: keyof typeof pricing, field: string, value: string) => {
        setPricing(prev => {
            const currentPlan = prev[plan] as any;
            return {
                ...prev,
                [plan]: { 
                    ...currentPlan, 
                    installment: { ...(currentPlan.installment || {}), [field]: value } 
                }
            };
        });
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

            {/* Global Installment Toggle */}
            <Card className="mb-8 border-2 border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md overflow-hidden">
                <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2.5">
                            <span className="p-1 px-2.5 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-lg font-bold">نظام تجريبي ديمو</span>
                            عرض خطط التقسيط الميسرة
                        </h2>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                            تفعيل أو إلغاء تفعيل عرض مميزات وخيارات السداد بالتقسيط للعملاء على الباقات والبلانز.
                        </p>
                    </div>
                    <div>
                        <button
                            type="button"
                            onClick={() => {
                                setPricing(prev => ({
                                    ...prev,
                                    enableInstallmentDemo: !prev.enableInstallmentDemo
                                }));
                            }}
                            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                                pricing.enableInstallmentDemo ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                        >
                            <span
                                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                    pricing.enableInstallmentDemo ? '-translate-x-5' : 'translate-x-0'
                                }`}
                            />
                        </button>
                    </div>
                </div>
            </Card>

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
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">ملاحظة أعلى الباقة</label>
                                <input 
                                    type="text" 
                                    value={pricing[plan.id]?.note || ''}
                                    onChange={(e) => handleChange(plan.id, 'note', e.target.value)}
                                    placeholder="مثال: ادفع 9 جنيه فليوم"
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-emerald-600 focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">نص عرض خطة التقسيط بالكامل (سلوجان)</label>
                                <textarea 
                                    rows={3}
                                    value={(pricing[plan.id] as any)?.installmentPlan || ''}
                                    onChange={(e) => handleChange(plan.id, 'installmentPlan', e.target.value)}
                                    placeholder="مثال: ابدأ عملك اليوم بـ 50% فقط، ووزع تكاليف..."
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 text-sm leading-relaxed"
                                />
                            </div>
                            <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
                                <h4 className="text-sm font-black text-indigo-600 dark:text-indigo-400 mb-4">تفاصيل خطة التقسيط</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">المقدم</label>
                                        <input 
                                            type="text" 
                                            value={pricing[plan.id]?.installment?.downPayment || ''}
                                            onChange={(e) => handleInstallmentChange(plan.id, 'downPayment', e.target.value)}
                                            placeholder="مثال: 1745"
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">القسط الشهري</label>
                                        <input 
                                            type="text" 
                                            value={pricing[plan.id]?.installment?.monthlyPayment || ''}
                                            onChange={(e) => handleInstallmentChange(plan.id, 'monthlyPayment', e.target.value)}
                                            placeholder="مثال: 185"
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">تحديد الفائدة (%)</label>
                                        <input 
                                            type="text" 
                                            value={pricing[plan.id]?.installment?.interest || ''}
                                            onChange={(e) => handleInstallmentChange(plan.id, 'interest', e.target.value)}
                                            placeholder="مثال: 40"
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">عدد الشهور</label>
                                        <input 
                                            type="text" 
                                            value={pricing[plan.id]?.installment?.months || ''}
                                            onChange={(e) => handleInstallmentChange(plan.id, 'months', e.target.value)}
                                            placeholder="مثال: 12"
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
