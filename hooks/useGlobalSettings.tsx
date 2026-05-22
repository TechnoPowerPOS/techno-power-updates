
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { GlobalSettings } from '../types';

export function useGlobalSettings() {
    const [settings, setSettings] = useState<GlobalSettings | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const docRef = doc(db, 'adminSettings', 'globalAdmin');
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    setSettings(snap.data() as GlobalSettings);
                }
            } catch (e) {
                console.error("Error loading global settings", e);
            } finally {
                setLoading(false);
            }
        };

        load();
        
        // Listen for updates if needed, but for now simple fetch is okay
        const handleUpdate = () => load();
        window.addEventListener('adminGlobalUpdated', handleUpdate);
        return () => window.removeEventListener('adminGlobalUpdated', handleUpdate);
    }, []);

    return { settings, loading };
}
