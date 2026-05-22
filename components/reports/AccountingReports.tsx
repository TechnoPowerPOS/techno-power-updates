import React from 'react';
import type { FinancialReport } from '../../types';
import Card from '../ui/Card';

export const AccountingReports: React.FC<{ data: FinancialReport; currency: string }> = ({ data, currency }) => {
    return (
        <div className="space-y-6">
            <h2 className="text-xl font-black mb-4 px-2">التقارير المحاسبية والميزانية</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="ميزان المراجعة (مبسط)" className="p-0 overflow-hidden">
                    <table className="w-full text-sm text-start">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold">
                            <tr>
                                <th className="px-4 py-3">الحساب</th>
                                <th className="px-4 py-3 text-end">مدين (Debit)</th>
                                <th className="px-4 py-3 text-end">دائن (Credit)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            <tr>
                                <td className="px-4 py-3 font-bold">المبيعات</td>
                                <td className="px-4 py-3 text-end text-slate-400 font-mono">-</td>
                                <td className="px-4 py-3 text-end text-emerald-600 font-mono font-bold">{data.totalRevenue.toLocaleString()}</td>
                            </tr>
                            <tr>
                                <td className="px-4 py-3 font-bold">المشتريات / المخزون</td>
                                <td className="px-4 py-3 text-end text-rose-600 font-mono font-bold">{data.totalPurchases.toLocaleString()}</td>
                                <td className="px-4 py-3 text-end text-slate-400 font-mono">-</td>
                            </tr>
                            <tr>
                                <td className="px-4 py-3 font-bold">المصروفات</td>
                                <td className="px-4 py-3 text-end text-rose-600 font-mono font-bold">{data.totalExpenses.toLocaleString()}</td>
                                <td className="px-4 py-3 text-end text-slate-400 font-mono">-</td>
                            </tr>
                            <tr>
                                <td className="px-4 py-3 font-bold">ضريبة القيمة المضافة</td>
                                <td className="px-4 py-3 text-end text-slate-400 font-mono">-</td>
                                <td className="px-4 py-3 text-end text-emerald-600 font-mono font-bold">{data.totalTax.toLocaleString()}</td>
                            </tr>
                        </tbody>
                        <tfoot className="bg-slate-50 dark:bg-slate-800 font-black">
                            <tr>
                                <td className="px-4 py-3">الإجمالي</td>
                                <td className="px-4 py-3 text-end text-indigo-600 font-mono font-bold">{(data.totalPurchases + data.totalExpenses).toLocaleString()}</td>
                                <td className="px-4 py-3 text-end text-indigo-600 font-mono font-bold">{(data.totalRevenue + data.totalTax).toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    </table>
                </Card>

                <Card title="بيان الدخل المحاسبي" className="p-0 overflow-hidden">
                    <table className="w-full text-sm text-start">
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            <tr className="bg-indigo-50/50 dark:bg-indigo-900/10">
                                <td className="px-4 py-4 font-black text-indigo-800 dark:text-indigo-200">إجمالي الإيرادات</td>
                                <td className="px-4 py-4 text-end text-indigo-600 font-mono font-bold text-lg">{data.totalRevenue.toLocaleString()} {currency}</td>
                            </tr>
                            <tr>
                                <td className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400 pl-8">- تكلفة البضاعة المباعة</td>
                                <td className="px-4 py-3 text-end text-rose-500 font-mono font-bold">{data.totalCOGS.toLocaleString()}</td>
                            </tr>
                            <tr className="bg-slate-50 dark:bg-slate-800/50">
                                <td className="px-4 py-3 font-black text-slate-700 dark:text-slate-300">إجمالي الربح (مجمل الربح)</td>
                                <td className="px-4 py-3 text-end text-slate-700 dark:text-slate-300 font-mono font-bold">{(data.totalRevenue - data.totalCOGS).toLocaleString()} {currency}</td>
                            </tr>
                            <tr>
                                <td className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400 pl-8">- المصروفات التشغيلية</td>
                                <td className="px-4 py-3 text-end text-rose-500 font-mono font-bold">{data.totalExpenses.toLocaleString()}</td>
                            </tr>
                            <tr className="bg-emerald-50 dark:bg-emerald-900/10">
                                <td className="px-4 py-4 font-black text-emerald-800 dark:text-emerald-200">صافي الربح الدفتري</td>
                                <td className="px-4 py-4 text-end text-emerald-600 font-mono font-black text-xl">{data.netProfit.toLocaleString()} {currency}</td>
                            </tr>
                        </tbody>
                    </table>
                </Card>
            </div>
        </div>
    );
};
