import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import { Camera, WifiOff } from 'lucide-react';
import CctvSkeleton from '../components/cctv/CctvSkeleton';

import { useLicense } from '../hooks/useLicense';
import { getPlanLimits } from '../utils/planPermissions';
import { Lock } from 'lucide-react';
import Button from '../components/ui/Button';
import { Link } from 'react-router-dom';

const CameraFeed: React.FC<{ title: string; }> = ({ title }) => (
    <Card className="p-0 aspect-video flex flex-col justify-between bg-black">
        <div className="p-2 text-white text-xs bg-black/30">
            {title}
        </div>
        <div className="flex-grow flex items-center justify-center">
            <Camera size={48} className="text-gray-500" />
        </div>
        <div className="p-2 text-red-500 text-xs flex items-center gap-1 bg-black/30">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span>REC</span>
        </div>
    </Card>
);

const CameraSurveillancePage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const { licenseInfo } = useLicense();
    const limits = getPlanLimits(licenseInfo.type);

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 1000); // Simulate loading
        return () => clearTimeout(timer);
    }, []);

    if (!limits.hasEnterprise) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fadeIn">
                <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-4">
                    <Lock size={64} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">نظام المراقبة (Enterprise)</h1>
                    <p className="text-slate-500 mt-2 max-w-md mx-auto">نظام ربط الكاميرات والمراقبة المباشرة متوفر في خطط الشركات فقط.</p>
                </div>
                <Link to="/pricing">
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-lg px-8 rounded-2xl">
                        ترقية الاشتراك
                    </Button>
                </Link>
            </div>
        );
    }

    if (loading) {
        return <CctvSkeleton />;
    }

    return (
        <div className="animate-fadeIn">
            <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center gap-3">
                    <h1 className="text-4xl font-extrabold text-gray-800 dark:text-white">مراقبة الكاميرات</h1>
                    <span className="px-3 py-1 text-sm font-semibold text-purple-800 bg-purple-100 rounded-full dark:bg-purple-900 dark:text-purple-300">
                        BETA
                    </span>
                </div>
                <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                    شاهد بثًا مباشرًا من كاميرات المراقبة في متجرك مباشرة من هنا.
                </p>
            </div>

            <Card className="mb-8 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800/50">
                <div className="flex items-center gap-4">
                    <WifiOff size={24} className="text-yellow-600 dark:text-yellow-400" />
                    <div>
                        <h4 className="font-bold text-yellow-800 dark:text-yellow-300">ميزة تجريبية</h4>
                        <p className="text-sm text-yellow-700 dark:text-yellow-400">
                            هذه الميزة في مرحلة التطوير وتتطلب إعدادًا خاصًا لربطها بنظام الكاميرات لديك. تواصل مع الدعم الفني للمزيد من المعلومات.
                        </p>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CameraFeed title="الكاميرا 1: المدخل الرئيسي" />
                <CameraFeed title="الكاميرا 2: منطقة الكاشير" />
                <CameraFeed title="الكاميرا 3: الممر الأيسر" />
                <CameraFeed title="الكاميرا 4: المخزن الخلفي" />
            </div>
        </div>
    );
};

export default CameraSurveillancePage;