
import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, orderBy } from '../../services/localFirestore';
import { db  } from '../../services/localFirestore';
import { handleFirestoreError, OperationType } from '../../services/firestoreErrorHandler';
import { useToasts } from '../../hooks/useToasts';
import { Users, Plus, Search, Filter, Mail, Phone, Calendar, Trash2, Edit3, UserPlus, Fingerprint } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/layout/PageHeader';
import Modal from '../../components/ui/Modal';
import { usePlan } from '../../hooks/usePlan';
import { toArabicIndic } from '../../utils/localization';

interface EmployeeRecord {
    id: string;
    name: string;
    email: string;
    phone: string;
    position: string;
    department: string;
    joinDate: any;
    status: 'Active' | 'On Leave' | 'Terminated' | 'Inactive';
    salary: number;
    salaryType: 'Monthly' | 'Weekly' | 'Daily' | 'Yearly' | 'Semiannual';
    payday: number;
    startDate: string;
    shift: string;
    commissionPercentage: number;
    maxDiscountLimit: number;
    maxAdvance?: number;
    contractType: 'Term' | 'Permanent' | 'Project Based';
    contractEndDate?: string;
    fingerprintId?: string;
}

const PersonnelPage: React.FC = () => {
    const { addToast } = useToasts();
    const { limits } = usePlan();
    const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [profileLoading, setProfileLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRecord | null>(null);
    const [employeeStats, setEmployeeStats] = useState({
        totalPaid: 0,
        totalLoans: 0,
        remainingLoan: 0,
        vacationDays: 0
    });
    const [viewingProfile, setViewingProfile] = useState(false);
    const [enrollingFingerprint, setEnrollingFingerprint] = useState(false);
    
    // New employee state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        position: '',
        department: '',
        status: 'Active' as EmployeeRecord['status'],
        salary: 0,
        salaryType: 'Monthly' as EmployeeRecord['salaryType'],
        payday: 1,
        startDate: new Date().toISOString().split('T')[0],
        shift: 'صباحي' as 'صباحي' | 'مسائي' | 'دوام كامل',
        commissionPercentage: 0,
        maxDiscountLimit: 0,
        maxAdvance: 0,
        contractType: 'Permanent' as EmployeeRecord['contractType'],
        contractEndDate: '',
        fingerprintId: ''
    });

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'hr_personnel'), orderBy('name', 'asc'));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmployeeRecord));
            setEmployees(data);
        } catch (error) {
            handleFirestoreError(error, OperationType.GET, 'hr_personnel');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (emp: EmployeeRecord) => {
        setEditingId(emp.id);
        setFormData({
            name: emp.name,
            email: emp.email || '',
            phone: emp.phone || '',
            position: emp.position,
            department: emp.department,
            status: emp.status,
            salary: emp.salary,
            salaryType: emp.salaryType || 'Monthly',
            payday: emp.payday || 1,
            startDate: emp.startDate || (emp.joinDate ? new Date(emp.joinDate.seconds * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
            shift: (emp.shift as any) || 'صباحي',
            commissionPercentage: emp.commissionPercentage || 0,
            maxDiscountLimit: emp.maxDiscountLimit || 0,
            maxAdvance: emp.maxAdvance || 0,
            contractType: emp.contractType || 'Permanent',
            contractEndDate: emp.contractEndDate || '',
            fingerprintId: emp.fingerprintId || ''
        });
        setIsModalOpen(true);
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingId && employees.length >= limits.maxEmployees) {
            addToast(`لقد وصلت للحد الأقصى لعدد الموظفين في باقتك (${toArabicIndic(limits.maxEmployees.toString())})`, 'error');
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                ...formData,
                updatedAt: serverTimestamp(),
            };
            
            if (editingId) {
                await updateDoc(doc(db, 'hr_personnel', editingId), payload);
                setEmployees(prev => prev.map(emp => emp.id === editingId ? { ...emp, ...payload } : emp));
                addToast('تم تحديث بيانات الموظف بنجاح', 'success');
            } else {
                const newPayload = {
                    ...payload,
                    joinDate: serverTimestamp(),
                };
                const docRef = await addDoc(collection(db, 'hr_personnel'), newPayload);
                setEmployees(prev => [...prev, { id: docRef.id, ...newPayload, joinDate: new Date() as any } as any]);
                addToast('تم إضافة الموظف بنجاح', 'success');
            }

            setIsModalOpen(false);
            resetForm();
        } catch (error) {
            handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'hr_personnel');
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({
            name: '', email: '', phone: '', position: '', department: '', status: 'Active', 
            salary: 0, salaryType: 'Monthly', payday: 1, startDate: new Date().toISOString().split('T')[0],
            shift: 'صباحي', commissionPercentage: 0, maxDiscountLimit: 0, maxAdvance: 0, contractType: 'Permanent', contractEndDate: '',
            fingerprintId: ''
        });
    };

    const handleEnrollFingerprint = () => {
        setEnrollingFingerprint(true);
        addToast('يرجى لمس القارئ أو تفعيل المحاكاة للتسجيل الآمن', 'info');
    };

    const simulateCompleteBiometricScan = () => {
        const fpId = 'FP-' + Math.random().toString(36).substr(2, 9).toUpperCase() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
        setFormData(prev => ({
            ...prev,
            fingerprintId: fpId
        }));
        setEnrollingFingerprint(false);
        addToast('تمت قراءة البصمة الحيوية الفريدة بنجاح وحفظ الـ Hash التشفيري الآمن!', 'success');
    };

    const handleViewProfile = async (emp: EmployeeRecord) => {
        setSelectedEmployee(emp);
        setViewingProfile(true);
        setProfileLoading(true);
        try {
            const { where } = await import('../../services/localFirestore');
            // Fetch stats
            // 1. Paid Salaries
            const payrollQ = query(collection(db, 'hr_payroll'), where('employeeId', '==', emp.id), where('status', '==', 'Paid'));
            const payrollSnap = await getDocs(payrollQ);
            const totalPaid = payrollSnap.docs.reduce((sum, d) => sum + (d.data().netSalary || 0), 0);
            
            // 2. Loans & Vacations
            const requestsQ = query(collection(db, 'hr_requests'), where('employeeId', '==', emp.id), where('status', '==', 'Approved'));
            const requestsSnap = await getDocs(requestsQ);
            
            let totalLoans = 0;
            let vacationDays = 0;
            
            requestsSnap.docs.forEach(d => {
                const data = d.data();
                if (data.type === 'Loan') {
                    totalLoans += (data.amount || 0);
                } else if (data.type === 'Vacation') {
                    vacationDays += (data.daysCount || 0);
                }
            });
            
            setEmployeeStats({
                totalPaid,
                totalLoans,
                remainingLoan: totalLoans, // Placeholder if no repayment system yet
                vacationDays
            });
        } catch (error) {
            console.error(error);
        } finally {
            setProfileLoading(false);
        }
    };
    const handleDelete = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'hr_personnel', id));
            setEmployees(prev => prev.filter(emp => emp.id !== id));
            addToast('تم حذف السجل بنجاح', 'info');
        } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, `hr_personnel/${id}`);
        }
    };

    const filteredEmployees = employees.filter(emp => 
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.department.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <PageHeader 
                title="شؤون الموظفين" 
                subtitle="إدارة بيانات الموظفين، عقودهم وهياكلهم الوظيفية"
            />

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text"
                        placeholder="البحث بالاسم، الوظيفة أو القسم..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-12 pr-12 pl-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600/20 font-bold"
                    />
                </div>
                <Button onClick={() => {
                    if (employees.length >= limits.maxEmployees) {
                        addToast(`لقد وصلت للحد الأقصى لعدد الموظفين في باقتك (${toArabicIndic(limits.maxEmployees.toString())})`, 'error');
                        return;
                    }
                    setIsModalOpen(true);
                }} className="w-full md:w-auto h-12 rounded-2xl bg-indigo-600 px-8 font-black shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">
                    <UserPlus className="me-2" size={18} />
                    إضافة موظف جديد
                </Button>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm(); }} title={editingId ? "تعديل بيانات الموظف" : "إضافة موظف جديد"}>
                <form onSubmit={handleAdd} className="space-y-4 p-4 overflow-y-auto max-h-[80vh]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 pr-2">اسم الموظف</label>
                            <input 
                                required
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none font-bold"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 pr-2">المسمى الوظيفي</label>
                            <input 
                                required
                                value={formData.position}
                                onChange={e => setFormData({...formData, position: e.target.value})}
                                className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none font-bold"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 pr-2">القسم</label>
                            <select 
                                value={formData.department}
                                onChange={e => setFormData({...formData, department: e.target.value})}
                                className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none font-bold cursor-pointer"
                            >
                                <option value="">اختر القسم</option>
                                <option value="المبيعات">المبيعات</option>
                                <option value="المخازن">المخازن</option>
                                <option value="المحاسبة">المحاسبة</option>
                                <option value="العمليات">العمليات</option>
                                <option value="الإدارة">الإدارة</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 pr-2">نوع العقد</label>
                            <select 
                                value={formData.contractType}
                                onChange={e => setFormData({...formData, contractType: e.target.value as any})}
                                className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none font-bold cursor-pointer"
                            >
                                <option value="Permanent">دائم</option>
                                <option value="Term">محدد المدة</option>
                                <option value="Project Based">مرتبط بمشروع</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 pr-2">تاريخ بداء العمل</label>
                            <input 
                                type="date"
                                required
                                value={formData.startDate}
                                onChange={e => setFormData({...formData, startDate: e.target.value})}
                                className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none font-bold"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 pr-2">نوع الراتب</label>
                            <select 
                                value={formData.salaryType}
                                onChange={e => setFormData({...formData, salaryType: e.target.value as any})}
                                className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none font-bold cursor-pointer"
                            >
                                <option value="Monthly">شهري</option>
                                <option value="Weekly">اسبوعي</option>
                                <option value="Daily">يومي</option>
                                <option value="Yearly">سنوي</option>
                                <option value="Semiannual">نصف سنوي</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 pr-2">يوم القبض (مثلاً 25 من الشهر)</label>
                            <input 
                                type="number"
                                required
                                value={formData.payday}
                                onChange={e => setFormData({...formData, payday: Number(e.target.value)})}
                                className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none font-bold text-left"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 pr-2">الراتب الأساسي</label>
                            <input 
                                type="number"
                                required
                                value={formData.salary}
                                onChange={e => setFormData({...formData, salary: Number(e.target.value)})}
                                className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none font-bold text-left"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 pr-2">نسبة العمولة (%)</label>
                            <input 
                                type="number"
                                value={formData.commissionPercentage}
                                onChange={e => setFormData({...formData, commissionPercentage: Number(e.target.value)})}
                                className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none font-bold text-left"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 pr-2">أقصى خصم مسموح به (مبلغ)</label>
                            <input 
                                type="number"
                                value={formData.maxDiscountLimit}
                                onChange={e => setFormData({...formData, maxDiscountLimit: Number(e.target.value)})}
                                className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none font-bold text-left"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 pr-2">رقم الهاتف</label>
                            <input 
                                value={formData.phone}
                                onChange={e => setFormData({...formData, phone: e.target.value})}
                                className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none font-bold text-left"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 pr-2">البريد الإلكتروني (اختياري)</label>
                            <input 
                                type="email"
                                value={formData.email}
                                onChange={e => setFormData({...formData, email: e.target.value})}
                                className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none font-bold text-left"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 pr-2">الوردية</label>
                            <select
                                required
                                value={formData.shift}
                                onChange={e => setFormData({...formData, shift: e.target.value as any})}
                                className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none font-bold cursor-pointer"
                            >
                                <option value="صباحي">صباحي</option>
                                <option value="مسائي">مسائي</option>
                                <option value="دوام كامل">دوام كامل</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 pr-2">أقصى مبلغ للسلف (شهرياً)</label>
                            <input 
                                type="number"
                                value={formData.maxAdvance}
                                onChange={e => setFormData({...formData, maxAdvance: Number(e.target.value)})}
                                className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none font-bold text-left"
                            />
                        </div>

                        {/* Fingerprint Enrollment Card */}
                        <div className="col-span-1 md:col-span-2 border-2 border-dashed border-slate-200 dark:border-slate-750 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-900/30">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${formData.fingerprintId ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                        <Fingerprint size={24} className={enrollingFingerprint ? "animate-pulse" : ""} />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-sm text-slate-800 dark:text-slate-200 text-right">بصمة الإصبع الحيوية</h4>
                                        <p className="text-xs text-slate-400 font-bold mt-1 text-right">
                                            {formData.fingerprintId 
                                                ? `البصمة آمنة مسجلة بـ ID: ${formData.fingerprintId}` 
                                                : "يجب تسجيل بصمة الإصبع لمنع الحضور اليدوي نهائياً."}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {formData.fingerprintId && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFormData(prev => ({ ...prev, fingerprintId: '' }));
                                                addToast('تم إزالة البصمة المسجلة', 'info');
                                            }}
                                            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-black transition-all"
                                        >
                                            حذف بصمة
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleEnrollFingerprint}
                                        disabled={enrollingFingerprint}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-indigo-500/10"
                                    >
                                        <Fingerprint size={14} />
                                        {formData.fingerprintId ? 'إعادة تسجيل البصمة' : 'تسجيل بصمة جديدة'}
                                    </button>
                                </div>
                            </div>

                            {enrollingFingerprint && (
                                <div className="mt-4 p-4 bg-indigo-950/20 border border-indigo-500/30 rounded-xl relative overflow-hidden flex flex-col items-center text-center space-y-3">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-400 to-transparent animate-pulse" />
                                    <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 relative">
                                        <Fingerprint size={32} className="animate-pulse" />
                                        <div className="absolute inset-0 rounded-full border-2 border-indigo-500/50 animate-ping opacity-75" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-indigo-600 dark:text-indigo-400">يرجى وضع إصبع الموظف على مستشعر البصمة للبدء...</p>
                                        <p className="text-[10px] text-slate-400 font-bold mt-1">المستشعر جاهز لاستلام الإشارة وتوليد الـ Hash التشفيري الفريد.</p>
                                    </div>
                                    
                                    <button 
                                        type="button"
                                        onClick={simulateCompleteBiometricScan}
                                        className="mt-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-indigo-550/20"
                                    >
                                        [ اضغط هنا لمحاكاة لمس القارئ الحيوي وتسجيل البصمة ]
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <Button type="submit" disabled={submitting} className="flex-1 h-12 bg-indigo-600 rounded-xl font-black shadow-lg shadow-indigo-500/20">
                            {submitting ? 'جاري الحفظ...' : 'حفظ الموظف'}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="h-12 px-8 rounded-xl font-black">إلغاء</Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={viewingProfile} onClose={() => setViewingProfile(false)} title={`ملف الموظف: ${selectedEmployee?.name}`}>
                {profileLoading ? (
                    <div className="p-12 text-center space-y-4">
                        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="font-black text-slate-500">جاري تحميل بيانات الموظف...</p>
                    </div>
                ) : selectedEmployee && (
                    <div className="p-6 space-y-6">
                        <div className="flex items-center gap-4 border-b border-slate-50 dark:border-slate-800 pb-6">
                            <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/40 rounded-[2.5rem] flex items-center justify-center text-indigo-600 text-3xl font-black">
                                {selectedEmployee.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="text-xl font-black">{selectedEmployee.name}</h3>
                                <p className="text-slate-500 font-bold">{selectedEmployee.position} • {selectedEmployee.department}</p>
                                <span className={`inline-block mt-2 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${selectedEmployee.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                    {selectedEmployee.status === 'Active' ? 'نشط' : 'غير نشط'}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100/50 dark:border-emerald-800/30">
                                <span className="text-[10px] font-black text-emerald-500 uppercase block mb-1">إجمالي الرواتب المصروفة</span>
                                <span className="text-xl font-black text-emerald-700 dark:text-emerald-400">{employeeStats.totalPaid.toLocaleString()} ر.س</span>
                            </div>
                            <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100/50 dark:border-amber-800/30">
                                <span className="text-[10px] font-black text-amber-500 uppercase block mb-1">إجمالي السلف / القروض</span>
                                <span className="text-xl font-black text-amber-700 dark:text-amber-400">{employeeStats.totalLoans.toLocaleString()} ر.س</span>
                            </div>
                            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100/50 dark:border-indigo-800/30">
                                <span className="text-[10px] font-black text-indigo-500 uppercase block mb-1">رصيد الإجازات المستهلك</span>
                                <span className="text-xl font-black text-indigo-700 dark:text-indigo-400">{employeeStats.vacationDays} يوم</span>
                            </div>
                            <div className="p-4 bg-rose-50 dark:bg-rose-900/10 rounded-2xl border border-rose-100/50 dark:border-rose-800/30">
                                <span className="text-[10px] font-black text-rose-500 uppercase block mb-1">المتبقي من السلف</span>
                                <span className="text-xl font-black text-rose-700 dark:text-rose-400">{employeeStats.remainingLoan.toLocaleString()} ر.س</span>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4">
                            <h4 className="font-black text-sm border-r-4 border-indigo-600 pr-3">بيانات التعاقد</h4>
                            <div className="grid grid-cols-2 gap-y-3 text-xs">
                                <div className="flex flex-col">
                                    <span className="text-slate-400 font-bold">نوع الراتب</span>
                                    <span className="font-black">{selectedEmployee.salaryType || 'Monthly'}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-slate-400 font-bold">تاريخ المباشرة</span>
                                    <span className="font-black">{selectedEmployee.startDate}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-slate-400 font-bold">نوع العقد</span>
                                    <span className="font-black">{selectedEmployee.contractType === 'Permanent' ? 'دائم' : 'مؤقت'}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-slate-400 font-bold">الوردية</span>
                                    <span className="font-black">{selectedEmployee.shift}</span>
                                </div>
                            </div>
                        </div>
                        
                        <Button onClick={() => setViewingProfile(false)} variant="outline" className="w-full h-12 rounded-xl font-black mt-4">إغلاق</Button>
                    </div>
                )}
            </Modal>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array(6).fill(0).map((_, i) => <div key={i} className="h-48 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-3xl"></div>)
                ) : filteredEmployees.length > 0 ? (
                    filteredEmployees.map(emp => (
                        <Card key={emp.id} className="p-6 hover:shadow-xl transition-all border border-slate-100 dark:border-slate-800">
                           <div className="flex justify-between items-start mb-4">
                               <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600">
                                   <Users size={24} />
                               </div>
                                <div className="flex gap-2">
                                    <Button 
                                        variant="ghost" 
                                        onClick={() => handleViewProfile(emp)} 
                                        className="p-2 text-slate-400 hover:text-emerald-600 transition-colors" 
                                        title="ملف الموظف"
                                    >
                                        <UserPlus size={18} />
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        onClick={() => handleEdit(emp)} 
                                        className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                                    >
                                        <Edit3 size={18} />
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        onClick={() => handleDelete(emp.id)} 
                                        className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </Button>
                                </div>
                           </div>
                           <div className="flex justify-between items-center mb-1">
                               <h3 className="text-lg font-black">{emp.name}</h3>
                               {emp.fingerprintId ? (
                                   <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                                       <Fingerprint size={10} />
                                       بصمة مؤمنة
                                   </span>
                               ) : (
                                   <span className="flex items-center gap-1 px-2 py-0.5 bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 text-[10px] font-black rounded-lg border border-rose-100 dark:border-rose-900/30">
                                       <Fingerprint size={10} className="animate-pulse" />
                                       بصمة مطلوبة
                                   </span>
                               )}
                           </div>
                           <p className="text-indigo-600 font-bold text-xs mb-4">{emp.position} - {emp.department}</p>
                           
                           <div className="space-y-2 mt-4 pt-4 border-t border-slate-50 dark:border-slate-800">
                               <div className="flex items-center gap-3 text-slate-500">
                                   <Mail size={14} />
                                   <span className="text-xs font-bold">{emp.email || 'لا يوجد بريد'}</span>
                               </div>
                               <div className="flex items-center gap-3 text-slate-500">
                                   <Phone size={14} />
                                   <span className="text-xs font-bold">{emp.phone || 'لا يوجد هاتف'}</span>
                               </div>
                               <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl mt-2">
                                   <div className="flex flex-col">
                                       <span className="text-[10px] text-slate-400 font-black">الراتب</span>
                                       <span className="text-xs font-black text-emerald-600">{(emp.salary || 0).toLocaleString()} ر.س</span>
                                   </div>
                                   <div className="flex flex-col text-left">
                                       <span className="text-[10px] text-slate-400 font-black">الوردية</span>
                                       <span className="text-xs font-black">{emp.shift || 'صباحي'}</span>
                                   </div>
                               </div>
                           </div>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center text-slate-400">
                        <Users size={64} className="mx-auto mb-4 opacity-20" />
                        <p className="font-black">لا يوجد موظفين مسجلين حالياً</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PersonnelPage;
