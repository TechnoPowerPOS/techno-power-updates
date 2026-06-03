
import type { CurrencyCode } from './utils/localization';
import type { PERMISSION_KEYS } from './permissions';

export type PermissionKey = typeof PERMISSION_KEYS[number];
export type Permissions = Partial<Record<PermissionKey, boolean>>;

export interface GlobalSettings {
    globalLogoUrl?: string;
    hiddenModules?: string[];
    customModuleNames?: Record<string, string>;
    moduleOrder?: string[];
    popupOffer?: {
        enabled: boolean;
        title: string;
        message: string;
        imageUrl?: string;
        buttonText?: string;
        linkUrl?: string;
    };
    socialLinks?: {
        twitter?: string;
        facebook?: string;
        instagram?: string;
        youtube?: string;
        website?: string;
    };
    supportContact?: {
        phone?: string;
        email?: string;
    };
}

export type CustomerTier = 'Regular' | 'Wholesale' | 'Retail' | 'VIP';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  roleId: string;
  permissions?: Permissions;
  avatarUrl?: string;
  commissionRate?: number;
}

export interface Employee {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  position: string;
  department: string;
  status: 'Active' | 'Inactive' | 'On Leave' | 'Terminated';
  salary: number;
  salaryType: 'Monthly' | 'Weekly' | 'Daily' | 'Yearly' | 'Semiannual';
  payday: number; // Day of month/week
  shiftType?: 'Morning' | 'Evening' | 'FullTime';
  maxAdvance?: number;
  startDate: string;
  joinDate?: any;
  commissionPercentage: number;
  maxDiscountLimit: number;
  shift?: string;
  contractType?: 'Term' | 'Permanent' | 'Project Based';
  contractEndDate?: string;
}

export interface HRRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'Leave' | 'Loan' | 'Expense' | 'Complaint' | 'Other';
  title: string;
  description: string;
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  amount?: number; // For loans/expenses
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  month: number;
  year: number;
  basicSalary: number;
  allowances: number;
  deductions: number;
  commissions: number;
  netSalary: number;
  status: 'Pending' | 'Paid' | 'Cancelled';
  paymentDate?: string;
  treasuryId?: string;
  expenseId?: string;
}

export interface Role {
  id: string;
  name: string;
  permissions: Permissions;
}

export interface ProductAttribute {
  name: string;
  values: string[];
}

export interface ProductVariant {
  id: string;
  sku: string;
  price: number;
  stock: number;
  attributes: Record<string, string>;
}

export type ProductUnit = 'Piece' | 'Box' | 'KG' | 'Meter' | 'Litre' | 'Set';

export interface Category {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
}

export interface ProductVariant {
  id: string; // unique id for the variant
  size?: string;
  color?: string;
  barcode: string; // barcode specific to this variant
  sku?: string;
  stock?: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  sku: string;
  stock: number;
  warehouseStocks: Record<string, number>;
  reorderLevel: number;
  costPrice: number;
  sellPrice: number;
  unit?: ProductUnit;
  description?: string;
  imageUrl?: string;
  isFeatured?: boolean;
  productionDate?: string;
  expiryDate?: string;
  hasVariants?: boolean;
  variants?: ProductVariant[];
  isSerialized?: boolean;
  offerType?: 'bundle' | 'seasonal' | 'none';
  offerThreshold?: number;
  offerDiscountType?: 'percent' | 'amount';
  offerDiscountValue?: number;
}

export interface CustomerDebtTransaction {
  id: string;
  customerId: string;
  type: 'Debt' | 'Payment';
  amount: number;
  date: string;
  dueDate?: string;
  description: string;
  referenceId?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  debt: number;
  points: number;
  tier?: CustomerTier;
  creditLimit?: number;
  totalSpent?: number;
  userId?: string; // Linked Employee/User
}

export interface SaleItem {
  id: string;
  name: string;
  quantity: number;
  sellPrice: number;
  originalPrice: number;
  discountPercent?: number;
  discount?: number;
  costPrice?: number;
  subtotal?: number;
}

export interface Sale {
  id: string;
  date: string;
  customer: { id: string; name: string };
  cashier: { id: string; name: string };
  items: SaleItem[];
  total: number;
  subtotal: number;
  amountPaid: number;
  paymentMethod: 'Cash' | 'Card' | 'Transfer' | 'Split' | 'Credit';
  discount: number;
  discountType: 'amount' | 'percent';
  shipping: number;
  vatAmount?: number;
  status: 'Completed' | 'Refunded' | 'Draft' | 'Confirmed' | 'PendingReview' | 'Reservation';
  warehouseId: string;
  treasuryId: string;
  pointsRedeemed?: number;
  profit?: number;
  partnerProfits?: { partnerId: string, partnerName: string, profit: number }[];
  installmentPlan?: any;
  payments?: PaymentDetail[];
  shiftId?: string;
  employeeId?: string;
  commissionAmount?: number;
}

export interface PaymentDetail {
  method: 'Cash' | 'Card' | 'Transfer' | 'Credit';
  amount: number;
}

export interface Purchase {
  id: string;
  date: string;
  supplier: { id: string; name: string };
  items: any[];
  total: number;
  amountPaid: number;
  paymentMethod: string;
  status: 'Paid' | 'Partial' | 'Unpaid';
  discount: number;
  discountType: 'amount' | 'percent';
  warehouseId: string;
  treasuryId: string;
  employeeId?: string;
  commissionAmount?: number;
}

export interface SupplierDebtTransaction {
  id: string;
  supplierId: string;
  type: 'Debt' | 'Payment';
  amount: number;
  date: string;
  dueDate?: string;
  description: string;
  referenceId?: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  contactPerson: string;
  email?: string;
  address?: string;
  debt: number; // For keeping track of supplier balance
  creditLimit?: number;
  userId?: string; // Linked Employee/User
  companyName?: string; // Company they belong to
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  isDefault?: boolean;
}

export interface StoreSettings {
  storeName: string;
  vatRate: number;
  taxRegisterNumber: string;
  invoiceFooter: string;
  logoUrl: string;
  invoiceQrUrl?: string;
  currency: CurrencyCode;
  decimalPlaces?: number;
  socialLinks?: {
    twitter?: string;
    facebook?: string;
    instagram?: string;
    youtube?: string;
    website?: string;
  };
  nextInvoiceNumber: number;
  invoiceNumberPrefix: string;
  enableOffers?: boolean;
  enableExchange?: boolean;
  enableReservations?: boolean;
  posLayout?: 'classic' | 'horizontal' | 'streamlined' | 'grid' | 'invoice';
  appLayout?: 'classic' | 'modern' | 'ultra';
  visiblePages: string[];
  homeGridItems: string[]; 
  dashboardVisibleCards?: string[]; 
  storePhone?: string;
  storeEmail?: string;
  storeAddress?: string;
  monthlySalesGoal?: number;
  sidebarItemsOrder?: string[];
  hiddenSidebarGroups?: string[];
  inventorySettings?: {
    minAlertQty: number;
    allowSaleWithoutStock: boolean;
    enableExpiryDates?: boolean;
    enableProductVariants?: boolean;
    staleDays?: number;
  };
  whatsappMode?: 'wa.me' | 'api';
  whatsappApiUrl?: string;
  whatsappToken?: string;
  whatsappPhoneId?: string;
  whatsappAutoSendOnInvoice?: boolean;
  whatsappAutoSendOnDebt?: boolean;
  enableSoundEffects: boolean;
  enablePosCategories: boolean;
  enableShiftManagement: boolean;
  commissionCalcMethod?: 'before_discount' | 'after_discount';
  homePageStyle?: 'classic' | 'modern' | 'bento';
  invoiceStyle?: 'thermal' | 'a4_classic' | 'a4_modern';
  autoLockTimeout?: number;
  fontSize?: 'small' | 'medium' | 'large';
  activeTheme?: any;
  fontFamily?: string;
  animationPreset?: string;
  enableChatPower?: boolean;
  enableSidebar?: boolean;
  enableHeaderTabs?: boolean;
  buttonStyle?: 'rounded' | 'squared' | 'pill';
  buttonColor?: string;
  notificationSettings?: {
    backupReminder: boolean;
    systemEvents: boolean;
    paymentDelays: boolean;
    debtAlert: boolean;
    stockAlert: boolean;
    enabled: boolean;
    expiryAlertDays?: number;
  };
  autoBackup?: {
    enabled: boolean;
    lastBackupAt: number;
    intervalMinutes: number;
    localPath?: string;
  };
  invoiceDesign: {
    template: 'modern' | 'classic' | 'minimal' | 'thermal' | 'free' | 'professional';
    showLogo: boolean;
    showQrCode: boolean;
    showBarcode?: boolean;
    accentColor: string;
    customCss?: string;
    customHtml?: string;
    vatNumber?: string;
  };
  loyaltySettings: {
    enabled: boolean;
    earningRate: number; // For backwards compatibility, it can be multiplier or divisor based on logic, but we can keep the field name and change logic or just use it.
    redemptionRate: number;
    allowCreditPoints: boolean; // خيار نقاط الآجل
    minOrderAmountToEarn?: number; // الحد الأدنى لكسب النقاط
    amountPerPoint?: number; // المبلغ الذي يساوي نقطة واحدة
  };
  hardwareSettings?: {
    enableScanner?: boolean;
    useThermalPrinter?: boolean;
    printerPaperSize?: '80mm' | '58mm' | 'A4';
    autoPrintReceipt?: boolean;
    printMode?: 'browser' | 'escpos';
    barcodeSuffix?: string;
    defaultPrinterName?: string;
  };
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  user: string;
}

export interface FinancialReport {
  totalRevenue: number;
  totalCOGS: number;
  totalExpenses: number;
  totalPurchases: number;
  totalReturns: number;
  totalTax: number;
  netProfit: number;
  productProfits: { id: string; name: string; profit: number }[];
  dailyStats: any[];
}

export interface Partner {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  companyName?: string;
  taxNumber?: string;
  commercialRecord?: string;
  sharePercentage: number;
  capitalInvested: number;
  currentBalance: number;
  status: 'Active' | 'Inactive' | 'Suspended';
  joinedDate: string;
  lastSettlementDate?: string;
  profitShareConfig?: {
    shareInSales: boolean;
    shareInExpenses: boolean;
    shareInPurchases: boolean;
  };
  bankDetails?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    iban: string;
  };
  notes?: string;
  lastSettlementDate?: string;
  profitShareConfig?: {
    shareInSales: boolean;
    shareInExpenses: boolean;
  };
}

export interface PartnerTransaction {
  id: string;
  partnerId: string;
  date: string;
  type: 'Deposit' | 'Withdrawal' | 'ProfitDistribution' | 'LossDistribution';
  amount: number;
  description: string;
  referenceDocument?: string;
}

export interface Treasury {
  id: string;
  name: string;
  balance: number;
  currency: string;
  isDefault?: boolean;
  type?: 'safe' | 'bank';
}

export interface InstallmentPlan {
  id: string;
  customerName: string;
  saleId: string;
  remainingAmount: number;
  totalWithInterest: number;
  downPayment: number;
  interestRate: number;
  interestAmount: number;
  monthlyPayment: number;
  numberOfInstallments: number;
  status: 'Active' | 'Paid Off';
  payments: any[];
}

export interface SatisfactionAnalytics {
  happy: number;
  neutral: number;
  unhappy: number;
  total: number;
}

export interface SalesHistoryData {
  date: string;
  totalSales: number;
}

export interface SupplierPerformanceData {
  supplierId: string;
  supplierName: string;
  totalPurchaseValue: number;
  purchaseCount: number;
  returnRate: number;
}

export interface SuggestedOffer {
  discount: number;
  reason: string;
}

export interface SalesReturn {
  id: string;
  date: string;
  originalSaleId: string;
  items: any[];
  totalRefund: number;
  user: { id: string; name: string };
  warehouseId: string;
  treasuryId: string;
  employeeId?: string;
  commissionDeducted?: number;
}

export interface PurchaseReturnItem {
  productId: string;
  name: string;
  costPrice: number;
  quantity: number;
}

export interface PurchaseReturn {
  id: string;
  date: string;
  originalPurchaseId: string;
  items: PurchaseReturnItem[];
  totalRecovered: number;
  reason?: string;
  user: { id: string; name: string };
  warehouseId: string;
  treasuryId: string;
  employeeId?: string;
  commissionDeducted?: number;
}

export interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'withdrawal' | 'transfer' | 'export'; // أضفنا تصدير
  category: string;
  amount: number;
  description: string;
  user: string;
  treasuryId: string;
  toTreasuryId?: string; 
  destinationAccount?: string; // تفاصيل الحساب المصدر إليه
}

export interface StockTransfer {
  id: string;
  date: string;
  productId?: string;
  items?: {productId: string; quantity: number}[];
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity?: number;
}

export interface Notification {
  id: string;
  date: string;
  type: 'LOW_STOCK' | 'PROFIT_ALERT' | 'UNUSUAL_EXPENSE' | 'INFO' | 'PAYMENT_DELAY';
  message: string;
}

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export interface DashboardAnalytics {
  totalSalesToday: number;
  totalSalesThisMonth: number;
  todaysTransactions: number;
  totalInvoices: number;
  totalConfirmedOrders: number;
  totalPendingOrders: number;
  totalReturns: number;
  totalReceivables: number;
  totalStockValue: number;
  totalStockAlerts: number;
  totalStockStockAlerts?: number; // legacy typo
  monthlySales: { name: string; sales: number }[];
  salesByCategory: { name: string; value: number }[];
  topProducts: { id: string; name: string; totalRevenue: number }[];
  stockAlerts: { id: string; name: string; stock: number; reorderLevel: number }[];
  dailyKPI?: {
    todaySales: number;
    lastWeekAverage: number;
    percentageChange: number;
    isUp: boolean;
  };
  trends?: {
    revenuePercentage: number;
    revenueIsUp: boolean;
    transactionsPercentage: number;
    transactionsIsUp: boolean;
    monthlyRevenuePercentage: number;
    monthlyRevenueIsUp: boolean;
    profitPercentage: number;
    profitIsUp: boolean;
    receivablesPercentage: number;
    receivablesIsUp: boolean;
  };
  totalProfits?: number;
}

export interface EmployeePerformanceData {
  userId: string;
  userName: string;
  totalSalesValue: number;
  totalSalesCount: number;
  averageSaleValue: number;
  totalReturnsValue: number;
  returnRate: number;
}

export interface EmployeePerformanceAnalytics {
  performanceData: EmployeePerformanceData[];
  topPerformerByValue?: EmployeePerformanceData;
  topPerformerByCount?: EmployeePerformanceData;
}

export type LicenseType = 'Free' | 'Trial' | 'Monthly' | 'Semiannual' | 'Yearly' | 'Lifetime' | 'Basic' | 'Pro' | 'Business' | 'Basic Year' | 'Pro Year' | 'Business Year';

export interface LicenseInfo {
    licenseKey: string;
    deviceId: string | null;
    deviceIds?: string[];
    maxDevices?: number;
    status: 'active' | 'blocked' | 'pending';
    type: LicenseType;
    createdAt: string;
    activatedAt?: string;
    expiresAt?: string;
    customerId?: string;
    customerPhone?: string;
    customerName?: string;
}

export interface UserIdentity {
    id: string;
    name: string;
    email: string;
    phone: string;
    country: string;
    registeredAt: string;
    updatedAt?: string;
    ipAddress?: string;
    requestedPlan?: string;
    businessType?: string;
    confirmed?: boolean;
    needsAdminDataCompletion?: boolean;
}

export interface SyncLog {
  tableName: string;
  recordCount: number;
  lastSynced: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: number;
}

export interface InactiveCustomer {
  id: string;
  name: string;
  phone: string;
  lastPurchaseDate: string;
}

export interface StagnantProduct {
  id: string;
  name: string;
  stock: number;
  lastSoldDate?: string;
  daysSinceLastSale: number;
}

export interface GlobalSearchResults {
  products: Product[];
  sales: Sale[];
  customers: Customer[];
  purchases: Purchase[];
  suppliers: Supplier[];
  partners: Partner[];
  salesReturns: SalesReturn[];
  purchaseReturns: PurchaseReturn[];
  installments: InstallmentPlan[];
  stockTransfers: StockTransfer[];
}

export type AppTheme = 'light' | 'dark' | 'gold' | 'ramadan' | 'neumorphism' | 'forbed' | 'cyberpunk';

export interface ShippingCompany {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  trackingUrl?: string;
}

export type ShippingStatus = 'Pending' | 'In Transit' | 'Delivered' | 'Returned';

export interface ShippingOperation {
  id: string;
  date: string;
  saleId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  shippingCompanyId: string;
  shippingCompanyName: string;
  trackingNumber: string;
  cost: number;
  status: ShippingStatus;
}

export interface UpdatePackage {
  version: string;
  buildDate: string;
  changes: string[];
  hotfixes?: {
    patchVersion: string;
    securityLevel: string;
  };
  migrations?: any[];
}

export interface JournalEntry {
  id: string;
  date: string;
  reference: string;
  description: string;
  debit: { account: string; amount: number };
  credit: { account: string; amount: number };
}

export interface Shift {
  id: string;
  userId: string;
  startTime: string;
  endTime?: string;
  startCash: number;
  endCash?: number;
  status: 'Open' | 'Closed';
  totalSales?: number;
  totalCashSales?: number;
  notes?: string;
}

export interface AdminAuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
}

export interface AdminSecret {
  key: string;
  valueEncrypted: string;
  valueHmac: string;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  type: 'invoice' | 'debt' | 'generic';
  body: string;
  isDefault?: boolean;
}

export interface WhatsAppLog {
  id: string;
  date: string;
  to: string;
  customerName?: string;
  templateId?: string;
  body: string;
  status: 'success' | 'failed';
  error?: string;
  mode: 'wa.me' | 'api';
}
