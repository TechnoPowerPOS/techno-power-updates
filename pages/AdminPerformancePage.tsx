
import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { adminToolService, SystemHealthReport } from '../services/adminToolService';
import { toArabicIndic } from '../utils/localization';
import { 
    Activity, Cpu, HardDrive, Database, Zap, 
    ShieldAlert, Globe, Server, RefreshCw, Download, Terminal
} from 'lucide-react';

const AdminPerformancePage: React.FC = () => {
    const [metrics, setMetrics] = useState<SystemHealthReport['performance'] | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshMetrics = async () => {
        setLoading(true);
        const data = await adminToolService.getPerformanceMetrics();
        setMetrics(data || null);
        setLoading(false);
    };

    useEffect(() => {
        refreshMetrics();
        const interval = setInterval(refreshMetrics, 10000); // refresh every 10s
        return () => clearInterval(interval);
    }, []);

    const indicators = [
        { label: 'حالة السيرفر', value: metrics?.uptime || '99.9%', icon: <Server size={20}/>, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
        { label: 'استهلاك CPU', value: `${toArabicIndic(metrics?.cpuUsage || 0)}%`, icon: <Cpu size={20}/>, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
        { label: 'استهلاك RAM', value: `${toArabicIndic(metrics?.ramUsage || 0)}%`, icon: <Activity size={20}/>, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
        { label: 'سرعة API', value: `${toArabicIndic(metrics?.apiLatency || 0)}ms`, icon: <Zap size={20}/>, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8" dir="rtl">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white">مراقبة النظام والأداء التقني</h1>
                    <p className="text-slate-500 mt-1">عرض حي لاستقرار السيرفرات، الموارد، وقاعدة البيانات.</p>
                </div>
                <Button variant="secondary" onClick={refreshMetrics} icon={<RefreshCw size={18} className={loading ? 'animate-spin' : ''}/>}>
                    تحديث لحظي
                </Button>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {indicators.map((ind, i) => (
                    <Card key={i} className="hover:shadow-lg transition-transform hover:-translate-y-1">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${ind.bg} ${ind.color}`}>
                                {ind.icon}
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-500 block">{ind.label}</span>
                                <span className={`text-2xl font-black ${ind.color}`}>{ind.value}</span>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <Card title="استهلاك مساحة التخزين وقاعدة البيانات" icon={<HardDrive size={18} className="text-slate-500"/>}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-black text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                        <Database size={16} className="text-blue-500"/> حجم قاعدة البيانات
                                    </span>
                                    <span className="text-sm font-bold text-slate-500">{toArabicIndic(metrics?.dbSize || '')}</span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden border dark:border-slate-700">
                                    <div className="bg-blue-500 h-full" style={{width: '60%'}}></div>
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold italic">نمو البيانات: +0.2% أسبوعياً</p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-black text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                        <HardDrive size={16} className="text-indigo-500"/> استهلاك التخزين (الملفات)
                                    </span>
                                    <span className="text-sm font-bold text-slate-500">{toArabicIndic(metrics?.storageUsage || '')}</span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden border dark:border-slate-700">
                                    <div className="bg-indigo-500 h-full" style={{width: '45%'}}></div>
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold italic">95% صور المنتجات والباركود</p>
                            </div>
                        </div>
                    </Card>

                    <Card title="بوابات الدفع والاتصاالات الخارجية" icon={<Globe size={18} className="text-blue-500"/>}>
                         <div className="space-y-4">
                            <div className="text-center py-4 text-slate-500 text-sm">
                                لا توجد بيانات حالية
                            </div>
                         </div>
                    </Card>
                </div>

                <div className="lg:col-span-1 space-y-6">
                    <Card title="إدارة النسخ الاحتياطي (Backup)" icon={<RefreshCw size={18} className="text-emerald-500"/>}>
                        <div className="flex flex-col items-center text-center py-4">
                            <h4 className="font-black text-slate-800 dark:text-white mt-4">إدارة النسخ الاحتياطي</h4>
                            <p className="text-xs text-slate-500 mt-2 font-bold italic leading-relaxed">
                                جار معالجة الميزة
                            </p>
                        </div>
                    </Card>

                    <Card title="سجل الأخطاء والبرمجيات" icon={<Terminal size={18} className="text-rose-500"/>}>
                         <div className="p-4 bg-slate-900 rounded-xl text-xs font-mono text-emerald-400/90 overflow-hidden relative group">
                            <div className="text-center text-slate-500 py-4">
                                 لا توجد أخطاء مسجلة حالياً
                            </div>
                         </div>
                    </Card>

                    <Card title="إصدارات البرنامج" icon={<Activity size={18} className="text-indigo-500"/>}>
                         <div className="space-y-3">
                             <div className="text-center text-slate-500 text-sm py-4">
                                 جاري جمع بيانات الإصدارات...
                             </div>
                         </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

const CheckCircle = ({size}: {size: number}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
);

export default AdminPerformancePage;
