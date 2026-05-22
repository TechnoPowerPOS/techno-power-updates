import React from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Download, Printer, Mail } from 'lucide-react';
import { formatCurrency } from '../../utils/localization';

export const InventoryReports = ({ data, currency, products }: any) => {

    const totalInventoryValue = products?.reduce((sum: number, p: any) => sum + (p.costPrice || 0) * (p.stock || 0), 0) || 0;
    const lowStockItems = products?.filter((p: any) => p.stock <= (p.minAlertQty || 5)) || [];

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800">تقارير المخزون</h3>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8"><Printer size={16} className="me-1"/> طباعة</Button>
                    <Button variant="outline" size="sm" className="h-8"><Download size={16} className="me-1"/> تصدير</Button>
                    <Button variant="outline" size="sm" className="h-8"><Mail size={16} className="me-1"/> إرسال</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="مخزون وحركة الأصناف" className="border-none shadow-premium flex flex-col">
                    <div className="flex-1 overflow-auto text-sm custom-scrollbar">
                        <table className="w-full text-start">
                            <thead className="bg-slate-50 sticky top-0 z-10">
                                <tr>
                                    <th className="p-3 text-start">اسم الصنف</th>
                                    <th className="p-3 text-center">الكمية الحالية</th>
                                    <th className="p-3 text-start">قيمة المخزون</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products?.map((p: any) => (
                                    <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                        <td className="p-3 font-bold">{p.name}</td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-1 rounded inline-block ${p.stock <= (p.minAlertQty || 5) ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {p.stock}
                                            </span>
                                        </td>
                                        <td className="p-3 font-medium text-slate-600">
                                            {formatCurrency((p.costPrice || 0) * (p.stock || 0), currency)}
                                        </td>
                                    </tr>
                                ))}
                                {(!products || products.length === 0) && (
                                    <tr><td colSpan={3} className="p-4 text-center text-slate-400">لا يوجد أصناف في المخزن</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card title="النواقص وحد الطلب" className="border-none shadow-premium flex flex-col">
                    <div className="flex-1 overflow-auto text-sm custom-scrollbar">
                         <table className="w-full text-start">
                            <thead className="bg-rose-50 text-rose-800 sticky top-0 z-10">
                                <tr>
                                    <th className="p-3 text-start">اسم الصنف</th>
                                    <th className="p-3 text-center">الكمية الحالية</th>
                                    <th className="p-3 text-center">حد الطلب</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lowStockItems.map((p: any) => (
                                    <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                        <td className="p-3 font-bold text-rose-700">{p.name}</td>
                                        <td className="p-3 text-center font-black text-rose-600">
                                            {p.stock}
                                        </td>
                                        <td className="p-3 text-center font-medium text-slate-500">
                                            {p.minAlertQty || 5}
                                        </td>
                                    </tr>
                                ))}
                                {lowStockItems.length === 0 && (
                                    <tr><td colSpan={3} className="p-4 text-center text-slate-400">لا يوجد نواقص حالياً</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
            
            <Card className="p-6 text-center border-none shadow-premium bg-gradient-to-r from-indigo-50 to-blue-50">
                <h4 className="text-sm font-bold text-slate-500 mb-2">إجمالي تكلفة المخزون الفعلي (حسب سعر الشراء)</h4>
                <div className="text-4xl font-black text-indigo-700">{formatCurrency(totalInventoryValue, currency)}</div>
            </Card>
        </div>
    );
};
