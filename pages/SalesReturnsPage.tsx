
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { SalesReturn } from '../types';
import { api } from '../services/mockApi';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { PlusCircle, Search, RotateCcw } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency } from '../utils/localization';
import SalesReturnModal from '../components/returns/SalesReturnModal';
import TableSkeleton from '../components/ui/TableSkeleton';
import { useToasts } from '../hooks/useToasts';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const SalesReturnsPage: React.FC = () => {
    const [returns, setReturns] = useState<SalesReturn[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [reversingId, setReversingId] = useState<string | null>(null);
    const { settings } = useSettings();
    const { addToast } = useToasts();

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
                    <Button onClick={() => setIsModalOpen(true)} className="rounded-xl font-black shadow-lg shadow-indigo-500/20"><PlusCircle size={20} className="me-2" /> إضافة مرتجع</Button>
                </div>
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
            <SalesReturnModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={async (d) => { setIsSaving(true); await api.saveSalesReturn(d); await fetchReturns(); setIsModalOpen(false); setIsSaving(false); }} isLoading={isSaving} />
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
