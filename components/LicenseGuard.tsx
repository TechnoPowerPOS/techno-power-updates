
import React, { useState, useEffect } from 'react';
import { checkLicenseStatus, activateLicense, getDeviceId } from '../services/licenseService';
import Button from './ui/Button';
import Card from './ui/Card';
import { Shield, Key, Smartphone, CheckCircle, AlertCircle } from 'lucide-react';
import { toArabicIndic } from '../utils/localization';

interface LicenseGuardProps {
    children: React.ReactNode;
}

const LicenseGuard: React.FC<LicenseGuardProps> = ({ children }) => {
    const [status, setStatus] = useState<'checking' | 'active' | 'inactive'>('checking');
    const [licenseKey, setLicenseKey] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [reason, setReason] = useState('');

    const verify = async () => {
        setStatus('checking');
        const res = await checkLicenseStatus();
        if (res.active) {
            setStatus('active');
        } else {
            setStatus('inactive');
            setReason(res.status);
        }
    };

    useEffect(() => {
        verify();
    }, []);

    const handleActivate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!licenseKey) return;
        setLoading(true);
        setError('');
        
        try {
            const res = await activateLicense(licenseKey);
            if (res.success) {
                setStatus('active');
            } else {
                setError(res.message);
            }
        } catch (e) {
            setError('حدث خطأ غير متوقع.');
        } finally {
            setLoading(false);
        }
    };

    if (status === 'checking') {
        return (
            <div className="fixed inset-0 bg-slate-50 flex items-center justify-center z-[9999]">
                <div className="text-center">
                    <Shield className="w-12 h-12 text-indigo-600 animate-pulse mx-auto mb-4" />
                    <p className="font-black text-slate-800">جاري التحقق من ترخيص النسخة...</p>
                </div>
            </div>
        );
    }

    if (status === 'inactive') {
        return (
            <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-[9999] p-4 text-white">
                <Card className="max-w-md w-full bg-slate-800 border-slate-700 shadow-2xl p-8 animate-fadeIn">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-indigo-500/20 shadow-xl">
                            <Key size={40} />
                        </div>
                        <h1 className="text-2xl font-black mb-2">تنشيط البرنامج</h1>
                        <p className="text-slate-400 text-sm font-bold">يرجى إدخال مفتاح الترخيص المشتري لتفعيل الخدمة على هذا الجهاز.</p>
                    </div>

                    <form onSubmit={handleActivate} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">معرف الجهاز الحالي</label>
                            <div className="bg-slate-900/50 p-3 rounded-2xl flex items-center gap-3 border border-slate-700">
                                <Smartphone size={18} className="text-indigo-400" />
                                <span className="text-xs font-mono text-slate-400 truncate">{getDeviceId()}</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">مفتاح الترخيص</label>
                            <input 
                                type="text"
                                value={licenseKey}
                                onChange={e => setLicenseKey(e.target.value)}
                                placeholder="XXXX-XXXX-XXXX-XXXX"
                                className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 font-mono text-center tracking-[0.2em] focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-700"
                                required
                            />
                        </div>

                        {error && (
                            <div className="bg-rose-500/10 text-rose-500 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold border border-rose-500/20">
                                <AlertCircle size={18} />
                                <span>{error}</span>
                            </div>
                        )}

                        {reason === 'blocked' && (
                            <div className="bg-rose-500/10 text-rose-500 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold border border-rose-500/20 mb-4">
                                <AlertCircle size={18} />
                                <span>عذراً، هذا الترخيص محظور من قبل الإدارة.</span>
                            </div>
                        )}

                        <Button 
                            type="submit" 
                            disabled={loading}
                            className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black text-lg shadow-xl shadow-indigo-600/20 transition-all"
                        >
                            {loading ? 'جاري التحقق...' : 'تفعيل النسخة الآن'}
                        </Button>

                        <div className="text-center pt-4 border-t border-slate-700 mt-6">
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">تواصل مع الدعم الفني للحصول على مفتاح</p>
                            <p className="text-indigo-400 font-black mt-1">V 1.15.0 - Techno Power POS</p>
                        </div>
                    </form>
                </Card>
            </div>
        );
    }

    return <>{children}</>;
};

export default LicenseGuard;
