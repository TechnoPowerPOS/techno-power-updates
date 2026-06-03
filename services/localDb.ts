import { getCurrentDbKey } from './branchService';

// Generic Local DB helpers
const getDbString = () => {
    if (typeof window !== 'undefined' && 'electronAPI' in window) {
        // Assume fallback to localStorage for synchronous operations if electron is async
        return localStorage.getItem(getCurrentDbKey()) || '{}';
    }
    return localStorage.getItem(getCurrentDbKey()) || '{}';
};

const saveDbString = (data: string) => {
    localStorage.setItem(getCurrentDbKey(), data);
    if (typeof window !== 'undefined' && 'electronAPI' in window) {
        // Fire and forget electron save for persistence
        (window as any).electronAPI.secureSave(getCurrentDbKey(), JSON.parse(data)).catch(() => {});
    }
};

const getCollectionData = (collectionName: string) => {
    try {
        const db = JSON.parse(getDbString());
        return db[collectionName] || [];
    } catch { return []; }
};

const saveCollectionData = (collectionName: string, data: any[]) => {
    try {
        const db = JSON.parse(getDbString());
        db[collectionName] = data;
        saveDbString(JSON.stringify(db));
    } catch {}
};

export const localDb = {
    getDocs: async (collectionName: string) => {
        return getCollectionData(collectionName);
    },
    addDoc: async (collectionName: string, data: any) => {
        const items = getCollectionData(collectionName);
        const id = `${collectionName}-${Date.now()}`;
        const newItem = { ...data, id, createdAt: new Date().toISOString() };
        items.unshift(newItem);
        saveCollectionData(collectionName, items);
        return newItem;
    },
    updateDoc: async (collectionName: string, id: string, data: any) => {
        const items = getCollectionData(collectionName);
        const index = items.findIndex((i: any) => i.id === id);
        if (index !== -1) {
            items[index] = { ...items[index], ...data, updatedAt: new Date().toISOString() };
            saveCollectionData(collectionName, items);
        }
    },
    deleteDoc: async (collectionName: string, id: string) => {
        const items = getCollectionData(collectionName);
        saveCollectionData(collectionName, items.filter((i: any) => i.id !== id));
    }
};
