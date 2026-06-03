
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache, setLogLevel } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';


// Utility to handle Firebase configuration cleanup
const app = initializeApp(firebaseConfig);

const databaseId = (firebaseConfig as any).firestoreDatabaseId || '(default)';

// Initialize Firestore with settings optimized for restricted network environments
// Using forced long-polling without fetch streams for maximum compatibility.
// Using memory local cache to avoid IndexedDB corruption issues.
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  localCache: memoryLocalCache()
}, databaseId);

// Silence internal Firestore SDK console errors about network connectivity
setLogLevel('silent');

console.log("Firestore initialized with database:", databaseId);

export const auth = getAuth(app);
