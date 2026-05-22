import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

// This is a new file to handle PWA installation logic.

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

interface PWAInstallContextType {
    canInstall: boolean;
    triggerInstall: () => void;
}

const PWAInstallContext = createContext<PWAInstallContextType | undefined>(undefined);

export const PWAInstallProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Check if the app is already installed
        if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
            setIsStandalone(true);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const triggerInstall = async () => {
        if (deferredPrompt) {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                console.log('User accepted the PWA installation');
            } else {
                console.log('User dismissed the PWA installation');
            }
            // The prompt can only be used once.
            setDeferredPrompt(null);
        }
    };

    const value = {
        canInstall: !!deferredPrompt && !isStandalone,
        triggerInstall,
    };

    return (
        <PWAInstallContext.Provider value={value}>
            {children}
        </PWAInstallContext.Provider>
    );
};

export const usePWAInstall = () => {
    const context = useContext(PWAInstallContext);
    if (context === undefined) {
        throw new Error('usePWAInstall must be used within a PWAInstallProvider');
    }
    return context;
};