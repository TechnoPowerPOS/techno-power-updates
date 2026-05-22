
import React, { useState, useRef, useEffect } from 'react';
import { useAdminAuth } from '../hooks/useAdminAuth';
import Button from '../components/ui/Button';
import { Shield, Lock, EyeOff, AlertCircle, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminToolLoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [step, setStep] = useState<'email' | 'codes' | 'question'>('email');
    const [codes, setCodes] = useState<string[]>(['', '', '', '']);
    const [securityAnswer, setSecurityAnswer] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login, isAdminLoggedIn, isLoading: authLoading } = useAdminAuth();
    const navigate = useNavigate();
    const codeInputsRef = useRef<(HTMLInputElement | null)[]>([]);
    const answerInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!authLoading && isAdminLoggedIn) {
            navigate('/admin-tool', { replace: true });
        }
    }, [isAdminLoggedIn, authLoading, navigate]);

    // Security: Clear sensitive data on unmount
    useEffect(() => {
        return () => {
            setEmail('');
            setCodes(['', '', '', '']);
            setSecurityAnswer('');
        };
    }, []);

    const handleEmailSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (email !== 'm7mdshipl@gmail.com') {
            setError('هذا البريد غير مصرح له بالدخول للادارة.');
            return;
        }
        setError('');
        setStep('codes');
    };

    const handleCodeChange = (index: number, value: string) => {
        // STRICT VALIDATION: Allow numbers only
        const numericValue = value.replace(/[^0-9]/g, '');
        
        const newCodes = [...codes];
        newCodes[index] = numericValue;
        setCodes(newCodes);

        // Auto-focus next input if a certain length is reached (optional UX, assume 13 based on max length)
        if (numericValue.length >= 4 && index < 3) {
            codeInputsRef.current[index + 1]?.focus();
        }
    };

    const handleCodeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // 1. Check for empty fields
        if (codes.some(c => c.trim() === '')) {
            setError('الرجاء إدخال جميع أكواد التأكيد الأربعة.');
            return;
        }

        setStep('question');
        setTimeout(() => answerInputRef.current?.focus(), 100);
    };

    const handleAnswerSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // 1. Sanitize Input
        const sanitizedAnswer = securityAnswer.trim();

        if (!sanitizedAnswer) {
            setError('الرجاء الإجابة على سؤال الأمان.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const { status, message } = await login(email, codes, sanitizedAnswer);

            if (status === 'success') {
                navigate('/admin-tool', { replace: true });
            } else if (status === 'locked') {
                setError(message);
                setStep('codes'); // Reset UI but keep them locked
            } else {
                setError(message);
                // On failure, reset to the first step for security and clear inputs
                setTimeout(() => {
                    setStep('email');
                    setCodes(['', '', '', '']);
                    setSecurityAnswer('');
                    if (!error) setError('فشل التحقق. تم إعادة تعيين الحقول لأسباب أمنية.');
                }, 1500);
            }
        } catch (err) {
            console.error(err);
            setError('حدث خطأ غير متوقع.');
        } finally {
            setIsLoading(false);
        }
    };

    const inputStyle = "mt-1 block w-full px-3 py-2.5 bg-slate-200/50 dark:bg-white/5 border border-slate-300 dark:border-slate-300/20 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 sm:text-sm transition text-slate-800 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 text-center font-bold tracking-widest font-mono";

    return (
        <div className="relative flex items-center justify-center min-h-screen p-4 overflow-hidden bg-slate-900 text-white selection:bg-red-500 selection:text-white">
            <div className="absolute inset-0 bg-grid-slate-800 [mask-image:linear-gradient(0deg,#000,rgba(0,0,0,0.6))]"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/50"></div>

            {/* Back to Home Button */}
            <div className="absolute top-6 left-6 z-20">
                <Button variant="secondary" onClick={() => navigate('/')} className="bg-white/10 hover:bg-white/20 text-white border-none flex items-center gap-2">
                    <Home size={18} />
                    <span className="hidden sm:inline">العودة للرئيسية</span>
                </Button>
            </div>

            <div className="relative z-10 w-full max-w-lg text-center backdrop-blur-sm p-8 rounded-2xl border border-white/5 shadow-2xl animate-fadeIn">
                <div className="absolute top-4 right-4 text-red-500 opacity-50 animate-pulse">
                    <Lock size={16} />
                </div>
                
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-red-500 bg-slate-800 shadow-[0_0_30px_theme(colors.red.600)]">
                    <Shield size={40} className="text-red-500" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">منطقة محظورة</h1>
                <div className="flex items-center justify-center gap-2 text-red-400 text-sm bg-red-950/30 py-1 px-3 rounded-full mx-auto w-fit mb-6 border border-red-900/50">
                    <EyeOff size={14} />
                    <span>تشفير تام من طرف إلى طرف</span>
                </div>
                <p className="text-slate-400 text-sm mb-8">يتطلب الوصول إلى أداة الإدارة المصادقة الثنائية والتحقق من الهوية. جميع المحاولات مسجلة.</p>

                {step === 'email' && (
                    <form onSubmit={handleEmailSubmit} className="mt-8 animate-slideDown">
                        <label className="block text-sm font-medium text-slate-300 mb-4 uppercase tracking-widest text-xs">البريد الإلكتروني للإدارة</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={inputStyle}
                            placeholder="admin@example.com"
                            required
                            autoComplete="off"
                        />
                        <Button type="submit" variant="secondary" className="w-full mt-6 h-12 text-lg">
                            متابعة التحقق
                        </Button>
                    </form>
                )}

                {step === 'codes' && (
                    <form onSubmit={handleCodeSubmit} className="mt-8 animate-slideDown">
                        <label className="block text-sm font-medium text-slate-300 mb-4 uppercase tracking-widest text-xs">أكواد التأكيد الأمنية</label>
                        <div className="grid grid-cols-4 gap-3 mb-6">
                            {codes.map((code, index) => (
                                <input
                                    key={index}
                                    ref={el => { codeInputsRef.current[index] = el; }}
                                    type="password"
                                    value={code}
                                    onChange={(e) => handleCodeChange(index, e.target.value)}
                                    className={inputStyle}
                                    maxLength={13}
                                    placeholder="••••"
                                    required
                                    autoComplete="off"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                />
                            ))}
                        </div>
                        <Button type="submit" variant="secondary" className="w-full h-12 text-lg">
                            متابعة التحقق
                        </Button>
                    </form>
                )}

                {step === 'question' && (
                    <form onSubmit={handleAnswerSubmit} className="mt-8 animate-slideDown">
                        <label className="block text-sm font-medium text-slate-300 mb-2">سؤال الأمان: "ما اسم معلمك؟"</label>
                        <input
                            ref={answerInputRef}
                            type="password"
                            value={securityAnswer}
                            onChange={(e) => setSecurityAnswer(e.target.value)}
                            className={inputStyle}
                            placeholder="الإجابة السرية"
                            required
                            autoComplete="off"
                        />
                        <Button type="submit" variant="danger" className="w-full mt-6 h-12 text-lg shadow-[0_0_15px_theme(colors.red.600)] hover:shadow-[0_0_25px_theme(colors.red.600)] transition-all" isLoading={isLoading}>
                            <Lock size={18} className="me-2" />
                            تسجيل دخول بجوجل والدخول للإدارة
                        </Button>
                        <p className="text-[10px] text-slate-500 mt-4 text-center leading-relaxed">
                            ملاحظة: سيتم طلب تسجيل الدخول بحساب Google (m7mdshipl@gmail.com) لتفعيل الصلاحيات السحابية.
                            <br />
                            <span className="text-red-400 font-bold">تنبيه: إذا لم يظهر مربع تسجيل الدخول، يرجى فتح التطبيق في نافذة مستقلة (Open in new tab).</span>
                        </p>
                    </form>
                )}
                 {error && (
                     <div className="mt-6 p-3 bg-red-950/50 border border-red-900 rounded-lg text-red-400 text-sm flex items-center justify-center gap-2 animate-bounceIn">
                         <AlertCircle size={16} />
                         {error}
                     </div>
                 )}
            </div>
        </div>
    );
};

export default AdminToolLoginPage;
