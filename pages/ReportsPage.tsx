
import React, { useState, useEffect, useCallback } from 'react';
import Card from '../components/ui/Card';
import { api } from '../services/mockApi';
import type { FinancialReport, Product } from '../types';
import { useSettings } from '../hooks/useSettings';
import { 
    Activity, LayoutDashboard, ShoppingBag, Box, Users, DollarSign, BookOpen, BarChart3,
    Calendar, Search, Filter, Download
} from 'lucide-react';
import Button from '../components/ui/Button';

// Sub Components
import { SalesReports } from '../components/reports/SalesReports';
import { InventoryReports } from '../components/reports/InventoryReports';
import { CustomersReports } from '../components/reports/CustomersReports';
import { FinancialReports } from '../components/reports/FinancialReports';
import { AccountingReports } from '../components/reports/AccountingReports';
import { AnalyticsReports } from '../components/reports/AnalyticsReports';

const ReportsPage: React.FC = () => {
    const [reportData, setReportData] = useState<FinancialReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'sales' | 'inventory' | 'customers' | 'financial' | 'accounting' | 'analytics'>('sales');
    const { settings } = useSettings();
    
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [filterProductId, setFilterProductId] = useState('');
    const [filterCustomerId, setFilterCustomerId] = useState('');
    const [filterBranch, setFilterBranch] = useState('');
    const [filterWarehouse, setFilterWarehouse] = useState('');
    
    // Some dropdown data
    const [products, setProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);

    const [sales, setSales] = useState<any[]>([]);
    const [purchases, setPurchases] = useState<any[]>([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [report, allProducts, allCustomers, allSales, allPurchases] = await Promise.all([
                api.getFinancialReport(startDate, endDate, filterProductId, filterCustomerId),
                api.getProducts(),
                api.getCustomers(),
                api.getSales(),
                api.getPurchases()
            ]);
            setReportData(report);
            setProducts(allProducts);
            setCustomers(allCustomers);

            // Filter sales based on filters
            const filteredSales = allSales.filter(s => {
                const dateMatch = (!startDate || s.date >= startDate) && (!endDate || s.date <= endDate);
                const customerMatch = !filterCustomerId || s.customer.id === filterCustomerId;
                const productMatch = !filterProductId || s.items.some((i: any) => i.id === filterProductId);
                return dateMatch && customerMatch && productMatch;
            });
            setSales(filteredSales);

            const filteredPurchases = allPurchases.filter(p => {
                const dateMatch = (!startDate || p.date >= startDate) && (!endDate || p.date <= endDate);
                const productMatch = !filterProductId || p.items.some((i: any) => i.id === filterProductId);
                return dateMatch && productMatch;
            });
            setPurchases(filteredPurchases);

        } catch (e) { 
            console.error(e); 
        } finally { 
            setLoading(false); 
        }
    }, [startDate, endDate, filterProductId, filterCustomerId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading || !reportData || !settings) return (
        <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-black text-slate-500 animate-pulse">جاري سحب وتصنيف التقارير...</p>
        </div>
    );

    const currency = settings.currency;

    const TABS = [
        { id: 'sales', label: 'المبيعات', icon: ShoppingBag },
        { id: 'inventory', label: 'المخزون', icon: Box },
        { id: 'customers', label: 'العملاء والموردين', icon: Users },
        { id: 'financial', label: 'مالية', icon: DollarSign },
        { id: 'accounting', label: 'محاسبة', icon: BookOpen },
        { id: 'analytics', label: 'تحليل البيانات', icon: BarChart3 }
    ] as const;

    return (
        <div className="space-y-6 dir-rtl pb-10">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                        <Activity className="text-indigo-600" />
                        نظام التقارير المتقدم
                    </h1>
                    <p className="text-slate-500 font-bold">كل الأرقام والبيانات التي تحتاجها في مكان واحد</p>
                </div>
            </div>

            {/* Advanced Filters */}
            <Card className="p-4 border-none shadow-premium bg-white dark:bg-slate-900">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl flex-1 min-w-[150px]">
                        <Calendar size={16} className="text-slate-400" />
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-xs font-bold outline-none flex-1" />
                        <span className="text-slate-300">إلى</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-xs font-bold outline-none flex-1" />
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl flex-1 min-w-[150px]">
                        <ShoppingBag size={16} className="text-slate-400" />
                        <select value={filterProductId} onChange={e => setFilterProductId(e.target.value)} className="bg-transparent text-xs font-bold outline-none flex-1">
                            <option value="">كل المنتجات</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl flex-1 min-w-[150px]">
                        <Users size={16} className="text-slate-400" />
                        <select value={filterCustomerId} onChange={e => setFilterCustomerId(e.target.value)} className="bg-transparent text-xs font-bold outline-none flex-1">
                            <option value="">كل العملاء</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl flex-1 min-w-[150px]">
                        <Box size={16} className="text-slate-400" />
                        <select value={filterWarehouse} onChange={e => setFilterWarehouse(e.target.value)} className="bg-transparent text-xs font-bold outline-none flex-1">
                            <option value="">كل المخازن (الرئيسي)</option>
                        </select>
                    </div>

                    <Button onClick={fetchData} className="rounded-xl h-10 px-6 font-black shadow-lg shadow-indigo-200 dark:shadow-none">
                        <Search size={18} className="me-2" />
                        بحث
                    </Button>
                </div>
            </Card>

            {/* Navigation Tabs */}
            <div className="flex overflow-x-auto gap-2 pb-4 scrollbar-hide">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black whitespace-nowrap transition-all shadow-sm ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-indigo-500/20' : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-50 border border-slate-100 dark:border-slate-700'}`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Active Content Module */}
            <div className="min-h-[600px] bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
                {activeTab === 'sales' && <SalesReports data={reportData} currency={currency} sales={sales} />}
                {activeTab === 'inventory' && <InventoryReports data={reportData} currency={currency} products={products} purchases={purchases} sales={sales} />}
                {activeTab === 'customers' && <CustomersReports data={reportData} currency={currency} />}
                {activeTab === 'financial' && <FinancialReports data={reportData} currency={currency} />}
                {activeTab === 'accounting' && <AccountingReports data={reportData} currency={currency} />}
                {activeTab === 'analytics' && <AnalyticsReports data={reportData} currency={currency} />}
            </div>
        </div>
    );
};

export default ReportsPage;
