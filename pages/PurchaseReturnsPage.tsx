
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { PurchaseReturn } from '../types';
import { api } from '../services/mockApi';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { PlusCircle, Search } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency } from '../utils/localization';
import PurchaseReturnModal from '../components/returns/PurchaseReturnModal';
import { useAuth } from '../hooks/useAuth';
import TableSkeleton from '../components/ui/TableSkeleton';
import { useToasts } from '../hooks/useToasts';

const PurchaseReturnsPage: React.FC = () => {
    const [returns, setReturns] = useState<PurchaseReturn[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const { settings } = useSettings();
    const { user } = useAuth();
    const { addToast } = useToasts();

    const fetchReturns = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getPurchaseReturns();
            setReturns(data || []);
        } catch (e) {
            setReturns([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchReturns();
    }, [fetchReturns]);

    const filteredReturns = useMemo(() => {
        if (!searchTerm) return returns;
        const q = searchTerm.toLowerCase();
        return returns.filter(r => 
            r.id.toLowerCase().includes(q) || 
            r.originalPurchaseId.toLowerCase().includes(q)
        );
    }, [returns, searchTerm]);

    const handleSaveReturn = async (data: Omit<PurchaseReturn, 'id' | 'date' | 'user'> & { treasuryId: string }) => {
        if (!user) {
            addToast("لا يمكن إتمام العملية. المستخدم غير معروف.", 'error');
            return;
        }
        setIsSaving(true);
        try {
            await api.savePurchaseReturn({
                ...data,
                date: new Date().toISOString(),
                user: { id: user.id, name: user.name }
            });
            await fetchReturns();
            addToast('تم تسجيل مرتجع المشتريات وتحديث المخزون بنجاح.', 'success');
            setIsModalOpen(false);
        } catch (error) {
            addToast("فشل حفظ مرتجع المشتريات.", 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="animate-fadeIn">
            <div className="flex flex-col xl:flex-row justify-between items-center gap-4 mb-6">
                <h1 className="text-3xl font-black text-slate-800 dark:text-white">مرتجعات المشتريات</h1>
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full xl:w-auto">
                    <div className="relative flex-grow sm:flex-grow-0 sm:w-64">
                        <Search className="absolute top-1/2 -translate-y-1/2 start-3 text-slate-400" size={20} />
                        <input 
                            type="text" 
                            placeholder="بحث برقم المرتجع أو الطلب..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            className="w-full p-2 ps-10 border rounded-xl dark:bg-slate-700 dark:border-slate-600 font-bold shadow-sm outline-none focus:border-indigo-500 transition-all"
                        />
                    </div>
                    <Button onClick={() => setIsModalOpen(true)} className="rounded-xl font-black shadow-lg shadow-indigo-500/20">
                        <PlusCircle size={20} className="me-2" /> إضافة مرتجع جديد
                    </Button>
                </div>
            </div>
            <Card className="p-0 border-none shadow-premium overflow-hidden">
                {loading ? <TableSkeleton cols={5} /> : !settings ? <p className="p-6">جاري تحميل...</p> : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-start">
                            <thead className="text-[10px] font-black uppercase text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="px-6 py-4 text-start">رقم المرتجع</th>
                                    <th className="px-6 py-4 text-start">التاريخ</th>
                                    <th className="px-6 py-4 text-start">طلب الشراء الأصلي</th>
                                    <th className="px-6 py-4 text-start">المبلغ المسترجع</th>
                                    <th className="px-6 py-4 text-start">المستخدم</th>
                                    <th className="px-6 py-4 text-start"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-slate-800">
                                {filteredReturns.map((r) => (
                                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                                        <td className="px-6 py-4 font-black text-indigo-600">{r.id.toUpperCase()}</td>
                                        <td className="px-6 py-4 font-bold">{new Date(r.date).toLocaleDateString('ar-EG')}</td>
                                        <td className="px-6 py-4 font-mono">{r.originalPurchaseId.toUpperCase()}</td>
                                        <td className="px-6 py-4 font-bold text-green-500">{formatCurrency(r.totalRecovered, settings.currency)}</td>
                                        <td className="px-6 py-4">{r.user.name}</td>
                                        <td className="px-6 py-4">
                                            <button 
                                                onClick={async () => {
                                                    const res = await api.deletePurchaseReturn(r.id);
                                                    if(res) {
                                                        addToast('تم حذف المرتجع بنجاح والتراجع عن تفاصيله', 'success');
                                                        fetchReturns();
                                                    }
                                                }}
                                                className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredReturns.length === 0 && (
                            <div className="text-center py-20 text-slate-400 font-bold">لا توجد مرتجعات تطابق البحث.</div>
                        )}
                    </div>
                )}
            </Card>
            <PurchaseReturnModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveReturn}
                isLoading={isSaving}
            />
        </div>
    );
};

export default PurchaseReturnsPage;
