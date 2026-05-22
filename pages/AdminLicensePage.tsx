
import React, { useState, useEffect } from 'react';
import { getAllLicenses, createLicenseKey, updateLicenseStatus, resetLicenseDevice, LicenseInfo, deleteLicenseKey, renewLicense, updateLicenseMaxDevices } from '../services/licenseService';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Key, Plus, RefreshCw, Shield, Trash2, Ban, CheckCircle, Smartphone, LogIn, ArrowLeft, Copy, PlayCircle, CheckSquare, Square, Download, Upload } from 'lucide-react';
import { toArabicIndic } from '../utils/localization';
import { auth, db } from '../services/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { useToasts } from '../hooks/useToasts';
import { exportToExcel, importFromExcel } from '../utils/importExportUtils';

const AdminLicensePage: React.FC = () => {
    const navigate = useNavigate();
    const { addToast } = useToasts();
    const [licenses, setLicenses] = useState<LicenseInfo[]>([]);
    const [newKey, setNewKey] = useState('');
    const [newType, setNewType] = useState<'Monthly' | 'Semiannual' | 'Yearly' | 'Lifetime' | 'Basic' | 'Pro' | 'Business' | 'Basic Year' | 'Pro Year' | 'Business Year'>('Basic');
    const [newDeviceId, setNewDeviceId] = useState('');
    const [newMaxDevices, setNewMaxDevices] = useState(1);
    const [newCustomerPhone, setNewCustomerPhone] = useState('');
    const [newCustomerName, setNewCustomerName] = useState('');
    const [keyCount, setKeyCount] = useState(1);
    const [search, setSearch] = useState('');
    const [filterPlan, setFilterPlan] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

    const [loading, setLoading] = useState(false);
    const [fbUser, setFbUser] = useState(auth.currentUser);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setFbUser(user);
            if (user) load();
        });
        return () => unsubscribe();
    }, []);

    const load = async () => {
        setLoading(true);
        try {
            const data = await getAllLicenses();
            setLicenses(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const generateRandomKeyString = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let key = '';
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                key += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            if (i < 3) key += '-';
        }
        return key;
    };

    const handleExport = () => {
        const dataToExport = selectedIds.length > 0 ? licenses.filter(l => selectedIds.includes(l.licenseKey)) : filteredLicenses;
        exportToExcel(dataToExport, 'licenses_export');
        addToast('تم التصدير بنجاح', 'success');
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLoading(true);
        try {
            const data = await importFromExcel(file);
            let importedCount = 0;
            // Simplistic import: generate keys if missing, or use existing (assuming structure matches LicenseInfo)
            // It will import one by one.
            for(const row of data) {
                 const key = row.licenseKey || generateRandomKeyString();
                 await createLicenseKey(key, row.type || 'Pro', row.deviceId || null, row.maxDevices || 1, row.customerName, row.customerPhone);
                 importedCount++;
            }
            addToast(`تم استيراد ${importedCount} ترخيص`);
            load();
        } catch(err) {
            console.error(err);
            alert('فشل الاستيراد');
        } finally {
            setLoading(false);
            if(e.target) e.target.value = '';
        }
    };

    const handleCreate = async () => {
        if (!auth.currentUser) {
            alert('يجب تسجيل الدخول باستخدام Google أولاً لتتمكن من إنشاء مفاتيح.');
            return;
        }
        
        try {
            setLoading(true);
            if (keyCount > 1) {
                // Bulk creation
                for (let i = 0; i < keyCount; i++) {
                    const generatedKey = generateRandomKeyString();
                    await createLicenseKey(generatedKey, newType, null, newMaxDevices);
                }
            } else {
                // Single creation
                if (!newKey) {
                    alert('يرجى إدخال مفتاح الترخيص أو توليده عشوائياً');
                    setLoading(false);
                    return;
                }
                await createLicenseKey(newKey, newType, newDeviceId || null, newMaxDevices, newCustomerName, newCustomerPhone);
            }
            setNewKey('');
            setNewDeviceId('');
            setNewCustomerName('');
            setNewCustomerPhone('');
            setKeyCount(1);
            setNewMaxDevices(1);
            await load();
        } catch (e: any) {
            console.error("License Creation Error:", e);
            alert('حدث خطأ أثناء الإنشاء. تأكد أنك مسجل دخول بحساب الأدمن الصحيح.');
        } finally {
            setLoading(false);
        }
    };

    const handleFbLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (e) {
            console.error("Firebase Login Error:", e);
            alert('فشل تسجيل الدخول إلى Firebase');
        }
    };

    const handleStatusChange = async (key: string, status: 'active' | 'blocked' | 'pending') => {
        try {
            await updateLicenseStatus(key, status);
            load();
        } catch (e) {
            alert('فشل تحديث الحالة');
        }
    };

    const handleReset = async (key: string) => {
        if (!confirm('هل تريد مسح الجهاز المرتبط بهذا الترخيص؟ سيتمكن المستخدم من تفعيله على جهاز جديد.')) return;
        try {
            await resetLicenseDevice(key);
            load();
        } catch (e) {
            alert('فشل إعادة تعيين الجهاز');
        }
    };

    const handleDelete = async (key: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا المفتاح نهائياً؟')) return;
        try {
            await deleteLicenseKey(key);
            load();
        } catch (e) {
            alert('فشل الحذف');
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`هل أنت متأكد من حذف ${selectedIds.length} ترخيص؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
        
        try {
            for (const id of selectedIds) {
                await deleteLicenseKey(id);
            }
            addToast('تم حذف التراخيص المحددة بنجاح', 'success');
            load();
            setSelectedIds([]);
        } catch (error) {
            console.error(error);
            addToast('حدث خطأ أثناء الحذف', 'error');
        }
    };

    const handleCopy = (key: string) => {
        navigator.clipboard.writeText(key);
        alert('تم نسخ المفتاح');
    };

    const handleRenew = async (key: string) => {
        if (!confirm('هل أنت متأكد من تجديد التخخيص وبدء فترة جديدة كلياً؟')) return;
        try {
            await renewLicense(key);
            addToast('تم تجديد الترخيص بنجاح', 'success');
            load();
        } catch (e: any) {
            alert('فشل تجديد الترخيص: ' + e.message);
        }
    };

    const handleUpdateMaxDevices = async (key: string, currentVal: number) => {
        const newVal = prompt('الحد الأقصى المسموح للأجهزة:', (currentVal || 1).toString());
        if (!newVal) return;
        const parsed = parseInt(newVal);
        if(isNaN(parsed) || parsed < 1) {
            alert('قيمة غير صالحة');
            return;
        }
        try {
            await updateLicenseMaxDevices(key, parsed);
            load();
        } catch(e) {
            alert('فشل التحديث');
        }
    };

    const generateRandomKey = () => {
        setNewKey(generateRandomKeyString());
    };

    const filteredLicenses = licenses.filter(lic => {
        const matchesSearch = lic.licenseKey.toLowerCase().includes(search.toLowerCase()) || 
                              (lic.deviceId && lic.deviceId.toLowerCase().includes(search.toLowerCase()));
        
        const matchesPlan = filterPlan === 'all' || lic.type === filterPlan;
        const matchesStatus = filterStatus === 'all' || lic.status === filterStatus;

        let matchesDate = true;
        if (fromDate || toDate) {
            const createdAtStr = (lic as any).createdAt; // Might not exist if old, but we check
            if (createdAtStr) {
                const createdAtDate = new Date(createdAtStr);
                const fromP = fromDate ? new Date(fromDate) : new Date(0);
                const toP = toDate ? new Date(toDate) : new Date(9999,11,31);
                
                // Adjust toP to end of day
                toP.setHours(23, 59, 59, 999);
                fromP.setHours(0, 0, 0, 0);

                matchesDate = createdAtDate >= fromP && createdAtDate <= toP;
            } else {
                // If it doesn't have a createdAt date, we might exclude it or include it. Let's include if no date.
                matchesDate = true; 
            }
        }

        return matchesSearch && matchesPlan && matchesStatus && matchesDate;
    });

    return (
        <div className="space-y-6 dir-rtl pb-10 animate-fadeIn">
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl border shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => navigate('/admin-tool')} className="rounded-full w-10 h-10 p-0 text-slate-400">
                        <ArrowLeft />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 flex items-center gap-2">
                            <Shield className="text-indigo-600" />
                            نظام التراخيص
                        </h1>
                        <p className="text-slate-500 font-bold">إدارة مفاتيح تفعيل البرنامج والأجهزة المرتبطة بها</p>
                    {fbUser ? (
                        <div className="mt-1 flex items-center gap-2 text-xs text-emerald-600 font-bold">
                            <CheckCircle size={14} />
                            <span>متصل بـ Firebase: {fbUser.email}</span>
                        </div>
                    ) : (
                        <div className="mt-1 flex items-center gap-2 text-xs text-amber-600 font-bold">
                            <Shield className="animate-pulse" size={14} />
                            <span>غير متصل بـ Firebase. يرجى تسجيل الدخول.</span>
                        </div>
                    )}
                    </div>
                </div>
                <div className="flex gap-2">
                   {!fbUser && <Button onClick={handleFbLogin} variant="secondary" className="rounded-2xl h-12 gap-2"><LogIn size={20} /> دخول Google</Button>}
                   <Button onClick={load} variant="outline" className="rounded-2xl h-12 w-12 p-0"><RefreshCw size={20} className={loading ? 'animate-spin' : ''} /></Button>
                </div>
            </div>

            <Card className="p-6 border-none shadow-premium bg-slate-50 space-y-4">
                <h3 className="text-lg font-black">إنشاء مفتاح جديد</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500">عدد المفاتيح (دفعة واحدة)</label>
                        <input 
                            type="number" 
                            min="1"
                            max="100"
                            value={keyCount}
                            onChange={e => setKeyCount(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 font-bold text-center shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>

                    {keyCount === 1 && (
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500">مفتاح الترخيص</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={newKey}
                                    onChange={e => setNewKey(e.target.value)}
                                    placeholder="XXXX-XXXX-XXXX-XXXX"
                                    className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-3 font-mono text-center tracking-widest text-lg shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                                <Button onClick={generateRandomKey} variant="outline" className="rounded-2xl px-4 font-black">عشوائي</Button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500">نوع الترخيص</label>
                        <select 
                            value={newType}
                            onChange={e => setNewType(e.target.value as any)}
                            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 font-black shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none h-[54px]"
                        >
                            <option value="Basic">Basic - شهر (مبتدئ)</option>
                            <option value="Pro">Pro - شهر (متوسط)</option>
                            <option value="Business">Business - شهر (احترافي)</option>
                            <option value="Basic Year">Basic Year - سنوي (مبتدئ)</option>
                            <option value="Pro Year">Pro Year - سنوي (متوسط)</option>
                            <option value="Business Year">Business Year - سنوي (احترافي)</option>
                            <option value="Monthly">قديم - شهري (Monthly)</option>
                            <option value="Semiannual">قديم - نصف سنوي (Semiannual)</option>
                            <option value="Yearly">قديم - سنوي (Yearly)</option>
                            <option value="Lifetime">مدى الحياة (Lifetime)</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500">الحد الأقصى للأجهزة للمفتاح الواحد</label>
                        <input 
                            type="number" 
                            min="1"
                            max="1000"
                            value={newMaxDevices}
                            onChange={e => setNewMaxDevices(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 font-bold text-center shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>

                    <div className="space-y-2 md:col-span-1 lg:col-span-1">
                        <label className="text-xs font-black text-slate-500">معرف الجهاز (اختياري)</label>
                        <input 
                            type="text" 
                            value={newDeviceId}
                            onChange={e => setNewDeviceId(e.target.value)}
                            disabled={keyCount > 1}
                            placeholder={keyCount > 1 ? "غير متاح عند إنشاء دفعة" : "dev-xxxxxxxxxxxx"}
                            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 font-mono text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                        />
                    </div>

                    <div className="space-y-2 md:col-span-1 lg:col-span-1">
                        <label className="text-xs font-black text-slate-500">رقم تواصل العميل (اختياري)</label>
                        <input 
                            type="text" 
                            value={newCustomerPhone}
                            onChange={e => setNewCustomerPhone(e.target.value)}
                            disabled={keyCount > 1}
                            placeholder="05xxxxxxxx"
                            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 font-bold shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-100"
                        />
                    </div>

                    <div className="space-y-2 md:col-span-1 lg:col-span-1">
                        <label className="text-xs font-black text-slate-500">اسم العميل (اختياري)</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={newCustomerName}
                                onChange={e => setNewCustomerName(e.target.value)}
                                disabled={keyCount > 1}
                                placeholder="اسم صاحب الترخيص"
                                className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-3 font-bold shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-100"
                            />
                            <Button onClick={handleCreate} isLoading={loading} className="rounded-2xl px-12 font-black bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 text-white">حفظ {keyCount > 1 ? 'المفاتيح' : 'وتفعيل'}</Button>
                        </div>
                    </div>
                </div>
            </Card>

            <Card className="p-4 border-none shadow-sm bg-white">
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="relative flex-1">
                        <input 
                            type="text"
                            placeholder="البحث برقم المفتاح أو معرف الجهاز..."
                            className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-wrap gap-4">
                        <input 
                            type="date"
                            value={fromDate}
                            onChange={e => setFromDate(e.target.value)}
                            className="bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500"
                            title="من تاريخ"
                        />
                        <input 
                            type="date"
                            value={toDate}
                            onChange={e => setToDate(e.target.value)}
                            className="bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500"
                            title="إلى تاريخ"
                        />
                        <select 
                            className="bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500"
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                        >
                            <option value="all">كل الحالات</option>
                            <option value="active">مفعل</option>
                            <option value="pending">غير مفعل (انتظار)</option>
                            <option value="blocked">محظور</option>
                        </select>
                        <select 
                            className="bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500"
                            value={filterPlan}
                            onChange={e => setFilterPlan(e.target.value)}
                        >
                            <option value="all">كل الخطط</option>
                            <option value="Basic">Basic (شهري)</option>
                            <option value="Pro">Pro (شهري)</option>
                            <option value="Business">Business (شهري)</option>
                            <option value="Basic Year">Basic (سنوي)</option>
                            <option value="Pro Year">Pro (سنوي)</option>
                            <option value="Business Year">Business (سنوي)</option>
                            <option value="Monthly">شهري (قديم)</option>
                            <option value="Semiannual">نصف سنوية (قديم)</option>
                            <option value="Yearly">سنوية (قديم)</option>
                            <option value="Lifetime">مدى الحياة</option>
                        </select>
                    </div>
                </div>
            </Card>

            <div className="flex justify-between items-center px-4">
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => toggleSelectAll(filteredLicenses.map(l => l.licenseKey))} className="text-slate-500 hover:text-indigo-600 gap-2 mb-2 font-bold">
                        {selectedIds.length === filteredLicenses.length && filteredLicenses.length > 0 ? <CheckSquare size={18} className="text-indigo-600"/> : <Square size={18}/>}
                        تحديد الكل {selectedIds.length > 0 && `(${selectedIds.length})`}
                    </Button>
                    {selectedIds.length > 0 && (
                        <Button variant="danger" onClick={handleDeleteSelected} className="gap-2 mb-2">
                            <Trash2 size={16} />
                            حذف المحدد
                        </Button>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExport} className="gap-2 text-slate-600 font-bold border-slate-200">
                        <Download size={16} />
                        تصدير
                    </Button>
                    <label className="cursor-pointer">
                        <input type="file" accept=".xlsx" className="hidden" onChange={handleImport} />
                        <div className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl bg-white text-slate-600 font-bold hover:bg-slate-50 transition-colors">
                            <Upload size={16} />
                            استيراد
                        </div>
                    </label>
                </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
                {filteredLicenses.map((lic) => (
                    <Card key={lic.licenseKey} className={`p-0 border-none shadow-premium overflow-hidden group ${selectedIds.includes(lic.licenseKey) ? 'ring-2 ring-indigo-500 bg-indigo-50/10' : ''}`}>
                        <div className="flex items-center p-6 gap-6">
                            <button onClick={() => toggleSelection(lic.licenseKey)} className="text-slate-400 hover:text-indigo-600 focus:outline-none">
                                {selectedIds.includes(lic.licenseKey) ? <CheckSquare size={24} className="text-indigo-600" /> : <Square size={24} />}
                            </button>
                            <div className={`p-4 rounded-2xl ${lic.status === 'active' ? 'bg-emerald-50 text-emerald-600' : lic.status === 'blocked' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-400'}`}>
                                <Key size={24} />
                            </div>
                            
                            <div className="flex-1">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl font-mono font-black tracking-widest text-slate-800">{lic.licenseKey}</span>
                                    <button onClick={() => handleCopy(lic.licenseKey)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors">
                                        <Copy size={16} />
                                    </button>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${lic.status === 'active' ? 'bg-emerald-100 text-emerald-700' : lic.status === 'blocked' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {lic.status === 'active' ? 'مفعل' : lic.status === 'blocked' ? 'محظور' : 'انتظار'}
                                    </span>
                                    <span className="px-3 py-1 rounded-full text-[10px] bg-indigo-100 text-indigo-700 font-black">
                                        {lic.type}
                                    </span>
                                    <button onClick={() => handleUpdateMaxDevices(lic.licenseKey, lic.maxDevices || 1)} className="px-3 py-1 rounded-full text-[10px] bg-sky-100 text-sky-700 font-black hover:bg-sky-200 transition-colors" title="الحد الأقصى للأجهزة (انقر للتعديل)">
                                        أجهزة: {lic.maxDevices || 1} (تعديل)
                                    </button>
                                </div>
                                
                                {lic.customerName && (
                                    <div className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                                        العميل: {lic.customerName} {lic.customerPhone ? `(${lic.customerPhone})` : ''}
                                    </div>
                                )}
                                
                                <div className="flex flex-col md:flex-row md:items-start gap-4 mt-2 text-[10px] font-bold text-slate-500">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1">
                                            <Smartphone size={12} />
                                            <span>الأجهزة المرتبطة:</span>
                                        </div>
                                        {lic.deviceIds && lic.deviceIds.length > 0 ? (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {lic.deviceIds.map((id, index) => (
                                                    <span key={index} className="font-mono bg-slate-100 px-2 py-0.5 rounded italic">{id}</span>
                                                ))}
                                            </div>
                                        ) : lic.deviceId ? (
                                            <span className="font-mono bg-slate-100 px-2 py-0.5 rounded italic">{lic.deviceId}</span>
                                        ) : (
                                            'غير مرتبط بأي جهاز'
                                        )}
                                    </div>
                                    <div className="flex gap-4">
                                        <span>أنشئ: {lic.createdAt ? new Date(lic.createdAt).toLocaleDateString('ar-EG') : 'N/A'}</span>
                                        <span className={lic.expiresAt && new Date(lic.expiresAt) < new Date() ? 'text-rose-500 font-black underline' : ''}>
                                            ينتهي: {lic.expiresAt ? new Date(lic.expiresAt).toLocaleDateString('ar-EG') : (lic.type === 'Lifetime' ? 'مدى الحياة' : 'لم يفعل')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                {(lic.deviceId || (lic.deviceIds && lic.deviceIds.length > 0)) && (
                                    <Button onClick={() => handleReset(lic.licenseKey)} variant="outline" title="إعادة تعيين الجهاز" className="rounded-xl w-10 p-0 border-amber-200 text-amber-600 hover:bg-amber-50"><Smartphone size={18} /></Button>
                                )}
                                
                                <Button onClick={() => handleRenew(lic.licenseKey)} variant="outline" title="تجديد الترخيص" className="rounded-xl w-10 p-0 border-indigo-200 text-indigo-600 hover:bg-indigo-50"><PlayCircle size={18} /></Button>
                                
                                {lic.status !== 'blocked' ? (
                                    <Button onClick={() => handleStatusChange(lic.licenseKey, 'blocked')} variant="outline" title="حظر" className="rounded-xl w-10 p-0 border-rose-200 text-rose-600 hover:bg-rose-50"><Ban size={18} /></Button>
                                ) : (
                                    <Button onClick={() => handleStatusChange(lic.licenseKey, 'active')} variant="outline" title="تفعيل" className="rounded-xl w-10 p-0 border-emerald-200 text-emerald-600 hover:bg-emerald-50"><CheckCircle size={18} /></Button>
                                )}

                                <Button onClick={() => handleDelete(lic.licenseKey)} variant="outline" title="حذف" className="rounded-xl w-10 p-0 border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50"><Trash2 size={18} /></Button>
                            </div>
                        </div>
                    </Card>
                ))}

                {filteredLicenses.length === 0 && (
                    <div className="p-20 text-center opacity-20">
                        <Shield size={64} className="mx-auto mb-4" />
                        <p className="font-black">لا توجد تراخيص مسجلة حالياً تطابق بحثك</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminLicensePage;
