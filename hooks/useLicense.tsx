
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { 
    checkLicenseStatus, 
    activateLicense as firebaseActivate, 
    getDeviceId,
    activateTrial as activateTrialService,
    trackReferral,
    syncDeviceMetadata
} from '../services/licenseService';
import { adminToolService } from '../services/adminToolService';
import { setDynamicPlanLimits } from '../utils/planPermissions';
import { getCurrentBranchId } from '../services/branchService';
import { LicenseInfo } from '../types';

interface LicenseContextType {
    isLicensed: boolean;
    isLoading: boolean;
    status: string;
    licenseType: string;
    licenseInfo: LicenseInfo;
    activateLicense: (key: string, referralCode?: string) => Promise<{ success: boolean; message: string }>;
    activateFreePlan: () => Promise<void>;
    activateTrial: () => Promise<{ success: boolean; message: string }>;
    deviceId: string;
    verify: () => Promise<void>;
}

const LicenseContext = createContext<LicenseContextType | undefined>(undefined);

export const LicenseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isLicensed, setIsLicensed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [status, setStatus] = useState('checking');
    const [licenseType, setLicenseType] = useState('Free');
    const [deviceId] = useState(getDeviceId());
    const [licenseInfo, setLicenseInfo] = useState<LicenseInfo>({
        status: 'pending',
        type: 'Free',
        licenseKey: '',
        deviceId: null,
        createdAt: new Date().toISOString()
    });

    const verify = async () => {
        setIsLoading(true);
        try {
            const limits = await adminToolService.getDynamicPlanLimits();
            if (limits) setDynamicPlanLimits(limits);
        } catch (e) {
            console.error("Error fetching dynamic limits", e);
        }

        const res = await checkLicenseStatus();
        syncDeviceMetadata().catch(console.error);
        setIsLicensed(res.active);
        setStatus(res.status);
        
        const type = res.type || 'Free';
        setLicenseType(type);
        setLicenseInfo({
            status: res.active ? 'LICENSED' : 'UNLICENSED' as any,
            type: type as any,
            deviceId: deviceId,
            expiresAt: res.expiresAt,
            activationDate: res.activatedAt || new Date().toISOString(),
            licenseKey: localStorage.getItem(`tp_license_key${getCurrentBranchId() === 'main' ? '' : '_' + getCurrentBranchId()}`) || '',
            customerId: res.customerId
        });
        setIsLoading(false);
    };

    useEffect(() => {
        let fired = false;
        const safetyTimeout = setTimeout(() => {
            if (!fired) {
                console.warn("License check timed out, continuing as cached/free...");
                setIsLoading(false);
            }
        }, 15000); // 15 seconds max for license check

        const doVerify = async () => {
            try {
                await verify();
            } finally {
                fired = true;
                clearTimeout(safetyTimeout);
                setIsLoading(false);
            }
        };
        
        doVerify();
    }, []);

    const handleActivate = async (key: string, referralCode?: string) => {
        const res = await firebaseActivate(key);
        if (res.success) {
            setIsLicensed(true);
            setStatus('active');
            const type = res.type || 'Pro';
            setLicenseType(type);
            setLicenseInfo({
                status: 'LICENSED' as any,
                type: type as any,
                licenseKey: key,
                deviceId: deviceId,
                activationDate: new Date().toISOString(),
                createdAt: new Date().toISOString()
            });

            if (referralCode && referralCode.trim() !== '') {
                try {
                    await trackReferral(referralCode.trim(), type, deviceId);
                } catch(e) {
                    console.error("Referral Error:", e);
                }
            }
        }
        return res;
    };

    const handleActivateTrial = async () => {
        const res = await activateTrialService();
        if (res.success) {
            await verify();
        }
        return res;
    };

    const activateFreePlan = async () => {
        const branchId = getCurrentBranchId();
        const key = branchId === 'main' ? 'tp_license_key' : `tp_license_key_${branchId}`;
        const actKey = branchId === 'main' ? 'tp_free_activation' : `tp_free_activation_${branchId}`;
        
        localStorage.setItem(key, 'FREE-PLAN-ACTIVE');
        let freeAct = localStorage.getItem(actKey);
        if (!freeAct) {
            freeAct = new Date().toISOString();
            localStorage.setItem(actKey, freeAct);
        }
        setIsLicensed(true);
        setStatus('active');
        setLicenseType('Free');
        setLicenseInfo({
            status: 'LICENSED' as any,
            type: 'Free',
            licenseKey: 'FREE-PLAN-ACTIVE',
            deviceId: deviceId,
            activationDate: freeAct,
            createdAt: new Date().toISOString()
        });
    };

    const value = React.useMemo(() => ({ 
        isLicensed, 
        isLoading, 
        status, 
        licenseType,
        licenseInfo,
        activateLicense: handleActivate, 
        activateFreePlan,
        activateTrial: handleActivateTrial,
        deviceId,
        verify
    }), [isLicensed, isLoading, status, licenseType, licenseInfo, deviceId]);

    return (
        <LicenseContext.Provider value={value}>
            {children}
        </LicenseContext.Provider>
    );
};

export const useLicense = () => {
    const context = useContext(LicenseContext);
    if (context === undefined) throw new Error('useLicense must be used within a LicenseProvider');
    return context;
};
