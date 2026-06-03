import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, Crown, ShieldCheck, Zap, Star, Key, Heart, Info, MessageCircle, Smartphone, Copy, Check, Sparkles, Building2, Store, Layers, Mail, Tag, X, ArrowRight, Globe, Wallet, AlertCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import { useNavigate } from 'react-router-dom';
import { toArabicIndic } from '../utils/localization';
import { useLicense } from '../hooks/useLicense';
import { api } from '../services/mockApi';
import { useToasts } from '../hooks/useToasts';
import LicenseActivationModal from '../components/license/LicenseActivationModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { getPlanLimits } from '../utils/planPermissions';
import { db } from '../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useUserIdentity } from '../hooks/useUserIdentity';
import Modal from '../components/ui/Modal';

const PricingCard: React.FC<{
    title: string, 
    price: string, 
    oldPrice?: string,
    discount?: string,
    period: string, 
    features: string[], 
    limits: string[],
    popular?: boolean,
    icon: React.ReactNode,
    color: string,
    description: string,
    buttonText?: string,
    onSubscribe: () => void,
    onStartInstallment?: () => void,
    variant?: 'default' | 'glow' | 'solid',
    isCurrentPlan?: boolean,
    delay?: number,
    licenseType?: string,
    installment?: {
        downPayment: string;
        monthlyPayment: string;
        months: string;
        interest: string;
    },
    note?: string,
    installmentPlan?: string
}> = ({ title, price, oldPrice, discount, period, features, limits, popular, icon, color, description, buttonText = "اشترك الآن", onSubscribe, onStartInstallment, variant = 'default', isCurrentPlan = false, delay = 0, licenseType, installment, note, installmentPlan }) => {
    
    const currencySymbol = 'ج.م';
    // Style configurations based on variant
    let containerClass = popular 
        ? 'border-indigo-500/50 shadow-[0_32px_64px_-16px_rgba(79,70,229,0.22)] bg-white dark:bg-slate-900 border-2 relative overflow-hidden flex flex-col h-full rounded-[2.5rem] transition-all duration-500 ring-4 ring-indigo-500/5 hover:scale-[1.03] hover:-translate-y-3 hover:shadow-[0_48px_96px_-12px_rgba(79,70,229,0.3)]'
        : variant === 'glow'
        ? 'border-slate-200 dark:border-slate-800/80 shadow-[0_16px_32px_-8px_rgba(0,0,0,0.04)] bg-white/70 dark:bg-slate-900/80 backdrop-blur-3xl relative overflow-hidden flex flex-col h-full rounded-[2.5rem] border transition-all duration-500 hover:scale-[1.03] hover:-translate-y-3 hover:shadow-[0_48px_96px_-12px_rgba(0,0,0,0.12)]'
        : 'border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 relative overflow-hidden flex flex-col h-full rounded-[2.5rem] border transition-all duration-500 hover:scale-[1.03] hover:-translate-y-3 hover:shadow-[0_48px_96px_-12px_rgba(0,0,0,0.08)]';

    if (isCurrentPlan) {
        containerClass += ' ring-4 ring-emerald-500/10 border-emerald-500';
    }

    return (
        <div className="flex flex-col h-full transition-all duration-500">
            {note && (
                <div className="mb-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-center py-2.5 px-5 rounded-2xl font-black text-sm shadow-md shadow-emerald-500/20 transform hover:-translate-y-1 transition-transform border border-emerald-400/50">
                    ✨ {note}
                </div>
            )}
            <div className="relative flex-grow flex flex-col">
                <div 
                    className={containerClass}
                >
                    {popular && (
                        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 rounded-t-full shadow-[0_0_20px_rgba(79,70,229,0.3)]"></div>
                    )}
                    
                    {/* Professional discount badge integrated inside the card layout */}
                    {discount && discount !== "0%" && (
                        <div className="absolute top-5 left-5 z-40">
                            <span className="relative flex h-full w-full">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-2xl bg-rose-400 opacity-20"></span>
                                <span className="relative inline-flex items-center gap-1.5 bg-gradient-to-r from-rose-500 via-pink-600 to-rose-600 dark:from-rose-600 dark:via-pink-500 dark:to-rose-600 text-white text-[11px] font-black px-4 py-2 rounded-2xl shadow-[0_8px_24px_rgba(244,63,94,0.35)] border border-rose-400/20 font-sans">
                                    <Sparkles size={11} className="text-amber-300 animate-pulse" />
                                    وفر {discount} 🔥
                                </span>
                            </span>
                        </div>
                    )}
            
            <div className="p-6 md:p-8 flex-grow flex flex-col relative z-20 mt-2">
                <div className="flex items-center gap-4 mb-5">
                    <div 
                        className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center text-white shadow-xl shadow-current/20 ring-4 ring-white dark:ring-slate-900 overflow-hidden relative group`}
                    >
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" />
                        <div className="relative z-10 transition-transform duration-500 group-hover:scale-110">
                            {icon}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{title}</h3>
                        {popular && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full mt-1.5 inline-block border border-blue-100 dark:border-blue-800/30 shadow-sm shadow-blue-500/10 animate-pulse">الأكثر شيوعاً 🔥</span>}
                    </div>
                </div>
                
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-6 min-h-[42px] leading-relaxed opacity-90">{description}</p>
                
                    <div className="flex flex-col mb-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                        <div className="h-7 mb-2 flex items-center gap-2.5">
                            {oldPrice && <span className="text-slate-400 dark:text-slate-500 text-base line-through font-bold decoration-slate-300 dark:decoration-slate-700 opacity-80">{toArabicIndic(oldPrice)} {currencySymbol}</span>}
                            {discount && discount !== "0%" && (
                                <span className="inline-flex items-center gap-1 bg-gradient-to-r from-rose-500/10 via-pink-500/10 to-rose-600/10 dark:from-rose-500/20 dark:to-rose-600/20 text-rose-600 dark:text-rose-400 text-xs font-black px-2.5 py-1 rounded-xl border border-rose-500/20 dark:border-rose-500/10 shadow-sm animate-pulse">
                                    <Tag size={11} className="stroke-[2.5] text-rose-500" />
                                    وفر {discount} إضافي
                                </span>
                            )}
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className={`font-black tracking-tighter transition-all duration-500 ${price === '0' ? 'text-5xl' : 'text-5xl lg:text-6xl'} ${popular ? 'text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700 dark:from-indigo-400 dark:via-blue-400 dark:to-indigo-500' : 'text-slate-800 dark:text-white'}`}>
                                {price === '0' ? 'مجاناً' : toArabicIndic(price)}
                            </span>
                            {price !== '0' && <span className="text-slate-500 font-bold text-base bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">{currencySymbol} / {period}</span>}
                        </div>
                        {installment && installment.monthlyPayment ? (
                            <div className="mt-6 bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900/40 dark:to-slate-950/20 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm relative overflow-hidden group/installment transition-all duration-300 hover:border-emerald-500/30">
                                {/* Decorative subtle gradient glow */}
                                <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-bl-full pointer-events-none" />
                                
                                <div className="relative z-10 space-y-4">
                                    {/* Header info */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-450">
                                                <Wallet size={15} strokeWidth={2.5} />
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs font-black text-slate-800 dark:text-slate-150 block">خطة تقسيط ميسرة</span>
                                                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-extrabold block">تقسيط مباشر بدون تعقيدات</span>
                                            </div>
                                        </div>
                                        <div className="bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black px-2.5 py-1 rounded-lg border border-emerald-500/10 dark:border-emerald-500/20">
                                            فترة {toArabicIndic(installment.months)} شهور
                                        </div>
                                    </div>

                                    {/* Slogan / Promotional Custom Text Message (renders installmentPlan text elegantly) */}
                                    {installmentPlan && (
                                        <div className="p-3 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-2xl border border-emerald-500/10 dark:border-emerald-500/15 text-right relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 rounded-r-md" />
                                            <p className="text-[11px] font-black leading-relaxed text-emerald-800 dark:text-emerald-350">
                                                🎯 {installmentPlan}
                                            </p>
                                        </div>
                                    )}

                                    {/* Responsive Financial 3-Column Grid */}
                                    <div className="grid grid-cols-3 gap-2">
                                        {/* Down Payment Card */}
                                        <div className="p-3 bg-white dark:bg-slate-950/60 rounded-2xl border border-slate-100/80 dark:border-slate-850/80 text-center flex flex-col justify-between transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xs">
                                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 block mb-1">المطلوب مقدماً</span>
                                            <span className="font-black text-slate-800 dark:text-slate-200 text-sm tracking-tight block">
                                                {toArabicIndic(installment.downPayment)}
                                            </span>
                                            <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 block mt-1 bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded-md">جنية مصري</span>
                                        </div>

                                        {/* Monthly Installment Card */}
                                        <div className="p-3 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-2xl border border-emerald-500/20 dark:border-emerald-500/20 text-center flex flex-col justify-between transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xs">
                                            <span className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 block mb-1">القسط الشهري</span>
                                            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-base tracking-tight block">
                                                {toArabicIndic(installment.monthlyPayment)}
                                            </span>
                                            <span className="text-[8px] font-black text-emerald-600/80 dark:text-emerald-400/80 block mt-1 bg-emerald-500/10 dark:bg-emerald-500/20 px-1 py-0.5 rounded-md">ج.م / شهرياً</span>
                                        </div>

                                        {/* Interest rate Card */}
                                        <div className="p-3 bg-white dark:bg-slate-950/60 rounded-2xl border border-slate-100/80 dark:border-slate-850/80 text-center flex flex-col justify-between transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xs">
                                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 block mb-1">قيمة الفوائد</span>
                                            <span className="font-black text-amber-600 dark:text-amber-500 text-sm block">
                                                {toArabicIndic(installment.interest)}%
                                            </span>
                                            <span className="text-[8px] font-bold text-amber-600 dark:text-amber-500 block mt-1 bg-amber-500/10 dark:bg-amber-500/20 px-1 py-0.5 rounded-md">فوائد ميسرة</span>
                                        </div>
                                    </div>

                                    {/* Trust badge / bottom panel */}
                                    <div className="flex items-center justify-between pt-1 border-t border-slate-100/50 dark:border-slate-800/50 text-[9px] font-extrabold text-slate-400 dark:text-slate-500">
                                        <div className="flex items-center gap-1.5 text-right font-black text-slate-500 dark:text-slate-450">
                                            <ShieldCheck size={13} className="text-emerald-500" />
                                            <span>سداد آمن، بدون شروط وأوراق معقدة</span>
                                        </div>
                                        <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-md text-[8px] font-black">
                                            موثق 🛡️
                                        </span>
                                    </div>

                                    {/* Action button inside installment */}
                                    <div className="pt-2">
                                        <button 
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onStartInstallment?.();
                                            }}
                                            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs rounded-xl transition-all duration-300 shadow-md shadow-emerald-600/15 hover:shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer"
                                        >
                                            <Wallet size={13} />
                                            <span>ابدأ خطة التقسيط</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            installmentPlan && (
                                <div className="mt-5 p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/20 rounded-2xl border border-indigo-200/50 dark:border-indigo-700/30 shadow-sm relative overflow-hidden flex items-center gap-3">
                                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg text-indigo-600 dark:text-indigo-400 shrink-0">
                                        <Wallet size={18} strokeWidth={2.5} />
                                    </div>
                                    <span className="text-sm font-black text-indigo-800 dark:text-indigo-200">{installmentPlan}</span>
                                </div>
                            )
                        )}
                    </div>

                <div className="space-y-8 flex-grow">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4 flex items-center gap-2">
                            <Layers size={14} /> الخصائص الرئيسية
                        </p>
                        <ul className="space-y-3.5">
                            {limits.map((l, i) => (
                                <li 
                                    key={i} 
                                    className="flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-300 group"
                                >
                                    <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-blue-500 transition-colors"></div> 
                                    <span className="opacity-90">{l}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4 flex items-center gap-2">
                            <Sparkles size={14} className="text-amber-500 animate-spin-slow" /> المميزات والأنظمة المتاحة
                        </p>
                        <ul className="space-y-3.5">
                            {features.map((f, i) => (
                                <li 
                                    key={i} 
                                    className="flex items-start gap-3 text-sm font-bold text-slate-700 dark:text-slate-300 group/item cursor-default"
                                >
                                    <div className="mt-0.5 shrink-0 bg-emerald-50 dark:bg-emerald-500/10 p-0.5 rounded-full text-emerald-500 group-hover/item:bg-emerald-500 group-hover/item:text-white transition-colors duration-300">
                                        <Check size={14} strokeWidth={3} />
                                    </div>
                                    <span className="opacity-90 leading-snug group-hover/item:opacity-100 transition-opacity whitespace-pre-wrap">{f}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
            
            <div className="p-8 md:p-10 pt-0 mt-auto z-20">
                <Button 
                    onClick={onSubscribe}
                    className={`w-full py-4 rounded-2xl text-base font-black transition-all duration-300 ${
                        isCurrentPlan
                            ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 border border-emerald-100 dark:border-emerald-700 cursor-default shadow-inner'
                            : popular 
                                ? 'bg-blue-600 hover:bg-blue-500 shadow-[0_8px_20px_rgba(37,99,235,0.25)] text-white hover:shadow-[0_12px_24px_rgba(37,99,235,0.35)]' 
                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white border-transparent'
                    }`}
                >
                    {isCurrentPlan ? 'خطتك الحالية (نشطة)' : (licenseType !== 'Free' ? 'ترقية / تجديد' : buttonText)}
                </Button>
            </div>
        </div>
        </div>
        </div>
    );
};

const PricingPage: React.FC<{ hideHeader?: boolean }> = ({ hideHeader }) => {
  const navigate = useNavigate();
  const { activateFreePlan, activateTrial, deviceId } = useLicense();
  const { addToast } = useToasts();
  const { identity } = useUserIdentity();
  
  const [isActivationOpen, setIsActivationOpen] = useState(false);
  const [showFreeConfirm, setShowFreeConfirm] = useState(false);
  const [showTrialConfirm, setShowTrialConfirm] = useState(false);
  const [isActivatingFree, setIsActivatingFree] = useState(false);
  const [isActivatingTrial, setIsActivatingTrial] = useState(false);
  const { licenseInfo } = useLicense();
  
  // Custom activation/upgrade request states (similar to SettingsPage)
  const [reqName, setReqName] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqPhone, setReqPhone] = useState('');
  const [reqCountry, setReqCountry] = useState('مصر');
  const [reqPlan, setReqPlan] = useState('Basic');
  const [isSubmittingReq, setIsSubmittingReq] = useState(false);
  const [isPurchaseSuccessOpen, setIsPurchaseSuccessOpen] = useState(false);

  // Installment plan request states
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [selectedPlanForInstallment, setSelectedPlanForInstallment] = useState('');
  const [instMonths, setInstMonths] = useState('12');
  const [instName, setInstName] = useState('');
  const [instEmail, setInstEmail] = useState('');
  const [instPhone, setInstPhone] = useState('');
  const [instNationalId, setInstNationalId] = useState('');
  const [instBusinessType, setInstBusinessType] = useState('');
  const [isSubmittingInstallment, setIsSubmittingInstallment] = useState(false);
  const [isInstallmentSuccess, setIsInstallmentSuccess] = useState(false);

  useEffect(() => {
    if (identity) {
      setReqName(identity.name || '');
      setReqEmail(identity.email || '');
      setReqPhone(identity.phone || '');
      setReqCountry(identity.country || 'مصر');
      
      setInstName(identity.name || '');
      setInstEmail(identity.email || '');
      setInstPhone(identity.phone || '');
    }
  }, [identity]);
  
  // Promo Code State
  const [promoCode, setPromoCode] = useState('');
  const [activeDiscount, setActiveDiscount] = useState<{type: 'percentage' | 'fixed', value: number, code: string} | null>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  const [egpPricing, setEgpPricing] = useState({
      enableInstallmentDemo: true,
      basicYearly: { price: "4965", oldPrice: "5520", discount: "10%", currency: 'EGP', note: 'ادفع 9 جنيه فليوم', installmentPlan: 'ابدأ عملك اليوم بـ 50% فقط، ووزع تكاليف نجاحك على مدار السنة. ادفع 1,745 ج.م فقط، وقسط الباقي على 12 شهر بـ 180 ج.م شهرياً فوائد 40ج.م', installment: { downPayment: '1745', monthlyPayment: '185', months: '12', interest: '40' } },
      proYearly: { price: "8160", oldPrice: "9588", discount: "15%", currency: 'EGP', note: 'ادفع 20 جنيه فليوم', installmentPlan: 'ابدأ عملك اليوم بـ 50% فقط، ووزع تكاليف نجاحك على مدار السنة. ادفع 3,995 ج.م فقط، وقسط الباقي على 12 شهر بـ 375 ج.م شهرياً فوائد 40ج.م', installment: { downPayment: '3995', monthlyPayment: '375', months: '12', interest: '40' } },
      businessYearly: { price: "17665", oldPrice: "22080", discount: "20%", currency: 'EGP', note: 'ادفع 38 جنيه فليوم', installmentPlan: 'ابدأ عملك اليوم بـ 50% فقط، ووزع تكاليف نجاحك على مدار السنة. ادفع 6,995 ج.م فقط، وقسط الباقي على 12 شهر بـ 625 ج.م شهرياً فوائد 40ج.م', installment: { downPayment: '6995', monthlyPayment: '625', months: '12', interest: '40' } }
  });

  const [dynamicFeatures, setDynamicFeatures] = useState<Record<string, string[]> | null>(null);

  const currentPricing = egpPricing;

  useEffect(() => {
    let unsubscribeMarketing: () => void;
    let unsubscribePricing: () => void;
    
    const setupRealtime = async () => {
        // Sub to marketing content
        unsubscribeMarketing = onSnapshot(doc(db, 'admin', 'plan_marketing'), (snapshot) => {
            if (snapshot.exists()) {
                setDynamicFeatures(snapshot.data().content);
            }
        }, (err) => {
            console.error('onSnapshot plan_marketing error:', err);
        });

        // Sub to pricing
        unsubscribePricing = onSnapshot(doc(db, 'admin', 'pricing'), (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                setEgpPricing(prev => ({ ...prev, ...data }));
            }
        }, (err) => {
            console.error('onSnapshot pricing error:', err);
        });
    };

    setupRealtime();

    return () => {
        if (unsubscribeMarketing) unsubscribeMarketing();
        if (unsubscribePricing) unsubscribePricing();
    };
  }, []);

  const handleApplyPromo = async () => {
      if(!promoCode.trim()) return;
      setIsValidatingPromo(true);
      try {
          const { adminToolService } = await import('../services/adminToolService');
          const res = await adminToolService.validatePromoCode(promoCode.trim(), deviceId);
          if (res.valid) {
              setActiveDiscount({ type: res.discountType!, value: res.discountValue!, code: promoCode.trim().toUpperCase() });
              addToast(res.message, 'success');
              setPromoCode('');
          } else {
              addToast(res.message, 'error');
              setActiveDiscount(null);
          }
      } catch (e) {
          addToast('خطأ في التحقق من الكود', 'error');
      } finally {
          setIsValidatingPromo(false);
      }
  };

  const removePromo = () => {
      setActiveDiscount(null);
      addToast('تم إزالة كود الخصم', 'info');
  };

  const handleSubmitPurchaseRequest = async () => {
    if (identity?.requestedPlan && !identity?.confirmed) {
         addToast('لديك بالفعل طلب تفعيل أو ترقية قيد المراجعة حالياً. لا يمكنك تقديم طلب جديد إلا بعد الموافقة عليه من الإدارة.', 'warning');
         return;
    }
    if (!reqName.trim() || !reqEmail.trim() || !reqPhone.trim()) {
         addToast('يرجى ملء جميع الحقول المطلوبة لتقديم الطلب', 'warning');
         return;
    }
    setIsSubmittingReq(true);
    try {
        let originalPrice = "";
        let finalPrice = "";
        let appliedPromoCode = "";

        const targetPlanObj = reqPlan === 'Basic' ? egpPricing.basicYearly : reqPlan === 'Pro' ? egpPricing.proYearly : egpPricing.businessYearly;
        if (targetPlanObj) {
            originalPrice = targetPlanObj.price;
            if (activeDiscount) {
                appliedPromoCode = activeDiscount.code;
                const discountedObj = calculateDiscountedPrice(targetPlanObj);
                finalPrice = discountedObj.price;
            } else {
                finalPrice = targetPlanObj.price;
            }
        }

        const requestData = {
            name: reqName.trim(),
            email: reqEmail.trim(),
            phone: reqPhone.trim(),
            country: reqCountry,
            requestedPlan: reqPlan,
            deviceId: deviceId || 'unknown',
            updatedAt: new Date().toISOString(),
            confirmed: false,
            appliedPromoCode,
            originalPrice,
            finalPrice
        };

        const { setDoc, addDoc, collection, doc } = await import('firebase/firestore');
        if (identity?.id && !identity?.confirmed) {
            await setDoc(doc(db, 'customers', identity.id), requestData, { merge: true });
        } else {
            await addDoc(collection(db, 'customers'), {
                ...requestData,
                registeredAt: new Date().toISOString()
            });
        }
        
        addToast('تم إرسال طلب شراء الباقة بنجاح للادارة. سيتم مراجعته وتفعيله قريباً.', 'success');
        setIsPurchaseSuccessOpen(true);
    } catch (e) {
        addToast('حدث خطأ أثناء إرسال الطلب.', 'error');
    } finally {
        setIsSubmittingReq(false);
    }
  };

  const handleSubmitInstallmentRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (identity?.requestedPlan && !identity?.confirmed) {
         addToast('لديك بالفعل طلب تفعيل أو ترقية قيد المراجعة حالياً. لا يمكنك تقديم طلب جديد إلا بعد الموافقة عليه من الإدارة.', 'warning');
         return;
    }
    if (!instName.trim() || !instEmail.trim() || !instPhone.trim() || !instNationalId.trim() || !instBusinessType.trim()) {
        addToast('يرجى ملء جميع الحقول المطلوبة لتقديم طلب التقسيط', 'warning');
        return;
    }
    setIsSubmittingInstallment(true);
    try {
        let originalPrice = "";
        let finalPrice = "";
        let appliedPromoCode = "";

        const targetPlanObj = selectedPlanForInstallment === 'Basic' ? egpPricing.basicYearly : selectedPlanForInstallment === 'Pro' ? egpPricing.proYearly : egpPricing.businessYearly;
        if (targetPlanObj) {
            originalPrice = targetPlanObj.price;
            if (activeDiscount) {
                appliedPromoCode = activeDiscount.code;
                const discountedObj = calculateDiscountedPrice(targetPlanObj);
                finalPrice = discountedObj.price;
            } else {
                finalPrice = targetPlanObj.price;
            }
        }

        const requestData = {
            name: instName.trim(),
            email: instEmail.trim(),
            phone: instPhone.trim(),
            country: reqCountry || 'مصر',
            requestedPlan: selectedPlanForInstallment,
            deviceId: deviceId || 'unknown',
            isInstallment: true,
            nationalId: instNationalId.trim(),
            businessType: instBusinessType.trim(),
            installmentMonths: instMonths,
            updatedAt: new Date().toISOString(),
            confirmed: false,
            appliedPromoCode,
            originalPrice,
            finalPrice
        };

        const { setDoc, addDoc, collection, doc } = await import('firebase/firestore');
        if (identity?.id && !identity?.confirmed) {
            await setDoc(doc(db, 'customers', identity.id), requestData, { merge: true });
        } else {
            await addDoc(collection(db, 'customers'), {
                ...requestData,
                registeredAt: new Date().toISOString()
            });
        }
        
        addToast('تم إرسال طلب التقسيط الخاص بك بنجاح إلى الإدارة.', 'success');
        setIsInstallmentSuccess(true);
    } catch (e) {
        addToast('حدث خطأ أثناء تقديم طلب خطة التقسيط.', 'error');
    } finally {
        setIsSubmittingInstallment(false);
    }
  };

  const calculateDiscountedPrice = (planPricing: any) => {
      if (!activeDiscount) return planPricing;
      
      const cleanPrice = String(planPricing.price || '').replace(/[^0-9.]/g, '');
      const originalPrice = parseFloat(cleanPrice);
      if (isNaN(originalPrice) || originalPrice <= 0) return planPricing;

      let newPrice = originalPrice;
      let promoDiscountPct = 0;
      if (activeDiscount.type === 'percentage') {
          newPrice = originalPrice - (originalPrice * (activeDiscount.value / 100));
          promoDiscountPct = activeDiscount.value;
      } else if (activeDiscount.type === 'fixed') {
          newPrice = Math.max(0, originalPrice - activeDiscount.value);
          promoDiscountPct = Math.round((activeDiscount.value / originalPrice) * 100);
      }

      // Base discount parsed from package (e.g. 10% from '10%')
      const cleanBaseDiscount = String(planPricing.discount || '').replace(/[^0-9.]/g, '');
      const baseDiscount = parseFloat(cleanBaseDiscount) || 0;
      const totalDiscountPct = baseDiscount + promoDiscountPct;

      const cleanOldPrice = String(planPricing.oldPrice || '').replace(/[^0-9.]/g, '');
      const oldVal = parseFloat(cleanOldPrice) || originalPrice;

      return {
          ...planPricing,
          price: Math.round(newPrice).toString(),
          oldPrice: Math.round(oldVal).toString(),
          discount: `${totalDiscountPct}%`
      };
  };

  const openActivationModal = () => {
    setIsActivationOpen(true);
  };

  const copyDeviceId = () => {
    navigator.clipboard.writeText(deviceId);
    addToast('تم نسخ معرف الجهاز بنجاح!', 'success');
  };

  const handleActivateFree = async () => {
      if (isActivatingFree) return;
      setIsActivatingFree(true);
      
      try {
          const res = await activateFreePlan();
          if (res.success) {
              addToast(res.message, 'success');
              setTimeout(() => {
                  navigate('/');
              }, 500);
          } else {
              addToast(res.message, 'error');
          }
      } catch (e) {
          console.error("Free plan activation error:", e);
          addToast('حدث خطأ أثناء التفعيل.', 'error');
      } finally {
          setIsActivatingFree(false);
          setShowFreeConfirm(false);
      }
  };

  const handleActivateTrial = async () => {
    if (isActivatingTrial) return;
    setIsActivatingTrial(true);
    
    try {
        const res = await activateTrial();
        if (res.success) {
            addToast(res.message, 'success');
            setTimeout(() => {
                navigate('/');
            }, 500);
        } else {
            addToast(res.message, 'error');
        }
    } catch (e) {
        addToast('حدث خطأ أثناء تفعيل التجربة.', 'error');
    } finally {
        setIsActivatingTrial(false);
        setShowTrialConfirm(false);
    }
  };

  const formatLimit = (count?: number) => {
    if (count === undefined || count === null) return '...';
    if (count >= 999) return 'غير محدود';
    return toArabicIndic(count.toString());
  };

  const getPlanDetails = (type: string) => {
    const limits = getPlanLimits(type);
    
    const displayLimits = [
      `${formatLimit(limits.maxBranches)} فروع متصلة كحد أقصى`,
      `${formatLimit(limits.maxWarehouses)} مخازن لإدارة المخزون`,
      `${formatLimit(limits.maxTreasuries)} خزائن نقدية متعددة`,
      `${formatLimit(limits.maxProducts)} صنف/منتج في قاعدة البيانات`,
      `${formatLimit(limits.maxSuppliers)} ملفات موردين ومتابعة ديون`,
      `${formatLimit(limits.maxEmployees)} حسابات موظفين وصلاحيات`,
    ];

    if (dynamicFeatures) {
        const key = type.includes('Year') ? type.split(' ')[0] : type;
        const dynamicList = dynamicFeatures[key] || [];
        if (dynamicList.length > 0) {
            return { displayLimits, features: dynamicList };
        }
    }
    
    const features: string[] = [];

    // Feature 1: Core limits (Users, Branches, Warehouses, Treasuries)
    const userLimit = limits.maxUsers > 999 ? 'غير محدود' : limits.maxUsers;
    const branchLimit = limits.maxBranches > 999 ? 'غير محدودة' : limits.maxBranches;
    const warehouseLimit = limits.maxWarehouses > 999 ? 'غير محدودة' : limits.maxWarehouses;
    const treasuryLimit = limits.maxTreasuries > 999 ? 'غير محدودة' : limits.maxTreasuries;
    features.push(`الأساسيات: ${userLimit} مستخدم - ${branchLimit} فرع - ${warehouseLimit} مخزن - ${treasuryLimit} خزينة`);

    // Feature 2: Records limits (Products, Customers, Suppliers, Employees)
    const productLimit = limits.maxProducts > 9999 ? 'غير محدود' : limits.maxProducts;
    const customerLimit = limits.maxCustomers > 9999 ? 'غير محدود' : limits.maxCustomers;
    const supplierLimit = limits.maxSuppliers > 999 ? 'غير محدود' : limits.maxSuppliers;
    const employeeLimit = limits.maxEmployees > 999 ? 'غير محدود' : limits.maxEmployees;
    features.push(`السجلات الجوهرية: ${productLimit} منتج - ${customerLimit} عميل - ${supplierLimit} مورد - ${employeeLimit} موظف`);

    // Feature 3: Operation Limits (Sales & Operations)
    const dailySaleLimit = limits.maxDailySales > 9999 ? 'غير محدودة' : `${limits.maxDailySales} يومياً`;
    const yearlySaleLimit = limits.maxYearlySales > 99999 ? 'غير محدودة' : `${limits.maxYearlySales} سنوياً`;
    const treasuryTransLimit = limits.maxDailyTreasuryTransactions > 9999 ? 'غير محدودة' : `${limits.maxDailyTreasuryTransactions} حركة يومية`;
    features.push(`حجم المبيعات: ${dailySaleLimit} / ${yearlySaleLimit}`);
    
    // Feature 4: Base Management
    let inventoryFeatures = [];
    if (limits.hasStockTransfer) inventoryFeatures.push('التحويل الداخلي');
    if (limits.hasProductVariants) inventoryFeatures.push('المقاسات والألوان');
    if (limits.hasOffers) inventoryFeatures.push('نظام العروض');
    if (limits.hasExchange) inventoryFeatures.push('استبدال سريع');
    if (limits.hasReservations) inventoryFeatures.push('حجز القطع');
    if (limits.hasInventoryAudit) inventoryFeatures.push('جرد المخزون');
    if (limits.hasExcelImport) inventoryFeatures.push('استيراد وتصدير إكسيل');
    if (limits.hasBarcode) inventoryFeatures.push('قراءة الباركود');
    if (limits.hasActivityLogs) inventoryFeatures.push('سجل النشاط');
    if (inventoryFeatures.length > 0) features.push(`المخزون والعمليات: ${inventoryFeatures.join(' - ')}`);

    // Feature 5: Accounting
    let accFeatures = [];
    if (limits.hasAccounts) accFeatures.push('محاسبة متقدمة');
    if (limits.hasCreditCustomer) accFeatures.push('عملاء آجل');
    if (limits.hasInstallments) accFeatures.push('نظام التقسيط');
    if (limits.hasAccountingBudget) accFeatures.push('الموازنات والتقديرات');
    if (accFeatures.length > 0) features.push(`المحاسبة والمالية: ${accFeatures.join(' - ')}`);

    // Feature 6: Employees & HR
    let hrFeatures = [];
    if (limits.hasHR) hrFeatures.push('شؤون الموظفين');
    if (limits.hasHRSalaries) hrFeatures.push('المرتبات والأجور');
    if (limits.hasEmployeePerformance) hrFeatures.push('تقييم الأداء');
    if (limits.hasCommissions) hrFeatures.push('عمولات الموظفين');
    if (hrFeatures.length > 0) features.push(`شؤون الموظفين: ${hrFeatures.join(' - ')}`);

    // Feature 7: AI & Reports
    let reportFeatures = [];
    if (limits.hasAI) reportFeatures.push('الذكاء الاصطناعي');
    if (limits.hasAdvancedReports) reportFeatures.push('التقارير المتقدمة');
    if (reportFeatures.length > 0) features.push(`التقارير: ${reportFeatures.join(' - ')}`);

    // Feature 8: Advanced Modules
    let extraFeatures = [];
    if (limits.hasPartners) extraFeatures.push('نظام الشركاء');
    if (limits.hasShipping) extraFeatures.push('إدارة الشحن');
    if (limits.hasLoyalty) extraFeatures.push('برنامج الولاء');
    if (limits.hasCustomerSatisfaction) extraFeatures.push('رضا العملاء');
    if (limits.hasAPI) extraFeatures.push('دعم API');
    if (limits.hasEcommerceAPI) extraFeatures.push('الربط بمتجر إلكتروني');
    if (limits.hasWhatsApp) extraFeatures.push('إدارة واتساب');
    if (extraFeatures.length > 0) features.push(`ميزات متقدمة: ${extraFeatures.join(' - ')}`);

    if (limits.hasLogoUpload || limits.hasBackup || limits.hasCustomUi) {
         features.push('إضافات وتخصيص: تصميم الفواتير والشعار, והنسخ الاحتياطي السحابي');
    }

    if (type.includes('Trial')) {
        features.push('المميزات: مطابقة تماماً لـ خطة الأعمال بجميع ميزاتها وصلاحياتها.');
    }

    return { displayLimits, features };
  };

    return (
    <div className={`min-h-screen bg-[#fafcff] dark:bg-slate-900 pb-24 font-sans ${hideHeader ? '' : 'pt-36'} overflow-hidden relative`}>
      {/* Dynamic Background Patterns */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
      
      {/* Background Blobs (Static) */}
      <div className="absolute top-0 left-0 right-0 h-[100vh] overflow-hidden pointer-events-none shrink-0">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-400/10 rounded-full blur-[100px]" />
          <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] bg-purple-400/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-indigo-400/10 rounded-full blur-[100px]" />
      </div>

      <div className="absolute left-0 right-0 top-0 -z-10 h-[1000px] w-full max-w-full m-auto rounded-full bg-blue-300 dark:bg-blue-900 opacity-20 blur-[120px] pointer-events-none"></div>
      
      {!hideHeader && <Header />}
      
      <div className={`${hideHeader ? 'py-10' : ''} px-4 md:px-8 max-w-[90rem] mx-auto relative`}>
        {/* Header Section */}
        <div className="text-center mb-20 relative z-10 mt-8">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/40 border border-blue-200/50 dark:border-blue-800/50 mb-8 shadow-sm transition-all hover:scale-105">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
            </span>
            <span className="text-[11px] font-black text-blue-700 dark:text-blue-300 uppercase tracking-widest">تحديث أسعار الباقات لعام ٢٠٢٦</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white mb-6 tracking-tight leading-[1.1]">
            استثمر في ذكاء أعمالك <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400">بأسعار تنمو مع حجم نشاطك</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium text-lg md:text-2xl leading-relaxed mb-10">
            انضم إلى أكثر من ١٠,٠٠٠ مستخدم يعتمدون على قوة تكنو باور لإدارة مبيعاتهم بكفاءة ودون تعقيد.
          </p>

          {/* Promo Code Input & Branch Note */}
          <div className="max-w-2xl mx-auto mb-4 flex flex-col md:flex-row items-stretch gap-4 justify-center">
              <div className="flex-1 p-3 px-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-2xl flex items-center justify-center gap-3 shadow-sm min-h-[56px]">
                  <Store size={18} className="text-indigo-600" />
                  <p className="text-sm font-black text-indigo-800 dark:text-indigo-300">
                      كل فرع يتطلب ترخيص منفصل <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-lg ms-1">خصم ٣٥٪</span>
                  </p>
              </div>
              
              <div className="flex-1 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-2 min-h-[56px]">
                  {activeDiscount ? (
                      <div className="flex-1 flex items-center justify-between px-3">
                          <div className="flex items-center gap-2 text-emerald-600">
                              <Tag size={16} className="fill-emerald-100" />
                              <span className="font-black text-sm">تم تفعيل كود الخصم: {activeDiscount.code}</span>
                          </div>
                          <button onClick={removePromo} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-500 transition-colors">
                              <X size={16} />
                          </button>
                      </div>
                  ) : (
                      <>
                        <div className="flex-1 relative">
                            <Tag size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="كود الخصم الترويجي..."
                                className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold pr-9"
                                value={promoCode}
                                onChange={e => setPromoCode(e.target.value)}
                                dir="ltr"
                            />
                        </div>
                        <Button 
                            onClick={handleApplyPromo}
                            disabled={isValidatingPromo || !promoCode.trim()}
                            className="shrink-0 h-10 px-4 rounded-xl text-sm font-black bg-slate-900 text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                        >
                            تطبيق
                        </Button>
                      </>
                  )}
              </div>
          </div>

          {/* Online Version Note */}
          <div className="max-w-2xl mx-auto mb-10 flex flex-col md:flex-row items-stretch gap-4 justify-center">
              <div className="flex-1 p-4 px-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl flex items-center gap-4 shadow-sm min-h-[56px]">
                  <div className="bg-emerald-100 dark:bg-emerald-800/50 p-2 rounded-xl">
                    <Globe size={24} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-right text-emerald-800 dark:text-emerald-300 mb-0.5">
                        نسخة أونلاين سحابية متوفرة
                    </h4>
                    <p className="text-xs font-bold text-right text-emerald-600 dark:text-emerald-400/80">
                        لجعل النظام متاحاً من أي جهاز وفي أي مكان، يرجى التواصل مع دعم البرنامج لطلب تفعيل هذه الإضافة لنسختك.
                    </p>
                  </div>
              </div>
          </div>

        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10 xl:gap-12 mb-20 relative z-10 max-w-7xl lg:max-w-[85rem] xl:max-w-[92rem] mx-auto">
            <PricingCard 
                title="Basic"
                {...calculateDiscountedPrice(currentPricing.basicYearly)}
                installment={(currentPricing as any).enableInstallmentDemo !== false ? calculateDiscountedPrice(currentPricing.basicYearly).installment : undefined}
                installmentPlan={(currentPricing as any).enableInstallmentDemo !== false ? calculateDiscountedPrice(currentPricing.basicYearly).installmentPlan : undefined}
                period={'سنة'}
                description="ابدأ بقوة وسهولة لإدارة متجرك الصغير مع واجهة استخدام بديهية."
                color="bg-slate-800"
                icon={<Store size={24} />}
                limits={getPlanDetails('Basic Year').displayLimits}
                features={getPlanDetails('Basic Year').features}
                isCurrentPlan={licenseInfo?.type === 'Basic Year'}
                onSubscribe={licenseInfo?.type === 'Basic Year' ? () => addToast('أنت مشترك بالفعل في هذه الباقة', 'info') : openActivationModal}
                onStartInstallment={() => {
                    if (identity?.requestedPlan && !identity?.confirmed) {
                        addToast('لديك بالفعل طلب تفعيل أو ترقية قيد المراجعة حالياً. لا يمكنك تقديم طلب جديد إلا بعد الموافقة عليه من الإدارة.', 'warning');
                        return;
                    }
                    setSelectedPlanForInstallment('Basic');
                    setInstMonths('12');
                    setIsInstallmentSuccess(false);
                    setIsInstallmentModalOpen(true);
                }}
                variant="glow"
                delay={0.1}
                licenseType={licenseInfo?.type}
            />
            <PricingCard 
                title="Pro"
                {...calculateDiscountedPrice(currentPricing.proYearly)}
                installment={(currentPricing as any).enableInstallmentDemo !== false ? calculateDiscountedPrice(currentPricing.proYearly).installment : undefined}
                installmentPlan={(currentPricing as any).enableInstallmentDemo !== false ? calculateDiscountedPrice(currentPricing.proYearly).installmentPlan : undefined}
                period={'سنة'}
                description="ارتقِ لأقوى أدوات الإدارة والمتابعة المصممة للمشاريع المتنامية."
                popular={true}
                color="bg-blue-600"
                icon={<Crown size={24} />}
                limits={getPlanDetails('Pro Year').displayLimits}
                features={getPlanDetails('Pro Year').features}
                isCurrentPlan={licenseInfo?.type === 'Pro Year'}
                onSubscribe={licenseInfo?.type === 'Pro Year' ? () => addToast('أنت مشترك بالفعل في هذه الباقة', 'info') : openActivationModal}
                onStartInstallment={() => {
                    if (identity?.requestedPlan && !identity?.confirmed) {
                        addToast('لديك بالفعل طلب تفعيل أو ترقية قيد المراجعة حالياً. لا يمكنك تقديم طلب جديد إلا بعد الموافقة عليه من الإدارة.', 'warning');
                        return;
                    }
                    setSelectedPlanForInstallment('Pro');
                    setInstMonths('12');
                    setIsInstallmentSuccess(false);
                    setIsInstallmentModalOpen(true);
                }}
                variant="glow"
                delay={0.2}
                licenseType={licenseInfo?.type}
            />
            <PricingCard 
                title="Business"
                {...calculateDiscountedPrice(currentPricing.businessYearly)}
                installment={(currentPricing as any).enableInstallmentDemo !== false ? calculateDiscountedPrice(currentPricing.businessYearly).installment : undefined}
                installmentPlan={(currentPricing as any).enableInstallmentDemo !== false ? calculateDiscountedPrice(currentPricing.businessYearly).installmentPlan : undefined}
                period={'سنة'}
                description="بنية تحتية متينة وحلول مخصصة للمؤسسات والشركات الرائدة."
                color="bg-indigo-600"
                icon={<Building2 size={24} />}
                limits={getPlanDetails('Business Year').displayLimits}
                features={getPlanDetails('Business Year').features}
                isCurrentPlan={licenseInfo?.type === 'Business Year'}
                onSubscribe={licenseInfo?.type === 'Business Year' ? () => addToast('أنت مشترك بالفعل في هذه الباقة', 'info') : openActivationModal}
                onStartInstallment={() => {
                    if (identity?.requestedPlan && !identity?.confirmed) {
                        addToast('لديك بالفعل طلب تفعيل أو ترقية قيد المراجعة حالياً. لا يمكنك تقديم طلب جديد إلا بعد الموافقة عليه من الإدارة.', 'warning');
                        return;
                    }
                    setSelectedPlanForInstallment('Enterprise');
                    setInstMonths('12');
                    setIsInstallmentSuccess(false);
                    setIsInstallmentModalOpen(true);
                }}
                variant="glow"
                delay={0.3}
                licenseType={licenseInfo?.type}
            />
        </div>

        {/* Trial & Free Options - Professional View */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            <div className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6 group hover:shadow-xl transition-all duration-500">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-3xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                        <Zap size={32} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-white">الفترة التجريبية (Trial)</h3>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">اكتشف قوة النظام وتعرف على إمكانياته كاملة بشكل مجاني.</p>
                    </div>
                </div>
                <Button 
                    variant="outline"
                    className="w-full md:w-auto h-12 px-8 rounded-2xl font-black border-amber-500 text-amber-600 hover:bg-amber-50"
                    onClick={() => {
                        if (licenseInfo?.type === 'Trial') {
                            addToast('أنت في الفترة التجريبية بالفعل', 'info');
                        } else if (licenseInfo?.type && licenseInfo.status === 'LICENSED' && !['Free', 'Trial'].includes(licenseInfo.type)) {
                            addToast('عذراً، لا يمكن تفعيل الخطة التجريبية لمن لديه اشتراك مدفوع فعال.', 'error');
                        } else {
                            setShowTrialConfirm(true);
                        }
                    }}
                >
                    {licenseInfo?.type === 'Trial' ? 'الفترة التجريبية نشطة' : 'بدء التجربة الآن'}
                </Button>
            </div>

            <div className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6 group hover:shadow-xl transition-all duration-500">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-3xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                        <Heart size={32} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-white">الخطة المجانية (Free)</h3>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">محدودة ولكن مناسبة للمشاريع الصغيرة، ومجانية مدى الحياة.</p>
                    </div>
                </div>
                <Button 
                    variant="outline"
                    className="w-full md:w-auto h-12 px-8 rounded-2xl font-black border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                    onClick={() => {
                        if (licenseInfo?.type === 'Free') {
                            addToast('أنت على الباقة المجانية بالفعل', 'info');
                        } else if (licenseInfo?.type && licenseInfo.status === 'LICENSED' && !['Free', 'Trial'].includes(licenseInfo.type)) {
                            addToast('عذراً، لا يمكن تفعيل الخطة المجانية لمن لديه اشتراك مدفوع فعال.', 'error');
                        } else {
                            setShowFreeConfirm(true);
                        }
                    }}
                >
                    {licenseInfo?.type === 'Free' ? 'خطتك الحالية نشطة' : 'تفعيل الخطة المجانية'}
                </Button>
            </div>
        </div>

        {/* Donation Note */}
        <div className="max-w-3xl mx-auto mb-16 p-6 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 rounded-[2rem] flex flex-col sm:flex-row items-center gap-5 shadow-sm text-center sm:text-start transition-all hover:shadow-md">
            <div className="p-4 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20 shrink-0">
                <Heart size={28} fill="currentColor" />
            </div>
            <div>
                <h3 className="text-base font-black text-emerald-800 dark:text-emerald-300 mb-1">مساهمة خيرية مستدامة (صدقة جارية)</h3>
                <p className="text-sm text-emerald-700/80 dark:text-emerald-400/80 font-bold leading-relaxed">
                    نحيطكم علماً بأن <span className="underline decoration-wavy underline-offset-4 px-1 text-emerald-800 dark:text-emerald-300 font-black">١٠% من أرباح كل اشتراك</span> تذهب كصدقة جارية ومساهمات إنسانية للمحتاجين، لتكون تكنو باور تجارة رابحة لنا ولكم في الدنيا والآخرة.
                </p>
            </div>
        </div>

        {/* تقديم طلب تفعيل أو ترقية الباقة للإدارة */}
        <div className="mb-10 p-8 sm:p-10 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-[0_8px_32px_rgba(0,0,0,0.03)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Crown size={24} className="text-blue-600 animate-pulse" />
                تقديم طلب تفعيل أو ترقية الباقة للإدارة
            </h3>
            
            <p className="text-xs text-slate-500 font-bold mb-6">
                معاينة بياناتك الشخصية واختيار الباقة التي ترغب بالاشتراك بها. سيتم إرسال الطلب تلقائياً للدعم الفني لتفعيل الترخيص.
            </p>

            {identity?.requestedPlan && !identity?.confirmed && (
                <div className="bg-rose-500/10 border-r-4 border-rose-500 p-4 rounded-l-2xl mb-6">
                    <p className="text-xs font-black text-rose-850 dark:text-rose-300 leading-relaxed">
                        🚫 لديك بالفعل طلب قيد المراجعة لتفعيل أو ترقية ترخيص البرنامج إلى باقة ({identity.requestedPlan === 'Basic' ? 'Basic Year' : identity.requestedPlan === 'Pro' ? 'Pro Year' : identity.requestedPlan === 'Enterprise' ? 'Enterprise Year' : identity.requestedPlan}). يرجى الانتظار لحين مراجعته والموافقة عليه من قبل الإدارة، ولا يمكن إرسال طلب جديد حالياً لمنع تكرار وتداخل طلبات التفعيل.
                    </p>
                </div>
            )}

            <div className="bg-amber-500/10 border-r-4 border-amber-500 p-4 rounded-l-2xl mb-6">
                <p className="text-xs font-bold text-amber-800 dark:text-amber-300 leading-relaxed">
                    ⚠️ لمنع الأخطاء البرمجية وتطابق التراخيص، يتم عرض بياناتك الشخصية المسجلة في حسابك مباشرة ولا يمكن تعديلها من هنا. إذا كنت ترغب بتغيير الاسم أو الهاتف أو البريد الإلكتروني، يرجى القيام بذلك من خلال <span className="font-black text-amber-900 dark:text-amber-200">شاشة الإعدادات</span> أولاً.
                </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                <div>
                    <label className="block text-xs font-black text-slate-600 dark:text-slate-400 mb-2">الاسم بالكامل (يُعدل من الإعدادات فقط)</label>
                    <input 
                        type="text"
                        readOnly={true}
                        value={reqName}
                        placeholder="لا يوجد اسم مسجل..."
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-900/50 text-slate-500 cursor-not-allowed text-sm font-bold outline-none"
                    />
                </div>
                <div>
                    <label className="block text-xs font-black text-slate-600 dark:text-slate-400 mb-2">البريد الإلكتروني (يُعدل من الإعدادات فقط)</label>
                    <input 
                        type="email"
                        readOnly={true}
                        value={reqEmail}
                        placeholder="لا يوجد بريد مسجل..."
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-900/50 text-slate-500 cursor-not-allowed text-sm font-bold outline-none"
                    />
                </div>
                <div>
                    <label className="block text-xs font-black text-slate-600 dark:text-slate-400 mb-2">رقم الهاتف (يُعدل من الإعدادات فقط)</label>
                    <input 
                        type="tel"
                        readOnly={true}
                        value={reqPhone}
                        placeholder="لا يوجد رقم هاتف مسجل..."
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-900/50 text-slate-500 cursor-not-allowed text-sm font-bold outline-none"
                    />
                </div>
                <div>
                    <label className="block text-xs font-black text-slate-600 dark:text-slate-400 mb-2">الدولة (تُعدل من الإعدادات فقط)</label>
                    <input 
                        type="text"
                        readOnly={true}
                        value={reqCountry}
                        placeholder="لا توجد دولة مسجلة..."
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-900/50 text-slate-500 cursor-not-allowed text-sm font-bold outline-none"
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-xs font-black text-slate-600 dark:text-slate-400 mb-2">الباقة المطلوبة</label>
                    <select 
                        value={reqPlan}
                        onChange={e => setReqPlan(e.target.value)}
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-900 whitespace-nowrap"
                    >
                        <option value="Basic">الباقة الأساسية سنوي (Basic Year)</option>
                        <option value="Pro">الباقة الاحترافية سنوي (Pro Year)</option>
                        <option value="Enterprise">باقة الأعمال سنوي (Enterprise / Business Year)</option>
                    </select>
                </div>
                <div className="md:col-span-2 flex justify-end">
                    <Button 
                        onClick={handleSubmitPurchaseRequest} 
                        isLoading={isSubmittingReq}
                        disabled={!!(identity?.requestedPlan && !identity?.confirmed)}
                        className={`w-full md:w-auto px-8 h-12 text-white rounded-2xl font-black shadow-lg ${
                            (identity?.requestedPlan && !identity?.confirmed)
                                ? 'bg-slate-400 dark:bg-slate-800 cursor-not-allowed shadow-none'
                                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20 animate-pulse-slow'
                        }`}
                    >
                        {(identity?.requestedPlan && !identity?.confirmed)
                            ? 'لديك طلب قيد المراجعة حالياً بالإدارة'
                            : 'إرسال طلب التفعيل / الترقية للادارة'
                        }
                    </Button>
                </div>
            </div>
        </div>

        {/* Device ID Display Section */}
        <div className="mb-10 p-8 sm:p-10 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-[0_8px_32px_rgba(0,0,0,0.03)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.1)] flex flex-col md:flex-row items-center justify-between gap-8 group transition-all hover:border-blue-200 dark:hover:border-blue-900/50">
            <div className="flex items-center gap-5 sm:gap-6 flex-col sm:flex-row text-center sm:text-start">
                <div className="p-5 bg-slate-50 dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-slate-700 rounded-3xl group-hover:scale-110 transition-transform duration-300 group-hover:text-blue-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20">
                    <Smartphone size={36} strokeWidth={1.5} />
                </div>
                <div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight mb-2">معرف الجهاز (Anchor ID)</h3>
                    <p className="text-sm text-slate-500 font-medium">هذا الكود فريد لجهازك، انسخه وأرسله للدعم الفني مع الدفع للتفعيل.</p>
                </div>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950/50 px-6 sm:px-8 py-5 rounded-3xl border border-slate-200 dark:border-slate-800 w-full md:w-auto overflow-hidden">
                <code className="font-mono text-2xl sm:text-3xl font-black tracking-[0.25em] text-slate-800 dark:text-white select-all text-center flex-grow flex items-center justify-center pt-2">
                    {deviceId || '.......'}
                </code>
                <button 
                    onClick={copyDeviceId}
                    className="p-3 bg-white dark:bg-slate-800 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all active:scale-95 shrink-0"
                    title="نسخ المعرف"
                >
                    <Copy size={20} />
                </button>
            </div>
        </div>

        {/* License Activation Banner */}
        <div className="bg-slate-900 rounded-[3rem] p-10 sm:p-14 flex flex-col lg:flex-row items-center justify-between gap-10 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/20 rounded-full -translate-y-1/2 translate-x-1/3 blur-[80px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/20 rounded-full translate-y-1/3 -translate-x-1/3 blur-[80px] pointer-events-none"></div>
            
            <div className="flex flex-col sm:flex-row items-center gap-8 relative z-10 text-center sm:text-start">
                <div className="p-6 bg-white/10 backdrop-blur-xl rounded-[2rem] border border-white/10 text-white shadow-2xl">
                    <Key size={48} strokeWidth={1.5} />
                </div>
                <div className="text-white space-y-3">
                    <h3 className="text-3xl font-black tracking-tight">هل وصلك مفتاح التفعيل؟</h3>
                    <p className="text-blue-100/70 font-medium text-lg">أدخل مفتاح الترخيص المكون من 32 رمز للترقية الفورية بكل أمان.</p>
                </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch gap-4 relative z-10 w-full lg:w-auto shrink-0">
                <a href="mailto:sales@technopower.store" className="w-full sm:w-auto">
                    <Button variant="secondary" className="w-full px-8 h-14 rounded-2xl font-black bg-white/5 hover:bg-white/10 text-white border border-white/10 backdrop-blur-md">
                        <Mail size={18} className="me-2" /> إدارة المبيعات
                    </Button>
                </a>
                <a href="https://wa.me/201020246503" target="_blank" rel="noreferrer" className="w-full sm:w-auto">
                    <Button variant="secondary" className="w-full px-8 h-14 rounded-2xl font-black bg-white/5 hover:bg-white/10 text-white border border-white/10 backdrop-blur-md">
                        <MessageCircle size={18} className="me-2" /> محادثة المبيعات
                    </Button>
                </a>
                <Button onClick={openActivationModal} className="w-full sm:w-auto bg-blue-500 text-white hover:bg-blue-400 border-none shadow-[0_8px_20px_rgba(59,130,246,0.3)] px-10 h-14 rounded-2xl font-black text-base">
                    إدخال رمز الترخيص
                </Button>
            </div>
        </div>
      </div>

      <LicenseActivationModal isOpen={isActivationOpen} onClose={() => setIsActivationOpen(false)} />
      
      <ConfirmDialog 
        isOpen={showFreeConfirm} 
        onClose={() => setShowFreeConfirm(false)} 
        onConfirm={handleActivateFree}
        title="تفعيل التراخيص المجانية"
        message="هل أنت متأكد؟ تفعيل الخطة المجانية آمن تماماً، وسيتم الحفاظ على كافة بياناتك الحالية ومبيعاتك ومخزونك للبدء مباشرة."
        confirmText="نعم، موافق على التفعيل"
        cancelText="إلغاء الترقية"
        isLoading={isActivatingFree}
      />

      <ConfirmDialog 
        isOpen={showTrialConfirm} 
        onClose={() => setShowTrialConfirm(false)} 
        onConfirm={handleActivateTrial}
        title="بدء التجربة المفتوحة"
        message="سيتم منحك صلاحيات المدير بكامل إمكانيات برو بلس لمدة ٣ أيام بشكل مجاني، مع العلم أنه لا يمكن تكرار التجربة على نفس الجهاز مرة أخرى."
        confirmText="نعم، بدء التجربة"
        cancelText="التراجع"
        isLoading={isActivatingTrial}
      />

      {/* Installment Plan Request Modal */}
      <Modal 
        isOpen={isInstallmentModalOpen} 
        onClose={() => setIsInstallmentModalOpen(false)} 
        title={
          <div className="flex items-center gap-2.5">
            <Wallet className="text-emerald-500" />
            <span>طلب خطة تقسيط ميسرة - باقة {selectedPlanForInstallment === 'Basic' ? 'Basic' : selectedPlanForInstallment === 'Pro' ? 'Pro' : 'Business'}</span>
          </div>
        }
      >
        {isInstallmentSuccess ? (
          <div className="text-center py-8 space-y-6">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Check className="text-emerald-600 dark:text-emerald-400" size={32} strokeWidth={3} />
            </div>
            <div className="space-y-2">
              <h4 className="text-xl font-black text-slate-800 dark:text-white">تم إرسال طلب التقسيط بنجاح!</h4>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
                شكراً لثقتكم بنا. لقد تلقينا طلبكم وسيتم التواصل معكم من قبل أحد ممثلي المبيعات لترتيب إجراءات التقسيط وتفعيل الباقة خلال <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">24 ساعة</span> بمشيئة الله.
              </p>
            </div>
            <div className="pt-4">
              <Button 
                onClick={() => setIsInstallmentModalOpen(false)}
                className="px-8 h-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black"
              >
                موافق
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitInstallmentRequest} className="space-y-6">
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border-r-4 border-emerald-500 p-4 rounded-l-2xl">
              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 leading-relaxed">
                يرجى إدخال الرقم القومي ونوع النشاط لإتمام طلب التقسيط. تماشياً مع سياسة الموقع، يتم جلب بياناتك تلقائياً كـ (بريد وهاتف واسم) من ملفك الشخصي ولا يمكن تعديلها إلا من الإعدادات.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-600 dark:text-slate-400 mb-2">الاسم بالكامل (من الإعدادات)</label>
                <input 
                  type="text"
                  readOnly={true}
                  value={instName}
                  placeholder="لا يوجد اسم مسجل..."
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-500 cursor-not-allowed text-sm font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 dark:text-slate-400 mb-2">البريد الإلكتروني (من الإعدادات)</label>
                <input 
                  type="email"
                  readOnly={true}
                  value={instEmail}
                  placeholder="لا يوجد بريد مسجل..."
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-500 cursor-not-allowed text-sm font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 dark:text-slate-400 mb-2">رقم الهاتف / الواتساب (من الإعدادات)</label>
                <input 
                  type="tel"
                  readOnly={true}
                  value={instPhone}
                  placeholder="لا يوجد هاتف مسجل..."
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-500 cursor-not-allowed text-sm font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 dark:text-slate-400 mb-2">الرقم القومي (البطاقة الشخصية) / الهوية الوطنية</label>
                <input 
                  type="text"
                  required
                  maxLength={14}
                  value={instNationalId}
                  onChange={e => setInstNationalId(e.target.value)}
                  placeholder="الرقم القومي الخاص بك للتوثيق..."
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none select-all focus:bg-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-black text-slate-600 dark:text-slate-400 mb-2">نوع النشاط التجاري / المشروع</label>
                <input 
                  type="text"
                  required
                  value={instBusinessType}
                  onChange={e => setInstBusinessType(e.target.value)}
                  placeholder="مثال: سوبرماركت، مطعم، تجارة ملابس، مقاولات..."
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none focus:bg-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-black text-slate-600 dark:text-slate-400 mb-2">خطة التقسيط المتاحة</label>
                <select 
                  disabled={true}
                  value="12"
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-500 cursor-not-allowed text-sm font-bold outline-none"
                >
                  <option value="12">تقسيط على ١٢ شهر فقط (الخطة المتاحة)</option>
                </select>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800/60">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsInstallmentModalOpen(false)}
                className="h-12 px-6 rounded-2xl font-bold border-slate-200 text-slate-500 dark:border-slate-800/80 hover:bg-slate-50"
              >
                إلغاء
              </Button>
              <Button 
                type="submit" 
                isLoading={isSubmittingInstallment}
                className="h-12 px-8 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/20"
              >
                إرسال طلب خطة التقسيط
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Purchase Request Success Modal */}
      <Modal 
        isOpen={isPurchaseSuccessOpen} 
        onClose={() => setIsPurchaseSuccessOpen(false)} 
        title={
          <div className="flex items-center gap-2.5">
            <Crown className="text-blue-500 animate-pulse" />
            <span>تم استلام طلب التفعيل / الترقية</span>
          </div>
        }
      >
        <div className="text-center py-8 space-y-6">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Check className="text-blue-600 dark:text-blue-400" size={32} strokeWidth={3} />
          </div>
          <div className="space-y-3">
            <h4 className="text-xl font-black text-slate-800 dark:text-white">تم إرسال طلب الاشتراك بنجاح!</h4>
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
              تم استلام الطلب وسيتم الرد عليه خلال <span className="text-blue-600 dark:text-blue-400 font-extrabold">٢٤ ساعة</span> من ممثلي خدمة العملاء.
            </p>
          </div>
          <div className="pt-4">
            <Button 
              onClick={() => setIsPurchaseSuccessOpen(false)}
              className="px-8 h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black"
            >
              موافق
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PricingPage;
