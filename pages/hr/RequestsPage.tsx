
import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, limit, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, where } from '../../services/localFirestore';
import { db  } from '../../services/localFirestore';
import { handleFirestoreError, OperationType } from '../../services/firestoreErrorHandler';
import { useToasts } from '../../hooks/useToasts';
import { Send, Plus, Search, Filter, Inbox, CheckCircle, Clock, XCircle, FileText, X, Trash2, Edit3, Check } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/layout/PageHeader';
import Modal from '../../components/ui/Modal';

interface HRRequest {
    id: string;
    employeeId: string;
    employeeName: string;
    type: 'Vacation' | 'Mission' | 'Loan' | 'Resignation';
    description: string;
    date: any;
    status: 'Approved' | 'Pending' | 'Rejected';
    // Vacation specific
    startDate?: string;
    endDate?: string;
    daysCount?: number;
    withDeduction?: boolean;
    deductionAmount?: number;
    // Loan specific
    amount?: number;
}

const RequestsPage: React.FC = () => {
    const { addToast } = useToasts();
    const [requests, setRequests] = useState<HRRequest[]>([]);
    const [employees, setEmployees] = useState<{id: string, name: string}[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterType, setFilterType] = useState('all');
    
    const [formData, setFormData] = useState({
        employeeId: '',
        employeeName: '',
        type: 'Vacation' as HRRequest['type'],
        description: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        withDeduction: false,
        amount: 0
    });

    useEffect(() => {
        fetchRequests();
        fetchEmployees();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'hr_requests'), orderBy('date', 'desc'), limit(100));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HRRequest));
            setRequests(data);
        } catch (error) {
            handleFirestoreError(error, OperationType.GET, 'hr_requests');
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const snapshot = await getDocs(collection(db, 'hr_personnel'));
            setEmployees(snapshot.docs.map(d => ({ id: d.id, name: d.data().name })));
        } catch (error) {
            console.error('Error fetching employees:', error);
        }
    };

    const handleAddRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.employeeId) {
            addToast('يجب اختيار الموظف', 'warning');
            return;
        }

        setSubmitting(true);
        try {
            const selectedEmp = employees.find(e => e.id === formData.employeeId);
            
            // Calculate days for vacation
            let daysCount = 0;
            let deductionAmount = 0;
            
            if (formData.type === 'Vacation') {
                const start = new Date(formData.startDate);
                const end = new Date(formData.endDate);
                daysCount = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
                
                if (formData.withDeduction) {
                    // Fetch employee to get salary
                    const empSnap = await import('../../services/localFirestore').then(f => f.getDoc(f.doc(db, 'hr_personnel', formData.employeeId)));
                    if (empSnap.exists()) {
                        const empData = empSnap.data();
                        const salary = empData.salary || 0;
                        const salaryType = empData.salaryType || 'Monthly';
                        
                        let dayRate = 0;
                        if (salaryType === 'Monthly') dayRate = salary / 30;
                        else if (salaryType === 'Weekly') dayRate = salary / 7;
                        else if (salaryType === 'Daily') dayRate = salary;
                        
                        deductionAmount = dayRate * daysCount;
                    }
                }
            }

            const payload = {
                ...formData,
                employeeName: selectedEmp?.name || '',
                daysCount,
                deductionAmount,
                updatedAt: serverTimestamp(),
            };

            if (editingId) {
                await updateDoc(doc(db, 'hr_requests', editingId), payload);
                setRequests(prev => prev.map(r => r.id === editingId ? { ...r, ...payload, date: r.date } : r));
                addToast('تم تحديث الطلب بنجاح', 'success');
            } else {
                const newPayload = { ...payload, date: serverTimestamp(), status: 'Pending' };
                const docRef = await addDoc(collection(db, 'hr_requests'), newPayload);
                setRequests(prev => [{ id: docRef.id, ...newPayload, date: { seconds: Date.now()/1000 } } as any, ...prev]);
                
                // If vacation with deduction and approved immediately (unlikely but logic for later)
                // or if it's a loan, we might want to record it.
                
                addToast('تم تقديم الطلب بنجاح', 'success');
            }
            
            setIsModalOpen(false);
            resetForm();
        } catch (error) {
            handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'hr_requests');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateStatus = async (id: string, status: HRRequest['status']) => {
        try {
            await updateDoc(doc(db, 'hr_requests', id), { status });
            setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
            addToast('تم تحديث حالة الطلب', 'success');
        } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, 'hr_requests');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'hr_requests', id));
            setRequests(prev => prev.filter(r => r.id !== id));
            addToast('تم حذف الطلب بنجاح', 'success');
        } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, 'hr_requests');
        }
    };

    const handleEdit = (req: HRRequest) => {
        setEditingId(req.id);
        setFormData({
            employeeId: req.employeeId,
            employeeName: req.employeeName,
            type: req.type,
            description: req.description,
            startDate: req.startDate || new Date().toISOString().split('T')[0],
            endDate: req.endDate || new Date().toISOString().split('T')[0],
            withDeduction: req.withDeduction || false,
            amount: req.amount || 0
        });
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({ 
            employeeId: '', 
            employeeName: '', 
            type: 'Vacation', 
            description: '',
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
            withDeduction: false,
            amount: 0
        });
    };

    const filteredRequests = requests.filter(req => {
        const matchesSearch = req.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             req.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || req.status === filterStatus;
        const matchesType = filterType === 'all' || req.type === filterType;
        return matchesSearch && matchesStatus && matchesType;
    });

    return (
        <div className="space-y-6">
            <PageHeader title="طلبات الموظفين" subtitle="متابعة طلبات الإجازات، العهد، والقروض الشخصية">
                <Button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-indigo-600 rounded-2xl h-12 px-8 font-black shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                >
                    <Send size={18} className="me-2" /> تقديم طلب جديد
                </Button>
            </PageHeader>

            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text"
                        placeholder="البحث في الطلبات..."
                        className="w-full h-12 pr-12 pl-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <select 
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="h-12 px-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none font-black text-xs cursor-pointer"
                >
                    <option value="all">كل الحالات</option>
                    <option value="Pending">معلق</option>
                    <option value="Approved">مقبول</option>
                    <option value="Rejected">مرفوض</option>
                </select>
                <select 
                    value={filterType}
                    onChange={e => setFilterType(e.target.value)}
                    className="h-12 px-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none font-black text-xs cursor-pointer"
                >
                    <option value="all">كل الأنواع</option>
                    <option value="Vacation">إجازة</option>
                    <option value="Mission">مهمة</option>
                    <option value="Loan">سلفة</option>
                    <option value="Resignation">استقالة</option>
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="p-6 border-slate-100 dark:border-slate-800 shadow-sm text-center">
                    <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <Clock size={20} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">بانتظار المراجعة</p>
                    <p className="text-xl font-black">{requests.filter(r => r.status === 'Pending').length}</p>
                </Card>
                <Card className="p-6 border-slate-100 dark:border-slate-800 shadow-sm text-center">
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <CheckCircle size={20} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">تمت الموافقة</p>
                    <p className="text-xl font-black">{requests.filter(r => r.status === 'Approved').length}</p>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {loading ? (
                    Array(4).fill(0).map((_, i) => <div key={i} className="h-40 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-3xl"></div>)
                ) : filteredRequests.length > 0 ? (
                    filteredRequests.map(req => (
                        <Card key={req.id} className="p-6 border-slate-100 dark:border-slate-800 hover:border-indigo-100 transition-all group">
                            <div className="flex items-start gap-4">
                                <div className="w-14 h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-indigo-600 flex-shrink-0">
                                    <FileText size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-black text-sm">{req.employeeName}</h4>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${
                                                req.status === 'Approved' ? 'bg-emerald-100 text-emerald-600' : 
                                                req.status === 'Rejected' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                                            }`}>
                                                {req.status === 'Approved' ? 'مقبول' : req.status === 'Rejected' ? 'مرفوض' : 'معلق'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <p className="text-xs font-bold text-indigo-600">{req.type}</p>
                                        <span className="text-[10px] text-slate-400 font-bold">
                                            {req.date?.seconds ? new Date(req.date.seconds * 1000).toLocaleDateString('ar-SA') : '...'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 line-clamp-2 mb-2">{req.description}</p>
                                    
                                    {(req.type === 'Vacation' && req.startDate) && (
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            <div className="bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg text-[10px] font-bold text-blue-600">
                                                من: {req.startDate}
                                            </div>
                                            <div className="bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg text-[10px] font-bold text-blue-600">
                                                إلى: {req.endDate}
                                            </div>
                                            <div className="bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-lg text-[10px] font-bold text-indigo-600">
                                                المدة: {req.daysCount} أيام
                                            </div>
                                            {req.deductionAmount && req.deductionAmount > 0 && (
                                                <div className="bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded-lg text-[10px] font-bold text-rose-600">
                                                    خصم: {Math.round(req.deductionAmount).toLocaleString()} ر.س
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {req.type === 'Loan' && (
                                        <div className="bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg text-xs font-black text-amber-600 mb-4 inline-block">
                                            المبلغ: {(req.amount || 0).toLocaleString()} ر.س
                                        </div>
                                    )}
                                    
                                    <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800">
                                        <div className="flex gap-2">
                                            {req.status === 'Pending' && (
                                                <>
                                                    <Button 
                                                        variant="ghost"
                                                        onClick={() => handleUpdateStatus(req.id, 'Approved')}
                                                        className="h-8 px-3 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black hover:bg-emerald-100"
                                                    >
                                                        موافقة
                                                    </Button>
                                                    <Button 
                                                        variant="ghost"
                                                        onClick={() => handleUpdateStatus(req.id, 'Rejected')}
                                                        className="h-8 px-3 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black hover:bg-rose-100"
                                                    >
                                                        رفض
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" onClick={() => handleEdit(req)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg"><Edit3 size={16} /></Button>
                                            <Button variant="ghost" onClick={() => handleDelete(req.id)} className="p-2 text-slate-400 hover:text-rose-500 rounded-lg"><Trash2 size={16} /></Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center opacity-30">
                        <Inbox size={64} className="mx-auto mb-4" />
                        <p className="font-black text-lg text-slate-800 dark:text-white">لا توجد طلبات تطابق بحثك</p>
                    </div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm(); }} title={editingId ? "تعديل الطلب" : "تقديم طلب جديد"}>
                <form onSubmit={handleAddRequest} className="space-y-4 p-4">
                    <div>
                        <label className="block text-xs font-black text-slate-500 mb-1">الموظف</label>
                        <select 
                            required
                            className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                            value={formData.employeeId}
                            onChange={e => setFormData({...formData, employeeId: e.target.value})}
                        >
                            <option value="">اختر الموظف</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-500 mb-1">نوع الطلب</label>
                        <select 
                            className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={formData.type}
                            onChange={e => setFormData({...formData, type: e.target.value as any})}
                        >
                            <option value="Vacation">إجازة</option>
                            <option value="Mission">انتداب / مهمة عمل</option>
                            <option value="Loan">سلفة / قرض</option>
                            <option value="Resignation">استقالة</option>
                        </select>
                    </div>

                    {formData.type === 'Vacation' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-black text-slate-500 mb-1">تاريخ البدء</label>
                                <input 
                                    type="date"
                                    className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold outline-none"
                                    value={formData.startDate}
                                    onChange={e => setFormData({...formData, startDate: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-500 mb-1">تاريخ الانتهاء</label>
                                <input 
                                    type="date"
                                    className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold outline-none"
                                    value={formData.endDate}
                                    onChange={e => setFormData({...formData, endDate: e.target.value})}
                                />
                            </div>
                            <div className="col-span-2 flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                <input 
                                    type="checkbox"
                                    id="withDeduction"
                                    checked={formData.withDeduction}
                                    onChange={e => setFormData({...formData, withDeduction: e.target.checked})}
                                    className="w-4 h-4 text-indigo-600 rounded"
                                />
                                <label htmlFor="withDeduction" className="text-xs font-black text-slate-700 dark:text-slate-200">خصم من الراتب (حسب المدة)</label>
                            </div>
                        </div>
                    )}

                    {formData.type === 'Loan' && (
                        <div>
                            <label className="block text-xs font-black text-slate-500 mb-1">مبلغ السلفة / القرض</label>
                            <input 
                                type="number"
                                className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-sm font-bold outline-none text-left"
                                value={formData.amount}
                                onChange={e => setFormData({...formData, amount: Number(e.target.value)})}
                                placeholder="0.00"
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-black text-slate-500 mb-1">سبب الطلب / التفاصيل</label>
                        <textarea 
                            required
                            className="w-full h-32 bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                            placeholder="اكتب تفاصيل طلبك هنا..."
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                        />
                    </div>
                    <div className="pt-4 flex gap-3">
                        <Button 
                            type="submit" 
                            className="flex-1 bg-indigo-600 h-12 rounded-xl font-black shadow-lg shadow-indigo-500/20"
                            disabled={submitting}
                        >
                            {submitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
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

export default RequestsPage;

