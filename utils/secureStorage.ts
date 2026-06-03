
// Secure storage implementation with Unicode support for Arabic characters
const MASTER_KEY = 'TechnoPowerPOS_Ultimate_Sec_2025';

const getLegacyDeviceFingerprint = (): string => {
    if (typeof window === 'undefined') return 'ENV_VOID';
    const nav = window.navigator;
    const hardwareInfo = `${nav.hardwareConcurrency || 4}`;
    const platformStr = nav.platform || nav.userAgent || 'stable_env';
    return [hardwareInfo, platformStr].join('|');
};

const getStableDeviceFingerprint = (): string => {
    if (typeof window === 'undefined') return 'ENV_VOID';
    const nav = window.navigator;
    const hardwareInfo = `${nav.hardwareConcurrency || 4}`;
    // Exclude userAgent to survive Electron/Browser updates
    const platformStr = nav.platform || 'stable_env';
    return [hardwareInfo, platformStr].join('|');
};

const getDynamicKey = (legacy = false): string => {
    const fp = legacy ? getLegacyDeviceFingerprint() : getStableDeviceFingerprint();
    return MASTER_KEY + fp.split('').reverse().join('');
};

// Helper for Unicode-safe binary XOR
const xorProcess = (str: string, legacy = false): string => {
    const key = getDynamicKey(legacy);
    let result = '';
    
    // We use encodeURIComponent to get a UTF-8 representation safely first
    // then XOR each character code.
    const utf8Str = encodeURIComponent(str);
    
    for (let i = 0; i < utf8Str.length; i++) {
        result += String.fromCharCode(utf8Str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
};

// Decoder for XOR
const xorReverse = (str: string, legacy = false): string => {
    const key = getDynamicKey(legacy);
    let result = '';
    for (let i = 0; i < str.length; i++) {
        result += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    try {
        return decodeURIComponent(result);
    } catch (e) {
        return '';
    }
};

const generateHMAC = (str: string, legacy = false): string => {
    let hash = 0;
    const key = getDynamicKey(legacy);
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        const k = key.charCodeAt(i % key.length);
        hash = ((hash << 5) - hash) + (char ^ k);
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
};

export const secureStorage = {
    setItem: (key: string, value: any): void => {
        try {
            const stringValue = JSON.stringify(value);
            const payload = {
                _d: stringValue,
                _h: generateHMAC(stringValue, false)
            };
            
            // xorProcess already handles Unicode via encodeURIComponent
            // But we still need Base64 to store it in localStorage safely
            // Since xorProcess output can have arbitrary char codes, we use a simple btoa with escaping
            const encrypted = btoa(unescape(encodeURIComponent(xorProcess(JSON.stringify(payload), false))));
            localStorage.setItem(key, encrypted);
        } catch (e) {
            console.error('SecureStorage write error:', e);
        }
    },

    getItem: <T>(key: string): T | null => {
        const encrypted = localStorage.getItem(key);
        if (!encrypted) return null;

        const tryDecode = (legacy: boolean) => {
            try {
                const decryptedStr = xorReverse(decodeURIComponent(escape(atob(encrypted))), legacy);
                if (!decryptedStr) return null;
                
                const payload = JSON.parse(decryptedStr);
                if (!payload || !payload._d || !payload._h) return null;

                if (generateHMAC(payload._d, legacy) !== payload._h) {
                    return null;
                }

                return JSON.parse(payload._d);
            } catch (e) {
                return null;
            }
        };

        const newResult = tryDecode(false);
        if (newResult !== null) return newResult;

        const legacyResult = tryDecode(true);
        if (legacyResult !== null) {
            // Re-save with new stable key
            setTimeout(() => {
                try { secureStorage.setItem(key, legacyResult); } catch(e){}
            }, 100);
            return legacyResult;
        }

        // Final fallback: Try with a base-only key (no fingerprint) for migration/env changes
        const baseTryDecode = () => {
            try {
                const baseKey = MASTER_KEY; // Fallback to just MASTER_KEY
                const xorRev = (s: string): string => {
                    let r = '';
                    for (let i = 0; i < s.length; i++) {
                        r += String.fromCharCode(s.charCodeAt(i) ^ baseKey.charCodeAt(i % baseKey.length));
                    }
                    try { return decodeURIComponent(r); } catch { return ''; }
                };
                const genH = (s: string): string => {
                    let h = 0;
                    for (let i = 0; i < s.length; i++) {
                        h = ((h << 5) - h) + (s.charCodeAt(i) ^ baseKey.charCodeAt(i % baseKey.length));
                        h = h & h;
                    }
                    return Math.abs(h).toString(36);
                };

                const dec = xorRev(decodeURIComponent(escape(atob(encrypted))));
                if (!dec) return null;
                const p = JSON.parse(dec);
                if (!p || !p._d || !p._h) return null;
                if (genH(p._d) !== p._h) return null;
                return JSON.parse(p._d);
            } catch { return null; }
        };

        const baseResult = baseTryDecode();
        if (baseResult !== null) {
            setTimeout(() => {
                try { secureStorage.setItem(key, baseResult); } catch(e){}
            }, 100);
            return baseResult;
        }

        // Suppress scary console.error for key mismatches as they can be caused by environment changes
        // we handle recovery at the service level (licenseService auto-repair)
        if (key.includes('license')) {
            console.warn("Integrity check pending for key:", key);
        } else {
            console.warn("Storage item bypass/environment change detected at:", key);
        }
        return null;
    },

    removeItem: (key: string): void => {
        localStorage.removeItem(key);
    },

    clear: (): void => {
        localStorage.clear();
    }
};
