
import React, { useState, useRef, useEffect } from 'react';
import { useAdminAuth } from '../hooks/useAdminAuth';
import Button from '../components/ui/Button';
import { Shield, Lock, EyeOff, AlertCircle, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminToolLoginPage: React.FC = () => {
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login, isAdminLoggedIn, isLoading: authLoading } = useAdminAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!authLoading && isAdminLoggedIn) {
            navigate('/admin-tool', { replace: true });
        }
    }, [isAdminLoggedIn, authLoading, navigate]);

    const handleLoginClick = async () => {
        setIsLoading(true);
        setError('');

        try {
            const { status, message } = await login('m7mdshipl@gmail.com', [], '');

            if (status === 'success') {
                navigate('/admin-tool', { replace: true });
            } else {
                setError(message);
            }
        } catch (err) {
            console.error(err);
            setError('حدث خطأ غير متوقع. جرب مرة أخرى.');
        } finally {
            setIsLoading(false);
        }
    };

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
                <p className="text-slate-400 text-sm mb-8">يتطلب الوصول إلى أداة الإدارة المصادقة السحابية بحساب المالك (m7mdshipl@gmail.com). جميع المحاولات مسجلة.</p>

                <Button onClick={handleLoginClick} variant="danger" className="w-full mt-6 h-12 text-lg shadow-[0_0_15px_theme(colors.red.600)] hover:shadow-[0_0_25px_theme(colors.red.600)] transition-all" isLoading={isLoading}>
                    <Lock size={18} className="me-2" />
                    تسجيل الدخول باستخدام حساب المالك 
                </Button>

                <p className="text-[10px] text-slate-500 mt-4 text-center leading-relaxed">
                    ملاحظة: سيتم طلب تسجيل الدخول بحساب Google المعتمد لتفعيل الصلاحيات السحابية.
                    <br />
                    <span className="text-red-400 font-bold">تنبيه: إذا لم يظهر مربع تسجيل الدخول، يرجى فتح التطبيق في نافذة مستقلة (Open in new tab).</span>
                </p>

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
