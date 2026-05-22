import React, { useState, useEffect } from 'react';
import type { FinancialReport, Customer } from '../../types';
import { api } from '../../services/mockApi';
import Card from '../ui/Card';
import { Users, Truck, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export const CustomersReports: React.FC<{ data: FinancialReport; currency: string }> = ({ currency }) => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [c, s] = await Promise.all([
                    api.getCustomers(),
                    api.getSuppliers()
                ]);
                setCustomers(c);
                setSuppliers(s);
            } catch(e) {}
            setLoading(false);
        };
        fetchAll();
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-slate-500 animate-pulse">جاري التحميل...</div>;
    }

    const totalCustomerDebts = customers.reduce((sum, c) => sum + (c.debt || 0), 0);
    const totalSupplierDebts = suppliers.reduce((sum, s) => sum + (s.balance || 0), 0);

    const topCustomers = [...customers].sort((a,b) => (b.debt || 0) - (a.debt || 0));

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-black mb-4 px-2">تقارير العملاء والموردين</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 border-none shadow-xl shadow-blue-500/20 text-white p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-blue-100 font-bold mb-2">إجمالي الديون على العملاء</p>
                            <h3 className="text-4xl font-black font-mono">{totalCustomerDebts.toLocaleString()} <span className="text-lg opacity-80">{currency}</span></h3>
                            <p className="text-sm mt-2 text-blue-200">أموال مستحقة للشركة</p>
                        </div>
                        <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
                            <Users size={32} />
                        </div>
                    </div>
                </Card>

                <Card className="bg-gradient-to-br from-rose-500 to-pink-600 border-none shadow-xl shadow-rose-500/20 text-white p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-rose-100 font-bold mb-2">إجمالي الديون الموردين</p>
                            <h3 className="text-4xl font-black font-mono">{totalSupplierDebts.toLocaleString()} <span className="text-lg opacity-80">{currency}</span></h3>
                            <p className="text-sm mt-2 text-rose-200">أموال مستحقة على الشركة</p>
                        </div>
                        <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
                            <Truck size={32} />
                        </div>
                    </div>
                </Card>
            </div>

            <Card title="أعلى العملاء مديونية" className="border-none shadow-premium flex flex-col">
                <div className="flex-1 overflow-auto custom-scrollbar p-4">
                    <div className="space-y-4">
                    {topCustomers.map(c => (
                        <div key={c.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                                    {c.name.substring(0,2)}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 dark:text-white">{c.name}</p>
                                    <p className="text-xs text-slate-500">{c.phone || 'بدون رقم'}</p>
                                </div>
                            </div>
                            <div className="text-end">
                                <p className="font-black text-rose-600 font-mono">{c.debt?.toLocaleString()} {currency}</p>
                                <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 justify-end">
                                    <ArrowUpRight size={12} className="text-rose-500"/> مدين
                                </p>
                            </div>
                        </div>
                    ))}
                    {topCustomers.length === 0 && <p className="text-center text-slate-500 p-4">لا توجد أي ديون على العملاء</p>}
                    </div>
                </div>
            </Card>
        </div>
    );
};
