import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { handleFirestoreError, OperationType } from '../../services/firestoreErrorHandler';
import { useToasts } from '../../hooks/useToasts';
import { GitMerge, Plus, Search, Filter, Database, CheckCircle, Clock, X } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/layout/PageHeader';
import Modal from '../../components/ui/Modal';

interface WorkflowTask {
    id: string;
    title: string;
    assignee: string;
    stage: 'Backlog' | 'In Progress' | 'Review' | 'Completed';
    priority: 'Low' | 'Medium' | 'High';
    createdAt: any;
}

const WorkflowPage: React.FC = () => {
    const { addToast } = useToasts();
    const [tasks, setTasks] = useState<WorkflowTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        assignee: '',
        stage: 'Backlog' as const,
        priority: 'Medium' as const
    });

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'op_workflow'), orderBy('createdAt', 'desc'), limit(50));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkflowTask));
            setTasks(data);
        } catch (error) {
            handleFirestoreError(error, OperationType.GET, 'op_workflow');
        } finally {
            setLoading(false);
        }
    };

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await addDoc(collection(db, 'op_workflow'), {
                ...formData,
                createdAt: serverTimestamp()
            });
            addToast('تم إضافة المهمة بنجاح', 'success');
            setIsModalOpen(false);
            setFormData({ title: '', assignee: '', stage: 'Backlog', priority: 'Medium' });
            fetchTasks();
        } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'op_workflow');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader title="دورة العمل (العمليات)" subtitle="متابعة تدفق العمل وتحديث حالة مراحل التشغيل والمهام">
                <Button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-indigo-600 rounded-2xl h-12 px-8 font-black shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                >
                    <Plus size={18} className="me-2" /> مهمة جديدة
                </Button>
            </PageHeader>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {['Backlog', 'In Progress', 'Review', 'Completed'].map(stage => {
                    const stageTasks = tasks.filter(t => t.stage === stage);
                    return (
                        <Card key={stage} className="p-4 bg-slate-50 dark:bg-slate-900 border-dashed border-2 border-slate-200 dark:border-slate-800">
                            <h3 className="font-black text-xs mb-4 text-slate-500 uppercase tracking-widest flex items-center justify-between">
                                <span>{stage}</span>
                                <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">{stageTasks.length}</span>
                            </h3>
                            <div className="space-y-3">
                                {stageTasks.map(task => (
                                    <div key={task.id} className="p-4 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl shadow-sm hover:border-indigo-400 transition-colors cursor-pointer group">
                                        <h4 className="font-bold text-sm mb-2 group-hover:text-indigo-600 transition-colors">{task.title}</h4>
                                        <div className="flex justify-between items-center text-[10px]">
                                            <span className="text-slate-500 flex items-center gap-1"><Clock size={10}/>{task.createdAt ? new Date(task.createdAt?.seconds * 1000).toLocaleDateString() : '...'}</span>
                                            <span className={`px-2 py-0.5 rounded font-black ${
                                                task.priority === 'High' ? 'bg-rose-100 text-rose-600' :
                                                task.priority === 'Medium' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                                            }`}>{task.priority}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    );
                })}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="إضافة مهمة جديدة">
                <form onSubmit={handleAddTask} className="space-y-4 p-4">
                    <div>
                        <label className="block text-xs font-black text-slate-500 mb-1">عنوان المهمة</label>
                        <input 
                            required
                            type="text" 
                            className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="ما الذي يحتاج للقيام به؟"
                            value={formData.title}
                            onChange={e => setFormData({...formData, title: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-500 mb-1">المسؤول</label>
                        <input 
                            required
                            type="text" 
                            className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="اسم الشخص المكلف"
                            value={formData.assignee}
                            onChange={e => setFormData({...formData, assignee: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black text-slate-500 mb-1">المرحلة</label>
                            <select 
                                className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={formData.stage}
                                onChange={e => setFormData({...formData, stage: e.target.value as any})}
                            >
                                <option value="Backlog">المهام المجدولة</option>
                                <option value="In Progress">قيد التنفيذ</option>
                                <option value="Review">للمراجعة</option>
                                <option value="Completed">مكتملة</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-500 mb-1">الأولوية</label>
                            <select 
                                className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={formData.priority}
                                onChange={e => setFormData({...formData, priority: e.target.value as any})}
                            >
                                <option value="Low">منخفضة</option>
                                <option value="Medium">متوسطة</option>
                                <option value="High">عالية</option>
                            </select>
                        </div>
                    </div>
                    <div className="pt-4 flex gap-3">
                        <Button 
                            type="submit" 
                            className="flex-1 bg-indigo-600 h-12 rounded-xl font-black shadow-lg shadow-indigo-500/20"
                            disabled={submitting}
                        >
                            {submitting ? 'جاري الحفظ...' : 'حفظ المهمة'}
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

export default WorkflowPage;

