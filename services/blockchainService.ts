import { secureStorage } from '../utils/secureStorage';
import type { LicenseInfo } from '../types';

const BLOCKCHAIN_STORAGE_KEY = 'pos_blockchain_ledger';

interface Block {
    index: number;
    timestamp: number;
    licenseHash: string; // Hash of the license data
    previousHash: string;
}

// Simple SHA-256 hashing function using Web Crypto API
async function calculateHash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getBlockchain(): Block[] {
    return secureStorage.getItem<Block[]>(BLOCKCHAIN_STORAGE_KEY) || [];
}

function saveBlockchain(chain: Block[]): void {
    secureStorage.setItem(BLOCKCHAIN_STORAGE_KEY, chain);
}

// Function to create the very first block of the chain
async function createGenesisBlock(): Promise<Block> {
    return {
        index: 0,
        timestamp: Date.now(),
        licenseHash: "genesis_block_hash",
        previousHash: "0"
    };
}

// Initialize the blockchain if it doesn't exist
async function initializeBlockchain() {
    let chain = getBlockchain();
    if (chain.length === 0) {
        const genesisBlock = await createGenesisBlock();
        chain.push(genesisBlock);
        saveBlockchain(chain);
    }
}

// FIX: Refactored function to be more type-safe and resolve an assignment error.
// The previous implementation had a type issue where TypeScript couldn't guarantee type safety
// when dynamically assigning properties. This implementation uses a generic callback in `forEach`
// to correctly correlate the key with its corresponding value type.
function getHashableLicenseData(license: LicenseInfo): string {
     
    const { status, blockchainHash, ...hashablePart } = license;
    const sortedObject: Partial<typeof hashablePart> = {};
    (Object.keys(hashablePart) as Array<keyof typeof hashablePart>)
        .sort()
        .forEach(<K extends keyof typeof hashablePart>(key: K) => {
            sortedObject[key] = hashablePart[key];
        });
    return JSON.stringify(sortedObject);
}

export const blockchainService = {
    initialize: async () => {
        await initializeBlockchain();
    },

    // Adds a new license to the blockchain and returns its hash
    addLicense: async (license: LicenseInfo): Promise<string> => {
        await initializeBlockchain(); // Ensure it's initialized

        const chain = getBlockchain();
        const previousBlock = chain[chain.length - 1];
        
        const licenseDataString = getHashableLicenseData(license);
        const newLicenseHash = await calculateHash(licenseDataString);

        const newBlock: Block = {
            index: previousBlock.index + 1,
            timestamp: Date.now(),
            licenseHash: newLicenseHash,
            previousHash: await calculateHash(JSON.stringify(previousBlock)), // Hash the entire previous block for integrity
        };

        chain.push(newBlock);
        saveBlockchain(chain);

        return newLicenseHash;
    },

    // Verifies if a license is valid against the blockchain
    verifyLicense: async (license: LicenseInfo): Promise<boolean> => {
        if (!license.blockchainHash) {
            // This license was created before the blockchain system was in place.
            return false;
        }

        const chain = getBlockchain();
        if (chain.length === 0) {
            // Blockchain not initialized or corrupted
            return false;
        }

        // 1. Check if the stored hash matches the recalculated hash
        const licenseDataString = getHashableLicenseData(license);
        const recalculatedHash = await calculateHash(licenseDataString);
        
        if (recalculatedHash !== license.blockchainHash) {
            // The license data itself has been tampered with.
            return false;
        }

        // 2. Check if the hash exists in our blockchain ledger
        const hashExistsInChain = chain.some(block => block.licenseHash === license.blockchainHash);

        return hashExistsInChain;
    },
};