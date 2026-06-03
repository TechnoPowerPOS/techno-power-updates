
import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, limit, addDoc, serverTimestamp } from '../../services/localFirestore';
import { db  } from '../../services/localFirestore';
import { handleFirestoreError, OperationType } from '../../services/firestoreErrorHandler';
import { useToasts } from '../../hooks/useToasts';
import { PieChart, Plus, Search, Filter, Database, TrendingUp, DollarSign, Target } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/layout/PageHeader';

import Modal from '../../components/ui/Modal';

interface CostCenter {
    id: string;
    name: string;
    code: string;
    budget: number;
    spent: number;
    manager: string;
}

const CostCentersPage: React.FC = () => {
    const { addToast } = useToasts();
    const [centers, setCenters] = useState<CostCenter[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        budget: 0,
        spent: 0,
        manager: ''
    });

    useEffect(() => {
        fetchCenters();
    }, []);

    const fetchCenters = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'acc_cost_centers'), orderBy('code', 'asc'), limit(50));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CostCenter));
            setCenters(data);
        } catch (error) {
            handleFirestoreError(error, OperationType.GET, 'acc_cost_centers');
        } finally {
            setLoading(false);
        }
    };

    const handleAddCenter = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await addDoc(collection(db, 'acc_cost_centers'), {
                ...formData,
                createdAt: serverTimestamp()
            });
            addToast('تم إنشاء مركز التكلفة بنجاح', 'success');
            setIsModalOpen(false);
            setFormData({ name: '', code: '', budget: 0, spent: 0, manager: '' });
            fetchCenters();
        } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'acc_cost_centers');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader title="مراكز التكلفة" subtitle="توزيع الميزانيات، مراقبة المصروفات لكل قسم أو مشروع">
                <Button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-indigo-600 rounded-2xl h-12 px-8 font-black shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                >
                    <Plus size={18} className="me-2" /> مركز جديد
                </Button>
            </PageHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array(3).fill(0).map((_, i) => <div key={i} className="h-56 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-3xl"></div>)
                ) : centers.length > 0 ? (
                    centers.map(center => (
                        <Card key={center.id} className="p-8 border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-bl-full -z-0 group-hover:scale-110 transition-transform"></div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="font-black text-lg">{center.name}</h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{center.code}</p>
                                    </div>
                                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
                                        <Target size={24} />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between text-xs font-black mb-1">
                                            <span className="text-slate-400">الاستهلاك</span>
                                            <span>{Math.round((center.spent / center.budget) * 100)}%</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-indigo-600 transition-all duration-1000" 
                                                style={{ width: `${(center.spent / center.budget) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 mb-1 uppercase">المجموع المنصرف</p>
                                            <p className="text-xl font-black text-rose-600">{center.spent.toLocaleString()} <span className="text-[10px]">ر.س</span></p>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[10px] font-black text-slate-400 mb-1 uppercase">الميزانية</p>
                                            <p className="text-md font-black">{center.budget.toLocaleString()} <span className="text-[10px]">ر.س</span></p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center opacity-30">
                        <TrendingUp size={64} className="mx-auto mb-4" />
                        <p className="font-black text-lg">لم يتم إنشاء مراكز تكلفة بعد</p>
                    </div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="إنشاء مركز تكلفة جديد">
                <form onSubmit={handleAddCenter} className="space-y-4 p-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black text-slate-500 mb-1">اسم المركز</label>
                            <input 
                                required
                                type="text" 
                                className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="مثال: قسم التسويق"
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-500 mb-1">الكود</label>
                            <input 
                                required
                                type="text" 
                                className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="MKT-01"
                                value={formData.code}
                                onChange={e => setFormData({...formData, code: e.target.value})}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-500 mb-1">الميزانية التقديرية</label>
                        <input 
                            required
                            type="number" 
                            className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="0.00"
                            value={formData.budget}
                            onChange={e => setFormData({...formData, budget: Number(e.target.value)})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-500 mb-1">مدير المركز</label>
                        <input 
                            type="text" 
                            className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="اسم المسؤول"
                            value={formData.manager}
                            onChange={e => setFormData({...formData, manager: e.target.value})}
                        />
                    </div>
                    <div className="pt-4 flex gap-3">
                        <Button 
                            type="submit" 
                            className="flex-1 bg-indigo-600 h-12 rounded-xl font-black shadow-lg shadow-indigo-500/20"
                            disabled={submitting}
                        >
                            {submitting ? 'جاري الحفظ...' : 'إنشاء المركز'}
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

export default CostCentersPage;
