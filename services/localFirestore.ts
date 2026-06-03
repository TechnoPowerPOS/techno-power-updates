import { getCurrentDbKey } from './branchService';

// Fake Firestore DB reference
export const db = 'LOCAL_DB';

// Generic Local DB helpers
const getDbString = () => {
    if (typeof window !== 'undefined' && 'electronAPI' in window) {
        return localStorage.getItem(getCurrentDbKey()) || '{}';
    }
    return localStorage.getItem(getCurrentDbKey()) || '{}';
};

const saveDbString = (data: string) => {
    localStorage.setItem(getCurrentDbKey(), data);
    if (typeof window !== 'undefined' && 'electronAPI' in window) {
        (window as any).electronAPI.secureSave(getCurrentDbKey(), JSON.parse(data)).catch(() => {});
    }
};

const getCollectionData = (collectionName: string) => {
    try {
        const dbObj = JSON.parse(getDbString());
        return dbObj[collectionName] || [];
    } catch { return []; }
};

const saveCollectionData = (collectionName: string, data: any[]) => {
    try {
        const dbObj = JSON.parse(getDbString());
        dbObj[collectionName] = data;
        saveDbString(JSON.stringify(dbObj));
    } catch {}
};

// Firestore Mocks
export const collection = (dbRef: any, path: string) => path;

export const doc = (dbRef: any, path: string, ...segments: string[]) => {
    if (dbRef !== 'LOCAL_DB' && typeof dbRef === 'string') {
        // Assume format doc(collection(db, 'name'), id) -> dbRef is collection name
        return { collectionName: dbRef, id: path };
    }
    return { collectionName: path, id: segments[0] };
};

export const query = (col: string, ...args: any[]) => {
    return { collectionName: col, modifiers: args };
};

export const where = (field: string, op: string, value: any) => ({ type: 'where', field, op, value });
export const orderBy = (field: string, direction: string = 'asc') => ({ type: 'orderBy', field, direction });
export const limit = (n: number) => ({ type: 'limit', n });
export const increment = (n: number) => ({ __isIncrement: true, value: n });

export const serverTimestamp = () => new Date().toISOString();

export const getDocs = async (queryObj: any) => {
    let colName = typeof queryObj === 'string' ? queryObj : queryObj.collectionName;
    let data = getCollectionData(colName);
    
    if (typeof queryObj === 'object' && queryObj.modifiers) {
        for (const mod of queryObj.modifiers) {
            if (mod.type === 'where') {
                data = data.filter((item: any) => {
                    if (mod.op === '==') return item[mod.field] === mod.value;
                    if (mod.op === 'in') return mod.value.includes(item[mod.field]);
                    return true;
                });
            }
        }
        
        const orderMod = queryObj.modifiers.find((m: any) => m.type === 'orderBy');
        if (orderMod) {
            data.sort((a: any, b: any) => {
                const av = a[orderMod.field] || '';
                const bv = b[orderMod.field] || '';
                if (av < bv) return orderMod.direction === 'asc' ? -1 : 1;
                if (av > bv) return orderMod.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        
        const limitMod = queryObj.modifiers.find((m: any) => m.type === 'limit');
        if (limitMod) {
            data = data.slice(0, limitMod.n);
        }
    }
    
    return {
        docs: data.map((item: any) => ({
            id: item.id,
            data: () => item
        })),
        empty: data.length === 0,
        size: data.length
    };
};

export const getDoc = async (docRef: any) => {
    const data = getCollectionData(docRef.collectionName);
    const item = data.find((i: any) => i.id === docRef.id);
    if (!item) return { exists: () => false };
    return {
        id: item.id,
        exists: () => true,
        data: () => item
    };
};

export const addDoc = async (colName: string, data: any) => {
    const items = getCollectionData(colName);
    const id = `${colName}-${Date.now()}-${Math.random().toString(36).substr(2,5)}`;
    // resolve deep objects resolving to serverTimestamp() string
    const processedData = JSON.parse(JSON.stringify(data));
    const newItem = { ...processedData, id, createdAt: new Date().toISOString() };
    items.unshift(newItem);
    saveCollectionData(colName, items);
    return { id };
};

export const updateDoc = async (docRef: any, data: any) => {
    const items = getCollectionData(docRef.collectionName);
    const index = items.findIndex((i: any) => i.id === docRef.id);
    if (index !== -1) {
        const item = { ...items[index] };
        for (const k in data) {
            if (data[k] && data[k].__isIncrement) {
                item[k] = (Number(item[k]) || 0) + data[k].value;
            } else {
                item[k] = data[k];
            }
        }
        item.updatedAt = new Date().toISOString();
        items[index] = item;
        saveCollectionData(docRef.collectionName, items);
    }
};

export const deleteDoc = async (docRef: any) => {
    const items = getCollectionData(docRef.collectionName);
    saveCollectionData(docRef.collectionName, items.filter((i: any) => i.id !== docRef.id));
};

export const setDoc = async (docRef: any, data: any, options?: any) => {
    const items = getCollectionData(docRef.collectionName);
    const index = items.findIndex((i: any) => i.id === docRef.id);
    
    let processedData = { ...data };
    // Handle increments in case they are passed to setDoc
    for (const k in processedData) {
        if (processedData[k] && processedData[k].__isIncrement) {
            processedData[k] = processedData[k].value; 
            if (index !== -1 && options?.merge) {
                processedData[k] += (Number(items[index][k]) || 0);
            }
        }
    }

    if (index !== -1) {
        if (options?.merge) {
            items[index] = { ...items[index], ...processedData };
        } else {
            items[index] = { ...processedData, id: docRef.id };
        }
    } else {
        items.unshift({ ...processedData, id: docRef.id });
    }
    saveCollectionData(docRef.collectionName, items);
};

export const writeBatch = () => {
    return {
        update: (ref: any, data: any) => updateDoc(ref, data),
        set: (ref: any, data: any) => setDoc(ref, data),
        delete: (ref: any) => deleteDoc(ref),
        commit: async () => {} // Note: Mock batch commit is not transactional
    };
};
