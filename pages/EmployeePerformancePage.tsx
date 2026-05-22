import React, { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import { api } from '../services/mockApi';
import { Crown, ShoppingBag, TrendingUp, TrendingDown, UserCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { EmployeePerformanceAnalytics } from '../types';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency, toArabicIndic } from '../utils/localization';
import EmployeePerformanceSkeleton from '../components/performance/EmployeePerformanceSkeleton';

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode, delay: number }> = ({ title, value, icon, delay }) => (
  <Card className="flex items-center gap-4 animate-slideDown" style={{ animationDelay: `${delay}ms` }}>
    <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg text-blue-600 dark:text-blue-400">
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
      <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{value}</p>
    </div>
  </Card>
);

import { useLicense } from '../hooks/useLicense';
import { getPlanLimits } from '../utils/planPermissions';
import { Lock } from 'lucide-react';
import Button from '../components/ui/Button';
import { Link } from 'react-router-dom';

const EmployeePerformancePage: React.FC = () => {
  const [analytics, setAnalytics] = useState<EmployeePerformanceAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const { settings } = useSettings();
  const { licenseInfo } = useLicense();
  const limits = getPlanLimits(licenseInfo.type);

  useEffect(() => {
    if (!limits.hasEmployeePerformance) return;
    const fetchData = async () => {
      setLoading(true);
      const data = await api.getEmployeePerformanceAnalytics();
      setAnalytics(data);
      setLoading(false);
    };
    fetchData();
  }, [limits.hasEmployeePerformance]);

  if (!limits.hasEmployeePerformance) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fadeIn">
            <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-4">
                <Lock size={64} />
            </div>
            <div>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white">تحليل أداء الموظفين (Premium)</h1>
                <p className="text-slate-500 mt-2 max-w-md mx-auto">تحليلات الموظفين العميقة متاحة فقط في الخطط المدفوعة.</p>
            </div>
            <Link to="/pricing">
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-lg px-8 rounded-2xl">
                    ترقية الاشتراك
                </Button>
            </Link>
        </div>
    );
  }

  const pageContent = () => {
    if (loading || !analytics || !settings) {
      return <EmployeePerformanceSkeleton />;
    }
    
    const hasData = analytics.performanceData.some(p => p.totalSalesCount > 0);
    const currency = settings.currency;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
              title="الأفضل أداءً (قيمة)" 
              value={analytics.topPerformerByValue?.userName || 'N/A'} 
              icon={<Crown />} 
              delay={100} 
          />
          <StatCard 
              title="الأكثر مبيعًا (عددًا)" 
              value={analytics.topPerformerByCount?.userName || 'N/A'} 
              icon={<ShoppingBag />} 
              delay={200} 
          />
           <StatCard 
              title="إجمالي المبيعات (كل الموظفين)" 
              value={formatCurrency(analytics.performanceData.reduce((sum, p) => sum + p.totalSalesValue, 0), currency)} 
              icon={<TrendingUp />} 
              delay={300} 
          />
        </div>

        {hasData ? (
          <>
          <Card title="مقارنة إجمالي المبيعات">
            <div style={{ width: '100%', height: 350 }}>
              <ResponsiveContainer>
                <BarChart data={analytics.performanceData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="userName" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                  <YAxis tickFormatter={(value) => toArabicIndic(`${(value as number / 1000)}k`)} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                  <Tooltip 
                      formatter={(value: number) => formatCurrency(value, currency)}
                      contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '0.5rem' }}
                   />
                  <Bar dataKey="totalSalesValue" fill="#3b82f6" name="إجمالي المبيعات" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="جدول الأداء التفصيلي">
              <div className="overflow-x-auto">
                  <table className="w-full text-sm text-start">
                      <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-800/50">
                          <tr>
                              <th className="px-4 py-3">الموظف</th>
                              <th className="px-4 py-3 text-center">إجمالي المبيعات</th>
                              <th className="px-4 py-3 text-center">عدد المبيعات</th>
                              <th className="px-4 py-3 text-center">متوسط الفاتورة</th>
                              <th className="px-4 py-3 text-center">إجمالي المرتجعات</th>
                              <th className="px-4 py-3 text-center">معدل المرتجعات</th>
                          </tr>
                      </thead>
                      <tbody>
                          {analytics.performanceData.map((p, index) => (
                              <tr key={p.userId} className="border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 animate-slideDown" style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'backwards' }}>
                                  <td className="px-4 py-3 font-medium">{p.userName}</td>
                                  <td className="px-4 py-3 text-center font-bold text-green-600">{formatCurrency(p.totalSalesValue, currency)}</td>
                                  <td className="px-4 py-3 text-center">{toArabicIndic(p.totalSalesCount)}</td>
                                  <td className="px-4 py-3 text-center">{formatCurrency(p.averageSaleValue, currency)}</td>
                                  <td className="px-4 py-3 text-center font-semibold text-red-500">{formatCurrency(p.totalReturnsValue, currency)}</td>
                                  <td className={`px-4 py-3 text-center font-semibold ${p.returnRate > 10 ? 'text-red-500' : 'text-slate-500'}`}>{toArabicIndic(p.returnRate.toFixed(2))}%</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </Card>
          </>
        ) : (
          <Card>
              <div className="text-center py-16 text-slate-500">
                  <UserCheck size={48} className="mx-auto opacity-50 mb-4" />
                  <h3 className="font-semibold text-lg">لا توجد بيانات مبيعات كافية</h3>
                  <p>ابدأ في تسجيل المبيعات لعرض تحليلات أداء الموظفين هنا.</p>
              </div>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">تحليل أداء الموظفين</h1>
      </div>
      {pageContent()}
    </div>
  );
};

export default EmployeePerformancePage;
