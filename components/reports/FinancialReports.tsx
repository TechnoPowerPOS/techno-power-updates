import React from 'react';
import type { FinancialReport } from '../../types';
import Card from '../ui/Card';
import { DollarSign, TrendingUp, TrendingDown, ShoppingCart, RefreshCcw, Landmark, Box } from 'lucide-react';

export const FinancialReports: React.FC<{ data: FinancialReport; currency: string }> = ({ data, currency }) => {
    
    const kpis = [
        { label: 'إجمالي الإيرادات المبيعات', value: data.totalRevenue, color: 'text-indigo-600', bg: 'bg-indigo-50', icon: TrendingUp },
        { label: 'تكلفة البضاعة المباعة', value: data.totalCOGS, color: 'text-rose-600', bg: 'bg-rose-50', icon: TrendingDown },
        { label: 'إجمالي المشتريات', value: data.totalPurchases, color: 'text-blue-600', bg: 'bg-blue-50', icon: ShoppingCart },
        { label: 'إجمالي المصروفات', value: data.totalExpenses, color: 'text-amber-600', bg: 'bg-amber-50', icon: DollarSign },
        { label: 'إجمالي المرتجعات', value: data.totalReturns, color: 'text-orange-600', bg: 'bg-orange-50', icon: RefreshCcw },
        { label: 'إجمالي ضريبة القيمة المضافة', value: data.totalTax, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Landmark },
        { label: 'إجمالي تكلفة المخزون الفعلي', value: data.totalStockValue || 0, color: 'text-violet-600', bg: 'bg-violet-50', icon: Box },
    ];

    const today = new Date().toISOString().split('T')[0];
    const todayStat = data.dailyStats?.find(s => s.date === today);
    const todayProfit = todayStat?.profit || 0;

    return (
        <div className="space-y-6 pb-10">
            <h2 className="text-xl font-black mb-4 px-2">التقارير المالية والملخص</h2>
            
            {/* Daily Profit Card */}
            <Card className="p-6 bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">صافي ربح اليوم ({new Date().toLocaleDateString('ar-EG')})</p>
                        <h3 className="text-3xl font-black text-emerald-700 dark:text-emerald-300">
                            {todayProfit.toLocaleString()} <span className="text-sm">{currency}</span>
                        </h3>
                    </div>
                    <div className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <DollarSign size={28} />
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {kpis.map((kpi, i) => (
                    <Card key={i} className="p-6 transition-all hover:-translate-y-1">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-bold text-slate-500 mb-2">{kpi.label}</p>
                                <h3 className={`text-2xl font-black font-mono ${kpi.color}`}>
                                    {kpi.value.toLocaleString()} <span className="text-xs">{currency}</span>
                                </h3>
                            </div>
                            <div className={`p-4 rounded-2xl ${kpi.bg} ${kpi.color}`}>
                                <kpi.icon size={24} />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none shadow-xl shadow-indigo-500/20 p-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <p className="text-indigo-100 font-bold mb-2">صافي الأرباح (النهائي)</p>
                        <h2 className="text-5xl font-black font-mono">
                            {data.netProfit.toLocaleString()} <span className="text-2xl opacity-80">{currency}</span>
                        </h2>
                        <p className="text-sm mt-4 text-indigo-200">
                            * صافي الربح = (الإيرادات - المرتجعات - الضرائب) - تكلفة البضاعة المباعة - المصروفات
                        </p>
                    </div>
                    <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                        <DollarSign size={40} className="text-white" />
                    </div>
                </div>
            </Card>
        </div>
    );
};
