import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { handleFirestoreError, OperationType } from '../../services/firestoreErrorHandler';
import { useToasts } from '../../hooks/useToasts';
import { FileText, Plus, Search, Filter, ShieldCheck, Clock, X } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/layout/PageHeader';
import Modal from '../../components/ui/Modal';

interface LeaseContract {
    id: string;
    contractNumber: string;
    tenantName: string;
    unitNumber: string;
    startDate: any;
    endDate: any;
    totalAmount: number;
    status: 'Active' | 'Expired' | 'Terminated';
}

const LeaseContractsPage: React.FC = () => {
    const { addToast } = useToasts();
    const [contracts, setContracts] = useState<LeaseContract[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        contractNumber: '',
        tenantName: '',
        unitNumber: '',
        startDate: '',
        endDate: '',
        totalAmount: 0,
        status: 'Active' as const
    });

    useEffect(() => {
        fetchContracts();
    }, []);

    const fetchContracts = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'op_lease_contracts'), orderBy('startDate', 'desc'), limit(50));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeaseContract));
            setContracts(data);
        } catch (error) {
            handleFirestoreError(error, OperationType.GET, 'op_lease_contracts');
        } finally {
            setLoading(false);
        }
    };

    const handleAddContract = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await addDoc(collection(db, 'op_lease_contracts'), {
                ...formData,
                startDate: new Date(formData.startDate),
                endDate: new Date(formData.endDate)
            });
            addToast('تم إضافة عقد الإيجار بنجاح', 'success');
            setIsModalOpen(false);
            setFormData({ contractNumber: '', tenantName: '', unitNumber: '', startDate: '', endDate: '', totalAmount: 0, status: 'Active' });
            fetchContracts();
        } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'op_lease_contracts');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader title="إدارة عقود الإيجار" subtitle="توليد عقود الإيجار للوحدات المتاحة وحفظها وجدولتها">
                <Button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-indigo-600 rounded-2xl h-12 px-8 font-black shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                >
                    <Plus size={18} className="me-2" /> عقد إيجار جديد
                </Button>
            </PageHeader>

            <Card className="overflow-hidden border border-slate-100 dark:border-slate-800">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900 font-black">
                    <h3>سجل العقود</h3>
                    <div className="flex gap-2">
                        <Button variant="outline" className="h-10 px-4 rounded-xl text-xs"><Filter size={14} className="me-2" /> فلترة</Button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                                <th className="px-6 py-4">رقم العقد</th>
                                <th className="px-6 py-4">المستأجر</th>
                                <th className="px-6 py-4">الوحدة</th>
                                <th className="px-6 py-4">تاريخ البدء</th>
                                <th className="px-6 py-4">تاريخ الانتهاء</th>
                                <th className="px-6 py-4">القيمة الإجمالية</th>
                                <th className="px-6 py-4 text-center">الحالة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => <tr key={i}><td colSpan={7} className="p-4"><div className="h-4 bg-slate-100 dark:bg-slate-800 animate-pulse rounded"></div></td></tr>)
                            ) : contracts.length > 0 ? (
                                contracts.map(contract => (
                                    <tr key={contract.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                                        <td className="px-6 py-4 font-mono font-black">{contract.contractNumber}</td>
                                        <td className="px-6 py-4 font-bold">{contract.tenantName}</td>
                                        <td className="px-6 py-4 font-bold text-slate-500">{contract.unitNumber}</td>
                                        <td className="px-6 py-4 font-bold text-slate-500">{contract.startDate ? new Date(contract.startDate?.seconds * 1000).toLocaleDateString() : '...'}</td>
                                        <td className="px-6 py-4 font-bold text-slate-500">{contract.endDate ? new Date(contract.endDate?.seconds * 1000).toLocaleDateString() : '...'}</td>
                                        <td className="px-6 py-4 font-black text-indigo-600">{contract.totalAmount?.toLocaleString()} ر.س</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${
                                                contract.status === 'Active' ? 'bg-emerald-100 text-emerald-600' : 
                                                'bg-rose-100 text-rose-600'
                                            }`}>
                                                {contract.status === 'Active' ? 'نشط' : contract.status === 'Terminated' ? 'ملغي' : 'منتهي'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center text-slate-400">
                                        <FileText size={48} className="mx-auto mb-4 opacity-20" />
                                        <p className="font-black">لا توجد عقود تأجير مسجلة حالياً</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="إضافة عقد إيجار جديد">
                <form onSubmit={handleAddContract} className="space-y-4 p-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black text-slate-500 mb-1">رقم العقد</label>
                            <input 
                                required
                                type="text" 
                                className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="LC-2024-001"
                                value={formData.contractNumber}
                                onChange={e => setFormData({...formData, contractNumber: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-500 mb-1">المستأجر</label>
                            <input 
                                required
                                type="text" 
                                className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="اسم المستأجر"
                                value={formData.tenantName}
                                onChange={e => setFormData({...formData, tenantName: e.target.value})}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-500 mb-1">رقم الوحدة</label>
                        <input 
                            required
                            type="text" 
                            className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="A-101"
                            value={formData.unitNumber}
                            onChange={e => setFormData({...formData, unitNumber: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black text-slate-500 mb-1">تاريخ البدء</label>
                            <input 
                                required
                                type="date" 
                                className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={formData.startDate}
                                onChange={e => setFormData({...formData, startDate: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-500 mb-1">تاريخ الانتهاء</label>
                            <input 
                                required
                                type="date" 
                                className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={formData.endDate}
                                onChange={e => setFormData({...formData, endDate: e.target.value})}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-500 mb-1">القيمة الإجمالية</label>
                        <input 
                            required
                            type="number" 
                            className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="0.00"
                            value={formData.totalAmount}
                            onChange={e => setFormData({...formData, totalAmount: Number(e.target.value)})}
                        />
                    </div>
                    <div className="pt-4 flex gap-3">
                        <Button 
                            type="submit" 
                            className="flex-1 bg-indigo-600 h-12 rounded-xl font-black shadow-lg shadow-indigo-500/20"
                            disabled={submitting}
                        >
                            {submitting ? 'جاري الحفظ...' : 'حفظ العقد'}
                        </Button>
                        <Button 
                            type="button"
                            variant="outline" 
                            className="h-12 px-6 rounded-xl font-black"
                            onClick={() => setIsModalOpen(false)}
                        >
                            إلغاء
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default LeaseContractsPage;

