import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, limit, addDoc, serverTimestamp } from '../../services/localFirestore';
import { db  } from '../../services/localFirestore';
import { handleFirestoreError, OperationType } from '../../services/firestoreErrorHandler';
import { useToasts } from '../../hooks/useToasts';
import { Building2, Plus, Search, Filter, Warehouse, Clock, Home, X } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/layout/PageHeader';
import Modal from '../../components/ui/Modal';

interface RentalUnit {
    id: string;
    unitNumber: string;
    type: string;
    price: number;
    status: 'Available' | 'Rented' | 'Maintenance';
}

const RentalsPage: React.FC = () => {
    const { addToast } = useToasts();
    const [units, setUnits] = useState<RentalUnit[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        unitNumber: '',
        type: '',
        price: 0,
        status: 'Available' as const
    });

    useEffect(() => {
        fetchUnits();
    }, []);

    const fetchUnits = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'op_rentals'), orderBy('unitNumber', 'asc'), limit(50));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RentalUnit));
            setUnits(data);
        } catch (error) {
            handleFirestoreError(error, OperationType.GET, 'op_rentals');
        } finally {
            setLoading(false);
        }
    };

    const handleAddUnit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await addDoc(collection(db, 'op_rentals'), formData);
            addToast('تم إضافة الوحدة بنجاح', 'success');
            setIsModalOpen(false);
            setFormData({ unitNumber: '', type: '', price: 0, status: 'Available' });
            fetchUnits();
        } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'op_rentals');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader title="إدارة الإيجارات والوحدات" subtitle="التحكم في الوحدات المؤجرة، متابعة المستأجرين والصيانة">
                <Button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-indigo-600 rounded-2xl h-12 px-8 font-black shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                >
                    <Plus size={18} className="me-2" /> إضافة وحدة
                </Button>
            </PageHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Available', color: 'emerald' },
                    { label: 'Rented', color: 'amber' },
                    { label: 'Maintenance', color: 'rose' }
                ].map(item => {
                    const statusUnits = units.filter(u => u.status === item.label);
                    return (
                        <Card key={item.label} className="p-6 bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{item.label}</p>
                            <p className={`text-2xl font-black text-${item.color}-600`}>{statusUnits.length}</p>
                        </Card>
                    );
                })}
            </div>

            <Card className="overflow-hidden border border-slate-100 dark:border-slate-800">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900 font-black">
                    <h3>الوحدات</h3>
                    <div className="flex gap-2">
                        <Button variant="outline" className="h-10 px-4 rounded-xl text-xs"><Filter size={14} className="me-2" /> فلترة</Button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                                <th className="px-6 py-4">رقم الوحدة</th>
                                <th className="px-6 py-4">النوع</th>
                                <th className="px-6 py-4">السعر الإيجاري</th>
                                <th className="px-6 py-4 text-center">الحالة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => <tr key={i}><td colSpan={4} className="p-4"><div className="h-4 bg-slate-100 dark:bg-slate-800 animate-pulse rounded"></div></td></tr>)
                            ) : units.length > 0 ? (
                                units.map(unit => (
                                    <tr key={unit.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                                        <td className="px-6 py-4 font-mono font-black">{unit.unitNumber}</td>
                                        <td className="px-6 py-4 font-bold text-slate-500">{unit.type}</td>
                                        <td className="px-6 py-4 font-black text-indigo-600">{unit.price?.toLocaleString()} ر.س</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${
                                                unit.status === 'Available' ? 'bg-emerald-100 text-emerald-600' : 
                                                unit.status === 'Maintenance' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                                            }`}>
                                                {unit.status === 'Available' ? 'متاح' : unit.status === 'Maintenance' ? 'صيانة' : 'مؤجر'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="py-20 text-center text-slate-400">
                                        <Building2 size={48} className="mx-auto mb-4 opacity-20" />
                                        <p className="font-black">لا توجد وحدات مسجلة حالياً</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="إضافة وحدة جديدة">
                <form onSubmit={handleAddUnit} className="space-y-4 p-4">
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
                    <div>
                        <label className="block text-xs font-black text-slate-500 mb-1">النوع</label>
                        <input 
                            required
                            type="text" 
                            className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="مثلاً: شقة، مكتب، مخزن"
                            value={formData.type}
                            onChange={e => setFormData({...formData, type: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-500 mb-1">السعر الإيجاري (شهرياً)</label>
                        <input 
                            required
                            type="number" 
                            className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="0.00"
                            value={formData.price}
                            onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-500 mb-1">الحالة</label>
                        <select 
                            className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={formData.status}
                            onChange={e => setFormData({...formData, status: e.target.value as any})}
                        >
                            <option value="Available">متاحة</option>
                            <option value="Rented">مؤجرة</option>
                            <option value="Maintenance">صيانة</option>
                        </select>
                    </div>
                    <div className="pt-4 flex gap-3">
                        <Button 
                            type="submit" 
                            className="flex-1 bg-indigo-600 h-12 rounded-xl font-black shadow-lg shadow-indigo-500/20"
                            disabled={submitting}
                        >
                            {submitting ? 'جاري الحفظ...' : 'حفظ الوحدة'}
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

export default RentalsPage;

