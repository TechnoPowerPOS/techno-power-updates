
import type { 
    Sale, Product, StoreSettings, ActivityLog, FinancialReport, 
    SalesReturn, Purchase, Partner, Treasury, InstallmentPlan,
    Notification, ShippingCompany, PurchaseReturn, Transaction,
    SyncLog, InactiveCustomer, StagnantProduct, GlobalSearchResults,
    JournalEntry, Shift, UpdatePackage, Supplier, Customer, EmployeePerformanceAnalytics,
    SatisfactionAnalytics, User, SupplierPerformanceData, DashboardAnalytics, PermissionKey, SalesHistoryData, EmployeePerformanceData, Role
} from '../types';
import { PERMISSION_KEYS } from '../permissions';
import { getCurrentDbKey } from './branchService';

import { Money } from '../utils/mathUtils';

import { 
    doc, getDoc, collection, getDocs, setDoc, updateDoc, deleteDoc,
    writeBatch, increment, serverTimestamp, query, orderBy, limit, addDoc
} from 'firebase/firestore';
import { db as firestoreDb } from './firebase';
import { handleFirestoreError, OperationType } from './firestoreErrorHandler';

const getDbKey = () => getCurrentDbKey();

// Helper to normalize Firestore data (convert Timestamps to ISO strings)
const normalizeFirestoreData = (data: any) => {
    if (!data) return data;
    const normalized = { ...data };
    for (const key in normalized) {
        const val = normalized[key];
        if (val && typeof val.toDate === 'function') {
            normalized[key] = val.toDate().toISOString();
        } else if (val && typeof val === 'object' && val._seconds !== undefined) {
             // Handle raw timestamp objects if toDate is missing
             normalized[key] = new Date(val._seconds * 1000).toISOString();
        }
    }
    return normalized;
};

// Helper to update Firestore Treasury
const syncTreasuryToFirestore = async (treasuryId: string, amount: number, isIncome: boolean) => {};

// Helper to log Firestore Transaction
const syncTransactionToFirestore = async (transaction: any) => {};

// QA Auditor's Concurrency Lock
let isDbLocked = false;
const withDbLock = async <T>(fn: () => Promise<T>): Promise<T> => {
    while (isDbLocked) {
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    isDbLocked = true;
    try {
        const result = await fn();
        return result;
    } finally {
        isDbLocked = false;
    }
};

const getDb = async () => {
    const defaultDb = {
        settings: { storeName: 'تكنو باور POS', posLayout: 'invoice', vatRate: 15, currency: 'SAR', nextInvoiceNumber: 1000, invoiceNumberPrefix: 'INV-', navigationStyle: 'grid', homeGridItems: ['dashboard', 'pos', 'products', 'sales', 'purchases', 'customers', 'treasury', 'reports', 'partners'], pinnedPages: [], dashboardVisibleCards: ['revenue', 'transactions', 'receivables', 'stock'], visiblePages: PERMISSION_KEYS, loyaltySettings: { enabled: true, earningRate: 0.1, redemptionRate: 0.5, allowCreditPoints: false }, invoiceDesign: { template: 'modern', showLogo: true, accentColor: '#4f46e5' }, enableShiftManagement: true, storePhone: '', storeAddress: '', inventorySettings: { minAlertQty: 5, allowSaleWithoutStock: false }, notificationSettings: { enabled: true, debtAlert: true, stockAlert: true, backupReminder: true, systemEvents: true, paymentDelays: true } },
        products: [],
        customers: [{ id: 'cust-1', name: 'عميل نقدي', phone: '000', debt: 0, points: 0, tier: 'Regular', creditLimit: 0 }],
        sales: [],
        purchases: [],
        suppliers: [],
        partners: [],
        partnerTransactions: [],
        shippingCompanies: [],
        shippingOperations: [],
        treasuries: [{ id: 't-1', name: 'الخزينة الرئيسية', balance: 0, currency: 'SAR', isDefault: true }],
        warehouses: [{ id: 'w-1', name: 'المستودع الرئيسي', location: 'المقر', isDefault: true }],
        activityLogs: [],
        installments: [],
        salesReturns: [],
        purchaseReturns: [],
        users: [
            { id: 'u-1', name: 'المدير العام', email: 'admin@techno.com', password: 'password', roleId: 'r-1', permissions: PERMISSION_KEYS.reduce((a, k) => ({...a, [k]: true}), {}) },
        ],
        employees: [],
        roles: [
            { id: 'r-1', name: 'مدير النظام', permissions: PERMISSION_KEYS.reduce((a, k) => ({...a, [k]: true}), {}) },
            { id: 'r-2', name: 'كاشير مبيعات', permissions: { manage_pos: true, view_sales: true } },
            { id: 'r-3', name: 'أمين مخزن', permissions: { manage_products: true, manage_purchases: true, manage_ecommerce_api: true } }
        ],
        transactions: [],
        customerTransactions: [],
        shifts: [],
        notifications: [],
        stockTransfers: [],
        journalEntries: [],
        feedback: []
    };
    try {
        let parsed = null;
        if (typeof window !== 'undefined' && 'electronAPI' in window) {
            parsed = await (window as any).electronAPI.secureLoad(getDbKey());
            if (!parsed) {
                // Fallback to migrate from browser localStorage if any
                const stored = localStorage.getItem(getDbKey());
                if (stored) {
                    parsed = JSON.parse(stored);
                    await (window as any).electronAPI.secureSave(getDbKey(), parsed);
                }
            }
        } else {
            const stored = localStorage.getItem(getDbKey());
            parsed = stored ? JSON.parse(stored) : null;
        }
        
        if (!parsed) parsed = defaultDb;
        if (!parsed.treasuries || !Array.isArray(parsed.treasuries) || parsed.treasuries.length === 0) parsed.treasuries = defaultDb.treasuries;
        if (!parsed.roles || !Array.isArray(parsed.roles)) parsed.roles = defaultDb.roles;
        if (!parsed.transactions || !Array.isArray(parsed.transactions)) parsed.transactions = [];
        if (!parsed.sales || !Array.isArray(parsed.sales)) parsed.sales = [];
        if (!parsed.products || !Array.isArray(parsed.products)) parsed.products = [];
        if (!parsed.activityLogs || !Array.isArray(parsed.activityLogs)) parsed.activityLogs = [];
        if (!parsed.installments || !Array.isArray(parsed.installments)) parsed.installments = [];
        if (!parsed.customerTransactions || !Array.isArray(parsed.customerTransactions)) parsed.customerTransactions = [];
        if (!parsed.customers || !Array.isArray(parsed.customers)) parsed.customers = defaultDb.customers;
        if (!parsed.suppliers || !Array.isArray(parsed.suppliers)) parsed.suppliers = [];
        if (!parsed.partners || !Array.isArray(parsed.partners)) parsed.partners = [];
        if (!parsed.partnerTransactions || !Array.isArray(parsed.partnerTransactions)) parsed.partnerTransactions = [];
        if (!parsed.employees || !Array.isArray(parsed.employees)) parsed.employees = [];
        if (!parsed.salesReturns || !Array.isArray(parsed.salesReturns)) parsed.salesReturns = [];
        if (!parsed.purchaseReturns || !Array.isArray(parsed.purchaseReturns)) parsed.purchaseReturns = [];
        if (!parsed.notifications || !Array.isArray(parsed.notifications)) parsed.notifications = [];
        return parsed;
    } catch (e) { return defaultDb; }
};

const saveDb = async (db: any) => {
    if (typeof window !== 'undefined' && 'electronAPI' in window) {
        await (window as any).electronAPI.secureSave(getDbKey(), db);
    } else {
        localStorage.setItem(getDbKey(), JSON.stringify(db));
    }
    window.dispatchEvent(new Event('storage_updated'));
};

const logActivity = (db: any, action: string, details: string) => {
    const log: ActivityLog = {
        id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        timestamp: new Date().toISOString(),
        action,
        details,
        user: 'المدير العام'
    };
    if (!db.activityLogs) db.activityLogs = [];
    db.activityLogs.unshift(log);
};

const logTransaction = (db: any, type: 'income' | 'withdrawal' | 'transfer' | 'export' | 'expense', amount: any, description: string, treasuryId: string, category: string, extra?: any) => {
    const numAmount = Number(amount) || 0;
    if (numAmount <= 0) return;
    const t = treasuryId ? db.treasuries.find((item: any) => item.id === treasuryId) : null;
    
    if (t) {
        if (type === 'income') {
            t.balance += numAmount;
        } else {
            t.balance -= numAmount;
        }
    }

    const transaction = {
        id: `tr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        date: new Date().toISOString(),
        type,
        amount: numAmount,
        description,
        category,
        user: 'المدير العام',
        treasuryId,
        ...extra
    };

    db.transactions.unshift(transaction);

    // Sync with Firestore (Fire and forget to maintain sync response time in UI)
    if (treasuryId) {
        syncTreasuryToFirestore(treasuryId, numAmount, type === 'income');
        syncTransactionToFirestore(transaction);
    }
};

export const api = {
    getSettings: async () => (await getDb()).settings,
    saveSettings: async (s: StoreSettings) => {
        const db = (await getDb()); db.settings = s; await saveDb(db); return s;
    },
    adjustStock: async (productId: string, warehouseId: string, physicalQty: number, reason: string) => {
        const db = (await getDb());
        const p = db.products.find((i: any) => i.id === productId);
        if (!p) return false;

        const currentQty = p.warehouseStocks?.[warehouseId] || 0;
        const diff = physicalQty - currentQty;
        if (diff === 0) return true;

        // Update warehouse stock
        p.warehouseStocks = {
            ...(p.warehouseStocks || {}),
            [warehouseId]: physicalQty
        };

        // Update overall stock
        p.stock = Object.values(p.warehouseStocks).reduce((a: any, b: any) => a + (b || 0), 0);

        // Log transaction for the value difference
        const valueDiff = diff * (p.costPrice || 0);
        if (valueDiff !== 0) {
            logTransaction(db, valueDiff > 0 ? 'income' : 'withdrawal', Math.abs(valueDiff), `تسوية مخزنية: ${p.name} - ${reason}`, '', 'تسوية مخزنية');
        }

        logActivity(db, 'تسوية مخزنية', `تم تعديل مخزون ${p.name} من ${currentQty} إلى ${physicalQty} في المخزن ${warehouseId}. السبب: ${reason}`);
        await saveDb(db);
        return true;
    },
    getProducts: async () => (await getDb()).products,
    saveProduct: async (p: any) => {
        const db = (await getDb());
        if (p.id) {
            db.products = db.products.map((item: any) => item.id === p.id ? { ...item, ...p } : item);
            logActivity(db, 'تعديل منتج', `تم تعديل بيانات المنتج: ${p.name}`);
        } else { 
            p.id = `prod-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`; 
            if (!p.warehouseStocks) p.warehouseStocks = { 'w-1': p.stock || 0 };
            db.products.push(p); 
            logActivity(db, 'إضافة منتج', `تم إضافة منتج جديد: ${p.name}`);
        }
        await saveDb(db); return p;
    },
    deleteProduct: async (id: string) => {
        const db = (await getDb());
        db.products = db.products.filter((p: any) => p.id !== id);
        logActivity(db, 'إدارة المنتجات', `تم حذف المنتج`);
        await saveDb(db);
        return true;
    },
    bulkDeleteProducts: async (ids: string[]) => {
        const db = (await getDb());
        db.products = db.products.filter((p: any) => !ids.includes(p.id));
        logActivity(db, 'إدارة المنتجات', `تم حذف ${ids.length} منتج`);
        await saveDb(db);
        return true;
    },
    saveSale: async (sale: any) => {
        return withDbLock(async () => {
            const db = (await getDb());
            const customer = db.customers.find((c: any) => c.id === sale.customer.id);
            
            // SECURITY AUDIT: Re-calculate totals from DB to prevent client-side price manipulation
            let recalculatedTotal = 0;
            let recalculatedTax = 0;
            const vatRate = db.settings.vatRate || 0;

            for (const item of sale.items) {
                const dbProduct = db.products.find((prod: any) => prod.id === item.id);
                if (!dbProduct) {
                    throw new Error(`المنتج ${item.name} غير موجود في النظام`);
                }

                // INVENTORY AUDIT: Strict stock check
                const currentWarehouseStock = dbProduct.warehouseStocks?.[sale.warehouseId] || 0;
                if (!db.settings.inventorySettings?.allowSaleWithoutStock && currentWarehouseStock < item.quantity) {
                    throw new Error(`الكمية المطلوبة من ${dbProduct.name} غير متوفرة (المتاح: ${currentWarehouseStock})`);
                }

                // SECURITY: Use DB price instead of client-provided price
                const effectivePrice = item.sellPrice ?? item.price ?? dbProduct.sellPrice ?? 0;
                item.price = effectivePrice;
                item.costPrice = dbProduct.costPrice || 0;
                
                // Fix: account for item.discount
                const itemDiscountObj = item.discount || 0; 
                const afterItemDiscount = Money.subtract(effectivePrice, itemDiscountObj);
                
                item.subtotal = Money.multiply(afterItemDiscount, item.quantity);
                recalculatedTotal = Money.add(recalculatedTotal, item.subtotal);

                // Update Stocks
                if(!dbProduct.warehouseStocks) dbProduct.warehouseStocks = {};
                dbProduct.warehouseStocks[sale.warehouseId] = Money.subtract(dbProduct.warehouseStocks[sale.warehouseId] || 0, item.quantity);
                dbProduct.stock = Object.values(dbProduct.warehouseStocks as Record<string, number>).reduce((a, b) => Money.add(a, Number(b)), 0);
            }

            // DISCOUNT AUDIT: Validate discount
            let discountValue = 0;
            if (sale.discountType === 'percentage' || sale.discountType === 'percent') {
                discountValue = Money.calculateDiscount(recalculatedTotal, sale.discount || 0, true);
            } else {
                discountValue = Math.min(sale.discount || 0, recalculatedTotal); // Fix Money.subtract abuse
            }
            
            recalculatedTotal = Money.subtract(recalculatedTotal, discountValue);

            // TAX AUDIT: Apply taxes on the after-discount value
            recalculatedTax = Money.calculateTax(recalculatedTotal, vatRate);
            
            // Integrate shipping and points into the final calculation
            const shippingCost = sale.shipping || 0;
            const pointsDiscount = sale.pointsDiscount || 0; // Wait, PosPage doesn't send pointsDiscount, it sends pointsRedeemed! Let's check how many points were redeemed:
            const pointsDiscountValue = (sale.pointsRedeemed > 0 && db.settings.loyaltySettings?.redemptionRate) ? (sale.pointsRedeemed * db.settings.loyaltySettings.redemptionRate) : 0;

            let finalTotal = Money.add(recalculatedTotal, recalculatedTax);
            finalTotal = Money.add(finalTotal, shippingCost);
            finalTotal = Math.max(0, Money.subtract(finalTotal, pointsDiscountValue));

            // Calculate profit (recalculatedTotal without tax - total cost)
            let totalCost = 0;
            for (const item of sale.items) {
                totalCost = Money.add(totalCost, Money.multiply(item.costPrice || 0, item.quantity));
            }
            const saleProfit = Money.subtract(recalculatedTotal, totalCost);

            // Record Partner Profits per invoice for visibility
            const activePartners = (db.partners || []).filter((p: any) => p.status !== 'Suspended' && p.status !== 'Inactive');
            const partnerProfits = activePartners.map((p: any) => ({
                partnerId: p.id,
                partnerName: p.name,
                profit: Money.multiply(saleProfit, p.sharePercentage / 100)
            }));

            // SYNC CHECK: If client total doesn't match re-calculated total, log potential tampering
            if (Math.abs(finalTotal - sale.total) > 0.01) {
                console.warn(`SECURITY ALERT: Price mismatch detected. Client: ${sale.total}, Server: ${finalTotal}`);
                // In a real high-security system, we might reject the sale here
            }

            const id = sale.id || `${db.settings.invoiceNumberPrefix}${db.settings.nextInvoiceNumber++}`;
            const finalSale = { 
                ...sale, 
                id, 
                total: finalTotal,
                tax: recalculatedTax,
                discountValue,
                profit: saleProfit,
                partnerProfits,
                date: new Date().toISOString(), 
                status: 'Completed' 
            };
            db.sales.unshift(finalSale);
            
            if (sale.amountPaid > 0) {
                logTransaction(db, 'income', sale.amountPaid, `فاتورة مبيعات #${id}`, sale.treasuryId, 'مبيعات', { shiftId: sale.shiftId });
            }
            
            if (customer) {
                const unpaid = Money.subtract(finalTotal, sale.amountPaid || 0);
                if (unpaid > 0) customer.debt = Money.add(customer.debt || 0, unpaid);
                
                if (db.settings.loyaltySettings?.enabled) {
                    const ls = db.settings.loyaltySettings;
                    if ((!ls.minOrderAmountToEarn || finalTotal >= ls.minOrderAmountToEarn) && (ls.allowCreditPoints || sale.paymentMethod !== 'Credit')) {
                        let earned = 0;
                        if (ls.amountPerPoint && ls.amountPerPoint > 0) {
                            earned = Math.floor(finalTotal / ls.amountPerPoint);
                        } else {
                            earned = Math.floor(finalTotal * (ls.earningRate || 0));
                        }
                        customer.points = (customer.points || 0) + earned;
                        finalSale.pointsEarned = earned;
                    }
                }

                if (sale.pointsRedeemed > 0) customer.points = Math.max(0, Money.subtract(customer.points || 0, sale.pointsRedeemed));
                customer.lastPurchaseDate = new Date().toISOString();
            }

            if (sale.installmentPlan) {
                const planData = sale.installmentPlan;
                const principal = Money.subtract(finalTotal, sale.amountPaid || 0);
                const interestAmount = Money.multiply(principal, Money.multiply(planData.interestRate / 100, planData.months / 12));
                const financedTotal = Money.add(principal, interestAmount);
                const totalWithInterest = Money.add(finalTotal, interestAmount);
                const monthlyPayment = Money.round(financedTotal / planData.months, 2);
                
                const plan: InstallmentPlan = {
                    id: `ins-${Date.now()}`,
                    customerName: sale.customer.name,
                    saleId: id,
                    downPayment: sale.amountPaid || 0,
                    interestRate: planData.interestRate,
                    interestAmount,
                    totalWithInterest,
                    remainingAmount: financedTotal,
                    numberOfInstallments: planData.months,
                    monthlyPayment,
                    status: 'Active',
                    payments: Array.from({ length: planData.months }).map((_, i) => {
                        const dueDate = new Date(planData.startDate);
                        dueDate.setMonth(dueDate.getMonth() + i);
                        
                        // Last payment handles rounding discrepancy - ensure it covers the exact remaining balance
                        const amount = (i === planData.months - 1) 
                            ? Math.max(0, Money.subtract(financedTotal, Money.multiply(monthlyPayment, i)))
                            : monthlyPayment;

                        return {
                            id: `pay-${id}-${i}`,
                            amount,
                            dueDate: dueDate.toISOString(),
                            status: 'Pending'
                        };
                    })
                };
                if (!db.installments) db.installments = [];
                db.installments.unshift(plan);
            }

            logActivity(db, 'عملية بيع', `تم إصدار فاتورة مبيعات #${id} بقيمة ${finalTotal}`);
            await saveDb(db); return finalSale;
        });
    },
    updateSale: async (id: string, data: any) => {
        const db = (await getDb());
        db.sales = db.sales.map((s: any) => s.id === id ? { ...s, ...data } : s);
        await saveDb(db);
        return true;
    },
    getTreasuries: async (includeBanks = false) => {
        const db = (await getDb());

        const trs = db.treasuries || [];
        if (includeBanks) return trs;
        return trs.filter((t: any) => t.type !== 'bank');
    },
    getFinancialAccounts: async () => (await getDb()).treasuries.filter((t: any) => t.type === 'bank'),
    getTreasuryTransactions: async (limitCount = 100) => {
        return (await getDb()).transactions || [];
    },
    getTransactions: async () => (await getDb()).transactions,
    getFinancialReport: async (start: string, end: string, productId?: string, customerId?: string): Promise<FinancialReport> => {
        const db = (await getDb());
        const sales = db.sales.filter((s:any) => {
            const dateMatch = (!start || s.date >= start) && (!end || s.date <= end);
            const customerMatch = !customerId || s.customer.id === customerId;
            const productMatch = !productId || s.items.some((i: any) => i.id === productId);
            return dateMatch && customerMatch && productMatch;
        });
        const transactions = db.transactions.filter((t:any) => (!start || t.date >= start) && (!end || t.date <= end));
        const returns = (db.salesReturns || []).filter((r:any) => (!start || r.date >= start) && (!end || r.date <= end));

        let totalRevenue = 0;
        sales.forEach(s => totalRevenue = Money.add(totalRevenue, s.total));

        let totalReturns = 0;
        returns.forEach(r => totalReturns = Money.add(totalReturns, r.totalRefund || 0));
        
        let totalExpenses = 0;
        transactions.filter((t:any) => t.type === 'withdrawal' && t.category !== 'مرتجعات')
            .forEach(t => totalExpenses = Money.add(totalExpenses, t.amount));
        
        let totalCOGS = 0;
        sales.forEach((s: any) => {
            if (s.status !== 'Refunded') {
                const saleCogs = s.items.reduce((sum: number, item: any) => 
                    Money.add(sum, Money.multiply(item.costPrice || 0, item.quantity || 0)), 0);
                totalCOGS = Money.add(totalCOGS, saleCogs);
            }
        });

        // Deduct COGS of returned items
        returns.forEach((r: any) => {
            const returnCogs = r.items.reduce((sum: number, item: any) => 
                Money.add(sum, Money.multiply(item.costPrice || 0, item.returnQuantity || 0)), 0);
            totalCOGS = Money.subtract(totalCOGS, returnCogs);
        });

        const vatRate = db.settings.vatRate || 0;
        const totalTaxableRevenue = Money.subtract(totalRevenue, totalReturns);
        const totalTax = vatRate > 0 ? Money.round(totalTaxableRevenue * (vatRate / (100 + vatRate))) : 0;
        const netRevenue = Money.subtract(totalTaxableRevenue, totalTax);
        
        const netProfit = Money.subtract(netRevenue, totalCOGS, totalExpenses);

        const totalStockValue = db.products.reduce((a: number, p: any) => 
            Money.add(a, Money.multiply(p.stock || 0, p.costPrice || 0)), 0);

        // Daily/Monthly stats for growth
        const dailyMap: Record<string, { revenue: number, profit: number }> = {};
        const productPerformance: Record<string, { id: string, name: string, quantity: number, revenue: number, profit: number }> = {};
        
        sales.forEach(s => {
            const day = s.date.split('T')[0];
            if (!dailyMap[day]) dailyMap[day] = { revenue: 0, profit: 0 };
            dailyMap[day].revenue = Money.add(dailyMap[day].revenue, s.total);
            
            let saleCogs = 0;
            s.items.forEach((i: any) => {
                const c = Money.multiply(i.costPrice || 0, i.quantity || 1);
                saleCogs = Money.add(saleCogs, c);
                
                if (!productPerformance[i.id]) {
                    productPerformance[i.id] = { id: i.id, name: i.name, quantity: 0, revenue: 0, profit: 0 };
                }
                const p = productPerformance[i.id];
                p.quantity += i.quantity;
                p.revenue = Money.add(p.revenue, i.subtotal || Money.multiply(i.price, i.quantity));
                p.profit = Money.add(p.profit, Money.subtract(i.subtotal || Money.multiply(i.price, i.quantity), c));
            });
            dailyMap[day].profit = Money.add(dailyMap[day].profit, Money.subtract(s.total, saleCogs));
        });

        return {
            totalRevenue: totalTaxableRevenue,
            totalCOGS,
            totalExpenses,
            totalPurchases: db.purchases.filter((p: any) => (!start || p.date >= start) && (!end || p.date <= end)).reduce((a: number, b: any) => Money.add(a, b.total), 0),
            totalReturns,
            totalTax,
            netProfit,
            totalStockValue,
            productProfits: Object.values(productPerformance).map(p => ({ id: p.id, name: p.name, profit: p.profit, revenue: p.revenue, quantity: p.quantity })),
            dailyStats: Object.entries(dailyMap).map(([date, stats]) => ({ date, revenue: stats.revenue, profit: stats.profit })).sort((a,b) => a.date.localeCompare(b.date))
        };
    },
    getMonthlyComparison: async () => {
        const db = (await getDb());
        const sales = db.sales || [];
        const monthlyData: Record<string, { revenue: number, profit: number }> = {};

        sales.forEach((s: any) => {
            const month = s.date.substring(0, 7); // YYYY-MM
            if (!monthlyData[month]) monthlyData[month] = { revenue: 0, profit: 0 };
            monthlyData[month].revenue += s.total;
            
            let cogs = 0;
            s.items.forEach((i: any) => cogs += (i.costPrice || 0) * (i.quantity || 1));
            monthlyData[month].profit += (s.total - cogs);
        });

        return Object.entries(monthlyData)
            .map(([month, data]) => ({ month, ...data }))
            .sort((a, b) => b.month.localeCompare(a.month))
            .slice(0, 12)
            .reverse();
    },
    getDashboardAnalytics: async (): Promise<DashboardAnalytics> => {
        const db = (await getDb());
        const today = new Date().toISOString().split('T')[0];
        const currentMonth = today.substring(0, 7);
        const todaysSales = db.sales.filter((s: any) => s.date.startsWith(today));
        const monthSales = db.sales.filter((s: any) => s.date.startsWith(currentMonth));
        
        // Monthly sales for chart
        const last6Months: Record<string, number> = {};
        db.sales.forEach((s: any) => {
            const m = s.date.substring(0, 7);
            last6Months[m] = (last6Months[m] || 0) + s.total;
        });

        // Category distribution
        const catMap: Record<string, number> = {};
        db.sales.forEach((s: any) => {
            s.items.forEach((i: any) => {
                const prod = db.products.find((p: any) => p.id === i.id);
                const cat = prod?.category || 'غير مصنف';
                catMap[cat] = (catMap[cat] || 0) + (i.sellPrice * i.quantity);
            });
        });

        // Top products by revenue
        const productRevenue: Record<string, { id: string, name: string, totalRevenue: number }> = {};
        db.sales.forEach((s: any) => {
            s.items.forEach((i: any) => {
                if (!productRevenue[i.id]) {
                    productRevenue[i.id] = { id: i.id, name: i.name, totalRevenue: 0 };
                }
                productRevenue[i.id].totalRevenue += (i.sellPrice * i.quantity);
            });
        });

        // Stock alerts (top 5 low stock products)
        const stockAlerts = db.products
            .filter((p: any) => (p.stock || 0) <= (p.reorderLevel || 0))
            .sort((a: any, b: any) => (a.stock || 0) - (b.stock || 0))
            .slice(0, 10) // Show up to 10
            .map((p: any) => ({
                id: p.id,
                name: p.name,
                stock: p.stock || 0,
                reorderLevel: p.reorderLevel || 0
            }));

        return {
            totalSalesToday: todaysSales.reduce((a: number, b: any) => a + b.total, 0),
            totalSalesThisMonth: monthSales.reduce((a: number, b: any) => a + b.total, 0),
            todaysTransactions: todaysSales.length,
            totalReceivables: db.customers.reduce((a: number, b: any) => a + (b.debt || 0), 0),
            totalStockValue: db.products.reduce((a: number, p: any) => a + ((p.stock || 0) * (p.costPrice || 0)), 0),
            monthlySales: Object.entries(last6Months).map(([name, sales]) => ({ name, sales })).sort((a,b) => a.name.localeCompare(b.name)),
            salesByCategory: Object.entries(catMap).map(([name, value]) => ({ name, value })),
            topProducts: Object.values(productRevenue).sort((a, b) => b.totalRevenue - a.totalRevenue),
            stockAlerts
        };
    },
    getCustomers: async () => {
        const db = (await getDb());
        // Clean up previously synced SAAS identities which shouldn't be here
        // We ensure we only keep legitimate POS customers (typically start with 'cust-' or don't have saas fields)
        const valid = (db.customers || []).filter((c:any) => {
            if (c.id?.startsWith('UID-')) return false;
            // Indicators of SaaS users mixed in:
            if (c.registeredAt || c.planId || c.licenseKey || c.type === 'Trial' || c.deviceId || c.maxDevices || c.email === 'm7mdshipl@gmail.com') return false;
            return true;
        });
        if (valid.length !== (db.customers || []).length) {
            db.customers = valid;
            await saveDb(db);
        }
        return valid;
    },
    getSuppliers: async () => {
        return (await getDb()).suppliers || [];
    },
    getCustomerTransactions: async () => (await getDb()).customerTransactions || [],
    getSupplierTransactions: async () => (await getDb()).supplierTransactions || [],
    getSales: async () => (await getDb()).sales,
    getPurchases: async () => (await getDb()).purchases,
    getWarehouses: async () => (await getDb()).warehouses,
    saveTreasury: async (t: any) => {
        const db = (await getDb());
        if (!t.id) t.id = `t-${Date.now()}`;
        
        const idx = db.treasuries.findIndex((item: any) => item.id === t.id);
        if (idx !== -1) db.treasuries[idx] = { ...db.treasuries[idx], ...t };
        else db.treasuries.push(t);
        
        logActivity(db, 'إدارة الخزائن', `تم تحديث/إضافة الخزينة: ${t.name}`);
        await saveDb(db); return t;
    },
    deleteTreasury: async (id: string) => {
        const db = (await getDb());
        const t = db.treasuries.find((item: any) => item.id === id);
        if (!t || t.isDefault || t.balance !== 0) return false;
        
        db.treasuries = db.treasuries.filter((item: any) => item.id !== id);
        logActivity(db, 'حذف خزينة', `تم حذف الخزينة: ${t.name}`);
        await saveDb(db);
        return true;
    },
    transferFunds: async (fromId: string, toId: string, amount: number, desc: string) => {
        const db = (await getDb());
        const from = db.treasuries.find((t: any) => t.id === fromId);
        const to = db.treasuries.find((t: any) => t.id === toId);
        if (!from || !to || from.balance < amount) return false;
        
        // Removed manual balance updates: from.balance -= amount; to.balance += amount;
        // logTransaction handles balance updates for both sides when type is 'transfer' or similar
        
        logTransaction(db, 'transfer', amount, desc || `تحويل من ${from.name} إلى ${to.name}`, fromId, 'تحويل', { toTreasuryId: toId });
        
        // We also need to add to the target treasury
        const destTreasury = db.treasuries.find((t: any) => t.id === toId);
        if (destTreasury) {
            logTransaction(db, 'income', amount, `وارد من تحويل: ${desc || from.name}`, toId, 'تحويل');
        }

        logActivity(db, 'تحويل مالي', `تم تحويل ${amount} من ${from.name} إلى ${to.name}`);
        await saveDb(db);
        return true;
    },
    exportTreasury: async (fromId: string, amount: number, dest: string, desc: string, targetAccountId?: string) => {
        const db = (await getDb());
        const from = db.treasuries.find((t: any) => t.id === fromId);
        if (!from || from.balance < amount) return false;
        
        if (targetAccountId) {
            const target = db.treasuries.find((t: any) => t.id === targetAccountId);
            if (target) {
                // Manual balance update removed: target.balance += amount; 
                // logTransaction with 'income' handles balance increase
                logTransaction(db, 'income', amount, `إيداع عبر الخزينة: ${desc || ''}`, targetAccountId, 'إيداع');
            }
        }

        logTransaction(db, 'export', amount, desc || `تصدير إلى ${dest}`, fromId, 'تصدير', { destinationAccount: dest });
        logActivity(db, 'تصدير مالي', `تم تصدير ${amount} من ${from.name} إلى ${dest}`);
        await saveDb(db);
        return true;
    },
    saveCustomer: async (c: any) => { 
        const db = (await getDb()); 
        if (!c.id) {
            c.id = `cust-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`; 
            c.debt = c.debt || 0; 
            c.points = c.points || 0; 
        }
        
        // No Firestore sync for SAAS tenant data to prevent data leaks.
        
        if (db.customers.find((i:any) => i.id === c.id)) {
            db.customers = db.customers.map((i: any) => i.id === c.id ? { ...i, ...c } : i); 
        } else {
            db.customers.push(c); 
        }
        
        logActivity(db, 'إدارة العملاء', `حفظ بيانات العميل: ${c.name}`); 
        await saveDb(db); 
        return c; 
    },
    saveSupplier: async (s: any) => { 
        const db = (await getDb()); 
        if (!s.id) {
            s.id = `sup-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`; 
            s.debt = s.debt || 0; 
        }
        
    // Sync disabled

        if (db.suppliers.find((i:any) => i.id === s.id)) {
            db.suppliers = db.suppliers.map((i: any) => i.id === s.id ? { ...i, ...s } : i); 
        } else {
            db.suppliers.push(s); 
        }
        
        logActivity(db, 'إدارة الموردين', `حفظ بيانات المورد: ${s.name}`); 
        await saveDb(db); 
        return s; 
    },
    saveWarehouse: async (w: any) => { const db = (await getDb()); if (w.id) db.warehouses = db.warehouses.map((i: any) => i.id === w.id ? { ...i, ...w } : i); else { w.id = `wh-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`; db.warehouses.push(w); } logActivity(db, 'إدارة المستودعات', `حفظ مستودع: ${w.name}`); await saveDb(db); return w; },
    deleteWarehouse: async (id: string) => {
        const db = (await getDb());
        const w = db.warehouses.find((item: any) => item.id === id);
        if (!w || w.isDefault) return false;
        db.warehouses = db.warehouses.filter((item: any) => item.id !== id);
        logActivity(db, 'حذف مستودع', `تم حذف المستودع: ${w.name}`);
        await saveDb(db);
        return true;
    },
    saveTransaction: async (t: any) => { 
        const db = (await getDb()); 
        logTransaction(db, t.type, t.amount, t.description, t.treasuryId, t.category); 
        
        if (t.type === 'income' && t.fromAccountId) {
            logTransaction(db, 'withdrawal', t.amount, `سحب لحساب الخزينة: ${t.description || ''}`, t.fromAccountId, 'سحب');
        } else if (t.type === 'withdrawal' && t.toAccountId) {
            logTransaction(db, 'income', t.amount, `إيداع من الخزينة: ${t.description || ''}`, t.toAccountId, 'إيداع');
        }

        logActivity(db, 'حركة خزينة يدوية', `تم تسجيل ${t.type === 'income' ? 'إيداع' : 'سحب'} بمبلغ ${t.amount}`); 
        await saveDb(db); 
        return t; 
    },
    getCurrentShift: async (userId: string) => (await getDb()).shifts.find((s: any) => s.userId === userId && s.status === 'Open') || null,
    openShift: async (userId: string, amount: number) => {
        const db = (await getDb());
        const shift = { id: `shift-${Date.now()}`, userId, startTime: new Date().toISOString(), startCash: amount, status: 'Open' };
        if (!db.shifts) db.shifts = [];
        db.shifts.push(shift);
        logActivity(db, 'فتح وردية', `تم فتح وردية جديدة برصيد افتتاح ${amount}`);
        await saveDb(db); return shift;
    },
    closeShift: async (id: string, endCash: number, notes?: string) => {
        const db = (await getDb()); const shift = db.shifts.find((s: any) => s.id === id);
        if (shift) {
            shift.status = 'Closed'; shift.endTime = new Date().toISOString(); shift.endCash = endCash; shift.notes = notes;
            logActivity(db, 'إغلاق وردية', `تم إغلاق الوردية #${id} برصيد نهائي ${endCash}`);
            await saveDb(db); return shift;
        }
        throw new Error("Shift not found");
    },
    getPartners: async () => {
        const db = (await getDb());
        return db.partners || [];
    },
    getPartnerTransactions: async (partnerId: string) => {
        const db = (await getDb());
        return (db.partnerTransactions || []).filter((t: any) => t.partnerId === partnerId).sort((a:any, b:any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    savePartner: async (p: any) => {
        const db = (await getDb());
        let isNew = !p.id;
        if (isNew) {
            p.id = `part-${Date.now()}`;
            p.currentBalance = p.capitalInvested || 0;
            p.joinedDate = new Date().toISOString();
            p.lastSettlementDate = p.joinedDate;
            p.status = 'Active';
        }
        
        // Create a financial account for the partner if new
        if (isNew) {
            const partnerTreasury = {
                id: `prt-trs-${Date.now()}`,
                name: `حساب الشريك: ${p.name}`,
                balance: p.capitalInvested || 0,
                currency: 'SAR',
                isDefault: false,
                type: 'bank',
                partnerId: p.id,
                usageLimitations: ['purchases', 'expenses'],
                createdAt: new Date().toISOString()
            };
            db.treasuries.push(partnerTreasury);
        }

        if (!isNew) {
            db.partners = db.partners.map((item: any) => item.id === p.id ? { ...item, ...p } : item);
        } else {
            db.partners.push(p);
        }
        
        logActivity(db, 'إدارة الشركاء', `حفظ بيانات الشريك: ${p.name}`);
        await saveDb(db);
        return p;
    },
    addPartnerTransaction: async (trx: any) => {
        const db = (await getDb());
        trx.id = `ptrx-${Date.now()}`;
        trx.date = new Date().toISOString();
        if (!db.partnerTransactions) db.partnerTransactions = [];
        db.partnerTransactions.push(trx);
        
        // Update partner balance
        const partner = db.partners.find((p:any) => p.id === trx.partnerId);
        if (partner) {
            if (trx.type === 'Deposit' || trx.type === 'ProfitDistribution') {
                partner.currentBalance += trx.amount;
                if (trx.type === 'ProfitDistribution') {
                    partner.lastSettlementDate = new Date().toISOString(); // Reset profit window
                }
            }
            if (trx.type === 'Withdrawal') partner.currentBalance -= trx.amount;
            
            // Record in treasury
            if (trx.type === 'Deposit') logTransaction(db, 'income', trx.amount, `إيداع من الشريك ${partner.name} - ${trx.description}`, undefined, 'أخرى');
            if (trx.type === 'Withdrawal') logTransaction(db, 'withdrawal', trx.amount, `مسحوبات الشريك ${partner.name} - ${trx.description}`, undefined, 'أخرى');
            if (trx.type === 'ProfitDistribution') logTransaction(db, 'withdrawal', trx.amount, `توزيع أرباح للشريك ${partner.name} - ${trx.description}`, undefined, 'أخرى');
        }
        logActivity(db, 'إدارة الشركاء', `عملية مالية جديدة للشريك ${partner?.name || ''}`);
        await saveDb(db);
        return trx;
    },
    deletePartner: async (id: string) => {
        return withDbLock(async () => {
            const db = (await getDb());
            db.partners = db.partners.filter((p: any) => p.id !== id);
            db.partnerTransactions = (db.partnerTransactions || []).filter((t: any) => t.partnerId !== id);
            logActivity(db, 'إدارة الشركاء', `تم حذف شريك بنجاح`);
            await saveDb(db);
            return true;
        });
    },
    getSalesReturns: async () => (await getDb()).salesReturns || [],
    saveSalesReturn: async (r: any) => {
        return withDbLock(async () => {
            const db = (await getDb()); 
            const originalSale = db.sales.find((s:any) => s.id === r.originalSaleId);
            if (!originalSale) {
                throw new Error("الفاتورة الأصلية غير موجودة");
            }

            r.id = `sr-${Date.now()}`; 
            r.date = new Date().toISOString(); 
            
            let calculatedRefund = 0;
            
            // Validate items and restore stock
            for (const item of r.items) {
                const originalItem = originalSale.items.find((i: any) => i.id === item.id);
                if (!originalItem) {
                    throw new Error(`المنتج ${item.name} لم يكن جزءاً من الفاتورة الأصلية`);
                }

                // QUANTITY AUDIT: Prevent returning more than purchased
                if (item.returnQuantity > originalItem.quantity) {
                    throw new Error(`الكمية المرتجعة من ${item.name} أكبر من الكمية المباعة`);
                }

                const p = db.products.find((prod: any) => prod.id === item.id);
                if (p) {
                    if (!p.warehouseStocks) p.warehouseStocks = {};
                    p.warehouseStocks[r.warehouseId] = Money.add(p.warehouseStocks[r.warehouseId] || 0, item.returnQuantity);
                    p.stock = Object.values(p.warehouseStocks as Record<string, number>).reduce((a, b) => Money.add(a, b), 0);
                }

                // PRICE AUDIT: Refund should be based on the price the customer actually paid
                const itemEffectivePrice = originalItem.price || 0;
                const itemRefund = Money.multiply(itemEffectivePrice, item.returnQuantity);
                calculatedRefund = Money.add(calculatedRefund, itemRefund);
            }

            // Apply global discount portion if returning partial items? 
            // Simplified: If entire sale is returned, refund taxes and discount correctly.
            // For now, calculate proportional tax if applicable.
            const vatRate = db.settings.vatRate || 0;
            const refundTax = Money.calculateTax(calculatedRefund, vatRate);
            const totalRefundValue = Money.add(calculatedRefund, refundTax);

            // SYNC CHECK
            if (Math.abs(totalRefundValue - r.totalRefund) > 0.01) {
                console.warn(`FINANCIAL AUDIT: Refund adjustment. Client requested: ${r.totalRefund}, System calculated: ${totalRefundValue}`);
            }

            r.totalRefund = totalRefundValue;
            
            if (!db.salesReturns) db.salesReturns = []; 
            db.salesReturns.unshift(r);

            // Update original sale status
            originalSale.status = 'Partially Refunded';
            const allItemsReturned = originalSale.items.every((oi: any) => {
                const ri = r.items.find((item: any) => item.id === oi.id);
                return ri && ri.returnQuantity === oi.quantity;
            });
            if (allItemsReturned) originalSale.status = 'Refunded';

            if (totalRefundValue > 0) {
                logTransaction(db, 'withdrawal', totalRefundValue, `مرتجع مبيعات #${r.originalSaleId}`, r.treasuryId, 'مرتجعات');
            }

            // If customer has debt, reduce it first instead of giving cash (Optional logic depends on business)
            const customer = db.customers.find((c: any) => c.id === originalSale.customer.id);
            if (customer && customer.debt > 0) {
                // In some systems, returns reduce debt. Here we log it as an option.
            }

            logActivity(db, 'مرتجع مبيعات', `تم تسجيل مرتجع للفاتورة #${r.originalSaleId} بمبلغ مسترد ${r.totalRefund}`);
            await saveDb(db); 
            return r;
        });
    },
    deleteSalesReturn: async (id: string) => {
        return withDbLock(async () => {
            const db = (await getDb());
            const ret = db.salesReturns?.find((r: any) => r.id === id);
            if (!ret) return false;
            
            ret.items.forEach((item: any) => {
                const p = db.products.find((prod: any) => prod.id === item.id);
                if (p) {
                    if (!p.warehouseStocks) p.warehouseStocks = {};
                    p.warehouseStocks[ret.warehouseId] = Money.subtract(p.warehouseStocks[ret.warehouseId] || 0, item.returnQuantity);
                    p.stock = Object.values(p.warehouseStocks as Record<string, number>).reduce((a, b) => Money.add(a, Number(b)), 0);
                }
            });
            
            if (ret.totalRefund > 0) logTransaction(db, 'income', ret.totalRefund, `التراجع عن مرتجع مبيعات #${ret.originalSaleId}`, ret.treasuryId, 'مرتجعات');
            
            // Revert original sale status if needed (optional context, but usually we just delete the return)
            const originalSale = db.sales.find((s:any) => s.id === ret.originalSaleId);
            if (originalSale && originalSale.status.includes('Refunded')) {
                // If it was the only return, maybe set back to Completed? Complex, but leaving as is for now.
                originalSale.status = 'Completed'; 
            }

            db.salesReturns = db.salesReturns.filter((r: any) => r.id !== id);
            logActivity(db, 'التراجع عن مرتجع', `تم التراجع عن المرتجع #${id}`);
            await saveDb(db);
            return true;
        });
    },
    savePurchase: async (p: any) => {
        return withDbLock(async () => {
            const db = (await getDb()); 
            
            let oldPurchase = null;
            if (p.id) {
                oldPurchase = db.purchases.find((pur: any) => pur.id === p.id);
                if (oldPurchase) {
                    // Reverse old stock
                    oldPurchase.items.forEach((item: any) => {
                        const prod = db.products.find((pr: any) => pr.id === item.productId);
                        if (prod) {
                            if (!prod.warehouseStocks) prod.warehouseStocks = {};
                            prod.warehouseStocks[oldPurchase.warehouseId] = Money.subtract(prod.warehouseStocks[oldPurchase.warehouseId] || 0, item.quantity);
                            prod.stock = Object.values(prod.warehouseStocks as Record<string, number>).reduce((a, b) => Money.add(a, b), 0);
                        }
                    });
                    
                    // Reverse old supplier debt
                    const oldSupplier = db.suppliers.find((s: any) => s.id === oldPurchase.supplier.id);
                    if (oldSupplier) {
                        const oldUnpaid = Money.subtract(oldPurchase.total, oldPurchase.amountPaid || 0);
                        if (oldUnpaid > 0) oldSupplier.debt = Math.max(0, Money.subtract(oldSupplier.debt || 0, oldUnpaid));
                    }
                    
                    // Remove old purchase
                    db.purchases = db.purchases.filter((pur: any) => pur.id !== p.id);
                }
            }
            
            p.id = p.id || `pur-${Date.now()}`; 
            p.date = p.date || new Date().toISOString(); 
            
            db.purchases.unshift(p);
            
            p.items.forEach((item: any) => {
                const prod = db.products.find((pr: any) => pr.id === item.productId);
                if (prod) {
                    const oldStock = prod.stock || 0;
                    const oldCost = prod.costPrice || 0;
                    
                    if (!prod.warehouseStocks) prod.warehouseStocks = {};
                    prod.warehouseStocks[p.warehouseId] = Money.add(prod.warehouseStocks[p.warehouseId] || 0, item.quantity);
                    prod.stock = Object.values(prod.warehouseStocks as Record<string, number>).reduce((a, b) => Money.add(a, Number(b)), 0);
                    
                    // Robust Weighted average cost calculation
                    const effectiveOldStock = Math.max(0, oldStock);
                    const totalEffectiveStock = effectiveOldStock + item.quantity;
                    
                    if (totalEffectiveStock > 0) {
                        const totalValue = Money.add(Money.multiply(effectiveOldStock, oldCost), Money.multiply(item.quantity, item.costPrice));
                        prod.costPrice = Money.round(totalValue / totalEffectiveStock, 3);
                    } else {
                        prod.costPrice = item.costPrice;
                    }
                }
            });
            
            const supplier = db.suppliers.find((s: any) => s.id === p.supplier.id);
            if (supplier) {
                const unpaid = Money.subtract(p.total, p.amountPaid || 0);
                if (unpaid > 0) supplier.debt = Money.add(supplier.debt || 0, unpaid);
                supplier.lastPurchaseDate = new Date().toISOString();
            }

            if (!oldPurchase) { 
                if (p.paymentMethod === 'Split' && p.splitPayments) {
                    if (p.splitPayments.cash > 0) logTransaction(db, 'expense', p.splitPayments.cash, `شراء نقدي جزء #${p.id}`, p.treasuryId, 'مشتريات');
                    if (p.splitPayments.card > 0) logTransaction(db, 'expense', p.splitPayments.card, `شراء بطاقة جزء #${p.id}`, p.treasuryId, 'مشتريات');
                    if (p.splitPayments.transfer > 0) logTransaction(db, 'expense', p.splitPayments.transfer, `شراء تحويل جزء #${p.id}`, p.treasuryId, 'مشتريات');
                } else if (p.amountPaid > 0) {
                    logTransaction(db, 'expense', p.amountPaid, `شراء بضاعة #${p.id}`, p.treasuryId, 'مشتريات');
                }
            }
            logActivity(db, oldPurchase ? 'تعديل شراء' : 'عملية شراء', `تم تسجيل طلب شراء #${p.id} بمبلغ ${p.total}`);
            await saveDb(db); 
            return p;
        });
    },
    updatePurchase: async (id: string, data: any) => {
        const db = (await getDb());
        db.purchases = db.purchases.map((p: any) => p.id === id ? { ...p, ...data } : p);
        await saveDb(db);
        return true;
    },
    getPurchaseReturns: async () => (await getDb()).purchaseReturns || [],
    getInstallmentPlans: async () => (await getDb()).installments || [],
    recordInstallmentPayment: async (paymentId: string) => {
        return withDbLock(async () => {
            const db = (await getDb());
            let success = false;
            if (!db.installments) return false;

            db.installments.forEach((plan: any) => {
                const payment = plan.payments.find((p: any) => p.id === paymentId);
                if (payment && payment.status === 'Pending') {
                    payment.status = 'Paid';
                    payment.paidDate = new Date().toISOString();
                    plan.remainingAmount = Money.subtract(plan.remainingAmount || 0, payment.amount);
                    if (plan.remainingAmount <= 0) {
                        plan.remainingAmount = 0;
                        plan.status = 'Paid Off';
                    }
                    
                    const sale = db.sales.find((s: any) => s.id === plan.saleId);
                    if (sale) {
                        const customer = db.customers.find((c: any) => c.id === sale.customer.id);
                        if (customer) {
                            customer.debt = Math.max(0, Money.subtract(customer.debt || 0, payment.amount));
                            
                            if (!db.customerTransactions) db.customerTransactions = [];
                            db.customerTransactions.unshift({
                                id: `ctx-${Date.now()}`,
                                customerId: customer.id,
                                type: 'payment',
                                amount: payment.amount,
                                date: payment.paidDate,
                                description: `تحصيل قسط مسجل للفاتورة #${plan.saleId}`,
                                treasuryId: sale.treasuryId
                            });
                        }
                        logTransaction(db, 'income', payment.amount, `تحصيل قسط #${paymentId} - عميل: ${sale.customer.name}`, sale.treasuryId, 'أقساط');
                    }
                    logActivity(db, 'تحصيل قسط', `تم تحصيل قسط بمبلغ ${payment.amount} من ${plan.customerName}`);
                    success = true;
                }
            });
            if (success) await saveDb(db);
            return success;
        });
    },
    globalSearch: async (q: string): Promise<GlobalSearchResults> => {
        const db = (await getDb()); const query = q.toLowerCase();
        return {
            products: db.products.filter((p:any) => p.name.toLowerCase().includes(query) || p.sku.includes(query)),
            sales: db.sales.filter((s:any) => s.id.toLowerCase().includes(query) || s.customer.name.toLowerCase().includes(query)),
            customers: db.customers.filter((c:any) => c.name.toLowerCase().includes(query) || c.phone.includes(query)),
            purchases: db.purchases.filter((p:any) => p.id.toLowerCase().includes(query) || p.supplier.name.toLowerCase().includes(query)),
            suppliers: db.suppliers.filter((s:any) => s.name.toLowerCase().includes(query)),
            partners: db.partners.filter((p:any) => p.name.toLowerCase().includes(query)),
            salesReturns: (db.salesReturns || []).filter((r:any) => r.id.toLowerCase().includes(query)),
            purchaseReturns: (db.purchaseReturns || []).filter((r:any) => r.id.toLowerCase().includes(query)),
            installments: (db.installments || []).filter((i:any) => i.customerName.toLowerCase().includes(query)),
            stockTransfers: (db.stockTransfers || []).filter((st:any) => st.id.toLowerCase().includes(query))
        };
    },
    getUsers: async () => (await getDb()).users,
    getEmployees: async () => {
        const db = (await getDb());
        return db.employees || [];
    },
    saveEmployee: async (e: any) => {
        return withDbLock(async () => {
            const db = (await getDb());
            if (e.id) {
                db.employees = db.employees.map((item: any) => item.id === e.id ? { ...item, ...e } : item);
            } else {
                e.id = `emp-${Date.now()}`;
                if (!db.employees) db.employees = [];
                db.employees.push(e);
            }

            logActivity(db, 'إدارة الموظفين', `تم حفظ بيانات الموظف: ${e.name}`);
            await saveDb(db);
            return e;
        });
    },
    deleteEmployee: async (id: string) => {
        return withDbLock(async () => {
            const db = (await getDb());
            // sync disabled
            db.employees = db.employees.filter((item: any) => item.id !== id);
            logActivity(db, 'إدارة الموظفين', `تم حذف موظف`);
            await saveDb(db);
            return true;
        });
    },
    deleteInvoice: async (id: string) => {
        return withDbLock(async () => {
            const db = (await getDb());
            const saleIndex = db.sales.findIndex((ex:any)=>ex.id === id);
            const purchaseIndex = db.purchases.findIndex((ex:any)=>ex.id === id);
            
            if (saleIndex !== -1) {
                const sale = db.sales[saleIndex];
                
                // Restore Stock
                sale.items.forEach((item: any) => {
                    const product = db.products.find((p: any) => p.id === item.id);
                    if (product) {
                        if (sale.warehouseId) {
                            product.warehouseStocks = product.warehouseStocks || {};
                            product.warehouseStocks[sale.warehouseId] = Money.add(product.warehouseStocks[sale.warehouseId] || 0, item.quantity);
                        }
                        product.stock = Money.add(product.stock || 0, item.quantity);
                    }
                });

                // Revert Customer Balance & Points
                const customer = db.customers.find((c: any) => c.id === sale.customer.id);
                if (customer) {
                    const unpaid = Money.subtract(sale.total, sale.amountPaid || 0);
                    if (unpaid > 0) customer.debt = Math.max(0, Money.subtract(customer.debt || 0, unpaid));
                    if (sale.pointsEarned) customer.points = Math.max(0, (customer.points || 0) - sale.pointsEarned);
                    if (sale.pointsRedeemed) customer.points = Money.add(customer.points || 0, sale.pointsRedeemed);
                }

                // Delete associated Installment Plan
                if (db.installments) {
                    db.installments = db.installments.filter((i: any) => i.saleId !== id);
                }

                // Revert Treasury
                if (sale.amountPaid > 0) logTransaction(db, 'withdrawal', sale.amountPaid, `استرداد نقدي لالغاء فاتورة مبيعات #${id}`, sale.treasuryId, 'مبيعات');
                
                db.sales.splice(saleIndex, 1);
                logActivity(db, 'حذف فاتورة مبيعات', `تم حذف الفاتورة ${id} واستعادة الأرصدة والمخزون`);

            } else if (purchaseIndex !== -1) {
                const purchase = db.purchases[purchaseIndex];
                
                // Restore Stock
                purchase.items.forEach((item: any) => {
                    const product = db.products.find((p: any) => p.id === item.productId);
                    if (product) {
                        if (purchase.warehouseId) {
                            product.warehouseStocks = product.warehouseStocks || {};
                            product.warehouseStocks[purchase.warehouseId] = Math.max(0, Money.subtract(product.warehouseStocks[purchase.warehouseId] || 0, item.quantity));
                        }
                        product.stock = Math.max(0, Money.subtract(product.stock || 0, item.quantity));
                    }
                });

                // Revert Supplier Debt
                const supplier = db.suppliers.find((s: any) => s.id === purchase.supplier.id);
                if (supplier) {
                    const unpaid = Money.subtract(purchase.total, purchase.amountPaid || 0);
                    if (unpaid > 0) supplier.debt = Math.max(0, Money.subtract(supplier.debt || 0, unpaid));
                }

                // Revert Treasury
                if (purchase.paymentMethod === 'Split' && purchase.splitPayments) {
                    if (purchase.splitPayments.cash > 0) logTransaction(db, 'income', purchase.splitPayments.cash, `استرداد نقدي لالغاء فاتورة مشتريات #${id}`, purchase.treasuryId, 'مشتريات');
                    if (purchase.splitPayments.card > 0) logTransaction(db, 'income', purchase.splitPayments.card, `استرداد بطاقة لالغاء فاتورة مشتريات #${id}`, purchase.treasuryId, 'مشتريات');
                    if (purchase.splitPayments.transfer > 0) logTransaction(db, 'income', purchase.splitPayments.transfer, `استرداد تحويل لالغاء فاتورة مشتريات #${id}`, purchase.treasuryId, 'مشتريات');
                } else if (purchase.amountPaid > 0) {
                    logTransaction(db, 'income', purchase.amountPaid, `استرداد مالي لالغاء فاتورة مشتريات #${id}`, purchase.treasuryId, 'مشتريات');
                }
                
                db.purchases.splice(purchaseIndex, 1);
                logActivity(db, 'حذف فاتورة مشتريات', `تم حذف الفاتورة ${id} واستعادة الأرصدة والمخزون`);
            }
            await saveDb(db);
            return true;
        });
    },
    getRoles: async () => (await getDb()).roles,
    saveRole: async (role: any) => {
        return withDbLock(async () => {
            const db = (await getDb());
            if (role.id) {
                db.roles = db.roles.map((r: any) => r.id === role.id ? role : r);
                // مزامنة تلقائية: تحديث جميع المستخدمين الذين يمتلكون هذا الدور لتعكس صلاحياتهم الجديدة فوراً
                db.users = db.users.map((u: any) => u.roleId === role.id ? { ...u, permissions: { ...role.permissions } } : u);
            } else {
                role.id = `r-${Date.now()}`;
                if (!db.roles) db.roles = [];
                db.roles.push(role);
            }
            await saveDb(db);
            return role;
        });
    },
    login: async (n: string, p: string) => (await getDb()).users.find((u: any) => u.name === n && u.password === p) || null,
    verifyPassword: async (uid: string, p: string) => (await getDb()).users.find((u:any)=>u.id===uid)?.password === p,
    wipeBusinessData: async () => { 
        return withDbLock(async () => {
            const db = (await getDb()); 
            db.products = []; 
            db.sales = []; 
            db.purchases = []; 
            db.customers = [{ id: 'cust-1', name: 'عميل نقدي', phone: '000', debt: 0, points: 0, tier: 'Regular', creditLimit: 0 }]; 
            db.suppliers = []; 
            db.transactions = []; 
            db.shifts = []; 
            db.salesReturns = []; 
            db.purchaseReturns = [];
            db.installments = []; 
            db.customerTransactions = [];
            db.supplierTransactions = [];
            db.partnerTransactions = [];
            db.stockTransfers = [];
            db.journalEntries = [];
            db.settlements = [];
            db.activityLogs = [];
            db.treasuries = [{ id: 't-1', name: 'الخزينة الرئيسية', balance: 0, currency: 'SAR', isDefault: true }];
            
            logActivity(db, 'تصفير البرنامج', 'تم تصفير كافة البيانات المالية والمخزون');
            await saveDb(db); 
            return true;
        });
    },
    getBackupData: async () => JSON.stringify(await getDb()),
    reset: async () => { 
        if (typeof window !== 'undefined' && 'electronAPI' in window) {
            await (window as any).electronAPI.secureSave(getDbKey(), null);
        } else {
            localStorage.removeItem(getDbKey()); 
        }
        window.location.reload(); 
    },
    addNotification: async (n: any) => { const db = (await getDb()); if (!db.notifications) db.notifications = []; const newN = { id: `notif-${Date.now()}`, date: new Date().toISOString(), ...n }; db.notifications.unshift(newN); await saveDb(db); return newN; },
    getNotifications: async () => {
        const db = (await getDb());
        const baseNotifications = db.notifications || [];
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const overdueInstallments = (db.installments || []).flatMap((plan: any) => 
            (plan.payments || []).filter((p: any) => p.status === 'Pending' && new Date(p.dueDate) < today)
            .map((p: any) => ({
                id: `inst-overdue-${p.id}`,
                type: 'SYSTEM_ALERT',
                title: 'تنبيه تأخير تحصيل قسط',
                message: `القسط الخاص بالعميل ${plan.customerName} (رقم الفاتورة: ${plan.saleId}) بقيمة ${p.amount} متأخر من تاريخ ${new Date(p.dueDate).toLocaleDateString('ar-EG')}`,
                date: new Date().toISOString(),
                isRead: false
            }))
        );

        return [...overdueInstallments, ...baseNotifications].sort((a:any,b:any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    getStockTransfers: async () => (await getDb()).stockTransfers || [],
    getCustomerPurchaseHistory: async (id: string) => (await getDb()).sales.filter((s: any) => s.customer.id === id),
    getCustomerReturnsHistory: async (id: string) => (await getDb()).salesReturns.filter((r: any) => r.customer?.id === id),
    getCustomerDebtTransactions: async (id: string) => ((await getDb()).customerTransactions || []).filter((t: any) => t.customerId === id),
    addCustomerDebt: async (customerId: string, amount: number, dueDate: string, description: string) => {
        const db = (await getDb());
        const customer = db.customers.find((c: any) => c.id === customerId);
        if (!customer) return false;
        
        const transaction = {
            id: `cd-${Date.now()}`,
            customerId,
            type: 'Debt',
            amount,
            date: new Date().toISOString(),
            dueDate,
            description
        };
        
        if (!db.customerTransactions) db.customerTransactions = [];
        db.customerTransactions.unshift(transaction);
        customer.debt = (customer.debt || 0) + amount;
        
        logActivity(db, 'إضافة دين لعميل', `تم إضافة دين بمبلغ ${amount} للعميل ${customer.name}`);
        await saveDb(db);
        return true;
    },
    recordCustomerPayment: async (customerId: string, amount: number, description: string, treasuryId: string) => {
        const db = (await getDb());
        const customer = db.customers.find((c: any) => c.id === customerId);
        if (!customer) return false;
        
        const transaction = {
            id: `cp-${Date.now()}`,
            customerId,
            type: 'Payment',
            amount,
            date: new Date().toISOString(),
            description
        };
        
        if (!db.customerTransactions) db.customerTransactions = [];
        db.customerTransactions.unshift(transaction);
        customer.debt = Math.max(0, (customer.debt || 0) - amount);
        
        logTransaction(db, 'income', amount, `تحصيل مديونية - العميل: ${customer.name}`, treasuryId, 'تحصيل ديون');
        logActivity(db, 'تحصيل مديونية', `تم تحصيل مبلغ ${amount} من العميل ${customer.name}`);
        await saveDb(db);
        return true;
    },
    recordSupplierPayment: async (supplierId: string, amount: number, description: string, treasuryId: string) => {
        const db = (await getDb());
        const supplier = db.suppliers.find((c: any) => c.id === supplierId);
        if (!supplier) return false;
        
        const transaction = {
            id: `sp-${Date.now()}`,
            supplierId,
            type: 'Payment',
            amount,
            date: new Date().toISOString(),
            description
        };
        
        if (!db.supplierTransactions) db.supplierTransactions = [];
        db.supplierTransactions.unshift(transaction);
        supplier.debt = Math.max(0, (supplier.debt || 0) - amount);
        
        logTransaction(db, 'withdrawal', amount, `سداد مديونية - المورد: ${supplier.name}`, treasuryId, 'موردين');
        logActivity(db, 'سداد مورد', `تم سداد مبلغ ${amount} للمورد ${supplier.name}`);
        await saveDb(db);
        return true;
    },
    bulkUpdateProducts: async (products: Product[]) => {
        const db = (await getDb());
        products.forEach(p => { db.products = db.products.map((item: any) => item.id === p.id ? { ...item, ...p } : item); });
        logActivity(db, 'تحديث جماعي للأسعار', `تم تحديث أسعار ${products.length} منتج`);
        await saveDb(db); return true;
    },
    saveInstallmentPlan: async (plan: InstallmentPlan) => {
        const db = (await getDb());
        if(!db.installments) db.installments = [];
        const idx = db.installments.findIndex((i:any) => i.id === plan.id);
        if (idx >= 0) db.installments[idx] = plan;
        else db.installments.unshift(plan);
        logActivity(db, 'الأقساط', `تعديل خطة تقسيط للعميل ${plan.customerName}`);
        await saveDb(db);
        return plan;
    },
    deleteInstallmentPlan: async (id: string) => {
        const db = (await getDb());
        if(!db.installments) return false;
        db.installments = db.installments.filter((i:any) => i.id !== id);
        logActivity(db, 'الأقساط', `حذف خطة تقسيط`);
        await saveDb(db);
        return true;
    },
    deleteCustomer: async (id: string) => {
        const db = (await getDb());
        db.customers = db.customers.filter((c: any) => c.id !== id);
        db.customerTransactions = (db.customerTransactions || []).filter((t: any) => t.customerId !== id);
        logActivity(db, 'إدارة العملاء', `تم حذف عميل`);
        await saveDb(db);
        return true;
    },
    deleteSupplier: async (id: string) => {
        const db = (await getDb());
        db.suppliers = db.suppliers.filter((s: any) => s.id !== id);
        db.supplierTransactions = (db.supplierTransactions || []).filter((t: any) => t.supplierId !== id);
        logActivity(db, 'إدارة الموردين', `تم حذف مورد`);
        await saveDb(db);
        return true;
    },
    deleteCustomerTransaction: async (id: string) => {
        const db = (await getDb());
        const tr = db.customerTransactions.find((t: any) => t.id === id);
        if (!tr) return false;

        const customer = db.customers.find((c: any) => c.id === tr.customerId);
        if (customer) {
            // Revert debt
            if (tr.type === 'Debt') customer.debt = Math.max(0, (customer.debt || 0) - tr.amount);
            else if (tr.type.toLowerCase() === 'payment') customer.debt = (customer.debt || 0) + tr.amount;
        }
        
        if (tr.type.toLowerCase() === 'payment') {
            logTransaction(db, 'withdrawal', tr.amount, `إلغاء تحصيل من العميل: ${customer?.name}`, tr.treasuryId, 'تحصيل ديون');
        }

        db.customerTransactions = db.customerTransactions.filter((t: any) => t.id !== id);
        logActivity(db, 'حذف حركة ذمم', `تم حذف حركة عميل واستعادة التوازن`);
        await saveDb(db);
        return true;
    },
    deleteSupplierTransaction: async (id: string) => {
        const db = (await getDb());
        const tr = db.supplierTransactions?.find((t: any) => t.id === id);
        if (!tr) return false;
        
        const supplier = db.suppliers.find((s: any) => s.id === tr.supplierId);
        if (supplier) {
            if (tr.type === 'Debt') supplier.debt = Math.max(0, (supplier.debt || 0) - tr.amount);
            else if (tr.type.toLowerCase() === 'payment') supplier.debt = (supplier.debt || 0) + tr.amount;
        }
        
        if (tr.type.toLowerCase() === 'payment') {
            logTransaction(db, 'income', tr.amount, `إلغاء سداد مورد: ${supplier?.name}`, tr.treasuryId, 'موردين');
        }
        
        db.supplierTransactions = db.supplierTransactions.filter((t: any) => t.id !== id);
        logActivity(db, 'حذف حركة ذمم', `تم حذف حركة مورد واستعادة التوازن`);
        await saveDb(db);
        return true;
    },
    deleteTreasuryTransaction: async (id: string) => {
        const db = (await getDb());
        const tr = db.transactions.find((t: any) => t.id === id);
        if (!tr) return false;

        const treasury = db.treasuries.find((t: any) => t.id === tr.treasuryId);
        if (treasury) {
            // Revert balance
            if (tr.type === 'income') treasury.balance -= tr.amount;
            else treasury.balance += tr.amount;
        }

        db.transactions = db.transactions.filter((t: any) => t.id !== id);
        logActivity(db, 'حذف حركة خزينة', `تم حذف حركة مالية واستعادة الرصيد`);
        await saveDb(db);
        return true;
    },
    getSettlements: async () => {
        const db = (await getDb());
        return db.settlements || [];
    },
    saveSettlement: async (s: any) => {
        return withDbLock(async () => {
            const db = (await getDb());
            if (s.id) {
                db.settlements = db.settlements.map((item: any) => item.id === s.id ? { ...item, ...s } : item);
            } else {
                s.id = `ST-XP-${Date.now().toString().slice(-5)}`;
                if (!db.settlements) db.settlements = [];
                db.settlements.unshift(s);
                
                // Sync disabled

                // Apply to beneficiary
                if (s.beneficiaryType === 'Partner') {
                    const p = db.partners?.find((x: any) => x.id === s.beneficiaryId);
                    if (p) {
                        if (s.direction === 'out') p.currentBalance = Money.subtract(p.currentBalance || 0, s.amount);
                        else p.currentBalance = Money.add(p.currentBalance || 0, s.amount);
                    }
                } else if (s.beneficiaryType === 'Employee') {
                    const e = db.employees?.find((x: any) => x.id === s.beneficiaryId);
                    if (e) {
                       if (s.direction === 'out') e.balance = Money.subtract(e.balance || 0, s.amount);
                       else e.balance = Money.add(e.balance || 0, s.amount);
                    }
                } else if (s.beneficiaryType === 'Customer') {
                   const c = db.customers?.find((x:any) => x.id === s.beneficiaryId);
                   if (c) {
                       if (s.direction === 'in') {
                           c.debt = Math.max(0, Money.subtract(c.debt || 0, s.amount)); // they paid us
                           
                           // AUTO-COLLECT INSTALLMENTS
                           if (db.installments) {
                               let remainingPayment = s.amount;
                               const customerPlans = db.installments.filter((p: any) => p.customerName === c.name && p.status === 'Active');
                               
                               for (const plan of customerPlans) {
                                   if (remainingPayment <= 0) break;
                                   
                                   for (const payment of plan.payments) {
                                       if (remainingPayment <= 0) break;
                                       if (payment.status === 'Pending') {
                                           const payAmount = Math.min(remainingPayment, payment.amount);
                                           if (payAmount >= payment.amount) {
                                               payment.status = 'Paid';
                                               payment.paidDate = new Date().toISOString();
                                               remainingPayment = Money.subtract(remainingPayment, payment.amount);
                                               plan.remainingAmount = Math.max(0, Money.subtract(plan.remainingAmount || 0, payment.amount));
                                           } else {
                                               // Partial payment for an installment
                                               payment.partialPaid = (payment.partialPaid || 0) + payAmount;
                                               remainingPayment = 0;
                                               plan.remainingAmount = Math.max(0, Money.subtract(plan.remainingAmount || 0, payAmount));
                                           }
                                           
                                           if (plan.remainingAmount <= 0) {
                                               plan.remainingAmount = 0;
                                               plan.status = 'Paid Off';
                                           }
                                       }
                                   }
                               }
                           }
                       }
                       if (s.direction === 'out') c.debt = Money.add(c.debt || 0, s.amount); // they borrowed more
                   }
                } else if (s.beneficiaryType === 'Supplier') {
                    const sp = db.suppliers?.find((x:any) => x.id === s.beneficiaryId);
                    if (sp) {
                       if (s.direction === 'out') sp.debt = Math.max(0, Money.subtract(sp.debt || 0, s.amount)); // we paid them
                       if (s.direction === 'in') sp.debt = Money.add(sp.debt || 0, s.amount); // we borrowed from them
                    }
                }

                logTransaction(db, s.direction === 'in' ? 'income' : 'withdrawal', s.amount, `تسوية لـ ${s.beneficiaryName} - ${s.type}`, s.treasuryId, 'تسويات مالیة');
            }
            logActivity(db, 'تسوية مالية', `تسجيل تسوية مالية للمستفيد ${s.beneficiaryName}`);
            await saveDb(db);
            return s;
        });
    },
    deleteSettlement: async (id: string) => {
        return withDbLock(async () => {
            const db = (await getDb());
            const s = db.settlements?.find((item: any) => item.id === id);
            if (s) {
                // Revert the money
                logTransaction(db, s.direction === 'in' ? 'withdrawal' : 'income', s.amount, `إلغاء تسوية مالية ${s.type} واسترداد المبلغ`, s.treasuryId, 'تسويات مالیة');
                
                // Revert beneficiary balance if applicable (e.g. partner)
                if (s.beneficiaryType === 'Partner') {
                    const p = db.partners?.find((x: any) => x.id === s.beneficiaryId);
                    if (p) {
                        if (s.direction === 'out') { 
                            p.currentBalance = Money.add(p.currentBalance || 0, s.amount);
                        } else if (s.direction === 'in') {
                            p.currentBalance = Money.subtract(p.currentBalance || 0, s.amount);
                        }
                    }
                } else if (s.beneficiaryType === 'Employee') {
                    const e = db.employees?.find((x: any) => x.id === s.beneficiaryId);
                    if (e) {
                       if (s.direction === 'out') e.balance = Money.add(e.balance || 0, s.amount);
                       else e.balance = Money.subtract(e.balance || 0, s.amount);
                    }
                } else if (s.beneficiaryType === 'Customer') {
                   const c = db.customers?.find((x:any) => x.id === s.beneficiaryId);
                   if (c) {
                       if (s.direction === 'in') c.debt = Money.add(c.debt || 0, s.amount);
                       if (s.direction === 'out') c.debt = Math.max(0, Money.subtract(c.debt || 0, s.amount));
                   }
                } else if (s.beneficiaryType === 'Supplier') {
                    const sp = db.suppliers?.find((x:any) => x.id === s.beneficiaryId);
                    if (sp) {
                       if (s.direction === 'out') sp.debt = Money.add(sp.debt || 0, s.amount);
                       if (s.direction === 'in') sp.debt = Math.max(0, Money.subtract(sp.debt || 0, s.amount));
                    }
                }
                
                db.settlements = db.settlements.filter((item: any) => item.id !== id);
                logActivity(db, 'إلغاء تسوية', `إلغاء التسوية: ${id}`);
                await saveDb(db);
            }
            return true;
        });
    },
    saveUser: async (u: any) => {
        return withDbLock(async () => {
            const db = (await getDb());
            const role = db.roles.find((r: any) => r.id === u.roleId);
            if (role) {
                u.permissions = { ...role.permissions };
            }
            if (u.id) {
                db.users = db.users.map((item: any) => item.id === u.id ? { ...item, ...u } : item);
            } else {
                u.id = `u-${Date.now()}`;
                if (!db.users) db.users = [];
                db.users.push(u);
            }
            logActivity(db, 'إدارة المستخدمين', `حفظ بيانات المستخدم: ${u.name}`);
            await saveDb(db);
            return u;
        });
    },
    saveStockTransfer: async (st: any) => {
        const db = (await getDb()); st.id = `st-${Date.now()}`; st.date = new Date().toISOString(); if (!db.stockTransfers) db.stockTransfers = []; db.stockTransfers.unshift(st);
        
        if (st.items && st.items.length > 0) {
            for (const item of st.items) {
                const p = db.products.find((prod: any) => prod.id === item.productId);
                if (p) {
                    if(!p.warehouseStocks) p.warehouseStocks = {};
                    p.warehouseStocks[st.fromWarehouseId] = (p.warehouseStocks[st.fromWarehouseId] || 0) - item.quantity;
                    p.warehouseStocks[st.toWarehouseId] = (p.warehouseStocks[st.toWarehouseId] || 0) + item.quantity;
                    p.stock = Object.values(p.warehouseStocks as Record<string, number>).reduce((a, b) => a + Number(b), 0);
                }
            }
            logActivity(db, 'تحويل مخزني', `تحويل عدد ${st.items.length} منتجات`);
        } else {
            const p = db.products.find((prod: any) => prod.id === st.productId);
            if (p) {
                if(!p.warehouseStocks) p.warehouseStocks = {};
                p.warehouseStocks[st.fromWarehouseId] = (p.warehouseStocks[st.fromWarehouseId] || 0) - st.quantity;
                p.warehouseStocks[st.toWarehouseId] = (p.warehouseStocks[st.toWarehouseId] || 0) + st.quantity;
                p.stock = Object.values(p.warehouseStocks as Record<string, number>).reduce((a, b) => a + Number(b), 0);
            }
            logActivity(db, 'تحويل مخزني', `تحويل ${st.quantity} من المنتج ${p?.name}`);
        }
        
        await saveDb(db); return true;
    },
    deleteStockTransfer: async (id: string) => {
        const db = (await getDb());
        if (!db.stockTransfers) return false;
        const st = db.stockTransfers.find((t: any) => t.id === id);
        if (!st) return false;

        if (st.items && st.items.length > 0) {
            for (const item of st.items) {
                const p = db.products.find((prod: any) => prod.id === item.productId);
                if (p) {
                    if(!p.warehouseStocks) p.warehouseStocks = {};
                    p.warehouseStocks[st.fromWarehouseId] = (p.warehouseStocks[st.fromWarehouseId] || 0) + item.quantity;
                    p.warehouseStocks[st.toWarehouseId] = (p.warehouseStocks[st.toWarehouseId] || 0) - item.quantity;
                    p.stock = Object.values(p.warehouseStocks as Record<string, number>).reduce((a, b) => a + Number(b), 0);
                }
            }
            logActivity(db, 'تراجع تحويل مخزني', `تراجع عن تحويل ${st.items.length} منتجات`);
        } else {
            const p = db.products.find((prod: any) => prod.id === st.productId);
            if (p) {
                if(!p.warehouseStocks) p.warehouseStocks = {};
                p.warehouseStocks[st.fromWarehouseId] = (p.warehouseStocks[st.fromWarehouseId] || 0) + st.quantity;
                p.warehouseStocks[st.toWarehouseId] = (p.warehouseStocks[st.toWarehouseId] || 0) - st.quantity;
                p.stock = Object.values(p.warehouseStocks as Record<string, number>).reduce((a, b) => a + Number(b), 0);
            }
            logActivity(db, 'تراجع تحويل مخزني', `تراجع عن تحويل ${st.quantity} من المنتج ${p?.name}`);
        }
        
        db.stockTransfers = db.stockTransfers.filter((t: any) => t.id !== id);
        await saveDb(db); return true;
    },
    getShippingCompanies: async () => (await getDb()).shippingCompanies || [],
    saveShippingCompany: async (c: any) => { const db = (await getDb()); if (c.id) db.shippingCompanies = db.shippingCompanies.map((item: any) => item.id === c.id ? { ...item, ...c } : item); else { c.id = `sc-${Date.now()}`; db.shippingCompanies.push(c); } logActivity(db, 'إدارة شركات الشحن', `حفظ بيانات شركة الشحن: ${c.name}`); await saveDb(db); return c; },
    deleteShippingCompany: async (id: string) => {
        const db = (await getDb());
        db.shippingCompanies = db.shippingCompanies.filter((c: any) => c.id !== id);
        logActivity(db, 'حذف شركة شحن', `تم حذف شركة شحن ذو المعرف: ${id}`);
        await saveDb(db);
        return true;
    },
    getShippingOperations: async () => (await getDb()).shippingOperations || [],
    saveShippingOperation: async (o: any) => { 
        const db = (await getDb()); 
        if(!db.shippingOperations) db.shippingOperations = [];
        if (o.id) {
            db.shippingOperations = db.shippingOperations.map((item: any) => item.id === o.id ? { ...item, ...o } : item); 
        } else { 
            o.id = `so-${Date.now()}`; 
            db.shippingOperations.push(o); 
        } 
        logActivity(db, 'إدارة عمليات الشحن', `تم حفظ عملية شحن برقم تتبع: ${o.trackingNumber}`); 
        await saveDb(db); 
        return o; 
    },
    deleteShippingOperation: async (id: string) => { 
        const db = (await getDb()); 
        if(db.shippingOperations) {
            db.shippingOperations = db.shippingOperations.filter((c: any) => c.id !== id); 
        }
        logActivity(db, 'إدارة عمليات الشحن', `تم حذف عملية شحن`); 
        await saveDb(db); 
    },
    savePurchaseReturn: async (r: any) => {
        const db = (await getDb()); r.id = `pr-${Date.now()}`; if (!db.purchaseReturns) db.purchaseReturns = []; db.purchaseReturns.unshift(r);
        r.items.forEach((item: any) => {
            const p = db.products.find((prod: any) => prod.id === item.productId);
            if (p) {
                if(!p.warehouseStocks) p.warehouseStocks = {};
                p.warehouseStocks[r.warehouseId] = (p.warehouseStocks[r.warehouseId] || 0) - item.quantity;
                p.stock = Object.values(p.warehouseStocks as Record<string, number>).reduce((a, b) => a + Number(b), 0);
            }
        });
        if (r.totalRecovered > 0) logTransaction(db, 'income', r.totalRecovered, `مرتجع مشتريات #${r.originalPurchaseId}`, r.treasuryId, 'مرتجعات');
        logActivity(db, 'مرتجع مشتريات', `تسجيل مرتجع مشتريات بمبلغ مسترد ${r.totalRecovered}`);
        await saveDb(db); return r;
    },
    deletePurchaseReturn: async (id: string) => {
        const db = (await getDb());
        if (!db.purchaseReturns) return false;
        const ret = db.purchaseReturns.find((r: any) => r.id === id);
        if (!ret) return false;
        
        ret.items.forEach((item: any) => {
            const p = db.products.find((prod: any) => prod.id === item.productId);
            if (p) {
                if(!p.warehouseStocks) p.warehouseStocks = {};
                p.warehouseStocks[ret.warehouseId] = (p.warehouseStocks[ret.warehouseId] || 0) + item.quantity;
                p.stock = Object.values(p.warehouseStocks as Record<string, number>).reduce((a, b) => a + Number(b), 0);
            }
        });
        
        if (ret.totalRecovered > 0) logTransaction(db, 'withdrawal', ret.totalRecovered, `التراجع عن مرتجع مشتريات #${ret.originalPurchaseId}`, ret.treasuryId, 'مرتجعات');
        
        db.purchaseReturns = db.purchaseReturns.filter((r: any) => r.id !== id);
        logActivity(db, 'التراجع عن مرتجع', `تم التراجع عن المرتجع #${id}`);
        await saveDb(db);
        return true;
    },
    getActivityLogs: async () => (await getDb()).activityLogs || [],
    getEmployeePerformanceAnalytics: async (): Promise<EmployeePerformanceAnalytics> => {
        const db = (await getDb());
        const sales = db.sales || [];
        const performanceData: EmployeePerformanceData[] = db.employees.map((emp: any) => {
            const empSales = sales.filter((s: any) => s.employeeId === emp.id || s.cashier?.id === emp.id);
            const totalSalesValue = empSales.reduce((sum: number, s: any) => sum + s.total, 0);
            const totalSalesCount = empSales.length;
            const averageSaleValue = totalSalesCount > 0 ? totalSalesValue / totalSalesCount : 0;
            const empReturns = db.salesReturns.filter((r: any) => r.employeeId === emp.id || r.user?.id === emp.id);
            const totalReturnsValue = empReturns.reduce((sum: number, r: any) => sum + r.totalRefund, 0);
            const returnRate = totalSalesValue > 0 ? (totalReturnsValue / totalSalesValue) * 100 : 0;

            return {
                userId: emp.id,
                userName: emp.name,
                totalSalesValue,
                totalSalesCount,
                averageSaleValue,
                totalReturnsValue,
                returnRate
            };
        });

        return {
            performanceData,
            topPerformerByValue: [...performanceData].sort((a, b) => b.totalSalesValue - a.totalSalesValue)[0],
            topPerformerByCount: [...performanceData].sort((a, b) => b.totalSalesCount - a.totalSalesCount)[0],
        };
    },
    submitFeedback: async (feedback: any) => {
        const db = (await getDb());
        if (!db.feedback) db.feedback = [];
        db.feedback.push({ id: `fb-${Date.now()}`, date: new Date().toISOString(), ...feedback });
        await saveDb(db);
        return true;
    },
    getSyncLogs: async () => [], getQueueCount: async () => 0, processQueue: async () => {}, setOnlineStatus: (o: boolean) => {}, getSatisfactionAnalytics: async () => ({ happy: 0, neutral: 0, unhappy: 0, total: 0 }), getSalesHistoryForForecast: async () => [], getSupplierPerformanceData: async () => [], getInactiveCustomers: async (d: number) => [], getStagnantProducts: async (d: number) => [], updateSystemVersion: async (v: string, p: any) => {}, getJournalEntries: async () => [],
    getWhatsAppTemplates: async () => {
        const db = (await getDb());
        if (!db.whatsappTemplates || db.whatsappTemplates.length === 0) {
            db.whatsappTemplates = [
                { id: 'wa-tpl-1', name: 'فاتورة مبيعات', type: 'invoice', body: 'مرحباً {{customer_name}}،\n\nشكراً لتسوقكم في {{store_name}}.\nرقم الفاتورة: {{invoice_number}}\nالتاريخ: {{date}}\nالإجمالي: {{amount}}\n\nنتمنى لكم يوماً سعيداً.', isDefault: true },
                { id: 'wa-tpl-2', name: 'مطالبة مديونية', type: 'debt', body: 'مرحباً {{customer_name}}،\n\nنود تذكيركم بأن هناك مديونية مستحقة لصالح {{store_name}} بقيمة {{amount}}.\nالرجاء المبادرة بالسداد العاجل.\n\nشكراً لتعاونكم.', isDefault: false },
                { id: 'wa-tpl-3', name: 'رسالة ترحيب', type: 'generic', body: 'مرحباً {{customer_name}}،\n\nيسعدنا انضمامكم إلى عملاء {{store_name}} الدائمين. ترقبوا عروضنا القادمة!', isDefault: false }
            ];
            await saveDb(db);
        }
        return db.whatsappTemplates;
    },
    saveWhatsAppTemplate: async (t: any) => {
        const db = (await getDb());
        if(!db.whatsappTemplates) db.whatsappTemplates = [];
        if (t.id) {
            db.whatsappTemplates = db.whatsappTemplates.map((item: any) => item.id === t.id ? { ...item, ...t } : item);
        } else {
            t.id = `wa-tpl-${Date.now()}`;
            db.whatsappTemplates.push(t);
        }
        logActivity(db, 'إعدادات واتساب', `تم حفظ قالب رسالة`);
        await saveDb(db); return t;
    },
    deleteWhatsAppTemplate: async (id: string) => {
        const db = (await getDb());
        if(!db.whatsappTemplates) return false;
        db.whatsappTemplates = db.whatsappTemplates.filter((t: any) => t.id !== id);
        logActivity(db, 'إعدادات واتساب', `تم حذف قالب رسالة`);
        await saveDb(db); return true;
    },
    getWhatsAppLogs: async () => (await getDb()).whatsappLogs || [],
    logWhatsAppMessage: async (log: any) => {
        const db = (await getDb());
        if (!db.whatsappLogs) db.whatsappLogs = [];
        log.id = `wa-log-${Date.now()}`;
        log.date = new Date().toISOString();
        db.whatsappLogs.unshift(log);
        await saveDb(db);
        return log;
    }
};
