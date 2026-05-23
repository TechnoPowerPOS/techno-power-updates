
import { 
    doc, 
    getDoc, 
    updateDoc, 
    collection, 
    getDocs, 
    setDoc, 
    query, 
    where,
    serverTimestamp,
    getDocFromServer,
    orderBy,
    deleteDoc,
    runTransaction
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { signInAnonymously } from 'firebase/auth';
import { handleFirestoreError, OperationType } from './firestoreErrorHandler';
import { LicenseInfo, UserIdentity, LicenseType } from '../types';

import { getCurrentBranchId } from './branchService';

import { secureStorage } from '../utils/secureStorage';

const STORAGE_KEY = 'tp_license_key';
const TYPE_KEY = 'tp_license_type';
const DEVICE_ID_KEY = 'tp_device_id';
const IDENTITY_KEY = 'tp_user_identity';

const getBranchKey = (key: string) => {
    const branchId = getCurrentBranchId();
    if (branchId === 'main') return key;
    return `${key}_${branchId}`;
};

export const getDeviceId = (): string => {
    let devId = localStorage.getItem(DEVICE_ID_KEY);
    if (!devId) {
        devId = 'dev-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        localStorage.setItem(DEVICE_ID_KEY, devId);
    }
    return devId;
};

import { getPlanLimits } from '../utils/planPermissions';

const calculateExpiry = (type: string, fromDate: Date = new Date()): Date => {
    const d = new Date(fromDate);
    const t = type.toLowerCase();
    
    if (t.includes('year') || t === 'yearly') {
        d.setFullYear(d.getFullYear() + 1);
    } else if (t.includes('trial')) {
        const trialDays = getPlanLimits('Trial').trialDays || 3;
        d.setDate(d.getDate() + trialDays);
    } else if (t.includes('semi')) {
        d.setMonth(d.getMonth() + 6);
    } else if (t === 'lifetime') {
        d.setFullYear(d.getFullYear() + 100);
    } else {
        // default monthly
        d.setMonth(d.getMonth() + 1);
    }
    return d;
};

export const activateTrial = async (): Promise<{ success: boolean; message: string }> => {
    // 1. Prevent checking out trial if currently on a paid active plan
    const currentStatus = await checkLicenseStatus();
    if (currentStatus.active && currentStatus.type && !['Free', 'Trial'].includes(currentStatus.type)) {
         return { success: false, message: 'عذراً، لا يمكن تفعيل خطة تجريبية لمن لديه اشتراك مدفوع فعال.' };
    }

    const deviceId = getDeviceId();
    const identity = getUserIdentity();
    const trialRef = doc(db, 'trials', deviceId);
    
    try {
        const snap = await getDoc(trialRef);
        // Check if trial already used on this device
        if (snap.exists()) return { success: false, message: 'عذراً، لقد استخدمت الفترة التجريبية لهذا الجهاز مسبقاً.' };

        // Check if trial already used by this user identity
        if (identity?.id) {
            const q = query(collection(db, 'trials'), where('customerId', '==', identity.id));
            const existingTrials = await getDocs(q);
            if (!existingTrials.empty) {
                return { success: false, message: 'عذراً، لقد استخدمت الفترة التجريبية لهذا الحساب مسبقاً.' };
            }
        }

        const trialDays = getPlanLimits('Trial').trialDays || 3;
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + trialDays);

        await setDoc(trialRef, {
            deviceId,
            customerId: identity?.id || null, // save customerId to prevent multi-device trial abuse by same user
            usedAt: serverTimestamp(),
            expiresAt: expiry.toISOString()
        });

        localStorage.setItem(getBranchKey(STORAGE_KEY), 'TRIAL-PLAN-' + deviceId);
        secureStorage.setItem(getBranchKey(STORAGE_KEY), 'TRIAL-PLAN-' + deviceId);
        secureStorage.setItem(getBranchKey(TYPE_KEY), 'Trial'); // Make sure we also update TYPE_KEY securely
        return { success: true, message: `تم تفعيل التجربة المجانية لمدة ${trialDays} أيام بنجاح.` };
    } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `trials/${deviceId}`);
        return { success: false, message: 'فشل تفعيل التجربة.' };
    }
};

export const syncDeviceMetadata = async (): Promise<void> => {
    try {
        const deviceId = getDeviceId();
        let ip = 'unknown';
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            ip = data.ip || 'unknown';
        } catch (e) {
            console.warn("Could not fetch IP for sync", e);
        }

        const osInfo = navigator.userAgent;
        const deviceRef = doc(db, 'devices', deviceId);
        
        const identity = getUserIdentity();
        
        await setDoc(deviceRef, {
            deviceId,
            ip,
            lastSeen: new Date().toISOString(),
            osInfo,
            customerId: identity?.id || null,
            isBlocked: false
        }, { merge: true });
    } catch (e) {
        console.error("Failed to sync device metadata", e);
    }
};

export const logCustomerActivity = async (customerId: string, action: string, details: string) => {
    try {
        await setDoc(doc(collection(db, 'customers', customerId, 'history')), {
            timestamp: new Date().toISOString(),
            action,
            details,
            actor: 'system'
        });
    } catch (e) {
        console.error("Failed to log activity:", e);
    }
};

export const activateLicense = async (key: string): Promise<{ success: boolean; message: string; type?: string; customerId?: string }> => {
    const deviceId = getDeviceId();
    const cleanKey = key.trim().toUpperCase();
    const docRef = doc(db, 'licenses', cleanKey);
    
    try {
        const snap = await getDoc(docRef);
        if (!snap.exists()) return { success: false, message: 'مفتاح الترخيص غير موجود.' };

        const data = snap.data() as any;
        if (data.status === 'blocked') return { success: false, message: 'هذا الترخيص تم حظره.' };
        
        const maxDevices = data.maxDevices || 1;
        let deviceIds: string[] = data.deviceIds || [];
        if (data.deviceId && !deviceIds.includes(data.deviceId)) {
            deviceIds.push(data.deviceId);
        }

        if (!deviceIds.includes(deviceId)) {
            if (deviceIds.length >= maxDevices) {
                return { success: false, message: `هذا الترخيص استنفد الحد الأقصى للأجهزة المسموح بها (${maxDevices}).` };
            }
            deviceIds.push(deviceId);
        }

        let expiry = data.expiresAt;
        if (!expiry) {
            // Start expiry on first activation
            expiry = calculateExpiry(data.type, new Date()).toISOString();
        }

        const identity = getUserIdentity();

        await updateDoc(docRef, {
            deviceId: deviceId, // Keep for backward compatibility with older devices/hooks, though it might overwrite if another device activates
            deviceIds: deviceIds,
            customerId: identity?.id || null,
            status: 'active',
            activatedAt: data.activatedAt ? data.activatedAt : serverTimestamp(),
            expiresAt: expiry
        });

        if (identity?.id) {
            await logCustomerActivity(identity.id, 'تفعيل ترخيص', `تم تفعيل المفتاح: ${cleanKey} (نوع: ${data.type})`);
        }

        secureStorage.setItem(getBranchKey(STORAGE_KEY), cleanKey);
        secureStorage.setItem(getBranchKey(TYPE_KEY), data.type);
        localStorage.setItem(getBranchKey(STORAGE_KEY), cleanKey);
        localStorage.setItem(getBranchKey(TYPE_KEY), data.type);
        localStorage.setItem('tp_last_verified_online', new Date().getTime().toString());
        
        return { success: true, message: 'تم التفعيل بنجاح.', type: data.type, customerId: data.customerId || identity?.id };
    } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `licenses/${cleanKey}`);
        return { success: false, message: 'فشل التفعيل.' };
    }
};

const attemptAutoRepair = async (rawKey: string, deviceId: string, storageKey: string): Promise<string | null | 'tampered'> => {
    try {
        const snap = await getDocFromServer(doc(db, 'licenses', rawKey));
        if (snap.exists()) {
            const data = snap.data() as any;
            const devIds = data.deviceIds || [];
            if (data.status === 'active' && (devIds.includes(deviceId) || data.deviceId === deviceId)) {
                secureStorage.setItem(storageKey, rawKey);
                secureStorage.setItem(storageKey.replace(STORAGE_KEY, TYPE_KEY), data.type);
                return rawKey;
            }
        }
        return 'tampered';
    } catch (e) {
        return 'network_error';
    }
};

export const checkLicenseStatus = async (): Promise<{ active: boolean; status: string; type?: LicenseType; expiresAt?: string; activatedAt?: string; customerId?: string }> => {
    const rawKey = localStorage.getItem(getBranchKey(STORAGE_KEY));
    let key = secureStorage.getItem<string>(getBranchKey(STORAGE_KEY));
    let cachedType = secureStorage.getItem<LicenseType>(getBranchKey(TYPE_KEY)) || localStorage.getItem(getBranchKey(TYPE_KEY)) as LicenseType;
    const deviceId = getDeviceId();

    // Check for tampering: if rawKey exists but secureStorage.getItem returned null
    if (rawKey && !key && rawKey !== 'FREE-PLAN-ACTIVE' && !rawKey.startsWith('TRIAL-PLAN-')) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            key = rawKey; // Fallback to rawKey offline
        } else {
            const repairResult = await Promise.race([
                attemptAutoRepair(rawKey, deviceId, getBranchKey(STORAGE_KEY)),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Auto Repair Timeout')), 8000))
            ]) as any;
            
            if (repairResult === 'network_error' || repairResult instanceof Error) {
                 // Temporary fail-open for network errors so we don't lock offline users
                 key = rawKey; 
            } else if (repairResult === 'tampered') {
                 return { active: false, status: 'tampered' };
            } else {
                 key = repairResult;
            }
        }
    }

    // Auto-fix localStorage if it is stuck on Free Plan but secureStorage has a real key
    if (key && key !== 'FREE-PLAN-ACTIVE' && rawKey === 'FREE-PLAN-ACTIVE') {
        localStorage.setItem(getBranchKey(STORAGE_KEY), key);
    }

    // Fallback to main branch license if current branch has none
    if (!key && getCurrentBranchId() !== 'main') {
        const rawMainKey = localStorage.getItem(STORAGE_KEY);
        key = secureStorage.getItem<string>(STORAGE_KEY);
        cachedType = secureStorage.getItem<LicenseType>(TYPE_KEY) || localStorage.getItem(TYPE_KEY) as LicenseType;
        
        if (rawMainKey && !key && rawMainKey !== 'FREE-PLAN-ACTIVE' && !rawMainKey.startsWith('TRIAL-PLAN-')) {
            const repairResult = await Promise.race([
                attemptAutoRepair(rawMainKey, deviceId, STORAGE_KEY),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Auto Repair Timeout')), 8000))
            ]) as any;
            if (repairResult === 'network_error' || repairResult instanceof Error) {
                key = rawMainKey;
            } else if (repairResult === 'tampered') {
                return { active: false, status: 'tampered' };
            } else {
                key = repairResult;
            }
        }
    }

    if (!key && !rawKey) return { active: false, status: 'no_key' };
    
    // Allow rawKey to be used for Free and Trial plans even if secureStorage has no key.
    const effectiveKey = key || rawKey;

    if (effectiveKey === 'FREE-PLAN-ACTIVE') {
        let freeAct = localStorage.getItem(getBranchKey('tp_free_activation'));
        if (!freeAct && getCurrentBranchId() !== 'main') {
            freeAct = localStorage.getItem('tp_free_activation');
        }
        if (!freeAct) {
            freeAct = new Date().toISOString();
            localStorage.setItem(getBranchKey('tp_free_activation'), freeAct);
        }
        return { active: true, status: 'active', type: 'Free', activatedAt: freeAct };
    }
    
    // Trial check
    if (effectiveKey?.startsWith('TRIAL-PLAN-')) {
        try {
            const trialSnap = await Promise.race([
                getDoc(doc(db, 'trials', deviceId)),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Trial Fetch Timeout')), 8000))
            ]) as any;
            if (!trialSnap.exists()) return { active: false, status: 'invalid' };
            const trialData = trialSnap.data() as any;
            if (new Date(trialData.expiresAt) < new Date()) {
                // Automatically convert to Free Plan upon expiration
                const branchId = getCurrentBranchId();
                const branchKey = branchId === 'main' ? 'tp_license_key' : `tp_license_key_${branchId}`;
                localStorage.setItem(branchKey, 'FREE-PLAN-ACTIVE');
                secureStorage.removeItem(getBranchKey(TYPE_KEY));
                let freeAct = localStorage.getItem(getBranchKey('tp_free_activation'));
                if (!freeAct) {
                    freeAct = new Date().toISOString();
                    localStorage.setItem(getBranchKey('tp_free_activation'), freeAct);
                }
                return { active: true, status: 'active', type: 'Free', activatedAt: freeAct };
            }
            localStorage.setItem(getBranchKey(TYPE_KEY), 'Trial');
            secureStorage.setItem(getBranchKey(TYPE_KEY), 'Trial');
            return { active: true, status: 'active', type: 'Trial', expiresAt: trialData.expiresAt, activatedAt: trialData.usedAt?.toDate ? trialData.usedAt.toDate().toISOString() : new Date().toISOString() };
        } catch (e) {
            console.warn('Trial fetch error/timeout:', e);
            return { active: true, status: 'cached', type: 'Trial' };
        }
    }

    try {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            throw new Error('Offline Navigation');
        }

        const snap = await Promise.race([
            getDoc(doc(db, 'licenses', effectiveKey!)),
            new Promise((_, reject) => setTimeout(() => reject(new Error('License Check Timeout')), 10000))
        ]) as any;
        let data: any = null;
        let deviceIds: string[] = [];
        
        if (snap.exists()) {
            data = snap.data();
            deviceIds = data.deviceIds || [];
            if (data.deviceId && !deviceIds.includes(data.deviceId)) {
                deviceIds.push(data.deviceId);
            }
        }

        if (!snap.exists() || data.status !== 'active' || !deviceIds.includes(deviceId)) {
            // Attempt to automatically find a new active license for this device
            try {
                const q1 = query(collection(db, 'licenses'), where('deviceId', '==', deviceId));
                const snap1 = await Promise.race([
                    getDocs(q1),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('License Query Timeout')), 8000))
                ]) as any;
                let activeLicenseDoc = snap1.docs.find((d: any) => (d.data() as any).status === 'active');
                
                if (!activeLicenseDoc) {
                    const q2 = query(collection(db, 'licenses'), where('deviceIds', 'array-contains', deviceId));
                    const snap2 = await Promise.race([
                        getDocs(q2),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('License Query Timeout')), 8000))
                    ]) as any;
                    activeLicenseDoc = snap2.docs.find((d: any) => (d.data() as any).status === 'active');
                }

                if (activeLicenseDoc) {
                    const newData = activeLicenseDoc.data() as any;
                    if (newData.expiresAt && new Date(newData.expiresAt) < new Date()) {
                        return { active: false, status: 'expired', type: newData.type };
                    }
                    secureStorage.setItem(getBranchKey(STORAGE_KEY), activeLicenseDoc.id);
                    localStorage.setItem(getBranchKey(STORAGE_KEY), activeLicenseDoc.id);
                    if (newData.type) {
                        secureStorage.setItem(getBranchKey(TYPE_KEY), newData.type);
                        localStorage.setItem(getBranchKey(TYPE_KEY), newData.type);
                    }
                    localStorage.setItem('tp_last_verified_online', new Date().getTime().toString());
                    return { active: true, status: 'active', type: newData.type, expiresAt: newData.expiresAt, activatedAt: newData.activatedAt || newData.createdAt, customerId: newData.customerId };
                }
            } catch (autoFetchErr) {
                console.warn('Auto-fetch license error/timeout:', autoFetchErr);
            }
            return { active: false, status: snap.exists() ? 'mismatch' : 'invalid' };
        }

        if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
            return { active: false, status: 'expired', type: data.type };
        }

        if (data.type) {
            localStorage.setItem(getBranchKey(TYPE_KEY), data.type);
            secureStorage.setItem(getBranchKey(TYPE_KEY), data.type);
        }
        localStorage.setItem('tp_last_verified_online', new Date().getTime().toString());
        return { active: true, status: 'active', type: data.type, expiresAt: data.expiresAt, activatedAt: data.activatedAt || data.createdAt, customerId: data.customerId };
    } catch (e) {
        console.warn('License check error/timeout:', e);
        
        const lastVerifiedStr = localStorage.getItem('tp_last_verified_online');
        const now = new Date().getTime();
        const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;
        
        if (effectiveKey && effectiveKey !== 'FREE-PLAN-ACTIVE' && !effectiveKey.startsWith('TRIAL-PLAN-')) {
            if (!lastVerifiedStr || now - parseInt(lastVerifiedStr, 10) > fifteenDaysMs) {
                return { active: false, status: 'offline_blocked', message: 'يرجى الاتصال بالإنترنت لتأكيد الترخيص. لم يتم الاتصال لأكثر من 15 يوماً.' };
            }
        }

        // If it's a real key but we don't have the type cached, default to 'Yearly' instead of penalizing them with 'Free' offline
        const offlineType = cachedType || (effectiveKey && effectiveKey !== 'FREE-PLAN-ACTIVE' && !effectiveKey.startsWith('TRIAL-PLAN-') ? 'Yearly' : undefined);
        return { active: true, status: 'cached', type: offlineType || undefined };
    }
};

export const getAllLicenses = async (): Promise<LicenseInfo[]> => {
    try {
        const q = query(collection(db, 'licenses'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ ...d.data(), licenseKey: d.id } as LicenseInfo));
    } catch (e) {
        handleFirestoreError(e, OperationType.GET, 'licenses');
        return [];
    }
};

export const createLicenseKey = async (key: string, type: string, deviceId: string | null = null, maxDevices: number = 1, customerName?: string, customerPhone?: string): Promise<void> => {
    const now = new Date();
    
    // Ensure invalid deviceId is treated as null
    const safeDeviceId = (deviceId && deviceId.trim() !== '') ? deviceId.trim() : null;
    const expiry = safeDeviceId ? calculateExpiry(type, now) : null;
    const keyPath = key.trim().toUpperCase();
    const docRef = doc(db, 'licenses', keyPath);
    
    try {
        await runTransaction(db, async (transaction) => {
            const snap = await transaction.get(docRef);
            if (snap.exists()) {
                throw new Error('مفتاح الترخيص موجود مسبقاً، يرجى اختيار مفتاح آخر أو تعديل الترخيص الموجود.');
            }

            transaction.set(docRef, {
                licenseKey: keyPath,
                type,
                deviceId: safeDeviceId,
                status: safeDeviceId ? 'active' : 'pending',
                createdAt: now.toISOString(),
                activatedAt: safeDeviceId ? now.toISOString() : null,
                expiresAt: expiry ? expiry.toISOString() : null,
                maxDevices,
                customerName: customerName || null,
                customerPhone: customerPhone || null
            });
        });
    } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `licenses/${keyPath}`);
        throw e; // Rethrow to let the UI know
    }
};

export const resetLicenseDevice = async (key: string): Promise<void> => {
    const path = `licenses/${key}`;
    try {
        await updateDoc(doc(db, 'licenses', key), { deviceId: null, deviceIds: [], status: 'pending', activatedAt: null, expiresAt: null });
    } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, path);
    }
};

export const updateLicenseStatus = async (key: string, status: string): Promise<void> => {
    const path = `licenses/${key}`;
    try {
        await updateDoc(doc(db, 'licenses', key), { status });
    } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, path);
    }
};

export const updateLicenseMaxDevices = async (key: string, maxDevices: number): Promise<void> => {
    const path = `licenses/${key}`;
    try {
        await updateDoc(doc(db, 'licenses', key), { maxDevices });
    } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, path);
    }
};

export const deleteLicenseKey = async (key: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, 'licenses', key));
    } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `licenses/${key}`);
    }
};

export const renewLicense = async (key: string): Promise<void> => {
    const path = `licenses/${key}`;
    try {
        const snap = await getDoc(doc(db, 'licenses', key));
        if (!snap.exists()) throw new Error('الرخصة غير موجودة');
        
        const data = snap.data();
        const type = data.type || 'Monthly';
        
        const now = new Date();
        // Start from today if expired, otherwise add to current expiry
        let baseDate = now;
        if (data.expiresAt) {
            const exp = new Date(data.expiresAt);
            if (exp > now) {
                baseDate = exp;
            }
        }
        
        const expiry = calculateExpiry(type, baseDate);
        
        await updateDoc(doc(db, 'licenses', key), {
            expiresAt: expiry.toISOString(),
            status: 'active'
        });

        if (data.customerId) {
            await logCustomerActivity(data.customerId, 'تجديد ترخيص', `تم تجديد المفتاح: ${key} (تاريخ جديد: ${expiry.toLocaleDateString('ar-EG')})`);
        }
    } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, path);
    }
};

// Identity
export const saveUserIdentity = async (identity: any): Promise<UserIdentity> => {
    // Ensure we have a firebase auth session for security rules
    if (!auth.currentUser) {
        try {
            await signInAnonymously(auth);
        } catch (e) {
            console.warn("Failed to sign in anonymously before saving identity", e);
        }
    }

    const id = 'UID-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    const deviceId = getDeviceId();
    const authUid = auth.currentUser?.uid || null;
    const user: UserIdentity = { ...identity, id, registeredAt: new Date().toISOString(), deviceId, authUid };
    const path = `customers/${id}`;
    try {
        await setDoc(doc(db, 'customers', id), user);
    } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, path);
    }
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(user));
    return user;
};

export const updateUserIdentity = async (updates: Partial<UserIdentity>): Promise<UserIdentity | null> => {
    // Ensure we have a firebase auth session for security rules
    if (!auth.currentUser) {
        try {
            await signInAnonymously(auth);
        } catch (e) {
            console.warn("Failed to sign in anonymously before updating identity", e);
        }
    }

    let user = getUserIdentity();
    if (!user || !user.id) return null;
    const deviceId = getDeviceId();
    const authUid = auth.currentUser?.uid || null;
    user = { ...user, ...updates, deviceId, authUid };
    const path = `customers/${user.id}`;
    try {
        await setDoc(doc(db, 'customers', user.id), { ...updates, deviceId, authUid }, { merge: true });
    } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, path);
    }
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(user));
    return user;
};

export const getUserIdentity = (): UserIdentity | null => {
    const data = localStorage.getItem(IDENTITY_KEY);
    return data ? JSON.parse(data) : null;
};

export const trackReferral = async (referralCode: string, licenseType: string, deviceId: string): Promise<void> => {
    try {
        const q = query(collection(db, 'affiliates'), where('referralCode', '==', referralCode));
        const snap = await getDocs(q);
        if (!snap.empty) {
            const affiliateId = snap.docs[0].id;
            const newReferralId = doc(collection(db, 'affiliate_referrals')).id;
            await setDoc(doc(db, 'affiliate_referrals', newReferralId), {
                affiliateId,
                referralCode,
                licenseType,
                deviceId,
                status: 'unpaid',
                usedAt: serverTimestamp()
            });
        }
    } catch (e) {
        console.error("Failed to track referral:", e);
    }
};
