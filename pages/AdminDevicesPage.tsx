import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, orderBy, deleteDoc, writeBatch, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { handleFirestoreError, OperationType } from '../services/firestoreErrorHandler';
import { createLicenseKey } from '../services/licenseService';
import { MonitorSmartphone, ShieldBan, ShieldAlert, User as UserIcon, Shield, Send, Trash2, ExternalLink, Copy, Check, Download, Upload, Activity, MapPin, Mail, Phone, Calendar, History } from 'lucide-react';
import { LicenseInfo, UserIdentity } from '../types';
import { useToasts } from '../hooks/useToasts';
import { exportToExcel, importFromExcel } from '../utils/importExportUtils';
import { toArabicIndic } from '../utils/localization';
import Button from '../components/ui/Button';

interface DeviceData {
    deviceId: string;
    ip: string;
    lastSeen: string;
    isBlocked: boolean;
    osInfo: string;
    // Attached derived info
    userName?: string;
    userEmail?: string;
    userPhone?: string;
    userCountry?: string;
    userRegisteredAt?: string;
    userUpdatedAt?: string;
    needsAdminDataCompletion?: boolean;
    licenseType?: string;
    licenseStatus?: string;
    licenseCreatedAt?: string;
    licenseActivatedAt?: string;
    licenseExpiresAt?: string;
    customerId?: string;
}

const AdminDevicesPage: React.FC = () => {
    const [devices, setDevices] = useState<DeviceData[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterOffline, setFilterOffline] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Message modal state
    const [messageModalOpen, setMessageModalOpen] = useState(false);
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState<DeviceData | null>(null);
    const [messageText, setMessageText] = useState('');
    const [sendingMessage, setSendingMessage] = useState(false);
    const [licensesListGlobal, setLicensesListGlobal] = useState<LicenseInfo[]>([]);
    const { addToast } = useToasts();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const handleCopy = (text: string, field: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        addToast('تم النسخ إلى الحافظة', 'success');
        setTimeout(() => setCopiedField(null), 2000);
    };

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

    const safeFormatDate = (date: any) => {
        if (!date) return 'غير متوفر';
        try {
            const d = date.toDate ? date.toDate() : new Date(date);
            if (isNaN(d.getTime())) return 'غير متوفر';
            return d.toLocaleDateString('ar-EG');
        } catch (e) {
            return 'غير متوفر';
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch devices
            const devicesSnap = await getDocs(query(collection(db, 'devices'), orderBy('lastSeen', 'desc')));
            const devicesList: DeviceData[] = [];
            devicesSnap.forEach(doc => {
                devicesList.push(doc.data() as DeviceData);
            });

            // Fetch licenses
            const licensesSnap = await getDocs(query(collection(db, 'licenses')));
            let licensesList: LicenseInfo[] = [];
            licensesSnap.forEach(doc => {
                licensesList.push({ ...doc.data(), licenseKey: doc.id } as LicenseInfo);
            });
            
            // Sort licenses so the most relevant/active ones come first
            licensesList.sort((a, b) => {
                if (a.status === 'active' && b.status !== 'active') return -1;
                if (a.status !== 'active' && b.status === 'active') return 1;
                // Both active or both inactive, sort by createdAt desc
                const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return timeB - timeA;
            });
            
            setLicensesListGlobal(licensesList);

            // Fetch customers
            const customersSnap = await getDocs(query(collection(db, 'customers')));
            const customersList: UserIdentity[] = [];
            customersSnap.forEach(doc => {
                customersList.push({ ...doc.data(), id: doc.id } as UserIdentity);
            });

            // Map data
            const enrichedDevices = devicesList.map(device => {
                const associatedLicense = licensesList.find(l => l.deviceId === device.deviceId || l.deviceIds?.includes(device.deviceId));
                let userName = 'غير معروف';
                let userEmail = '';
                let userPhone = '';
                let licenseType = 'غير معروف';
                let licenseStatus = 'غير معروف';
                let licenseCreatedAt = '';
                let licenseActivatedAt = '';
                let licenseExpiresAt = '';
                let customerId;

                // Try to find customer by customerId in device first
                let customer = device.customerId ? customersList.find(c => c.id === device.customerId) : null;

                // If not found, try to find customer from associated license
                if (!customer && associatedLicense) {
                    customer = customersList.find(c => c.id === associatedLicense.customerId) || null;
                }
                
                // If no customer found from license, try to find customer who directly owns this deviceId
                if (!customer) {
                    customer = customersList.find(c => (c as any).deviceId === device.deviceId) || null;
                }

                if (customer) {
                    userName = customer.name;
                    userEmail = customer.email;
                    userPhone = customer.phone;
                    customerId = customer.id;
                }

                if (associatedLicense) {
                    licenseType = associatedLicense.type;
                    licenseStatus = associatedLicense.status;
                    licenseCreatedAt = associatedLicense.createdAt;
                    licenseActivatedAt = associatedLicense.activatedAt || '';
                    licenseExpiresAt = associatedLicense.expiresAt || '';
                } else if (customer) {
                    // Try to guess license from customer directly if they don't have a formal license mapping
                    licenseType = (customer as any).licenseType || (customer as any).plan || 'نسخة مجانية';
                }

                return {
                    ...device,
                    userName,
                    userEmail,
                    userPhone,
                    userCountry: customer?.country || 'غير محدد',
                    userRegisteredAt: customer?.registeredAt || '',
                    userUpdatedAt: (customer as any)?.updatedAt || '',
                    needsAdminDataCompletion: (customer as any)?.needsAdminDataCompletion || false,
                    licenseType,
                    licenseStatus,
                    licenseCreatedAt,
                    licenseActivatedAt,
                    licenseExpiresAt,
                    customerId
                };
            });

            setDevices(enrichedDevices);
        } catch (e: any) {
            handleFirestoreError(e, OperationType.GET, 'admin_devices_data');
            if (e.message?.includes('permission-denied') || e.code === 'permission-denied') {
                 addToast('عفواً، لا تملك صلاحية الوصول لهذه البيانات. تأكد من تسجيل دخولك كمسؤول.', 'error');
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                const isAdmin = user.email === 'm7mdshipl@gmail.com' || user.email === 'admin@techno.com';
                if (isAdmin) {
                    fetchData();
                } else {
                    addToast('عفواً، لا تملك صلاحية الوصول لهذه الصفحة.', 'error');
                    setLoading(false);
                }
            } else {
                // Not authenticated
                setLoading(false);
            }
        });
        
        return () => unsubscribe();
    }, []);

    const toggleBlock = async (device: DeviceData) => {
        const confirmMsg = device.isBlocked 
            ? "هل أنت متأكد من فك الحظر عن هذا الجهاز؟" 
            : "هل أنت متأكد من حظر هذا الجهاز؟ سيتم إيقاف النظام لديه فوراً.";
            
        if (!window.confirm(confirmMsg)) return;

        const path = `devices/${device.deviceId}`;
        try {
            await updateDoc(doc(db, 'devices', device.deviceId), {
                isBlocked: !device.isBlocked
            });
            // Update local state
            setDevices(prev => prev.map(d => 
                d.deviceId === device.deviceId ? { ...d, isBlocked: !d.isBlocked } : d
            ));
        } catch (e) {
            handleFirestoreError(e, OperationType.UPDATE, path);
        }
    };

    const openMessageModal = (device: DeviceData) => {
        setSelectedDevice(device);
        setMessageText('');
        setMessageModalOpen(true);
    };

    const sendMessage = async () => {
        if (!selectedDevice || !messageText.trim()) return;
        setSendingMessage(true);
        const path = `devices/${selectedDevice.deviceId}`;
        try {
            await updateDoc(doc(db, 'devices', selectedDevice.deviceId), {
                adminMessage: messageText.trim(),
                adminMessageTimestamp: Date.now()
            });
            alert('تم إرسال الرسالة بنجاح.');
            setMessageModalOpen(false);
        } catch (e) {
            handleFirestoreError(e, OperationType.UPDATE, path);
        }
        setSendingMessage(false);
    };

    const getPlanLabel = (type: string) => {
        const rawPlanText = type.split(' ')[0];
        const PLAN_LABELS: Record<string, string> = {
            'Free': 'باقة مجانية الدائمة',
            'Trial': 'فترة تجريبية',
            'Monthly': 'باقة شهرية',
            'Semiannual': 'باقة نصف سنوية',
            'Yearly': 'باقة سنوية',
            'Lifetime': 'مدى الحياة',
            'Basic': 'الباقة الأساسية',
            'Pro': 'باقة المحترفين',
            'Business': 'باقة الأعمال'
        };
        return PLAN_LABELS[rawPlanText] || type;
    };


    const isDeviceOfflineOver15Days = (lastSeen: string) => {
        const lastSeenDate = new Date(lastSeen).getTime();
        const now = Date.now();
        const diffMs = now - lastSeenDate;
        return diffMs > 15 * 24 * 60 * 60 * 1000;
    };

    const sendDataUpdateRequest = async (device: DeviceData) => {
        try {
            // First attempt to update via associated customer document
            if (device.customerId) {
                await updateDoc(doc(db, 'customers', device.customerId), { 
                    needsAdminDataCompletion: true,
                    lastDataUpdateReqAt: new Date().toISOString()
                });
            } else {
                // If it's pure device, we set it on the device directly
                await updateDoc(doc(db, 'devices', device.deviceId), {
                    needsDataCompletion: true
                });
            }
            
            // Also notify the device through device_notifications just in case
            await setDoc(doc(collection(db, 'device_notifications')), {
                targetId: device.customerId || device.deviceId,
                title: 'تحديث البيانات',
                body: 'الإدارة تطلب تحديث بياناتك الخاصة بالنظام.',
                type: 'INFO',
                sentAt: new Date().toISOString(),
                isRead: false
            });
            
            addToast('تم إرسال طلب إكمال البيانات الجهاز بنجاح', 'success');
        } catch (e) {
            handleFirestoreError(e, OperationType.UPDATE, `devices/${device.deviceId}`);
            addToast('حدث خطأ أثناء الإرسال', 'error');
        }
    };

    const handleBulkDataUpdateReq = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`هل أنت متأكد من طلب تحديث بيانات لـ ${selectedIds.length} جهاز/عميل؟`)) return;
        
        try {
            setLoading(true);
            const batch = writeBatch(db);
            const selectedDevices = devices.filter(d => selectedIds.includes(d.deviceId));
            
            for (const device of selectedDevices) {
                const targetRef = device.customerId 
                    ? doc(db, 'customers', device.customerId)
                    : doc(db, 'devices', device.deviceId);
                
                batch.update(targetRef, {
                    [device.customerId ? 'needsAdminDataCompletion' : 'needsDataCompletion']: true,
                    lastDataUpdateReqAt: new Date().toISOString()
                });
                
                // Add notification
                const notifRef = doc(collection(db, 'device_notifications'));
                batch.set(notifRef, {
                    targetId: device.customerId || device.deviceId,
                    title: 'تحديث بيانات الحساب',
                    body: 'يرجى الدخول إلى النظام لتحديث بيانات الحساب والاشتراك الخاصة بك بأسرع وقت.',
                    type: 'INFO',
                    sentAt: new Date().toISOString(),
                    isRead: false
                });
            }
            
            await batch.commit();
            addToast('تم طلب تحديث البيانات بنجاح', 'success');
        } catch (error) {
            console.error(error);
            addToast('حدث خطأ أثناء طلب البيانات', 'error');
        } finally {
            setLoading(false);
            fetchData();
        }
    };

    const deleteDevice = async (device: DeviceData) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا الجهاز بشكل كامل من النظام؟ سيفقد اتصاله ولن يتمكن من الدخول ولكن سيبقى حساب العميل بدون ترخيص حالي.')) return;
        
        const path = `devices/${device.deviceId}`;
        try {
            // Unlink from license if possible
            const license = licensesListGlobal.find(l => l.deviceId === device.deviceId || l.deviceIds?.includes(device.deviceId));
            if (license) {
                const licenseRef = doc(db, 'licenses', license.licenseKey);
                if (license.maxDevices && license.maxDevices > 1) {
                    const newIds = (license.deviceIds || []).filter(id => id !== device.deviceId);
                    await updateDoc(licenseRef, { deviceIds: newIds });
                } else {
                    await updateDoc(licenseRef, { deviceId: null, status: 'pending' });
                }
            }
            
            // Delete from devices collection
            await deleteDoc(doc(db, 'devices', device.deviceId));
            
            // Delete local state
            setDevices(prev => prev.filter(d => d.deviceId !== device.deviceId));
            alert('تم حذف الجهاز وفك ارتباط الترخيص به بنجاح.');
        } catch (e) {
            handleFirestoreError(e, OperationType.DELETE, path);
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`هل أنت متأكد من حذف ${selectedIds.length} جهاز؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
        
        try {
            const batch = writeBatch(db);
            const devicesToDelete = devices.filter(d => selectedIds.includes(d.deviceId));
            
            for (const device of devicesToDelete) {
                // Unlink from license if possible
                const license = licensesListGlobal.find(l => l.deviceId === device.deviceId || l.deviceIds?.includes(device.deviceId));
                if (license) {
                    const licenseRef = doc(db, 'licenses', license.licenseKey);
                    if (license.maxDevices && license.maxDevices > 1) {
                        const newIds = (license.deviceIds || []).filter(id => id !== device.deviceId);
                        batch.update(licenseRef, { deviceIds: newIds });
                    } else {
                        batch.update(licenseRef, { deviceId: null, status: 'pending' });
                    }
                }
                batch.delete(doc(db, 'devices', device.deviceId));
            }
            
            await batch.commit();
            addToast('تم حذف الأجهزة المحددة بنجاح', 'success');
            setDevices(prev => prev.filter(d => !selectedIds.includes(d.deviceId)));
            setSelectedIds([]);
        } catch (error) {
            console.error(error);
            addToast('حدث خطأ أثناء حذف الأجهزة', 'error');
        }
    };

    const deleteUnknownDevices = async () => {
        const unknownDevices = devices.filter(d => d.licenseType === 'غير معروف' || !d.licenseType);
        if (unknownDevices.length === 0) {
            alert('لا توجد أجهزة غير معروفة للحذف.');
            return;
        }
        if (!window.confirm(`هل أنت متأكد من حذف ${unknownDevices.length} جهاز غير معروف؟`)) return;

        try {
            const batch = writeBatch(db);
            unknownDevices.forEach(d => {
                batch.delete(doc(db, 'devices', d.deviceId));
            });
            await batch.commit();
            setDevices(prev => prev.filter(d => d.licenseType !== 'غير معروف' && d.licenseType));
            alert('تم حذف الأجهزة غير المعروفة بنجاح.');
        } catch (e) {
            console.error(e);
            alert('حدث خطأ أثناء الحذف.');
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const data = await importFromExcel(file);
            setLoading(true);
            let importedCount = 0;
            const batch = writeBatch(db);
            
            for (const item of data) {
                let id = item.deviceId;
                if (!id) {
                    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                    id = 'dev-';
                    for (let i = 0; i < 12; i++) {
                        id += chars.charAt(Math.floor(Math.random() * chars.length));
                    }
                }
                const docRef = doc(db, 'devices', id);
                batch.set(docRef, { ...item, deviceId: id }, { merge: true });
                importedCount++;
            }
            
            await batch.commit();
            addToast(`تم استيراد ${importedCount} جهاز بنجاح`, 'success');
            await fetchData();
        } catch (error) {
            console.error(error);
            addToast('حدث خطأ أثناء الاستيراد', 'error');
            setLoading(false);
        }
        
        e.target.value = '';
    };

    const handleExport = () => {
        exportToExcel(filteredDevices, 'devices_export');
        addToast('تم التصدير بنجاح', 'success');
    };

    const filteredDevices = devices.filter(d => {
        if (filterOffline && !isDeviceOfflineOver15Days(d.lastSeen)) return false;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            return (
                d.deviceId.toLowerCase().includes(term) ||
                d.ip?.toLowerCase().includes(term) ||
                d.userName?.toLowerCase().includes(term) ||
                d.userPhone?.toLowerCase().includes(term) ||
                d.userEmail?.toLowerCase().includes(term) ||
                d.osInfo?.toLowerCase().includes(term)
            );
        }
        return true;
    });

    return (
        <div className="max-w-6xl mx-auto" dir="rtl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                        <MonitorSmartphone size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 dark:text-white mb-1">إدارة الأجهزة (IPs)</h1>
                        <p className="text-slate-500 font-medium">مراقبة الأجهزة، العملاء، وحالة الحظر</p>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                    <button 
                        onClick={() => toggleSelectAll(filteredDevices.map(d => d.deviceId))}
                        className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all flex items-center justify-center whitespace-nowrap ${selectedIds.length === filteredDevices.length && filteredDevices.length > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                    >
                        تحديد الكل {selectedIds.length > 0 && `(${selectedIds.length})`}
                    </button>
                    {selectedIds.length > 0 && (
                        <>
                            <button 
                                onClick={handleBulkDataUpdateReq}
                                className="px-4 py-2 rounded-xl text-sm font-bold bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-all flex items-center justify-center whitespace-nowrap"
                            >
                                <Activity size={16} className="me-2" />
                                طلب تحديث ({selectedIds.length})
                            </button>
                            <button 
                                onClick={handleDeleteSelected}
                                className="px-4 py-2 rounded-xl text-sm font-bold bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition-all flex items-center justify-center whitespace-nowrap"
                            >
                                <Trash2 size={16} className="me-2" />
                                حذف المحدد
                            </button>
                        </>
                    )}
                    <input type="file" id="import-devices" accept=".xlsx, .xls" className="hidden" onChange={handleImport} />
                    <label htmlFor="import-devices">
                        <button 
                            onClick={() => document.getElementById('import-devices')?.click()}
                            className="px-4 py-2 rounded-xl text-sm font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-all flex items-center justify-center whitespace-nowrap"
                        >
                            <Upload size={16} className="me-2" />
                            استيراد
                        </button>
                    </label>
                    <button 
                        onClick={handleExport}
                        className="px-4 py-2 rounded-xl text-sm font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-all flex items-center justify-center whitespace-nowrap"
                    >
                        <Download size={16} className="me-2" />
                        تصدير
                    </button>
                    <button 
                        onClick={deleteUnknownDevices}
                        className="px-4 py-2 rounded-xl text-sm font-bold bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/30 transition-all flex items-center justify-center whitespace-nowrap"
                    >
                        <Trash2 size={16} className="me-2" />
                        تصفية المجهولين
                    </button>
                    <input 
                        type="text"
                        placeholder="ابحث عن جهاز، عميل..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 outline-none w-48 focus:w-64 transition-all"
                    />
                    <button 
                        onClick={() => setFilterOffline(!filterOffline)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filterOffline ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                    >
                        {filterOffline ? 'إلغاء التصفية' : 'تصفية الأجهزة المنقطعة (+15 يوم)'}
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden">
                {loading ? (
                    <div className="p-10 text-center text-slate-500">جاري التحميل...</div>
                ) : filteredDevices.length === 0 ? (
                    <div className="p-10 text-center text-slate-500">لا توجد أجهزة مطابقة للبحث</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                    <th className="p-4 font-bold text-slate-600 dark:text-slate-300 w-12 text-center">التحديد</th>
                                    <th className="p-4 font-bold text-slate-600 dark:text-slate-300">الجهاز (IP)</th>
                                    <th className="p-4 font-bold text-slate-600 dark:text-slate-300">معلومات العميل</th>
                                    <th className="p-4 font-bold text-slate-600 dark:text-slate-300">آخر تحقق من الجهاز</th>
                                    <th className="p-4 font-bold text-slate-600 dark:text-slate-300">سجل الاشتراك</th>
                                    <th className="p-4 font-bold text-slate-600 dark:text-slate-300 text-center">إجراء / حالة</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDevices.map((device) => (
                                    <tr key={device.deviceId} onClick={() => { setSelectedDevice(device); setDetailsModalOpen(true); }} className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${device.isBlocked ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                                        <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                            <input 
                                                type="checkbox" 
                                                checked={selectedIds.includes(device.deviceId)} 
                                                onChange={() => toggleSelection(device.deviceId)}
                                                className="w-4 h-4 text-indigo-600 rounded bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:ring-indigo-500"
                                            />
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-slate-800 dark:text-white flex items-center justify-between gap-2">
                                                <span dir="ltr">{device.ip}</span>
                                                <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(device.ip); addToast('تم النسخ', 'success'); }} className="text-slate-400 hover:text-indigo-500"><Copy size={12}/></button>
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-slate-400 font-mono mt-1 gap-2" title={device.deviceId}>
                                                <span className="truncate">{device.deviceId}</span>
                                                <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(device.deviceId); addToast('تم النسخ', 'success'); }} className="text-slate-400 hover:text-indigo-500 shrink-0"><Copy size={12}/></button>
                                            </div>
                                            <div className="text-xs text-slate-500 font-mono line-clamp-1 mt-1 max-w-[150px]" title={device.osInfo}>
                                                {device.osInfo}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                                                <UserIcon size={14} className="text-slate-400" />
                                                {device.userName}
                                            </div>
                                            {device.userPhone && (
                                                <div className="text-xs text-slate-500 mt-1.5 font-mono" dir="ltr">
                                                    {device.userPhone}
                                                </div>
                                            )}
                                            {device.userEmail && (
                                                <div className="text-xs text-slate-500 mt-0.5 max-w-[120px] truncate" title={device.userEmail}>
                                                    {device.userEmail}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm font-medium text-slate-600 dark:text-slate-300" title="آخر مرة تم فيها الاتصال والتحقق من صلاحية الترخيص">
                                                {new Date(device.lastSeen).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </div>
                                            <div className="text-xs text-slate-400 mt-0.5">
                                                {new Date(device.lastSeen).toLocaleTimeString('ar-EG')}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="mb-2">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
                                                    <Shield size={12} className={device.licenseStatus === 'active' ? 'text-emerald-500' : 'text-slate-400'} />
                                                    {getPlanLabel(device.licenseType || '')}
                                                </span>
                                            </div>
                                            {device.licenseActivatedAt && (
                                                <div className="text-xs text-slate-500 mb-0.5">
                                                    <span className="opacity-70">التفعيل:</span> {new Date(device.licenseActivatedAt).toLocaleDateString('ar-EG')}
                                                </div>
                                            )}
                                            {device.licenseExpiresAt && (
                                                <div className="text-xs text-rose-500 font-medium">
                                                    <span className="opacity-70 text-slate-500">الانتهاء:</span> {new Date(device.licenseExpiresAt).toLocaleDateString('ar-EG')}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex flex-col items-center gap-2">
                                                {device.isBlocked ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-red-700 text-xs font-black">
                                                        <ShieldAlert size={12} /> محظور
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-emerald-700 text-xs font-black opacity-80">
                                                        <ShieldBan size={12} /> نشط
                                                    </span>
                                                )}
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => toggleBlock(device)}
                                                        className={`px-3 py-1.5 rounded transition-colors text-xs font-bold w-24 ${
                                                            device.isBlocked 
                                                            ? 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600' 
                                                            : 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-500/20 dark:hover:bg-red-500/30'
                                                        }`}
                                                    >
                                                        {device.isBlocked ? 'فك الحظر' : 'حظر الجهاز'}
                                                    </button>
                                                    <button
                                                        onClick={() => openMessageModal(device)}
                                                        className="px-3 py-1.5 rounded bg-indigo-100 text-indigo-600 hover:bg-indigo-200 dark:bg-indigo-500/20 dark:hover:bg-indigo-500/30 transition-colors text-xs font-bold flex items-center justify-center"
                                                        title="إرسال رسالة للجهاز"
                                                    >
                                                        <Send size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (!confirm('هل أنت متأكد من إرسال طلب تکملة / تحديث البيانات لهذا الجهاز؟')) return;
                                                            sendDataUpdateRequest(device);
                                                        }}
                                                        className="px-3 py-1.5 rounded bg-amber-100 text-amber-600 hover:bg-amber-200 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 transition-colors text-xs font-bold flex items-center justify-center whitespace-nowrap"
                                                        title="تحديث البيانات"
                                                    >
                                                        <ExternalLink size={14} className="ml-1" />
                                                        طلب تحديث بيانات
                                                    </button>
                                                    <button
                                                        onClick={() => deleteDevice(device)}
                                                        className="px-3 py-1.5 rounded bg-rose-100 text-rose-600 hover:bg-rose-200 dark:bg-rose-500/20 dark:hover:bg-rose-500/30 transition-colors text-xs font-bold flex items-center justify-center"
                                                        title="حذف الجهاز من النظام"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal إرسال رسالة */}
            {messageModalOpen && selectedDevice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scaleUp">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Send size={20} className="text-indigo-500" />
                                إرسال رسالة للنظام
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">
                                سيتم عرض هذه الرسالة للعميل فور اتصاله بالإنترنت.
                                ({selectedDevice.userName})
                            </p>
                        </div>
                        <div className="p-6">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                نص الرسالة
                            </label>
                            <textarea
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                className="w-full h-32 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none text-slate-800 dark:text-white"
                                placeholder="اكتب رسالتك هنا..."
                            ></textarea>
                            
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={sendMessage}
                                    disabled={sendingMessage || !messageText.trim()}
                                    className="flex-1 bg-indigo-600 text-white font-bold py-2.5 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                                >
                                    {sendingMessage ? 'جاري الإرسال...' : 'إرسال'}
                                </button>
                                <button
                                    onClick={() => setMessageModalOpen(false)}
                                    className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-2.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal عرض بيانات الجهاز */}
            {detailsModalOpen && selectedDevice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-scaleUp">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <MonitorSmartphone size={20} className="text-indigo-500" />
                                تفاصيل الجهاز والترخيص المطول
                            </h3>
                            <button onClick={() => setDetailsModalOpen(false)} className="text-slate-500 hover:text-slate-800 dark:hover:text-white bg-slate-200 dark:bg-slate-700 w-8 h-8 rounded-full">
                                &times;
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[80vh] space-y-6 text-right">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-5 rounded-3xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-5">
                                        <UserIcon size={120} />
                                    </div>
                                    <h4 className="text-sm font-black text-indigo-500 mb-4 flex items-center gap-2">
                                        <UserIcon size={16} /> ملف العميل بالكامل
                                    </h4>
                                    <div className="space-y-3 relative z-10">
                                        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
                                            <span className="text-slate-500 font-bold text-xs">الاسم:</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-800 dark:text-white font-black">{selectedDevice.userName}</span>
                                                <button 
                                                    onClick={() => handleCopy(selectedDevice.userName || '', 'name')}
                                                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors text-slate-400 hover:text-indigo-500"
                                                    title="نسخ الاسم"
                                                >
                                                    {copiedField === 'name' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
                                            <span className="text-slate-500 font-bold text-xs">رقم الهاتف:</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-800 dark:text-white font-mono font-bold" dir="ltr">{selectedDevice.userPhone || 'غير متوفر'}</span>
                                                {selectedDevice.userPhone && (
                                                    <button 
                                                        onClick={() => handleCopy(selectedDevice.userPhone!, 'phone')}
                                                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors text-slate-400 hover:text-indigo-500"
                                                        title="نسخ رقم الهاتف"
                                                    >
                                                        {copiedField === 'phone' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
                                            <span className="text-slate-500 font-bold text-xs">البريد:</span>
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <span className="text-slate-800 dark:text-white font-mono text-sm truncate max-w-[120px]" title={selectedDevice.userEmail}>{selectedDevice.userEmail || 'غير متوفر'}</span>
                                                {selectedDevice.userEmail && (
                                                    <button 
                                                        onClick={() => handleCopy(selectedDevice.userEmail!, 'email')}
                                                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors text-slate-400 hover:text-indigo-500 shrink-0"
                                                        title="نسخ البريد"
                                                    >
                                                        {copiedField === 'email' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
                                            <span className="text-slate-500 font-bold text-xs">الدولة:</span>
                                            <span className="text-slate-800 dark:text-white font-bold flex items-center gap-1">
                                                <MapPin size={12} className="text-rose-500" />
                                                {selectedDevice.userCountry}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500 font-bold text-xs">تاريخ الانضمام:</span>
                                            <span className="text-slate-800 dark:text-white font-bold text-xs">{toArabicIndic(safeFormatDate(selectedDevice.userRegisteredAt))}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-5 rounded-3xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                    <h4 className="text-sm font-black text-indigo-500 mb-4 flex items-center gap-2">
                                        <MonitorSmartphone size={16} /> معلومات الجهاز والهوية
                                    </h4>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
                                            <span className="text-slate-500 font-bold text-xs">عنوان الـ IP:</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-800 dark:text-white font-black font-mono" dir="ltr">{selectedDevice.ip}</span>
                                                <button 
                                                    onClick={() => handleCopy(selectedDevice.ip, 'ip')}
                                                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors text-slate-400 hover:text-indigo-500"
                                                    title="نسخ عنوان IP"
                                                >
                                                    {copiedField === 'ip' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex flex-col border-b border-slate-200 dark:border-slate-800 pb-2">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-slate-500 font-bold text-xs">المعرف الفريد (HWID):</span>
                                                <button 
                                                    onClick={() => handleCopy(selectedDevice.deviceId, 'hwid')}
                                                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors text-slate-400 hover:text-indigo-500"
                                                    title="نسخ المعرف الفريد"
                                                >
                                                    {copiedField === 'hwid' ? <Check size={14} className="text-emerald-500" /> : <Copy size={16} />}
                                                </button>
                                            </div>
                                            <span className="text-slate-800 dark:text-white font-mono text-[10px] bg-slate-200 dark:bg-slate-800 p-2 rounded-xl break-all leading-tight">{selectedDevice.deviceId}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-slate-500 font-bold text-xs mb-1">نظام التشغيل:</span>
                                            <span className="text-slate-600 dark:text-slate-400 text-xs italic line-clamp-2">{selectedDevice.osInfo}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-5 rounded-3xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20">
                                <h4 className="text-sm font-black text-indigo-600 dark:text-indigo-400 mb-4 flex items-center gap-2">
                                    <Shield size={16} /> تفاصيل الترخيص والاشتراك المرتبط
                                </h4>
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                        <div className="text-[10px] font-black text-slate-400 uppercase mb-1">نوع الباقة</div>
                                        <div className="font-black text-indigo-600 dark:text-indigo-400">{getPlanLabel(selectedDevice.licenseType || '')}</div>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                        <div className="text-[10px] font-black text-slate-400 uppercase mb-1">حالة الترخيص</div>
                                        <div className="font-black">
                                            {selectedDevice.licenseStatus === 'active' ? (
                                                <span className="text-emerald-500">نشط وصالح</span>
                                            ) : (
                                                <span className="text-slate-500">{selectedDevice.licenseStatus || 'معلق'}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="col-span-2 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="text-[10px] font-black text-slate-400 uppercase">المفتاح النشط</div>
                                            <button 
                                                onClick={() => {
                                                    const key = licensesListGlobal.find(l => l.deviceId === selectedDevice.deviceId || l.deviceIds?.includes(selectedDevice.deviceId))?.licenseKey;
                                                    if (key) handleCopy(key, 'license');
                                                }}
                                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors text-slate-400 hover:text-indigo-500"
                                                title="نسخ مفتاح الترخيص"
                                            >
                                                {copiedField === 'license' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                            </button>
                                        </div>
                                        <div className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 truncate">
                                            {licensesListGlobal.find(l => l.deviceId === selectedDevice.deviceId || l.deviceIds?.includes(selectedDevice.deviceId))?.licenseKey || 'لا يوجد ترخيص نشط'}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-indigo-100 dark:border-indigo-500/10">
                                    <div className="flex items-center gap-3">
                                        <Calendar size={20} className="text-slate-400" />
                                        <div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase">تاريخ التفعيل</div>
                                            <div className="font-bold text-slate-800 dark:text-white text-sm" dir="ltr">
                                                {toArabicIndic(safeFormatDate(selectedDevice.licenseActivatedAt))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <History size={20} className="text-rose-400" />
                                        <div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase">تاريخ الانتهاء</div>
                                            <div className="font-black text-rose-500 text-sm" dir="ltr">
                                                {toArabicIndic(safeFormatDate(selectedDevice.licenseExpiresAt))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Activity size={20} className={selectedDevice.needsAdminDataCompletion ? 'text-amber-500' : 'text-emerald-500'} />
                                        <div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase">حالة البيانات</div>
                                            <div className="font-bold text-slate-800 dark:text-white text-sm">
                                                {selectedDevice.needsAdminDataCompletion ? 'تحديث مطلوب' : 'مكتملة ومحدثة'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex gap-4">
                                <Button 
                                    onClick={() => {
                                        if (!confirm('هل أنت متأكد من إرسال طلب تحديث البيانات؟')) return;
                                        sendDataUpdateRequest(selectedDevice);
                                    }}
                                    variant="secondary"
                                    className="flex-1 gap-2 font-black h-12"
                                >
                                    <ExternalLink size={20} /> طلب تحديث البيانات فوراً
                                </Button>
                                <Button 
                                    onClick={() => toggleBlock(selectedDevice)}
                                    variant={selectedDevice.isBlocked ? 'outline' : 'danger'}
                                    className="flex-1 gap-2 font-black h-12"
                                >
                                    {selectedDevice.isBlocked ? <ShieldBan size={20} /> : <ShieldAlert size={20} />}
                                    {selectedDevice.isBlocked ? 'فك حظر الجهاز' : 'حظر الجهاز نهائياً'}
                                </Button>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex justify-end gap-2">
                            <button onClick={() => setDetailsModalOpen(false)} className="px-6 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold rounded-xl transition-all">
                                إغلاق
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDevicesPage;
