import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getDeviceId } from './licenseService';
import { handleFirestoreError, OperationType } from './firestoreErrorHandler';

const OFFLINE_GRACE_PERIOD_MS = 15 * 24 * 60 * 60 * 1000; // 15 days
const LAST_ONLINE_CHECK_KEY = 'tp_last_online_check';
const OFFLINE_BLOCK_KEY = 'tp_offline_block';

export interface DeviceInfo {
    deviceId: string;
    ip: string;
    lastSeen: string;
    isBlocked: boolean;
    osInfo: string;
}

export const checkDeviceStatus = async (): Promise<{ blocked: boolean; networkRequired: boolean; message?: string }> => {
    const lastCheck = localStorage.getItem(LAST_ONLINE_CHECK_KEY);
    const isOfflineBlocked = localStorage.getItem(OFFLINE_BLOCK_KEY) === 'true';
    
    // Check 15 days limit
    if (lastCheck) {
        const lastCheckMs = parseInt(lastCheck, 10);
        const timeSinceCheck = Date.now() - lastCheckMs;
        
        // Prevent bypassing the limit by setting the system date backward (1 day tolerance)
        if (Date.now() < lastCheckMs - 24 * 60 * 60 * 1000) {
            localStorage.setItem(OFFLINE_BLOCK_KEY, 'true');
        }

        if (timeSinceCheck > OFFLINE_GRACE_PERIOD_MS) {
            localStorage.setItem(OFFLINE_BLOCK_KEY, 'true');
        }
    } else {
        localStorage.setItem(LAST_ONLINE_CHECK_KEY, Date.now().toString());
    }

    const currentOfflineBlocked = localStorage.getItem(OFFLINE_BLOCK_KEY) === 'true';
    
    if (currentOfflineBlocked) {
        if (!navigator.onLine) {
            return { blocked: true, networkRequired: true, message: 'لقد مر أكثر من ١٥ يوماً دون اتصال بالإنترنت. يرجى الاتصال بالإنترنت للتحقق من سلامة النظام.' };
        }
    }

    if (navigator.onLine) {
        try {
            const deviceId = getDeviceId();
            
            let ip = 'unknown';
            try {
                const response = await fetch('https://api.ipify.org?format=json');
                const data = await response.json();
                ip = data.ip || 'unknown';
            } catch (e) {
                console.warn("Could not fetch IP", e);
            }
            
            const osInfo = navigator.userAgent;

            const deviceRef = doc(db, 'devices', deviceId);
            const path = `devices/${deviceId}`;
            let deviceSnap;
            let firestoreAvailable = true;
            try {
                deviceSnap = await getDoc(deviceRef);
            } catch (e) {
                firestoreAvailable = false;
                handleFirestoreError(e, OperationType.GET, path);
            }
            
            if (firestoreAvailable && deviceSnap) {
                if (deviceSnap.exists()) {
                    const deviceData = deviceSnap.data() as DeviceInfo;
                    if (deviceData.isBlocked) {
                        return { blocked: true, networkRequired: false, message: 'تم حظر هذا الجهاز من قبل الإدارة. يرجى مراجعة الدعم الفني.' };
                    }
                    
                    try {
                        await updateDoc(deviceRef, {
                            ip,
                            lastSeen: new Date().toISOString(),
                            osInfo
                        });
                    } catch (e) {
                        handleFirestoreError(e, OperationType.UPDATE, path);
                    }
                } else {
                    try {
                        await setDoc(deviceRef, {
                            deviceId,
                            ip,
                            lastSeen: new Date().toISOString(),
                            isBlocked: false,
                            osInfo
                        });
                    } catch (e) {
                        handleFirestoreError(e, OperationType.WRITE, path);
                    }
                }
            }

            localStorage.setItem(LAST_ONLINE_CHECK_KEY, Date.now().toString());
            localStorage.setItem(OFFLINE_BLOCK_KEY, 'false');
            
        } catch (error) {
            handleFirestoreError(error, OperationType.GET, 'device_status_check');
            if (currentOfflineBlocked) {
                 return { blocked: true, networkRequired: true, message: 'تعذر التحقق من خوادم النظام. حاول لاحقاً.' };
            }
        }
    }

    return { blocked: false, networkRequired: false };
};
