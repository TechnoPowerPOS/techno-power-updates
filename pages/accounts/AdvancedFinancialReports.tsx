import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where } from '../../services/localFirestore';
import { db  } from '../../services/localFirestore';
import { handleFirestoreError, OperationType } from '../../services/firestoreErrorHandler';
import { api } from '../../services/mockApi';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { formatCurrency, toArabicIndic } from '../../utils/localization';
import { useSettings } from '../../hooks/useSettings';
import { Expense, Transaction, Sale } from '../../types';
import { exportToCsv } from '../../utils/export';
import { TrendingUp, TrendingDown, DollarSign, Calendar, PieChart, Activity, Download, FileSpreadsheet, Search, X, ArrowLeftRight } from 'lucide-react';

const getSafeDateString = (dRaw: any): string => {
    if (!dRaw) return '---';
    const d = (dRaw && typeof dRaw === 'object' && 'seconds' in dRaw)
        ? new Date(dRaw.seconds * 1000)
        : (dRaw && typeof dRaw === 'object' && '_seconds' in dRaw)
        ? new Date((dRaw as any)._seconds * 1000)
        : new Date(dRaw);
    return isNaN(d.getTime()) ? '---' : d.toLocaleString('ar-EG');
};

const AdvancedFinancialReports: React.FC = () => {
    const { settings } = useSettings();
    const [loading, setLoading] = useState(true);
    
    const [sales, setSales] = useState<Sale[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [detailModal, setDetailModal] = useState<{
        isOpen: boolean;
        type: 'revenue' | 'profit' | 'expenses' | 'net_ledger' | '';
        title: string;
    }>({
        isOpen: false,
        type: '',
        title: ''
    });
    const [detailSearch, setDetailSearch] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [salesRes, expensesSnap, transSnap] = await Promise.all([
                    api.getSales(),
                    getDocs(collection(db, 'acc_expenses')),
                    api.getTreasuryTransactions() // It handles syncing nicely
                ]);
                
                setSales(salesRes);
                setExpenses(expensesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));
                setTransactions(transSnap);
                
            } catch (error) {
                handleFirestoreError(error, OperationType.GET, 'financial_reports');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const metrics = useMemo(() => {
        let filteredSales = sales;
        let filteredExpenses = expenses;
        let filteredTransactions = transactions;

        if (startDate) {
            const start = new Date(startDate);
            filteredSales = filteredSales.filter(s => new Date(s.date) >= start);
            filteredExpenses = filteredExpenses.filter(e => e.date && new Date(e.date.seconds ? e.date.seconds * 1000 : e.date) >= start);
            filteredTransactions = filteredTransactions.filter(t => new Date(t.date) >= start);
        }
        if (endDate) {
            const end = new Date(endDate + 'T23:59:59.999Z');
            filteredSales = filteredSales.filter(s => new Date(s.date) <= end);
            filteredExpenses = filteredExpenses.filter(e => e.date && new Date(e.date.seconds ? e.date.seconds * 1000 : e.date) <= end);
            filteredTransactions = filteredTransactions.filter(t => new Date(t.date) <= end);
        }

        const totalRevenue = filteredSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
        const totalProfit = filteredSales.reduce((sum, s) => sum + (Number(s.profit) || 0), 0);
        
        const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        
        // Sum withdrawals from non-transfer
        const otherWithdrawals = filteredTransactions
            .filter(t => (t.type === 'withdrawal' || t.type === 'export') && t.category !== 'expense')
            .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
            
        const otherIncomes = filteredTransactions
            .filter(t => t.type === 'income' && t.category !== 'sale')
            .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        const netProfit = totalProfit + otherIncomes - totalExpenses - otherWithdrawals;

        // Daily/Monthly/Yearly approximation of current view
        const today = new Date();
        today.setHours(0,0,0,0);
        const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const firstOfYear = new Date(today.getFullYear(), 0, 1);
        
        const calcNetForPeriod = (startD: Date, endD?: Date) => {
            const sProfit = filteredSales.filter(s => new Date(s.date) >= startD && (!endD || new Date(s.date) <= endD)).reduce((sum, s) => sum + (Number(s.profit) || 0), 0);
            const sExp = filteredExpenses.filter(e => e.date && new Date(e.date.seconds ? e.date.seconds * 1000 : e.date) >= startD && (!endD || new Date(e.date.seconds ? e.date.seconds * 1000 : e.date) <= endD)).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
            const sInc = filteredTransactions.filter(t => t.type === 'income' && t.category !== 'sale' && new Date(t.date) >= startD && (!endD || new Date(t.date) <= endD)).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
            const sWdr = filteredTransactions.filter(t => (t.type === 'withdrawal' || t.type === 'export') && t.category !== 'expense' && new Date(t.date) >= startD && (!endD || new Date(t.date) <= endD)).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
            
            return sProfit + sInc - sExp - sWdr;
        };

        return {
            totalRevenue,
            totalProfit,
            totalExpenses,
            otherWithdrawals,
            otherIncomes,
            netProfit,
            dailyNet: startDate || endDate ? calcNetForPeriod(new Date(0)) : calcNetForPeriod(today),
            monthlyNet: startDate || endDate ? calcNetForPeriod(new Date(0)) : calcNetForPeriod(firstOfMonth),
            yearlyNet: startDate || endDate ? calcNetForPeriod(new Date(0)) : calcNetForPeriod(firstOfYear),
        };
    }, [sales, expenses, transactions, startDate, endDate]);

    const movementsList = useMemo(() => {
        let list: any[] = [];
        const sList = Array.isArray(sales) ? sales : [];
        const eList = Array.isArray(expenses) ? expenses : [];
        const tList = Array.isArray(transactions) ? transactions : [];

        // 1. Sales as inflows
        sList.forEach(s => {
            const safeId = s.id ? String(s.id) : '';
            list.push({
                id: s.id,
                date: new Date(s.date),
                type: "عملية بيع",
                category: "إيراد مبيعات",
                desc: `فاتورة مبيعات رقم #${safeId.toUpperCase()} - للعميل ${s.customer?.name || "عميل نقدي"}`,
                amountIn: Number(s.total) || 0,
                amountOut: 0,
                profit: Number(s.profit) || 0
            });
        });
        
        // 2. Expenses as outflows
        eList.forEach(e => {
            const expDate = e.date ? new Date(e.date.seconds ? e.date.seconds * 1000 : e.date) : new Date();
            const safeId = e.id ? String(e.id) : '';
            list.push({
                id: e.id,
                date: expDate,
                type: "سند مصروف",
                category: e.category || "مصاريف تشغيلية",
                desc: e.description || `سند مصروف رقم #${safeId.substring(0, 6)} - مدفوع لـ: ${e.paidTo || "---"}`,
                amountIn: 0,
                amountOut: Number(e.amount) || 0,
                profit: -(Number(e.amount) || 0)
            });
        });
        
        // 3. Treasury transactions - exclude duplicate categories
        tList.forEach(t => {
            if (t.category === 'sale' || t.category === 'expense') return;
            const tDateRaw = t.date;
            const tDate = (tDateRaw && typeof tDateRaw === 'object' && 'seconds' in tDateRaw)
                ? new Date((tDateRaw as any).seconds * 1000)
                : (tDateRaw && typeof tDateRaw === 'object' && '_seconds' in tDateRaw)
                ? new Date((tDateRaw as any)._seconds * 1000)
                : new Date(tDateRaw);
            const safeId = t.id ? String(t.id) : '';
            if (t.type === 'income') {
                list.push({
                    id: t.id,
                    date: tDate,
                    type: "مقبوضات خزينة",
                    category: t.category || "إيراد آخر",
                    desc: t.description || `سند قبض خزينة رقم #${safeId.substring(0, 6)}`,
                    amountIn: Number(t.amount) || 0,
                    amountOut: 0,
                    profit: Number(t.amount) || 0
                });
            } else if (t.type === 'withdrawal' || t.type === 'export') {
                list.push({
                    id: t.id,
                    date: tDate,
                    type: "مدفوعات/سحب خزينة",
                    category: t.category || "سحب مالي",
                    desc: t.description || `سند صرف خزينة رقم #${safeId.substring(0, 6)}`,
                    amountIn: 0,
                    amountOut: Number(t.amount) || 0,
                    profit: -(Number(t.amount) || 0)
                });
            }
        });
        
        if (startDate) {
            const start = new Date(startDate);
            list = list.filter(item => item.date >= start);
        }
        if (endDate) {
            const end = new Date(endDate + 'T23:59:59.999Z');
            list = list.filter(item => item.date <= end);
        }
        
        return list.sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [sales, expenses, transactions, startDate, endDate]);

    // Detail Filters
    const filteredRevenueList = useMemo(() => {
        let list = sales;
        if (startDate) {
            const start = new Date(startDate);
            list = list.filter(s => new Date(s.date) >= start);
        }
        if (endDate) {
            const end = new Date(endDate + 'T23:59:59.999Z');
            list = list.filter(s => new Date(s.date) <= end);
        }
        if (detailSearch) {
            const q = detailSearch.toLowerCase();
            list = list.filter(s => 
                (s.id ? String(s.id) : '').toLowerCase().includes(q) || 
                (s.customer?.name || '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [sales, startDate, endDate, detailSearch]);

    const filteredProfitList = useMemo(() => {
        return filteredRevenueList;
    }, [filteredRevenueList]);

    const filteredExpensesList = useMemo(() => {
        let list = expenses;
        if (startDate) {
            const start = new Date(startDate);
            list = list.filter(e => e.date && new Date(e.date.seconds ? e.date.seconds * 1000 : e.date) >= start);
        }
        if (endDate) {
            const end = new Date(endDate + 'T23:59:59.999Z');
            list = list.filter(e => e.date && new Date(e.date.seconds ? e.date.seconds * 1000 : e.date) <= end);
        }
        if (detailSearch) {
            const q = detailSearch.toLowerCase();
            list = list.filter(e => 
                (e.category || '').toLowerCase().includes(q) || 
                (e.description || '').toLowerCase().includes(q) || 
                (e.paidTo || '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [expenses, startDate, endDate, detailSearch]);

    const filteredLedgerList = useMemo(() => {
        let list = movementsList;
        if (detailSearch) {
            const q = detailSearch.toLowerCase();
            list = list.filter(item => 
                (item.id ? String(item.id) : '').toLowerCase().includes(q) || 
                (item.type ? String(item.type) : '').toLowerCase().includes(q) || 
                (item.category ? String(item.category) : '').toLowerCase().includes(q) || 
                (item.desc ? String(item.desc) : '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [movementsList, detailSearch]);

    // Excel Export Handlers
    const handleExportSummaryExcel = () => {
        const data = [
            { "البند_المالي": "اسم التقرير", "المجموع_والتفاصيل": "التقرير المالي المتقدم الشامل" },
            { "البند_المالي": "تاريخ تصدير التقرير", "المجموع_والتفاصيل": new Date().toLocaleString('ar-EG') },
            { "البند_المالي": "تاريخ بداية الفترة", "المجموع_والتفاصيل": startDate || "غير محدد (من البداية)" },
            { "البند_المالي": "تاريخ نهاية الفترة", "المجموع_والتفاصيل": endDate || "غير محدد (حتى الآن)" },
            { "البند_المالي": "العملة المعتمدة", "المجموع_والتفاصيل": settings?.currency || "SAR" },
            { "البند_المالي": "====================", "المجموع_والتفاصيل": "====================" },
            { "البند_المالي": "إجمالي الإيرادات (المبيعات)", "المجموع_والتفاصيل": formatCurrency(metrics.totalRevenue, settings?.currency) },
            { "البند_المالي": "إجمالي أرباح المبيعات", "المجموع_والتفاصيل": formatCurrency(metrics.totalProfit, settings?.currency) },
            { "البند_المالي": "إجمالي المصروفات التشغيلية", "المجموع_والتفاصيل": formatCurrency(metrics.totalExpenses, settings?.currency) },
            { "البند_المالي": "إجمالي المقبوضات/الإيرادات الأخرى", "المجموع_والتفاصيل": formatCurrency(metrics.otherIncomes, settings?.currency) },
            { "البند_المالي": "إجمالي المدفوعات/السحوبات النقدية الأخرى", "المجموع_والتفاصيل": formatCurrency(metrics.otherWithdrawals, settings?.currency) },
            { "البند_المالي": "صافي أرباح وخسائر الفترة", "المجموع_والتفاصيل": formatCurrency(metrics.netProfit, settings?.currency) },
            { "البند_المالي": "====================", "المجموع_والتفاصيل": "====================" },
            { "البند_المالي": "صافي أرباح اليوم الحالي", "المجموع_والتفاصيل": formatCurrency(metrics.dailyNet, settings?.currency) },
            { "البند_المالي": "صافي أرباح الشهر الحالي", "المجموع_والتفاصيل": formatCurrency(metrics.monthlyNet, settings?.currency) },
            { "البند_المالي": "صافي أرباح العام الحالي", "المجموع_والتفاصيل": formatCurrency(metrics.yearlyNet, settings?.currency) }
        ];
        exportToCsv(`التقرير-المالي-الشامل-${new Date().toISOString().split('T')[0]}.csv`, data);
    };

    const handleExportRevenueExcel = (rows: any[]) => {
        const data = rows.map(r => ({
            "رقم الفاتورة": (r.id ? String(r.id) : '').toUpperCase(),
            "التاريخ والوقت": getSafeDateString(r.date),
            "العميل": r.customer?.name || "عميل نقدي",
            "طريقة الدفع": r.paymentMethod === 'Cash' ? 'نقدي' : r.paymentMethod === 'Card' ? 'بطاقة' : r.paymentMethod === 'Split' ? 'مجزأ' : 'آجل',
            "القيمة المضافة": r.vatAmount || 0,
            "المجموع الكلي الفاتورة": r.total
        }));
        exportToCsv(`سجل-تفاصيل-الإيرادات-${new Date().toISOString().split('T')[0]}.csv`, data);
    };

    const handleExportProfitExcel = (rows: any[]) => {
        const data = rows.map(r => ({
            "رقم الفاتورة": (r.id ? String(r.id) : '').toUpperCase(),
            "التاريخ والوقت": getSafeDateString(r.date),
            "العميل": r.customer?.name || "عميل نقدي",
            "إجمالي الفاتورة": r.total,
            "سعر التكلفة": (r.total - (r.profit || 0)).toFixed(2),
            "صافي الربح المالي": r.profit || 0
        }));
        exportToCsv(`سجل-أرباح-المبيعات-${new Date().toISOString().split('T')[0]}.csv`, data);
    };

    const handleExportExpensesExcel = (rows: any[]) => {
        const data = rows.map(r => {
            return {
                "رقم السند": r.id ? String(r.id) : '',
                "فئة المصروف": r.category || "مصاريف تشغيلية",
                "البيان / الوصف": r.description || "بدون بيان",
                "المدفوع له": r.paidTo || "---",
                "التاريخ": getSafeDateString(r.date),
                "الحالة": r.status === 'Paid' ? 'تم الدفع' : 'معلق',
                "القيمة المالية": r.amount
            };
        });
        exportToCsv(`سجل-المصروفات-التشغيلية-${new Date().toISOString().split('T')[0]}.csv`, data);
    };

    const handleExportLedgerExcel = (rows: any[]) => {
        const data = rows.map(r => ({
            "التاريخ والوقت": getSafeDateString(r.date),
            "الرقم المرجعي (ID)": (r.id ? String(r.id) : '').toUpperCase(),
            "نوع الحركة": r.type,
            "فئة الحركة": r.category,
            "البيان والتفاصيل": r.desc,
            "الوارد (مدين)": r.amountIn || 0,
            "الصادر (دائن)": r.amountOut || 0,
            "الأثر على صافي الأرباح": r.profit
        }));
        exportToCsv(`دفتر_الحسابات_الشامل_الموحد-${new Date().toISOString().split('T')[0]}.csv`, data);
    };

    return (
        <div className="space-y-6">
            <PageHeader 
                title="التقارير المالية المتقدمة" 
                subtitle="عرض شامل للأرباح والخسائر والمصروفات وصافي الدخل مع تتبع السجلات والتحليل التفصيلي" 
                icon={PieChart} 
            />

            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm w-full">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="flex bg-slate-50 dark:bg-slate-800 rounded-2xl items-center px-4 border border-slate-100 dark:border-slate-700 w-full sm:w-auto overflow-hidden">
                        <Calendar size={18} className="text-slate-400 shrink-0" />
                        <input 
                            type="date" 
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="h-12 bg-transparent border-none px-4 font-bold outline-none text-slate-700 dark:text-slate-300 w-full text-xs"
                        />
                        <span className="text-slate-300 mx-1">|</span>
                        <input 
                            type="date" 
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="h-12 bg-transparent border-none px-4 font-bold outline-none text-slate-700 dark:text-slate-300 w-full text-xs"
                        />
                    </div>
                </div>

                <div className="w-full sm:w-auto">
                    <Button 
                        onClick={handleExportSummaryExcel}
                        className="w-full sm:w-auto bg-indigo-600 shadow-indigo-600/10 hover:bg-indigo-700 text-white font-black text-xs h-12 rounded-2xl flex items-center justify-center gap-2 px-6 shadow-md transition-all active:scale-95"
                    >
                        <FileSpreadsheet size={18} />
                        تصدير التقرير المالي الشامل (Excel)
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card 
                    onClick={() => setDetailModal({ isOpen: true, type: 'revenue', title: 'سجل تفاصيل المبيعات والإيرادات' })}
                    className="p-6 bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/30 cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between group"
                >
                    <div>
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/40 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform duration-300">
                                <DollarSign size={24} />
                            </div>
                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Revenue</span>
                        </div>
                        <p className="text-sm font-bold text-slate-500 mb-1">إجمالي الإيرادات (المبيعات)</p>
                        <p className="text-3xl font-black text-indigo-600">{formatCurrency(metrics.totalRevenue, settings?.currency)}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-indigo-100/50 dark:border-indigo-900/10 flex justify-between items-center text-[10px] font-black text-indigo-500 uppercase">
                        <span>انقر لعرض تفاصيل المبيعات</span>
                        <ArrowLeftRight size={12} className="rotate-45" />
                    </div>
                </Card>

                <Card 
                    onClick={() => setDetailModal({ isOpen: true, type: 'profit', title: 'سجل تفاصيل أرباح المبيعات' })}
                    className="p-6 bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30 cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between group"
                >
                    <div>
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/40 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300">
                                <TrendingUp size={24} />
                            </div>
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Profit</span>
                        </div>
                        <p className="text-sm font-bold text-slate-500 mb-1">إجمالي أرباح المبيعات</p>
                        <p className="text-3xl font-black text-emerald-600">{formatCurrency(metrics.totalProfit, settings?.currency)}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-emerald-100/50 dark:border-emerald-900/10 flex justify-between items-center text-[10px] font-black text-emerald-500">
                        <span>انقر لعرض تفاصيل الأرباح</span>
                        <ArrowLeftRight size={12} className="rotate-45" />
                    </div>
                </Card>

                <Card 
                    onClick={() => setDetailModal({ isOpen: true, type: 'expenses', title: 'سجل تفاصيل المصروفات التشغيلية' })}
                    className="p-6 bg-rose-50/50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/30 cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between group"
                >
                    <div>
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/40 rounded-2xl flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform duration-300">
                                <TrendingDown size={24} />
                            </div>
                            <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Expenses</span>
                        </div>
                        <p className="text-sm font-bold text-slate-500 mb-1">إجمالي المصروفات التشغيلية</p>
                        <p className="text-3xl font-black text-rose-600">{formatCurrency(metrics.totalExpenses, settings?.currency)}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-rose-100/50 dark:border-rose-900/10 flex justify-between items-center text-[10px] font-black text-rose-500">
                        <span>انقر لعرض تفاصيل المصروفات</span>
                        <ArrowLeftRight size={12} className="rotate-45" />
                    </div>
                </Card>

                <Card 
                    onClick={() => setDetailModal({ isOpen: true, type: 'net_ledger', title: 'دفتر الحساب المعاملاتي الموحد (صافي الدخل)' })}
                    className="p-6 bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30 cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between group"
                >
                    <div>
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/40 rounded-2xl flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform duration-300">
                                <Activity size={24} />
                            </div>
                            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Net</span>
                        </div>
                        <p className="text-sm font-bold text-slate-500 mb-1">صافي الربح / الخسارة (للفترة)</p>
                        <p className={`text-3xl font-black ${metrics.netProfit >= 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                            {formatCurrency(metrics.netProfit, settings?.currency)}
                        </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-amber-100/50 dark:border-amber-900/10 flex justify-between items-center text-[10px] font-black text-amber-500 font-sans">
                        <span>عرض كشف المعاملات الشامل</span>
                        <ArrowLeftRight size={12} className="rotate-45" />
                    </div>
                </Card>
            </div>

            {!startDate && !endDate && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card 
                        onClick={() => setDetailModal({ isOpen: true, type: 'net_ledger', title: 'دفتر المعاملات الشامل (أعمال اليوم)' })}
                        className="p-6 cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all group flex flex-col justify-between"
                    >
                        <div>
                            <h4 className="text-slate-500 font-bold mb-2">صافي ربح اليوم</h4>
                            <p className={`text-2xl font-black ${metrics.dailyNet >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {formatCurrency(metrics.dailyNet, settings?.currency)}
                            </p>
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 mt-2 text-right group-hover:text-indigo-500 transition-colors">انقر التفاصيل في كشف الموحد</p>
                    </Card>
                    <Card 
                        onClick={() => setDetailModal({ isOpen: true, type: 'net_ledger', title: 'دفتر المعاملات الشامل (أعمال الشهر)' })}
                        className="p-6 cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all group flex flex-col justify-between"
                    >
                        <div>
                            <h4 className="text-slate-500 font-bold mb-2">صافي ربح الشهر</h4>
                            <p className={`text-2xl font-black ${metrics.monthlyNet >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {formatCurrency(metrics.monthlyNet, settings?.currency)}
                            </p>
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 mt-2 text-right group-hover:text-indigo-500 transition-colors">انقر التفاصيل في كشف الموحد</p>
                    </Card>
                    <Card 
                        onClick={() => setDetailModal({ isOpen: true, type: 'net_ledger', title: 'دفتر المعاملات الشامل (أعمال العام)' })}
                        className="p-6 cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all group flex flex-col justify-between"
                    >
                        <div>
                            <h4 className="text-slate-500 font-bold mb-2">صافي ربح العام</h4>
                            <p className={`text-2xl font-black ${metrics.yearlyNet >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {formatCurrency(metrics.yearlyNet, settings?.currency)}
                            </p>
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 mt-2 text-right group-hover:text-indigo-500 transition-colors">انقر التفاصيل في كشف الموحد</p>
                    </Card>
                </div>
            )}

            {/* Detailed Log Modal Segment */}
            {detailModal.isOpen && (
                <Modal 
                    isOpen={detailModal.isOpen} 
                    onClose={() => { 
                        setDetailModal({ isOpen: false, type: '', title: '' }); 
                        setDetailSearch(''); 
                    }} 
                    title={detailModal.title} 
                    size="xl"
                >
                    <div className="flex flex-col gap-5 p-1">
                        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div className="relative w-full sm:w-80">
                                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input 
                                    type="text"
                                    placeholder="بحث وتصفية ذكية في السجل التفصيلي..."
                                    value={detailSearch}
                                    onChange={e => setDetailSearch(e.target.value)}
                                    className="w-full ps-10 pe-4 h-11 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm font-black text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                {detailSearch && (
                                    <button 
                                        onClick={() => setDetailSearch('')}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>

                            <Button 
                                onClick={() => {
                                    if (detailModal.type === 'revenue') handleExportRevenueExcel(filteredRevenueList);
                                    else if (detailModal.type === 'profit') handleExportProfitExcel(filteredProfitList);
                                    else if (detailModal.type === 'expenses') handleExportExpensesExcel(filteredExpensesList);
                                    else if (detailModal.type === 'net_ledger') handleExportLedgerExcel(filteredLedgerList);
                                }}
                                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center gap-2 h-11 px-5 text-xs font-black shadow-lg shadow-emerald-500/10"
                            >
                                <Download size={16} />
                                تصدير السجل إكسيل (Excel)
                            </Button>
                        </div>

                        {/* Revenue Detail View Table */}
                        {detailModal.type === 'revenue' && (
                            <div className="space-y-4">
                                <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm max-h-[460px] overflow-y-auto">
                                    <table className="w-full border-collapse text-right text-xs">
                                        <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold sticky top-0 backdrop-blur z-10">
                                            <tr>
                                                <th className="p-3.5 border-b border-slate-100 dark:border-slate-800">رقم الفاتورة</th>
                                                <th className="p-3.5 border-b border-slate-100 dark:border-slate-800">التاريخ والوقت</th>
                                                <th className="p-3.5 border-b border-slate-100 dark:border-slate-800">العميل</th>
                                                <th className="p-3.5 border-b border-slate-100 dark:border-slate-800">طريقة الدفع</th>
                                                <th className="p-3.5 border-b border-slate-100 dark:border-slate-800">الضريبة المضافة</th>
                                                <th className="p-3.5 border-b border-slate-100 dark:border-slate-800">المجموع الكلي</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {filteredRevenueList.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">لا توجد سجلات مبيعات مطابقة لبحثك في هذه المستندات.</td>
                                                </tr>
                                            ) : filteredRevenueList.map(s => (
                                                <tr key={s.id || Math.random().toString()} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="p-3.5 font-mono font-black text-slate-800 dark:text-white uppercase">#{(s.id ? String(s.id) : '').slice(-6)}</td>
                                                    <td className="p-3.5 font-bold text-slate-500">{new Date(s.date).toLocaleString('ar-EG')}</td>
                                                    <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">{s.customer?.name || "عميل نقدي"}</td>
                                                    <td className="p-3.5">
                                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                                                            {s.paymentMethod === 'Cash' ? 'نقدي' : s.paymentMethod === 'Card' ? 'بطاقة' : s.paymentMethod === 'Split' ? 'مجزأ' : 'آجل'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3.5 font-black text-slate-500">{formatCurrency(s.vatAmount || 0, settings?.currency)}</td>
                                                    <td className="p-3.5 font-black text-indigo-600">{formatCurrency(s.total, settings?.currency)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex justify-between items-center bg-indigo-50/50 dark:bg-slate-800/40 p-4 rounded-2xl border border-indigo-100 dark:border-slate-800">
                                    <span className="text-xs font-black text-indigo-800 dark:text-indigo-400">إجمالي الإيرادات المفلترة (العدد: {toArabicIndic(filteredRevenueList.length)})</span>
                                    <span className="text-lg font-black text-indigo-600">
                                        {formatCurrency(filteredRevenueList.reduce((sum, s) => sum + (Number(s.total) || 0), 0), settings?.currency)}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Profit Detail View Table */}
                        {detailModal.type === 'profit' && (
                            <div className="space-y-4">
                                <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm max-h-[460px] overflow-y-auto">
                                    <table className="w-full border-collapse text-right text-xs">
                                        <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold sticky top-0 backdrop-blur z-10">
                                            <tr>
                                                <th className="p-3.5 border-b border-slate-100 dark:border-slate-800">رقم الفاتورة</th>
                                                <th className="p-3.5 border-b border-slate-100 dark:border-slate-800">التاريخ والوقت</th>
                                                <th className="p-3.5 border-b border-slate-100 dark:border-slate-800">العميل</th>
                                                <th className="p-3.5 border-b border-slate-100 dark:border-slate-800">المجموع الكلي الفاتورة</th>
                                                <th className="p-3.5 border-b border-slate-100 dark:border-slate-800">سعر التكلفة المقدر</th>
                                                <th className="p-3.5 border-b border-slate-100 dark:border-slate-800 font-sans">صافي أرباح السلع</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {filteredProfitList.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">لا توجد أية أرباح مطابقة لبحثك في الفترة المحددة.</td>
                                                </tr>
                                            ) : filteredProfitList.map(s => (
                                                <tr key={s.id || Math.random().toString()} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="p-3.5 font-mono font-black text-slate-800 dark:text-white uppercase">#{(s.id ? String(s.id) : '').slice(-6)}</td>
                                                    <td className="p-3.5 font-bold text-slate-500">{new Date(s.date).toLocaleString('ar-EG')}</td>
                                                    <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">{s.customer?.name || "عميل نقدي"}</td>
                                                    <td className="p-3.5 font-bold text-slate-700 dark:text-slate-300">{formatCurrency(s.total, settings?.currency)}</td>
                                                    <td className="p-3.5 font-bold text-slate-400">{formatCurrency(s.total - (s.profit || 0), settings?.currency)}</td>
                                                    <td className="p-3.5 font-black text-emerald-600">{formatCurrency(s.profit || 0, settings?.currency)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex justify-between items-center bg-emerald-50/50 dark:bg-slate-800/40 p-4 rounded-2xl border border-emerald-100 dark:border-slate-800">
                                    <span className="text-xs font-black text-emerald-800 dark:text-emerald-400">إجمالي الأرباح المفلترة (العدد: {toArabicIndic(filteredProfitList.length)})</span>
                                    <span className="text-lg font-black text-emerald-600">
                                        {formatCurrency(filteredProfitList.reduce((sum, s) => sum + (Number(s.profit) || 0), 0), settings?.currency)}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Expenses Detail View Table */}
                        {detailModal.type === 'expenses' && (
                            <div className="space-y-4">
                                <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm max-h-[460px] overflow-y-auto">
                                    <table className="w-full border-collapse text-right text-xs">
                                        <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold sticky top-0 backdrop-blur z-10">
                                            <tr>
                                                <th className="p-3.5 border-b border-slate-100 dark:border-slate-800">رقم السند</th>
                                                <th className="p-3.5 border-b border-slate-100 dark:border-slate-800">فئة المصروف</th>
                                                <th className="p-3.5 border-b border-slate-100 dark:border-slate-800">البيان والوصف</th>
                                                <th className="p-3.5 border-b border-slate-100 dark:border-slate-800 font-sans">المدفوع له</th>
                                                <th className="p-3.5 border-b border-slate-100 dark:border-slate-800">التاريخ</th>
                                                <th className="p-3.5 border-b border-slate-100 dark:border-slate-800">الحالة</th>
                                                <th className="p-3.5 border-b border-slate-100 dark:border-slate-800">المبلغ</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {filteredExpensesList.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">لا توجد سندات مصاريف تشغيلية مطابقة لبحثك في الفترة المحددة.</td>
                                                </tr>
                                            ) : filteredExpensesList.map(e => {
                                                const dRaw = e.date;
                                                const formattedDate = dRaw 
                                                    ? new Date(dRaw.seconds ? dRaw.seconds * 1000 : dRaw).toLocaleString('ar-EG')
                                                    : '---';
                                                return (
                                                    <tr key={e.id || Math.random().toString()} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                        <td className="p-3.5 font-mono font-black text-slate-800 dark:text-white">#{(e.id ? String(e.id) : '').slice(-6)}</td>
                                                        <td className="p-3.5">
                                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                                                                {e.category || "مصاريف تشغيلية"}
                                                            </span>
                                                        </td>
                                                        <td className="p-3.5 font-bold text-slate-600 dark:text-slate-300">{e.description || "بدون بيان"}</td>
                                                        <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">{e.paidTo || "---"}</td>
                                                        <td className="p-3.5 font-bold text-slate-400">{formattedDate}</td>
                                                        <td className="p-3.5">
                                                            <span className={`px-2 py-1 rounded-full text-[10px] font-black ${e.status === 'Paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                                {e.status === 'Paid' ? 'تم الدفع' : 'معلق'}
                                                            </span>
                                                        </td>
                                                        <td className="p-3.5 font-black text-rose-600">{formatCurrency(e.amount, settings?.currency)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex justify-between items-center bg-rose-50/20 dark:bg-slate-800/40 p-4 rounded-2xl border border-rose-100 dark:border-slate-800">
                                    <span className="text-xs font-black text-rose-800 dark:text-rose-400">إجمالي المصروفات المفلترة (العدد: {toArabicIndic(filteredExpensesList.length)})</span>
                                    <span className="text-lg font-black text-rose-600">
                                        {formatCurrency(filteredExpensesList.reduce((sum, e) => sum + (Number(e.amount) || 0), 0), settings?.currency)}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Net Ledger Detail View Table (Chronological) */}
                        {detailModal.type === 'net_ledger' && (
                            <div className="space-y-4">
                                <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm max-h-[460px] overflow-y-auto">
                                    <table className="w-full border-collapse text-right text-xs">
                                        <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold sticky top-0 backdrop-blur z-10-row">
                                            <tr>
                                                <th className="p-3.5 border-b border-slate-100 dark:border-slate-800">التاريخ والوقت</th>
                                                <th className="p-3.5 border-b border-slate-100 dark:border-slate-800">الرقم المرجعي</th>
                                                <th className="p-3.5 border-b border-slate-100 dark:border-slate-800">نوع الحركة</th>
                                                <th className="p-3.5 border-b border-slate-100 dark:border-slate-800">فئة الحساب</th>
                                                <th className="p-3.5 border-b border-slate-100 dark:border-slate-800">البيان والتفاصيل</th>
                                                <th className="p-3.5 border-b border-slate-100 dark:border-slate-800 text-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/10">وارد (مدين)</th>
                                                <th className="p-3.5 border-b border-slate-100 dark:border-slate-800 text-rose-600 bg-rose-50/20 dark:bg-rose-950/10">صادر (دائن)</th>
                                                <th className="p-3.5 border-b border-slate-100 dark:border-slate-800">صافي الأثر</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {filteredLedgerList.length === 0 ? (
                                                <tr>
                                                    <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">لا يوجد تحركات نقدية أو معاملات مالية في هذه الفترة.</td>
                                                </tr>
                                            ) : filteredLedgerList.map((item, idx) => (
                                                <tr key={`${item.id || idx}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="p-3.5 font-bold text-slate-400">{item.date.toLocaleString('ar-EG')}</td>
                                                    <td className="p-3.5 font-mono font-black text-slate-700 dark:text-slate-300">#{(item.id ? String(item.id) : '').slice(-6).toUpperCase()}</td>
                                                    <td className="p-3.5">
                                                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black ${
                                                            item.type.includes('بيع') ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30' :
                                                            item.type.includes('مصروف') ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30' :
                                                            item.type.includes('مقبوض') ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30' :
                                                            'bg-slate-100 text-slate-600 dark:bg-slate-800'
                                                        }`}>
                                                            {item.type}
                                                        </span>
                                                    </td>
                                                    <td className="p-3.5 font-bold text-slate-500">{item.category}</td>
                                                    <td className="p-3.5 font-bold text-slate-700 dark:text-slate-200">{item.desc}</td>
                                                    <td className="p-3.5 font-black text-emerald-600 bg-emerald-50/10 dark:bg-emerald-950/10">{item.amountIn > 0 ? formatCurrency(item.amountIn, settings?.currency) : '---'}</td>
                                                    <td className="p-3.5 font-black text-rose-600 bg-rose-50/10 dark:bg-rose-950/10">{item.amountOut > 0 ? formatCurrency(item.amountOut, settings?.currency) : '---'}</td>
                                                    <td className={`p-3.5 font-black ${item.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {item.profit >= 0 ? '+' : ''}{formatCurrency(item.profit, settings?.currency)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-emerald-50/30 dark:bg-slate-800/40 p-4 rounded-xl border border-emerald-100 dark:border-slate-800 text-center">
                                        <span className="text-[10px] font-black text-emerald-600 block mb-1">إجمالي المقبوضات (مدين)</span>
                                        <span className="text-md font-black text-emerald-600">
                                            {formatCurrency(filteredLedgerList.reduce((sum, item) => sum + item.amountIn, 0), settings?.currency)}
                                        </span>
                                    </div>
                                    <div className="bg-rose-50/30 dark:bg-slate-800/40 p-4 rounded-xl border border-rose-100 dark:border-slate-800 text-center">
                                        <span className="text-[10px] font-black text-rose-600 block mb-1">إجمالي المدفوعات (دائن)</span>
                                        <span className="text-md font-black text-rose-600">
                                            {formatCurrency(filteredLedgerList.reduce((sum, item) => sum + item.amountOut, 0), settings?.currency)}
                                        </span>
                                    </div>
                                    <div className="bg-indigo-50/30 dark:bg-slate-800/40 p-4 rounded-xl border border-indigo-100 dark:border-slate-800 text-center">
                                        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 block mb-1">الأثر المالي الصافي للمجموعة</span>
                                        <span className={`text-md font-black ${filteredLedgerList.reduce((sum, item) => sum + item.profit, 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {formatCurrency(filteredLedgerList.reduce((sum, item) => sum + item.profit, 0), settings?.currency)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default AdvancedFinancialReports;
