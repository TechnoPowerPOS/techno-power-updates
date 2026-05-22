import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { handleFirestoreError, OperationType } from '../services/firestoreErrorHandler';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Bell, Send, Trash2, CheckSquare, Square } from 'lucide-react';
import { useToasts } from '../hooks/useToasts';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

interface AppNotification {
    id: string;
    title: string;
    body: string;
    type: 'info' | 'warning' | 'success';
    sentAt: string;
}

const AdminNotificationsPage: React.FC = () => {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const { addToast } = useToasts();
    
    const [formData, setFormData] = useState({
        title: '',
        body: '',
        type: 'info' as 'info' | 'warning' | 'success'
    });

    const [fbUser, setFbUser] = useState(auth.currentUser);

    const load = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'global_notifications'), orderBy('sentAt', 'desc'));
            const snap = await getDocs(q);
            setNotifications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification)));
        } catch (e) {
            handleFirestoreError(e, OperationType.GET, 'global_notifications');
        }
        setLoading(false);
    };

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setFbUser(user);
            if(user) load();
        });
        return () => unsubscribe();
    }, []);

    const handleFbLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (e) {
            addToast('فشل تسجيل الدخول', 'error');
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!fbUser) return handleFbLogin();
        
        try {
            await addDoc(collection(db, 'global_notifications'), {
                ...formData,
                sentAt: new Date().toISOString(),
                readBy: []
            });
            addToast('تم إرسال الإشعار لجميع العملاء', 'success');
            setFormData({ title: '', body: '', type: 'info' });
            load();
        } catch(e) {
            handleFirestoreError(e, OperationType.WRITE, 'global_notifications');
        }
    };

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === notifications.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(notifications.map(n => n.id));
        }
    };

    const handleDeleteSelected = async () => {
        if (!selectedIds.length) return;
        if (!confirm('هل أنت متأكد من حذف الإشعارات المحددة؟، سيتم إزالتها من أجهزة المستخدمين أيضاً.')) return;
        
        try {
            for (const id of selectedIds) {
                await deleteDoc(doc(db, 'global_notifications', id));
            }
            addToast('تم الحذف بنجاح', 'success');
            setSelectedIds([]);
            load();
        } catch (e) {
            handleFirestoreError(e, OperationType.DELETE, 'global_notifications_batch');
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn pb-10">
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-6 rounded-3xl border shadow-sm gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-2">
                        <Bell className="text-indigo-600" />
                        نظام الإشعارات
                    </h1>
                    <p className="text-slate-500 font-bold mb-2">إرسال تعميمات وإشعارات عاجلة لجميع المستخدمين</p>
                </div>
                {!fbUser && <Button onClick={handleFbLogin}>دخول حساب Google</Button>}
                
                {selectedIds.length > 0 && fbUser && (
                    <Button variant="danger" onClick={handleDeleteSelected} className="flex items-center gap-2">
                        <Trash2 size={18} />
                        حذف المحدد ({selectedIds.length})
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="p-6 border-none shadow-premium bg-white lg:col-span-1 h-fit">
                    <h3 className="text-xl font-black mb-4 flex items-center gap-2 text-indigo-600">
                        <Send size={20} />
                        إشعار جديد
                    </h3>
                    <form onSubmit={handleSend} className="space-y-4 font-bold">
                        <div>
                            <label className="text-xs text-slate-500 uppercase">عنوان الإشعار</label>
                            <input 
                                required
                                value={formData.title}
                                onChange={e => setFormData({...formData, title: e.target.value})}
                                placeholder="صيانة للنظام غداً..."
                                className="w-full bg-slate-50 p-3 rounded-xl border mt-1"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 uppercase">محتوى الإشعار</label>
                            <textarea 
                                required
                                value={formData.body}
                                onChange={e => setFormData({...formData, body: e.target.value})}
                                placeholder="اكتب تفاصيل الإشعار هنا..."
                                className="w-full bg-slate-50 p-3 rounded-xl border mt-1 h-32 resize-none"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 uppercase">أهمية الإشعار (اللون)</label>
                            <select 
                                value={formData.type}
                                onChange={e => setFormData({...formData, type: e.target.value as any})}
                                className="w-full bg-slate-50 p-3 rounded-xl border mt-1"
                            >
                                <option value="info">إشعار عادي (أزرق)</option>
                                <option value="success">تبشير/نجاح (أخضر)</option>
                                <option value="warning">تحذير/عاجل (أحمر)</option>
                            </select>
                        </div>
                        <Button type="submit" className="w-full h-12 rounded-xl" disabled={!fbUser}>
                            إرسال الآن للجميع
                        </Button>
                    </form>
                </Card>

                <div className="lg:col-span-2 space-y-4">
                    {notifications.length > 0 && fbUser && (
                        <div className="flex items-center gap-2 px-2 pb-2">
                            <button onClick={toggleSelectAll} className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 font-bold transition-colors">
                                {selectedIds.length === notifications.length ? <CheckSquare size={20} className="text-indigo-600" /> : <Square size={20} />}
                                تحديد الكل
                            </button>
                        </div>
                    )}
                    
                    {notifications.map(notif => {
                        const isSelected = selectedIds.includes(notif.id);
                        return (
                            <Card 
                                key={notif.id} 
                                className={`p-6 border-none shadow-premium bg-white border-r-4 cursor-pointer transition-all ${notif.type === 'warning' ? 'border-r-rose-500' : notif.type === 'success' ? 'border-r-emerald-500' : 'border-r-blue-500'} ${isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50/10' : ''}`}
                                onClick={() => toggleSelection(notif.id)}
                            >
                                <div className="flex gap-4 items-start">
                                    <div className="pt-1">
                                        {isSelected ? <CheckSquare size={20} className="text-indigo-600" /> : <Square size={20} className="text-slate-300" />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="text-xl font-black text-slate-800">{notif.title}</h4>
                                            <span className="text-xs text-slate-400 font-bold">{new Date(notif.sentAt).toLocaleString('ar-EG')}</span>
                                        </div>
                                        <p className="text-sm text-slate-600 font-bold leading-relaxed">{notif.body}</p>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                    {notifications.length === 0 && !loading && (
                        <div className="text-center py-20 opacity-30">
                            <Bell size={64} className="mx-auto mb-4" />
                            <h3 className="font-black text-2xl">سجل الإشعارات فارغ</h3>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminNotificationsPage;

