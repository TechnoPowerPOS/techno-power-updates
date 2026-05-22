
import React, { useState, useEffect } from 'react';
import { adminToolService } from '../services/adminToolService';
import { useToasts } from '../hooks/useToasts';
import { Save, List, Plus, Trash2, Zap } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const AdminPlanFeaturesPage: React.FC = () => {
    const { addToast } = useToasts();
    const [features, setFeatures] = useState<Record<string, string[]>>({
        'Free': [],
        'Basic': [],
        'Pro': [],
        'Business': []
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<string>('Free');
    const [newFeature, setNewFeature] = useState('');

    useEffect(() => {
        const load = async () => {
            const data = await adminToolService.getPlanMarketingContent();
            if (data) setFeatures(data);
            setLoading(false);
        };
        load();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await adminToolService.savePlanMarketingContent(features);
            addToast('تم حفظ مميزات الباقات بنجاح', 'success');
        } catch (error) {
            addToast('فشل حفظ التعديلات', 'error');
        } finally {
            setSaving(false);
        }
    };

    const addFeature = () => {
        if (!newFeature.trim()) return;
        setFeatures(prev => ({
            ...prev,
            [selectedPlan]: [...(prev[selectedPlan] || []), newFeature.trim()]
        }));
        setNewFeature('');
    };

    const removeFeature = (index: number) => {
        setFeatures(prev => ({
            ...prev,
            [selectedPlan]: prev[selectedPlan].filter((_, i) => i !== index)
        }));
    };

    if (loading) return <div className="flex justify-center p-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-600"></div></div>;

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-20">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                        <Zap className="text-amber-500" /> إدارة مميزات الباقات
                    </h2>
                    <p className="text-slate-500 font-bold text-sm">اكتب ما سيظهر للمستخدمين في صفحة الأسعار لكل باقة.</p>
                </div>
                <Button onClick={handleSave} isLoading={saving} className="bg-indigo-600 h-12 px-8 rounded-2xl font-black">
                    <Save className="me-2" size={18} /> حفظ التغييرات
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {Object.keys(features).map(plan => (
                    <button 
                        key={plan}
                        onClick={() => setSelectedPlan(plan)}
                        className={`p-4 rounded-2xl font-black transition-all ${selectedPlan === plan ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-500'}`}
                    >
                        {plan}
                    </button>
                ))}
            </div>

            <Card className="p-8 rounded-[2.5rem]">
                <div className="flex gap-3 mb-8">
                    <input 
                        type="text" 
                        value={newFeature}
                        onChange={e => setNewFeature(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && addFeature()}
                        placeholder="أدخل ميزة جديدة لهذه الباقة..."
                        className="flex-1 h-14 px-6 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-600/20"
                    />
                    <Button onClick={addFeature} className="bg-indigo-600 w-14 h-14 rounded-2xl p-0 flex items-center justify-center">
                        <Plus size={24} />
                    </Button>
                </div>

                <div className="space-y-3">
                    {features[selectedPlan]?.map((feature, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 group hover:border-indigo-200 transition-all">
                            <span className="font-bold text-slate-700 dark:text-slate-200">{feature}</span>
                            <button onClick={() => removeFeature(idx)} className="text-slate-400 hover:text-rose-500 p-2 rounded-xl transition-colors">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                    {(!features[selectedPlan] || features[selectedPlan].length === 0) && (
                        <div className="text-center py-10 opacity-40">
                             <List size={48} className="mx-auto mb-3" />
                             <p className="font-black text-sm">لا توجد ميزات لهذه الباقة حالياً</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default AdminPlanFeaturesPage;
