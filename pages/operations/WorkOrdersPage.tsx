
import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, orderBy } from '../../services/localFirestore';
import { db  } from '../../services/localFirestore';
import { handleFirestoreError, OperationType } from '../../services/firestoreErrorHandler';
import { useToasts } from '../../hooks/useToasts';
import { Wrench, Plus, Search, Filter, Clock, CheckCircle2, AlertCircle, Trash2, Edit3, User, Calendar, Tag } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/layout/PageHeader';

import Modal from '../../components/ui/Modal';

interface WorkOrder {
    id: string;
    title: string;
    customerName: string;
    status: 'Pending' | 'In Progress' | 'Completed' | 'Canceled';
    priority: 'Low' | 'Medium' | 'High';
    assignedTo: string;
    dueDate: any;
    description: string;
    createdAt: any;
}

import ConfirmDialog from '../../components/ui/ConfirmDialog';

const WorkOrdersPage: React.FC = () => {
    const { addToast } = useToasts();
    const [orders, setOrders] = useState<WorkOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    // Search and Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'All' | 'Processing' | 'Completed'>('All');
    
    const [formData, setFormData] = useState({
        title: '',
        customerName: '',
        description: '',
        assignedTo: '',
        priority: 'Medium' as const,
        status: 'Pending' as const
    });

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'op_work_orders'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkOrder));
            setOrders(data);
        } catch (error) {
            handleFirestoreError(error, OperationType.GET, 'op_work_orders');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                ...formData,
                updatedAt: serverTimestamp(),
            };

            if (editingId) {
                await updateDoc(doc(db, 'op_work_orders', editingId), payload);
                addToast('تم تحديث أمر الشغل بنجاح', 'success');
            } else {
                await addDoc(collection(db, 'op_work_orders'), {
                    ...payload,
                    createdAt: serverTimestamp(),
                    dueDate: null
                });
                addToast('تم إنشاء أمر الشغل بنجاح', 'success');
            }
            
            setIsModalOpen(false);
            resetForm();
            fetchOrders();
        } catch (error) {
            handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'op_work_orders');
        } finally {
            setSubmitting(false);
        }
    };

    const updateStatus = async (id: string, newStatus: WorkOrder['status']) => {
        try {
            await updateDoc(doc(db, 'op_work_orders', id), { status: newStatus });
            setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
            addToast('تم تحديث الحالة', 'success');
        } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, `op_work_orders/${id}`);
        }
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            await deleteDoc(doc(db, 'op_work_orders', itemToDelete));
            setOrders(prev => prev.filter(o => o.id !== itemToDelete));
            addToast('تم حذف أمر الشغل بنجاح', 'success');
        } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, 'op_work_orders');
        } finally {
            setItemToDelete(null);
        }
    };

    const handleDelete = (id: string) => {
        setItemToDelete(id);
    };

    const handleEdit = (order: WorkOrder) => {
        setEditingId(order.id);
        setFormData({
            title: order.title,
            customerName: order.customerName,
            description: order.description,
            assignedTo: order.assignedTo,
            priority: order.priority,
            status: order.status
        });
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({ title: '', customerName: '', description: '', assignedTo: '', priority: 'Medium', status: 'Pending' });
    };

    const filteredOrders = orders.filter(o => {
        const matchesSearch = o.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             o.customerName.toLowerCase().includes(searchTerm.toLowerCase());
        
        let matchesTab = true;
        if (activeTab === 'Processing') matchesTab = o.status === 'In Progress' || o.status === 'Pending';
        if (activeTab === 'Completed') matchesTab = o.status === 'Completed';
        
        return matchesSearch && matchesTab;
    });

    return (
        <div className="space-y-6">
            <PageHeader 
                title="أوامر الشغل والعمليات" 
                subtitle="تتبع سير العمل، المهام التشغيلية، وصيانة المعدات أو طلبات التصنيع"
            >
                <Button onClick={() => setIsModalOpen(true)} className="h-12 bg-indigo-600 px-8 rounded-2xl font-black shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">
                    <Plus className="me-2" size={18} />
                    أمر شغل جديد
                </Button>
            </PageHeader>

            <div className="flex flex-col md:flex-row justify-between items-center bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl gap-2 w-full">
                <div className="flex gap-2">
                    <button 
                        onClick={() => setActiveTab('All')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'All' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-500 hover:bg-white dark:hover:bg-slate-700'}`}
                    >
                        الكل
                    </button>
                    <button 
                        onClick={() => setActiveTab('Processing')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'Processing' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-500 hover:bg-white dark:hover:bg-slate-700'}`}
                    >
                        قيد التنفيذ
                    </button>
                    <button 
                        onClick={() => setActiveTab('Completed')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'Completed' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-500 hover:bg-white dark:hover:bg-slate-700'}`}
                    >
                        المكتملة
                    </button>
                </div>
                <div className="relative flex-1 md:max-w-xs w-full">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                        type="text"
                        placeholder="بحث في أوامر الشغل..."
                        className="w-full h-10 pr-9 pl-4 bg-white dark:bg-slate-900 border-none rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm(); }} title={editingId ? "تعديل أمر الشغل" : "إنشاء أمر شغل جديد"}>
                <form onSubmit={handleAdd} className="space-y-6 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500">عنوان أمر الشغل</label>
                            <input 
                                required
                                value={formData.title}
                                onChange={e => setFormData({...formData, title: e.target.value})}
                                placeholder="مثال: صيانة مولد كهربائي أو تصنيع طاولة"
                                className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none font-bold"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500">اسم العميل</label>
                            <input 
                                required
                                value={formData.customerName}
                                onChange={e => setFormData({...formData, customerName: e.target.value})}
                                className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none font-bold"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500">المسؤول عن التنفيذ</label>
                            <input 
                                value={formData.assignedTo}
                                onChange={e => setFormData({...formData, assignedTo: e.target.value})}
                                className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none font-bold"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500">الأولوية</label>
                            <select 
                                value={formData.priority}
                                onChange={e => setFormData({...formData, priority: e.target.value as any})}
                                className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none font-bold cursor-pointer"
                            >
                                <option value="Low">منخفضة</option>
                                <option value="Medium">متوسطة</option>
                                <option value="High">مرتفعة عاجلة</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500">التفاصيل الفنية</label>
                        <textarea 
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                            className="w-full min-h-[100px] p-4 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none font-bold resize-none"
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="submit" disabled={submitting} className="flex-1 bg-indigo-600 h-12 rounded-xl font-black shadow-lg shadow-indigo-500/20">
                            {submitting ? 'جاري الحفظ...' : 'إنشاء الأمر'}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="h-12 px-8 rounded-xl font-black">إلغاء</Button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog 
                isOpen={!!itemToDelete} 
                onClose={() => setItemToDelete(null)} 
                onConfirm={confirmDelete} 
                title="تأكيد الحذف" 
                message="هل أنت متأكد من حذف أمر الشغل هذا؟ لا يمكن التراجع عن هذا الإجراء." 
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array(6).fill(0).map((_, i) => <div key={i} className="h-48 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-3xl"></div>)
                ) : filteredOrders.length > 0 ? (
                    filteredOrders.map(order => (
                        <Card key={order.id} className="p-6 relative group overflow-hidden border border-slate-100 dark:border-slate-800 hover:border-indigo-100 transition-all">
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                                order.priority === 'High' ? 'bg-rose-500' : 
                                order.priority === 'Medium' ? 'bg-amber-500' : 'bg-blue-500'
                            }`} />
                            
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2">
                                     <Tag size={12} className={order.priority === 'High' ? 'text-rose-500' : 'text-slate-400'} />
                                     <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">{order.priority} PRIORITY</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <select 
                                        value={order.status}
                                        onChange={(e) => updateStatus(order.id, e.target.value as any)}
                                        className={`text-[10px] font-black px-3 py-1 rounded-full outline-none cursor-pointer border-none transition-all ${
                                            order.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                                            order.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                            order.status === 'Canceled' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                                        }`}
                                    >
                                        <option value="Pending">قيد الانتظار</option>
                                        <option value="In Progress">قيد التنفيذ</option>
                                        <option value="Completed">مكتمل</option>
                                        <option value="Canceled">ملغي</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-between items-start mb-1">
                                <h3 className="text-lg font-black group-hover:text-indigo-600 transition-colors truncate flex-1">{order.title}</h3>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleEdit(order); }} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg"><Edit3 size={14} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDelete(order.id); }} className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg"><Trash2 size={14} /></button>
                                </div>
                            </div>
                            <p className="text-slate-500 text-sm font-bold mb-4 flex items-center gap-2">
                                <User size={14} /> {order.customerName}
                            </p>

                            <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-slate-50 dark:border-slate-800">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black text-slate-400 block uppercase">Assigned To</span>
                                    <span className="text-xs font-bold">{order.assignedTo || '--'}</span>
                                </div>
                                <div className="space-y-1 text-left">
                                    <span className="text-[10px] font-black text-slate-400 block uppercase">Created At</span>
                                    <div className="text-xs font-bold flex items-center gap-2 justify-end">
                                        <Calendar size={12} />
                                        {order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center opacity-30">
                        <Wrench size={64} className="mx-auto mb-4" />
                        <p className="font-black">لا توجد أوامر شغل حالياً</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WorkOrdersPage;
