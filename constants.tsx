
import {
  LayoutDashboard, ShoppingCart, Package, DollarSign, Users, Settings, LucideIcon, Truck, Building, Banknote, Warehouse, ArrowRightLeft, LifeBuoy, HelpCircle, RefreshCcw, RefreshCw, BarChart3, UserCheck, Database, FileText, Smile, Star, BrainCircuit, TrendingUp, UserX, Sparkles, Home, Briefcase, PieChart, Calculator, MessageCircle, Info, Download, Shield, ClipboardList, PenTool, HandCoins, Scale, CreditCard, Globe,
  UserCog, Clock, Wallet, Wrench, GitMerge, Calendar, Key, Timer, Factory, List, ListChecks, Coins, Building2, Send, Fingerprint
} from 'lucide-react';
import type { PermissionKey } from './types';
import type { PlanLimits } from './utils/planPermissions';

export type NavLinkType = {
  id: string; 
  t_key: string;
  href: string;
  icon: LucideIcon;
  permission?: PermissionKey;
  beta?: boolean;
  isAction?: boolean;
  isExternal?: boolean;
  color?: string;
  iconBgColor?: string;
  planKey?: keyof PlanLimits;
};

export type NavLinkGroup = {
    id: string; 
    t_key: string;
    icon: LucideIcon;
    color?: string;
    children: NavLinkType[];
}

export const NAV_LINKS: (NavLinkType | NavLinkGroup)[] = [
  { id: 'home', t_key: 'الرئيسية', href: '/', icon: Home, color: 'text-slate-600' }, 
  { id: 'dashboard', t_key: 'نظرة عامة', href: '/dashboard', icon: LayoutDashboard, permission: 'view_dashboard', color: 'text-indigo-600', iconBgColor: 'bg-indigo-600', planKey: 'hasAdvancedReports' },
  { id: 'pos', t_key: 'كاشير (POS)', href: '/pos', icon: ShoppingCart, permission: 'manage_pos', color: 'text-purple-600', iconBgColor: 'bg-purple-600' },
  
  { 
    id: 'inventory_purchases', t_key: 'المخزون والمشتريات', icon: Package, color: 'text-orange-600',
    children: [
      { id: 'products', t_key: 'المنتجات', href: '/products', icon: Package, permission: 'manage_products', color: 'text-orange-600', iconBgColor: 'bg-orange-600' },
      { id: 'categories', t_key: 'إدارة الفئات', href: '/categories', icon: List, permission: 'manage_products', color: 'text-amber-600', iconBgColor: 'bg-amber-600', planKey: 'hasCategories' },
      { id: 'warehouses', t_key: 'المستودعات', href: '/warehouses', icon: Warehouse, permission: 'manage_products', color: 'text-orange-700', iconBgColor: 'bg-orange-700' },
      { id: 'purchases', t_key: 'أوامر الشراء', href: '/purchases', icon: Truck, permission: 'manage_purchases', color: 'text-blue-600', iconBgColor: 'bg-blue-600' },
      { id: 'purchase_returns', t_key: 'مرتجعات الشراء', href: '/purchase-returns', icon: RefreshCw, permission: 'manage_purchase_returns', color: 'text-rose-600', iconBgColor: 'bg-rose-600' },
      { id: 'inventory_audit', t_key: 'جرد المخزون', href: '/inventory-audit', icon: ClipboardList, permission: 'manage_products', color: 'text-slate-600', iconBgColor: 'bg-slate-600', planKey: 'hasInventoryAudit' },
      { id: 'stock_transfer', t_key: 'التحويل المخزني', href: '/stock-transfer', icon: ArrowRightLeft, permission: 'manage_products', color: 'text-indigo-600', iconBgColor: 'bg-indigo-600', planKey: 'hasStockTransfer' },
    ]
  },

  { 
    id: 'sales_crm', t_key: 'المبيعات والعملاء', icon: DollarSign, color: 'text-rose-600',
    children: [
      { id: 'sales', t_key: 'قيود المبيعات', href: '/sales', icon: DollarSign, permission: 'view_sales', color: 'text-emerald-600', iconBgColor: 'bg-emerald-600' },
      { id: 'sales_drafts', t_key: 'مسودات الفواتير المعلقة', href: '/sales-drafts', icon: FileText, permission: 'view_sales', color: 'text-amber-600', iconBgColor: 'bg-amber-600', planKey: 'hasSalesDrafts' },
      { id: 'sales_returns', t_key: 'مرتجعات البيع', href: '/sales-returns', icon: RefreshCcw, permission: 'manage_sales_returns', color: 'text-rose-600', iconBgColor: 'bg-rose-600' },
      { id: 'installments', t_key: 'الأقساط', href: '/installments', icon: CreditCard, permission: 'manage_installments', color: 'text-indigo-600', iconBgColor: 'bg-indigo-600' },
      { id: 'crm', t_key: 'إدارة العملاء (CRM)', href: '/crm', icon: Users, permission: 'manage_customers', color: 'text-purple-600', iconBgColor: 'bg-purple-600' },
      { id: 'customers', t_key: 'قائمة العملاء', href: '/customers', icon: Users, permission: 'manage_customers', color: 'text-blue-600', iconBgColor: 'bg-blue-600' },
      { id: 'suppliers', t_key: 'الموردين', href: '/suppliers', icon: Building, permission: 'manage_suppliers', color: 'text-slate-700', iconBgColor: 'bg-slate-700' },
      { id: 'partners', t_key: 'الشركاء', href: '/partners', icon: Briefcase, permission: 'manage_partners', color: 'text-indigo-700', iconBgColor: 'bg-indigo-700' },
    ]
  },

  { 
    id: 'accounting_comprehensive', t_key: 'المالية والحسابات', icon: Calculator, color: 'text-emerald-600',
    children: [
      { id: 'treasury', t_key: 'الخزينة والبنوك', href: '/treasury', icon: Banknote, permission: 'view_treasury', color: 'text-emerald-600', iconBgColor: 'bg-emerald-600' },
      { id: 'expenses', t_key: 'إدارة المصروفات', href: '/accounts/expenses', icon: Wallet, permission: 'manage_acc_expenses', color: 'text-rose-600', iconBgColor: 'bg-rose-600', planKey: 'hasExpenses' },
      { id: 'advanced_reports', t_key: 'التقارير المالية المتقدمة', href: '/accounts/advanced-reports', icon: PieChart, permission: 'view_advanced_reports', color: 'text-indigo-600', iconBgColor: 'bg-indigo-600', planKey: 'hasAdvancedReports' },
      { id: 'financial_accounts', t_key: 'الحسابات والذمم', href: '/financial-accounts', icon: Building, permission: 'view_treasury', color: 'text-emerald-700', iconBgColor: 'bg-emerald-700', planKey: 'hasAccountStatements' },
      { id: 'financial_settlement', t_key: 'تسويات مالية', href: '/financial-settlement', icon: Scale, permission: 'view_treasury', color: 'text-teal-600', iconBgColor: 'bg-teal-600', planKey: 'hasFinancialSettlements' },
      { id: 'accounting_tools', t_key: 'أدوات محاسبية', href: '/tools/accounting', icon: Calculator, permission: 'view_dashboard', color: 'text-slate-600', iconBgColor: 'bg-slate-600', planKey: 'hasAccounting' },
      { id: 'cashier_shifts_log', t_key: 'سجل ورديات الكاشير', href: '/shifts-log', icon: Clock, permission: 'view_treasury', color: 'text-amber-600', iconBgColor: 'bg-amber-600', planKey: 'hasCashierShifts' },
    ]
  },

  { 
    id: 'hr_system', t_key: 'إدارة الموظفين', icon: UserCog, color: 'text-amber-600',
    children: [
      { id: 'hr_management', t_key: 'شؤون الموظفين والعقود', href: '/employee-management', icon: Briefcase, permission: 'manage_hr_personnel', color: 'text-amber-600', iconBgColor: 'bg-amber-600', planKey: 'hasHRPersonnel' },
      { id: 'hr_payroll', t_key: 'الرواتب والأجور', href: '/employee-management?tab=payroll', icon: Banknote, permission: 'manage_hr_personnel', color: 'text-emerald-600', iconBgColor: 'bg-emerald-600', planKey: 'hasHRSalaries' },
      { id: 'hr_requests', t_key: 'الطلبات والإجازات', href: '/employee-management?tab=requests', icon: Send, permission: 'manage_hr_personnel', color: 'text-blue-600', iconBgColor: 'bg-blue-600', planKey: 'hasHRVacations' },
      { id: 'hr_performance', t_key: 'الأداء والعمولات', href: '/employee-management?tab=performance', icon: TrendingUp, permission: 'manage_hr_personnel', color: 'text-purple-600', iconBgColor: 'bg-purple-600', planKey: 'hasHRPerformance' },
      { id: 'hr_attendance', t_key: 'الحضور والانصراف', href: '/hr/attendance', icon: Fingerprint, permission: 'manage_hr_personnel', color: 'text-amber-600', iconBgColor: 'bg-amber-600', planKey: 'hasHRAttendance' },
    ]
  },

  { 
    id: 'ops_system', t_key: 'إدارة التصنيع', icon: Factory, color: 'text-blue-600',
    children: [
      { id: 'op_manufacturing_mgmt', t_key: 'التصنيع والإنتاج', href: '/manufacturing-management', icon: Factory, permission: 'manage_op_manufacturing', color: 'text-blue-600', iconBgColor: 'bg-blue-600', planKey: 'hasOpsProduction' },
      { id: 'shipping_operations', t_key: 'الشحن واللوجستيات', href: '/shipping-operations', icon: Package, permission: 'manage_settings', color: 'text-sky-600', iconBgColor: 'bg-sky-600', planKey: 'hasShipping' },
    ]
  },

  { id: 'notes', t_key: 'المفكرة والملاحظات', href: '/notes', icon: PenTool, permission: 'manage_notes', color: 'text-indigo-500', planKey: 'hasNotes' },
  
  { 
    id: 'system_settings', t_key: 'الإعدادات والنظام', icon: Settings, color: 'text-slate-600',
    children: [
        { id: 'settings', t_key: 'إعدادات المتجر', href: '/settings', icon: Settings, permission: 'manage_settings', color: 'text-slate-600', iconBgColor: 'bg-slate-600' },
        { id: 'whatsapp', t_key: 'إعدادات الواتساب', href: '/whatsapp', icon: MessageCircle, permission: 'manage_whatsapp', color: 'text-emerald-500', iconBgColor: 'bg-emerald-500', planKey: 'hasWhatsApp' },
        { id: 'subscriptions', t_key: 'الباقات والاشتراك', href: '/pricing', icon: CreditCard, color: 'text-purple-600', iconBgColor: 'bg-purple-600' },
        { id: 'activity_logs', t_key: 'سجل النشاطات', href: '/activity-logs', icon: FileText, permission: 'view_activity_logs', color: 'text-slate-500', iconBgColor: 'bg-slate-500' },
        { id: 'faq', t_key: 'الأسئلة الشائعة', href: '/faq', icon: HelpCircle, permission: 'view_faq', color: 'text-slate-400', iconBgColor: 'bg-slate-400' },
        { id: 'about', t_key: 'عن النظام', href: '/about', icon: Info, color: 'text-indigo-500', iconBgColor: 'bg-indigo-500' },
    ]
  }
];
