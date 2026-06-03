
import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, limit, addDoc, serverTimestamp } from '../../services/localFirestore';
import { db  } from '../../services/localFirestore';
import { handleFirestoreError, OperationType } from '../../services/firestoreErrorHandler';
import { useToasts } from '../../hooks/useToasts';
import { FileText, Plus, Search, Filter, Calendar, User, ShieldCheck, Clock, Download, X } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/layout/PageHeader';
import Modal from '../../components/ui/Modal';

interface Contract {
    id: string;
    employeeName: string;
    type: 'Term' | 'Permanent' | 'Project Based';
    startDate: any;
    endDate: any;
    salary: number;
    status: 'Active' | 'Expired' | 'Terminated';
}

const ContractsPage: React.FC = () => {
    const { addToast } = useToasts();
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        employeeName: '',
        type: 'Permanent',
        startDate: '',
        endDate: '',
        salary: 0
    });

    useEffect(() => {
        fetchContracts();
    }, []);

    const fetchContracts = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'hr_contracts'), orderBy('startDate', 'desc'), limit(50));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contract));
            setContracts(data);
        } catch (error) {
            handleFirestoreError(error, OperationType.GET, 'hr_contracts');
        } finally {
            setLoading(false);
        }
    };

    const handleAddContract = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await addDoc(collection(db, 'hr_contracts'), {
                ...formData,
                startDate: new Date(formData.startDate),
                endDate: new Date(formData.endDate),
                status: 'Active'
            });
            addToast('تم إضافة العقد بنجاح', 'success');
            setIsModalOpen(false);
            setFormData({ employeeName: '', type: 'Permanent', startDate: '', endDate: '', salary: 0 });
            fetchContracts();
        } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'hr_contracts');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader title="عقود الموظفين" subtitle="إدارة العقود الوظيفية، مدد التعاقد، واللتزامات المالية">
                <Button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-indigo-600 rounded-2xl h-12 px-8 font-black"
                >
                    <Plus size={18} className="me-2" /> عقد جديد
                </Button>
            </PageHeader>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 border-slate-100 dark:border-slate-800 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">إجمالي العقود النشطة</p>
                    <p className="text-2xl font-black">{contracts.filter(c => c.status === 'Active').length}</p>
                </Card>
                <Card className="p-6 border-slate-100 dark:border-slate-800 shadow-sm">
                    <p className="text-[10px] font-black text-rose-500 uppercase mb-1">عقود تنتهي قريباً</p>
                    <p className="text-2xl font-black text-rose-600">0</p>
                </Card>
            </div>

            <Card className="overflow-hidden border border-slate-100 dark:border-slate-800">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex justify-between items-center">
                    <h3 className="font-black text-lg">سجل التعاقدات</h3>
                    <div className="flex gap-2">
                        <Button variant="outline" className="rounded-xl h-10 px-4 text-xs font-black"><Filter size={14} className="me-2" /> تصفية</Button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                                <th className="px-6 py-4">الموظف</th>
                                <th className="px-6 py-4">نوع العقد</th>
                                <th className="px-6 py-4">تاريخ البدء</th>
                                <th className="px-6 py-4">تاريخ الانتهاء</th>
                                <th className="px-6 py-4">الراتب</th>
                                <th className="px-6 py-4 text-center">الحالة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => <tr key={i}><td colSpan={6} className="p-4"><div className="h-4 bg-slate-100 dark:bg-slate-800 animate-pulse rounded"></div></td></tr>)
                            ) : contracts.length > 0 ? (
                                contracts.map(c => (
                                    <tr key={c.id}>
                                        <td className="px-6 py-4 font-black">{c.employeeName}</td>
                                        <td className="px-6 py-4 font-bold">{c.type}</td>
                                        <td className="px-6 py-4 font-bold text-slate-500">{new Date(c.startDate?.seconds * 1000).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 font-bold text-slate-500">{new Date(c.endDate?.seconds * 1000).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 font-black text-indigo-600">{c.salary?.toLocaleString()} ر.س</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${
                                                c.status === 'Active' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                                            }`}>
                                                {c.status === 'Active' ? 'نشط' : 'منتهي'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center text-slate-400">
                                        <FileText size={48} className="mx-auto mb-4 opacity-20" />
                                        <p className="font-black">لا توجد عقود مسجلة حالياً</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="إضافة عقد جديد">
                <form onSubmit={handleAddContract} className="space-y-4 p-4">
                    <div>
                        <label className="block text-xs font-black text-slate-500 mb-1">اسم الموظف</label>
                        <input 
                            required
                            type="text" 
                            className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="أدخل اسم الموظف"
                            value={formData.employeeName}
                            onChange={e => setFormData({...formData, employeeName: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-500 mb-1">نوع العقد</label>
                        <select 
                            className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={formData.type}
                            onChange={e => setFormData({...formData, type: e.target.value as any})}
                        >
                            <option value="Permanent">دائم</option>
                            <option value="Term">محدد المدة</option>
                            <option value="Project Based">مرتبط بمشروع</option>
                        </select>
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
                        <label className="block text-xs font-black text-slate-500 mb-1">الراتب</label>
                        <input 
                            required
                            type="number" 
                            className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="0.00"
                            value={formData.salary}
                            onChange={e => setFormData({...formData, salary: Number(e.target.value)})}
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

export default ContractsPage;

