import { LicenseInfo } from '../types';

export interface Branch {
    id: string;
    name: string;
    createdAt: string;
}

const GLOBAL_BRANCHES_KEY = 'techno_power_ultra_branches';
const CURRENT_BRANCH_KEY = 'techno_power_ultra_current_branch';

export const getBranches = (): Branch[] => {
    try {
        const stored = localStorage.getItem(GLOBAL_BRANCHES_KEY);
        if (stored) return JSON.parse(stored);
    } catch (e) {}
    
    // Default branch
    const defaultBranch: Branch = {
        id: 'main',
        name: 'الفرع الرئيسي',
        createdAt: new Date().toISOString()
    };
    saveBranches([defaultBranch]);
    return [defaultBranch];
};

export const saveBranches = (branches: Branch[]) => {
    localStorage.setItem(GLOBAL_BRANCHES_KEY, JSON.stringify(branches));
};

export const getCurrentBranchId = (): string => {
    try {
        const stored = localStorage.getItem(CURRENT_BRANCH_KEY);
        if (stored) return stored;
    } catch (e) {}
    
    const branches = getBranches();
    if (branches.length > 0) {
        setCurrentBranchId(branches[0].id);
        return branches[0].id;
    }
    return 'main';
};

export const setCurrentBranchId = (id: string) => {
    localStorage.setItem(CURRENT_BRANCH_KEY, id);
};

export const addBranch = (name: string): Branch => {
    const branches = getBranches();
    const currentBranchId = getCurrentBranchId();
    const currentDbKey = getDbKeyForBranch(currentBranchId);
    
    const newBranchId = `branch-${Date.now()}`;
    const newBranch: Branch = {
        id: newBranchId,
        name,
        createdAt: new Date().toISOString()
    };
    
    // Copy settings from current branch to new branch if they exist
    try {
        const currentDb = localStorage.getItem(currentDbKey);
        if (currentDb) {
            const data = JSON.parse(currentDb);
            const newDb = {
                ...data,
                // We keep settings, but clear transactional data for a fresh start
                products: [],
                customers: [{ id: 'cust-1', name: 'عميل نقدي', phone: '000', debt: 0, points: 0, tier: 'Regular', creditLimit: 0 }],
                sales: [],
                purchases: [],
                suppliers: [],
                partners: [],
                partnerTransactions: [],
                shippingCompanies: [],
                shippingOperations: [],
                activityLogs: [],
                installments: [],
                salesReturns: [],
                purchaseReturns: [],
                transactions: [],
                customerTransactions: [],
                shifts: [],
                notifications: [],
                stockTransfers: [],
                journalEntries: [],
                feedback: []
            };
            localStorage.setItem(getDbKeyForBranch(newBranchId), JSON.stringify(newDb));
        }
    } catch (e) {
        console.error("Failed to copy settings to new branch", e);
    }
    
    branches.push(newBranch);
    saveBranches(branches);
    return newBranch;
};

export const deleteBranch = (id: string) => {
    let branches = getBranches();
    if (branches.length <= 1) throw new Error("Cannot delete the only remaining branch");
    
    branches = branches.filter(b => b.id !== id);
    saveBranches(branches);
    
    // If we deleted the current branch, switch to the first available
    if (getCurrentBranchId() === id) {
        setCurrentBranchId(branches[0].id);
    }
    
    // Cleanup local storage for this branch
    const branchDbKey = getDbKeyForBranch(id);
    localStorage.removeItem(branchDbKey);
    localStorage.removeItem(`tp_license_key_${id}`);
    localStorage.removeItem(`tp_license_type_${id}`);
    localStorage.removeItem(`tp_free_activation_${id}`);
};

export const getDbKeyForBranch = (branchId: string): string => {
    if (branchId === 'main') return 'techno_power_ultra_db_v5';
    return `techno_power_ultra_db_v5_${branchId}`;
};

export const getCurrentDbKey = (): string => {
    const currentBranchId = getCurrentBranchId();
    return getDbKeyForBranch(currentBranchId);
};
