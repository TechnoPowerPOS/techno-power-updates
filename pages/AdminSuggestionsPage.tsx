import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, deleteDoc, doc, writeBatch, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { handleFirestoreError, OperationType } from '../services/firestoreErrorHandler';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { MessageSquare, ArrowLeft, Trash2, RefreshCw, CheckSquare, Reply, X, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToasts } from '../hooks/useToasts';
import Modal from '../components/ui/Modal';

interface Suggestion {
    id: string;
    userId: string;
    phone: string;
    suggestionText: string;
    createdAt: string;
    status?: 'pending' | 'accepted' | 'rejected';
    replyText?: string;
    repliedAt?: string;
}

const AdminSuggestionsPage: React.FC = () => {
    const navigate = useNavigate();
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const { addToast } = useToasts();

    const [replyModalOpen, setReplyModalOpen] = useState(false);
    const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
    const [replyText, setReplyText] = useState('');
    const [replyStatus, setReplyStatus] = useState<'accepted' | 'rejected'>('accepted');
    const [submittingReply, setSubmittingReply] = useState(false);

    const loadSuggestions = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'app_suggestions'), orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Suggestion));
            setSuggestions(data);
        } catch (e) {
            handleFirestoreError(e, OperationType.GET, 'app_suggestions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSuggestions();
    }, []);

    const toggleSelectAll = () => {
        if (selectedIds.size === suggestions.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(suggestions.map(s => s.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`هل أنت متأكد من حذف ${selectedIds.size} اقتراح؟`)) return;

        try {
            setLoading(true);
            const batch = writeBatch(db);
            selectedIds.forEach(id => {
                const ref = doc(db, 'app_suggestions', id);
                batch.delete(ref);
            });
            await batch.commit();
            addToast('تم حذف الاقتراحات بنجاح', 'success');
            setSelectedIds(new Set());
            await loadSuggestions();
        } catch (e) {
            handleFirestoreError(e, OperationType.DELETE, 'app_suggestions_batch');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSingle = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا الاقتراح؟')) return;
        try {
            await deleteDoc(doc(db, 'app_suggestions', id));
            addToast('تم حذف الاقتراح بنجاح', 'success');
            await loadSuggestions();
        } catch (e) {
            handleFirestoreError(e, OperationType.DELETE, `app_suggestions/${id}`);
        }
    };

    const handleOpenReply = (s: Suggestion) => {
        setSelectedSuggestion(s);
        setReplyText(s.replyText || '');
        setReplyStatus(s.status === 'rejected' ? 'rejected' : 'accepted');
        setReplyModalOpen(true);
    };

    const handleSubmitReply = async () => {
        if (!selectedSuggestion) return;
        setSubmittingReply(true);

        try {
            const replyData = {
                status: replyStatus,
                replyText,
                repliedAt: new Date().toISOString()
            };

            const suggestionId = selectedSuggestion.id;
            await updateDoc(doc(db, 'app_suggestions', suggestionId), replyData);

            // Send notification to user
            await addDoc(collection(db, 'device_notifications'), {
                targetId: selectedSuggestion.userId,
                title: replyStatus === 'accepted' ? 'تم قبول اقتراحك!' : 'رد على اقتراحك',
                body: replyStatus === 'accepted' 
                    ? `شكرًا لك! الأدارة وافقت على اقتراحك وتقول: "${replyText}"` 
                    : `مرحبًا، بالنسبة لاقتراحك: "${replyText}"`,
                type: replyStatus === 'accepted' ? 'SYSTEM_ALERT' : 'INFO',
                sentAt: new Date().toISOString(),
                isRead: false
            });

            addToast('تم إرسال الرد بنجاح', 'success');
            setReplyModalOpen(false);
            await loadSuggestions();
        } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, 'reply_suggestion');
        } finally {
            setSubmittingReply(false);
        }
    };

    return (
        <div className="space-y-6 dir-rtl pb-10 animate-fadeIn bg-slate-50 min-h-screen">
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl border shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => navigate('/admin-tool')} className="rounded-full w-10 h-10 p-0 text-slate-400">
                        <ArrowLeft />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 flex items-center gap-2">
                            <MessageSquare className="text-indigo-600" />
                            اقتراحات المستخدمين
                        </h1>
                        <p className="text-slate-500 font-bold">عرض وإدارة الاقتراحات المرسلة من قبل المستخدمين</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {selectedIds.size > 0 && (
                        <Button onClick={handleDeleteSelected} className="rounded-2xl h-12 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 font-bold">
                            <Trash2 size={20} className="ml-2" />
                            حذف المحدد ({selectedIds.size})
                        </Button>
                    )}
                    <Button onClick={loadSuggestions} variant="outline" className="rounded-2xl h-12 w-12 p-0">
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </Button>
                </div>
            </div>

            <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <input 
                            type="checkbox" 
                            checked={suggestions.length > 0 && selectedIds.size === suggestions.length}
                            onChange={toggleSelectAll}
                            className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-bold text-slate-600">تحديد الكل</span>
                    </div>
                    <div className="text-sm font-bold text-slate-500">
                        إجمالي الاقتراحات: {suggestions.length}
                    </div>
                </div>

                {suggestions.length === 0 && !loading ? (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                            <MessageSquare size={40} />
                        </div>
                        <h3 className="text-xl font-black text-slate-800">لا يوجد اقتراحات</h3>
                        <p className="text-slate-500 font-bold">لم يقم أحد بإرسال اقتراحات بعد</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {suggestions.map(s => (
                            <div key={s.id} className="p-6 flex gap-4 hover:bg-slate-50 transition-colors group">
                                <div className="mt-1">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedIds.has(s.id)}
                                        onChange={() => toggleSelect(s.id)}
                                        className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
                                    />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="font-bold text-slate-800 text-sm">
                                                معرف المستخدم: <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">{s.userId}</span>
                                            </div>
                                            <div className="font-bold text-slate-800 text-sm">
                                                الهاتف: <span className="font-mono text-xs bg-indigo-50 px-2 py-0.5 rounded text-indigo-600">{s.phone}</span>
                                            </div>
                                            {s.status === 'accepted' && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-bold flex items-center gap-1"><CheckCircle size={12} /> مقبول</span>}
                                            {s.status === 'rejected' && <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-xs rounded-full font-bold flex items-center gap-1"><XCircle size={12} /> مرفوض</span>}
                                        </div>
                                        <div className="text-xs text-slate-400 font-bold flex items-center gap-2">
                                            <span>{new Date(s.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                            <button 
                                                onClick={() => handleOpenReply(s)}
                                                className="text-indigo-400 hover:text-indigo-600 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="الرد على الاقتراح"
                                            >
                                                <Reply size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteSingle(s.id)}
                                                className="text-slate-300 hover:text-rose-500 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="حذف الاقتراح"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                                        {s.suggestionText}
                                    </div>
                                    {s.replyText && (
                                        <div className={`mt-3 p-4 rounded-xl text-sm ${s.status === 'accepted' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-rose-50 text-rose-800 border border-rose-100'}`}>
                                            <div className="font-bold mb-1 flex items-center gap-2">
                                                <Reply size={14} /> 
                                                رد الإدارة ({s.status === 'accepted' ? 'قبول' : 'رفض'}):
                                            </div>
                                            {s.replyText}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Modal isOpen={replyModalOpen} onClose={() => setReplyModalOpen(false)} title="الرد على الاقتراح">
                {selectedSuggestion && (
                    <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-600 italic">
                            "{selectedSuggestion.suggestionText}"
                        </div>
                        
                        <div className="flex gap-4">
                            <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${replyStatus === 'accepted' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                <input type="radio" className="hidden" checked={replyStatus === 'accepted'} onChange={() => setReplyStatus('accepted')} />
                                <CheckCircle size={18} /> قبول الاقتراح
                            </label>
                            <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${replyStatus === 'rejected' ? 'border-rose-500 bg-rose-50 text-rose-700 font-bold' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                <input type="radio" className="hidden" checked={replyStatus === 'rejected'} onChange={() => setReplyStatus('rejected')} />
                                <XCircle size={18} /> رفض الاقتراح
                            </label>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">رسالة الرد للمستخدم (ستصله كإشعار)</label>
                            <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none h-32"
                                placeholder="اكتب ردك هنا..."
                            ></textarea>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setReplyModalOpen(false)}>
                                إلغاء
                            </Button>
                            <Button onClick={handleSubmitReply} isLoading={submittingReply}>
                                إرسال الرد
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

        </div>
    );
};

export default AdminSuggestionsPage;
