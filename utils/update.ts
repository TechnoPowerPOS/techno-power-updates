
import type { UpdatePackage } from '../types';
import { api } from '../services/mockApi';

export const parseUpdateFile = (file: File): Promise<UpdatePackage> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const data = JSON.parse(text);
                
                if (!data.version || !data.changes) {
                    reject(new Error("تنسيق ملف التحديث غير متوافق."));
                    return;
                }
                
                resolve(data as UpdatePackage);
            } catch (err) {
                reject(new Error("فشل في قراءة ملف JSON."));
            }
        };
        reader.onerror = () => reject(new Error("حدث خطأ في القراءة."));
        reader.readAsText(file);
    });
};

export const applySystemUpdate = async (updatePkg: UpdatePackage): Promise<boolean> => {
    try {
        // نرسل الحزمة بالكامل للـ API لكي يتمكن من قراءة الـ migrations والـ hotfixes
        await api.updateSystemVersion(updatePkg.version, updatePkg);
        return true;
    } catch (e) {
        console.error("Update failed", e);
        return false;
    }
};

/**
 * دالة لإنشاء ملف تحديث حقيقي للاختبار
 */
export const createSampleUpdateFile = () => {
    const data = {
        version: "1.19.0",
        buildDate: new Date().toISOString(),
        changes: [
            "إصلاح شامل لنظام الأرصدة",
            "إضافة ميزة العلامة التجارية للمنتجات",
            "تحسين سرعة التقارير"
        ],
        hotfixes: {
            patchVersion: "42",
            securityLevel: "HIGH"
        },
        migrations: [
            { type: 'ADD_FIELD', target: 'products', field: 'brand', defaultValue: 'Generic' },
            { type: 'FIX_BALANCES' }
        ]
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `techno_update_v1_19_0.json`;
    a.click();
};
