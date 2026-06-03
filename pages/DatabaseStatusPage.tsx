import React, { useEffect, useState, useCallback, useRef } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { api } from '../services/mockApi';
import type { SyncLog } from '../types';
import { Server, Wifi, CheckCircle, RefreshCw, Database, Key, Trash2, AlertTriangle, Download, Terminal, Settings } from 'lucide-react';
import { toArabicIndic } from '../utils/localization';
import { useSync } from '../hooks/useSync';
import firebaseConfig from '../firebase-applet-config.json';
import { getCurrentDbKey } from '../services/branchService';
import { useLicense } from '../hooks/useLicense';
import { getPlanLimits } from '../utils/planPermissions';
import JSZip from 'jszip';
import LockedFeature from '../components/ui/LockedFeature';

const DatabaseStatusPage: React.FC = () => {
    const [logs, setLogs] = useState<SyncLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncingTable, setSyncingTable] = useState<string | null>(null);
    const { isOnline, setOnline } = useSync();
    const { licenseInfo } = useLicense();
    const limits = getPlanLimits(licenseInfo.type);
    
    // Auto Backup State
    const [autoBackupInterval, setAutoBackupInterval] = useState<number>(24);
    const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
    const [isConfiguringAutoBackup, setIsConfiguringAutoBackup] = useState(false);

    
    // Diagnostics State
    const [allStorageKeys, setAllStorageKeys] = useState<{key: string, size: number}[]>([]);
    const currentKey = getCurrentDbKey();

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        const data = await api.getSyncLogs();
        setLogs(data);
        
        // Scan LocalStorage
        const keys: {key: string, size: number}[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                const val = localStorage.getItem(key) || '';
                keys.push({ key, size: val.length });
            }
        }
        setAllStorageKeys(keys.sort((a, b) => b.size - a.size));
        
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const recoverData = (fromKey: string) => {
        if (!window.confirm(`هل أنت متأكد من استعادة البيانات من المفتاح ${fromKey}؟ سيؤدي هذا إلى استبدال البيانات الحالية.`)) return;
        
        const data = localStorage.getItem(fromKey);
        if (data) {
            localStorage.setItem(currentKey, data);
            window.location.reload();
        }
    };

    const getRelativeTime = (dateString: string) => {
        if (!dateString) return "أبداً";
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
        if (seconds < 5) return "الآن";
        if (seconds < 60) return `منذ ${toArabicIndic(seconds)} ثوانٍ`;
        const minutes = Math.round(seconds / 60);
        return `منذ ${toArabicIndic(minutes)} دقيقة`;
    };

    const handleDownloadJson = async () => {
        try {
            const data = await api.getBackupData();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `techno_power_backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Backup JSON generated failed', err);
        }
    };

    const handleDownloadZip = async () => {
        if (!limits.hasZipBackup) return;
        try {
            const data = await api.getBackupData();
            const zip = new JSZip();
            zip.file(`techno_power_backup_${new Date().toISOString().split('T')[0]}.json`, data);
            
            const content = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = `techno_power_backup_${new Date().toISOString().split('T')[0]}.zip`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Backup ZIP generated failed', err);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64">جاري تحميل حالة قاعدة البيانات...</div>;
    }

    return (
        <div className="space-y-6 animate-fadeIn pb-20" dir="rtl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white">مركز تشخيص قاعدة البيانات</h1>
                    <p className="text-slate-500 font-bold mt-1">فحص الاتصال، تخزين البيانات، وأدوات الاستعادة</p>
                </div>
                <div className="flex gap-3">
                    <Button onClick={fetchLogs} variant="outline" className="rounded-2xl">
                        <RefreshCw size={18} className="me-2" /> تحديث البيانات
                    </Button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Firebase Connection Card */}
                <Card title="اتصال Firebase Cloud">
                    <div className="space-y-4 pt-2">
                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                           <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl ${isOnline ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                    <Wifi size={24} />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-500">حالة السحابة</p>
                                    <p className={`text-lg font-black ${isOnline ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {isOnline ? 'متصل بالسحابة' : 'وضع المعاينة (Offline)'}
                                    </p>
                                </div>
                           </div>
                           <button onClick={() => setOnline(!isOnline)} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${isOnline ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>
                                {isOnline ? 'قطع الاتصال' : 'محاكاة الاتصال'}
                           </button>
                        </div>

                        <div className="p-4 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500 font-bold">Project ID:</span>
                                <span className="font-mono text-xs bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">{firebaseConfig.projectId}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500 font-bold">Database ID:</span>
                                <span className="font-mono text-xs bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded truncate max-w-[200px]">{firebaseConfig.firestoreDatabaseId}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500 font-bold">Region:</span>
                                <span className="font-bold">Europe (West)</span>
                            </div>
                        </div>
                        
                        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/50 flex gap-3">
                            <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                            <p className="text-xs text-amber-800 dark:text-amber-400 font-bold leading-relaxed">
                                ملاحظة: يتم تخزين بيانات المنتجات والمبيعات محلياً لضمان السرعة الفائقة، بينما يتم تخزين التراخيص والإعدادات الكبرى فقط في Firebase.
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Local Storage Card */}
                <Card title="مستودع البيانات المحلي (Browser Storage)">
                    <div className="space-y-4 pt-2">
                        <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-900/50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20">
                                    <Database size={24} />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-blue-500">المفتاح النشط حالياً</p>
                                    <p className="text-sm font-mono font-black text-blue-900 dark:text-blue-300">{currentKey}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs font-black text-slate-500 mb-2 px-1">سجل التخزين الموجود بالمتصفح:</p>
                            <div className="max-h-[200px] overflow-y-auto custom-scrollbar space-y-2 pr-1">
                                {allStorageKeys.filter(k => k.key.includes('techno_power')).map(({key, size}) => (
                                    <div key={key} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${key === currentKey ? 'bg-white border-blue-500 ring-2 ring-blue-500/5' : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}>
                                        <div className="flex items-center gap-3">
                                            <Key size={14} className={key === currentKey ? 'text-blue-500' : 'text-slate-400'} />
                                            <div>
                                                <p className="text-[11px] font-mono font-black truncate max-w-[180px]">{key}</p>
                                                <p className="text-[10px] font-bold text-slate-500">الحجم: {toArabicIndic((size / 1024).toFixed(2))} KB</p>
                                            </div>
                                        </div>
                                        {key !== currentKey && size > 500 && (
                                            <button 
                                                onClick={() => recoverData(key)}
                                                className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-black rounded-lg hover:bg-blue-700 shadow-sm"
                                            >
                                                استعادة البيانات
                                            </button>
                                        )}
                                        {key === currentKey && (
                                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">نشط</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-2">
                             <Button 
                                variant="danger" 
                                size="sm" 
                                className="w-full rounded-2xl font-black text-xs h-10 border-0 bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 shadow-none"
                                onClick={() => {
                                    if(window.confirm('سيتم حذف البيانات المؤقتة والمسودات، هل تريد المتابعة؟')) {
                                        localStorage.clear();
                                        window.location.reload();
                                    }
                                }}
                            >
                                <Trash2 size={14} className="me-2" /> تنظيف جميع بيانات المتصفح (خيار خطير)
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Sync Logic Analysis */}
            <Card title="تحليل عمليات المزامنة" icon={<Terminal size={20} className="text-slate-400" />}>
                 <div className="overflow-x-auto mt-4 px-1 pb-2">
                    <table className="w-full text-sm text-start">
                        <thead className="text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th scope="col" className="px-6 py-4">جدول البيانات</th>
                                <th scope="col" className="px-6 py-4">السجلات</th>
                                <th scope="col" className="px-6 py-4">آخر مزامنة</th>
                                <th scope="col" className="px-6 py-4 text-center">حالة الربط</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {[
                                { name: 'المنتجات والمخزون', key: 'products' },
                                { name: 'المبيعات والفواتير', key: 'sales' },
                                { name: 'العملاء والمديونيات', key: 'customers' },
                                { name: 'الخزائن والمعاملات', key: 'transactions' },
                                { name: 'المشتريات والموردين', key: 'purchases' }
                            ].map((item) => {
                                const log = logs.find(l => l.tableName.toLowerCase().includes(item.key));
                                return (
                                    <tr key={item.key} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                                    <CheckCircle size={14} />
                                                </div>
                                                <span className="font-bold text-slate-700 dark:text-slate-300">{item.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-500">
                                            {toArabicIndic(log?.recordCount || 0)}
                                        </td>
                                        <td className="px-6 py-4 text-slate-400 font-bold text-xs">
                                            {getRelativeTime(log?.lastSynced || '')}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                             <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black">
                                                <CheckCircle size={12} />
                                                آمن محلياً
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Card title="أدوات تصدير النسخ الاحتياطي (BackupTools)">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <Button onClick={handleDownloadJson} variant="ghost" className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 h-20 flex flex-col justify-center items-center gap-2 text-slate-400 hover:text-blue-600 hover:border-blue-500 transition-all">
                        <Download size={20} />
                        <span className="text-xs font-black">تنزيل نسخة احتياطية (JSON)</span>
                    </Button>
                    
                    {limits.hasZipBackup ? (
                        <Button onClick={handleDownloadZip} variant="ghost" className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 h-20 flex flex-col justify-center items-center gap-2 text-slate-400 hover:text-fuchsia-600 hover:border-fuchsia-500 transition-all">
                            <Download size={20} />
                            <span className="text-xs font-black">تنزيل نسخة احتياطية (ZIP)</span>
                        </Button>
                    ) : (
                        <LockedFeature message="تصدير بصيغة ZIP متاح في الباقات المتقدمة" />
                    )}

                    <Button onClick={() => setIsConfiguringAutoBackup(true)} variant="ghost" className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 h-20 flex flex-col justify-center items-center gap-2 text-slate-400 hover:text-amber-600 hover:border-amber-500 transition-all">
                        <Settings size={20} />
                        <span className="text-xs font-black">إعدادات النسخ التلقائي</span>
                    </Button>
                </div>
            </Card>

            <Card title="أدوات المطور المتقدمة">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
                    <Button variant="ghost" className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 h-20 flex flex-col justify-center items-center gap-2 text-slate-400 hover:text-blue-600 hover:border-blue-500 transition-all">
                        <Terminal size={20} />
                        <span className="text-xs font-black">فحص تكامل الملفات</span>
                    </Button>

                    <Button 
                        variant="ghost" 
                        onClick={() => {
                            const newId = window.prompt('أدخل Project ID الجديد لاربط البرنامج به:', firebaseConfig.projectId);
                            if(newId && newId !== firebaseConfig.projectId) {
                                alert('الرجاء تزويد المطور بالمعرف الجديد لتحديث ملفات الربط الأساسية.');
                            }
                        }}
                        className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 h-20 flex flex-col justify-center items-center gap-2 text-slate-400 hover:text-blue-600 hover:border-blue-500 transition-all"
                    >
                        <Wifi size={20} />
                        <span className="text-xs font-black">تغيير مشروع Firebase</span>
                    </Button>
                </div>
            </Card>

            {isConfiguringAutoBackup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm shadow-2xl">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black">إعدادات النسخ الاحتياطي التلقائي</h3>
                            <button onClick={() => setIsConfiguringAutoBackup(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                ✕
                            </button>
                        </div>

                        {!limits.hasAutoBackup ? (
                            <LockedFeature message="هذه الميزة مدعومة في باقات الأعمال والشركات." />
                        ) : (
                            <div className="space-y-4">
                                <label className="flex items-center gap-3">
                                    <input 
                                        type="checkbox" 
                                        checked={autoBackupEnabled} 
                                        onChange={e => setAutoBackupEnabled(e.target.checked)} 
                                        className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500" 
                                        disabled={!limits.hasAutoBackup}
                                    />
                                    <span className="font-bold">تفعيل النسخ الاحتياطي التلقائي (محلياً)</span>
                                </label>

                                {autoBackupEnabled && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">تكرار النسخ الاحتياطي</label>
                                            <select 
                                                value={autoBackupInterval} 
                                                onChange={e => setAutoBackupInterval(parseInt(e.target.value))}
                                                className="w-full rounded-2xl border-2 border-slate-200 p-3"
                                            >
                                                <option value={1}>كل ساعة</option>
                                                <option value={12}>كل 12 ساعة</option>
                                                <option value={24}>يومياً</option>
                                                <option value={168}>أسبوعياً</option>
                                            </select>
                                        </div>
                                        <p className="text-xs font-bold text-slate-500 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-2xl">
                                            سيعمل البرنامج على أخذ الجلسات وتصدير النسخة الاحتياطية في الخلفية حسب التردد المحدد لتتمكن من تنزيلها. ملاحظة: متصفح الويب لا يسمح بحفظ الملفات تلقائياً على جهازك بدون تدخل، سيتم تحميله في مجلد التنزيلات الافتراضي، أو يمكنك ربط مسار محلي في تطبيق سطح المكتب.
                                        </p>
                                    </>
                                )}
                                
                                <Button onClick={() => {
                                    // Save config to mockApi or local settings
                                    localStorage.setItem('tp_auto_backup_config', JSON.stringify({
                                        enabled: autoBackupEnabled,
                                        interval: autoBackupInterval
                                    }));
                                    alert('تم حفظ إعدادات النسخ الاحتياطي التلقائي.');
                                    setIsConfiguringAutoBackup(false);
                                }} className="w-full rounded-2xl mt-4">
                                    حفظ الإعدادات
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DatabaseStatusPage;
