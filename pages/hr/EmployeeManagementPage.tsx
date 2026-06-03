
import React, { useState, useMemo, useEffect } from 'react';
import PersonnelPage from './PersonnelPage';
import ContractsPage from './ContractsPage';
import PayrollPage from './PayrollPage';
import RequestsPage from './RequestsPage';
import EmployeePerformancePage from '../EmployeePerformancePage';
import PageHeader from '../../components/layout/PageHeader';
import { Users, FileText, DollarSign, Calendar, TrendingUp, Percent, Search, Briefcase, ChevronRight } from 'lucide-react';
import { usePlan } from '../../hooks/usePlan';
import { collection, getDocs, query, orderBy } from '../../services/localFirestore';
import { db  } from '../../services/localFirestore';
import Card from '../../components/ui/Card';

const CommissionsSummary: React.FC = () => {
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const snap = await getDocs(query(collection(db, 'hr_personnel'), orderBy('name')));
                setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchEmployees();
    }, []);

    const filtered = employees.filter(e => 
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        e.position?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600">
                        <Percent size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black">إدارة عمولات المناديب</h3>
                        <p className="text-sm font-bold text-slate-500">مراجعة نسب العمولات وسقوف الخصم لكل مندوب</p>
                    </div>
                </div>
                <div className="relative w-full md:max-w-xs">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="بحث عن مندوب..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full h-12 pr-12 pl-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none ring-2 ring-transparent focus:ring-indigo-500 transition-all"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array(6).fill(0).map((_, i) => <div key={i} className="h-48 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-3xl"></div>)
                ) : filtered.length > 0 ? (
                    filtered.map(emp => (
                        <Card key={emp.id} className="p-6 relative group overflow-hidden border-slate-100 dark:border-slate-800 hover:border-indigo-100 transition-all">
                             <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 overflow-hidden">
                                        {emp.id.includes('v') ? <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${emp.name}`} alt="" /> : <Users size={24} />}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-lg text-slate-800 dark:text-white truncate max-w-[150px]">{emp.name}</h4>
                                        <div className="flex items-center gap-1 text-slate-400 font-bold text-xs">
                                            <Briefcase size={12} /> {emp.position || 'موظف'}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-left">
                                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${emp.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                        {emp.status === 'Active' ? 'نشط' : 'غير نشط'}
                                    </span>
                                </div>
                             </div>

                             <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">نسبة العمولة</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-black text-indigo-600">{emp.commissionPercentage || 0}</span>
                                        <span className="text-xs font-bold text-indigo-400">%</span>
                                    </div>
                                </div>
                                <div className="space-y-1 text-left">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">أقصى خصم</span>
                                    <div className="flex items-baseline justify-end gap-1">
                                        <span className="text-2xl font-black text-rose-600">{emp.maxDiscountLimit || 0}</span>
                                        <span className="text-xs font-bold text-rose-400">%</span>
                                    </div>
                                </div>
                             </div>

                             <div className="mt-4 flex justify-between items-center text-xs font-bold text-slate-400 px-1">
                                <span>نوع الراتب: {emp.salaryType === 'Monthly' ? 'شهري' : (emp.salaryType || 'غير محدد')}</span>
                                <button className="flex items-center gap-1 text-indigo-500 hover:gap-2 transition-all">تعديل الإعدادات <ChevronRight size={14}/></button>
                             </div>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center opacity-30">
                        <Percent size={64} className="mx-auto mb-4" />
                        <p className="font-black text-xl">لا يوجد مناديب مسجلين</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const EmployeeManagementPage: React.FC = () => {
    const { canUse } = usePlan();
    
    const allTabs = [
        { id: 'personnel', label: 'شؤون الموظفين والعقود', icon: Users, permission: 'hasHRPersonnel' as const },
        { id: 'payroll', label: 'المرتبات والأجور', icon: DollarSign, permission: 'hasHRSalaries' as const },
        { id: 'requests', label: 'الطلبات والإجازات', icon: Calendar, permission: 'hasHRVacations' as const },
        { id: 'performance', label: 'أداء الموظفين', icon: TrendingUp, permission: 'hasHRPerformance' as const },
        { id: 'commissions', label: 'عمولات المناديب', icon: Percent, permission: 'hasHRCommissions' as const },
    ];

    const tabs = useMemo(() => {
        return allTabs.filter(tab => canUse(tab.permission));
    }, [canUse]);

    const [activeTab, setActiveTab] = useState(tabs[0]?.id || 'personnel');

    const renderContent = () => {
        if (tabs.length === 0) {
            return (
                <div className="p-20 text-center bg-white dark:bg-slate-900 rounded-[3rem] border shadow-sm">
                    <Users size={64} className="mx-auto mb-6 text-slate-200" />
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">الوصول مقيد</h3>
                    <p className="text-slate-500 font-bold">باقة اشتراكك الحالية لا تشمل الوصول للميزات المتقدمة في إدارة الموظفين.</p>
                </div>
            );
        }
        switch (activeTab) {
            case 'personnel': return <PersonnelPage />;
            case 'payroll': return <PayrollPage />;
            case 'requests': return <RequestsPage />;
            case 'performance': return <EmployeePerformancePage />;
            case 'commissions': 
                return <CommissionsSummary />;
            default: return <PersonnelPage />;
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader 
                title="إدارة الموظفين الشاملة" 
                subtitle="مركز إدارة الموارد البشرية، العقود، الرواتب والتقييم في مكان واحد"
            />

            <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs transition-all whitespace-nowrap ${
                            activeTab === tab.id
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                : 'bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800'
                        }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="animate-fadeIn">
                {renderContent()}
            </div>
        </div>
    );
};

export default EmployeeManagementPage;
