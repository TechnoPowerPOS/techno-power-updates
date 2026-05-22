import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, limit, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { handleFirestoreError, OperationType } from '../../services/firestoreErrorHandler';
import { useToasts } from '../../hooks/useToasts';
import { Factory, Plus, Search, Filter, Box, Settings, CheckCircle2, X, Trash2, Edit3 } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/layout/PageHeader';
import Modal from '../../components/ui/Modal';

interface ManufacturingOrder {
    id: string;
    productName: string;
    quantity: number;
    assignedTo: string;
    status: 'Planned' | 'In Production' | 'Quality Check' | 'Completed';
    startDate: any;
}

const ManufacturingPage: React.FC = () => {
    const { addToast } = useToasts();
    const [orders, setOrders] = useState<ManufacturingOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    const [formData, setFormData] = useState({
        productName: '',
        quantity: 0,
        assignedTo: '',
        status: 'Planned' as ManufacturingOrder['status'],
        startDate: ''
    });

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'op_manufacturing'), orderBy('startDate', 'desc'), limit(100));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ManufacturingOrder));
            setOrders(data);
        } catch (error) {
            handleFirestoreError(error, OperationType.GET, 'op_manufacturing');
        } finally {
            setLoading(false);
        }
    };

    const handleAddOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                ...formData,
                startDate: formData.startDate ? new Date(formData.startDate).toISOString() : new Date().toISOString()
            };

            if (editingId) {
                await updateDoc(doc(db, 'op_manufacturing', editingId), payload);
                addToast('تم تحديث أمر الإنتاج بنجاح', 'success');
            } else {
                await addDoc(collection(db, 'op_manufacturing'), payload);
                addToast('تم إضافة أمر الإنتاج بنجاح', 'success');
            }
            
            setIsModalOpen(false);
            resetForm();
            fetchOrders();
        } catch (error) {
            handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'op_manufacturing');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateStatus = async (id: string, status: ManufacturingOrder['status']) => {
        try {
            await updateDoc(doc(db, 'op_manufacturing', id), { status });
            setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
            addToast('تم تحديث حالة أمر الإنتاج', 'success');
        } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, 'op_manufacturing');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا الأمر؟')) return;
        try {
            await deleteDoc(doc(db, 'op_manufacturing', id));
            setOrders(prev => prev.filter(o => o.id !== id));
            addToast('تم حذف أمر الإنتاج بنجاح', 'success');
        } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, 'op_manufacturing');
        }
    };

    const handleEdit = (order: ManufacturingOrder) => {
        setEditingId(order.id);
        setFormData({
            productName: order.productName,
            quantity: order.quantity,
            assignedTo: order.assignedTo,
            status: order.status,
            startDate: order.startDate ? (order.startDate.seconds ? new Date(order.startDate.seconds * 1000).toISOString().split('T')[0] : new Date(order.startDate).toISOString().split('T')[0]) : ''
        });
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({ productName: '', quantity: 0, assignedTo: '', status: 'Planned', startDate: '' });
    };

    const filteredOrders = orders.filter(o => {
        const matchesSearch = o.productName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             o.assignedTo.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || o.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6">
            <PageHeader title="إدارة التصنيع والإنتاج" subtitle="متابعة المواد الخام، خطوط الإنتاج، وأوامر التصنيع المحلي">
                <Button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-indigo-600 rounded-2xl h-12 px-8 font-black shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                >
                    <Plus size={18} className="me-2" /> أمر تصنيع جديد
                </Button>
            </PageHeader>

            <Card className="overflow-hidden border border-slate-100 dark:border-slate-800">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center bg-slate-50/50 dark:bg-slate-900 gap-4">
                    <h3 className="font-black">أوامر الإنتاج</h3>
                    <div className="flex flex-1 md:max-w-md gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input 
                                type="text"
                                placeholder="البحث في الأوامر..."
                                className="w-full h-10 pr-9 pl-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select 
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                            className="h-10 px-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl outline-none text-[10px] font-black cursor-pointer"
                        >
                            <option value="all">كل الحالات</option>
                            <option value="Planned">مخطط</option>
                            <option value="In Production">جاري الإنتاج</option>
                            <option value="Quality Check">فحص جودة</option>
                            <option value="Completed">مكتمل</option>
                        </select>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                                <th className="px-6 py-4">المنتج</th>
                                <th className="px-6 py-4">الكمية المستهدفة</th>
                                <th className="px-6 py-4">الخط / الموظف</th>
                                <th className="px-6 py-4">تاريخ البدء</th>
                                <th className="px-6 py-4 text-center">الحالة</th>
                                <th className="px-6 py-4 text-center">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => <tr key={i}><td colSpan={6} className="p-4"><div className="h-4 bg-slate-100 dark:bg-slate-800 animate-pulse rounded"></div></td></tr>)
                            ) : filteredOrders.length > 0 ? (
                                filteredOrders.map(order => (
                                    <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                                        <td className="px-6 py-4 font-bold">{order.productName}</td>
                                        <td className="px-6 py-4 font-black text-indigo-600">{order.quantity}</td>
                                        <td className="px-6 py-4 font-bold text-slate-500">{order.assignedTo}</td>
                                        <td className="px-6 py-4 font-bold text-slate-500">{order.startDate ? (order.startDate.seconds ? new Date(order.startDate.seconds * 1000).toLocaleDateString() : new Date(order.startDate).toLocaleDateString()) : '...'}</td>
                                        <td className="px-6 py-4 text-center">
                                            <select 
                                                value={order.status}
                                                onChange={(e) => handleUpdateStatus(order.id, e.target.value as any)}
                                                className={`px-2 py-1 rounded-lg text-[10px] font-black border-none outline-none cursor-pointer ${
                                                    order.status === 'Completed' ? 'bg-emerald-100 text-emerald-600' : 
                                                    order.status === 'In Production' ? 'bg-indigo-100 text-indigo-600' : 
                                                    order.status === 'Quality Check' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'
                                                }`}
                                            >
                                                <option value="Planned">مخطط</option>
                                                <option value="In Production">جاري الإنتاج</option>
                                                <option value="Quality Check">فحص جودة</option>
                                                <option value="Completed">مكتمل</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center gap-1">
                                                <button onClick={() => handleEdit(order)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"><Edit3 size={16} /></button>
                                                <button onClick={() => handleDelete(order.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center text-slate-400">
                                        <Factory size={48} className="mx-auto mb-4 opacity-20" />
                                        <p className="font-black">لا توجد أوامر إنتاج مطابقة للبحث</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm(); }} title={editingId ? "تعديل أمر الإنتاج" : "إضافة أمر تصنيع"}>
                <form onSubmit={handleAddOrder} className="space-y-4 p-4">
                    <div>
                        <label className="block text-xs font-black text-slate-500 mb-1">المنتج</label>
                        <input 
                            required
                            type="text" 
                            className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="اسم المنتج المراد تصنيعه"
                            value={formData.productName}
                            onChange={e => setFormData({...formData, productName: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black text-slate-500 mb-1">الكمية</label>
                            <input 
                                required
                                type="number" 
                                className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="0"
                                value={formData.quantity}
                                onChange={e => setFormData({...formData, quantity: Number(e.target.value)})}
                            />
                        </div>
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
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-500 mb-1">المسؤول / خط الإنتاج</label>
                        <input 
                            required
                            type="text" 
                            className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="اسم المسؤول عن الإنتاج"
                            value={formData.assignedTo}
                            onChange={e => setFormData({...formData, assignedTo: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-500 mb-1">الحالة</label>
                        <select 
                            className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={formData.status}
                            onChange={e => setFormData({...formData, status: e.target.value as any})}
                        >
                            <option value="Planned">مخطط</option>
                            <option value="In Production">جاري الإنتاج</option>
                            <option value="Quality Check">فحص جودة</option>
                            <option value="Completed">مكتمل</option>
                        </select>
                    </div>
                    <div className="pt-4 flex gap-3">
                        <Button 
                            type="submit" 
                            className="flex-1 bg-indigo-600 h-12 rounded-xl font-black shadow-lg shadow-indigo-500/20"
                            disabled={submitting}
                        >
                            {submitting ? 'جاري الحفظ...' : 'حفظ الأمر'}
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

export default ManufacturingPage;

