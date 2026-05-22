import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, addDoc, updateDoc, doc, serverTimestamp, getDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { handleFirestoreError, OperationType } from '../services/firestoreErrorHandler';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { UploadCloud, CheckCircle, Smartphone, AlertTriangle, Download, Trash2, CheckSquare, Square } from 'lucide-react';
import { useToasts } from '../hooks/useToasts';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

interface SystemUpdate {
    id: string;
    version: string;
    releaseNotes: string;
    releaseDate: string;
    isForced: boolean;
    status: 'draft' | 'published';
    downloadUrl: string;
}

const AdminUpdatesPage: React.FC = () => {
    const [updates, setUpdates] = useState<SystemUpdate[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const { addToast } = useToasts();
    
    const [formData, setFormData] = useState({
        version: '',
        releaseNotes: '',
        isForced: false,
        downloadUrl: ''
    });

    const [fbUser, setFbUser] = useState(auth.currentUser);

    const load = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'system_updates'), orderBy('releaseDate', 'desc'));
            const snap = await getDocs(q);
            setUpdates(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SystemUpdate)));
        } catch (e) {
            handleFirestoreError(e, OperationType.GET, 'system_updates');
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

    const handlePublish = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!fbUser) return handleFbLogin();
        
        try {
            await addDoc(collection(db, 'system_updates'), {
                ...formData,
                downloadUrl: formData.downloadUrl || '#',
                releaseDate: new Date().toISOString(),
                status: 'published'
            });
            addToast('تم نشر التحديث بنجاح', 'success');
            setFormData({ version: '', releaseNotes: '', isForced: false, downloadUrl: '' });
            load();
        } catch(e) {
            handleFirestoreError(e, OperationType.WRITE, 'system_updates');
        }
    };

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === updates.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(updates.map(u => u.id));
        }
    };

    const handleDeleteSelected = async () => {
        if (!selectedIds.length) return;
        if (!confirm('هل أنت متأكد من حذف التحديثات المحددة؟، لن تظهر مرة أخرى في أجهزة المستخدمين.')) return;
        
        try {
            for (const id of selectedIds) {
                await deleteDoc(doc(db, 'system_updates', id));
            }
            addToast('تم الحذف بنجاح', 'success');
            setSelectedIds([]);
            load();
        } catch (e) {
            handleFirestoreError(e, OperationType.DELETE, 'system_updates_batch');
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn pb-10">
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-6 rounded-3xl border shadow-sm gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-2">
                        <UploadCloud className="text-indigo-600" />
                        نظام التحديثات
                    </h1>
                    <p className="text-slate-500 font-bold mb-2">إصدار التحديثات ودفعها لتطبيق العميل</p>
                </div>
                {!fbUser && <Button onClick={handleFbLogin}>دخول Google للطرح</Button>}
                
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
                        <Smartphone size={20} />
                        إصدار جديد
                    </h3>
                    <form onSubmit={handlePublish} className="space-y-4 font-bold">
                        <div>
                            <label className="text-xs text-slate-500 uppercase">رقم الإصدار (Version)</label>
                            <input 
                                required
                                value={formData.version}
                                onChange={e => setFormData({...formData, version: e.target.value})}
                                placeholder="v2.1.0"
                                className="w-full bg-slate-50 p-3 rounded-xl border mt-1"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 uppercase">رابط التحميل (مثال: Google Drive)</label>
                            <input 
                                required
                                type="url"
                                value={formData.downloadUrl}
                                onChange={e => setFormData({...formData, downloadUrl: e.target.value})}
                                placeholder="https://..."
                                className="w-full bg-slate-50 p-3 rounded-xl border mt-1 text-left"
                                dir="ltr"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 uppercase">ملاحظات الإصدار</label>
                            <textarea 
                                required
                                value={formData.releaseNotes}
                                onChange={e => setFormData({...formData, releaseNotes: e.target.value})}
                                placeholder="ما الجديد في هذا التحديث؟"
                                className="w-full bg-slate-50 p-3 rounded-xl border mt-1 h-32 resize-none"
                            />
                        </div>
                        <label className="flex items-center gap-2 p-4 border rounded-xl bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                            <input 
                                type="checkbox"
                                checked={formData.isForced}
                                onChange={e => setFormData({...formData, isForced: e.target.checked})}
                                className="w-4 h-4 text-indigo-600 rounded border-slate-300" 
                            />
                            <div className="flex flex-col">
                                <span className="text-sm font-black text-rose-600 flex items-center gap-1"><AlertTriangle size={14}/> تحديث إجباري (Forced)</span>
                                <span className="text-[10px] text-slate-500">منع المستخدم من استخدام النظام دون التحديث</span>
                            </div>
                        </label>
                        <Button type="submit" className="w-full h-12 rounded-xl" disabled={!fbUser}>
                            طرح الإصدار الآن
                        </Button>
                    </form>
                </Card>

                <div className="lg:col-span-2 space-y-4">
                    {updates.length > 0 && fbUser && (
                        <div className="flex items-center gap-2 px-2 pb-2">
                            <button onClick={toggleSelectAll} className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 font-bold transition-colors">
                                {selectedIds.length === updates.length ? <CheckSquare size={20} className="text-indigo-600" /> : <Square size={20} />}
                                تحديد الكل
                            </button>
                        </div>
                    )}
                    
                    {updates.map(update => {
                        const isSelected = selectedIds.includes(update.id);
                        return (
                        <Card 
                            key={update.id} 
                            className={`p-6 border-none shadow-premium bg-white cursor-pointer transition-all ${isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50/10' : ''}`}
                            onClick={() => toggleSelection(update.id)}
                        >
                            <div className="flex gap-4 items-start">
                                <div className="pt-2">
                                    {isSelected ? <CheckSquare size={20} className="text-indigo-600" /> : <Square size={20} className="text-slate-300" />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-2">
                                        <div>
                                            <h4 className="text-2xl font-black text-slate-800 font-mono tracking-widest">{update.version}</h4>
                                            <p className="text-xs text-slate-400 font-bold mt-1">تاريخ الطرح: {new Date(update.releaseDate).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            {update.isForced && <span className="px-3 py-1 bg-rose-100 text-rose-700 text-[10px] font-black rounded-full uppercase shrink-0">إجباري</span>}
                                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full uppercase shrink-0">طرح نشط</span>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-wrap text-sm text-slate-600 font-bold leading-relaxed">
                                        {update.releaseNotes}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )})}
                    {updates.length === 0 && !loading && (
                        <div className="text-center py-20 opacity-30">
                            <Download size={64} className="mx-auto mb-4" />
                            <h3 className="font-black text-2xl">لا يوجد تحديثات سابقة</h3>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminUpdatesPage;
