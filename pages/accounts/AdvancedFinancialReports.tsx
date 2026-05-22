import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { handleFirestoreError, OperationType } from '../../services/firestoreErrorHandler';
import { api } from '../../services/mockApi';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import { formatCurrency } from '../../utils/localization';
import { useSettings } from '../../hooks/useSettings';
import { Expense, Transaction, Sale } from '../../types';
import { TrendingUp, TrendingDown, DollarSign, Calendar, PieChart, Activity } from 'lucide-react';

const AdvancedFinancialReports: React.FC = () => {
    const { settings } = useSettings();
    const [loading, setLoading] = useState(true);
    
    const [sales, setSales] = useState<Sale[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

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

    return (
        <div className="space-y-6">
            <PageHeader 
                title="التقارير المالية المتقدمة" 
                subtitle="عرض شامل للأرباح والخسائر والمصروفات وصافي الدخل" 
                icon={PieChart} 
            />

            <div className="flex flex-col md:flex-row gap-4 justify-between bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-50 dark:bg-slate-800 rounded-2xl items-center px-4 border border-slate-100 dark:border-slate-700">
                        <Calendar size={18} className="text-slate-400" />
                        <input 
                            type="date" 
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="h-12 bg-transparent border-none px-4 font-bold outline-none text-slate-700 dark:text-slate-300"
                        />
                        <span className="text-slate-300 mx-2">|</span>
                        <input 
                            type="date" 
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="h-12 bg-transparent border-none px-4 font-bold outline-none text-slate-700 dark:text-slate-300"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6 bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/30">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/40 rounded-2xl flex items-center justify-center text-indigo-600">
                            <DollarSign size={24} />
                        </div>
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Revenue</span>
                    </div>
                    <p className="text-sm font-bold text-slate-500 mb-1">إجمالي الإيرادات (المبيعات)</p>
                    <p className="text-3xl font-black text-indigo-600">{formatCurrency(metrics.totalRevenue, settings?.currency)}</p>
                </Card>

                <Card className="p-6 bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/40 rounded-2xl flex items-center justify-center text-emerald-600">
                            <TrendingUp size={24} />
                        </div>
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Profit</span>
                    </div>
                    <p className="text-sm font-bold text-slate-500 mb-1">إجمالي أرباح المبيعات</p>
                    <p className="text-3xl font-black text-emerald-600">{formatCurrency(metrics.totalProfit, settings?.currency)}</p>
                </Card>

                <Card className="p-6 bg-rose-50/50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/30">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/40 rounded-2xl flex items-center justify-center text-rose-600">
                            <TrendingDown size={24} />
                        </div>
                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Expenses</span>
                    </div>
                    <p className="text-sm font-bold text-slate-500 mb-1">إجمالي المصروفات التشغيلية</p>
                    <p className="text-3xl font-black text-rose-600">{formatCurrency(metrics.totalExpenses, settings?.currency)}</p>
                </Card>

                <Card className="p-6 bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/40 rounded-2xl flex items-center justify-center text-amber-600">
                            <Activity size={24} />
                        </div>
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Net</span>
                    </div>
                    <p className="text-sm font-bold text-slate-500 mb-1">صافي الربح / الخسارة (للفترة)</p>
                    <p className={`text-3xl font-black ${metrics.netProfit >= 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                        {formatCurrency(metrics.netProfit, settings?.currency)}
                    </p>
                </Card>
            </div>

            {!startDate && !endDate && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="p-6">
                        <h4 className="text-slate-500 font-bold mb-2">صافي ربح اليوم</h4>
                        <p className={`text-2xl font-black ${metrics.dailyNet >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatCurrency(metrics.dailyNet, settings?.currency)}
                        </p>
                    </Card>
                    <Card className="p-6">
                        <h4 className="text-slate-500 font-bold mb-2">صافي ربح الشهر</h4>
                        <p className={`text-2xl font-black ${metrics.monthlyNet >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatCurrency(metrics.monthlyNet, settings?.currency)}
                        </p>
                    </Card>
                    <Card className="p-6">
                        <h4 className="text-slate-500 font-bold mb-2">صافي ربح العام</h4>
                        <p className={`text-2xl font-black ${metrics.yearlyNet >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatCurrency(metrics.yearlyNet, settings?.currency)}
                        </p>
                    </Card>
                </div>
            )}

        </div>
    );
};

export default AdvancedFinancialReports;
