import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { handleFirestoreError, OperationType } from '../services/firestoreErrorHandler';
import * as XLSX from 'xlsx';
import { exportToExcel, importFromExcel } from '../utils/importExportUtils';
import { Plus, Edit2, Trash2, Download, Search, List, RefreshCw, Copy, CheckSquare, Square, Upload } from 'lucide-react';

interface Affiliate {
    id: string;
    name: string;
    email: string;
    phone: string;
    nationalId: string;
    referralCode: string;
    createdAt: any;
    referralCount?: number;
    commissionRate?: number;
}

interface AffiliatePayment {
    id: string;
    affiliateId: string;
    amount: number;
    transferMethod: string;
    transactionId: string;
    date: any;
    notes: string;
}

interface AffiliateReferral {
    id: string;
    affiliateId: string;
    referralCode: string;
    licenseType: string;
    usedAt: any;
    status?: 'paid' | 'unpaid';
}

const generateReferralCode = () => {
    return 'REF-' + Math.random().toString(36).substr(2, 6).toUpperCase();
};

const AdminAffiliatesPage: React.FC = () => {
    const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
    const [referrals, setReferrals] = useState<AffiliateReferral[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [payments, setPayments] = useState<AffiliatePayment[]>([]);
    
    // Form state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        nationalId: '',
        commissionRate: 0,
    });

    // Settle Form State
    const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
    const [settleData, setSettleData] = useState({
        transferMethod: '',
        transactionId: '',
        notes: '',
        amount: 0
    });

    // View Logs State
    const [viewLogsFor, setViewLogsFor] = useState<Affiliate | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [fromDate, setFromDate] = useState('');
	const [toDate, setToDate] = useState('');
	
	const toggleSelectAll = (allIds: string[]) => {
        if (selectedIds.length === allIds.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(allIds);
        }
    };

    const toggleSelection = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(prev => prev.filter(i => i !== id));
        } else {
            setSelectedIds(prev => [...prev, id]);
        }
    };

    useEffect(() => {
        setLoading(true);
        
        // Use onSnapshot for real-time updates and better reliability
        const unsubAff = onSnapshot(query(collection(db, 'affiliates'), orderBy('createdAt', 'desc')), (snapshot) => {
            const affData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Affiliate));
            setAffiliates(affData);
            setLoading(false);
        }, (error) => {
            handleFirestoreError(error, OperationType.GET, 'affiliates');
            setLoading(false);
        });

        const unsubRef = onSnapshot(collection(db, 'affiliate_referrals'), (snapshot) => {
            const refData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AffiliateReferral));
            setReferrals(refData);
        }, (error) => {
            handleFirestoreError(error, OperationType.GET, 'affiliate_referrals');
        });

        const unsubPay = onSnapshot(collection(db, 'affiliate_payments'), (snapshot) => {
            const payData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AffiliatePayment));
            setPayments(payData);
        }, (error) => {
            handleFirestoreError(error, OperationType.GET, 'affiliate_payments');
        });

        return () => {
            unsubAff();
            unsubRef();
            unsubPay();
        };
    }, []);

    // Memoize the mapping counts to avoid calculation on every scroll
    const mappedAffiliates = React.useMemo(() => {
        return affiliates.map(aff => {
            const count = referrals.filter(r => r.affiliateId === aff.id).length;
            return { ...aff, referralCount: count };
        });
    }, [affiliates, referrals]);

    const handleOpenForm = (affiliate?: Affiliate) => {
        if (affiliate) {
            setEditingId(affiliate.id);
            setFormData({
                name: affiliate.name,
                email: affiliate.email,
                phone: affiliate.phone,
                nationalId: affiliate.nationalId,
                commissionRate: affiliate.commissionRate || 0,
            });
        } else {
            setEditingId(null);
            setFormData({ name: '', email: '', phone: '', nationalId: '', commissionRate: 0 });
        }
        setIsFormOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await updateDoc(doc(db, 'affiliates', editingId), { 
                    ...formData,
                    updatedAt: serverTimestamp() 
                });
            } else {
                const newAffiliate = {
                    ...formData,
                    referralCode: generateReferralCode(),
                    createdAt: serverTimestamp()
                };
                await addDoc(collection(db, 'affiliates'), newAffiliate);
            }
            setIsFormOpen(false);
            // No need to call fetchData() because onSnapshot is active
        } catch (error) {
            console.error("Error saving affiliate:", error);
            alert("حدث خطأ أثناء الحفظ. تأكد من بريد الأدمن الصحيح.");
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('هل أنت متأكد من حذف هذا المسوق؟')) {
            try {
                await deleteDoc(doc(db, 'affiliates', id));
                // fetchData() is removed because onSnapshot handles updates
            } catch (error) {
                handleFirestoreError(error, OperationType.DELETE, 'affiliates');
            }
        }
    };

    const getEstimatedProfit = (licenseType: string, rate: number = 0) => {
        let price = 0;
        if (licenseType.includes('Basic Year')) price = 100;
        else if (licenseType.includes('Basic')) price = 10;
        else if (licenseType.includes('Pro Year')) price = 240;
        else if (licenseType.includes('Pro')) price = 25;
        else if (licenseType.includes('Business Year')) price = 400;
        else if (licenseType.includes('Business')) price = 40;
        return (price * rate) / 100;
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`هل أنت متأكد من حذف ${selectedIds.length} مسوق؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
        
        try {
            for (const id of selectedIds) {
                await deleteDoc(doc(db, 'affiliates', id));
            }
            alert('تم الحذف بنجاح');
            setSelectedIds([]);
        } catch (error) {
            console.error(error);
            handleFirestoreError(error, OperationType.DELETE, 'affiliates');
        }
    };

    const handleSettleReferrals = async () => {
        if (!viewLogsFor) return;
        if (!settleData.transferMethod || !settleData.amount) {
            alert('يرجى إدخال طريقة التحويل والمبلغ');
            return;
        }

        if (!window.confirm('هل أنت متأكد من تصفية مستحقات هذا المسوق وتسجيل عملية الدفع؟')) return;
        
        try {
            // Register Payment
            await addDoc(collection(db, 'affiliate_payments'), {
                affiliateId: viewLogsFor.id,
                amount: Number(settleData.amount),
                transferMethod: settleData.transferMethod,
                transactionId: settleData.transactionId,
                notes: settleData.notes,
                date: serverTimestamp()
            });

            const unpaidRefs = referrals.filter(r => r.affiliateId === viewLogsFor.id && r.status !== 'paid');
            for (const ref of unpaidRefs) {
                await updateDoc(doc(db, 'affiliate_referrals', ref.id), { status: 'paid' });
            }
            alert('تمت التصفية بنجاح.');
            setIsSettleModalOpen(false);
            // fetchData() removed because onSnapshot handles updates automatically
        } catch (error) {
            console.error(error);
            alert('حدث خطأ أثناء التصفية.');
        }
    };

    const handleExport = (affiliate: Affiliate) => {
        const affiliateRefs = referrals.filter(r => r.affiliateId === affiliate.id);
        const affiliatePayments = payments.filter(p => p.affiliateId === affiliate.id);
        
        const ws_data = [
            ["بيانات المسوق المتصل"],
            ["الاسم", affiliate.name],
            ["الرقم القومي", affiliate.nationalId],
            ["رقم الموبايل", affiliate.phone],
            ["البريد الإلكتروني", affiliate.email],
            ["كود الإحالة", affiliate.referralCode],
            ["نسبة العمولة", `${affiliate.commissionRate || 0}%`],
            ["إجمالي الإحالات", affiliate.referralCount || 0],
            [],
            [],
            ["سجل عمليات الإحالة الناجحة"],
            ["م", "تاريخ الإحالة وتفعيل النسخة", "نوع الترخيص", "الربح المقدر", "الحالة"]
        ];

        affiliateRefs.forEach((ref, index) => {
            const dateStr = ref.usedAt?.toDate ? ref.usedAt.toDate().toLocaleString('ar-EG') : new Date(ref.usedAt).toLocaleString('ar-EG');
            const profitStr = `$${getEstimatedProfit(ref.licenseType, affiliate.commissionRate || 0)}`;
            const statusStr = ref.status === 'paid' ? 'تمت التصفية' : 'غير مدفوع';
            ws_data.push([(index + 1).toString(), dateStr, ref.licenseType, profitStr, statusStr]);
        });

        ws_data.push([]);
        ws_data.push([]);
        ws_data.push(["سجل المدفوعات والارباح المستلمة"]);
        ws_data.push(["التاريخ", "المبلغ", "طريقة الدفع", "الرقم المرجعي", "ملاحظات"]);

        affiliatePayments.forEach((p) => {
            const dateStr = p.date?.toDate ? p.date.toDate().toLocaleString('ar-EG') : new Date(p.date).toLocaleString('ar-EG');
            ws_data.push([dateStr, `$${p.amount}`, p.transferMethod, p.transactionId || '', p.notes || '']);
        });

        const ws = XLSX.utils.aoa_to_sheet(ws_data);

        // Adjust column widths for better look
        ws['!cols'] = [
            { wch: 15 }, // A
            { wch: 30 }, // B
            { wch: 25 }, // C
            { wch: 15 }, // D
            { wch: 20 }, // E
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "سجل المسوق");
        XLSX.writeFile(wb, `سجل_الاحالات_${affiliate.name.replace(/\s+/g, '_')}.xlsx`);
    };

    const filteredAffiliates = mappedAffiliates.filter(a => 
        a.name.includes(searchTerm) || 
        a.phone.includes(searchTerm) || 
        a.referralCode.includes(searchTerm)
    );

    const handleExportAll = () => {
        const dataToExport = selectedIds.length > 0 ? mappedAffiliates.filter(a => selectedIds.includes(a.id)) : filteredAffiliates;
        exportToExcel(dataToExport.map(a => ({
            "الاسم": a.name,
            "رقم الهاتف": a.phone,
            "البريد الإلكتروني": a.email,
            "الرقم القومي": a.nationalId,
            "كود الإحالة": a.referralCode,
            "نسبة العمولة": a.commissionRate,
            "عدد الإحالات": a.referralCount || 0
        })), 'affiliates_export');
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLoading(true);
        try {
            const data = await importFromExcel(file);
            let importedCount = 0;
            for(const row of data) {
                const newAffiliate = {
                    name: row['الاسم'] || row.name || '',
                    phone: row['رقم الهاتف'] || row.phone || '',
                    email: row['البريد الإلكتروني'] || row.email || '',
                    nationalId: row['الرقم القومي'] || row.nationalId || '',
                    commissionRate: row['نسبة العمولة'] || row.commissionRate || 0,
                    referralCode: row['كود الإحالة'] || row.referralCode || generateReferralCode(),
                    createdAt: serverTimestamp()
                };
                if(newAffiliate.name) {
                    await addDoc(collection(db, 'affiliates'), newAffiliate);
                    importedCount++;
                }
            }
            alert(`تم استيراد ${importedCount} مسوق بنجاح`);
        } catch(err) {
            console.error(err);
            alert('فشل الاستيراد');
        } finally {
            setLoading(false);
            if(e.target) e.target.value = '';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">نظام الإحالات (Affiliates)</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">إدارة المسوقين وأكواد الإحالة الخاصة بهم.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <label className="cursor-pointer">
                        <input type="file" accept=".xlsx" className="hidden" onChange={handleImport} />
                        <div className="flex items-center justify-center gap-2 bg-slate-100 text-slate-700 px-5 py-2.5 rounded-xl hover:bg-slate-200 transition-colors font-bold border border-slate-200">
                            <Upload size={18} />
                            استيراد
                        </div>
                    </label>
                    <button 
                        onClick={handleExportAll}
                        className="flex items-center justify-center gap-2 bg-slate-100 text-slate-700 px-5 py-2.5 rounded-xl hover:bg-slate-200 transition-colors font-bold border border-slate-200"
                    >
                        <Download size={18} />
                        تصدير
                    </button>
                    <button 
                        onClick={() => handleOpenForm()}
                        className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors font-bold"
                    >
                        <Plus size={20} />
                        إضافة مسوق
                    </button>
                </div>
            </div>

            {/* Search and Actions */}
            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-3 flex-1 w-full">
                    <Search className="text-slate-400" size={20} />
                    <input 
                        type="text"
                        placeholder="ابحث بالاسم، الموبايل، أو كود الإحالة..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="bg-transparent border-none focus:outline-none flex-1 text-slate-800 dark:text-white"
                    />
                </div>
                {selectedIds.length > 0 && (
                    <button 
                        onClick={handleDeleteSelected}
                        className="flex items-center justify-center gap-2 bg-rose-500 text-white px-5 py-4 rounded-2xl hover:bg-rose-600 transition-colors font-bold w-full md:w-auto shrink-0"
                    >
                        <Trash2 size={20} />
                        حذف المحدد ({selectedIds.length})
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 text-sm">
                            <tr>
                                <th className="p-4 font-bold w-12 text-center">
                                    <button onClick={() => toggleSelectAll(filteredAffiliates.map(a => a.id))} className="text-slate-400 hover:text-indigo-600">
                                        {selectedIds.length === filteredAffiliates.length && filteredAffiliates.length > 0 ? <CheckSquare size={18} className="text-indigo-600" /> : <Square size={18} />}
                                    </button>
                                </th>
                                <th className="p-4 font-bold">الاسم</th>
                                <th className="p-4 font-bold">بيانات الاتصال</th>
                                <th className="p-4 font-bold">الرقم القومي</th>
                                <th className="p-4 font-bold">كود الإحالة</th>
                                <th className="p-4 font-bold">عدد الإحالات</th>
                                <th className="p-4 font-bold">نسبة العمولة</th>
                                <th className="p-4 font-bold text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-slate-500">جاري التحميل...</td>
                                </tr>
                            ) : filteredAffiliates.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-slate-500">لا يوجد مسوقين مسجلين.</td>
                                </tr>
                            ) : (
                                filteredAffiliates.map(affiliate => (
                                    <tr key={affiliate.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors ${selectedIds.includes(affiliate.id) ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                                        <td className="p-4 text-center">
                                            <button onClick={() => toggleSelection(affiliate.id)} className="text-slate-400 hover:text-indigo-600">
                                                {selectedIds.includes(affiliate.id) ? <CheckSquare size={18} className="text-indigo-600" /> : <Square size={18} />}
                                            </button>
                                        </td>
                                        <td className="p-4 text-slate-800 dark:text-slate-200 font-medium">{affiliate.name}</td>
                                        <td className="p-4">
                                            <div className="text-sm text-slate-800 dark:text-slate-200">{affiliate.phone}</div>
                                            <div className="text-xs text-slate-500">{affiliate.email}</div>
                                        </td>
                                        <td className="p-4 text-slate-600 dark:text-slate-400 text-sm">{affiliate.nationalId}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 px-3 py-1 rounded-lg text-sm font-mono font-bold">
                                                    {affiliate.referralCode}
                                                </span>
                                                <button onClick={() => { navigator.clipboard.writeText(affiliate.referralCode || ''); addToast('تم النسخ بنجاح', 'success'); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors">
                                                    <Copy size={16} />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 px-3 py-1 rounded-lg">
                                                {affiliate.referralCount || 0}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400 px-3 py-1 rounded-lg">
                                                {affiliate.commissionRate || 0}%
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => setViewLogsFor(affiliate)} className="p-2 text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg tooltip" title="سجل الإحالات">
                                                    <List size={18} />
                                                </button>
                                                <button onClick={() => handleExport(affiliate)} className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg tooltip" title="تصدير إكسيل">
                                                    <Download size={18} />
                                                </button>
                                                <button onClick={() => handleOpenForm(affiliate)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg tooltip" title="تعديل">
                                                    <Edit2 size={18} />
                                                </button>
                                                <button onClick={() => handleDelete(affiliate.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg tooltip" title="حذف">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* View Logs Modal */}
            {viewLogsFor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden animate-scaleUp flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                                    سجل إحالات: {viewLogsFor.name}
                                </h3>
                                <p className="text-slate-500 text-sm mt-1">كود الإحالة: <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 rounded">{viewLogsFor.referralCode}</span></p>
                            </div>
                            <button onClick={() => setViewLogsFor(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                ✕
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                                {(() => {
                                    let agentReferrals = referrals.filter(r => r.affiliateId === viewLogsFor.id);
                                    let agentPayments = payments.filter(p => p.affiliateId === viewLogsFor.id);
                                    
                                    if (fromDate) {
                                        const from = new Date(fromDate).getTime();
                                        agentReferrals = agentReferrals.filter(r => {
                                            const time = r.usedAt?.toDate ? r.usedAt.toDate().getTime() : new Date(r.usedAt).getTime();
                                            return time >= from;
                                        });
                                        agentPayments = agentPayments.filter(p => {
                                            const time = p.date?.toDate ? p.date.toDate().getTime() : new Date(p.date).getTime();
                                            return time >= from;
                                        });
                                    }

                                    if (toDate) {
                                        const to = new Date(toDate).getTime() + 86400000;
                                        agentReferrals = agentReferrals.filter(r => {
                                            const time = r.usedAt?.toDate ? r.usedAt.toDate().getTime() : new Date(r.usedAt).getTime();
                                            return time <= to;
                                        });
                                        agentPayments = agentPayments.filter(p => {
                                            const time = p.date?.toDate ? p.date.toDate().getTime() : new Date(p.date).getTime();
                                            return time <= to;
                                        });
                                    }

                                    const unpaids = agentReferrals.filter(r => r.status !== 'paid');
                                    const totalProfs = unpaids.reduce((sum, r) => sum + getEstimatedProfit(r.licenseType, viewLogsFor.commissionRate || 0), 0);
                                    
                                    return (
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                                                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold mb-1">إجمالي الإحالات (تاريخي)</p>
                                                    <p className="text-2xl font-black text-slate-800 dark:text-white">{agentReferrals.length}</p>
                                                </div>
                                                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 text-center relative overflow-hidden flex flex-col justify-between">
                                                    <div className="absolute inset-0 bg-indigo-500/10 pointer-events-none"></div>
                                                    <div>
                                                        <p className="text-indigo-600 dark:text-indigo-400 text-xs font-bold mb-1 relative z-10">الربح المعلق</p>
                                                        <p className="text-2xl font-black text-indigo-700 dark:text-indigo-300 relative z-10">${totalProfs}</p>
                                                    </div>
                                                    {unpaids.length > 0 && (
                                                        <button 
                                                            onClick={() => {
                                                                setSettleData(prev => ({ ...prev, amount: totalProfs }));
                                                                setIsSettleModalOpen(true);
                                                            }}
                                                            className="mt-2 text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-full relative z-10 font-bold transition-colors w-full"
                                                        >
                                                            تصفية ودفع الرصيد
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                                                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold mb-1">نسبة العمولة</p>
                                                    <p className="text-lg font-bold text-slate-800 dark:text-white">{viewLogsFor.commissionRate || 0}%</p>
                                                </div>
                                                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                                                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold mb-1">الإحالات غير المدفوعة</p>
                                                    <p className="text-lg font-bold text-slate-800 dark:text-white">{unpaids.length}</p>
                                                </div>
                                            </div>

                                            {agentReferrals.length === 0 ? (
                                                <div className="text-center py-12 text-slate-500">
                                                    لم يتم تسجيل أي إحالات لهذا المسوق بعد.
                                                </div>
                                            ) : (
                                                <div>
                                                    <div className="flex gap-4 mb-4">
                                                        <div className="flex-1">
                                                            <label className="text-xs text-slate-500 mb-1 block">من تاريخ</label>
                                                            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full px-3 py-2 bg-slate-100 rounded-lg text-sm" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="text-xs text-slate-500 mb-1 block">إلى تاريخ</label>
                                                            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full px-3 py-2 bg-slate-100 rounded-lg text-sm" />
                                                        </div>
                                                    </div>
                                                    <table className="w-full text-right border-collapse">
                                                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 text-sm">
                                                            <tr>
                                                                <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-700">م</th>
                                                                <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-700">تاريخ الإحالة</th>
                                                                <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-700">نوع الترخيص</th>
                                                                <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-700">الحالة</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                            {agentReferrals.map((r, i) => (
                                                                <tr key={r.id}>
                                                                    <td className="p-4 text-slate-500">{i + 1}</td>
                                                                    <td className="p-4 text-slate-800 dark:text-slate-200">
                                                                        {r.usedAt?.toDate ? r.usedAt.toDate().toLocaleString('ar-EG') : new Date(r.usedAt).toLocaleString('ar-EG')}
                                                                    </td>
                                                                    <td className="p-4 text-slate-800 dark:text-slate-200 font-medium">
                                                                        {r.licenseType}
                                                                    </td>
                                                                    <td className="p-4">
                                                                        {r.status === 'paid' ? (
                                                                            <span className="inline-block px-2 py-1 text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-md">تمت التصفية</span>
                                                                        ) : (
                                                                            <span className="inline-block px-2 py-1 text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-md">غير مدفوع</span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}

                                            {agentPayments.length > 0 && (
                                                <div className="mt-8">
                                                    <h4 className="font-bold text-slate-800 dark:text-white mb-4">سجل التحويلات والأرباح المدفوعة</h4>
                                                    <table className="w-full text-right border-collapse">
                                                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 text-sm">
                                                            <tr>
                                                                <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-700">التاريخ</th>
                                                                <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-700">المبلغ</th>
                                                                <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-700">طريقة التحويل</th>
                                                                <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-700">رقم مرجعي</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                            {agentPayments.map((p, i) => (
                                                                <tr key={p.id}>
                                                                    <td className="p-4 text-slate-500">
                                                                        {p.date?.toDate ? p.date.toDate().toLocaleString('ar-EG') : new Date(p.date).toLocaleString('ar-EG')}
                                                                    </td>
                                                                    <td className="p-4 text-emerald-600 font-black">${p.amount}</td>
                                                                    <td className="p-4 text-slate-800 dark:text-slate-200">{p.transferMethod}</td>
                                                                    <td className="p-4 text-slate-500 font-mono">{p.transactionId || '---'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                        </div>
                        <div className="p-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                             <button onClick={() => handleExport(viewLogsFor)} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition flex items-center justify-center gap-2">
                                <Download size={18} /> تصدير إكسيل
                            </button>
                            <button onClick={() => setViewLogsFor(null)} className="px-5 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition">
                                إغلاق
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal */}
            {isFormOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-scaleUp">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                                {editingId ? 'تعديل مسوق' : 'إضافة مسوق جديد'}
                            </h3>
                            <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">اسم المسوق</label>
                                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">نسبة العمولة (%)</label>
                                <input required type="number" min="0" max="100" step="0.1" value={formData.commissionRate} onChange={e => setFormData({...formData, commissionRate: Number(e.target.value)})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">الرقم القومي</label>
                                <input required type="text" value={formData.nationalId} onChange={e => setFormData({...formData, nationalId: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">رقم الموبايل</label>
                                <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" dir="ltr" placeholder="01X XXX XXXX" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">البريد الإلكتروني</label>
                                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" dir="ltr" placeholder="email@example.com" />
                            </div>

                            <div className="pt-4 flex gap-3 border-t border-slate-100 dark:border-slate-800 mt-6">
                                <button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                                    إلغاء
                                </button>
                                <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/30">
                                    حفظ
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Settle Modal */}
            {isSettleModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-scaleUp">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">تصفية ودفع أرباح المسوق</h3>
                            <button onClick={() => setIsSettleModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">✕</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">إجمالي الربح المعلق</label>
                                <input type="number" readOnly value={settleData.amount} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 text-slate-500 font-bold focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">طريقة التحويل / الدفع</label>
                                <input required type="text" value={settleData.transferMethod} onChange={e => setSettleData({...settleData, transferMethod: e.target.value})} placeholder="مثال: فودافون كاش, تحويل بنكي, الخ..." className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">رقم العملية / مرجع التحويل</label>
                                <input type="text" value={settleData.transactionId} onChange={e => setSettleData({...settleData, transactionId: e.target.value})} placeholder="الرقم المرجعي للعملية (اختياري)" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">ملاحظات إضافية</label>
                                <textarea value={settleData.notes} onChange={e => setSettleData({...settleData, notes: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" rows={3}></textarea>
                            </div>

                            <div className="pt-4 flex gap-3 border-t border-slate-100 dark:border-slate-800 mt-6">
                                <button type="button" onClick={() => setIsSettleModalOpen(false)} className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition">إلغاء</button>
                                <button onClick={handleSettleReferrals} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/30">تأكيد ودفع</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAffiliatesPage;
