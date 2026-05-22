
import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, serverTimestamp, orderBy, where, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { handleFirestoreError, OperationType } from '../../services/firestoreErrorHandler';
import { useToasts } from '../../hooks/useToasts';
import { Clock, LogIn, LogOut, User, Search, Calendar, History, ShieldCheck, ChevronDown } from 'lucide-react';
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
}

const AttendancePage: React.FC = () => {
    const { addToast } = useToasts();
    const [logs, setLogs] = useState<AttendanceLog[]>([]);
    const [personnel, setPersonnel] = useState<Personnel[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmployee, setSelectedEmployee] = useState('');

    useEffect(() => {
        fetchLogs();
        fetchPersonnel();
    }, []);

    const fetchPersonnel = async () => {
        try {
            const q = query(collection(db, 'hr_personnel'), orderBy('name', 'asc'));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
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
            addToast('يرجى اختيار الموظف', 'warning');
            return;
        }
        
        const emp = personnel.find(p => p.id === selectedEmployee);
        const empName = emp ? emp.name : 'Unknown';

        try {
            const logData = {
                employeeName: empName,
                employeeId: selectedEmployee,
                type,
                timestamp: serverTimestamp(),
                location: 'Main Branch',
            };
            const docRef = await addDoc(collection(db, 'hr_attendance'), logData);
            setLogs(prev => [{ id: docRef.id, ...logData, timestamp: { seconds: Date.now() / 1000 } } as any, ...prev]);
            addToast(type === 'IN' ? `تم تسجيل حضور ${empName}` : `تم تسجيل انصراف ${empName}`, 'success');
            setSelectedEmployee('');
        } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'hr_attendance');
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader title="سجل الحضور والانصراف" subtitle="بوابة مراقبة ساعات عمل الموظفين والالتزام بالمواعيد" />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="p-8 lg:col-span-1 border-2 border-indigo-100 dark:border-indigo-900/30">
                    <div className="flex flex-col items-center text-center space-y-6">
                        <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/40 rounded-3xl flex items-center justify-center text-indigo-600">
                             <Clock size={40} className="animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black mb-2">تسجيل الحضور اليومي</h3>
                            <p className="text-xs font-bold text-slate-500">يرجى تسجيل اسم الموظف واختيار نوع الحركة</p>
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
                            
                            <div className="grid grid-cols-2 gap-4">
                                <Button onClick={() => handleAction('IN')} className="h-16 bg-emerald-600 rounded-2xl font-black text-lg">
                                    <LogIn className="me-2" /> حضور
                                </Button>
                                <Button onClick={() => handleAction('OUT')} className="h-16 bg-rose-600 rounded-2xl font-black text-lg">
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
        </div>
    );
};

export default AttendancePage;
