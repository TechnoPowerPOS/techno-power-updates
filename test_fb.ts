import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const fbConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(fbConfig);
const db = getFirestore(app, fbConfig.firestoreDatabaseId);

async function test() {
    try {
        const snap = await getDocs(collection(db, 'treasuries'));
        console.log("Success! Docs:", snap.size);
        process.exit(0);
    } catch(e) {
        console.error("Error:", e);
        process.exit(1);
    }
}
test();
