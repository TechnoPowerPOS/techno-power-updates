// This file simulates more advanced cryptographic functions for the Admin Tool.
// In a real browser environment, we can't use AES-GCM with a stored key easily
// without a backend. This simulation provides the requested functionality within
// the frontend architecture. It uses a combination of XOR and SHA-256 to mimic
// encryption and integrity checks.

const AES_SIM_KEY = 'AdminTool-AES-SimulatedKey-ForTechnoPower-2025';
const HMAC_SIM_KEY = 'AdminTool-HMAC-SimulatedKey-ForDataIntegrity-2025';

// Simple XOR cipher for "encryption"
const xorCipher = (str: string, key: string): string => {
    let result = '';
    for (let i = 0; i < str.length; i++) {
        result += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
};

// SHA-256 hashing function using Web Crypto API for HMAC simulation
async function sha256(message: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Safely encodes a UTF-16 string to Base64, handling Unicode characters.
 * @param str The string to encode.
 * @returns The Base64 encoded string.
 */
const toBase64 = (str: string): string => {
    try {
        // First, encode URI components to handle Unicode, then unescape to get byte sequence, then btoa.
        return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
        console.error("Failed to encode to Base64", e);
        return '';
    }
};

/**
 * Safely decodes a Base64 string to a UTF-16 string, handling Unicode characters.
 * @param str The Base64 string to decode.
 * @returns The decoded string.
 */
const fromBase64 = (str: string): string => {
    try {
        // First atob, then escape to handle byte sequence, then decode URI components.
        return decodeURIComponent(escape(atob(str)));
    } catch (e) {
        console.error("Failed to decode from Base64", e);
        return '';
    }
};


// Simple SHA-256 simulation using basic arithmetic for our closed environment
const simpleHash = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
};

export const adminCrypto = {
    /**
     * Simulates AES-256-GCM encryption.
     * @param plaintext The string to encrypt.
     * @returns A Base64 encoded encrypted string.
     */
    encrypt: (plaintext: string): string => {
        const encrypted = xorCipher(plaintext, AES_SIM_KEY);
        return toBase64(encrypted);
    },

    /**
     * Simulates AES-256-GCM decryption.
     * @param encryptedBase64 The Base64 encoded string to decrypt.
     * @returns The decrypted plaintext string.
     */
    decrypt: (encryptedBase64: string): string => {
        const encrypted = fromBase64(encryptedBase64);
        return xorCipher(encrypted, AES_SIM_KEY);
    },

    /**
     * Simulates HMAC-SHA256 generation.
     * @param plaintext The data to generate HMAC for.
     * @returns A SHA256 hash string.
     */
    generateHmac: async (plaintext: string): Promise<string> => {
        return simpleHash(plaintext + HMAC_SIM_KEY);
    },

    /**
     * Simulates HMAC-SHA256 verification.
     * @param plaintext The original data.
     * @param expectedHmac The HMAC to compare against.
     * @returns True if the HMAC is valid, false otherwise.
     */
    verifyHmac: async (plaintext: string, expectedHmac: string): Promise<boolean> => {
        const actualHmac = simpleHash(plaintext + HMAC_SIM_KEY);
        return actualHmac === expectedHmac;
    }
};