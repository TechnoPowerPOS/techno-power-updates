
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

            <div className="grid grid-cols-1 gap-8">
                <Card title="بوابات الدفع والاتصاالات الخارجية" icon={<Globe size={18} className="text-blue-500"/>}>
                     <div className="space-y-4">
                        <div className="text-center py-4 text-slate-500 text-sm">
                            لا توجد بيانات حالية
                        </div>
                     </div>
                </Card>
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
