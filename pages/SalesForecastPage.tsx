
import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { api } from '../services/mockApi';
import { generateSalesForecastAndInsights } from '../services/geminiService';
import type { SalesHistoryData } from '../types';
import { TrendingUp, Lightbulb, Lock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency } from '../utils/localization';
import SalesForecastSkeleton from '../components/forecast/SalesForecastSkeleton';
import { useLicense } from '../hooks/useLicense';
import { useToasts } from '../hooks/useToasts';
import { Link } from 'react-router-dom';

const SalesForecastPage: React.FC = () => {
    const [salesHistory, setSalesHistory] = useState<SalesHistoryData[]>([]);
    const [forecastText, setForecastText] = useState('');
    const [insightsText, setInsightsText] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadingAI, setLoadingAI] = useState(false);
    
    // Subscription-based access check
    const { licenseInfo } = useLicense();
    const { addToast } = useToasts();
    
    const isPremium = ['Semiannual', 'Yearly', 'Lifetime'].includes(licenseInfo.type);
    
    const { settings } = useSettings();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const data = await api.getSalesHistoryForForecast();
            setSalesHistory(data);
            setLoading(false);

            if (isPremium && data.length > 5) {
                setLoadingAI(true);
                const { forecast, insights } = await generateSalesForecastAndInsights(data);
                setForecastText(forecast);
                setInsightsText(insights);
                setLoadingAI(false);
            }
        };
        fetchData();
    }, [isPremium]);

    if (!isPremium) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 animate-fadeIn">
                <div className="p-6 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600">
                    <Lock size={64} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">ميزة حصرية (AI Premium)</h1>
                    <p className="text-slate-500 mt-2 max-w-md mx-auto">توقعات المبيعات والذكاء الاصطناعي متوفرة في الخطط المتقدمة (نصف سنوية فأعلى).</p>
                </div>
                <Link to="/pricing">
                    <Button className="bg-purple-600 hover:bg-purple-700 text-lg px-8">
                        ترقية الاشتراك
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <TrendingUp className="text-purple-500" />
                توقعات المبيعات (AI)
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card title="مسار المبيعات التاريخي">
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={salesHistory}>
                                    <defs>
                                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                                    <YAxis tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                                    <Tooltip 
                                        formatter={(value: number) => formatCurrency(value, settings?.currency)}
                                        contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '0.5rem' }}
                                    />
                                    <Area type="monotone" dataKey="totalSales" stroke="#8884d8" fillOpacity={1} fill="url(#colorSales)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card title="تحليل وتوقعات">
                        <div className="space-y-4">
                            {loadingAI ? (
                                <div className="space-y-2">
                                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 animate-pulse"></div>
                                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 animate-pulse"></div>
                                    <p className="text-sm text-slate-500">جاري الاتصال بنماذج الذكاء الاصطناعي...</p>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                    {forecastText || "لا توجد بيانات كافية لإنشاء توقعات دقيقة."}
                                </p>
                            )}
                        </div>
                    </Card>

                    <Card title="نصائح ترويجية">
                        <div className="flex items-start gap-3">
                            <Lightbulb className="text-yellow-500 flex-shrink-0" />
                            {loadingAI ? (
                                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full animate-pulse"></div>
                            ) : (
                                <p className="text-sm text-slate-700 dark:text-slate-300">
                                    {insightsText || "سجل المزيد من المبيعات للحصول على نصائح مخصصة."}
                                </p>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default SalesForecastPage;
