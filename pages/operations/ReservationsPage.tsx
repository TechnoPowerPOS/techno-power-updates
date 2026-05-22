import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { handleFirestoreError, OperationType } from '../../services/firestoreErrorHandler';
import { useToasts } from '../../hooks/useToasts';
import { Calendar, Plus, Search, Filter, User, Clock, MapPin, X } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/layout/PageHeader';
import Modal from '../../components/ui/Modal';

interface Reservation {
    id: string;
    customerName: string;
    date: any;
    time: string;
    service: string;
    status: 'Confirmed' | 'Pending' | 'Cancelled';
}

const ReservationsPage: React.FC = () => {
    const { addToast } = useToasts();
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        customerName: '',
        date: '',
        time: '',
        service: '',
        status: 'Confirmed' as const
    });

    useEffect(() => {
        fetchReservations();
    }, []);

    const fetchReservations = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'op_reservations'), orderBy('date', 'asc'), limit(50));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reservation));
            setReservations(data);
        } catch (error) {
            handleFirestoreError(error, OperationType.GET, 'op_reservations');
        } finally {
            setLoading(false);
        }
    };

    const handleAddReservation = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await addDoc(collection(db, 'op_reservations'), {
                ...formData,
                date: new Date(formData.date)
            });
            addToast('تم إضافة الحجز بنجاح', 'success');
            setIsModalOpen(false);
            setFormData({ customerName: '', date: '', time: '', service: '', status: 'Confirmed' });
            fetchReservations();
        } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'op_reservations');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader title="إدارة الحجوزات والمواعيد" subtitle="حجز وجدولة المواعيد مع العملاء وإدارة التقويم">
                <Button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-indigo-600 rounded-2xl h-12 px-8 font-black shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                >
                    <Plus size={18} className="me-2" /> حجز موعد جديد
                </Button>
            </PageHeader>

            <Card className="overflow-hidden border border-slate-100 dark:border-slate-800">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900 font-black">
                    <h3>المواعيد القادمة</h3>
                    <div className="flex gap-2">
                        <Button variant="outline" className="h-10 px-4 rounded-xl text-xs"><Filter size={14} className="me-2" /> فلترة</Button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                                <th className="px-6 py-4">العميل</th>
                                <th className="px-6 py-4">التاريخ</th>
                                <th className="px-6 py-4">الوقت</th>
                                <th className="px-6 py-4">الخدمة</th>
                                <th className="px-6 py-4 text-center">الحالة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => <tr key={i}><td colSpan={5} className="p-4"><div className="h-4 bg-slate-100 dark:bg-slate-800 animate-pulse rounded"></div></td></tr>)
                            ) : reservations.length > 0 ? (
                                reservations.map(res => (
                                    <tr key={res.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                                        <td className="px-6 py-4 font-bold">{res.customerName}</td>
                                        <td className="px-6 py-4 font-bold text-slate-500">{res.date ? new Date(res.date?.seconds * 1000).toLocaleDateString() : '...'}</td>
                                        <td className="px-6 py-4 font-mono font-black">{res.time}</td>
                                        <td className="px-6 py-4 text-slate-500 text-sm">{res.service}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${
                                                res.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-600' : 
                                                res.status === 'Cancelled' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                                            }`}>
                                                {res.status === 'Confirmed' ? 'مؤكد' : res.status === 'Cancelled' ? 'ملغي' : 'معلق'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center text-slate-400">
                                        <Calendar size={48} className="mx-auto mb-4 opacity-20" />
                                        <p className="font-black">لا توجد حجوزات مسجلة حالياً</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="إضافة موعد جديد">
                <form onSubmit={handleAddReservation} className="space-y-4 p-4">
                    <div>
                        <label className="block text-xs font-black text-slate-500 mb-1">اسم العميل</label>
                        <input 
                            required
                            type="text" 
                            className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="أدخل اسم العميل"
                            value={formData.customerName}
                            onChange={e => setFormData({...formData, customerName: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black text-slate-500 mb-1">التاريخ</label>
                            <input 
                                required
                                type="date" 
                                className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={formData.date}
                                onChange={e => setFormData({...formData, date: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-500 mb-1">الوقت</label>
                            <input 
                                required
                                type="time" 
                                className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={formData.time}
                                onChange={e => setFormData({...formData, time: e.target.value})}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-500 mb-1">الخدمة المطلوبة</label>
                        <input 
                            required
                            type="text" 
                            className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="مثلا: صيانة دورية، استشارة..."
                            value={formData.service}
                            onChange={e => setFormData({...formData, service: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-500 mb-1">الحالة</label>
                        <select 
                            className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={formData.status}
                            onChange={e => setFormData({...formData, status: e.target.value as any})}
                        >
                            <option value="Pending">معلق</option>
                            <option value="Confirmed">مؤكد</option>
                            <option value="Cancelled">ملغي</option>
                        </select>
                    </div>
                    <div className="pt-4 flex gap-3">
                        <Button 
                            type="submit" 
                            className="flex-1 bg-indigo-600 h-12 rounded-xl font-black shadow-lg shadow-indigo-500/20"
                            disabled={submitting}
                        >
                            {submitting ? 'جاري الحفظ...' : 'حفظ الموعد'}
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

export default ReservationsPage;

