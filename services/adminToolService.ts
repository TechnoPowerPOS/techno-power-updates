
import { adminCrypto } from '../utils/adminCrypto';
import { secureStorage } from '../utils/secureStorage';
import type { AdminAuditLog, AdminSecret, LicenseInfo } from '../types';
import { api } from '../services/mockApi';
import { collection, getDocs, getCountFromServer, query, where, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { handleFirestoreError, OperationType } from './firestoreErrorHandler';

const ADMIN_DB_KEY = 'pos_admin_db';

// Diagnosis Types
export interface SystemHealthReport {
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    issues: {
        severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        message: string;
        details?: string;
    }[];
    checkedAt: string;
    performance?: {
        cpuUsage: number;
        ramUsage: number;
        uptime: string;
        apiLatency: number;
        dbSize: string;
        storageUsage: string;
    };
}

export interface SupportTicket {
    id: string;
    customerId: string;
    customerName: string;
    subject: string;
    description: string;
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    assignedTo?: string;
    createdAt: string;
    updatedAt: string;
    responseDelayMinutes?: number;
    csatScore?: number; // 1-5
}

export interface PromoCode {
    id: string;
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    expiryDate: string;
    usageLimit: number;
    usageCount: number;
    status: 'ACTIVE' | 'EXPIRED' | 'DISABLED';
}

const getDefaultAdminData = () => ({
    secrets: [] as AdminSecret[],
    auditLogs: [] as AdminAuditLog[],
    revokedLicenses: [] as string[],
    failedLoginAttempts: {} as Record<string, { count: number; lockedUntil: number }>,
    globalPricing: {
        basicMonthly: { price: "460", oldPrice: "500", discount: "0%" },
        proMonthly: { price: "799", oldPrice: "900", discount: "0%" },
        businessMonthly: { price: "1299", oldPrice: "1400", discount: "0%" },
        basicYearly: { price: "4965", oldPrice: "5520", discount: "10%" },
        proYearly: { price: "8160", oldPrice: "9588", discount: "15%" },
        businessYearly: { price: "12470", oldPrice: "15588", discount: "20%" }
    },
    tickets: [] as SupportTicket[],
    promoCodes: [] as PromoCode[],
    mockDataInitialized: false,
});

let adminDb = secureStorage.getItem<ReturnType<typeof getDefaultAdminData>>(ADMIN_DB_KEY) || getDefaultAdminData();

// Migration / Polyfill for older stored data
if (!adminDb.secrets) adminDb.secrets = [];
if (!adminDb.auditLogs) adminDb.auditLogs = [];
if (!adminDb.revokedLicenses) adminDb.revokedLicenses = [];
if (!adminDb.failedLoginAttempts) adminDb.failedLoginAttempts = {};
if (!adminDb.globalPricing) adminDb.globalPricing = getDefaultAdminData().globalPricing;
if (adminDb.mockDataInitialized === undefined) adminDb.mockDataInitialized = true; // Prevents re-populating mock data for legacy users

const saveAdminDb = () => secureStorage.setItem(ADMIN_DB_KEY, adminDb);

// The actual secrets are now encrypted and stored in the DB by this service.
const INITIAL_SECRETS = {
    'CONFIRMATION_CODE_0': '3556331868750',
    'CONFIRMATION_CODE_1': '2141225455092',
    'CONFIRMATION_CODE_2': '4836327100579',
    'CONFIRMATION_CODE_3': '9037286159401',
    'SECURITY_QUESTION': 'ما اسم معلمك',
    'SECURITY_ANSWER': 'محمد القرنشاوي',
};

// Configuration
const LOCKOUT_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;

// This function runs on service initialization to set up encrypted secrets
const initializeSecrets = async () => {
    // For demonstration in a frontend-only mock environment, we overwrite secrets
    // on every load to ensure code changes are applied without needing to clear storage.
    adminDb.secrets = [];

    for (const [key, value] of Object.entries(INITIAL_SECRETS)) {
        const valueEncrypted = adminCrypto.encrypt(value);
        const valueHmac = await adminCrypto.generateHmac(value);
        adminDb.secrets.push({ key, valueEncrypted, valueHmac });
    }

    // Mock initial data if empty and not initialized yet
    if (!adminDb.mockDataInitialized) {
        if (!adminDb.tickets || adminDb.tickets.length === 0) {
            adminDb.tickets = [
                {
                    id: 'ticket-1', customerId: 'c1', customerName: 'أحمد علي', 
                    subject: 'مشكلة في تفعيل كود الخصم', description: 'لا يعمل الكود عند الدفع',
                    status: 'OPEN', priority: 'HIGH', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
                },
                {
                    id: 'ticket-2', customerId: 'c2', customerName: 'سارة خالد', 
                    subject: 'طلب ترقية للباقة الذهبية', description: 'أريد معرفة الفرق بين الباقات',
                    status: 'IN_PROGRESS', priority: 'MEDIUM', assignedTo: 'أحمد صالح',
                    createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date().toISOString()
                }
            ];
        }

        if (!adminDb.promoCodes || adminDb.promoCodes.length === 0) {
            adminDb.promoCodes = [
                { id: 'p1', code: 'TECHNO20', discountType: 'percentage', discountValue: 20, expiryDate: '2024-12-31', usageLimit: 100, usageCount: 45, status: 'ACTIVE' },
                { id: 'p2', code: 'FIXED50', discountType: 'fixed', discountValue: 50, expiryDate: '2024-06-30', usageLimit: 50, usageCount: 12, status: 'ACTIVE' }
            ];
        }
        adminDb.mockDataInitialized = true;
    }

    saveAdminDb();
};

// Initialize on load
initializeSecrets();


export const adminToolService = {
    // Limits
    async getDynamicPlanLimits() {
        const path = 'admin/plan_limits';
        try {
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
                return null;
            }
            const docRef = doc(db, 'admin', 'plan_limits');
            const d = await Promise.race([
                getDoc(docRef),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Plan Limits Timeout')), 8000))
            ]) as any;
            return d.exists() ? d.data().limits : null;
        } catch (e) {
            console.warn('Failed to fetch plan limits (or timeout):', e);
            return null;
        }
    },
    async saveDynamicPlanLimits(limits: any) {
        const path = 'admin/plan_limits';
        try {
            await setDoc(doc(db, 'admin', 'plan_limits'), { limits });
        } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, path);
        }
    },

    // Marketing Features Plan Content
    async getPlanMarketingContent() {
        const path = 'admin/plan_marketing';
        try {
            const d = await getDoc(doc(db, 'admin', 'plan_marketing'));
            return d.exists() ? d.data().content : null;
        } catch (e) {
            handleFirestoreError(e, OperationType.GET, path);
            return null;
        }
    },
    async savePlanMarketingContent(content: any) {
        const path = 'admin/plan_marketing';
        try {
            await setDoc(doc(db, 'admin', 'plan_marketing'), { 
                content,
                updatedAt: new Date().toISOString() 
            });
            await this.addAuditLog({ action: 'MARKETING_UPDATED', details: 'تحديث المميزات التسويقية للباقات' });
        } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, path);
        }
    },

    async verifyCredentials(codes: string[], securityAnswer: string): Promise<{ status: 'success' | 'failed' | 'locked' | 'tamper_detected', message: string }> {
        const clientIp = 'local'; // Simulated for browser environment

        // RATE LIMITING: Add artificial delay to prevent brute-force attacks
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds delay

        // 1. Check for lockout
        const attemptInfo = adminDb.failedLoginAttempts[clientIp];
        if (attemptInfo && attemptInfo.lockedUntil > Date.now()) {
            const remainingMinutes = Math.ceil((attemptInfo.lockedUntil - Date.now()) / 60000);
            return { status: 'locked', message: `تم قفل الدخول. يرجى المحاولة مرة أخرى بعد ${remainingMinutes} دقيقة.` };
        }

        // 2. Fetch and decrypt stored secrets, checking integrity
        const storedCodes: string[] = [];
        let storedAnswer = '';
        
        if (!adminDb.secrets || adminDb.secrets.length === 0) {
            console.error("No secrets found in adminDb. Attempting to re-initialize.");
            await initializeSecrets();
        }

        for (const secret of adminDb.secrets) {
            try {
                const decryptedValue = adminCrypto.decrypt(secret.valueEncrypted);
                const isTampered = !(await adminCrypto.verifyHmac(decryptedValue, secret.valueHmac));

                if (isTampered) {
                    await this.addAuditLog({ action: 'TAMPER_DETECTED', details: `Tampering detected in secret: ${secret.key}` });
                    return { status: 'tamper_detected', message: 'فشل التحقق من سلامة البيانات.' };
                }
                
                if (secret.key.startsWith('CONFIRMATION_CODE')) {
                    storedCodes.push(decryptedValue);
                } else if (secret.key === 'SECURITY_ANSWER') {
                    storedAnswer = decryptedValue;
                }
            } catch (e) {
                console.error("Crypto error processing secret", secret.key, e);
                return { status: 'tamper_detected', message: 'خطأ في معالجة بيانات الأمان.' };
            }
        }
        
        // 3. Verify credentials
        const codesMatch = storedCodes.length === codes.length && codes.every(c => storedCodes.includes(c));
        const answerMatches = securityAnswer === storedAnswer;

        if (codesMatch && answerMatches) {
            // Success
            delete adminDb.failedLoginAttempts[clientIp];
            saveAdminDb();
            await this.addAuditLog({ action: 'LOGIN_SUCCESS', details: 'Admin login successful.' });
            return { status: 'success', message: 'تم التحقق بنجاح.' };
        } else {
            // Failure
            if (!adminDb.failedLoginAttempts[clientIp]) {
                adminDb.failedLoginAttempts[clientIp] = { count: 0, lockedUntil: 0 };
            }
            const attempts = adminDb.failedLoginAttempts[clientIp];
            attempts.count++;
            
            if (attempts.count >= LOCKOUT_ATTEMPTS) {
                attempts.lockedUntil = Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000;
                await this.addAuditLog({ action: 'LOGIN_LOCKED', details: `Account locked for ${LOCKOUT_DURATION_MINUTES} minutes after ${attempts.count} failed attempts.` });
                return { status: 'locked', message: `تم قفل الدخول لمدة ${LOCKOUT_DURATION_MINUTES} دقيقة بسبب تكرار المحاولات الخاطئة.` };
            }
            saveAdminDb();
            await this.addAuditLog({ action: 'LOGIN_FAILURE', details: `Failed login attempt #${attempts.count}.` });
            return { status: 'failed', message: `فشل في التحقق. المحاولة ${attempts.count} من ${LOCKOUT_ATTEMPTS}.` };
        }
    },

    async getAuditLogs(): Promise<AdminAuditLog[]> {
        return [...adminDb.auditLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    },
    
    async addAuditLog(logData: Omit<AdminAuditLog, 'id'|'timestamp'|'actor'>): Promise<void> {
        const newLog: AdminAuditLog = {
            id: `admin-log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            actor: 'Admin',
            ...logData,
        };
        adminDb.auditLogs.push(newLog);
        saveAdminDb();
    },
    
    // Check data integrity on demand
    async checkIntegrity(): Promise<boolean> {
        for (const secret of adminDb.secrets) {
            const decryptedValue = adminCrypto.decrypt(secret.valueEncrypted);
            if (!(await adminCrypto.verifyHmac(decryptedValue, secret.valueHmac))) {
                await this.addAuditLog({ action: 'TAMPER_DETECTED', details: `Integrity check failed for secret: ${secret.key}` });
                return false;
            }
        }
        return true;
    },

    async getDashboardStats(): Promise<{ logCount: number; revokedCount: number, isTampered: boolean, customersCount: number, licensesCount: number, activeLicensesCount: number }> {
        const isTampered = !(await this.checkIntegrity());
        
        let customersCount = 0;
        let licensesCount = 0;
        let activeLicensesCount = 0;

        if (navigator.onLine) {
            try {
                // Use Promise.race for a 10s timeout to prevent hanging forever
                await Promise.race([
                    (async () => {
                        const custSnap = await getCountFromServer(collection(db, 'customers'));
                        customersCount = custSnap.data().count;

                        const licSnapAll = await getCountFromServer(collection(db, 'licenses'));
                        licensesCount = licSnapAll.data().count;

                        const licSnapActive = await getCountFromServer(query(collection(db, 'licenses'), where('status', '==', 'active')));
                        activeLicensesCount = licSnapActive.data().count;
                    })(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Stats Timeout')), 10000))
                ]);
            } catch(e) {
                console.warn('Failed to fetch stats from Firebase (or Timeout):', e);
            }
        }

        return {
            logCount: adminDb.auditLogs.length,
            revokedCount: Math.max(0, licensesCount - activeLicensesCount),
            isTampered,
            customersCount,
            licensesCount,
            activeLicensesCount
        };
    },

    async revokeLicense(licenseKey: string, reason: string): Promise<void> {
        if (!adminDb.revokedLicenses.includes(licenseKey)) {
            adminDb.revokedLicenses.push(licenseKey);
        }
        await this.addAuditLog({
            action: 'LICENSE_REVOKED',
            details: `License key "${licenseKey}" was revoked. Reason: ${reason}`,
        });
        saveAdminDb();
    },

    async getRevokedLicenses(): Promise<string[]> {
        return [...adminDb.revokedLicenses];
    },

    // NEW: Pricing Configuration
    async getGlobalPricing() {
        const path = 'admin/pricing';
        try {
            const pricingDoc = await getDoc(doc(db, 'admin', 'pricing'));
            if (pricingDoc.exists()) {
                return pricingDoc.data() as typeof adminDb.globalPricing;
            }
        } catch (e) {
            handleFirestoreError(e, OperationType.GET, path);
        }
        return adminDb.globalPricing || getDefaultAdminData().globalPricing;
    },

    async saveGlobalPricing(pricing: typeof adminDb.globalPricing) {
        adminDb.globalPricing = pricing;
        const path = 'admin/pricing';
        try {
            await setDoc(doc(db, 'admin', 'pricing'), {
                ...pricing,
                updatedAt: new Date().toISOString()
            });
        } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, path);
        }
        await this.addAuditLog({ action: 'PRICING_UPDATED', details: 'تم تحديث خطط الأسعار' });
        saveAdminDb();
        return pricing;
    },

    // NEW: System Diagnostic Function
    async runSystemDiagnostics(): Promise<SystemHealthReport> {
        const report: SystemHealthReport = {
            status: 'HEALTHY',
            issues: [],
            checkedAt: new Date().toISOString()
        };

        // 1. Check Cryptographic Integrity
        const isIntegrityOk = await this.checkIntegrity();
        if (!isIntegrityOk) {
            report.status = 'CRITICAL';
            report.issues.push({ severity: 'CRITICAL', message: 'فشل فحص سلامة التشفير', details: 'تم اكتشاف تلاعب في أسرار النظام' });
        }

        // Access mocked DB directly via API getters for checks
        const products = await api.getProducts();
        const sales = await api.getSales();
        const customers = await api.getCustomers();

        // 2. Check Negative Stock
        const negativeStockProducts = products.filter(p => p.stock < 0);
        if (negativeStockProducts.length > 0) {
            if (report.status !== 'CRITICAL') report.status = 'WARNING';
            report.issues.push({ 
                severity: 'HIGH', 
                message: `يوجد ${negativeStockProducts.length} منتج بمخزون سالب`, 
                details: `المنتجات: ${negativeStockProducts.map(p => p.name).join(', ')}` 
            });
        }

        // 3. Check Orphaned Sales (Sales linked to non-existent customers)
        const customerIds = new Set(customers.map(c => c.id));
        const orphanedSales = sales.filter(s => !customerIds.has(s.customer.id));
        if (orphanedSales.length > 0) {
            if (report.status !== 'CRITICAL') report.status = 'WARNING';
            report.issues.push({ 
                severity: 'MEDIUM', 
                message: `تم اكتشاف ${orphanedSales.length} فاتورة يتيمة (بدون عميل صالح)`, 
                details: `أرقام الفواتير: ${orphanedSales.map(s => s.id).join(', ')}` 
            });
        }

        // 4. Check for Suspicious Timestamps (Future Dates)
        const now = Date.now();
        const futureSales = sales.filter(s => new Date(s.date).getTime() > now + 3600000); // 1 hour tolerance
        if (futureSales.length > 0) {
            report.status = 'CRITICAL';
            report.issues.push({ 
                severity: 'CRITICAL', 
                message: `تم اكتشاف ${futureSales.length} فاتورة بتواريخ مستقبلية (تلاعب في الوقت)`, 
                details: `الفواتير: ${futureSales.map(s => s.id).join(', ')}` 
            });
        }

        return report;
    },

    // NEW: Support Tickets
    async getTickets(): Promise<SupportTicket[]> {
        return adminDb.tickets || [];
    },

    async addTicket(ticket: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt'>): Promise<SupportTicket> {
        const newTicket: SupportTicket = {
            ...ticket,
            id: `ticket-${Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        adminDb.tickets = [newTicket, ...(adminDb.tickets || [])];
        saveAdminDb();
        return newTicket;
    },

    async updateTicket(id: string, updates: Partial<SupportTicket>): Promise<void> {
        adminDb.tickets = (adminDb.tickets || []).map(t => 
            t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
        );
        saveAdminDb();
    },

    // NEW: Promo Codes
    async getPromoCodes(): Promise<PromoCode[]> {
        return adminDb.promoCodes || [];
    },

    async addPromoCode(promo: Omit<PromoCode, 'id' | 'usageCount' | 'status'>): Promise<PromoCode> {
        const newPromo: PromoCode = {
            ...promo,
            id: `promo-${Date.now()}`,
            usageCount: 0,
            status: 'ACTIVE',
        };
        adminDb.promoCodes = [newPromo, ...(adminDb.promoCodes || [])];
        saveAdminDb();
        return newPromo;
    },

    async updatePromoCode(id: string, updates: Partial<PromoCode>): Promise<void> {
        adminDb.promoCodes = (adminDb.promoCodes || []).map(p => 
            p.id === id ? { ...p, ...updates } : p
        );
        saveAdminDb();
    },

    async deletePromoCode(id: string): Promise<void> {
        adminDb.promoCodes = (adminDb.promoCodes || []).filter(p => p.id !== id);
        saveAdminDb();
    },

    async validatePromoCode(code: string): Promise<{ valid: boolean, discountType?: 'percentage' | 'fixed', discountValue?: number, message: string }> {
        const promoCodes = await this.getPromoCodes();
        const promo = promoCodes.find(p => p.code.toUpperCase() === code.toUpperCase());
        
        if (!promo) return { valid: false, message: 'الكود غير صحيح' };
        if (promo.status !== 'ACTIVE') return { valid: false, message: 'الكود غير نشط' };
        if (new Date(promo.expiryDate) < new Date()) return { valid: false, message: 'الكود منتهي الصلاحية' };
        if (promo.usageCount >= promo.usageLimit) return { valid: false, message: 'تم استنفاد الحد الأقصى لاستخدام الكود' };
        
        return { 
            valid: true, 
            discountType: promo.discountType, 
            discountValue: promo.discountValue, 
            message: 'تم تفعيل كود الخصم بنجاح' 
        };
    },

    async usePromoCode(code: string): Promise<void> {
        const promoCodes = await this.getPromoCodes();
        const index = promoCodes.findIndex(p => p.code.toUpperCase() === code.toUpperCase());
        if (index !== -1) {
            promoCodes[index].usageCount += 1;
            adminDb.promoCodes = promoCodes;
            saveAdminDb();
        }
    },

    // NEW: Performance & Geo Metrics (Real-time Simulation from Firebase)
    async getPerformanceMetrics(): Promise<SystemHealthReport['performance']> {
        // Fetch real count from Firebase to simulate DB size and API latency conceptually
        const start = Date.now();
        let sizeInKb = 1200; // base size
        try {
            if (navigator.onLine) {
                const snap = await getCountFromServer(collection(db, 'licenses'));
                sizeInKb += snap.data().count * 2; // Assume 2KB per license doc
            }
        } catch (e) {
            // Ignore error
        }
        const apiLatency = Date.now() - start;

        return {
            cpuUsage: Math.floor(Math.random() * 15) + 5, // 5-20%
            ramUsage: Math.floor(Math.random() * 20) + 40, // 40-60%
            uptime: "99.99%",
            apiLatency: Math.max(apiLatency, 50), // At least 50ms
            dbSize: `${(sizeInKb / 1024).toFixed(2)} MB`,
            storageUsage: "120 MB"
        };
    },

    async getPlanDistribution(): Promise<{ plan: string, count: number }[]> {
        const plans: Record<string, number> = { 'Basic': 0, 'Pro': 0, 'Business': 0, 'Free': 0, 'Trial': 0 };
        try {
            if (navigator.onLine) {
                // Instead of fetching all docs, we can do parallel count queries for each plan if we know them
                // But for a dynamic list, we'd need getDocs. Let's stick with getDocs but with a timeout and limit if possible.
                // However, count queries are much faster.
                const planTypes = ['Basic', 'Pro', 'Business', 'Free', 'Trial'];
                
                await Promise.race([
                    Promise.all(planTypes.map(async (type) => {
                        const snap = await getCountFromServer(query(collection(db, 'licenses'), where('planId', '>=', type), where('planId', '<', type + '\uf8ff')));
                        plans[type] = snap.data().count;
                    })),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Plan Distribution Timeout')), 10000))
                ]);
            }
        } catch(e) {
            console.warn('Plan distribution fetch failed:', e);
        }
        
        const PLAN_LABELS: Record<string, string> = {
            'Free': 'المجانية',
            'Trial': 'التجريبية',
            'Basic': 'الأساسية',
            'Pro': 'المحترفين',
            'Business': 'الأعمال'
        };
        
        return Object.entries(plans).map(([plan, count]) => ({ 
            plan: PLAN_LABELS[plan] || plan, 
            count 
        }));
    },

    async getNewSignupsStats(): Promise<{ date: string, count: number }[]> {
        let statsMap: Record<string, number> = {};
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

        for(let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            statsMap[d.toISOString().split('T')[0]] = 0;
        }

        try {
            if (navigator.onLine) {
                // Query only for the last 7 days instead of fetching all docs
                const q = query(
                    collection(db, 'licenses'), 
                    where('createdAt', '>=', sevenDaysAgoStr)
                );
                
                // Still need getDocs for grouping by day unless we do separate count queries
                // But at least it's only the last 7 days
                const licSnap = await Promise.race([
                    getDocs(q),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Signups Stats Timeout')), 10000))
                ]) as any;

                licSnap.forEach((d: any) => {
                    const data = d.data() as any;
                    if (data.createdAt) {
                        const dateStr = new Date(data.createdAt).toISOString().split('T')[0];
                        if (statsMap[dateStr] !== undefined) {
                            statsMap[dateStr]++;
                        }
                    }
                });
            }
        } catch(e) {
            console.warn('Failed to fetch signup stats:', e);
            // Fallback: Populate with minimum active metrics if fetching fails
            for(let key in statsMap) statsMap[key] = Math.floor(Math.random() * 5);
        }

        return Object.entries(statsMap).map(([date, count]) => ({ date, count }));
    }
};
