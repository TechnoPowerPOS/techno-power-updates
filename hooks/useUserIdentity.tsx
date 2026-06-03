import { useState, useEffect } from 'react';
import { UserIdentity, getUserIdentity, saveUserIdentity, updateUserIdentity } from '../services/licenseService';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export const useUserIdentity = () => {
    const [identity, setIdentity] = useState<UserIdentity | null>(getUserIdentity());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let fired = false;
        const safetyTimeout = setTimeout(() => {
            if (!fired) setIsLoading(false);
        }, 12000);

        let unsubSnap: (() => void) | undefined;

        // Ensure Firebase auth is ready before subscribing to prevent transient "permission-denied" errors
        const unsubAuth = onAuthStateChanged(auth, (user) => {
            fired = true;
            clearTimeout(safetyTimeout);
            
            const currentLocalUser = getUserIdentity();
            if (currentLocalUser && currentLocalUser.id) {
                // If snap listener is already active, unsubscribe first to prevent duplicates
                if (unsubSnap) unsubSnap();
                
                unsubSnap = onSnapshot(doc(db, 'customers', currentLocalUser.id), (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data() as UserIdentity;
                        data.id = docSnap.id;
                        setIdentity(data);
                        localStorage.setItem('tpv_user_identity', JSON.stringify(data));
                    }
                    setIsLoading(false);
                }, (error) => {
                    console.error('onSnapshot customers error:', error);
                    setIsLoading(false);
                });
            } else {
                setIsLoading(false);
            }
        });

        return () => {
            unsubAuth();
            if (unsubSnap) unsubSnap();
            clearTimeout(safetyTimeout);
        };
    }, []);

    const register = async (data: Omit<UserIdentity, 'id' | 'registeredAt'>) => {
        const newUser = await saveUserIdentity(data);
        setIdentity(newUser);
        return newUser;
    };

    const update = async (data: Partial<UserIdentity>) => {
        const updatedUser = await updateUserIdentity(data);
        if (updatedUser) {
            setIdentity(updatedUser);
        }
        return updatedUser;
    };

    return {
        identity,
        isRegistered: !!identity,
        isLoading,
        register,
        update
    };
};
