import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, orderBy } from '../../services/localFirestore';
import { db } from '../../services/localFirestore';
import { handleFirestoreError, OperationType } from '../../services/firestoreErrorHandler';
import Card from '../ui/Card';
import { formatCurrency } from '../../utils/localization';
import { useSettings } from '../../hooks/useSettings';
import { Treasury, Transaction } from '../../types';
import { Search, Calculator, RefreshCw, Download } from 'lucide-react';
import { exportToCsv } from '../../utils/export';
import { exportToExcel } from '../../utils/importExportUtils';

const parseSafeDate = (d: any): Date => {
    if (!d) return new Date();
    if (d && typeof d === 'object') {
        if ('seconds' in d) {
            return new Date(d.seconds * 1000);
        }
        if ('_seconds' in d) {
            return new Date((d as any)._seconds * 1000);
        }
    }
    return new Date(d);
};

interface Props {
    treasuries: Treasury[];
    onRequestUndo: (t: Transaction) => void;
}

const TreasuryLedgerTab: React.FC<Props> = ({ treasuries, onRequestUndo }) => {
    const { settings } = useSettings();
    const [selectedTreasuryId, setSelectedTreasuryId] = useState<string>('');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    // Sort treasuries so default is first
    const sortedTreasuries = useMemo(() => {
        return [...treasuries].sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
    }, [treasuries]);

    useEffect(() => {
        if (!selectedTreasuryId && sortedTreasuries.length > 0) {
            setSelectedTreasuryId(sortedTreasuries[0].id);
        }
    }, [sortedTreasuries, selectedTreasuryId]);

    const fetchLedger = async (treasuryId: string) => {
        if (!treasuryId) return;
        setLoading(true);
        try {
            // Get all transactions for this treasury
            const q = query(
                collection(db, 'transactions'),
                where('treasuryId', '==', treasuryId),
                orderBy('date', 'asc') // ascending for running balance
            );
            const snap = await getDocs(q);
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
            
            // Also fetch where `toTreasuryId` == treasuryId (incoming transfers)
            const transferQ = query(
                collection(db, 'transactions'),
                where('toTreasuryId', '==', treasuryId),
                orderBy('date', 'asc')
            );
            const tSnap = await getDocs(transferQ);
            const tData = tSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
            
            // Merge and sort
            const merged = [...data, ...tData].filter((v,i,a)=>a.findIndex(x=>(x.id === v.id))===i);
            merged.sort((a, b) => parseSafeDate(a.date).getTime() - parseSafeDate(b.date).getTime());
            
            setTransactions(merged);
        } catch (error) {
            handleFirestoreError(error, OperationType.GET, 'transactions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedTreasuryId) {
            fetchLedger(selectedTreasuryId);
        }
    }, [selectedTreasuryId]);

    const selectedTreasury = treasuries.find(t => t.id === selectedTreasuryId);

    // Compute running balance
    let currentBalance = 0;
    const ledgerRows = transactions.map(t => {
        const isIncome = t.type === 'income' || t.type === 'Income' || t.toTreasuryId === selectedTreasuryId;
        const isExport = t.type === 'export' || t.type === 'Export';
        const isTransferOut = t.type === 'transfer' && t.treasuryId === selectedTreasuryId;
        
        let debit = 0; // زاد
        let credit = 0; // قل
        
        if (isIncome && !isExport && !isTransferOut) {
            debit = Number(t.amount);
        } else {
            credit = Number(t.amount);
        }
        
        currentBalance += (debit - credit);
        
        return {
            ...t,
            debit,
            credit,
            runningBalance: currentBalance
        };
    });

    const filteredRows = ledgerRows.filter(row => {
        let matchesSearch = true;
        let matchesDates = true;

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            matchesSearch = 
                (row.description && row.description.toLowerCase().includes(term)) ||
                (row.category && row.category.toLowerCase().includes(term));
        }

        if (startDate) {
            matchesDates = matchesDates && parseSafeDate(row.date) >= new Date(startDate);
        }
        if (endDate) {
            matchesDates = matchesDates && parseSafeDate(row.date) <= new Date(endDate + 'T23:59:59.999Z');
        }

        return matchesSearch && matchesDates;
    });

    const handleExport = () => {
        const rowsToExport = filteredRows.map(row => {
            const d = parseSafeDate(row.date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');

            return {
                'التاريخ': `${year}-${month}-${day}`,
                'الوقت': `${hours}:${minutes}`,
                'البيان': row.description,
                'الفئة': row.category,
                'إيداع (+)': row.debit > 0 ? row.debit : '',
                'سحب (-)': row.credit > 0 ? row.credit : '',
                'الرصيد التراكمي': row.runningBalance
            };
        });
        exportToExcel(rowsToExport, `treasury-ledger-${selectedTreasury?.name || 'export'}-${new Date().toISOString().split('T')[0]}`);
    };

    return (
        <div className="space-y-6">
            <Card className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-6">
                    <div className="w-full md:w-1/3 text-right">
                        <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-widest text-right">اختر الخزينة / الحساب</label>
                        <select 
                            value={selectedTreasuryId} 
                            onChange={e => setSelectedTreasuryId(e.target.value)}
                            className="w-full h-12 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl px-4 font-bold outline-none ring-1 ring-slate-100 dark:ring-slate-800 focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                        >
                            {sortedTreasuries.map(t => (
                                <option key={t.id} value={t.id}>{t.name} (الرصيد: {formatCurrency(t.balance, t.currency || settings?.currency)})</option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="flex gap-4 w-full md:w-auto">
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl flex items-center gap-4 flex-grow md:flex-grow-0">
                            <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600">
                                <Calculator size={24} />
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black uppercase text-indigo-400 text-right">الرصيد الفعلي الحالي</p>
                                <p className="font-black text-2xl text-indigo-700 dark:text-indigo-400">
                                    {selectedTreasury ? formatCurrency(selectedTreasury.balance, selectedTreasury.currency || settings?.currency) : '-'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleExport}
                            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl p-4 flex flex-col justify-center items-center font-bold text-xs gap-1 transition-colors"
                        >
                            <Download size={20} className="mb-1" />
                            <span>تصدير</span>
                        </button>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-t border-slate-100 dark:border-slate-800 pt-6">
                    <div className="w-full relative">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="بحث في البيان أو الوصف أو الفئة..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pr-12 pl-4 font-bold outline-none focus:border-indigo-500 text-slate-700 dark:text-slate-300"
                        />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <input 
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="h-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 font-bold outline-none focus:border-indigo-500 text-slate-700 dark:text-slate-300 w-full"
                        />
                        <input 
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="h-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 font-bold outline-none focus:border-indigo-500 text-slate-700 dark:text-slate-300 w-full"
                        />
                    </div>
                </div>
            </Card>

            <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 font-black">
                            <tr>
                                <th className="px-6 py-4 text-start">التاريخ</th>
                                <th className="px-6 py-4 text-start">البيان / الوصف</th>
                                <th className="px-6 py-4 text-center text-emerald-600">إيداع (+ زاد)</th>
                                <th className="px-6 py-4 text-center text-rose-600">سحب (- قل)</th>
                                <th className="px-6 py-4 text-center text-indigo-600">الرصيد التراكمي</th>
                                <th className="px-6 py-4 text-center text-slate-500">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => <tr key={i}><td colSpan={6} className="p-6"><div className="h-4 bg-slate-100 animate-pulse rounded"></div></td></tr>)
                            ) : filteredRows.length > 0 ? (
                                filteredRows.reverse().map((row, i) => (
                                    <tr key={`${row.id || 'row'}-${i}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-600">
                                            {parseSafeDate(row.date).toLocaleDateString()} {parseSafeDate(row.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className={`font-bold ${row.isReverted ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-200'}`}>
                                                {row.description}
                                                {row.isReverted && <span className="ms-2 text-[10px] bg-rose-50 text-rose-500 px-1 py-0.5 rounded border border-rose-100">تم الإلغاء</span>}
                                                {row.isReversal && <span className="ms-2 text-[10px] bg-amber-50 text-amber-600 px-1 py-0.5 rounded border border-amber-100">قيد عكسي</span>}
                                            </p>
                                            <p className="text-xs text-slate-400 font-bold mt-1">تلقائي: {row.category}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center font-black text-emerald-600">
                                            {row.debit > 0 ? formatCurrency(row.debit, selectedTreasury?.currency || settings?.currency) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-center font-black text-rose-600">
                                            {row.credit > 0 ? formatCurrency(row.credit, selectedTreasury?.currency || settings?.currency) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-center font-black text-indigo-600 bg-indigo-50/30 dark:bg-indigo-900/10">
                                            {formatCurrency(row.runningBalance, selectedTreasury?.currency || settings?.currency)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {!row.isReverted && !row.isReversal && (
                                                <button 
                                                    onClick={() => onRequestUndo(row)}
                                                    className="p-2 mx-auto text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors flex items-center justify-center gap-1"
                                                    title="تراجع عن الحركة"
                                                >
                                                    <RefreshCw size={14} />
                                                    <span className="text-xs font-bold hidden md:inline">تراجع</span>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center text-slate-400 font-bold">
                                        لا توجد حركات مسجلة لهذه الخزينة
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default TreasuryLedgerTab;
