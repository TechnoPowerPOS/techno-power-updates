
import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, limit, addDoc, serverTimestamp, writeBatch, increment } from '../../services/localFirestore';
import { db  } from '../../services/localFirestore';
import { handleFirestoreError, OperationType } from '../../services/firestoreErrorHandler';
import { useToasts } from '../../hooks/useToasts';
import { CreditCard, Plus, Search, Filter, Database, Calendar, User, DollarSign, ShieldAlert, Trash2, Edit3, Check as CheckIcon } from 'lucide-react';
import { doc, deleteDoc, updateDoc } from '../../services/localFirestore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/layout/PageHeader';
import { formatCurrency } from '../../utils/localization';

import Modal from '../../components/ui/Modal';

interface CommercialCheck {
    id: string;
    checkNumber: string;
    beneficiary: string;
    amount: number;
    dueDate: any;
    bank: string;
    status: 'Issued' | 'Cashed' | 'Bounced' | 'Canceled';
}

interface ChecksPageProps {
    hideHeader?: boolean;
}

const ChecksPage: React.FC<ChecksPageProps> = ({ hideHeader = false }) => {
    const { addToast } = useToasts();
    const [checks, setChecks] = useState<CommercialCheck[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [editingCheck, setEditingCheck] = useState<CommercialCheck | null>(null);
    
    // Cashing logic states
    const [cashingCheck, setCashingCheck] = useState<CommercialCheck | null>(null);
    const [isCashingModalOpen, setIsCashingModalOpen] = useState(false);
    const [treasuries, setTreasuries] = useState<any[]>([]);
    const [selectedTreasury, setSelectedTreasury] = useState('');
    const [addToTreasury, setAddToTreasury] = useState(false);

    const [formData, setFormData] = useState({
        checkNumber: '',
        beneficiary: '',
        amount: 0,
        dueDate: '',
        bank: '',
        status: 'Issued' as const
    });

    useEffect(() => {
        fetchChecks();
        fetchTreasuries();
    }, []);

    const fetchTreasuries = async () => {
        try {
            const snap = await getDocs(query(collection(db, 'treasuries')));
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTreasuries(data);
            if (data.length > 0) {
                const defaultTr = data.find(t => t.isDefault);
                setSelectedTreasury(defaultTr ? defaultTr.id : data[0].id);
            }
        } catch (e) {
            console.error('Failed to fetch treasuries', e);
        }
    };

    const fetchChecks = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'acc_checks'), orderBy('dueDate', 'asc'), limit(50));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommercialCheck));
            setChecks(data);
        } catch (error) {
            handleFirestoreError(error, OperationType.GET, 'acc_checks');
        } finally {
            setLoading(false);
        }
    };

    const handleAddCheck = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await addDoc(collection(db, 'acc_checks'), {
                ...formData,
                dueDate: new Date(formData.dueDate)
            });

            if (formData.dueDate) {
               await addDoc(collection(db, 'global_notifications'), {
                   title: 'تذكير: استحقاق شيك',
                   body: `تم إصدار شيك رقم ${formData.checkNumber} بقيمة ${formData.amount} وموعد استحقاقه في ${formData.dueDate}.`,
                   type: 'info',
                   sentAt: new Date().toISOString()
               });
            }

            addToast('تم إصدار الشيك بنجاح', 'success');
            setIsModalOpen(false);
            setFormData({ checkNumber: '', beneficiary: '', amount: 0, dueDate: '', bank: '', status: 'Issued' });
            fetchChecks();
        } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'acc_checks');
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirmCash = async () => {
        if (!cashingCheck) return;
        setSubmitting(true);
        try {
            const batch = writeBatch();
            
            batch.update(doc(db, 'acc_checks', cashingCheck.id), { status: 'Cashed' });

            if (addToTreasury && selectedTreasury) {
                batch.update(doc(db, 'treasuries', selectedTreasury), {
                    balance: increment(Number(cashingCheck.amount))
                });
                
                const trRef = doc(collection(db, 'transactions'));
                batch.set(trRef, {
                    treasuryId: selectedTreasury,
                    type: 'income',
                    amount: Number(cashingCheck.amount),
                    category: 'تحصيل شيكات',
                    description: `تحصيل شيك رقم ${cashingCheck.checkNumber} من ${cashingCheck.beneficiary}`,
                    date: new Date().toISOString()
                });
            }

            await batch.commit();
            addToast('تم تحصيل الشيك بنجاح', 'success');
            fetchChecks();
            setIsCashingModalOpen(false);
            setCashingCheck(null);
            setAddToTreasury(false);
        } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, 'acc_checks_cashing');
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusChange = async (checkId: string, newStatus: 'Issued' | 'Cashed' | 'Bounced' | 'Canceled') => {
        if (newStatus === 'Cashed') {
            const chk = checks.find(c => c.id === checkId);
            if (chk) {
                setCashingCheck(chk);
                setIsCashingModalOpen(true);
                return;
            }
        }
        
        try {
            await updateDoc(doc(db, 'acc_checks', checkId), { status: newStatus });
            addToast('تم تحديث حالة الشيك بنجاح', 'success');
            fetchChecks();
        } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, 'acc_checks');
        }
    };

    const handleDelete = async (checkId: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا الشيك؟')) return;
        try {
            await deleteDoc(doc(db, 'acc_checks', checkId));
            addToast('تم حذف الشيك بنجاح', 'success');
            fetchChecks();
        } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, 'acc_checks');
        }
    };

    const filteredChecks = checks.filter(c => {
        const matchesSearch = 
            (c.checkNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
            (c.beneficiary || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.bank || '').toLowerCase().includes(searchQuery.toLowerCase());
            
        const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
        
        return matchesSearch && matchesStatus;
    });

    const underCollectionCount = checks.filter(c => c.status === 'Issued').length;
    const delayedCount = checks.filter(c => {
        if (c.status !== 'Issued') return false;
        if (!c.dueDate) return false;
        let d = c.dueDate as any;
        if (d.seconds) { d = new Date(d.seconds * 1000); }
        else { d = new Date(d); }
        return d < new Date();
    }).length;

    return (
        <div className="space-y-6">
            {!hideHeader && (
                <PageHeader title="إدارة الشيكات" subtitle="تتبع الشيكات الصادرة والواردة، مواعيد الاستحقاق، والحالة البنكية">
                    <Button 
                        onClick={() => setIsModalOpen(true)}
                        className="bg-indigo-600 rounded-2xl h-12 px-8 font-black shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                    >
                        <Plus size={18} className="me-2" /> إصدار شيك جديد
                    </Button>
                </PageHeader>
            )}

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="بحث برقم الشيك أو المستفيد أو البنك..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-12 bg-white dark:bg-slate-800 border-none rounded-2xl pe-12 ps-4 font-bold shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
                <Button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-indigo-600 rounded-2xl h-12 px-8 font-black shadow-lg shadow-indigo-500/20 active:scale-95 transition-all w-full sm:w-auto text-white flex items-center justify-center"
                >
                    <Plus size={18} className="me-2" /> إصدار شيك جديد
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6 bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-800/30">
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">شيكات تحت التحصيل</p>
                    <p className="text-2xl font-black text-indigo-700 dark:text-indigo-400">{underCollectionCount}</p>
                </Card>
                <Card className="p-6 bg-rose-50/50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-800/30">
                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">شيكات متأخرة</p>
                    <p className="text-2xl font-black text-rose-700 dark:text-rose-400">{delayedCount}</p>
                </Card>
            </div>

            <Card className="overflow-hidden border border-slate-100 dark:border-slate-800">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900 font-black">
                    <h3>جدول الشيكات المستحقة</h3>
                    <div className="flex gap-2">
                        <select 
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 h-10 px-4 rounded-xl text-xs font-bold outline-none"
                        >
                            <option value="all">كل الحالات</option>
                            <option value="Issued">تحت التحصيل</option>
                            <option value="Cashed">تم الصرف</option>
                            <option value="Bounced">مرتجع</option>
                            <option value="Canceled">ملغى</option>
                        </select>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                                <th className="px-6 py-4">رقم الشيك</th>
                                <th className="px-6 py-4">المستفيد</th>
                                <th className="px-6 py-4">البنك</th>
                                <th className="px-6 py-4">تاريخ الاستحقاق</th>
                                <th className="px-6 py-4">المبلغ</th>
                                <th className="px-6 py-4 text-center">الحالة</th>
                                <th className="px-6 py-4 text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => <tr key={i}><td colSpan={7} className="p-4"><div className="h-4 bg-slate-100 dark:bg-slate-800 animate-pulse rounded"></div></td></tr>)
                            ) : filteredChecks.length > 0 ? (
                                filteredChecks.map(check => (
                                    <tr key={check.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                                        <td className="px-6 py-4 font-mono font-black">{check.checkNumber}</td>
                                        <td className="px-6 py-4 font-bold">{check.beneficiary}</td>
                                        <td className="px-6 py-4 font-bold text-slate-500">{check.bank}</td>
                                        <td className="px-6 py-4 font-bold text-slate-500">{new Date(check.dueDate?.seconds * 1000).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 font-black text-indigo-600">{formatCurrency(check.amount)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <select 
                                                value={check.status}
                                                onChange={(e) => handleStatusChange(check.id, e.target.value as any)}
                                                className={`px-2 py-1 rounded-lg text-[10px] font-black appearance-none outline-none cursor-pointer ${
                                                    check.status === 'Cashed' ? 'bg-emerald-100 text-emerald-600' : 
                                                    check.status === 'Bounced' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                                                }`}
                                            >
                                                <option value="Issued">تحت التحصيل</option>
                                                <option value="Cashed">تم الصرف</option>
                                                <option value="Bounced">مرتجع</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button onClick={() => handleDelete(check.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all" title="حذف الشيك">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center text-slate-400">
                                        <CreditCard size={48} className="mx-auto mb-4 opacity-20" />
                                        <p className="font-black">لا توجد شيكات مستحقة حالياً</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="إصدار شيك جديد">
                <form onSubmit={handleAddCheck} className="space-y-4 p-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black text-slate-500 mb-1">رقم الشيك</label>
                            <input 
                                required
                                type="text" 
                                className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="000000"
                                value={formData.checkNumber}
                                onChange={e => setFormData({...formData, checkNumber: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-500 mb-1">البنك</label>
                            <input 
                                required
                                type="text" 
                                className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="اسم البنك"
                                value={formData.bank}
                                onChange={e => setFormData({...formData, bank: e.target.value})}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-500 mb-1">المستفيد</label>
                        <input 
                            required
                            type="text" 
                            className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="اسم الجهة المستفيدة"
                            value={formData.beneficiary}
                            onChange={e => setFormData({...formData, beneficiary: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black text-slate-500 mb-1">المبلغ</label>
                            <input 
                                required
                                type="number" 
                                className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="0.00"
                                value={formData.amount}
                                onChange={e => setFormData({...formData, amount: Number(e.target.value)})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-500 mb-1">تاريخ الاستحقاق</label>
                            <input 
                                required
                                type="date" 
                                className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={formData.dueDate}
                                onChange={e => setFormData({...formData, dueDate: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className="pt-4 flex gap-3">
                        <Button 
                            type="submit" 
                            className="flex-1 bg-indigo-600 h-12 rounded-xl font-black shadow-lg shadow-indigo-500/20"
                            disabled={submitting}
                        >
                            {submitting ? 'جاري الحفظ...' : 'حفظ الشيك'}
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

            {/* Cashing Modal */}
            <Modal isOpen={isCashingModalOpen} onClose={() => setIsCashingModalOpen(false)} title="تحصيل شيك">
                <div className="space-y-6">
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                        جاري تحصيل شيك رقم <span className="text-indigo-600 dark:text-indigo-400 select-all font-black">{cashingCheck?.checkNumber}</span> بقيمة <span className="font-black text-rose-500">{formatCurrency(cashingCheck?.amount || 0)}</span>.
                    </p>
                    
                    <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-all">
                        <input 
                            type="checkbox" 
                            checked={addToTreasury}
                            onChange={(e) => setAddToTreasury(e.target.checked)}
                            className="w-5 h-5 rounded text-indigo-600"
                        />
                        <span className="font-bold text-slate-700 dark:text-slate-200">إضافة القيمة مباشرة إلى الخزينة</span>
                    </label>

                    {addToTreasury && (
                        <div className="space-y-2 animate-fadeIn">
                            <label className="block text-xs font-black text-slate-500">اختر الخزينة</label>
                            <select 
                                value={selectedTreasury}
                                onChange={e => setSelectedTreasury(e.target.value)}
                                className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                {treasuries.map(t => (
                                    <option key={t.id} value={t.id}>{t.name} ({formatCurrency(t.balance)})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="pt-4 flex gap-3">
                        <Button 
                            onClick={handleConfirmCash} 
                            className="flex-1 bg-green-600 hover:bg-green-700 h-12 rounded-xl font-black shadow-lg shadow-green-500/20"
                            disabled={submitting}
                        >
                            {submitting ? 'جاري التحصيل...' : 'تأكيد التحصيل'}
                        </Button>
                        <Button 
                            type="button"
                            variant="outline" 
                            className="h-12 px-6 rounded-xl font-black"
                            onClick={() => setIsCashingModalOpen(false)}
                        >
                            إلغاء
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ChecksPage;
