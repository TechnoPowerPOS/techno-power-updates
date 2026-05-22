import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { handleFirestoreError, OperationType } from '../services/firestoreErrorHandler';
import { GlobalSettings } from '../types';
import { X, ExternalLink } from 'lucide-react';
import Button from './ui/Button';

export const GlobalAnnouncementPopup: React.FC = () => {
    const [settings, setSettings] = useState<GlobalSettings | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            const path = 'adminSettings/globalAdmin';
            try {
                const docRef = doc(db, 'adminSettings', 'globalAdmin');
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    const data = snap.data() as GlobalSettings;
                    setSettings(data);
                    
                    if (data.globalLogoUrl) {
                        localStorage.setItem('tp_global_logo', data.globalLogoUrl);
                        window.dispatchEvent(new Event('globalSettingsUpdated'));
                    }
                    
                    if (data.popupOffer?.enabled) {
                        // Check if we already showed it to this user recently
                        const lastShownStr = localStorage.getItem('tp_global_popup_shown');
                        const offerHash = data.popupOffer.title + data.popupOffer.message; // Simple hash to track changes
                        const lastOfferHash = localStorage.getItem('tp_global_popup_hash');

                        if (!lastShownStr || offerHash !== lastOfferHash) {
                            setIsVisible(true);
                            localStorage.setItem('tp_global_popup_shown', Date.now().toString());
                            localStorage.setItem('tp_global_popup_hash', offerHash);
                        } else {
                            // Optionally, check if it's been more than 24 hours
                            const lastShown = parseInt(lastShownStr);
                            if (Date.now() - lastShown > 24 * 60 * 60 * 1000) {
                                setIsVisible(true);
                                localStorage.setItem('tp_global_popup_shown', Date.now().toString());
                            }
                        }
                    }
                }
            } catch (e) {
                handleFirestoreError(e, OperationType.GET, path);
            }
        };

        loadSettings();
    }, []);

    if (!isVisible || !settings || !settings.popupOffer?.enabled) return null;

    const { title, message, imageUrl, buttonText, linkUrl } = settings.popupOffer;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn" dir="rtl">
            <div className="bg-white rounded-3xl overflow-hidden shadow-2xl max-w-lg w-full relative animate-scaleIn">
                <button 
                    onClick={() => setIsVisible(false)}
                    className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white rounded-full p-2 z-10 transition-colors"
                >
                    <X size={20} />
                </button>
                
                {imageUrl && (
                    <div className="w-full h-48 sm:h-64 bg-slate-100">
                        <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
                    </div>
                )}
                
                <div className="p-8 text-center">
                    <h2 className="text-2xl font-black text-slate-800 mb-4">{title}</h2>
                    <p className="text-slate-600 mb-8 whitespace-pre-wrap leading-relaxed">{message}</p>
                    
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        {linkUrl ? (
                            <>
                                <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all">
                                    المزيد من التفاصيل <ExternalLink size={18} />
                                </a>
                                <Button variant="outline" onClick={() => setIsVisible(false)} className="rounded-2xl py-4 px-6 font-bold">
                                    {buttonText || 'تخطي'}
                                </Button>
                            </>
                        ) : (
                            <Button onClick={() => setIsVisible(false)} className="w-full rounded-2xl py-4 font-black shadow-lg shadow-indigo-600/20">
                                {buttonText || 'إغلاق'}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
