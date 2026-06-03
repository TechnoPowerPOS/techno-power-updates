
import { useEffect, useState } from 'react';
import { checkDeviceStatus } from '../services/deviceService';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getDeviceId } from '../services/licenseService';
import { handleFirestoreError, OperationType } from '../services/firestoreErrorHandler';

const LAST_VERIFIED_KEY = 'tp_last_verified_at';

export const useAppGuard = () => {
    const [isBlocked, setIsBlocked] = useState(false);
    const [blockMessage, setBlockMessage] = useState('');
    const [adminMessage, setAdminMessage] = useState<{ text: string, timestamp: number } | null>(null);
    const [needsDataCompletion, setNeedsDataCompletion] = useState(false);

    useEffect(() => {
        const verifyDevice = async () => {
            const status = await checkDeviceStatus();
            if (status.blocked) {
                setIsBlocked(true);
                setBlockMessage(status.message || 'تم إيقاف النظام.');
            } else {
                setIsBlocked(false);
            }
        };

        verifyDevice();
        // Check periodically if the app stays open for a long time
        const interval = setInterval(verifyDevice, 1000 * 60 * 60); // Every hour
        
        // Listen for online events
        window.addEventListener('online', verifyDevice);

        return () => {
            clearInterval(interval);
            window.removeEventListener('online', verifyDevice);
        };
    }, []);

    useEffect(() => {
        const deviceId = getDeviceId();
        if (!deviceId) return;

        const path = `devices/${deviceId}`;
        const unsubscribe = onSnapshot(doc(db, 'devices', deviceId), (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                if (data.isBlocked !== undefined) {
                    setIsBlocked(data.isBlocked);
                    if (data.isBlocked) {
                        setBlockMessage(data.blockMessage || 'تم حظر هذا الجهاز من قبل الإدارة. يرجى مراجعة الدعم الفني.');
                    } else {
                        setBlockMessage('');
                    }
                }
                
                if (data.needsDataCompletion !== undefined) {
                    setNeedsDataCompletion(data.needsDataCompletion);
                }
                
                if (data.adminMessage) {
                    setAdminMessage({
                        text: data.adminMessage,
                        timestamp: data.adminMessageTimestamp || Date.now()
                    });
                } else {
                    setAdminMessage(null);
                }
            }
        }, (error) => {
            handleFirestoreError(error, OperationType.GET, path);
        });

        return () => unsubscribe();
    }, []);

    const dismissAdminMessage = async () => {
        const deviceId = getDeviceId();
        const path = `devices/${deviceId}`;
        if (deviceId) {
            try {
                await updateDoc(doc(db, 'devices', deviceId), {
                    adminMessage: null,
                    adminMessageTimestamp: null
                });
            } catch (e) {
                handleFirestoreError(e, OperationType.UPDATE, path);
            }
        }
        setAdminMessage(null);
    };

    const dismissDataCompletion = async () => {
        const deviceId = getDeviceId();
        const path = `devices/${deviceId}`;
        if (deviceId) {
            try {
                await updateDoc(doc(db, 'devices', deviceId), {
                    needsDataCompletion: false
                });
            } catch (e) {
                handleFirestoreError(e, OperationType.UPDATE, path);
            }
        }
        setNeedsDataCompletion(false);
    };

    useEffect(() => {
        // حماية الذاكرة (Memory Protection)
        const originalSetItem = localStorage.setItem;
        localStorage.setItem = function(key, value) {
            const isLicenseKey = key === 'tp_license_key' || key.startsWith('tp_license_key_');
            if (key.includes('license') && typeof value === 'string' && !value.includes('_sys_') && !isLicenseKey) {
                // منع التلاعب الخارجي بالترخيص
                return;
            }
            try {
                originalSetItem.apply(localStorage, [key, value]);
            } catch (e) {
                console.error("Local Storage Error", e);
            }
        };

        // تعطيل الاختصارات الحساسة (F12, Ctrl+U)
        const disableKeys = (e: KeyboardEvent) => {
            if (
                e.keyCode === 123 || // F12
                (e.ctrlKey && e.shiftKey && e.keyCode === 73) || // Ctrl+Shift+I
                (e.ctrlKey && e.shiftKey && e.keyCode === 74) || // Ctrl+Shift+J
                (e.ctrlKey && e.keyCode === 85) // Ctrl+U (View Source)
            ) {
                e.preventDefault();
                return false;
            }
        };

        window.addEventListener('keydown', disableKeys);
        
        return () => {
            window.removeEventListener('keydown', disableKeys);
        };
    }, []);

    return { isBlocked, blockMessage, adminMessage, dismissAdminMessage, needsDataCompletion, dismissDataCompletion };
};
