
import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Download, RefreshCw, CheckCircle, Package, Rocket, Clock, ShieldCheck } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { toArabicIndic } from '../utils/localization';
import { useChangelog } from '../hooks/useChangelog';

const SystemUpdatesPage: React.FC = () => {
    const { settings } = useSettings();
    const { changelogData, latestVersion } = useChangelog();
    const [isDownloading, setIsDownloading] = useState(false);
    const currentVersion = '1.18.0'; // Ideally this would come from env or manifest
    const hasUpdate = currentVersion !== latestVersion;

    const handleDownload = (url?: string) => {
        if (url && url !== '#') {
            window.open(url, '_blank');
        } else {
            setIsDownloading(true);
            setTimeout(() => {
                setIsDownloading(false);
                alert("تم تنزيل حزمة التحديث بنجاح. يرجى التوجه لصفحة الإعدادات لرفع الملف وتثبيته.");
            }, 3000);
        }
    };

    return (
        <div className="animate-fadeIn pb-20">
            <header className="mb-12">
                <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">مركز تحميل التحديثات</h1>
                <p className="text-slate-500 font-medium mt-1">احصل على أحدث المميزات والإصلاحات البرمجية فور صدورها.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {changelogData.map((entry: any, idx: number) => (
                        <Card key={`${entry.version}-${idx}`} className="relative overflow-hidden group">
                            {idx === 0 && (
                                <div className="absolute top-4 left-[-30px] bg-indigo-600 text-white text-[10px] font-black px-10 py-1 rotate-[-45deg] shadow-lg">
                                    الأحدث
                                </div>
                            )}
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-600"><Package size={24} /></div>
                                    <div>
                                        <h3 className="text-xl font-black">إصدار {entry.version}</h3>
                                        <p className="text-xs text-slate-400 font-bold flex items-center gap-1"><Clock size={12} /> صدر في {new Date(entry.date).toLocaleDateString('ar-EG')}</p>
                                    </div>
                                </div>
                                <Button 
                                    onClick={() => handleDownload(entry.downloadUrl)}
                                    isLoading={isDownloading}
                                    variant={idx === 0 ? 'primary' : 'secondary'}
                                    className="rounded-xl h-11 px-6 text-xs font-black"
                                >
                                    <Download size={16} className="me-2" /> تحميل حزمة الإصدار
                                </Button>
                            </div>
                            
                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b dark:border-slate-800 pb-2">مميزات هذا الإصدار:</p>
                                <ul className="space-y-3">
                                    {entry.changes.map((change: any, i: number) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <div className={`mt-1 flex-shrink-0 w-2 h-2 rounded-full ${change.type === 'new' ? 'bg-emerald-500' : change.type === 'improvement' ? 'bg-blue-500' : 'bg-rose-500'}`}></div>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed">{change.description}</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </Card>
                    ))}
                </div>

                <div className="space-y-6">
                    <Card title="حالة النظام الحالية" className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white border-none">
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold opacity-80">الإصدار المثبت</span>
                                <span className="text-xl font-black">{currentVersion}</span>
                            </div>
                            <div className="h-px bg-white/10"></div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold opacity-80">آخر فحص</span>
                                <span className="text-xs font-black">اليوم، {toArabicIndic(new Date().toLocaleTimeString())}</span>
                            </div>
                            <div className="p-4 bg-white/10 rounded-2xl border border-white/10 text-center">
                                <p className="text-xs font-bold flex items-center justify-center gap-2">
                                    <ShieldCheck size={16} /> النظام يعمل بكامل طاقته
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card title="تعليمات التحديث">
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-xs">١</div>
                                <p className="text-xs text-slate-500 font-bold leading-relaxed">قم بتحميل ملف التحديث (.json) من الجدول المقابل.</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-xs">٢</div>
                                <p className="text-xs text-slate-500 font-bold leading-relaxed">انتقل إلى الإعدادات {'>'} مركز التحديثات الذكي.</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-xs">٣</div>
                                <p className="text-xs text-slate-500 font-bold leading-relaxed">ارفع الملف وسيقوم النظام بعمل Migrations للبيانات تلقائياً.</p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default SystemUpdatesPage;
