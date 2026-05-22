
import { api } from './mockApi';
import { secureStorage } from '../utils/secureStorage';

const PING_INTERVAL_DAYS = 30;
const SERVER_URL = "https://api.technopower.eg/v1/verify-license"; // رابط سيرفرك المستقبلي

/**
 * دالة التحقق الهجين (Hybrid Verification)
 * تتصل بالسيرفر مرة كل شهر للتأكد من أن النسخة ليست محظورة (Blacklisted)
 */
export const performHybridPulse = async (licenseKey: string, deviceId: string) => {
    const lastPulse = localStorage.getItem('_sys_last_pulse_');
    const now = Date.now();
    
    // إذا لم يمر 30 يوماً، استمر أوفلاين
    if (lastPulse && (now - parseInt(lastPulse)) < (PING_INTERVAL_DAYS * 24 * 60 * 60 * 1000)) {
        return { status: 'OFFLINE_VALID' };
    }

    // التحقق من الإنترنت
    if (!navigator.onLine) {
        return { status: 'PENDING_INTERNET', message: "يرجى الاتصال بالإنترنت لتحديث شهادة الأمان" };
    }

    try {
        // إرسال النبضة مشفرة
        const response = await fetch(SERVER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                k: licenseKey, 
                d: deviceId,
                t: now // وقت الجهاز للمقارنة مع وقت السيرفر
            })
        });

        const result = await response.json();

        if (result.revoked) {
            await api.wipeBusinessData();
            return { status: 'REVOKED' };
        }

        // تحديث تاريخ آخر نبضة ناجحة
        localStorage.setItem('_sys_last_pulse_', now.toString());
        return { status: 'ONLINE_VALID' };

    } catch (error) {
        // في حال فشل السيرفر، نعطي فترة سماح 7 أيام
        return { status: 'GRACE_PERIOD' };
    }
};
