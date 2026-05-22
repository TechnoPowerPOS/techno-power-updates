import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { handleFirestoreError, OperationType } from '../services/firestoreErrorHandler';
import { Download, AlertTriangle } from 'lucide-react';
import Button from './ui/Button';

export const GlobalUpdateOverlay: React.FC = () => {
    const [update, setUpdate] = useState<any>(null);
    const [acknowledged, setAcknowledged] = useState(false);

    useEffect(() => {
        const checkUpdate = async () => {
            try {
                const q = query(collection(db, 'system_updates'), orderBy('releaseDate', 'desc'), limit(1));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const latestUpdate = { id: snap.docs[0].id, ...snap.docs[0].data() } as any;
                    
                    // Check if it's already acknowledged locally
                    const lastAck = localStorage.getItem('pos_last_update_ack');
                    if (lastAck !== latestUpdate.id) {
                        setUpdate(latestUpdate);
                    }
                }
            } catch (e) {
                handleFirestoreError(e, OperationType.GET, 'system_updates');
            }
        };
        
        checkUpdate();
        const intervalId = setInterval(checkUpdate, 120000); // every 2 minutes
        return () => clearInterval(intervalId);
    }, []);

    if (!update || acknowledged) return null;

    const handleAck = () => {
        if (update.downloadUrl && update.downloadUrl !== '#') {
            window.open(update.downloadUrl, '_blank');
        }

        if (!update.isForced) {
            localStorage.setItem('pos_last_update_ack', update.id);
            setAcknowledged(true);
        } else {
            // For forced updates, we shouldn't dismiss the overlay entirely unless we have a specific mechanism
            // But if they clicked download, maybe we can let them reload, or keep it forced until the new version launches
            // For now, let's keep the forced overlay open so they must download it, 
            // but we can acknowledge it so the web preview doesn't block them forever.
            localStorage.setItem('pos_last_update_ack', update.id);
            // Optionally reload to try and see if an update applied (not really valid for electron, but good for web)
            if (!update.downloadUrl || update.downloadUrl === '#') {
               window.location.reload();
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl relative overflow-hidden transform animate-scaleIn">
                <div className={`absolute top-0 inset-x-0 h-2 ${update.isForced ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                
                <div className="flex flex-col items-center text-center mt-4">
                    <div className={`p-4 rounded-full mb-4 ${update.isForced ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {update.isForced ? <AlertTriangle size={32} /> : <Download size={32} />}
                    </div>
                    
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">
                        تحديث جديد متوفر <span className="font-mono text-indigo-600 tracking-wider">({update.version})</span>
                    </h2>
                    
                    {update.isForced ? (
                        <p className="text-rose-600 font-bold text-sm bg-rose-50 px-4 py-2 rounded-xl mb-4 w-full">
                            هذا التحديث إجباري. يرجى تحميل الإصدار الجديد وتثبيته للاستمرار في استخدام النظام.
                        </p>
                    ) : (
                        <p className="text-slate-500 font-bold text-sm mb-4">
                            تم إطلاق تحديث جديد للبرنامج. قم بتحميله الآن للحصول على أحدث الميزات.
                        </p>
                    )}

                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl w-full text-right mb-6">
                        <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-2">ملاحظات الإصدار:</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-full overflow-hidden text-ellipsis whitespace-pre-wrap">
                            {update.releaseNotes}
                        </p>
                    </div>

                    <div className="w-full flex gap-3">
                        <Button onClick={handleAck} className={`w-full h-12 rounded-xl text-lg font-black shadow-lg flex items-center justify-center gap-2 ${update.isForced ? 'bg-indigo-600 shadow-indigo-600/30' : 'bg-emerald-600 shadow-emerald-600/30'}`}>
                            <Download size={20} />
                            تحميل التحديث
                        </Button>
                        {!update.isForced && (
                            <button 
                                onClick={() => {
                                    localStorage.setItem('pos_last_update_ack', update.id);
                                    setAcknowledged(true);
                                }}
                                className="px-4 py-2 text-slate-500 hover:text-slate-800 font-bold transition-colors shrink-0"
                            >
                                لاحقاً
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
