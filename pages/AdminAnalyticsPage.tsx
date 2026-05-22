
import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import { adminToolService } from '../services/adminToolService';
import { toArabicIndic } from '../utils/localization';
import { Users, MapPin, PieChart, TrendingUp, UserPlus, Globe } from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
    PieChart as RePieChart, Pie, Cell, Legend,
    LineChart, Line, CartesianGrid
} from 'recharts';

const AdminAnalyticsPage: React.FC = () => {
    const [signups, setSignups] = useState<{ date: string, count: number }[]>([]);
    const [plans, setPlans] = useState<{ plan: string, count: number }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const [s, p] = await Promise.all([
                adminToolService.getNewSignupsStats(),
                adminToolService.getPlanDistribution()
            ]);
            setSignups(s);
            setPlans(p);
            setLoading(false);
        };
        load();
    }, []);

    const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6', '#F43F5E'];

    if (loading) return <div className="p-10 text-center">جاري تحميل التحليلات...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8" dir="rtl">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white">تحليلات النمو والتوزيع</h1>
                    <p className="text-slate-500 mt-1">مراقبة حملات التسويق، جغرافيا المستخدمين، وتوزيع المشتركين.</p>
                </div>
                <div className="flex gap-4">
                    <Card className="px-6 py-2 border-none shadow-sm flex items-center gap-3">
                         <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                            <UserPlus size={20} />
                         </div>
                         <div>
                            <span className="text-xs text-slate-400 block font-bold">تسجيلات اليوم</span>
                            <span className="text-xl font-black text-slate-800 dark:text-white">+{toArabicIndic(signups[signups.length-1]?.count || 0)}</span>
                         </div>
                    </Card>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* New Signups Chart */}
                <Card title="المستخدمون الجدد اليوم (New Signups)" icon={<TrendingUp size={20} className="text-indigo-500"/>}>
                    <div className="h-80 w-full mt-6" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={signups}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                                <Tooltip 
                                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                                />
                                <Line type="monotone" dataKey="count" stroke="#6366F1" strokeWidth={4} dot={{r: 6, fill: '#6366F1', strokeWidth: 2, stroke: '#fff'}} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-slate-400 mt-4 font-bold">* يساعد هذا الرسم البياني في تتبع فعالية حملات التسويق اللحظية.</p>
                </Card>

                {/* Plan Distribution */}
                <Card title="توزيع المشتركين على الباقات" icon={<PieChart size={20} className="text-emerald-500"/>}>
                    <div className="h-80 w-full mt-6" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                                <Pie
                                    data={plans}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="count"
                                    nameKey="plan"
                                >
                                    {plans.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36}/>
                            </RePieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default AdminAnalyticsPage;
