import React, { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import { api } from '../services/mockApi';
import { analyzeSuppliers } from '../services/geminiService';
import { Truck, BarChart2, MessageSquare, TrendingUp, TrendingDown, Package } from 'lucide-react';
import type { SupplierPerformanceData } from '../types';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency, toArabicIndic } from '../utils/localization';
import SupplierAnalysisSkeleton from '../components/analysis/SupplierAnalysisSkeleton';

const EmptyState: React.FC = () => (
    <Card>
        <div className="text-center py-16 text-slate-500">
            <BarChart2 size={48} className="mx-auto opacity-50 mb-4" />
            <h3 className="font-semibold text-lg">لا توجد بيانات كافية للتحليل</h3>
            <p>قم بتسجيل بعض طلبات الشراء أولاً لعرض تحليل أداء الموردين هنا.</p>
        </div>
    </Card>
);

const SupplierAnalysisPage: React.FC = () => {
    const [performanceData, setPerformanceData] = useState<SupplierPerformanceData[]>([]);
    const [aiAnalysis, setAiAnalysis] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);
    const { settings } = useSettings();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setLoadingAnalysis(true);
            const data = await api.getSupplierPerformanceData();
            setPerformanceData(data.sort((a,b) => b.totalPurchaseValue - a.totalPurchaseValue));
            setLoading(false);
            
            if (data && data.length > 0) {
                const analysisText = await analyzeSuppliers(data);
                setAiAnalysis(analysisText);
            }
            setLoadingAnalysis(false);
        };
        fetchData();
    }, []);
    
    const pageContent = () => {
        if (loading) {
            return <SupplierAnalysisSkeleton />;
        }
        
        if (!performanceData || performanceData.length === 0) {
            return <EmptyState />;
        }
    
        return (
            <div className="space-y-6">
                <Card title="توصية ذكية">
                    <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="flex-shrink-0 text-blue-500 pt-1">
                            <MessageSquare size={24} />
                        </div>
                        <div>
                        {loadingAnalysis ? (
                            <p className="text-sm text-slate-500">جاري تحليل البيانات...</p>
                        ) : (
                            <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{aiAnalysis}</p>
                        )}
                        </div>
                    </div>
                </Card>

                <Card title="بيانات أداء الموردين">
                     <div className="overflow-x-auto">
                        <table className="w-full text-sm text-start">
                            <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="px-4 py-3">المورد</th>
                                    <th className="px-4 py-3 text-center">إجمالي قيمة المشتريات</th>
                                    <th className="px-4 py-3 text-center">عدد الطلبات</th>
                                    <th className="px-4 py-3 text-center">معدل المرتجعات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {performanceData.map((p) => (
                                    <tr key={p.supplierId} className="border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                        <td className="px-4 py-3 font-medium flex items-center gap-2">
                                            <Truck size={16} />
                                            <span>{p.supplierName}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center font-bold text-green-600">
                                            <div className="flex items-center justify-center gap-1">
                                                <TrendingUp size={14} />
                                                <span>{formatCurrency(p.totalPurchaseValue, settings?.currency)}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                             <div className="flex items-center justify-center gap-1">
                                                <Package size={14} />
                                                <span>{toArabicIndic(p.purchaseCount)}</span>
                                             </div>
                                        </td>
                                        <td className={`px-4 py-3 text-center font-semibold ${p.returnRate > 5 ? 'text-red-500' : 'text-slate-500'}`}>
                                            <div className="flex items-center justify-center gap-1">
                                                <TrendingDown size={14} />
                                                <span>{toArabicIndic(p.returnRate.toFixed(2))}%</span>
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
    }
    
    return (
        <div className="animate-fadeIn">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">تحليل أداء الموردين (AI)</h1>
            {pageContent()}
        </div>
    );
};

export default SupplierAnalysisPage;
