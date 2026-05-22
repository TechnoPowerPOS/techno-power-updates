
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Card from '../components/ui/Card';
import { api } from '../services/mockApi';
import type { ActivityLog } from '../types';
import { FileText, User, Clock, Search } from 'lucide-react';
import { toArabicIndic } from '../utils/localization';
import ActivityLogsSkeleton from '../components/logs/ActivityLogsSkeleton';

const ActivityLogsPage: React.FC = () => {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getActivityLogs();
            setLogs(data);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const logDate = log.timestamp.split('T')[0];
            const matchesDate = (!startDate || logDate >= startDate) && (!endDate || logDate <= endDate);
            
            const term = searchTerm.toLowerCase();
            const matchesSearch = !searchTerm || 
                log.user.toLowerCase().includes(term) ||
                log.action.toLowerCase().includes(term) ||
                log.details.toLowerCase().includes(term);

            return matchesDate && matchesSearch;
        });
    }, [logs, searchTerm, startDate, endDate]);

    const getRelativeTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
        if (seconds < 60) return `منذ ${toArabicIndic(seconds)} ثانية`;
        const minutes = Math.round(seconds / 60);
        if (minutes < 60) return `منذ ${toArabicIndic(minutes)} دقيقة`;
        const hours = Math.round(minutes / 60);
        return `منذ ${toArabicIndic(hours)} ساعة`;
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-black text-slate-800 dark:text-white">سجلات نشاط المستخدم</h1>
                
                 <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 rounded-xl border dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] font-black text-slate-400 px-1 uppercase">من</span>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="p-1 text-xs border-none bg-transparent font-bold outline-none" />
                    </div>
                    <div className="flex items-center gap-1 border-s dark:border-slate-700">
                        <span className="text-[10px] font-black text-slate-400 px-1 uppercase">إلى</span>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="p-1 text-xs border-none bg-transparent font-bold outline-none" />
                    </div>
                 </div>
            </div>
            
            {loading ? <ActivityLogsSkeleton /> : (
                <Card className="p-0 overflow-hidden border-none shadow-premium">
                    <div className="p-4 border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="relative max-w-md">
                            <Search className="absolute top-1/2 -translate-y-1/2 start-3 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="ابحث في السجلات..." 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)} 
                                className="w-full ps-10 p-2 text-sm border rounded-xl dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                            />
                        </div>
                    </div>

                    <ul className="divide-y dark:divide-slate-800 max-h-[600px] overflow-auto">
                        {filteredLogs.map((log, index) => (
                            <li key={log.id} className="flex items-start gap-4 p-5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors animate-slideDown" style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'backwards' }}>
                                <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                                    <FileText size={20} className="text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div className="flex-grow">
                                    <p className="font-black text-slate-800 dark:text-slate-200">{log.action}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{log.details}</p>
                                    <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mt-3">
                                        <span className="flex items-center gap-1.5"><User size={12} className="text-indigo-500"/> {log.user}</span>
                                        <span className="flex items-center gap-1.5" title={new Date(log.timestamp).toLocaleString('en-GB')}>
                                            <Clock size={12} className="text-indigo-500"/> {getRelativeTime(log.timestamp)}
                                        </span>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                    {filteredLogs.length === 0 && (
                        <div className="text-center py-20 text-slate-400 font-bold">لا يوجد سجلات تطابق البحث.</div>
                    )}
                </Card>
            )}
        </div>
    );
};

export default ActivityLogsPage;
