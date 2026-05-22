const fs = require('fs');
let code = fs.readFileSync('services/mockApi.ts', 'utf8');

// 1. Make getDb and saveDb async
code = code.replace('const getDb = () => {', 'const getDb = async () => {');
code = code.replace('const saveDb = (db: any) => {', 'const saveDb = async (db: any) => {');

// 2. Replace getDb() with await getDb() everywhere EXCEPT the definition
code = code.replace(/getDb\(\)/g, '(await getDb())');
code = code.replace('const (await getDb()) = async () => {', 'const getDb = async () => {');

// 3. Replace saveDb(db) with await saveDb(db) everywhere EXCEPT the definition
code = code.replace(/saveDb\(/g, 'await saveDb(');
code = code.replace(/await await/g, 'await');
code = code.replace('const await saveDb = async (db: any) => {', 'const saveDb = async (db: any) => {');
code = code.replace('const await saveDb =', 'const saveDb =');

// 4. Update the body of getDb
code = code.replace(
`        const stored = localStorage.getItem(getDbKey());
        const parsed = stored ? JSON.parse(stored) : defaultDb;`,
`        let parsed = null;
        if (typeof window !== 'undefined' && 'electronAPI' in window) {
            parsed = await (window as any).electronAPI.secureLoad(getDbKey());
            if (!parsed) {
                // Fallback to migrate from browser localStorage if any
                const stored = localStorage.getItem(getDbKey());
                if (stored) {
                    parsed = JSON.parse(stored);
                    await (window as any).electronAPI.secureSave(getDbKey(), parsed);
                }
            }
        } else {
            const stored = localStorage.getItem(getDbKey());
            parsed = stored ? JSON.parse(stored) : null;
        }
        
        if (!parsed) parsed = defaultDb;`
);

// 5. Update the body of saveDb
// In original:
// const saveDb = (db: any) => {
//     localStorage.setItem(getDbKey(), JSON.stringify(db));
//     window.dispatchEvent(new Event('storage_updated'));
// };
code = code.replace(
`    localStorage.setItem((await getDbKey)(), JSON.stringify(db));`,
`    if (typeof window !== 'undefined' && 'electronAPI' in window) {
        await (window as any).electronAPI.secureSave(getDbKey(), db);
    } else {
        localStorage.setItem(getDbKey(), JSON.stringify(db));
    }`
);
code = code.replace(
`    localStorage.setItem(getDbKey(), JSON.stringify(db));`,
`    if (typeof window !== 'undefined' && 'electronAPI' in window) {
        await (window as any).electronAPI.secureSave(getDbKey(), db);
    } else {
        localStorage.setItem(getDbKey(), JSON.stringify(db));
    }`
);


// 6. Fix `getCurrentDbKey` which might have been changed mistakenly if named similar, wait, getDbKey() is used: 
// `const getDbKey = () => getCurrentDbKey();` was changed to `const getDbKey = () => getCurrentDbKey();`
// Except `getDbKey()` might be replaced? No, our regex was `getDb()`, not `getDbKey()`.
// Oh wait, `localStorage.getItem((await getDb())Key())`? No, `getDbKey` is a different string. The regex `/getDb\(\)/g` won't match `getDbKey()`.

// 7. Fix `clearData` which uses localStorage.removeItem(getDbKey())
code = code.replace(
`    clearData: async () => {
        localStorage.removeItem(getDbKey()); 
        window.dispatchEvent(new Event('storage_updated'));
    }`,
`    clearData: async () => {
        if (typeof window !== 'undefined' && 'electronAPI' in window) {
            await (window as any).electronAPI.secureSave(getDbKey(), null);
        } else {
            localStorage.removeItem(getDbKey());
        }
        window.dispatchEvent(new Event('storage_updated'));
    }`
);

fs.writeFileSync('services/mockApi.ts', code);
console.log('Script finished. Replaced occurrences.');
