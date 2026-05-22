
import React, { useEffect, useState } from 'react';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { adminToolService, SystemHealthReport } from '../services/adminToolService';
import type { AdminAuditLog } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Key, LogOut, ShieldCheck, FileText, Ban, Home, AlertTriangle, ShieldAlert, Stethoscope, CheckCircle, XCircle, Users, Info, TrendingUp, Server, Zap } from 'lucide-react';
import { toArabicIndic } from '../utils/localization';
import { useNavigate } from 'react-router-dom';
import { useLicense } from '../hooks/useLicense';
import { auth } from '../services/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';

const AdminToolDashboardPage: React.FC = () => {
    const { logout, isAdminLoggedIn, isLoading: authLoading } = useAdminAuth();
    const [stats, setStats] = useState<{ 
        logCount: number; 
        revokedCount: number, 
        isTampered: boolean, 
        customersCount: number, 
        licensesCount: number, 
        activeLicensesCount: number,
        performance?: any,
        signups?: any[]
    } | null>(null);
    const [logs, setLogs] = useState<AdminAuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [fbUser, setFbUser] = useState(auth.currentUser);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setFbUser(user);
        });
        return () => unsubscribe();
    }, []);

    const handleFbLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (e) {
            console.error("Firebase Login Error:", e);
            alert('فشل تسجيل الدخول إلى Firebase');
        }
    };
    
    // Diagnostic State
    const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
    const [healthReport, setHealthReport] = useState<SystemHealthReport | null>(null);

    const navigate = useNavigate();
    const { licenseInfo } = useLicense();
    const isAdminEmail = licenseInfo.email === 'm7mdshipl@gmail.com' || auth.currentUser?.email === 'm7mdshipl@gmail.com';

    const fetchData = async () => {
        if (!isAdminLoggedIn) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const [statsData, logsData, performance, signups] = await Promise.all([
                adminToolService.getDashboardStats(),
                adminToolService.getAuditLogs(),
                adminToolService.getPerformanceMetrics(),
                adminToolService.getNewSignupsStats()
            ]);
            setStats({ ...statsData, performance, signups });
            setLogs(logsData.slice(0, 15)); // Show latest 15 logs
        } catch (error) {
            console.error("Dashboard Fetch Data Error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (authLoading) return;

        if (!isAdminLoggedIn) {
            navigate('/admin-tool/login');
            return;
        }

        let isMounted = true;
        let timeoutId: NodeJS.Timeout;

        const pollData = async () => {
            try {
                const currentStats = await adminToolService.getDashboardStats();
                if (isMounted) {
                    setStats(prev => prev ? { ...prev, ...currentStats } : currentStats as any);
                    if (currentStats.isTampered) {
                        const logs = await adminToolService.getAuditLogs();
                        setLogs(logs.slice(0, 15));
                    }
                }
            } catch (err) {
                console.error("Failed to poll dashboard stats:", err);
            } finally {
                if (isMounted) {
                    timeoutId = setTimeout(pollData, 30000);
                }
            }
        };

        const initialLoad = async () => {
            await fetchData();
            pollData();
        };

        initialLoad();

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }, [isAdminLoggedIn, authLoading, navigate]);
    
    const handleRevoke = async () => {
        const keyToRevoke = prompt("أدخل كود الترخيص الذي تريد إبطاله (Revoke):");
        if (keyToRevoke) {
            if (window.confirm(`هل أنت متأكد من حظر الترخيص: ${keyToRevoke}؟ لن يتمكن العميل من استخدام هذا الكود مرة أخرى.`)) {
                await adminToolService.revokeLicense(keyToRevoke, "Admin Manual Revocation");
                alert(`تم إبطال الترخيص: ${keyToRevoke} بنجاح.`);
                fetchData();
            }
        }
    }

    const runDiagnostics = async () => {
        setIsRunningDiagnostics(true);
        setHealthReport(null);
        // Simulate a brief delay for UX
        await new Promise(r => setTimeout(r, 1500));
        const report = await adminToolService.runSystemDiagnostics();
        setHealthReport(report);
        setIsRunningDiagnostics(false);
    };

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            {stats?.isTampered ? (
                 <div className="p-6 mb-8 text-sm text-red-800 rounded-xl bg-red-50 dark:bg-red-900/20 border-2 border-red-500 flex items-start gap-4 animate-pulse shadow-lg shadow-red-500/10" role="alert">
                    <ShieldAlert size={32} className="flex-shrink-0" />
                    <div>
                        <span className="font-bold text-lg block mb-1">تحذير أمني حرج!</span>
                        تم اكتشاف محاولة تلاعب في بيانات النظام أو التوقيت. النظام في وضع الحماية القصوى. يرجى مراجعة السجلات فوراً.
                    </div>
                </div>
            ) : (
                <div className="p-4 mb-8 text-sm text-green-800 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center gap-3">
                    <ShieldCheck size={24} />
                    <div>
                        <span className="font-bold">الحالة آمنة:</span> لم يتم اكتشاف أي تلاعب في التراخيص أو التوقيت.
                    </div>
                </div>
            )}

            {loading ? <p className="text-slate-800 dark:text-white text-center py-10">جاري تحميل بيانات الأمان...</p> : (
            <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <Card className="hover:shadow-lg transition-all" title="">
                        <div className="flex items-center gap-4 mt-2">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600">
                                <Users size={28} />
                            </div>
                            <div>
                                <span className="text-3xl font-black block text-slate-800 dark:text-white">{toArabicIndic(stats?.customersCount || 0)}</span>
                                <span className="text-xs font-bold text-slate-500">إجمالي العملاء</span>
                            </div>
                        </div>
                    </Card>

                    <Card className="hover:shadow-lg transition-all" title="">
                         <div className="flex items-center gap-4 mt-2">
                            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl text-emerald-600">
                                <Key size={28} />
                            </div>
                            <div>
                                <span className="text-3xl font-black block text-slate-800 dark:text-white">{toArabicIndic(stats?.licensesCount || 0)}</span>
                                <span className="text-xs font-bold text-slate-500">مجموع التراخيص</span>
                            </div>
                        </div>
                    </Card>

                    <Card className="hover:shadow-lg transition-all" title="">
                         <div className="flex items-center gap-4 mt-2">
                            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600">
                                <CheckCircle size={28} />
                            </div>
                            <div>
                                <span className="text-3xl font-black block text-slate-800 dark:text-white">{toArabicIndic(stats?.activeLicensesCount || 0)}</span>
                                <span className="text-xs font-bold text-slate-500">تراخيص نشطة</span>
                            </div>
                        </div>
                    </Card>
                    
                    <Card className="hover:shadow-lg transition-all" title="">
                         <div className="flex items-center gap-4 mt-2">
                            <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-xl text-rose-600">
                                <Ban size={28} />
                            </div>
                            <div>
                                <span className="text-3xl font-black block text-slate-800 dark:text-white">{toArabicIndic(stats?.revokedCount || 0)}</span>
                                <span className="text-xs font-bold text-slate-500">تراخيص معطلة</span>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Advanced Monitoring Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="bg-indigo-600 text-white border-none shadow-indigo-600/20" title="">
                        <div className="flex justify-between items-center">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-80 decoration-indigo-300 underline underline-offset-4">Signups Today</span>
                                <span className="text-3xl font-black block mt-1">+{toArabicIndic(stats?.signups?.[(stats?.signups?.length || 0) - 1]?.count || 0)}</span>
                            </div>
                            <div className="p-3 bg-white/20 rounded-2xl">
                                <TrendingUp size={32} />
                            </div>
                        </div>
                    </Card>

                    <Card className="bg-slate-900 text-white border-none shadow-xl" title="">
                        <div className="flex justify-between items-center">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-80 decoration-slate-600 underline underline-offset-4">Server Uptime</span>
                                <span className="text-3xl font-black block mt-1">{toArabicIndic(stats?.performance?.uptime || '99.9%')}</span>
                            </div>
                            <div className="p-3 bg-white/10 rounded-2xl">
                                <Server size={32} />
                            </div>
                        </div>
                    </Card>

                    <Card className="bg-emerald-600 text-white border-none shadow-emerald-600/20" title="">
                        <div className="flex justify-between items-center">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-80 decoration-emerald-300 underline underline-offset-4">API Latency</span>
                                <span className="text-3xl font-black block mt-1">{toArabicIndic(stats?.performance?.apiLatency || 0)}ms</span>
                            </div>
                            <div className="p-3 bg-white/20 rounded-2xl">
                                <Zap size={32} />
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Actions Column */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card title="حالة النزاهة (Integrity)">
                             <div className="flex items-center gap-4 mt-2">
                                <div className={`p-3 rounded-xl ${!stats?.isTampered ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600'}`}>
                                    <AlertTriangle size={28} />
                                </div>
                                <div>
                                    <span className={`text-xl font-bold block ${!stats?.isTampered ? 'text-green-600' : 'text-orange-500'}`}>
                                        {!stats?.isTampered ? 'Verified & Secure' : 'Compromised'}
                                    </span>
                                    <span className="text-xs text-slate-500 font-bold">Safe Cryptographic State</span>
                                </div>
                            </div>
                        </Card>

                        <Card title="إجراءات الحماية الخاصة">
                            <div className="space-y-4">
                                <div className="p-4 border rounded-xl dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                    <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                        <Ban size={18} className="text-red-500"/>
                                        إبطال ترخيص (Kill Switch)
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-2 mb-4 leading-relaxed font-bold">
                                        استخدم هذه الأداة لإيقاف ترخيص معين فوراً لمنعه من العمل على أي جهاز متصل.
                                    </p>
                                    <Button variant="danger" onClick={handleRevoke} disabled={stats?.isTampered} className="w-full">
                                        إبطال الترخيص يدوياً
                                    </Button>
                                </div>
                                <div className="p-4 border rounded-xl dark:border-slate-700 bg-indigo-50 dark:bg-indigo-900/10">
                                    <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                        <Stethoscope size={18} className="text-indigo-500"/>
                                        فحص النظام (Diagnostics)
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-2 mb-4 leading-relaxed font-bold">
                                        تشغيل فحص شامل للبحث عن أخطاء أو بيانات يتيمة أو محاولات عبث بالنظام.
                                    </p>
                                    <Button variant="secondary" onClick={runDiagnostics} isLoading={isRunningDiagnostics} className="w-full">
                                        تشغيل الفحص الشامل
                                    </Button>
                                </div>
                            </div>
                        </Card>

                        <Card title="إعدادات النظام العامة والواجهة">
                            <div className="space-y-4">
                                <p className="text-xs text-slate-500 font-bold mb-4">
                                    تغيير اللوجو الخاص بلوحة التحكم وعرض رسائل عروض ترويجية Popups تظهر للعملاء.
                                </p>
                                <Button variant="secondary" onClick={() => navigate('/admin-tool/global-settings')} className="w-full bg-slate-800 hover:bg-slate-700 text-white border-0">
                                    إعدادات الواجهة والإعلانات
                                </Button>
                                <Button variant="secondary" onClick={() => navigate('/admin-tool/features-manager')} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white border-0">
                                    تعديل مميزات الباقات التسويقية
                                </Button>
                            </div>
                        </Card>
                    </div>

                    {/* Report & Logs Column */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card title="نشاط النظام (التراخيص)" className="shadow-premium border-none">
                            <div className="h-64 w-full mt-4" dir="ltr">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={[
                                        { name: 'يناير', active: 10, new: 5 },
                                        { name: 'فبراير', active: 15, new: 8 },
                                        { name: 'مارس', active: 20, new: 10 },
                                        { name: 'أبريل', active: 25, new: 12 },
                                        { name: 'مايو', active: stats?.activeLicensesCount || 30, new: stats?.licensesCount || 15 },
                                        { name: 'يونيو', active: stats?.activeLicensesCount || 30, new: stats?.licensesCount || 15 },
                                    ]}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
                                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                                            labelStyle={{fontWeight: 'bold', color: '#1E293B', marginBottom: '4px'}}
                                        />
                                        <Line type="monotone" name="تراخيص نشطة" dataKey="active" stroke="#10B981" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                                        <Line type="monotone" name="تراخيص جديدة" dataKey="new" stroke="#6366F1" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        {/* Diagnostic Report Area */}
                        {healthReport && (
                            <Card title="تقرير فحص النظام" className="animate-slideDown">
                                <div className={`p-4 rounded-lg mb-4 flex items-center gap-3 ${
                                    healthReport.status === 'HEALTHY' ? 'bg-green-100 text-green-800' : 
                                    healthReport.status === 'WARNING' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                }`}>
                                    {healthReport.status === 'HEALTHY' ? <CheckCircle size={24}/> : <AlertTriangle size={24}/>}
                                    <div>
                                        <span className="font-bold block">الحالة العامة: {healthReport.status === 'HEALTHY' ? 'سليم' : healthReport.status === 'WARNING' ? 'تحذير' : 'حرج'}</span>
                                        <span className="text-xs">تم الفحص: {new Date(healthReport.checkedAt).toLocaleString()}</span>
                                    </div>
                                </div>
                                
                                {healthReport.issues.length === 0 ? (
                                    <p className="text-center text-slate-500 py-4">لم يتم العثور على أي مشاكل. النظام يعمل بكفاءة.</p>
                                ) : (
                                    <ul className="space-y-3">
                                        {healthReport.issues.map((issue, idx) => (
                                            <li key={idx} className="p-3 border rounded-lg bg-white dark:bg-slate-800">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                                                        <XCircle size={16} className="text-red-500"/> {issue.message}
                                                    </span>
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700">{issue.severity}</span>
                                                </div>
                                                <p className="text-xs text-slate-500 ms-6">{issue.details}</p>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Card>
                        )}

                        <Card title="سجلات التدقيق الأمني (Audit Logs)">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-start">
                                    <thead className="bg-slate-100 dark:bg-slate-800 border-b dark:border-slate-700">
                                        <tr>
                                            <th className="px-4 py-3 text-start">الوقت</th>
                                            <th className="px-4 py-3 text-start">الإجراء</th>
                                            <th className="px-4 py-3 text-start">التفاصيل</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y dark:divide-slate-700">
                                        {logs.map(log => (
                                            <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                                                    {new Date(log.timestamp).toLocaleString('en-GB')}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                        log.action.includes('SUCCESS') ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                                                        log.action.includes('REVOKED') ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                                        (log.action.includes('FAILURE') || log.action.includes('TAMPER')) ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 
                                                        'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                                    }`}>
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400 break-all">
                                                    {log.details}
                                                </td>
                                            </tr>
                                        ))}
                                        {logs.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="text-center py-8 text-slate-500">لا توجد سجلات لعرضها.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                </div>
            </>
            )}
        </div>
    );
};

export default AdminToolDashboardPage;
