import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, BrainCircuit, Rocket, Construction } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const ComingSoonPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 md:p-8 animate-in fade-in duration-700">
            <div className="relative mb-12 text-center">
                <div className="absolute -top-12 -left-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
                <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -z-10 animate-pulse delay-1000"></div>
                
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] shadow-2xl flex items-center justify-center text-white mx-auto mb-8 transform hover:scale-110 transition-transform duration-500 rotate-3">
                     <Rocket size={44} />
                </div>
                
                <h1 className="text-4xl md:text-6xl font-black text-slate-800 dark:text-white tracking-tighter mb-4">
                    قريباً جداً... <span className="text-indigo-600">تحت التطوير</span>
                </h1>
                
                <p className="text-lg md:text-xl font-bold text-slate-500 max-w-2xl mx-auto leading-relaxed">
                    نحن نعمل بجهد كبير لإطلاق هذا القسم بأعلى معايير الجودة والاستقرار. سيكون متاحاً قريباً ضمن باقتك الحالية.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
                <Card className="p-6 border-slate-100 dark:border-slate-800 text-center hover:border-indigo-200 transition-all bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto mb-4">
                        <Sparkles size={24} />
                    </div>
                    <h3 className="font-black text-slate-800 dark:text-white mb-2">ذكاء اصطناعي</h3>
                    <p className="text-xs font-bold text-slate-500">سيتم دمج قدرات الذكاء الاصطناعي لتحليل البيانات تلقائياً</p>
                </Card>

                <Card className="p-6 border-slate-100 dark:border-slate-800 text-center hover:border-indigo-200 transition-all bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto mb-4">
                        <Rocket size={24} />
                    </div>
                    <h3 className="font-black text-slate-800 dark:text-white mb-2">سرعة فائقة</h3>
                    <p className="text-xs font-bold text-slate-500">تم تحسين واجهة المستخدم لتوفير تجربة سريعة وسلسة</p>
                </Card>

                <Card className="p-6 border-slate-100 dark:border-slate-800 text-center hover:border-indigo-200 transition-all bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                    <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-600 mx-auto mb-4">
                        <Construction size={24} />
                    </div>
                    <h3 className="font-black text-slate-800 dark:text-white mb-2">استقرار تام</h3>
                    <p className="text-xs font-bold text-slate-500">نجري اختبارات مكثفة لضمان عدم وجود أخطاء برمجية</p>
                </Card>
            </div>

            <div className="mt-12 flex flex-col md:flex-row gap-4">
                <Button onClick={() => navigate(-1)} className="h-14 px-10 rounded-2xl bg-indigo-600 font-black shadow-xl shadow-indigo-600/20">
                    <ArrowRight size={20} className="me-3" /> العودة للسابقة
                </Button>
                <Button variant="ghost" onClick={() => navigate('/')} className="h-14 px-10 rounded-2xl font-black">
                     الذهاب للرئيسية
                </Button>
            </div>
            
            <p className="mt-12 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <BrainCircuit size={14} /> Techno Power Engine v1.2 Stable
            </p>
        </div>
    );
};

export default ComingSoonPage;
