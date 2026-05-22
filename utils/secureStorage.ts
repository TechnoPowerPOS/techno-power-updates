
// Secure storage implementation with Unicode support for Arabic characters
const MASTER_KEY = 'TechnoPowerPOS_Ultimate_Sec_2025';

const getDeviceFingerprint = (): string => {
    if (typeof window === 'undefined') return 'ENV_VOID';
    const nav = window.navigator;
    // Use a stable fingerprint that doesn't change on window resize or monitor swap
    const hardwareInfo = `${nav.hardwareConcurrency || 4}`;
    const platformStr = nav.platform || nav.userAgent || 'stable_env';
    return [hardwareInfo, platformStr].join('|');
};

const getDynamicKey = (): string => {
    return MASTER_KEY + getDeviceFingerprint().split('').reverse().join('');
};

// Helper for Unicode-safe binary XOR
const xorProcess = (str: string): string => {
    const key = getDynamicKey();
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
const xorReverse = (str: string): string => {
    const key = getDynamicKey();
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

const generateHMAC = (str: string): string => {
    let hash = 0;
    const key = getDynamicKey();
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
                _h: generateHMAC(stringValue)
            };
            
            // xorProcess already handles Unicode via encodeURIComponent
            // But we still need Base64 to store it in localStorage safely
            // Since xorProcess output can have arbitrary char codes, we use a simple btoa with escaping
            const encrypted = btoa(unescape(encodeURIComponent(xorProcess(JSON.stringify(payload)))));
            localStorage.setItem(key, encrypted);
        } catch (e) {
            console.error('SecureStorage write error:', e);
        }
    },

    getItem: <T>(key: string): T | null => {
        const encrypted = localStorage.getItem(key);
        if (!encrypted) return null;

        try {
            const decrypted = xorReverse(decodeURIComponent(escape(atob(encrypted))));
            const payload = JSON.parse(decrypted);

            if (!payload || !payload._d || !payload._h) return null;

            if (generateHMAC(payload._d) !== payload._h) {
                console.error("TAMPER DETECTED at key:", key);
                return null;
            }

            return JSON.parse(payload._d);
        } catch (e) {
            return null;
        }
    },

    removeItem: (key: string): void => {
        localStorage.removeItem(key);
    },

    clear: (): void => {
        localStorage.clear();
    }
};
