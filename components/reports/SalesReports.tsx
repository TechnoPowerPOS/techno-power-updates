import React, { useState } from 'react';
import Card from '../../components/ui/Card';
import { formatCurrency } from '../../utils/localization';
import { Download, Printer, Mail } from 'lucide-react';
import Button from '../../components/ui/Button';

export const SalesReports = ({ data, currency, sales }: any) => {
    
    // Process real numbers from the 'sales' array
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7);

    const todaySales = sales?.filter((s:any) => s.date.startsWith(today)).reduce((sum: number, s:any) => sum + s.total, 0) || 0;
    const monthSales = sales?.filter((s:any) => s.date.startsWith(currentMonth)).reduce((sum: number, s:any) => sum + s.total, 0) || 0;
    const yearSales = sales?.filter((s:any) => s.date.startsWith(today.substring(0, 4))).reduce((sum: number, s:any) => sum + s.total, 0) || 0;

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800">تقارير المبيعات</h3>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8"><Printer size={16} className="me-1"/> طباعة</Button>
                    <Button variant="outline" size="sm" className="h-8"><Download size={16} className="me-1"/> تصدير</Button>
                    <Button variant="outline" size="sm" className="h-8"><Mail size={16} className="me-1"/> مشاركة</Button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card title="مبيعات يومية / شهرية / سنوية" className="p-4 border-none shadow-premium">
                    <div className="space-y-3">
                         <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                             <span className="text-sm font-bold">مبيعات اليوم</span>
                             <span className="font-black text-indigo-600">{formatCurrency(todaySales, currency)}</span>
                         </div>
                         <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                             <span className="text-sm font-bold">مبيعات الشهر</span>
                             <span className="font-black text-indigo-600">{formatCurrency(monthSales, currency)}</span>
                         </div>
                         <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                             <span className="text-sm font-bold">مبيعات السنة</span>
                             <span className="font-black text-indigo-600">{formatCurrency(yearSales, currency)}</span>
                         </div>
                    </div>
                </Card>

                <Card title="تفاصيل الفواتير الدورية المحددة" className="border-none shadow-premium md:col-span-2 flex flex-col">
                     <div className="flex-1 overflow-auto text-sm custom-scrollbar">
                         <table className="w-full text-start">
                             <thead className="bg-slate-50 sticky top-0 z-10">
                                 <tr>
                                     <th className="p-3 text-start">رقم الفاتورة</th>
                                     <th className="p-3 text-start">التاريخ</th>
                                     <th className="p-3 text-start">العميل</th>
                                     <th className="p-3 text-start">المبلغ</th>
                                 </tr>
                             </thead>
                             <tbody>
                                 {sales?.length > 0 ? sales.map((s: any) => (
                                     <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                         <td className="p-3 font-bold">{s.id}</td>
                                         <td className="p-3">{new Date(s.date).toLocaleDateString('ar-EG')}</td>
                                         <td className="p-3">{s.customer?.name || 'غير محدد'}</td>
                                         <td className="p-3 font-black text-indigo-600 border-s">{formatCurrency(s.total, currency)}</td>
                                     </tr>
                                 )) : (
                                     <tr><td colSpan={4} className="p-4 text-center text-slate-400">لا توجد مبيعات في الفترة المحددة</td></tr>
                                 )}
                             </tbody>
                         </table>
                     </div>
                </Card>
            </div>
            
            <Card title="أرباح الفواتير" className="border-none shadow-premium flex flex-col">
                 <div className="flex-1 overflow-auto text-sm custom-scrollbar">
                     <table className="w-full text-start">
                         <thead className="bg-emerald-50 text-emerald-800 sticky top-0 z-10">
                             <tr>
                                 <th className="p-3 text-start">رقم الفاتورة</th>
                                 <th className="p-3 text-start">إجمالي البيع</th>
                                 <th className="p-3 text-start">تكلفة الفاتورة</th>
                                 <th className="p-3 text-start">صافي الربح</th>
                             </tr>
                         </thead>
                         <tbody>
                                 {sales?.length > 0 ? (
                                     <>
                                         {sales.map((s: any) => {
                                            const cost = s.items.reduce((sum: number, i: any) => sum + (i.costPrice || 0) * (i.quantity || 1), 0);
                                            const revenue = s.total || 0;
                                            const profit = revenue - cost;
                                            return (
                                                <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                                    <td className="p-3 font-bold">{s.id}</td>
                                                    <td className="p-3">{formatCurrency(revenue, currency)}</td>
                                                    <td className="p-3 font-bold text-slate-500">{formatCurrency(cost, currency)}</td>
                                                    <td className={`p-3 font-black border-s ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(profit, currency)}</td>
                                                </tr>
                                            );
                                         })}
                                         <tr className="bg-slate-900 text-white font-black sticky bottom-0">
                                             <td className="p-3">الإجمالي</td>
                                             <td className="p-3 text-indigo-300">{formatCurrency(sales.reduce((sum: number, s: any) => sum + (s.total || 0), 0), currency)}</td>
                                             <td className="p-3 text-slate-400">{formatCurrency(sales.reduce((sum: number, s: any) => sum + s.items.reduce((sc: number, i: any) => sc + (i.costPrice || 0) * (i.quantity || 1), 0), 0), currency)}</td>
                                             <td className="p-3 text-emerald-400">{formatCurrency(sales.reduce((sum: number, s: any) => sum + (s.total || 0) - s.items.reduce((sc: number, i: any) => sc + (i.costPrice || 0) * (i.quantity || 1), 0), 0), currency)}</td>
                                         </tr>
                                     </>
                                 ) : (
                                     <tr><td colSpan={4} className="p-4 text-center text-slate-400">لا توجد مبيعات في الفترة المحددة</td></tr>
                                 )}
                         </tbody>
                     </table>
                 </div>
            </Card>
        </div>
    );
};
