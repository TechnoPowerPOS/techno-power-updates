import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { collection, query, getDocs, deleteDoc, doc, updateDoc, addDoc, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { handleFirestoreError, OperationType } from '../services/firestoreErrorHandler';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Users, Trash2, RefreshCw, Search, ArrowLeft, Copy, Check, Filter, CheckSquare, Square, ToggleLeft, ToggleRight, Download, CheckCircle2, Eye, History, X, Edit2, Save, Plus, User, Calendar, Globe, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToasts } from '../hooks/useToasts';

interface CustomerRequest {
    id: string;
    name: string;
    email: string;
    phone: string;
    country: string;
    businessType?: string;
    registeredAt: string;
    updatedAt?: string;
    requestedPlan?: string;
    activePlan?: string;
    planExpiresAt?: string;
    deviceId?: string;
    confirmed?: boolean;
    licenseKey?: string;
}

const AdminCustomersFilesPage: React.FC = () => {
    const navigate = useNavigate();
    const { addToast } = useToasts();
    
    const [requests, setRequests] = useState<CustomerRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [planFilter, setPlanFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'unconfirmed' | 'confirmed'>('all');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // History & Profile states
    const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<CustomerRequest | null>(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyLogs, setHistoryLogs] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [historySaving, setHistorySaving] = useState(false);
    
    // Custom manual note state
    const [manualNote, setManualNote] = useState('');

    // Edit manual notes states
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [editingNoteText, setEditingNoteText] = useState<string>('');
    
    // Edit form state
    const [editForm, setEditForm] = useState({
        name: '',
        email: '',
        phone: '',
        country: '',
        businessType: '',
        activePlan: 'Free',
        confirmed: false
    });

    const fetchCustomerHistory = async (customerId: string) => {
        setHistoryLoading(true);
        try {
            const snap = await getDocs(query(collection(db, 'customers', customerId, 'history'), orderBy('timestamp', 'desc')));
            const logs: any[] = [];
            snap.forEach(docSnap => {
                logs.push({ id: docSnap.id, ...docSnap.data() });
            });
            setHistoryLogs(logs);
        } catch (e) {
            console.error("Failed to fetch customer history:", e);
            addToast('حدث خطأ أثناء تحميل سجل التعديلات', 'error');
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleShowHistory = (customer: CustomerRequest) => {
        setSelectedCustomerForHistory(customer);
        setEditForm({
            name: customer.name || '',
            email: customer.email || '',
            phone: customer.phone || '',
            country: customer.country || 'غير محدد',
            businessType: customer.businessType || '',
            activePlan: customer.activePlan || customer.requestedPlan || 'Free',
            confirmed: !!customer.confirmed
        });
        setIsEditing(false);
        setIsHistoryModalOpen(true);
        setManualNote('');
        fetchCustomerHistory(customer.id);
    };

    const handleAddManualNote = async () => {
        if (!manualNote.trim()) {
            addToast('يرجى كتابة الملاحظة قبل الإضافة', 'warning');
            return;
        }
        if (!selectedCustomerForHistory) return;
        setHistorySaving(true);
        try {
            await addDoc(collection(db, 'customers', selectedCustomerForHistory.id, 'history'), {
                timestamp: new Date().toISOString(),
                action: 'ملاحظة يدوية من الإدارة',
                details: manualNote.trim(),
                actor: 'admin'
            });
            addToast('تمت إضافة الملاحظة لسجل العميل بنجاح', 'success');
            setManualNote('');
            await fetchCustomerHistory(selectedCustomerForHistory.id);
        } catch (e) {
            console.error(e);
            addToast('فشل في إضافة الملاحظة للسجل', 'error');
        } finally {
            setHistorySaving(false);
        }
    };

    const handleDeleteNote = async (logId: string) => {
        if (!selectedCustomerForHistory) return;
        if (!confirm('هل أنت متأكد من رغبتك في حذف هذه الملاحظة الإدارية؟')) return;
        setHistorySaving(true);
        try {
            const noteRef = doc(db, 'customers', selectedCustomerForHistory.id, 'history', logId);
            await deleteDoc(noteRef);
            addToast('تم حذف الملاحظة بنجاح', 'success');
            if (editingNoteId === logId) {
                setEditingNoteId(null);
                setEditingNoteText('');
            }
            await fetchCustomerHistory(selectedCustomerForHistory.id);
        } catch (e) {
            console.error("Failed to delete note:", e);
            addToast('فشل في حذف الملاحظة', 'error');
        } finally {
            setHistorySaving(false);
        }
    };

    const startEditingNote = (logId: string, currentDetails: string) => {
        setEditingNoteId(logId);
        setEditingNoteText(currentDetails);
    };

    const cancelEditingNote = () => {
        setEditingNoteId(null);
        setEditingNoteText('');
    };

    const handleSaveEditedNote = async (logId: string) => {
        if (!selectedCustomerForHistory) return;
        if (!editingNoteText.trim()) {
            addToast('يرجى كتابة نص الملاحظة قبل الحفظ', 'warning');
            return;
        }
        setHistorySaving(true);
        try {
            const noteRef = doc(db, 'customers', selectedCustomerForHistory.id, 'history', logId);
            await updateDoc(noteRef, {
                details: editingNoteText.trim(),
                updatedAt: new Date().toISOString()
            });
            addToast('تم تعديل الملاحظة بنجاح', 'success');
            setEditingNoteId(null);
            setEditingNoteText('');
            await fetchCustomerHistory(selectedCustomerForHistory.id);
        } catch (e) {
            console.error("Failed to update note:", e);
            addToast('فشل في تعديل الملاحظة', 'error');
        } finally {
            setHistorySaving(false);
        }
    };

    const handleUpdateCustomer = async () => {
        if (!selectedCustomerForHistory) return;
        setHistorySaving(true);
        try {
            const docRef = doc(db, 'customers', selectedCustomerForHistory.id);
            const changes: string[] = [];
            const translations: Record<string, string> = {
                name: 'الاسم',
                email: 'البريد الإلكتروني',
                phone: 'رقم الهاتف',
                country: 'الدولة',
                businessType: 'نوع النشاط',
                confirmed: 'مؤكد',
                activePlan: 'الباقة الكلية'
            };

            const original = requests.find(r => r.id === selectedCustomerForHistory.id);
            if (original) {
                const upds: Record<string, any> = {
                    name: editForm.name.trim(),
                    email: editForm.email.trim(),
                    phone: editForm.phone.trim(),
                    country: editForm.country.trim(),
                    businessType: editForm.businessType.trim(),
                    confirmed: editForm.confirmed,
                    updatedAt: new Date().toISOString()
                };

                for (const [k, nv] of Object.entries(upds)) {
                    if (k === 'updatedAt') continue;
                    const ov = (original as any)[k];
                    if (ov !== nv) {
                        const label = translations[k] || k;
                        changes.push(`${label}: [${ov !== undefined ? `"${ov}"` : 'فارغ'} ← "${nv}"]`);
                    }
                }

                if (editForm.activePlan !== (original.activePlan || original.requestedPlan || 'Free')) {
                    changes.push(`الباقة: [${original.activePlan || original.requestedPlan || 'Free'} ← ${editForm.activePlan}]`);
                    upds.requestedPlan = editForm.activePlan;
                }

                if (changes.length > 0) {
                    await addDoc(collection(db, 'customers', selectedCustomerForHistory.id, 'history'), {
                        timestamp: new Date().toISOString(),
                        action: 'تعديل الملف الشخصي',
                        details: `تم تعديل بيانات العميل من قبل الإدارة - الحقول المعدلة: ${changes.join(' | ')}`,
                        actor: 'admin'
                    });
                }

                await updateDoc(docRef, upds);

                // If activePlan changed, let's update any active license of this device/customer inside Firestore
                if (editForm.activePlan !== (original.activePlan || original.requestedPlan || 'Free') && original.deviceId) {
                    const licSnap = await getDocs(query(collection(db, 'licenses')));
                    for (const l of licSnap.docs) {
                        const d = l.data();
                        if (d.status === 'active' && (d.deviceId === original.deviceId || (d.deviceIds && d.deviceIds.includes(original.deviceId)))) {
                            await updateDoc(doc(db, 'licenses', l.id), {
                                type: editForm.activePlan
                            });
                        }
                    }
                }

                addToast('تم تحديث بيانات العميل وتوثيق التغييرات بنجاح', 'success');
                setIsEditing(false);
                await loadRequests();
                await fetchCustomerHistory(selectedCustomerForHistory.id);
            }
        } catch (e) {
            handleFirestoreError(e, OperationType.UPDATE, `customers/${selectedCustomerForHistory.id}`);
        } finally {
            setHistorySaving(false);
        }
    };

    const loadRequests = async () => {
        setLoading(true);
        try {
            // Get all customers and licenses from Firestore
            const snap = await getDocs(query(collection(db, 'customers')));
            const licensesSnap = await getDocs(query(collection(db, 'licenses')));
            
            const activeLicensesByDeviceId: Record<string, any> = {};
            const licsByPhone: Record<string, any[]> = {};
            const licsByEmail: Record<string, any[]> = {};

            licensesSnap.forEach(docSnap => {
                const lic = { ...docSnap.data(), licenseKey: docSnap.id };
                if (lic.status === 'active' && lic.deviceId) {
                    // if multiple active, take the latest expiry
                    const existing = activeLicensesByDeviceId[lic.deviceId];
                    if (!existing || (lic.expiresAt && existing.expiresAt && new Date(lic.expiresAt) > new Date(existing.expiresAt))) {
                        activeLicensesByDeviceId[lic.deviceId] = lic;
                    }
                } else if (lic.status === 'active' && lic.deviceIds && Array.isArray(lic.deviceIds)) {
                     lic.deviceIds.forEach((dId: string) => {
                         activeLicensesByDeviceId[dId] = lic;
                     });
                }
                
                if (lic.customerPhone) {
                    const cleanPhone = lic.customerPhone.trim();
                    if (!licsByPhone[cleanPhone]) licsByPhone[cleanPhone] = [];
                    licsByPhone[cleanPhone].push(lic);
                }
                if (lic.customerEmail) {
                    const cleanEmail = lic.customerEmail.trim().toLowerCase();
                    if (!licsByEmail[cleanEmail]) licsByEmail[cleanEmail] = [];
                    licsByEmail[cleanEmail].push(lic);
                }
            });

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

                // Check for active license
                const deviceId = item.deviceId || '';
                let activeLicense = deviceId ? activeLicensesByDeviceId[deviceId] : null;

                if (!activeLicense) {
                    const phoneMatches = licsByPhone[phone] || [];
                    const emailMatches = licsByEmail[email] || [];
                    const allMatches = [...phoneMatches, ...emailMatches];
                    if (allMatches.length > 0) {
                        allMatches.sort((a, b) => {
                            if (a.status === 'active' && b.status !== 'active') return -1;
                            if (b.status === 'active' && a.status !== 'active') return 1;
                            const expA = a.expiresAt ? new Date(a.expiresAt).getTime() : 0;
                            const expB = b.expiresAt ? new Date(b.expiresAt).getTime() : 0;
                            return expB - expA;
                        });
                        activeLicense = allMatches[0];
                    }
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
                    activePlan: activeLicense ? activeLicense.type : undefined,
                    planExpiresAt: activeLicense ? activeLicense.expiresAt : undefined,
                    deviceId,
                    confirmed: (item.confirmed !== undefined ? !!item.confirmed : false) || 
                               (activeLicense && !['Free', 'Trial'].includes(activeLicense.type)),
                    licenseKey: activeLicense ? activeLicense.licenseKey : undefined
                };

                const existing = uniqueMap[email];
                if (!existing) {
                    uniqueMap[email] = current;
                } else {
                    // Deduplication logic: Prioritize the latest record based on updatedAt or registeredAt
                    const getLatestDate = (r: CustomerRequest) => {
                        const reg = r.registeredAt ? new Date(r.registeredAt).getTime() : 0;
                        const upd = r.updatedAt ? new Date(r.updatedAt).getTime() : 0;
                        return Math.max(reg, upd);
                    };

                    const timeExisting = getLatestDate(existing);
                    const timeCurrent = getLatestDate(current);
                    
                    if (timeCurrent > timeExisting) {
                        uniqueMap[email] = current;
                    } else if (timeCurrent === timeExisting && current.confirmed && !existing.confirmed) {
                        // Tie-break with confirmation
                        uniqueMap[email] = current;
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
        if (!confirm('هل أنت متأكد من حذف هذا الملف وبيانات العميل؟')) return;
        try {
            await deleteDoc(doc(db, 'customers', id));
            addToast('تم حذف ملف العميل بنجاح', 'success');
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
                action: isConfirmed ? 'تأكيد طلب العميل' : 'إلغاء التأكيد',
                details: isConfirmed ? 'تم تأكيد طلب العميل وتفعيل الحساب من لوحة التحكم' : 'تم إلغاء تأكيد طلب العميل من لوحة التحكم',
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
        if (!plan) return { label: 'غير محدد', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300' };
        
        if (plan.includes('Trial')) {
            let sub = 'أعمال';
            if (plan.includes('Basic')) sub = 'أساسية';
            else if (plan.includes('Pro')) sub = 'محترفين';
            return { label: `تجريبية (${sub})`, color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' };
        }

        switch (plan) {
            case 'Free': return { label: 'الباقة المجانية (Free)', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' };
            case 'Basic': return { label: 'الباقة الأساسية سنوي (Basic)', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' };
            case 'Pro': return { label: 'الباقة الاحترافية سنوي (Pro)', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300' };
            case 'Enterprise': return { label: 'باقة الأعمال سنوي (Enterprise)', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300' };
            case 'Business': return { label: 'باقة الأعمال سنوي (Enterprise)', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300' };
            default: return { label: plan, color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300' };
        }
    };

    // Filtered list
    const filteredRequests = requests.filter(req => {
        const matchesSearch = 
            req.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            req.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            req.phone.includes(searchQuery) ||
            req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (req.deviceId && req.deviceId.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (req.licenseKey && req.licenseKey.toLowerCase().includes(searchQuery.toLowerCase()));

        const isExpired = req.planExpiresAt && new Date(req.planExpiresAt).getTime() < new Date().getTime();
        const effectivePlan = req.activePlan || req.requestedPlan;
        
        let matchesPlan = false;
        if (planFilter === 'all') {
            matchesPlan = true;
        } else if (planFilter === 'expired') {
            matchesPlan = !!isExpired;
        } else if (planFilter === 'Enterprise') {
            matchesPlan = effectivePlan === 'Enterprise' || effectivePlan === 'Business';
        } else {
            matchesPlan = effectivePlan === planFilter;
        }

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
        if (!confirm(`هل أنت متأكد من حذف ${selectedIds.length} من ملفات العملاء المحددة نهائياً؟`)) return;
        setLoading(true);
        try {
            for (const id of selectedIds) {
                await deleteDoc(doc(db, 'customers', id));
            }
            addToast('تم حذف الملفات المحددة بنجاح', 'success');
            await loadRequests();
        } catch (e) {
            handleFirestoreError(e, OperationType.DELETE, 'customers/bulk');
        } finally {
            setLoading(false);
        }
    };

    const exportToExcel = (exportType: 'all' | 'filtered') => {
        const dataToExport = exportType === 'all' ? requests : filteredRequests;
        if (!dataToExport.length) {
            addToast('لا توجد بيانات للتصدير', 'error');
            return;
        }

        const formattedData = dataToExport.map((req, index) => ({
            'م': index + 1,
            'اسم العميل': req.name || 'غير متوفر',
            'البريد الإلكتروني': req.email || 'غير متوفر',
            'رقم الهاتف': req.phone || 'غير متوفر',
            'الدولة': req.country || 'غير محدد',
            'نوع النشاط': req.businessType || 'غير محدد',
            'الباقة الحالية': getPlanName(req.activePlan || req.requestedPlan).label,
            'تاريخ التسجيل': req.registeredAt ? new Date(req.registeredAt).toLocaleString('ar-EG') : 'غير معروف',
            'تاريخ الانتهاء': req.planExpiresAt ? new Date(req.planExpiresAt).toLocaleString('ar-EG') : 'غير محدد',
            'رقم الجهاز التعريفي': req.deviceId || 'غير مسجل',
            'مؤكد؟': req.confirmed ? 'نعم' : 'لا'
        }));

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(formattedData);
        XLSX.utils.book_append_sheet(workbook, worksheet, "العملاء");
        
        // Adjust column widths
        const wscols = [
            {wch:5}, {wch:25}, {wch:35}, {wch:20}, {wch:15}, {wch:25}, {wch:20}, {wch:20}, {wch:20}, {wch:10}
        ];
        worksheet['!cols'] = wscols;

        XLSX.writeFile(workbook, `ملفات_العملاء_${exportType === 'all' ? 'كامل' : 'مخصص'}.xlsx`);
        addToast('تم التصدير بنجاح', 'success');
    };

    const handleBulkConfirm = async (isConfirmed: boolean) => {
        if (!selectedIds.length) return;
        if (!confirm(`هل أنت متأكد من ${isConfirmed ? 'تأكيد' : 'إلغاء تأكيد'} ${selectedIds.length} من ملفات العملاء المحددة دفعة واحدة؟`)) return;
        setLoading(true);
        try {
            for (const id of selectedIds) {
                await updateDoc(doc(db, 'customers', id), { confirmed: isConfirmed });

                // Log under history
                await addDoc(collection(db, 'customers', id, 'history'), {
                    timestamp: new Date().toISOString(),
                    action: isConfirmed ? 'تأكيد طلب العميل تجميعياً' : 'إلغاء التأكيد تجميعياً',
                    details: isConfirmed ? 'تم تأكيد طلب العميل تجميعياً مع المجموعة المحددة من لوحة التحكم' : 'تم إلغاء تأكيد طلب العميل تجميعياً من لوحة التحكم',
                    actor: 'admin'
                });
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
        total: requests.length,
        free: requests.filter(r => {
            const plan = r.activePlan || r.requestedPlan || 'Free';
            return plan === 'Free';
        }).length,
        basic: requests.filter(r => {
            const plan = r.activePlan || r.requestedPlan || 'Free';
            return plan === 'Basic';
        }).length,
        pro: requests.filter(r => {
            const plan = r.activePlan || r.requestedPlan || 'Free';
            return plan === 'Pro';
        }).length,
        enterprise: requests.filter(r => {
            const plan = r.activePlan || r.requestedPlan || 'Free';
            return plan === 'Enterprise' || plan === 'Business';
        }).length,
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
                            ملفات العملاء (Customer Files)
                        </h1>
                        <p className="text-slate-500 font-bold text-sm mt-1">عرض جميع سجلات العملاء المكتملة دون تكرار للبيانات</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button onClick={() => exportToExcel('all')} variant="outline" className="h-12 px-4 rounded-2xl font-black gap-2 border-slate-200 dark:border-slate-700">
                        <Download size={18} /> تصدير كامل
                    </Button>
                    <Button onClick={() => exportToExcel('filtered')} variant="outline" className="h-12 px-4 rounded-2xl font-black gap-2 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/10">
                        <Download size={18} /> تصدير مخصص
                    </Button>
                    <Button onClick={loadRequests} variant="secondary" className="h-12 px-5 rounded-2xl font-black gap-2" isLoading={loading}>
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> تحديث
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="p-6 flex flex-col items-center justify-center text-center space-y-1 relative overflow-hidden border-none shadow-md">
                    <span className="text-slate-400 font-black text-xs uppercase tracking-wider">إجمالي الملفات (العملاء)</span>
                    <span className="text-3xl font-black text-slate-800 dark:text-slate-100">{stats.total}</span>
                    <div className="absolute -bottom-2 -left-2 w-16 h-16 bg-slate-500/5 rounded-full" />
                </Card>

                <Card className="p-6 flex flex-col items-center justify-center text-center space-y-1 relative overflow-hidden border-none shadow-md">
                    <span className="text-slate-400 font-black text-xs uppercase tracking-wider">المجانية</span>
                    <span className="text-3xl font-black text-slate-700 dark:text-slate-300">{stats.free}</span>
                    <div className="absolute -bottom-2 -left-2 w-16 h-16 bg-slate-500/5 rounded-full" />
                </Card>

                <Card className="p-6 flex flex-col items-center justify-center text-center space-y-1 relative overflow-hidden border-none shadow-md">
                    <span className="text-emerald-500 font-black text-xs uppercase tracking-wider">الأساسية سنوي</span>
                    <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{stats.basic}</span>
                    <div className="absolute -bottom-2 -left-2 w-16 h-16 bg-emerald-500/5 rounded-full" />
                </Card>

                <Card className="p-6 flex flex-col items-center justify-center text-center space-y-1 relative overflow-hidden border-none shadow-md">
                    <span className="text-indigo-500 font-black text-xs uppercase tracking-wider">الاحترافية سنوي</span>
                    <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{stats.pro}</span>
                    <div className="absolute -bottom-2 -left-2 w-16 h-16 bg-indigo-500/5 rounded-full" />
                </Card>

                <Card className="p-6 flex flex-col items-center justify-center text-center space-y-1 relative overflow-hidden border-none shadow-md col-span-2 lg:col-span-1">
                    <span className="text-purple-500 font-black text-xs uppercase tracking-wider">الأعمال سنوي</span>
                    <span className="text-3xl font-black text-purple-600 dark:text-purple-400">{stats.enterprise}</span>
                    <div className="absolute -bottom-2 -left-2 w-16 h-16 bg-purple-500/5 rounded-full" />
                </Card>
            </div>

            {/* Filters Bar */}
            <Card className="p-4 flex flex-col lg:flex-row gap-4 justify-between items-center border-none shadow-sm">
                <div className="relative w-full lg:w-96">
                    <input
                        type="text"
                        placeholder="بحث بالاسم، الإيميل، الهاتف، معرف الجهاز، أو الترخيص..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full h-11 pr-11 pl-4 bg-slate-50 dark:bg-slate-900 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                    />
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                </div>

                <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-slate-400 whitespace-nowrap flex items-center gap-1">
                            <CheckCircle2 size={14} /> الحالة:
                        </span>
                        <select
                            value={statusFilter}
                            onChange={e => {
                                setStatusFilter(e.target.value as any);
                                setSelectedIds([]);
                            }}
                            className="h-11 px-4 bg-slate-50 dark:bg-slate-900 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-black text-sm min-w-[130px] cursor-pointer"
                        >
                            <option value="all">كل الحالات</option>
                            <option value="confirmed">المؤكدة فقط</option>
                            <option value="unconfirmed">غير المؤكدة</option>
                        </select>
                    </div>

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
                            <option value="expired">الباقات المنتهية فقط</option>
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
                                تم تحديد <span className="underline font-black text-indigo-600 dark:text-indigo-400">{selectedIds.length}</span> ملفات
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button onClick={handleBulkDelete} variant="ghost" className="h-10 px-4 rounded-xl font-black text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 gap-1">
                                <Trash2 size={16} /> حذف الملفات المحددة
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
                                <th className="px-6 py-4 font-black text-slate-600 dark:text-slate-400 text-xs text-center">الباقة الحالية</th>
                                <th className="px-6 py-4 font-black text-slate-600 dark:text-slate-400 text-xs">تاريخ التسجيل</th>
                                <th className="px-6 py-4 font-black text-slate-600 dark:text-slate-400 text-xs">تاريخ الإنتهاء</th>
                                <th className="px-6 py-4 font-black text-slate-600 dark:text-slate-400 text-xs text-center">خيارات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-bold">
                                        <div className="flex justify-center items-center gap-3">
                                            <RefreshCw className="animate-spin text-indigo-600" size={24} />
                                            جاري تحميل الملفات...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-bold">
                                        لا توجد أي ملفات تطابق المعايير المحددة حالياً.
                                    </td>
                                </tr>
                            ) : (
                                filteredRequests.map(req => {
                                    const planInfo = getPlanName(req.activePlan || req.requestedPlan);
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
                                                <div className="font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                                    <span>{req.name}</span>
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
                                                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                                    <span>{req.country || 'غير معروف'}</span>
                                                    {req.businessType && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="text-indigo-500 font-bold">{req.businessType}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-4 py-1.5 rounded-2xl font-black text-xs inline-block ${planInfo.color}`}>
                                                    {planInfo.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-xs text-slate-500">
                                                {req.registeredAt ? new Date(req.registeredAt).toLocaleString('ar-EG', { dateStyle: 'short' }) : 'غير محدد'}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-xs text-slate-500">
                                                {req.planExpiresAt ? new Date(req.planExpiresAt).toLocaleString('ar-EG', { dateStyle: 'short' }) : 'غير محدد'}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex justify-center items-center gap-2">
                                                    <Button 
                                                        variant="ghost" 
                                                        className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-xl transition-all"
                                                        onClick={() => handleShowHistory(req)}
                                                        title="عرض الملف والسجل والتاريخ الكامل"
                                                    >
                                                        <Eye size={16} />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all"
                                                        onClick={() => handleDelete(req.id)}
                                                        title="حذف ملف العميل"
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

            {/* History & Edit Profile Modal */}
            {isHistoryModalOpen && selectedCustomerForHistory && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 dir-rtl">
                    <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-none">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl text-indigo-600 dark:text-indigo-400">
                                    <User size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
                                        الملف الشخصي: {selectedCustomerForHistory.name}
                                    </h2>
                                    <p className="text-xs text-slate-400 font-bold mt-0.5">
                                        معرف العميل (ID): {selectedCustomerForHistory.id}
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsHistoryModalOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content Split/Tabs */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                {/* Left column: Customer Details Info & Form Edit */}
                                <div className="lg:col-span-5 space-y-4">
                                    <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/30 p-1.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                                        <span className="text-sm font-extrabold text-slate-700 dark:text-slate-400 mr-2">بيانات العميل الحالية</span>
                                        <Button
                                            type="button"
                                            onClick={() => setIsEditing(!isEditing)}
                                            variant="ghost" 
                                            className="h-8 px-3 rounded-lg text-xs font-black text-indigo-600 dark:text-indigo-400 gap-1 hover:bg-indigo-50 dark:hover:bg-indigo-950/10"
                                        >
                                            {isEditing ? 'إلغاء التعديل' : 'تعديل البيانات'}
                                            <Edit2 size={12} />
                                        </Button>
                                    </div>

                                    <form onSubmit={(e) => { e.preventDefault(); handleUpdateCustomer(); }} className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-black text-slate-400">الاسم الكامل</label>
                                            <input 
                                                type="text" 
                                                disabled={!isEditing}
                                                value={editForm.name}
                                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-950/50 border disabled:opacity-75 disabled:cursor-not-allowed rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 font-bold text-sm"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-black text-slate-400">البريد الإلكتروني</label>
                                            <input 
                                                type="email" 
                                                disabled={!isEditing}
                                                value={editForm.email}
                                                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                                className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-950 border disabled:opacity-75 disabled:cursor-not-allowed rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-sm"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-black text-slate-400">رقم الهاتف</label>
                                            <input 
                                                type="text" 
                                                disabled={!isEditing}
                                                value={editForm.phone}
                                                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                                className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-950 border disabled:opacity-75 disabled:cursor-not-allowed rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 font-bold text-sm"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-xs font-black text-slate-400">الدولة</label>
                                                <input 
                                                    type="text" 
                                                    disabled={!isEditing}
                                                    value={editForm.country}
                                                    onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                                                    className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-950 border disabled:opacity-75 disabled:cursor-not-allowed rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 font-bold text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-black text-slate-400">نوع النشاط</label>
                                                <input 
                                                    type="text" 
                                                    disabled={!isEditing}
                                                    value={editForm.businessType}
                                                    onChange={(e) => setEditForm({ ...editForm, businessType: e.target.value })}
                                                    className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-950 border disabled:opacity-75 disabled:cursor-not-allowed rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 font-bold text-sm"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-xs font-black text-slate-400">الباقة المفعلة</label>
                                                <select
                                                    disabled={!isEditing}
                                                    value={editForm.activePlan}
                                                    onChange={(e) => setEditForm({ ...editForm, activePlan: e.target.value })}
                                                    className="w-full h-10 px-2 bg-slate-50 dark:bg-slate-950 border disabled:opacity-75 disabled:cursor-not-allowed rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 font-black text-xs cursor-pointer"
                                                >
                                                    <option value="Free">المجانية (Free)</option>
                                                    <option value="Trial">التجريبية (Trial)</option>
                                                    <option value="Basic">الأساسية سنوي (Basic)</option>
                                                    <option value="Pro">الاحترافية سنوي (Pro)</option>
                                                    <option value="Enterprise">الأعمال سنوي (Enterprise)</option>
                                                </select>
                                            </div>

                                            <div className="space-y-1 flex flex-col justify-end pb-1">
                                                <label className="text-xs font-black text-slate-400 mb-1">حالة التوثيق (مؤكد)</label>
                                                <button
                                                    type="button"
                                                    disabled={!isEditing}
                                                    onClick={() => setEditForm({ ...editForm, confirmed: !editForm.confirmed })}
                                                    className={`w-full h-10 flex items-center justify-center gap-2 border rounded-xl font-black text-xs transition-all ${
                                                        editForm.confirmed 
                                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' 
                                                            : 'bg-slate-50 text-slate-500 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                                                    }`}
                                                >
                                                    {editForm.confirmed ? <CheckCircle2 size={16} /> : 'غير مؤكد'}
                                                    <span>{editForm.confirmed ? 'حساب مؤكد' : 'تأكيد الحساب'}</span>
                                                </button>
                                            </div>
                                        </div>

                                        {isEditing && (
                                            <Button 
                                                type="submit" 
                                                className="w-full h-11 rounded-xl font-black text-sm gap-2 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                                                isLoading={historySaving}
                                            >
                                                <Save size={16} /> حفظ كافة التغييرات بالسجل
                                            </Button>
                                        )}
                                    </form>
                                    
                                    {/* Display device details as additional info */}
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                                        <div className="text-xs font-black text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                                            <Calendar size={13} /> بيانات النظام والجهاز
                                        </div>
                                        <div className="grid grid-cols-2 gap-y-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                                            <span>معرف الجهاز:</span>
                                            <span className="font-mono text-left select-all">{selectedCustomerForHistory.deviceId || 'غير متصل بعد'}</span>
                                            <span>تاريخ التسجيل:</span>
                                            <span className="text-left">{selectedCustomerForHistory.registeredAt ? new Date(selectedCustomerForHistory.registeredAt).toLocaleString('ar-EG') : 'غير متوفر'}</span>
                                            {selectedCustomerForHistory.updatedAt && (
                                                <>
                                                    <span>تاريخ التعديل:</span>
                                                    <span className="text-left">{new Date(selectedCustomerForHistory.updatedAt).toLocaleString('ar-EG')}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right column: Scrolling Modification & Historical Records */}
                                <div className="lg:col-span-7 flex flex-col h-full space-y-4">
                                    <div className="flex items-center gap-2 border-b border-dashed border-slate-200 dark:border-slate-800 pb-3 justify-between">
                                        <div className="flex items-center gap-2">
                                            <History className="text-indigo-600 dark:text-indigo-400" size={18} />
                                            <span className="font-black text-sm text-slate-800 dark:text-slate-100">
                                                سجل النشاط وتعديل البيانات السابقة ({historyLogs.length})
                                            </span>
                                        </div>
                                        <span className="text-xs text-slate-400 font-bold">التسلسل الزمني للعميل</span>
                                    </div>

                                    {/* Logging timeline */}
                                    <div 
                                        className="flex-1 overflow-y-auto max-h-[350px] space-y-3 bg-slate-50 dark:bg-slate-950/40 rounded-2xl p-4 border border-dashed border-slate-200 dark:border-slate-800 animate-fadeIn"
                                        style={{ scrollbarWidth: 'thin', scrollbarColor: '#6366f1 rgba(156, 163, 175, 0.15)' }}
                                    >
                                        {historyLoading ? (
                                            <div className="py-12 text-center text-slate-400 font-bold flex justify-center items-center gap-2">
                                                <RefreshCw className="animate-spin text-indigo-600" size={18} />
                                                جاري تحميل سجل التعديلات والبيانات السابقة...
                                            </div>
                                        ) : historyLogs.length === 0 ? (
                                            <div className="text-center py-12 text-slate-400 font-bold text-sm">
                                                لا توجد أي بيانات سابقة أو سجل تعديل لهذا العميل حتى الآن.
                                            </div>
                                        ) : (
                                            <div className="space-y-4 relative pr-4 border-r border-slate-200 dark:border-slate-800">
                                                {historyLogs.map((log) => {
                                                    let actorLabel = 'النظام';
                                                    let actorColor = 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
                                                    if (log.actor === 'admin') {
                                                        actorLabel = 'الإدارة';
                                                        actorColor = 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300';
                                                    } else if (log.actor === 'user') {
                                                        actorLabel = 'العميل';
                                                        actorColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300';
                                                    }

                                                    return (
                                                        <div key={log.id} className="relative space-y-1">
                                                            {/* Timeline point */}
                                                            <div className="absolute right-[-21px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-white dark:ring-slate-900" />
                                                            
                                                            <div className="flex justify-between items-start">
                                                                <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                                                                    {log.action}
                                                                </span>
                                                                <div className="flex items-center gap-1.5">
                                                                    {log.actor === 'admin' && (
                                                                        <div className="flex items-center gap-1 me-1 opacity-60 hover:opacity-100 transition-opacity">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => startEditingNote(log.id, log.details)}
                                                                                className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                                                title="تعديل الملاحظة"
                                                                            >
                                                                                <Edit2 size={11} />
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleDeleteNote(log.id)}
                                                                                className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                                                title="حذف الملاحظة"
                                                                            >
                                                                                <Trash2 size={11} />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black inline-block ${actorColor}`}>
                                                                        {actorLabel}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {editingNoteId === log.id ? (
                                                                <div className="space-y-1.5 p-2 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                                                                    <textarea
                                                                        value={editingNoteText}
                                                                        onChange={(e) => setEditingNoteText(e.target.value)}
                                                                        className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-lg outline-none font-bold"
                                                                        rows={2}
                                                                    />
                                                                    <div className="flex justify-end gap-1.5">
                                                                        <button
                                                                            type="button"
                                                                            onClick={cancelEditingNote}
                                                                            className="px-2 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-md"
                                                                        >
                                                                            إلغاء
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleSaveEditedNote(log.id)}
                                                                            className="px-2.5 py-1 text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md flex items-center gap-1"
                                                                            disabled={historySaving}
                                                                        >
                                                                            <Check size={10} /> حفظ التعديل
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <p className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60 leading-relaxed font-bold">
                                                                    {log.details}
                                                                </p>
                                                            )}

                                                            <div className="text-[10px] text-slate-400 font-mono pr-1 flex justify-between items-center">
                                                                <span>{log.timestamp ? new Date(log.timestamp).toLocaleString('ar-EG') : 'تاريخ غير معروف'}</span>
                                                                {log.updatedAt && <span className="text-[9px] text-indigo-500 dark:text-indigo-400 font-black">معدّل</span>}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Add manual history entry form */}
                                    <div className="space-y-2 bg-slate-50 dark:bg-slate-900/20 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <label className="text-xs font-black text-slate-400 flex items-center gap-1.5">
                                            <FileText size={13} /> إضافة قيد يدوي / ملاحظة إدارية لسجل التعديل للعميل
                                        </label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text"
                                                placeholder="مثال: تم مراجعة السجلات وتفعيل الاشتراك يدوياً..."
                                                value={manualNote}
                                                onChange={e => setManualNote(e.target.value)}
                                                className="flex-1 h-10 px-3 bg-white dark:bg-slate-950 border rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 font-bold text-sm"
                                            />
                                            <Button 
                                                type="button" 
                                                onClick={handleAddManualNote}
                                                className="h-10 px-4 rounded-xl font-black text-xs gap-1.5 shrink-0"
                                                variant="indigo"
                                                isLoading={historySaving}
                                            >
                                                <Plus size={14} /> إضافة ملاحظة
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-2">
                            <Button 
                                type="button" 
                                variant="outline" 
                                className="h-11 px-5 rounded-xl font-black text-sm"
                                onClick={() => setIsHistoryModalOpen(false)}
                            >
                                إغلاق
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default AdminCustomersFilesPage;
