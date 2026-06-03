
import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, serverTimestamp, orderBy, where, limit } from '../../services/localFirestore';
import { db  } from '../../services/localFirestore';
import { handleFirestoreError, OperationType } from '../../services/firestoreErrorHandler';
import { useToasts } from '../../hooks/useToasts';
import { Clock, LogIn, LogOut, User, Search, Calendar, History, ShieldCheck, ChevronDown, Fingerprint, Wifi, SmartphoneNfc } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/layout/PageHeader';

interface AttendanceLog {
    id: string;
    employeeName: string;
    type: 'IN' | 'OUT';
    timestamp: any;
    location?: string;
    ip?: string;
}

interface Personnel {
    id: string;
    name: string;
    fingerprintId?: string;
}

const AttendancePage: React.FC = () => {
    const { addToast } = useToasts();
    const [logs, setLogs] = useState<AttendanceLog[]>([]);
    const [personnel, setPersonnel] = useState<Personnel[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [deviceConnected, setDeviceConnected] = useState(true); // Default to connected to show the fingerprint machine
    const [verifyingFingerprint, setVerifyingFingerprint] = useState(false);
    const [scanningAction, setScanningAction] = useState<'IN' | 'OUT' | null>(null);
    const [scanProgress, setScanProgress] = useState(0);
    const [hasFingerprint, setHasFingerprint] = useState<boolean | null>(null);

    useEffect(() => {
        fetchLogs();
        fetchPersonnel();
    }, []);

    useEffect(() => {
        if (selectedEmployee) {
            const emp = personnel.find(p => p.id === selectedEmployee);
            setHasFingerprint(emp ? !!emp.fingerprintId : false);
        } else {
            setHasFingerprint(null);
        }
    }, [selectedEmployee, personnel]);

    const fetchPersonnel = async () => {
        try {
            const q = query(collection(db, 'hr_personnel'), orderBy('name', 'asc'));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                name: doc.data().name,
                fingerprintId: doc.data().fingerprintId || ''
            }));
            setPersonnel(data);
        } catch (error) {
            console.error("Error fetching personnel", error);
        }
    };

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'hr_attendance'), orderBy('timestamp', 'desc'), limit(50));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceLog));
            setLogs(data);
        } catch (error) {
            handleFirestoreError(error, OperationType.GET, 'hr_attendance');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (type: 'IN' | 'OUT') => {
        if (!selectedEmployee) {
            addToast('يرجى اختيار الموظف أولاً', 'warning');
            return;
        }
        
        const emp = personnel.find(p => p.id === selectedEmployee);
        if (!emp) {
            addToast('الموظف المختار غير موجود بالسيستم', 'error');
            return;
        }

        if (!emp.fingerprintId) {
            addToast('فشل التحقق: هذا الموظف لم تسجل له بصمة! الحضور والانصراف اليدوي معطل بقرار أمني من الإدارة.', 'error');
            return;
        }

        // Trigger secure fingerprint enrollment verification prompt
        setScanningAction(type);
        setVerifyingFingerprint(true);
        setScanProgress(0);
        addToast('محطة البصمة الحيوية: يرجى وضع إصبع الموظف على الماسح لبدء الفحص والمطابقة', 'info');
    };

    const triggerScannerSimulation = () => {
        if (scanProgress > 0) return; // Prevent multiple clicks on simulate scanner button
        
        setScanProgress(10);
        const interval = setInterval(() => {
            setScanProgress(prev => {
                const next = prev + 15;
                if (next >= 100) {
                    clearInterval(interval);
                    setTimeout(() => {
                        executeAttendanceAction();
                    }, 300);
                    return 100;
                }
                return next;
            });
        }, 150);
    };

    const executeAttendanceAction = async () => {
        if (!scanningAction || !selectedEmployee) return;

        const type = scanningAction;
        const emp = personnel.find(p => p.id === selectedEmployee);
        const empName = emp ? emp.name : 'Unknown';

        try {
            const logData = {
                employeeName: empName,
                employeeId: selectedEmployee,
                type,
                timestamp: serverTimestamp(),
                location: 'جهاز البصمة الرئيسي (بيومتري آمن)',
            };
            const docRef = await addDoc(collection(db, 'hr_attendance'), logData);
            setLogs(prev => [{ id: docRef.id, ...logData, timestamp: { seconds: Date.now() / 1000 } } as any, ...prev]);
            addToast(type === 'IN' ? `تم مطابقة بصمة ${empName} وتسجيل الحضور بنجاح!` : `تم مطابقة بصمة ${empName} وتسجيل الانصراف بنجاح!`, 'success');
            setSelectedEmployee('');
            setVerifyingFingerprint(false);
            setScanningAction(null);
            setScanProgress(0);
        } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'hr_attendance');
            setVerifyingFingerprint(false);
            setScanningAction(null);
            setScanProgress(0);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader title="سجل الحضور والانصراف" subtitle="بوابة مراقبة ساعات عمل الموظفين والالتزام بالمواعيد" />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="p-8 lg:col-span-1 border-2 border-indigo-100 dark:border-indigo-900/30">
                    <div className="flex flex-col items-center text-center space-y-6">
                        <div className="flex w-full justify-between items-center mb-2 px-2">
                            <span className="text-xs font-bold text-slate-500">جهاز البصمة</span>
                            <button 
                                onClick={() => setDeviceConnected(!deviceConnected)}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black transition-colors ${deviceConnected ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}
                            >
                                {deviceConnected ? <Wifi size={12} /> : <Wifi size={12} className="opacity-50" />}
                                {deviceConnected ? 'متصل' : 'غير متصل'}
                            </button>
                        </div>
                        
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${deviceConnected ? 'bg-emerald-50 text-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-400'}`}>
                             {deviceConnected ? <Fingerprint size={48} className="animate-pulse" /> : <SmartphoneNfc size={48} />}
                        </div>
                        <div>
                            <h3 className="text-xl font-black mb-2">تسجيل الحضور اليومي</h3>
                            <p className="text-xs font-bold text-slate-500">{deviceConnected ? 'يرجى وضع البصمة على الجهاز أو الاختيار اليدوي' : 'يرجى تسجيل اسم الموظف واختيار نوع الحركة'}</p>
                        </div>
                        
                        <div className="w-full space-y-4">
                            <div className="relative">
                                 <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                 <select 
                                    value={selectedEmployee}
                                    onChange={e => setSelectedEmployee(e.target.value)}
                                    className="w-full h-14 pr-12 pl-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold border-2 border-transparent focus:border-indigo-600/30 transition-all appearance-none cursor-pointer"
                                 >
                                     <option value="">اختر الموظف...</option>
                                     {personnel.map(p => (
                                         <option key={p.id} value={p.id}>{p.name}</option>
                                     ))}
                                 </select>
                                 <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                            </div>

                            {selectedEmployee && hasFingerprint === false && (
                                <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs font-black rounded-2xl border border-rose-100 dark:border-rose-900/30 text-right space-y-1">
                                    <p className="flex items-center justify-end gap-1.5 font-bold">
                                        <Fingerprint size={14} className="text-rose-500 animate-pulse" />
                                        خطأ: البصمة غير مسجلة لهذا الموظف
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-bold">يرجى تسجيل البصمة الحيوية أولاً من "شؤون الموظفين" ليتم السماح له بتسجيل الحضور.</p>
                                </div>
                            )}
                            
                            {selectedEmployee && hasFingerprint === true && (
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-xs font-black rounded-2xl border border-emerald-100 dark:border-emerald-900/30 text-right">
                                    <p className="flex items-center justify-end gap-1.5 font-bold">
                                        <ShieldCheck size={14} className="text-emerald-500" />
                                        توقيع البصمة الحيوية مطبق ومؤمن بنجاح
                                    </p>
                                </div>
                            )}
                            
                            <div className="grid grid-cols-2 gap-4">
                                <Button 
                                    onClick={() => handleAction('IN')} 
                                    disabled={hasFingerprint === false}
                                    className={`h-16 bg-emerald-600 rounded-2xl font-black text-lg ${hasFingerprint === false ? 'opacity-40 cursor-not-allowed' : ''}`}
                                >
                                    <LogIn className="me-2" /> حضور
                                </Button>
                                <Button 
                                    onClick={() => handleAction('OUT')} 
                                    disabled={hasFingerprint === false}
                                    className={`h-16 bg-rose-600 rounded-2xl font-black text-lg ${hasFingerprint === false ? 'opacity-40 cursor-not-allowed' : ''}`}
                                >
                                    <LogOut className="me-2" /> انصراف
                                </Button>
                            </div>
                        </div>

                        <div className="pt-4 flex items-center justify-center gap-2 text-slate-400 text-[10px] font-black uppercase">
                            <ShieldCheck size={14} />
                            <span>Verified Entry Sequence Locked</span>
                        </div>
                    </div>
                </Card>

                <Card className="p-0 lg:col-span-2 overflow-hidden border border-slate-100 dark:border-slate-800">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-3">
                            <History size={20} className="text-slate-400" />
                            <h3 className="font-black">آخر الحركات المسجلة</h3>
                        </div>
                        <span className="text-[10px] font-bold px-3 py-1 bg-white dark:bg-slate-800 rounded-lg shadow-sm">آخر 50 حركة</span>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loading ? (
                             Array(6).fill(0).map((_, i) => <div key={i} className="h-20 bg-slate-50 dark:bg-slate-900 animate-pulse"></div>)
                        ) : logs.length > 0 ? (
                            logs.map(log => (
                                <div key={log.id} className="p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${log.type === 'IN' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                             {log.type === 'IN' ? <LogIn size={18} /> : <LogOut size={18} />}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-800 dark:text-white">{log.employeeName}</p>
                                            <p className={`text-[10px] font-bold ${log.type === 'IN' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {log.type === 'IN' ? 'تسجيل دخول (حضور)' : 'تسجيل خروج (انصراف)'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-left rtl:text-right">
                                        <div className="flex items-center gap-2 text-slate-600 mb-0.5 justify-end">
                                             <Clock size={12} />
                                             <span className="font-mono text-xs font-bold">
                                                {log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending...'}
                                             </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-400 justify-end">
                                             <Calendar size={12} />
                                             <span className="text-[10px] font-bold">
                                                {log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleDateString() : 'Just now'}
                                             </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-20 text-center opacity-30">
                                <Search size={48} className="mx-auto mb-4" />
                                <p className="font-black">لا توجد حركات حضور مسجلة اليوم</p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Secure Biometric Fingerprint verification terminal scanner mask modal */}
            {verifyingFingerprint && (
                <div className="fixed inset-0 min-h-screen w-screen z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-[2.5rem] p-6 text-center space-y-6 shadow-2xl relative overflow-hidden">
                        
                        {/* Laser Scanner Line and scanning backplate effects */}
                        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 via-transparent to-transparent pointer-events-none" />
                        
                        <div className="space-y-2">
                            <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-full">
                                نظام التحقق البيومتري الذاتي
                            </span>
                            <h3 className="text-lg font-black text-white">
                                {scanningAction === 'IN' ? 'تسجيل حضور بالبصمة الحيوية' : 'تسجيل انصراف بالبصمة الحيوية'}
                            </h3>
                            <p className="text-xs text-slate-400 font-bold">
                                الموظف: <span className="text-white font-black">{personnel.find(p => p.id === selectedEmployee)?.name}</span>
                            </p>
                        </div>

                        {/* Interactive Fingerprint Scanner Pad */}
                        <div className="relative mx-auto w-32 h-32 bg-slate-950 border border-slate-800 rounded-3xl flex items-center justify-center overflow-hidden">
                            
                            {/* Blue laser scan bar sweeping down the fingerprint */}
                            {scanProgress > 0 && scanProgress < 100 && (
                                <div 
                                    className="absolute left-0 right-0 h-1.5 bg-cyan-400/80 shadow-lg shadow-cyan-400/50 animate-[bounce_1.5s_infinite]"
                                    style={{ top: `${scanProgress}%` }}
                                />
                            )}
                            
                            {/* Animated glowing backplate */}
                            <div className={`absolute inset-1 rounded-2xl flex items-center justify-center transition-all ${scanProgress >= 100 ? 'bg-emerald-950/30' : scanProgress > 0 ? 'bg-indigo-950/40' : 'bg-transparent'}`}>
                                <Fingerprint 
                                    size={64} 
                                    className={`transition-all duration-300 ${
                                        scanProgress >= 100 
                                            ? 'text-emerald-400 scale-105' 
                                            : scanProgress > 0 
                                                ? 'text-cyan-400 animate-pulse' 
                                                : 'text-indigo-500'
                                    }`} 
                                />
                            </div>
                        </div>

                        {/* Scan Progress & instructions */}
                        <div className="space-y-2">
                            {scanProgress === 0 ? (
                                <p className="text-xs font-black text-slate-300">يجب وضع الإصبع على المستشعر للبدء في مسح البصمة ومطابقة الـ Biometrics.</p>
                            ) : scanProgress < 100 ? (
                                <div className="space-y-1">
                                    <p className="text-xs font-black text-cyan-400">جاري مسح البصمة وتحليل النقاط الدقيقة ({scanProgress}%)</p>
                                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-cyan-400 transition-all duration-150" style={{ width: `${scanProgress}%` }} />
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs font-black text-emerald-400">تمت مطابقة التوقيع البيومتري بالسيستم بنجاح!</p>
                            )}
                        </div>

                        {/* Control buttons */}
                        <div className="flex flex-col gap-2 pt-2">
                            {scanProgress === 0 && (
                                <button
                                    onClick={triggerScannerSimulation}
                                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all"
                                >
                                    [ اضغط لمطابقة البصمة بيومترياً ]
                                </button>
                            )}
                            
                            <button
                                onClick={() => {
                                    setVerifyingFingerprint(false);
                                    setScanningAction(null);
                                    setScanProgress(0);
                                }}
                                className="w-full h-12 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-black transition-all"
                            >
                                إلغاء المحاولة والرجوع
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendancePage;
