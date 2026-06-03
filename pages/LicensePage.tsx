import React, { useState, useEffect } from 'react';
import { useLicense } from '../hooks/useLicense';
import { useDevMode } from '../hooks/useDevMode';
import Button from '../components/ui/Button';
import { Key, Rocket, ShieldAlert, Copy, Smartphone, Ban, Gift, ShieldCheck, AlertCircle, MessageCircle, Heart, Shield, Cpu, Zap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import Modal from '../components/ui/Modal';
import { useToasts } from '../hooks/useToasts';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { api } from '../services/mockApi';
import { getUserIdentity } from '../services/licenseService';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

const LicensePage: React.FC = () => {
  const [licenseKey, setLicenseKey] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { activateLicense, activateTrial, activateFreePlan, deviceId, status, verify } = useLicense();
  const { enableDevMode } = useDevMode();
  const { t } = useTranslation();
  const [trialUsed, setTrialUsed] = useState(false);
  const { addToast } = useToasts();
  const navigate = useNavigate();
  
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showFreeConfirm, setShowFreeConfirm] = useState(false);

  useEffect(() => {
      const checkTrialEverUsed = async () => {
          // Check local storage quick cache first
          const localUsed = localStorage.getItem('tp_trial_ever_used');
          if (localUsed === 'true') {
              setTrialUsed(true);
              return;
          }

          if (!deviceId) return;

          try {
              // 1. Check if trials document exists for this deviceId
              const trialSnap = await getDoc(doc(db, 'trials', deviceId));
              if (trialSnap.exists()) {
                  setTrialUsed(true);
                  localStorage.setItem('tp_trial_ever_used', 'true');
                  return;
              }

              // 2. Check if trials database contains any document with current customerId
              const identity = getUserIdentity();
              if (identity?.id) {
                  const q = query(collection(db, 'trials'), where('customerId', '==', identity.id));
                  const trialQuerySnap = await getDocs(q);
                  if (!trialQuerySnap.empty) {
                      setTrialUsed(true);
                      localStorage.setItem('tp_trial_ever_used', 'true');
                      return;
                  }
              }

              setTrialUsed(false);
          } catch (e) {
              console.warn("Dynamic trial checks failed", e);
          }
      };

      checkTrialEverUsed();
  }, [deviceId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey) return;
    setIsLoading(true);
    setError('');
    
    setTimeout(async () => {
        if (enableDevMode(licenseKey)) return;

        try {
            const result = await activateLicense(licenseKey, referralCode);
            if (result.success) {
                 if (result.type === 'Yearly' || result.type === 'Business Year') {
                     setIsLoading(false);
                     setShowGiftModal(true);
                 } else {
                     addToast('تمت عملية التفعيل بنجاح!', 'success');
                     setTimeout(() => navigate('/'), 1000);
                 }
            } else {
                 setError(result.message || 'كود الترخيص غير صالح.');
                 setIsLoading(false);
            }
        } catch (err) {
            setError('حدث خطأ أثناء الاتصال بالخادم.');
            setIsLoading(false);
        }
    }, 1000);
  };

  const handleStartTrial = async () => {
    setIsLoading(true);
    setError('');
    try {
        const res = await activateTrial();
        if (res.success) {
            addToast(res.message, 'success');
            setTimeout(() => navigate('/'), 1000);
        } else {
            setError(res.message);
        }
    } catch (e) {
        setError('حدث خطأ أثناء تفعيل التجربة.');
    } finally {
        setIsLoading(false);
    }
  };

  const handleActivateFree = async () => {
      setIsLoading(true);
      setShowFreeConfirm(false);
      try {
          const res = await activateFreePlan();
          if (res.success) {
              addToast(res.message, 'success');
              setTimeout(() => navigate('/'), 500);
          } else {
              addToast(res.message, 'error');
              setIsLoading(false);
          }
      } catch (e) {
          addToast('فشل تفعيل الخطة المجانية.', 'error');
          setIsLoading(false);
      }
  };

  const copyDeviceId = () => {
      navigator.clipboard.writeText(deviceId);
      addToast('تم نسخ معرف الجهاز بنجاح!', 'success');
  };

  const getMessage = () => {
    if (status === 'tampered' || status === 'TAMPERED') {
        return { 
            title: t('security.tampering_detected_title'), 
            text: t('security.tampering_detected_text'), 
            icon: <ShieldAlert className="text-red-500 animate-pulse" size={40}/>,
            color: "text-red-600",
            action: (
                <Button 
                    onClick={async () => {
                        setIsLoading(true);
                        try {
                            await verify();
                            addToast('تمت إعادة التحقق بنجاح', 'success');
                        } finally {
                            setIsLoading(false);
                        }
                    }} 
                    variant="primary" 
                    className="mt-6 bg-rose-600 hover:bg-rose-700 h-12 px-8 rounded-2xl font-black shadow-lg shadow-rose-500/20"
                    isLoading={isLoading}
                >
                    إعادة محاولة التحقق الآن
                </Button>
            )
        };
    }

    switch(status) {
        case 'offline_blocked':
            return { title: "مطلوب اتصال بالإنترنت", text: "البرنامج لم يتصل بالإنترنت لأكثر من 15 يوماً. يرجى الاتصال بالإنترنت للتحقق من الترخيص والمزامنة للاستمرار.", icon: <ShieldAlert className="text-amber-500" size={40}/>, color: "text-amber-600" };
        case 'expired':
            return { title: "انتهت الصلاحية", text: "صلاحية رخصة هذا الجهاز قد انتهت. يرجى التجديد للاستمرار.", icon: <ShieldAlert className="text-red-500" size={40}/>, color: "text-red-600" };
        case 'mismatch':
            return { title: "خطأ في التوافق", text: "هذا الترخيص مخصص لجهاز آخر أو تم استنفاد عدد الأجهزة.", icon: <AlertCircle className="text-amber-500" size={40}/>, color: "text-amber-600" };
        case 'blocked':
            return { title: "ترخيص محظور", text: "تم حظر هذا الترخيص من قبل الإدارة.", icon: <Ban className="text-red-600" size={40}/>, color: "text-red-700" };
        case 'invalid':
            return { title: "ترخيص غير صالح", text: "كود الترخيص المحفوظ لم يعد صالحاً.", icon: <ShieldAlert className="text-red-500" size={40}/>, color: "text-red-600" };
        default:
            return { title: "تكنو باور POS", text: "أسرع نظام مبيعات سحابي متكامل لإدارة تجارتك الذكية", icon: <ShieldCheck size={40} className="text-indigo-600 dark:text-indigo-400" />, color: "text-indigo-600 dark:text-indigo-400" };
    }
  };
  
  const { title, text, icon, color } = getMessage();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans selection:bg-indigo-500/30 overflow-x-hidden" dir="rtl">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 lg:py-12">
        {/* Header Section */}
        <header className="text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="inline-flex p-4 bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-indigo-500/5 mb-6 ring-1 ring-slate-200 dark:ring-slate-800">
            {icon}
          </div>
          <h1 className={`text-3xl md:text-5xl font-black mb-3 tracking-tight ${color}`}>
            {title}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg font-medium max-w-2xl mx-auto">
            {text}
          </p>
          {(getMessage() as any).action}
        </header>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Top Bar: Device ID */}
          <div className="lg:col-span-12 group">
            <div 
              onClick={copyDeviceId}
              className="relative p-6 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 cursor-pointer hover:border-indigo-500 transition-all active:scale-[0.99] overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              
              <div className="flex items-center gap-4 relative z-10">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl text-indigo-600 dark:text-indigo-400">
                  <Cpu size={24} />
                </div>
                <div className="text-right">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-1">بصمة الجهاز الرقمية</h3>
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-300">يستخدم هذا الكود لربط الترخيص بهذا الجهاز حصراً</p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950 px-6 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/20 transition-colors relative z-10 w-full md:w-auto justify-center">
                <span className="font-mono text-2xl md:text-3xl font-black tracking-[0.3em] text-slate-800 dark:text-white">
                  {deviceId || '.......'}
                </span>
                <Copy size={20} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </div>
            </div>
          </div>

          {/* Main Activation Card */}
          <div className="lg:col-span-12 xl:col-span-8 h-full">
            <div className="p-8 md:p-12 bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 h-full relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>
              
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600">
                  <Zap size={22} className="fill-indigo-600" />
                </div>
                <h2 className="text-2xl font-black">تفعيل نسخة تكنو باور PRO</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="relative">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 mr-2">أدخل كود الترخيص المكون من 16 رقماً</label>
                  <input
                    type="text"
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value.trim().toUpperCase())}
                    placeholder="XXXX - XXXX - XXXX - XXXX"
                    className="w-full h-20 px-8 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-3xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-center text-3xl font-black tracking-[0.2em] transition-all placeholder:text-slate-300 placeholder:tracking-normal placeholder:text-lg mb-4"
                    required
                    autoComplete="off"
                  />
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 mr-2">كود الإحالة للمسوق (اختياري)</label>
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.trim().toUpperCase())}
                    placeholder="REF-XXXXXX"
                    className="w-full h-14 px-8 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-center text-xl font-bold tracking-widest transition-all placeholder:text-slate-300 placeholder:tracking-normal placeholder:text-base"
                    autoComplete="off"
                  />
                </div>
                
                {error && (
                  <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-2xl text-sm font-bold border border-red-100 dark:border-red-900/20 animate-shake">
                    <AlertCircle size={18} /> {error}
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-20 rounded-[2rem] font-black text-xl bg-indigo-600 hover:bg-indigo-700 shadow-2xl shadow-indigo-500/30 transition-all hover:scale-[1.01] active:scale-[0.98]" 
                  isLoading={isLoading} 
                  disabled={isLoading}
                >
                  <div className="flex items-center justify-center gap-3">
                    <Shield size={24} />
                    تنشيط النسخة الآن
                  </div>
                </Button>
              </form>

              <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4 py-2 px-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <Gift size={24} className="text-purple-500" />
                  <span className="text-sm font-bold text-slate-500">مكافآت حصرية عند التفعيل السنوي</span>
                </div>
                <Link to="/pricing" className="text-indigo-600 dark:text-indigo-400 font-black hover:underline underline-offset-4 decoration-2">
                  مشاهدة باقات الأسعار والتخفيضات
                </Link>
              </div>
            </div>
          </div>

          {/* Sidebar Area: Plans */}
          <div className="lg:col-span-12 xl:col-span-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-6 h-full">
            
            {/* Free Plan Card */}
            <div className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 group h-full flex flex-col relative overflow-hidden">
               <div className="absolute top-4 left-4 p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest">LifeTime</div>
               <div className="mb-6">
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-110 transition-transform text-right">
                      <Heart size={24} className="fill-emerald-600" />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2 text-right">الخطة المجانية</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium text-right">ابدأ الآن بدون تكاليف. ميزات أساسية تضمن لك إدارة مبيعاتك بنجاح للأبد.</p>
               </div>
               <div className="mt-auto">
                  <Button 
                    onClick={() => setShowFreeConfirm(true)} 
                    variant="secondary" 
                    className="w-full h-14 rounded-2xl bg-white dark:bg-slate-800 border-2 border-emerald-100 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 font-black" 
                    isLoading={isLoading} 
                    disabled={isLoading}
                  >
                    تفعيل الخطة المجانية
                  </Button>
               </div>
            </div>

            {/* Trial Plan Card */}
            <div className={`p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 group h-full flex flex-col relative overflow-hidden ${trialUsed ? 'opacity-60' : ''}`}>
               <div className="mb-6">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                      <Rocket size={24} className="fill-blue-600" />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2 text-right">تجربة 3 أيام</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium text-right">استكشف قوة الذكاء الاصطناعي وتقارير PRO المتقدمة مجاناً لمدة محدودة.</p>
               </div>
               <div className="mt-auto">
                  <Button 
                    onClick={handleStartTrial} 
                    variant="secondary" 
                    className="w-full h-14 rounded-2xl bg-white dark:bg-slate-800 border-2 border-blue-100 dark:border-blue-900/50 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 font-black" 
                    isLoading={isLoading} 
                    disabled={isLoading || trialUsed}
                  >
                    {trialUsed ? "تم استنفاد التجربة" : "بدء التجربة الكاملة"}
                  </Button>
               </div>
            </div>

          </div>

          {/* Support Bar */}
          <div className="lg:col-span-12">
            <div className="p-8 bg-slate-900 dark:bg-white rounded-[2.5rem] text-white dark:text-slate-900 relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8 shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
              
              <div className="flex items-center gap-6 relative z-10 text-center lg:text-right">
                <div className="w-16 h-16 bg-[#25D366] rounded-2xl flex items-center justify-center shadow-xl shadow-[#25D366]/20 shrink-0 mx-auto lg:mx-0">
                  <MessageCircle size={32} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-black mb-1">هل تواجه مشكلة في التنشيط؟</h3>
                  <p className="text-slate-400 dark:text-slate-500 font-medium">فريق الدعم الفني متاح الآن لمساعدتك في الحصول على كود التفعيل فوراً.</p>
                </div>
              </div>

              <a 
                href="https://wa.me/201020246503" 
                target="_blank" 
                rel="noreferrer" 
                className="relative z-10 py-4 px-10 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-2xl text-lg font-black flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-[#25D366]/30 w-full lg:w-auto"
              >
                تواصل معنا عبر WhatsApp
              </a>
            </div>
          </div>

        </div>

        <footer className="mt-16 text-center">
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.3em]">
            Techno Power Digital Systems &copy; 2026 - All Rights Reserved
          </p>
        </footer>
      </div>

      {/* Modals & Dialogs */}
      {showGiftModal && (
          <Modal isOpen={true} onClose={() => navigate('/')} title="تهانينا! 🎉">
              <div className="text-center py-8 space-y-6">
                  <div className="w-24 h-24 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Gift size={56} className="text-purple-600 animate-bounce" />
                  </div>
                  <h3 className="text-2xl font-black text-purple-700 dark:text-purple-400 text-right">هدية الاشتراك السنوي!</h3>
                  <p className="text-lg font-bold text-slate-600 dark:text-slate-300 text-right">تم منحك <span className="text-indigo-600 dark:text-indigo-400">شهر إضافي مجاني</span> وتقارير ذكاء اصطناعي غير محدودة.</p>
                  <Button onClick={() => navigate('/')} className="w-full py-4 text-xl rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 shadow-xl shadow-purple-500/20">
                      استلام الهدية والمتابعة
                  </Button>
              </div>
          </Modal>
      )}

      <ConfirmDialog 
          isOpen={showFreeConfirm} 
          onClose={() => setShowFreeConfirm(false)} 
          onConfirm={handleActivateFree}
          title="تنشيط الخطة المجانية"
          message="هل أنت متأكد من الانتقال للخطة المجانية؟ سيتم الحفاظ على كافة البيانات الحالية ولن يتم تصفير البرنامج."
          confirmText="نعم، موافق ومتابعة"
          cancelText="تراجع"
          isLoading={isLoading}
      />
    </div>
  );
};

export default LicensePage;
