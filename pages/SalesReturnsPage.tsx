
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { SalesReturn } from '../types';
import { api } from '../services/mockApi';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { PlusCircle, Search, RotateCcw, TrendingDown, Calendar } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency, toArabicIndic } from '../utils/localization';
import SalesReturnModal from '../components/returns/SalesReturnModal';
import TableSkeleton from '../components/ui/TableSkeleton';
import { useToasts } from '../hooks/useToasts';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';

const StatCard: React.FC<{ 
    title: string; 
    value: string; 
    icon: React.ReactNode, 
    color: 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate',
    delay: number 
  }> = ({ title, value, icon, color, delay }) => {
    const colorClasses = {
        indigo: 'from-indigo-500/20 to-indigo-600/5 text-indigo-600 bg-indigo-500 dark:bg-indigo-600',
        emerald: 'from-emerald-500/20 to-emerald-600/5 text-emerald-600 bg-emerald-500 dark:bg-emerald-600',
        amber: 'from-amber-500/20 to-amber-600/5 text-amber-600 bg-amber-500 dark:bg-amber-600',
        rose: 'from-rose-500/20 to-rose-600/5 text-rose-600 bg-rose-500 dark:bg-rose-600',
        slate: 'from-slate-500/20 to-slate-600/5 text-slate-600 bg-slate-500 dark:bg-slate-600'
    };

    return (
        <Card className={`group relative p-0 overflow-hidden animate-slide-up border-none shadow-xl hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-500 rounded-[2rem] bg-white dark:bg-slate-900`} style={{ animationDelay: `${delay}ms`}}>
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colorClasses[color].split(' ')[0]} rounded-full blur-3xl opacity-40 -translate-y-1/2 translate-x-1/2 transition-all duration-700 group-hover:scale-150`}></div>
            <div className="p-6 flex flex-col h-full relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-white dark:bg-slate-800 shadow-lg border border-slate-100 dark:border-slate-700/50 ${colorClasses[color].split(' ')[1]} transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110`}>
                        {icon}
                    </div>
                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 opacity-60`}>
                        Returns
                    </div>
                </div>
                <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{title}</p>
                <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{value}</h3>
                <div className="mt-4 flex items-center gap-2">
                    <div className={`h-1.5 w-12 rounded-full ${colorClasses[color].split(' ')[2].replace('bg-', 'bg-').split(' ')[0]} opacity-20`}>
                        <div className={`h-full w-2/3 rounded-full ${colorClasses[color].split(' ')[2].split(' ')[0]}`}></div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">تحليل المرتجعات</span>
                </div>
            </div>
        </Card>
    );
};

const SalesReturnsPage: React.FC = () => {
    const [returns, setReturns] = useState<SalesReturn[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [reversingId, setReversingId] = useState<string | null>(null);
    const [scannedSaleId, setScannedSaleId] = useState<string | null>(null);
    const { settings } = useSettings();
    const { addToast } = useToasts();

    useBarcodeScanner((barcode) => {
        api.getSales().then((sales) => {
            const foundSale = sales.find(s => s.id.toLowerCase() === barcode.trim().toLowerCase());
            if (foundSale) {
                setScannedSaleId(foundSale.id);
                setIsModalOpen(true);
                addToast(`تم العثور على الفاتورة رقم ${foundSale.id} وفتح نافذة المرتجع`, 'success');
            } else {
                addToast(`لم يتم العثور على فاتورة بالرقم ${barcode}`, 'warning');
            }
        }).catch(err => {
            console.error("Error reading barcode on returns page", err);
        });
    });

    const fetchReturns = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getSalesReturns();
            setReturns(data || []);
        } catch (e) {
            setReturns([]);
            addToast("خطأ في تحميل المرتجعات", "error");
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => { fetchReturns(); }, [fetchReturns]);

    const handleReverse = async () => {
        if (!reversingId) return;
        try {
            const success = await api.deleteSalesReturn(reversingId);
            if (success) {
                addToast("تم التراجع عن المرتجع بنجاح واستعادة البيانات.", "success");
                fetchReturns();
            }
        } catch (e) { addToast("فشل التراجع عن المرتجع", "error"); }
        finally { setReversingId(null); }
    };

    const stats = useMemo(() => {
        const list = Array.isArray(returns) ? returns : [];
        const totalCount = list.length;
        const totalAmount = list.reduce((sum, r) => sum + (r.totalRefund || 0), 0);
        
        const todayStr = new Date().toISOString().split('T')[0];
        const todayList = list.filter(r => {
            if (!r.date) return false;
            return r.date.split('T')[0] === todayStr;
        });
        const todayCount = todayList.length;
        const todayAmount = todayList.reduce((sum, r) => sum + (r.totalRefund || 0), 0);
        
        return {
            totalCount,
            totalAmount,
            todayCount,
            todayAmount
        };
    }, [returns]);

    const filteredReturns = useMemo(() => {
        const list = Array.isArray(returns) ? returns : [];
        if (!searchTerm) return list;
        const q = searchTerm.toLowerCase();
        return list.filter(r => 
            (r.id || "").toLowerCase().includes(q) || 
            (r.originalSaleId || "").toLowerCase().includes(q)
        );
    }, [returns, searchTerm]);

    return (
        <div className="animate-fadeIn">
            <div className="flex flex-col xl:flex-row justify-between items-center gap-4 mb-6">
                <h1 className="text-3xl font-black text-slate-800 dark:text-white">مرتجعات المبيعات</h1>
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full xl:w-auto">
                    <div className="relative flex-grow sm:flex-grow-0 sm:w-64">
                        <Search className="absolute top-1/2 -translate-y-1/2 start-3 text-slate-400" size={20} />
                        <input 
                            type="text" 
                            placeholder="بحث برقم المرتجع أو الفاتورة..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            className="w-full p-2 ps-10 border rounded-xl dark:bg-slate-700 dark:border-slate-600 font-bold shadow-sm outline-none focus:border-indigo-500 transition-all"
                        />
                    </div>
                    <Button onClick={() => { setScannedSaleId(null); setIsModalOpen(true); }} className="rounded-xl font-black shadow-lg shadow-indigo-500/20"><PlusCircle size={20} className="me-2" /> إضافة مرتجع</Button>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard 
                    title="إجمالي المرتجعات"
                    value={`${toArabicIndic(stats.totalCount)} عملية`}
                    icon={<RotateCcw size={24} />}
                    color="indigo"
                    delay={100}
                />
                <StatCard 
                    title="إجمالي مبلغ المرتجعات"
                    value={formatCurrency(stats.totalAmount, settings?.currency || 'SAR')}
                    icon={<TrendingDown size={24} />}
                    color="rose"
                    delay={200}
                />
                <StatCard 
                    title="إجمالي المرتجعات اليوم"
                    value={`${toArabicIndic(stats.todayCount)} عملية`}
                    icon={<Calendar size={24} />}
                    color="amber"
                    delay={300}
                />
                <StatCard 
                    title="إجمالي مبلغ مرتجعات اليوم"
                    value={formatCurrency(stats.todayAmount, settings?.currency || 'SAR')}
                    icon={<TrendingDown size={24} />}
                    color="rose"
                    delay={400}
                />
            </div>

            <Card className="p-0 border-none shadow-premium overflow-hidden">
                {loading ? <TableSkeleton cols={5} hasActions /> : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-start">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black uppercase text-slate-400">
                                <tr>
                                    <th className="px-6 py-4 text-start">رقم المرتجع</th>
                                    <th className="px-6 py-4 text-start">التاريخ</th>
                                    <th className="px-6 py-4 text-start">الفاتورة الأصلية</th>
                                    <th className="px-6 py-4 text-start">المسترد</th>
                                    <th className="px-6 py-4 text-center">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-slate-800">
                                {filteredReturns.map((r) => (
                                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="px-6 py-4 font-black text-indigo-600">{r.id.toUpperCase()}</td>
                                        <td className="px-6 py-4 font-bold">{new Date(r.date).toLocaleDateString('ar-EG')}</td>
                                        <td className="px-6 py-4 font-mono">{r.originalSaleId.toUpperCase()}</td>
                                        <td className="px-6 py-4 font-black text-red-500">{formatCurrency(r.totalRefund, settings?.currency || 'SAR')}</td>
                                        <td className="px-6 py-4 text-center">
                                            <button onClick={() => setReversingId(r.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all" title="تراجع (Undo)">
                                                <RotateCcw size={18}/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredReturns.length === 0 && <div className="p-20 text-center text-slate-400 font-bold">لا توجد مرتجعات تطابق البحث.</div>}
                    </div>
                )}
            </Card>
            <SalesReturnModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setScannedSaleId(null); }} onSave={async (d) => { setIsSaving(true); await api.saveSalesReturn(d); await fetchReturns(); setIsModalOpen(false); setScannedSaleId(null); setIsSaving(false); }} isLoading={isSaving} initialSaleId={scannedSaleId || undefined} />
            <ConfirmDialog 
                isOpen={!!reversingId} 
                onClose={() => setReversingId(null)} 
                onConfirm={handleReverse} 
                title="تأكيد التراجع عن المرتجع" 
                message="سيتم حذف سجل المرتجع واسترداد الكميات للمخزن وسحب المبلغ من الخزينة. هل أنت متأكد؟"
                confirmText="نعم، تراجع عن المرتجع"
            />
        </div>
    );
};

export default SalesReturnsPage;
