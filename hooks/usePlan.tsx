
import { useLicense } from './useLicense';
import { getPlanLimits, PlanLimits } from '../utils/planPermissions';
import { useMemo } from 'react';

export function usePlan() {
    const { licenseType } = useLicense();
    
    const limits = useMemo(() => {
        return getPlanLimits(licenseType);
    }, [licenseType]);

    const canUse = (feature: keyof PlanLimits) => {
        const val = limits[feature];
        return !!val;
    };

    return {
        limits,
        canUse,
        licenseType
    };
}
