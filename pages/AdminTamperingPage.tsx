import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { handleFirestoreError, OperationType } from '../services/firestoreErrorHandler';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useToasts } from '../hooks/useToasts';
import { AlertOctagon, CheckCircle, Trash2, ShieldAlert } from 'lucide-react';

const AdminTamperingPage: React.FC = () => {
    const { addToast } = useToasts();
    const [logs, setLogs] = useState<any[]>([]);

    useEffect(() => {
        const q = query(collection(db, 'app_tampering_logs'), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (error) => {
            handleFirestoreError(error, OperationType.GET, 'app_tampering_logs');
        });
        return () => unsub();
    }, []);

    const handleDelete = async (id: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا السجل؟')) return;
        try {
            await deleteDoc(doc(db, 'app_tampering_logs', id));
            addToast('تم حذف السجل بنجاح', 'success');
        } catch (e) {
            addToast('حدث خطأ أثناء الحذف', 'error');
        }
    };

    const handleBlockDevice = async (deviceId: string) => {
        if (!deviceId) return;
        if (!window.confirm('هل أنت متأكد من حظر هذا الجهاز؟')) return;
        try {
            await updateDoc(doc(db, 'devices', deviceId), {
                status: 'blocked',
                adminMessage: 'تم حظر الجهاز بسبب التلاعب بالنظام.'
            });
            addToast('تم حظر الجهاز بنجاح', 'success');
        } catch (e) {
            addToast('حدث خطأ أثناء الحظر', 'error');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                        <ShieldAlert className="text-rose-500" size={32} /> التلاعب والمشاكل
                    </h2>
                    <p className="text-slate-500 font-bold mt-2">سجلات اكتشاف التلاعب في النظام أو الوقت أو الأكواد.</p>
                </div>
            </div>

            <Card className="border-rose-100 dark:border-rose-900/30">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] uppercase text-slate-500">
                            <tr>
                                <th className="p-4 text-start rounded-s-2xl">التاريخ</th>
                                <th className="p-4 text-start">معرف الجهاز</th>
                                <th className="p-4 text-start">العميل / المتجر</th>
                                <th className="p-4 text-start">نوع التلاعب</th>
                                <th className="p-4 text-start">التفاصيل</th>
                                <th className="p-4 text-center rounded-e-2xl">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-slate-800 font-bold">
                            {logs.map(log => (
                                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="p-4 text-xs text-slate-500" dir="ltr">{new Date(log.createdAt).toLocaleString('ar-EG')}</td>
                                    <td className="p-4 text-xs text-indigo-600 font-mono">{log.deviceId}</td>
                                    <td className="p-4">{log.customerName || 'غير معروف'}</td>
                                    <td className="p-4">
                                        <span className="px-3 py-1 bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 rounded-full text-[10px]">
                                            {log.type === 'time_tampering' ? 'تلاعب بالوقت' : log.type === 'code_tampering' ? 'تلاعب بالكود' : log.type}
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-500 text-xs max-w-xs truncate" title={log.details}>{log.details}</td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            <Button size="sm" variant="danger" onClick={() => handleBlockDevice(log.deviceId)} className="rounded-xl bg-rose-100 text-rose-700 hover:bg-rose-200">
                                                حظر الجهاز
                                            </Button>
                                            <button onClick={() => handleDelete(log.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500 font-bold">
                                        <CheckCircle size={48} className="mx-auto text-emerald-500 mb-4 opacity-50" />
                                        لم يتم تسجيل أي تلاعب في النظام.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default AdminTamperingPage;
