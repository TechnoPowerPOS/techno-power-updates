
import React, { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import { api } from '../services/mockApi';
import { DollarSign, ShoppingBag, Package, Landmark, ArrowUpRight, TrendingUp, Settings, Check, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { DashboardAnalytics } from '../types';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency, toArabicIndic } from '../utils/localization';
import { useTranslation } from '../hooks/useTranslation';
import DashboardSkeleton from '../components/dashboard/DashboardSkeleton';
import SalesGoalWidget from '../components/dashboard/SalesGoalWidget';

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode, bgColor: string, iconColor: string, delay: number }> = ({ title, value, icon, bgColor, iconColor, delay }) => (
  <Card className={`p-0 overflow-hidden animate-slide-up group border-none shadow-sm `} style={{ animationDelay: `${delay}ms`}}>
    <div className={`p-6 ${bgColor} h-full relative transition-all duration-300 group-hover:scale-[1.02]`}>
      <div className="flex justify-between items-start mb-6">
          <div className={`p-4 rounded-3xl ${iconColor} bg-white/60 dark:bg-slate-950/20 backdrop-blur-md shadow-sm`}>{icon}</div>
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">{title}</p>
        <p className="text-3xl font-black text-slate-800 dark:text-white leading-none tracking-tight">{value}</p>
      </div>
    </div>
  </Card>
);

const DashboardPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const { settings, updateSettings } = useSettings();
  const { t } = useTranslation();

  const visibleCards = settings?.dashboardVisibleCards || ['revenue', 'transactions', 'receivables', 'stock'];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await api.getDashboardAnalytics();
        setAnalytics(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const toggleCard = (cardId: string) => {
      const newList = visibleCards.includes(cardId) 
        ? visibleCards.filter(c => c !== cardId)
        : [...visibleCards, cardId];
      if (settings) updateSettings({ ...settings, dashboardVisibleCards: newList });
  };

  if (loading || !analytics || !settings) return <DashboardSkeleton />;
  
  const currency = settings.currency;

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">نظرة عامة</h1>
            <p className="text-slate-500 font-bold mt-2">إحصائيات متقدمة لإدارة أعمالك اليوم.</p>
        </div>
        <Button variant="secondary" onClick={() => setIsConfigOpen(true)} className="rounded-2xl h-12 px-6">
            <Settings size={18} className="me-2" /> تخصيص الواجهة
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {visibleCards.map((cardId, index) => {
            if (cardId === 'revenue') return <StatCard key={cardId} title={t('dashboard.total_sales_today')} value={formatCurrency(analytics.totalSalesToday, currency)} icon={<DollarSign size={24} />} bgColor="bg-blue-50 dark:bg-blue-900/10" iconColor="text-blue-600" delay={index * 100} />;
            if (cardId === 'transactions') return <StatCard key={cardId} title={t('dashboard.todays_transactions')} value={toArabicIndic(analytics.todaysTransactions.toString())} icon={<ShoppingBag size={24} />} bgColor="bg-purple-50 dark:bg-purple-900/10" iconColor="text-purple-600" delay={index * 100} />;
            if (cardId === 'receivables') return <StatCard key={cardId} title={t('dashboard.total_receivables')} value={formatCurrency(analytics.totalReceivables, currency)} icon={<Landmark size={24} />} bgColor="bg-rose-50 dark:bg-rose-900/10" iconColor="text-rose-600" delay={index * 100} />;
            if (cardId === 'stock') return <StatCard key={cardId} title={t('dashboard.stock_value')} value={formatCurrency(analytics.totalStockValue, currency)} icon={<Package size={24} />} bgColor="bg-emerald-50 dark:bg-emerald-900/10" iconColor="text-emerald-600" delay={index * 100} />;
            return null;
        })}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
            <Card title="مخطط النمو">
                <div className="h-[350px] w-full mt-6">
                    <ResponsiveContainer>
                        <AreaChart data={analytics.monthlySales.length > 0 ? analytics.monthlySales : [{name: 'اليوم', sales: analytics.totalSalesToday}]}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 'bold' }} />
                            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontWeight: 'bold' }} />
                            <Area type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={4} fill="#2563eb" fillOpacity={0.05} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        </div>
        <div className="space-y-8">
            <SalesGoalWidget totalSalesThisMonth={analytics.totalSalesThisMonth} />
            
            <Card title="الأصناف الأكثر مبيعاً">
                <div className="space-y-6 mt-6 max-h-[300px] overflow-auto pr-2 custom-scrollbar">
                    {analytics.topProducts.map((p, i) => (
                        <div key={p.id} className="flex items-center gap-4 group">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-800 flex items-center justify-center font-black text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">{toArabicIndic(i+1)}</div>
                            <div className="flex-grow">
                                <p className="font-black text-sm text-slate-800 dark:text-white truncate max-w-[150px]">{p.name}</p>
                                <p className="text-[10px] text-slate-400 font-bold">{formatCurrency(p.totalRevenue, currency)}</p>
                            </div>
                        </div>
                    ))}
                    {analytics.topProducts.length === 0 && <p className="text-center text-slate-400 text-xs py-10">لا توجد بيانات مبيعات بعد</p>}
                </div>
            </Card>

            <Card title="تنبيهات الأصناف (النواقص)">
                <div className="space-y-6 mt-6 max-h-[300px] overflow-auto pr-2 custom-scrollbar">
                    {analytics.stockAlerts.map((p) => (
                        <div key={p.id} className="flex items-center gap-4 group">
                            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/10 flex items-center justify-center font-black text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-all">
                                <AlertTriangle size={18} />
                            </div>
                            <div className="flex-grow">
                                <p className="font-black text-sm text-slate-800 dark:text-white truncate max-w-[150px]">{p.name}</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-rose-500 font-black">المخزون: {toArabicIndic(p.stock)}</span>
                                    <span className="text-[10px] text-slate-400 font-bold">| حد الطلب: {toArabicIndic(p.reorderLevel)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {analytics.stockAlerts.length === 0 && (
                        <div className="text-center py-10">
                            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/10 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Check size={24} className="text-emerald-600" />
                            </div>
                            <p className="text-emerald-600 font-black text-xs">المخزون مكتمل ولا يوجد نواقص</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
      </div>

      <Modal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} title="تخصيص لوحة المعلومات">
          <div className="space-y-4">
              <p className="text-sm text-slate-500 font-bold">يمكنك تفعيل وتعطيل البطاقات وأيضاً ترتيبها حسب أولويتك (اضغط على الأسهم للرفع والخفض):</p>
              <div className="flex flex-col gap-3">
                  {[
                      { id: 'revenue', label: 'إجمالي مبيعات اليوم' },
                      { id: 'transactions', label: 'عدد المعاملات' },
                      { id: 'receivables', label: 'المديونيات المستحقة' },
                      { id: 'stock', label: 'قيمة المخزون' }
                  ]
                  .sort((a, b) => {
                      const idxA = visibleCards.indexOf(a.id);
                      const idxB = visibleCards.indexOf(b.id);
                      if (idxA === -1 && idxB === -1) return 0;
                      if (idxA === -1) return 1;
                      if (idxB === -1) return -1;
                      return idxA - idxB;
                  })
                  .map((card, index, array) => {
                      const isVisible = visibleCards.includes(card.id);
                      return (
                      <div key={card.id} className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${isVisible ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-800'}`}>
                          <button 
                            onClick={() => toggleCard(card.id)}
                            className={`flex flex-1 items-center justify-between font-black text-sm ${isVisible ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 opacity-60'}`}
                          >
                              {card.label}
                              {isVisible && <Check size={18} />}
                          </button>
                          {isVisible && (
                              <div className="flex items-center gap-1 border-r rtl:border-l rtl:border-r-0 border-indigo-200 dark:border-indigo-800 ps-3">
                                  <button 
                                      onClick={() => {
                                          if (index > 0) {
                                              const newList = [...visibleCards];
                                              [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
                                              if (settings) updateSettings({ ...settings, dashboardVisibleCards: newList });
                                          }
                                      }}
                                      disabled={index === 0}
                                      className="p-1.5 text-indigo-400 hover:text-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-800 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent"
                                      title="تحريك لأعلى"
                                  >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                                  </button>
                                  <button 
                                      onClick={() => {
                                          if (index < array.filter(c => visibleCards.includes(c.id)).length - 1) {
                                              const newList = [...visibleCards];
                                              [newList[index + 1], newList[index]] = [newList[index], newList[index + 1]];
                                              if (settings) updateSettings({ ...settings, dashboardVisibleCards: newList });
                                          }
                                      }}
                                      disabled={index >= array.filter(c => visibleCards.includes(c.id)).length - 1}
                                      className="p-1.5 text-indigo-400 hover:text-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-800 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent"
                                      title="تحريك لأسفل"
                                  >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                  </button>
                              </div>
                          )}
                      </div>
                  )})}
              </div>
          </div>
      </Modal>
    </div>
  );
};

export default DashboardPage;
