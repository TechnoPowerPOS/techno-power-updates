import React, { useState, useEffect } from 'react';
import { api } from '../services/mockApi';
import { useLicense } from '../hooks/useLicense';
import { getPlanLimits } from '../utils/planPermissions';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { ClipboardList, ArrowLeft, RefreshCw, BarChart2, Coins, Clock, Lock, Calendar, Filter, User, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils/localization';
import { useSettings } from '../hooks/useSettings';
import { useToasts } from '../hooks/useToasts';
import { exportToExcel } from '../utils/importExportUtils';

interface ShiftItem {
    id: string;
    userId: string;
    startTime: string;
    endTime?: string;
    startCash: number;
    endCash?: number;
    status: 'Open' | 'Closed';
    totalSales?: number;
    totalCashSales?: number;
    notes?: string;
}

const CashierShiftsPage: React.FC = () => {
    const navigate = useNavigate();
    const { licenseInfo } = useLicense();
    const { settings } = useSettings();
    const { addToast } = useToasts();
    const limits = getPlanLimits(licenseInfo?.type || 'Free');

    const [shifts, setShifts] = useState<ShiftItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'Closed'>('All');
    const [searchQuery, setSearchQuery] = useState('');

    const handleExportExcel = () => {
        const exportData = filteredShifts.map(s => ({
            'رقم الوردية': s.id,
            'المستخدم': s.userId,
            'وقت البدء': new Date(s.startTime).toLocaleString('ar-EG'),
            'وقت الإغلاق': s.endTime ? new Date(s.endTime).toLocaleString('ar-EG') : 'مفتوحة',
            'رصيد الافتتاح': s.startCash,
            'رصيد الإغلاق': s.endCash || 0,
            'إجمالي المبيعات': s.totalSales || 0,
            'إجمالي المبيعات النقدية': s.totalCashSales || 0,
            'الحالة': s.status === 'Open' ? 'مفتوحة' : 'مغلقة',
            'الملاحظات': s.notes || ''
        }));
        exportToExcel(exportData, `سجل_الورديات_${new Date().toISOString().split('T')[0]}`);
        addToast('تم تصدير سجل الورديات بنجاح', 'success');
    };

    const loadShifts = async () => {
        setLoading(true);
        try {
            const data = await api.getShifts();
            setShifts(data);
        } catch (error) {
            addToast('فشل تحميل سجل الورديات.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (limits.hasCashierShifts) {
            loadShifts();
        }
    }, [limits.hasCashierShifts]);

    // Gating check
    if (!limits.hasCashierShifts) {
        return (
            <div className="flex flex-col items-center justify-center p-8 md:p-16 text-center animate-fadeIn">
                <div className="w-24 h-24 bg-amber-50 dark:bg-amber-950/20 text-amber-600 rounded-full flex items-center justify-center mb-8 shadow-inner border border-amber-100 dark:border-amber-900/40">
                    <Lock size={48} />
                </div>
                <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-4">ميزة سجل الورديات غير مفعلة</h2>
                <p className="text-slate-500 font-bold max-w-md mb-8 leading-relaxed">سجل ورديات الكاشير وإدارة أيام العمل ميزة متقدمة وحصرية في الباقات الأعلى. يرجى ترقية باقتك للوصول إلى هذه الميزة.</p>
                <div className="flex items-center gap-4">
                    <Button onClick={() => navigate('/pricing')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-8 py-3 rounded-2xl shadow-lg shadow-indigo-500/20">عرض باقات الاشتراك والترقية</Button>
                    <Button onClick={() => navigate('/')} className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold px-6 py-3 rounded-2xl">الرئيسية</Button>
                </div>
            </div>
        );
    }

    const filteredShifts = shifts.filter(s => {
        if (statusFilter !== 'All' && s.status !== statusFilter) return false;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const notesMatch = s.notes && s.notes.toLowerCase().includes(query);
            const idMatch = s.id.toLowerCase().includes(query);
            const userMatch = s.userId.toLowerCase().includes(query);
            return notesMatch || idMatch || userMatch;
        }
        return true;
    });

    const activeCount = shifts.filter(s => s.status === 'Open').length;
    const closedCount = shifts.filter(s => s.status === 'Closed').length;
    const totalSalesVolume = shifts.reduce((sum, s) => sum + (s.totalSales || 0), 0);
    const totalCashCollected = shifts.reduce((sum, s) => sum + (s.totalCashSales || 0), 0);

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-md shadow-amber-500/10">
                        <ClipboardList size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white">سجل ورديات الكاشير</h1>
                        <p className="text-xs text-slate-500 font-bold">عرض تفاصيل اليوميات والورديات وإحصائيات بيع الوردية والتحكم بمراجعتها.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 self-stretch md:self-auto">
                    <Button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 font-bold text-xs border border-emerald-100 dark:border-emerald-800">
                        <BarChart2 size={16} /> تصدير إكسيل
                    </Button>
                    <Button onClick={loadShifts} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700">
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </Button>
                    <Button onClick={() => navigate(-1)} className="flex items-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-xs">
                        <ArrowLeft size={16} /> العودة
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">الورديات المفتوحة</p>
                            <h3 className="text-lg font-black text-slate-950 dark:text-white mt-1">{activeCount}</h3>
                        </div>
                    </div>
                </Card>
                <Card>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                            <Coins size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">الورديات المغلقة</p>
                            <h3 className="text-lg font-black text-slate-950 dark:text-white mt-1">{closedCount}</h3>
                        </div>
                    </div>
                </Card>
                <Card>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-xl">
                            <BarChart2 size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">حجم المبيعات بالورديات</p>
                            <h3 className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(totalSalesVolume, settings?.currency)}</h3>
                        </div>
                    </div>
                </Card>
                <Card>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-xl">
                            <Coins size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">المحصل النقدي الفعلي</p>
                            <h3 className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-1">{formatCurrency(totalCashCollected, settings?.currency)}</h3>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Filter controls */}
            <Card>
                <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute right-3.5 top-3.5 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="البحث برقم الوردية أو الملاحظات..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pr-10 pl-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                    </div>
                    <div className="flex items-center gap-2 self-stretch md:self-auto">
                        <span className="text-xs text-slate-400 font-bold shrink-0">حالة الوردية:</span>
                        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl w-full md:w-auto">
                            <button
                                onClick={() => setStatusFilter('All')}
                                className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${statusFilter === 'All' ? 'bg-white dark:bg-slate-800 shadow text-indigo-600' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
                            >
                                كافّة الورديات
                            </button>
                            <button
                                onClick={() => setStatusFilter('Open')}
                                className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${statusFilter === 'Open' ? 'bg-white dark:bg-slate-800 shadow text-indigo-600' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
                            >
                                مفتوحة حالياً
                            </button>
                            <button
                                onClick={() => setStatusFilter('Closed')}
                                className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${statusFilter === 'Closed' ? 'bg-white dark:bg-slate-800 shadow text-indigo-600' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
                            >
                                مغلقة
                            </button>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Shifts table */}
            <Card>
                {loading ? (
                    <div className="py-20 text-center text-slate-500 font-bold">جاري تحميل سجلات الورديات...</div>
                ) : filteredShifts.length === 0 ? (
                    <div className="py-20 text-center text-slate-400 font-bold">
                        لا يوجد ورديات تطابق معايير البحث والفلترة حالياً.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-right text-xs">
                            <thead>
                                <tr className="border-b dark:border-slate-800 border-slate-100 bg-slate-50 dark:bg-slate-900/40 text-slate-500 font-black">
                                    <th className="p-4 rounded-r-xl">رقم الوردية</th>
                                    <th className="p-4">الكاشير / المستخدم</th>
                                    <th className="p-4">تاريخ ووقت الفتح</th>
                                    <th className="p-4">تاريخ ووقت الإغلاق</th>
                                    <th className="p-4">رصيد الافتتاح</th>
                                    <th className="p-4">رصيد الإغلاق النهائي</th>
                                    <th className="p-4">إجمالي المبيعات</th>
                                    <th className="p-4">الحالة</th>
                                    <th className="p-4 rounded-l-xl">ملاحظات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredShifts.map((s) => (
                                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 font-bold transition-all">
                                        <td className="p-4 font-mono select-all text-indigo-600 dark:text-indigo-400">{s.id}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <User className="text-slate-400" size={14} />
                                                <span>{s.userId === 'u-1' ? 'المدير العام (كاشير)' : s.userId}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-500 font-mono">
                                            {new Date(s.startTime).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
                                        </td>
                                        <td className="p-4 text-slate-500 font-mono">
                                            {s.endTime ? new Date(s.endTime).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                                        </td>
                                        <td className="p-4 font-mono text-indigo-600">{formatCurrency(s.startCash, settings?.currency)}</td>
                                        <td className="p-4 font-mono text-purple-600">{s.endCash !== undefined ? formatCurrency(s.endCash, settings?.currency) : '—'}</td>
                                        <td className="p-4 font-mono text-emerald-600">{formatCurrency(s.totalSales || 0, settings?.currency)}</td>
                                        <td className="p-4">
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${s.status === 'Open' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                                {s.status === 'Open' ? 'نشطة ومفتوحة' : 'مغلقة'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-400 truncate max-w-[150px]" title={s.notes || ''}>
                                            {s.notes || 'لا يوجد ملاحظات'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default CashierShiftsPage;
