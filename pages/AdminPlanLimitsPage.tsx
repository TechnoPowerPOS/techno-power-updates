import React, { useState, useEffect } from 'react';
import { adminToolService } from '../services/adminToolService';
import { useToasts } from '../hooks/useToasts';
import { Save, AlertTriangle, Infinity, Zap, Box, Lock, Check, X, Settings, Plus, Users, Calculator } from 'lucide-react';
import { PLAN_LIMITS, PlanLimits, getPlanLimits, setDynamicPlanLimits } from '../utils/planPermissions';

const PLAN_LABELS: Record<string, string> = {
    'Free': 'المجانية',
    'Trial': 'التجريبية',
    'Monthly': 'الشهرية',
    'Semiannual': 'نصف السنوية',
    'Yearly': 'السنوية',
    'Lifetime': 'مدى الحياة',
    'Basic': 'الأساسية',
    'Pro': 'المحترفين',
    'Business': 'الأعمال',
    'Basic Year': 'الأساسية (سنوي)',
    'Pro Year': 'المحترفين (سنوي)',
    'Business Year': 'الأعمال (سنوي)'
};

const FIELD_LABELS: Record<string, string> = {
    isActive: 'تفعيل الباقة',
    trialDays: 'أيام الفترة التجريبية',
    maxWarehouses: 'عدد المخازن',
    maxTreasuries: 'عدد الخزائن',
    maxProducts: 'المنتجات',
    maxUsers: 'المستخدمين',
    maxSuppliers: 'حسابات الموردين',
    maxEmployees: 'حسابات الموظفين',
    maxDailySales: 'مبيعات يومية',
    maxYearlySales: 'مبيعات سنوية',
    maxDailyTreasuryTransactions: 'حركات الخزينة / يوم',
    maxBranches: 'عدد الفروع',
    hasAI: 'الذكاء الاصطناعي',
    hasEnterprise: 'ميزات الشركات',
    hasPartners: 'إدارة الشركاء',
    hasShipping: 'إدارة الشحن',
    hasAccounting: 'المحاسبة المتقدمة',
    hasEmployeePerformance: 'أداء الموظفين',
    hasInventoryAudit: 'جرد المخزون',
    hasStockTransfer: 'التحويل الداخلي',
    hasInstallments: 'نظام التقسيط',
    hasCustomerSatisfaction: 'رضا العملاء',
    hasActivityLogs: 'سجل النشاطات',
    hasBackup: 'النسخ الاحتياطي',
    hasLoyalty: 'برنامج الولاء',
    hasMultipleInvoiceDesigns: 'تصاميم فواتير',
    hasNotifications: 'الإشعارات',
    hasWhatsApp: 'إدارة الواتساب',
    hasAdvancedReports: 'التقارير المتقدمة',
    hasBarcode: 'قراءة الباركود',
    hasCreditCustomer: 'عملاء آجل',
    hasAPI: 'دعم API',
    hasExcelExport: 'تصدير إكسيل',
    hasExcelImport: 'استيراد إكسيل',
    hasLogoUpload: 'إضافة شعار العمل',
    hasCommissions: 'نظام العمولات',
    hasEcommerceAPI: 'الربط بمتجر إلكتروني',
    hasHR: 'نظام الموارد البشرية (شامل)',
    hasOperations: 'نظام العمليات والتشغيل (شامل)',
    hasAccounts: 'المحاسبة المتقدمة والشاملة',
    hasHRPersonnel: 'شؤون الموظفين',
    hasHRContracts: 'عقود الموظفين',
    hasHRSalaries: 'إدارة المرتبات والأجور',
    hasHRVacations: 'إدارة الإجازات والطلبات',
    hasHRPerformance: 'تقييم أداء الموظفين',
    hasHRCommissions: 'عمولات المناديب',
    hasOpsWorkOrders: 'أوامر التشغيل والعمل',
    hasOpsProduction: 'إدارة التصنيع والإنتاج',
    hasAccountingBudget: 'إدارة الموازنات والتقديرات',
    maxCustomers: 'عدد العملاء المسموح',
    hasExpenses: 'إدارة المصروفات',
    hasDetailedTreasury: 'كشف الخزينة المفصل',
    hasChecksManagement: 'إدارة الشيكات',
    hasAccountStatements: 'كشوف الحسابات',
    hasNotes: 'المفكرة والملاحظات',
    hasFinancialSettlements: 'التسويات المالية',
    hasCustomUi: 'تخصيص واجهة المستخدم (Layout/Fonts/Buttons)'
};

const CATEGORIES = [
    {
        id: 'settings',
        title: 'إعدادات الباقة الأساسية',
        icon: Settings,
        fields: ['isActive', 'trialDays']
    },
    {
        id: 'hr_granular',
        title: 'الموارد البشرية والموظفين',
        icon: Users,
        fields: ['hasHRPersonnel', 'hasHRContracts', 'hasHRSalaries', 'hasHRVacations', 'hasHRPerformance', 'hasHRCommissions']
    },
    {
        id: 'ops_granular',
        title: 'التصنيع والعمليات الخارجي',
        icon: Box,
        fields: ['hasOpsWorkOrders', 'hasOpsProduction']
    },
    {
        id: 'finance_granular',
        title: 'المحاسبة والمال المتقدمة',
        icon: Calculator,
        fields: ['hasAccountingBudget', 'hasAccounting', 'hasExpenses', 'hasDetailedTreasury', 'hasChecksManagement', 'hasAccountStatements', 'hasFinancialSettlements']
    },
    {
        id: 'limits',
        title: 'الحدود الرقمية',
        icon: Infinity,
        fields: ['maxUsers', 'maxBranches', 'maxWarehouses', 'maxTreasuries', 'maxProducts', 'maxSuppliers', 'maxEmployees', 'maxDailySales', 'maxYearlySales', 'maxDailyTreasuryTransactions', 'maxCustomers']
    },
    {
        id: 'features',
        title: 'الميزات المتقدمة والأدوات',
        icon: Zap,
        fields: ['hasAI', 'hasEnterprise', 'hasPartners', 'hasShipping', 'hasAccounting', 'hasAdvancedReports', 'hasAPI', 'hasEcommerceAPI', 'hasWhatsApp', 'hasLoyalty', 'hasCreditCustomer', 'hasInstallments', 'hasCommissions', 'hasExcelExport', 'hasExcelImport', 'hasLogoUpload', 'hasProEmail', 'hasNotes', 'hasCustomUi']
    },
    {
        id: 'system',
        title: 'النظام والعمليات',
        icon: Box,
        fields: ['hasCustomerSatisfaction', 'hasBarcode', 'hasEmployeePerformance', 'hasInventoryAudit', 'hasStockTransfer', 'hasActivityLogs', 'hasBackup', 'hasMultipleInvoiceDesigns', 'hasNotifications']
    }
];

const AdminPlanLimitsPage: React.FC = () => {
    const { addToast } = useToasts();
    const [limits, setLimits] = useState<Record<string, PlanLimits>>(PLAN_LIMITS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<string>('Free');
    const [isAddingPlan, setIsAddingPlan] = useState(false);
    const [newPlanName, setNewPlanName] = useState('');

    useEffect(() => {
        loadLimits();
    }, []);

    const handleCreatePlan = () => {
        if(!newPlanName.trim()) {
            addToast('يرجى كتابة اسم الباقة', 'warning');
            return;
        }
        
        if(limits[newPlanName.trim()]) {
            addToast('يوجد باقة بهذا الاسم بالفعل', 'error');
            return;
        }

        const basePlan = { ...PLAN_LIMITS['Basic'] }; // Use Basic as template
        setLimits(prev => ({
            ...prev,
            [newPlanName.trim()]: { ...basePlan, isActive: true, trialDays: 0 }
        }));
        setSelectedPlan(newPlanName.trim());
        setNewPlanName('');
        setIsAddingPlan(false);
    };

    const loadLimits = async () => {
        try {
            const data = await adminToolService.getDynamicPlanLimits();
            if (data) {
                // Fix the merge bug! We must merge deep to preserve new properties added to local hardcoded defaults
                const mergedLimits = { ...PLAN_LIMITS };
                Object.keys(data).forEach(planKey => {
                    if (mergedLimits[planKey]) {
                        mergedLimits[planKey] = { ...mergedLimits[planKey], ...data[planKey] };
                    }
                });
                
                setLimits(mergedLimits);
                setDynamicPlanLimits(mergedLimits);
            }
        } catch (e: any) {
            console.error("Failed to load plan limits", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await adminToolService.saveDynamicPlanLimits(limits);
            setDynamicPlanLimits(limits); // Update locally immediately
            addToast('تم حفظ صلاحيات الباقات بنجاح', 'success');
        } catch (e: any) {
            addToast('حدث خطأ أثناء الحفظ', 'error');
        } finally {
            setSaving(false);
        }
    };

    const updatePlanLimit = (planTitle: string, field: keyof PlanLimits, value: any) => {
        setLimits(prev => ({
            ...prev,
            [planTitle]: {
                ...prev[planTitle],
                [field]: value
            }
        }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
            </div>
        );
    }

    const currentPlan = limits[selectedPlan];

    return (
        <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white pb-2 flex items-center gap-3">
                        <Lock className="w-8 h-8 text-indigo-600 p-1.5 bg-indigo-50 dark:bg-indigo-900/50 rounded-xl" />
                        صلاحيات وحدود الباقات
                    </h2>
                    <p className="text-sm font-medium text-slate-500">تحكم بحدود وميزات كل باقة بشكل دقيق، التعديلات تطبق فوراً.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex justify-center items-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-2xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-indigo-600/20"
                >
                    <Save size={20} />
                    {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </button>
            </div>

            {/* Plans Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar -mx-6 px-6 md:mx-0 md:px-0">
                {Object.keys(limits).map(planName => (
                    <button
                        key={planName}
                        onClick={() => setSelectedPlan(planName)}
                        className={`flex whitespace-nowrap items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm min-w-max transition-all ${
                            selectedPlan === planName 
                            ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20 dark:bg-white dark:text-slate-900' 
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-800'
                        }`}
                    >
                        {PLAN_LABELS[planName] || planName}
                    </button>
                ))}
                
                {isAddingPlan ? (
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-2xl border-2 border-indigo-500 shadow-sm min-w-[250px]">
                        <input 
                            type="text" 
                            value={newPlanName} 
                            onChange={(e) => setNewPlanName(e.target.value)}
                            placeholder="اسم الباقة (إنجليزي/عربي)" 
                            className="bg-transparent border-none focus:ring-0 text-sm font-bold w-full"
                            autoFocus
                        />
                        <button onClick={handleCreatePlan} title="حفظ" className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">
                            <Check size={16} />
                        </button>
                        <button onClick={() => {setIsAddingPlan(false); setNewPlanName('');}} title="إلغاء" className="p-2 bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300">
                            <X size={16} />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsAddingPlan(true)}
                        className="flex whitespace-nowrap items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm min-w-max transition-all bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 border border-dashed border-indigo-200 dark:border-indigo-800/50"
                    >
                        <Plus size={16} />
                        إضافة باقة
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {CATEGORIES.map(category => (
                    <div key={category.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm overflow-hidden relative">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                                <category.icon size={20} strokeWidth={2.5} />
                            </div>
                            <h3 className="text-lg font-black text-slate-800 dark:text-white">{category.title}</h3>
                        </div>
                        
                        <div className="space-y-4">
                            {category.fields.map(key => {
                                if (key === 'trialDays' && selectedPlan !== 'Trial') return null;
                                
                                const fieldName = key as keyof PlanLimits;
                                const value = currentPlan[fieldName];
                                const isBoolean = typeof value === 'boolean';
                                
                                return (
                                    <div key={key} className="flex flex-col gap-2 p-3 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-colors group">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{FIELD_LABELS[fieldName] || fieldName}</label>
                                        {isBoolean ? (
                                            <button 
                                                onClick={() => updatePlanLimit(selectedPlan, fieldName, !value)}
                                                className={`flex items-center gap-3 w-full p-2 rounded-xl border-2 transition-all cursor-pointer ${
                                                    value 
                                                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' 
                                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                                                }`}
                                            >
                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${value ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                                                    {value ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
                                                </div>
                                                <span className="text-sm font-bold flex-1 text-right">{value ? 'مفعلة' : 'غير مفعلة'}</span>
                                            </button>
                                        ) : (
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={value === 999999 || value === 9999999 || value === 999 ? value : (value as number)}
                                                    onChange={(e) => updatePlanLimit(selectedPlan, fieldName, parseInt(e.target.value) || 0)}
                                                    className="w-full h-11 pl-3 pr-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm font-bold focus:border-indigo-600 focus:ring-0 transition-colors"
                                                />
                                                {(value === 999999 || value === 9999999 || value === 999) && (
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black px-2 py-1 bg-amber-100 text-amber-700 rounded-md pointer-events-none">غير محدود</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="p-5 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 rounded-3xl flex items-start gap-4 border border-amber-200/50 dark:border-amber-800/30">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-xl shrink-0">
                    <AlertTriangle size={24} />
                </div>
                <div>
                    <h4 className="font-black mb-1">ملاحظة هامة جداً</h4>
                    <p className="text-sm font-medium leading-relaxed">هذه التعديلات تنعكس مباشرة لدى كل المستخدمين في نظام الكاشير بمجرد إعادة تحميل تطبيقهم. يرجى التحديث بحذر لتجنب توقف الميزات فجأة عن عملائك.</p>
                </div>
            </div>
        </div>
    );
};

export default AdminPlanLimitsPage;

