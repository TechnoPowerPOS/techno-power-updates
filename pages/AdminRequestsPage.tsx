import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, deleteDoc, doc, getDoc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { handleFirestoreError, OperationType } from '../services/firestoreErrorHandler';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Users, Trash2, RefreshCw, Search, ArrowLeft, Copy, Check, Filter, CheckSquare, Square, ToggleLeft, ToggleRight, AlertCircle, Wallet, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToasts } from '../hooks/useToasts';
import Modal from '../components/ui/Modal';

import { exportToExcel } from '../utils/importExportUtils';

interface CustomerRequest {
    id: string;
    name: string;
    email: string;
    phone: string;
    country: string;
    registeredAt: string;
    updatedAt?: string;
    requestedPlan?: string;
    deviceId?: string;
    confirmed?: boolean;
    isInstallment?: boolean;
    nationalId?: string;
    businessType?: string;
    installmentMonths?: string;
    appliedPromoCode?: string;
    originalPrice?: string;
    finalPrice?: string;
}

const AdminRequestsPage: React.FC = () => {
    const navigate = useNavigate();
    const { addToast } = useToasts();
    
    const [requests, setRequests] = useState<CustomerRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [planFilter, setPlanFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'unconfirmed' | 'confirmed'>('all');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectedRequestForView, setSelectedRequestForView] = useState<CustomerRequest | null>(null);

    const handleExportExcel = () => {
        const exportData = filteredRequests.map(req => ({
            'المعرف': req.id,
            'اسم العميل': req.name,
            'البريد الإلكتروني': req.email,
            'رقم الهاتف': req.phone,
            'الدولة': req.country,
            'الباقة المطلوبة': req.requestedPlan,
            'نوع الطلب': req.isInstallment ? `تقسيط (${req.installmentMonths} شهر)` : 'شراء عادي',
            'حالة التأكيد': req.confirmed ? 'مؤكد' : 'قيد المراجعة',
            'تاريخ التسجيل': req.registeredAt ? new Date(req.registeredAt).toLocaleString('ar-EG') : ''
        }));
        exportToExcel(exportData, `طلبات_العملاء_${new Date().toISOString().split('T')[0]}`);
        addToast('تم تصدير البيانات بنجاح', 'success');
    };

    const loadRequests = async () => {
        setLoading(true);
        try {
            // Get all customers from Firestore
            const snap = await getDocs(query(collection(db, 'customers')));
            const uniqueMap: Record<string, CustomerRequest> = {};
            
            snap.forEach(docSnap => {
                const item = docSnap.data();
                const name = (item.name || '').trim();
                const email = (item.email || '').trim().toLowerCase();
                const phone = (item.phone || '').trim();
                const country = (item.country || '').trim();
                
                // CRITICAL: Block any customer record without fully complete data
                if (!name || !email || !phone || !country) {
                    return; 
                }

                const current: CustomerRequest = {
                    id: docSnap.id,
                    name,
                    email,
                    phone,
                    country,
                    registeredAt: item.registeredAt || '',
                    updatedAt: item.updatedAt || '',
                    requestedPlan: item.requestedPlan || 'Free',
                    deviceId: item.deviceId || '',
                    confirmed: item.confirmed !== undefined ? !!item.confirmed : false,
                    isInstallment: !!item.isInstallment,
                    nationalId: item.nationalId || '',
                    businessType: item.businessType || '',
                    installmentMonths: item.installmentMonths || '',
                    appliedPromoCode: item.appliedPromoCode || '',
                    originalPrice: item.originalPrice || '',
                    finalPrice: item.finalPrice || ''
                };

                const mapKey = email + '_' + (current.confirmed ? 'confirmed' : 'unconfirmed');
                const existing = uniqueMap[mapKey];
                if (!existing) {
                    uniqueMap[mapKey] = current;
                } else {
                    // Deduplication logic: Prioritize the latest record based on updatedAt or registeredAt
                    const getLatestDate = (req: CustomerRequest) => {
                        const regDate = req.registeredAt ? new Date(req.registeredAt).getTime() : 0;
                        const updDate = req.updatedAt ? new Date(req.updatedAt).getTime() : 0;
                        return Math.max(regDate, updDate);
                    };

                    const timeExisting = getLatestDate(existing);
                    const timeCurrent = getLatestDate(current);
                    
                    if (timeCurrent > timeExisting) {
                        uniqueMap[mapKey] = current;
                    } else if (timeCurrent === timeExisting && current.confirmed && !existing.confirmed) {
                        // Tie-break with confirmation
                        uniqueMap[mapKey] = current;
                    }
                }
            });

            const data = Object.values(uniqueMap);

            // Sort by registration date descending
            data.sort((a, b) => {
                const dateA = a.registeredAt ? new Date(a.registeredAt).getTime() : 0;
                const dateB = b.registeredAt ? new Date(b.registeredAt).getTime() : 0;
                return dateB - dateA;
            });

            setRequests(data);
            setSelectedIds([]); // clear selection on reload
        } catch (e) {
            handleFirestoreError(e, OperationType.GET, 'customers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRequests();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا الطلب وبيانات العميل؟')) return;
        try {
            await deleteDoc(doc(db, 'customers', id));
            addToast('تم حذف الطلب بنجاح', 'success');
            await loadRequests();
        } catch (e) {
            handleFirestoreError(e, OperationType.DELETE, `customers/${id}`);
        }
    };

    const handleConfirm = async (id: string, isConfirmed: boolean) => {
        try {
            await updateDoc(doc(db, 'customers', id), { confirmed: isConfirmed });

            // Log under history
            await addDoc(collection(db, 'customers', id, 'history'), {
                timestamp: new Date().toISOString(),
                action: isConfirmed ? 'تأكيد طلب الاشتراك' : 'إلغاء التأكيد',
                details: isConfirmed ? 'تم تأكيد طلب الاشتراك وتفعيل الترخيص الأساسي من إدارة الطلبات' : 'تم إلغاء تفعيل حساب العميل من إدارة الطلبات',
                actor: 'admin'
            });

            addToast(isConfirmed ? 'تم تأكيد طلب العميل وتفعيله بنجاح' : 'تم إلغاء تأكيد طلب العميل بنجاح', 'success');
            await loadRequests();
        } catch (e) {
            handleFirestoreError(e, OperationType.UPDATE, `customers/${id}`);
        }
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        addToast('تم نسخ البيانات للحافظة', 'success');
        setTimeout(() => setCopiedId(null), 2000);
    };

    const getPlanName = (plan?: string) => {
        switch (plan) {
            case 'Free': return { label: 'الباقة المجانية (Free)', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' };
            case 'Basic': return { label: 'الباقة الأساسية سنوي (Basic)', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' };
            case 'Pro': return { label: 'الباقة الاحترافية سنوي (Pro)', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300' };
            case 'Enterprise': return { label: 'باقة الأعمال سنوي (Enterprise)', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300' };
            default: return { label: plan || 'غير محدد', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300' };
        }
    };

    // Filtered list
    const filteredRequests = requests.filter(req => {
        // Exclude Free requests per user requirement
        if (req.requestedPlan === 'Free') return false;

        const matchesSearch = 
            req.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            req.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            req.phone.includes(searchQuery) ||
            req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (req.deviceId && req.deviceId.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (req.appliedPromoCode && req.appliedPromoCode.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesPlan = planFilter === 'all' || req.requestedPlan === planFilter;

        const matchesStatus = 
            statusFilter === 'all' ? true :
            statusFilter === 'unconfirmed' ? !req.confirmed :
            !!req.confirmed;

        return matchesSearch && matchesPlan && matchesStatus;
    });

    const toggleSelect = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(item => item !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const toggleSelectAll = () => {
        const currentFilteredIds = filteredRequests.map(r => r.id);
        const allSelected = currentFilteredIds.every(id => selectedIds.includes(id));
        if (allSelected) {
            setSelectedIds(selectedIds.filter(id => !currentFilteredIds.includes(id)));
        } else {
            // Union
            setSelectedIds(Array.from(new Set([...selectedIds, ...currentFilteredIds])));
        }
    };

    const handleBulkDelete = async () => {
        if (!selectedIds.length) return;
        if (!confirm(`هل أنت متأكد من حذف ${selectedIds.length} من الطلبات المحددة نهائياً؟`)) return;
        setLoading(true);
        try {
            for (const id of selectedIds) {
                await deleteDoc(doc(db, 'customers', id));
            }
            addToast('تم حذف الطلبات المحددة بنجاح', 'success');
            await loadRequests();
        } catch (e) {
            handleFirestoreError(e, OperationType.DELETE, 'customers/bulk');
        } finally {
            setLoading(false);
        }
    };

    const handleBulkConfirm = async (isConfirmed: boolean) => {
        if (!selectedIds.length) return;
        if (!confirm(`هل أنت متأكد من ${isConfirmed ? 'تأكيد' : 'إلغاء تأكيد'} ${selectedIds.length} من الطلبات المحددة دفعة واحدة؟`)) return;
        setLoading(true);
        try {
            for (const id of selectedIds) {
                await updateDoc(doc(db, 'customers', id), { confirmed: isConfirmed });
            }
            addToast('تم تنفيذ العملية للمجموعة المحددة بنجاح', 'success');
            await loadRequests();
        } catch (e) {
            handleFirestoreError(e, OperationType.UPDATE, 'customers/bulk');
        } finally {
            setLoading(false);
        }
    };

    // Counts for stats
    const stats = {
        total: requests.filter(r => r.requestedPlan !== 'Free').length,
        free: requests.filter(r => r.requestedPlan === 'Free').length,
        basic: requests.filter(r => r.requestedPlan === 'Basic').length,
        pro: requests.filter(r => r.requestedPlan === 'Pro').length,
        enterprise: requests.filter(r => r.requestedPlan === 'Enterprise').length,
    };

    return (
        <div className="p-6 space-y-6 dir-rtl">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" className="p-3 rounded-2xl bg-white dark:bg-slate-900 border" onClick={() => navigate('/admin-tool')}>
                        <ArrowLeft size={20} />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
                            <Users className="text-indigo-600" size={32} />
                            طلبات تسجيل العملاء والاشتراكات
                        </h1>
                        <p className="text-slate-500 font-bold text-sm mt-1">عرض ومتابعة طلبات ترخيص العملاء الجدد وبيانات اتصالهم</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={handleExportExcel} variant="secondary" className="h-12 px-5 rounded-2xl font-black gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
                        <Check size={18} /> تصدير إكسيل
                    </Button>
                    <Button onClick={loadRequests} variant="secondary" className="h-12 px-5 rounded-2xl font-black gap-2" isLoading={loading}>
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> تحديث البيانات
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 overflow-hidden animate-slide-up group border border-slate-100 dark:border-slate-800/60 shadow-sm hover:shadow-xl transition-all duration-500 relative bg-white dark:bg-slate-900 rounded-[2rem]">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl opacity-40 -translate-y-1/2 translate-x-1/2"></div>
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">إجمالي التراخيص المطلوبة</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{stats.total}</h3>
                        </div>
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 shadow-inner group-hover:rotate-6 transition-transform">
                            <Users size={28} />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 overflow-hidden animate-slide-up group border border-slate-100 dark:border-slate-800/60 shadow-sm hover:shadow-xl transition-all duration-500 relative bg-white dark:bg-slate-900 rounded-[2rem]" style={{ animationDelay: '100ms' }}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl opacity-40 -translate-y-1/2 translate-x-1/2"></div>
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">الطلبات المؤكدة والنشطة</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{requests.filter(r => r.confirmed && r.requestedPlan !== 'Free').length}</h3>
                        </div>
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 shadow-inner group-hover:rotate-6 transition-transform">
                            <CheckSquare size={28} />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 overflow-hidden animate-slide-up group border border-slate-100 dark:border-slate-800/60 shadow-sm hover:shadow-xl transition-all duration-500 relative bg-white dark:bg-slate-900 rounded-[2rem]" style={{ animationDelay: '200ms' }}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl opacity-40 -translate-y-1/2 translate-x-1/2"></div>
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">طلبات قيد المراجعة</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{requests.filter(r => !r.confirmed && r.requestedPlan !== 'Free').length}</h3>
                        </div>
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-amber-50 text-amber-600 dark:bg-amber-900/30 shadow-inner group-hover:rotate-6 transition-transform">
                            <AlertCircle size={28} />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Filters Bar */}
            <Card className="p-4 flex flex-col lg:flex-row gap-4 justify-between items-center border-none shadow-sm">
                <div className="relative w-full lg:w-96">
                    <input
                        type="text"
                        placeholder="بحث بالاسم، الإيميل، الهاتف، معرف الجهاز، كود الخصم..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full h-11 pr-11 pl-4 bg-slate-50 dark:bg-slate-900 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                    />
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                </div>

                <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-slate-400 whitespace-nowrap flex items-center gap-1">
                            <Filter size={14} /> تصفية الباقة:
                        </span>
                        <select
                            value={planFilter}
                            onChange={e => {
                                setPlanFilter(e.target.value);
                                setSelectedIds([]);
                            }}
                            className="h-11 px-4 bg-slate-50 dark:bg-slate-900 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-black text-sm min-w-[150px] cursor-pointer"
                        >
                            <option value="all">كل الباقات</option>
                            <option value="Free">المجانية فقط</option>
                            <option value="Basic">الأساسية سنوي</option>
                            <option value="Pro">الاحترافية سنوي</option>
                            <option value="Enterprise">الأعمال سنوي</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-slate-400 whitespace-nowrap flex items-center gap-1">
                            <Filter size={14} /> حالة التأكيد:
                        </span>
                        <select
                            value={statusFilter}
                            onChange={e => {
                                setStatusFilter(e.target.value as any);
                                setSelectedIds([]);
                            }}
                            className="h-11 px-4 bg-slate-50 dark:bg-slate-900 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-black text-sm min-w-[180px] cursor-pointer"
                        >
                            <option value="all">كل الحالات (المؤكد وغير المؤكد)</option>
                            <option value="unconfirmed">الطلبات غير المؤكدة فقط ⚠️</option>
                            <option value="confirmed">الطلبات المؤكدة فقط ✅</option>
                        </select>
                    </div>
                </div>
            </Card>

            {/* Main Requests Table */}
            <Card className="overflow-hidden border-none shadow-lg">
                {/* Bulk Actions Banner */}
                {selectedIds.length > 0 && (
                    <div className="bg-indigo-500/10 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900 p-4 flex flex-col md:flex-row gap-4 items-center justify-between transition-all">
                        <div className="flex items-center gap-2">
                            <CheckSquare size={20} className="text-indigo-600 dark:text-indigo-400" />
                            <span className="text-sm font-extrabold text-slate-700 dark:text-slate-300">
                                تم تحديد <span className="underline font-black text-indigo-600 dark:text-indigo-400">{selectedIds.length}</span> طلبات
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button onClick={() => handleBulkConfirm(true)} variant="secondary" className="h-10 px-4 rounded-xl font-black bg-emerald-600 hover:bg-emerald-700 text-white border-none gap-1">
                                <Check size={16} /> تأكيد وتفعيل المحدد
                            </Button>
                            <Button onClick={() => handleBulkConfirm(false)} variant="secondary" className="h-10 px-4 rounded-xl font-black bg-amber-500 hover:bg-amber-600 text-white border-none gap-1">
                                إلغاء تأكيد المحدد
                            </Button>
                            <Button onClick={handleBulkDelete} variant="ghost" className="h-10 px-4 rounded-xl font-black text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 gap-1">
                                <Trash2 size={16} /> حذف الطلبات المحددة
                            </Button>
                        </div>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                        <thead>
                            <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                                <th className="p-4 text-center w-12">
                                    <button 
                                        type="button"
                                        onClick={toggleSelectAll} 
                                        className="p-1 text-slate-400 hover:text-indigo-600 transition-colors inline-block"
                                        title="تحديد الكل"
                                    >
                                        {filteredRequests.length > 0 && filteredRequests.every(r => selectedIds.includes(r.id)) ? (
                                            <CheckSquare size={18} className="text-indigo-600 dark:text-indigo-400" />
                                        ) : (
                                            <Square size={18} />
                                        )}
                                    </button>
                                </th>
                                <th className="px-6 py-4 font-black text-slate-600 dark:text-slate-400 text-xs">العميل</th>
                                <th className="px-6 py-4 font-black text-slate-600 dark:text-slate-400 text-xs">بيانات الاتصال</th>
                                <th className="px-6 py-4 font-black text-slate-600 dark:text-slate-400 text-xs">النطاق والدولة</th>
                                <th className="px-6 py-4 font-black text-slate-600 dark:text-slate-400 text-xs text-center">الباقة المطلوبة</th>
                                <th className="px-6 py-4 font-black text-slate-600 dark:text-slate-400 text-xs text-center">حالة التأكيد</th>
                                <th className="px-6 py-4 font-black text-slate-600 dark:text-slate-400 text-xs">تاريخ التسجيل</th>
                                <th className="px-6 py-4 font-black text-slate-600 dark:text-slate-400 text-xs text-center">خيارات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-bold">
                                        <div className="flex justify-center items-center gap-3">
                                            <RefreshCw className="animate-spin text-indigo-600" size={24} />
                                            جاري تحميل الطلبات والعملاء...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-bold">
                                        لا توجد أي طلبات تطابق المعايير المحددة حالياً.
                                    </td>
                                </tr>
                            ) : (
                                filteredRequests.map(req => {
                                    const planInfo = getPlanName(req.requestedPlan);
                                    const isSelected = selectedIds.includes(req.id);
                                    return (
                                        <tr key={req.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors ${isSelected ? 'bg-indigo-50/20 dark:bg-indigo-950/10' : ''}`}>
                                            <td className="p-4 text-center">
                                                <button 
                                                    type="button"
                                                    onClick={() => toggleSelect(req.id)} 
                                                    className="p-1 text-slate-400 hover:text-indigo-600 transition-colors inline-block"
                                                >
                                                    {isSelected ? (
                                                        <CheckSquare size={18} className="text-indigo-600 dark:text-indigo-400" />
                                                    ) : (
                                                        <Square size={18} />
                                                    )}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-extrabold text-slate-800 dark:text-slate-100 flex flex-wrap items-center gap-2">
                                                    <span>{req.name}</span>
                                                    {req.confirmed && (
                                                        <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] px-1.5 py-0.5 rounded-full font-black">
                                                            مؤكد ✅
                                                        </span>
                                                    )}
                                                    {req.appliedPromoCode && (
                                                        <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60 text-[10px] px-2 py-0.5 rounded-lg font-black inline-flex items-center gap-1" title="كود الخصم المطبق">
                                                            🏷️ {req.appliedPromoCode}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs font-mono text-slate-400 mt-1 flex items-center gap-1">
                                                    ID: {req.id}
                                                    <button 
                                                        onClick={() => handleCopy(req.id, `${req.id}-id`)}
                                                        className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-all"
                                                        title="نسخ المعرف"
                                                    >
                                                        {copiedId === `${req.id}-id` ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 space-y-1">
                                                <div className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                                    <span>{req.phone}</span>
                                                    <button 
                                                        onClick={() => handleCopy(req.phone, `${req.id}-phone`)}
                                                        className="text-slate-400 hover:text-indigo-600 p-0.5 rounded transition-all"
                                                        title="نسخ رقم الهاتف"
                                                    >
                                                        {copiedId === `${req.id}-phone` ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                                    </button>
                                                </div>
                                                <div className="text-xs font-medium text-slate-500 flex items-center gap-2">
                                                    <span>{req.email}</span>
                                                    <button 
                                                        onClick={() => handleCopy(req.email, `${req.id}-email`)}
                                                        className="text-slate-400 hover:text-indigo-600 p-0.5 rounded transition-all"
                                                        title="نسخ البريد الإلكتروني"
                                                    >
                                                        {copiedId === `${req.id}-email` ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 font-extrabold text-xs rounded-xl text-slate-600 dark:text-slate-400">
                                                    {req.country || 'غير معروف'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-4 py-1.5 rounded-2xl font-black text-xs inline-block ${planInfo.color}`}>
                                                    {planInfo.label}
                                                </span>
                                                {req.isInstallment && (
                                                    <div className="mt-2.5 flex flex-col items-center gap-1">
                                                        <span className="px-2.5 py-1 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-450 border border-amber-500/10 rounded-xl text-[10px] font-black inline-flex items-center gap-1.5 justify-center">
                                                            <Wallet size={12} />
                                                            طلب تقسيط ({req.installmentMonths} شهر)
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {req.confirmed ? (
                                                    <Button 
                                                        onClick={() => handleConfirm(req.id, false)}
                                                        variant="ghost"
                                                        className="px-3 py-1 scale-90 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-bold border-none gap-1 inline-flex"
                                                        title="اضغط لإلغاء تأكيد للطلب"
                                                    >
                                                        <ToggleRight size={18} className="text-emerald-600" /> مؤكد
                                                    </Button>
                                                ) : (
                                                    <Button 
                                                        onClick={() => handleConfirm(req.id, true)}
                                                        variant="ghost"
                                                        className="px-3 py-1 scale-90 bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-800 rounded-xl font-bold border-none gap-1 inline-flex"
                                                        title="تأكيد كطلب مستكمل"
                                                    >
                                                        <ToggleLeft size={18} className="text-slate-400" /> قيد المراجعة
                                                    </Button>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-xs text-slate-500">
                                                {req.registeredAt ? new Date(req.registeredAt).toLocaleString('ar-EG') : 'غير محدد'}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex justify-center items-center gap-2">
                                                    <Button 
                                                        variant="ghost"
                                                        className="p-2 h-9 w-9 flex items-center justify-center bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900 rounded-xl hover:bg-indigo-100 transition-all shadow-sm"
                                                        title="عرض تفاصيل الطلب بالكامل"
                                                        onClick={() => setSelectedRequestForView(req)}
                                                    >
                                                        <Eye size={16} />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all"
                                                        onClick={() => handleDelete(req.id)}
                                                    >
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* View Details Modal */}
            <Modal 
                isOpen={!!selectedRequestForView} 
                onClose={() => setSelectedRequestForView(null)} 
                title={
                    <div className="flex items-center gap-2">
                        <Users className="text-indigo-600" size={24} />
                        <span>تفاصيل طلب العميل بالكامل 📋</span>
                    </div>
                }
                footer={
                    <Button onClick={() => setSelectedRequestForView(null)} className="rounded-xl h-11 px-6 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100 border-none font-black text-xs">
                        إغلاق النافذة
                    </Button>
                }
            >
                {selectedRequestForView && (
                    <div className="space-y-6 dir-rtl text-right">
                        {/* Plan Badge Header */}
                        <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border dark:border-slate-800/60">
                            <div>
                                <span className={`px-4 py-1.5 rounded-2xl font-black text-xs ${getPlanName(selectedRequestForView.requestedPlan).color}`}>
                                    {getPlanName(selectedRequestForView.requestedPlan).label}
                                </span>
                                {selectedRequestForView.isInstallment && (
                                    <span className="ms-2 px-2.5 py-1 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/10 rounded-xl text-[10px] font-black inline-flex items-center gap-1">
                                        <Wallet size={12} />
                                        نظام تقسيط ({selectedRequestForView.installmentMonths} شهر)
                                    </span>
                                )}
                            </div>
                            <div className="text-xs font-black text-slate-400">
                                الحالة: {selectedRequestForView.confirmed ? (
                                    <span className="text-emerald-600 font-extrabold bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-lg">مؤكد ✅</span>
                                ) : (
                                    <span className="text-amber-600 font-extrabold bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-lg">قيد المراجعة ⚠️</span>
                                )}
                            </div>
                        </div>

                        {/* Customer Info Card */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/40 space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase">اسم العميل بالكامل</p>
                                <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{selectedRequestForView.name}</p>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/40 space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase">معرف جهاز العميل (Device ID)</p>
                                <div className="flex items-center justify-between">
                                    <code className="text-xs font-mono font-black text-indigo-600 dark:text-indigo-400 truncate max-w-[200px]">{selectedRequestForView.deviceId || 'غير متوفر'}</code>
                                    {selectedRequestForView.deviceId && (
                                        <button 
                                            onClick={() => handleCopy(selectedRequestForView.deviceId!, 'modal-device')}
                                            className="text-slate-400 hover:text-indigo-500 p-1"
                                        >
                                            {copiedId === 'modal-device' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/40 space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase">البريد الإلكتروني</p>
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{selectedRequestForView.email}</p>
                                    <button 
                                        onClick={() => handleCopy(selectedRequestForView.email, 'modal-email')}
                                        className="text-slate-400 hover:text-indigo-500 p-1"
                                        title="نسخ البريد الإلكتروني"
                                    >
                                        {copiedId === 'modal-email' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                    </button>
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/40 space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase">رقم الهاتف</p>
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{selectedRequestForView.phone}</p>
                                    <button 
                                        onClick={() => handleCopy(selectedRequestForView.phone, 'modal-phone')}
                                        className="text-slate-400 hover:text-indigo-500 p-1"
                                        title="نسخ رقم الهاتف"
                                    >
                                        {copiedId === 'modal-phone' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                    </button>
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/40 space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase">دولة العميل</p>
                                <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{selectedRequestForView.country || 'مصر'}</p>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/40 space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase">تاريخ إرسال / تحديث الطلب</p>
                                <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                                    {selectedRequestForView.updatedAt 
                                        ? new Date(selectedRequestForView.updatedAt).toLocaleString('ar-EG') 
                                        : selectedRequestForView.registeredAt 
                                            ? new Date(selectedRequestForView.registeredAt).toLocaleString('ar-EG') 
                                            : 'غير محدد'
                                    }
                                </p>
                            </div>
                        </div>

                        {/* Promo Code & Final Price Section */}
                        <div className="p-5 bg-indigo-500/5 dark:bg-indigo-950/10 rounded-2xl border border-indigo-500/10 space-y-4">
                            <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                                <CheckSquare size={16} /> مميزات مالية وتفاصيل السعر
                            </h4>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-3 bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800/60 flex flex-col justify-center">
                                    <p className="text-[10px] font-black text-slate-400 mb-1">السعر الأصلي للباقة</p>
                                    <p className="text-base font-black text-slate-700 dark:text-slate-200 font-mono">
                                        {selectedRequestForView.originalPrice ? `${selectedRequestForView.originalPrice} ج.م` : '---'}
                                    </p>
                                </div>
                                
                                <div className="p-3 bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800/60 flex flex-col justify-center">
                                    <p className="text-[10px] font-black text-slate-400 mb-1">الكود الترويجي المستخدم</p>
                                    <p className="text-base font-black text-indigo-600 dark:text-indigo-400 font-mono flex items-center gap-1">
                                        {selectedRequestForView.appliedPromoCode ? (
                                            <span className="bg-indigo-100 dark:bg-indigo-900/50 px-2 py-0.5 rounded-lg text-xs font-black">{selectedRequestForView.appliedPromoCode}</span>
                                        ) : (
                                            <span className="text-slate-300 dark:text-slate-700 text-xs font-normal">لا يوجد ×</span>
                                        )}
                                    </p>
                                </div>

                                <div className="p-3 bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-indigo-500/25 dark:border-indigo-500/20 flex flex-col justify-center ring-2 ring-indigo-500/10">
                                    <p className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 mb-1">السعر الفعلي للتفعيل 💰</p>
                                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                                        {selectedRequestForView.finalPrice ? `${selectedRequestForView.finalPrice} ج.م` : (selectedRequestForView.originalPrice ? `${selectedRequestForView.originalPrice} ج.م` : '---')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Installment Details if applicable */}
                        {selectedRequestForView.isInstallment && (
                            <div className="p-5 bg-amber-500/5 dark:bg-amber-500/10 rounded-2xl border border-amber-500/10 space-y-4">
                                <h4 className="text-xs font-black text-amber-600 dark:text-amber-400 flex items-center gap-2">
                                    <Wallet size={16} /> تفاصيل طلب خطة التقسيط
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="p-3 bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800/60">
                                        <p className="text-[10px] font-black text-slate-400 mb-1">الرقم القومي للعميل</p>
                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{selectedRequestForView.nationalId || 'غير متوفر'}</p>
                                    </div>
                                    <div className="p-3 bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800/60">
                                        <p className="text-[10px] font-black text-slate-400 mb-1">نوع النشاط التجاري</p>
                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-300">{selectedRequestForView.businessType || 'غير متوفر'}</p>
                                    </div>
                                    <div className="p-3 bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800/60">
                                        <p className="text-[10px] font-black text-slate-400 mb-1">مدة خطة التقسيط</p>
                                        <p className="text-xs font-black text-indigo-600">{selectedRequestForView.installmentMonths || '12'} شهر</p>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default AdminRequestsPage;
