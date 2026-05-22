
import React, { useState, useMemo } from 'react';
import WorkOrdersPage from './WorkOrdersPage';
import ManufacturingPage from './ManufacturingPage';
import PageHeader from '../../components/layout/PageHeader';
import { Settings, ClipboardList, Factory, Box } from 'lucide-react';
import { usePlan } from '../../hooks/usePlan';

const ManufacturingManagementPage: React.FC = () => {
    const { canUse } = usePlan();
    
    const allTabs = [
        { id: 'manufacturing', label: 'إدارة التصنيع والإنتاج', icon: Factory, permission: 'hasOpsProduction' as const },
        { id: 'work-orders', label: 'أوامر التشغيل', icon: ClipboardList, permission: 'hasOpsWorkOrders' as const },
    ];

    const tabs = useMemo(() => {
        return allTabs.filter(tab => canUse(tab.permission));
    }, [canUse]);

    const [activeTab, setActiveTab] = useState(tabs[0]?.id || 'manufacturing');

    const renderContent = () => {
        if (tabs.length === 0) {
            return (
                <div className="p-20 text-center bg-white dark:bg-slate-900 rounded-[3rem] border shadow-sm">
                    <Factory size={64} className="mx-auto mb-6 text-slate-200" />
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">الوصول مقيد</h3>
                    <p className="text-slate-500 font-bold">باقة اشتراكك الحالية لا تشمل الوصول للميزات المتقدمة في إدارة العمليات والتصنيع.</p>
                </div>
            );
        }
        switch (activeTab) {
            case 'manufacturing': return <ManufacturingPage />;
            case 'work-orders': return <WorkOrdersPage />;
            default: return <ManufacturingPage />;
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader 
                title="إدارة التصنيع والعمليات" 
                subtitle="تخطيط الإنتاج، مراقبة الجودة، وإدارة أوامر التشغيل والتشغيل"
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

export default ManufacturingManagementPage;
