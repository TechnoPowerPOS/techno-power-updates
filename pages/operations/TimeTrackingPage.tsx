import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { handleFirestoreError, OperationType } from '../../services/firestoreErrorHandler';
import { useToasts } from '../../hooks/useToasts';
import { Timer, Plus, Search, Filter, Play, Square, User, X } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/layout/PageHeader';
import Modal from '../../components/ui/Modal';

interface TimeLog {
    id: string;
    employeeName: string;
    project: string;
    taskName: string;
    hours: number;
    date: any;
}

const TimeTrackingPage: React.FC = () => {
    const { addToast } = useToasts();
    const [logs, setLogs] = useState<TimeLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        employeeName: '',
        project: '',
        taskName: '',
        hours: 0,
        date: ''
    });

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'op_time_tracking'), orderBy('date', 'desc'), limit(50));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimeLog));
            setLogs(data);
        } catch (error) {
            handleFirestoreError(error, OperationType.GET, 'op_time_tracking');
        } finally {
            setLoading(false);
        }
    };

    const handleAddLog = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await addDoc(collection(db, 'op_time_tracking'), {
                ...formData,
                date: formData.date ? new Date(formData.date).toISOString() : new Date().toISOString()
            });
            addToast('تم إضافة سجل الوقت بنجاح', 'success');
            setIsModalOpen(false);
            setFormData({ employeeName: '', project: '', taskName: '', hours: 0, date: '' });
            fetchLogs();
        } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'op_time_tracking');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader title="تتبع الوقت والتكاليف" subtitle="تتبع الوقت المستغرق في تنفيذ الأعمال والمشاريع لمعرفة التكاليف الإضافية">
                <Button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-12 px-8 font-black transition-colors shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                    <Play size={18} className="me-2" /> بدء تسجيل جديد
                </Button>
            </PageHeader>

            <Card className="overflow-hidden border border-slate-100 dark:border-slate-800">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900 font-black">
                    <h3>سجل الساعات</h3>
                    <div className="flex gap-2">
                        <Button variant="outline" className="h-10 px-4 rounded-xl text-xs"><Filter size={14} className="me-2" /> فلترة</Button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                                <th className="px-6 py-4">الموظف</th>
                                <th className="px-6 py-4">المشروع</th>
                                <th className="px-6 py-4">المهمة</th>
                                <th className="px-6 py-4">التاريخ</th>
                                <th className="px-6 py-4 text-center">الساعات المستغرقة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => <tr key={i}><td colSpan={5} className="p-4"><div className="h-4 bg-slate-100 dark:bg-slate-800 animate-pulse rounded"></div></td></tr>)
                            ) : logs.length > 0 ? (
                                logs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                                        <td className="px-6 py-4 font-bold">{log.employeeName}</td>
                                        <td className="px-6 py-4 font-bold text-indigo-600">{log.project}</td>
                                        <td className="px-6 py-4 font-bold text-slate-500">{log.taskName}</td>
                                        <td className="px-6 py-4 font-bold text-slate-500">{log.date ? (log.date.seconds ? new Date(log.date.seconds * 1000).toLocaleDateString() : new Date(log.date).toLocaleDateString()) : '...'}</td>
                                        <td className="px-6 py-4 text-center font-black">
                                            <span className="bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full text-xs">{log.hours} س</span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center text-slate-400">
                                        <Timer size={48} className="mx-auto mb-4 opacity-20" />
                                        <p className="font-black">لا توجد سجلات وقت حالياً</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="تسجيل وقت جديد">
                <form onSubmit={handleAddLog} className="space-y-4 p-4">
                    <div>
                        <label className="block text-xs font-black text-slate-500 mb-1">اسم الموظف</label>
                        <input 
                            required
                            type="text" 
                            className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="اسم الشخص القائم بالعمل"
                            value={formData.employeeName}
                            onChange={e => setFormData({...formData, employeeName: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-500 mb-1">المشروع</label>
                        <input 
                            required
                            type="text" 
                            className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="اسم المشروع أو العقد"
                            value={formData.project}
                            onChange={e => setFormData({...formData, project: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-500 mb-1">المهمة</label>
                        <input 
                            required
                            type="text" 
                            className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="ما الذي قمت بإنجازه؟"
                            value={formData.taskName}
                            onChange={e => setFormData({...formData, taskName: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black text-slate-500 mb-1">التاريخ</label>
                            <input 
                                required
                                type="date" 
                                className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                                value={formData.date}
                                onChange={e => setFormData({...formData, date: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-500 mb-1">الساعات</label>
                            <input 
                                required
                                type="number" 
                                step="0.5"
                                className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="0.0"
                                value={formData.hours}
                                onChange={e => setFormData({...formData, hours: Number(e.target.value)})}
                            />
                        </div>
                    </div>
                    <div className="pt-4 flex gap-3">
                        <Button 
                            type="submit" 
                            className="flex-1 bg-emerald-600 h-12 rounded-xl font-black shadow-lg shadow-emerald-500/20"
                            disabled={submitting}
                        >
                            {submitting ? 'جاري الحفظ...' : 'حفظ السجل'}
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

export default TimeTrackingPage;

