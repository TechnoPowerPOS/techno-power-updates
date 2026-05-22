import React from 'react';
import type { FinancialReport } from '../../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, LineChart, Line } from 'recharts';
import Card from '../ui/Card';

export const AnalyticsReports: React.FC<{ data: FinancialReport; currency: string }> = ({ data, currency }) => {
    return (
        <div className="space-y-6">
            <h2 className="text-xl font-black mb-4 px-2">تحليل البيانات والمؤشرات</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="الإيرادات مقابل المصروفات">
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.dailyStats || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                <RechartsTooltip 
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: any) => [`${value} ${currency}`, '']}
                                />
                                <Bar dataKey="revenue" name="الإيرادات" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={20} />
                                <Bar dataKey="expenses" name="المصروفات" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card title="صافي الأرباح اليومية">
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.dailyStats || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                <RechartsTooltip 
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: any) => [`${value} ${currency}`, 'الربح']}
                                />
                                <Line type="monotone" dataKey="profit" name="الربح" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
            <Card title="تحليل أرباح المنتجات" className="border-none shadow-premium flex flex-col">
                <div className="flex-1 overflow-auto text-sm custom-scrollbar p-0">
                    <table className="w-full text-sm text-start whitespace-nowrap">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 rounded-r-lg">المنتج</th>
                                <th className="px-4 py-3 text-center">صافي الربح</th>
                                <th className="px-4 py-3 rounded-l-lg">نسبة المساهمة في الربح</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {(data.productProfits || []).sort((a,b) => b.profit - a.profit).map((p, i) => (
                                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-4 py-3 font-bold text-slate-700 dark:text-white">{p.name}</td>
                                    <td className="px-4 py-3 text-center text-emerald-600 font-mono font-bold">{p.profit} {currency}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-indigo-500" style={{ width: `${Math.min((p.profit / (data.netProfit || 1)) * 100, 100)}%` }}></div>
                                            </div>
                                            <span className="text-[10px] font-mono text-slate-500">{((p.profit / (data.netProfit || 1)) * 100).toFixed(1)}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};
