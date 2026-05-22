import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, Crown, ShieldCheck, Zap, Star, Key, Heart, Info, MessageCircle, Smartphone, Copy, Check, Sparkles, Building2, Store, Layers, Mail, Tag, X, ArrowRight } from 'lucide-react';
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
    variant?: 'default' | 'glow' | 'solid',
    isCurrentPlan?: boolean,
    delay?: number,
    currency?: 'USD' | 'EGP',
    licenseType?: string
}> = ({ title, price, oldPrice, discount, period, features, limits, popular, icon, color, description, buttonText = "اشترك الآن", onSubscribe, variant = 'default', isCurrentPlan = false, delay = 0, currency = 'USD', licenseType }) => {
    
    const currencySymbol = currency === 'USD' ? '$' : 'ج.م';
    // Style configurations based on variant
    let containerClass = popular 
        ? 'border-indigo-500/50 shadow-[0_32px_64px_-16px_rgba(79,70,229,0.2)] bg-white dark:bg-slate-900 border-2 relative overflow-hidden flex flex-col h-full rounded-[2.5rem] transition-all duration-500 ring-4 ring-indigo-500/5'
        : variant === 'glow'
        ? 'border-slate-200/60 dark:border-slate-800/50 shadow-[0_16px_32px_-8px_rgba(0,0,0,0.03)] bg-white/70 dark:bg-slate-900/80 backdrop-blur-3xl relative overflow-hidden flex flex-col h-full rounded-[2rem] border transition-all duration-500'
        : 'border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 relative overflow-hidden flex flex-col h-full rounded-[2rem] border transition-all duration-500';

    if (isCurrentPlan) {
        containerClass += ' ring-2 ring-emerald-500';
    }

    return (
        <div 
            className={containerClass}
        >
            {popular && (
                <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 rounded-t-full shadow-[0_0_20px_rgba(79,70,229,0.3)]"></div>
            )}
            
            {popular && discount && discount !== "0%" && (
                <div className="absolute top-6 left-6 bg-emerald-50 text-white text-[10px] font-black px-3.5 py-1.5 rounded-full shadow-lg shadow-emerald-500/20 z-30">
                    توفير {discount}
                </div>
            )}
            
            {(variant === 'glow' || popular) && discount && discount !== "0%" && !popular && (
                <div className="absolute top-6 left-6 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 text-xs font-black px-4 py-1.5 rounded-full border border-indigo-500/10 shadow-sm shadow-emerald-500/5 transition-all">
                    خصم {discount}
                </div>
            )}

            <div className="p-8 md:p-10 flex-grow flex flex-col relative z-20">
                <div className="flex items-center gap-5 mb-5">
                    <div 
                        className={`w-16 h-16 rounded-[1.25rem] ${color} flex items-center justify-center text-white shadow-xl shadow-current/20 ring-4 ring-white dark:ring-slate-900 overflow-hidden relative group`}
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
                
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-8 min-h-[44px] leading-relaxed opacity-90">{description}</p>
                
                    <div className="flex flex-col mb-10 pt-6 border-t border-slate-100 dark:border-slate-800">
                        <div className="h-6 mb-1.5 flex items-center gap-3">
                            {oldPrice && <span className="text-slate-400 text-sm line-through font-bold decoration-slate-300 dark:decoration-slate-600 opacity-70">{currency === 'USD' ? oldPrice : toArabicIndic(oldPrice)} {currencySymbol}</span>}
                            {discount && discount !== "0%" && (
                                <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-md">
                                    وفر {discount}
                                </span>
                            )}
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className={`font-black tracking-tighter transition-all duration-500 ${price === '0' ? 'text-5xl' : 'text-6xl'} ${popular ? 'text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700 dark:from-indigo-400 dark:via-blue-400 dark:to-indigo-500' : 'text-slate-800 dark:text-white'}`}>
                                {price === '0' ? 'مجاناً' : (currency === 'USD' ? price : toArabicIndic(price))}
                            </span>
                            {price !== '0' && <span className="text-slate-500 font-bold text-base bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-xl">{currencySymbol} / {period}</span>}
                        </div>
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
        </div >
    );
};

const PricingPage: React.FC<{ hideHeader?: boolean }> = ({ hideHeader }) => {
  const navigate = useNavigate();
  const { activateFreePlan, activateTrial, deviceId } = useLicense();
  const { addToast } = useToasts();
  
  const [isActivationOpen, setIsActivationOpen] = useState(false);
  const [showFreeConfirm, setShowFreeConfirm] = useState(false);
  const [showTrialConfirm, setShowTrialConfirm] = useState(false);
  const [isActivatingFree, setIsActivatingFree] = useState(false);
  const [isActivatingTrial, setIsActivatingTrial] = useState(false);
  const { licenseInfo } = useLicense();
  
  const [isYearly, setIsYearly] = useState(true);
  const [currency, setCurrency] = useState<'EGP' | 'USD'>('USD');

  // Promo Code State
  const [promoCode, setPromoCode] = useState('');
  const [activeDiscount, setActiveDiscount] = useState<{type: 'percentage' | 'fixed', value: number, code: string} | null>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  const [usdPricing, setUsdPricing] = useState({
      basicMonthly: { price: "10", oldPrice: "15", discount: "0%", currency: 'USD' },
      proMonthly: { price: "25", oldPrice: "30", discount: "0%", currency: 'USD' },
      businessMonthly: { price: "40", oldPrice: "50", discount: "0%", currency: 'USD' },
      basicYearly: { price: "100", oldPrice: "120", discount: "15%", currency: 'USD' },
      proYearly: { price: "240", oldPrice: "300", discount: "20%", currency: 'USD' },
      businessYearly: { price: "400", oldPrice: "500", discount: "20%", currency: 'USD' }
  });

  const [egpPricing, setEgpPricing] = useState({
      basicMonthly: { price: "460", oldPrice: "500", discount: "0%", currency: 'EGP' },
      proMonthly: { price: "799", oldPrice: "900", discount: "0%", currency: 'EGP' },
      businessMonthly: { price: "1840", oldPrice: "1840", discount: "0%", currency: 'EGP' },
      basicYearly: { price: "4965", oldPrice: "5520", discount: "10%", currency: 'EGP' },
      proYearly: { price: "8160", oldPrice: "9588", discount: "15%", currency: 'EGP' },
      businessYearly: { price: "17665", oldPrice: "22080", discount: "20%", currency: 'EGP' }
  });

  const [dynamicFeatures, setDynamicFeatures] = useState<Record<string, string[]> | null>(null);

  const currentPricing = (() => {
    // If currency is USD, we prefer the local requests values (9, 17, 34) 
    // unless Firestore explicitly has USD data.
    if (currency === 'USD') return usdPricing;
    return egpPricing;
  })();

  useEffect(() => {
    let unsubscribeMarketing: () => void;
    let unsubscribePricing: () => void;
    
    const setupRealtime = async () => {
        const { db } = await import('../services/firebase');
        const { doc, onSnapshot } = await import('firebase/firestore');

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
                // If the data from Firestore is USD, update usdPricing, otherwise update egpPricing
                if (data.basicMonthly?.currency === 'USD') {
                    setUsdPricing(prev => ({ ...prev, ...data }));
                } else {
                    setEgpPricing(prev => ({ ...prev, ...data }));
                }
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
          const res = await adminToolService.validatePromoCode(promoCode.trim());
          if (res.valid) {
              setActiveDiscount({ type: res.discountType!, value: res.discountValue!, code: promoCode.trim() });
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

  const calculateDiscountedPrice = (planPricing: {price: string, oldPrice: string, discount: string}) => {
      if (!activeDiscount) return planPricing;
      
      const originalPrice = parseFloat(planPricing.price);
      if (isNaN(originalPrice) || originalPrice <= 0) return planPricing;

      let newPrice = originalPrice;
      if (activeDiscount.type === 'percentage') {
          newPrice = originalPrice - (originalPrice * (activeDiscount.value / 100));
      } else if (activeDiscount.type === 'fixed') {
          newPrice = Math.max(0, originalPrice - activeDiscount.value);
      }

      // Calculate total discount percentage from the oldPrice (or use existing discount if higher)
      const oldVal = parseFloat(planPricing.oldPrice) || originalPrice;
      const totalDiscountPct = Math.round(((oldVal - newPrice) / oldVal) * 100);

      return {
          price: Math.round(newPrice).toString(),
          oldPrice: oldVal.toString(),
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
          await api.wipeBusinessData();
          await activateFreePlan();
          addToast('تم تفعيل الخطة المجانية بنجاح.', 'success');
          setTimeout(() => {
              navigate('/');
          }, 500);
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
    
    if (type.includes('Free')) {
        features.push('المستخدمون: 1 مستخدم');
        features.push('الفروع: 1 فرع');
        features.push('المخازن: 1 مخزن');
        features.push('الخزينة: 1 خزينة');
        features.push('المنتجات: 30 منتج');
        features.push('الموردون: 1 مورد');
        features.push('الموظفون: 1 موظف');
        features.push('المبيعات: 5 مبيعات يومية / 800 مبيعات سنوية');
        features.push('حركات الخزينة: 2 حركة خزينة يومية');
    } else if (type.includes('Basic')) {
        features.push('المستخدمون: 1 مستخدم');
        features.push('المخازن: 1 مخزن');
        features.push('الخزينة: 1 خزينة');
        features.push('المنتجات: 120 منتج');
        features.push('الموردون: 3 موردين');
        features.push('الموظفون: 2 موظفين');
        features.push('المبيعات: عدد مبيعات غير محدود يومياً / 3500 مبيعات سنوية');
        features.push('إدارة المخزون والعمليات: التحويل الداخلي للمخزون - سجل النشاط - تصدير واستيراد إكسيل - قراءة الباركود');
        features.push('المحاسبة والمالية: محاسبة متقدمة - عملاء آجل - نظام التقسيط');
        features.push('التقارير والأداء: التقارير المتقدمة - أداء الموظفين');
        features.push('ميزات إضافية: ميزات الشركات - تصميم الفواتير والإشعارات');
    } else if (type.includes('Pro')) {
        features.push('المستخدمون: 5 مستخدمين');
        features.push('الفروع: 1 فرع');
        features.push('المخازن: 5 مخازن');
        features.push('الخزينة: 3 خزائن');
        features.push('المنتجات: عدد غير محدود من المنتجات');
        features.push('الموردون: 25 مورد');
        features.push('الموظفون: 10 موظفين');
        features.push('المبيعات وحركات الخزينة: عدد غير محدود من المبيعات اليومية والسنوية - عدد غير محدود من حركات الخزينة');
        features.push('شؤون الموظفين: شؤون الموظفين - إدارة المرتبات - تقييم أداء الموظفين - عمولات الموظفين');
        features.push('المحاسبة والمالية: إدارة الموازنات والتقديرات المالية - المحاسبة المتقدمة - عملاء آجل - نظام التقسيط');
        features.push('المخزون والعمليات: جرد المخزون - التحويل الداخلي للمخزون - سجل النشاط - تصدير واستيراد إكسيل - قراءة الباركود');
        features.push('الذكاء الاصطناعي والتقارير: الذكاء الاصطناعي - التقارير المتقدمة');
        features.push('ميزات إضافية: ميزات الشركات - إدارة الشحن - برنامج الولاء - إضافة شعار العمل - تصميم الفاتورة والإشعارات - النسخ الاحتياطي');
    } else if (type.includes('Business')) {
        features.push('الميزات اللامحدودة: عدد غير محدود من (المستخدمين - الفروع - المخازن - الخزائن - المنتجات - الموردين - الموظفين - المبيعات اليومية والسنوية - حركات الخزينة)');
        features.push('شؤون الموظفين المتقدمة: شؤون الموظفين - إدارة المرتبات والأجور - إدارة الإجازات والطلبات - أداء الموظفين - عمولات المناديب');
        features.push('التصنيع والإنتاج: أوامر التشغيل والعمل - إدارة التصنيع والإنتاج');
        features.push('المحاسبة والمالية: إدارة الموازنات والتقديرات المالية - المحاسبة المتقدمة - عملاء آجل - نظام التقسيط');
        features.push('الربط والتقنية: دعم API - الربط بمتجر إلكتروني - إدارة واتساب');
        features.push('المخزون والعمليات: جرد المخزون - التحويل الداخلي - سجل النشاط - تصدير واستيراد إكسيل - قراءة الباركود');
        features.push('الذكاء الاصطناعي والتقارير: الذكاء الاصطناعي - التقارير المتقدمة');
        features.push('ميزات الشركات والشركاء: ميزات الشركات - نظام الشركاء - إدارة الشحن - برنامج الولاء - رضا العملاء');
        features.push('الهدايا واللمسات الاحترافية: إيميل شركات من جوجل (هدية) - إضافة شعار العمل - تصميم الفواتير والإشعارات - النسخ الاحتياطي');
    } else if (type.includes('Trial')) {
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
          <div className="max-w-2xl mx-auto mb-10 flex flex-col md:flex-row items-stretch gap-4 justify-center">
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

          {/* Pricing Toggle & Currency Toggle */}
          <div className="flex flex-col items-center justify-center mt-6 gap-6">
              <div className="bg-white/80 backdrop-blur-md dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-800 p-2 rounded-full inline-flex font-black text-sm shadow-xl shadow-slate-200/20 dark:shadow-none relative">
                  <div className={`absolute top-2 bottom-2 w-[160px] bg-slate-900 dark:bg-white rounded-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isYearly ? 'translate-x-0' : '-translate-x-[160px]'}`} />
                  
                  <button 
                      onClick={() => setIsYearly(true)} 
                      className={`relative w-[160px] py-3.5 rounded-full transition-colors z-10 flex flex-col items-center justify-center ${isYearly ? 'text-white dark:text-slate-900' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                  >
                      <span>الاشتراك السنوي</span>
                  </button>
                  <button 
                      onClick={() => setIsYearly(false)} 
                      className={`relative w-[160px] py-3.5 rounded-full transition-colors z-10 flex flex-col items-center justify-center ${!isYearly ? 'text-white dark:text-slate-900' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                  >
                      <span>الاشتراك الشهري</span>
                  </button>

                  <div className="absolute -top-4 -right-4 rotate-12 z-20 pointer-events-none animate-bounce">
                      <span className="bg-gradient-to-br from-rose-400 to-rose-600 text-white text-[11px] font-black px-3 py-1 rounded-lg shadow-lg shadow-rose-500/30 border border-rose-400/50">وفر حتى 20% 🎉</span>
                  </div>
              </div>

              {/* Currency Toggle */}
              <div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <button 
                      onClick={() => setCurrency('USD')}
                      className={`px-6 py-2.5 rounded-xl font-black text-xs transition-all ${currency === 'USD' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                      USD ($)
                  </button>
                  <button 
                      onClick={() => setCurrency('EGP')}
                      className={`px-6 py-2.5 rounded-xl font-black text-xs transition-all ${currency === 'EGP' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                      EGP (LE)
                  </button>
              </div>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-16 relative z-10">
            <PricingCard 
                title="Basic"
                {...calculateDiscountedPrice(isYearly ? currentPricing.basicYearly : currentPricing.basicMonthly)}
                period={isYearly ? 'سنة' : 'شهر'}
                description="ابدأ بقوة وسهولة لإدارة متجرك الصغير مع واجهة استخدام بديهية."
                color="bg-slate-800"
                icon={<Store size={24} />}
                limits={getPlanDetails(isYearly ? 'Basic Year' : 'Basic').displayLimits}
                features={getPlanDetails(isYearly ? 'Basic Year' : 'Basic').features}
                isCurrentPlan={licenseInfo?.type === (isYearly ? 'Basic Year' : 'Basic')}
                onSubscribe={licenseInfo?.type === (isYearly ? 'Basic Year' : 'Basic') ? () => addToast('أنت مشترك بالفعل في هذه الباقة', 'info') : openActivationModal}
                variant="glow"
                delay={0.1}
                currency={currency}
                licenseType={licenseInfo?.type}
            />
            <PricingCard 
                title="Pro"
                {...calculateDiscountedPrice(isYearly ? currentPricing.proYearly : currentPricing.proMonthly)}
                period={isYearly ? 'سنة' : 'شهر'}
                description="ارتقِ لأقوى أدوات الإدارة والمتابعة المصممة للمشاريع المتنامية."
                popular={true}
                color="bg-blue-600"
                icon={<Crown size={24} />}
                limits={getPlanDetails(isYearly ? 'Pro Year' : 'Pro').displayLimits}
                features={getPlanDetails(isYearly ? 'Pro Year' : 'Pro').features}
                isCurrentPlan={licenseInfo?.type === (isYearly ? 'Pro Year' : 'Pro')}
                onSubscribe={licenseInfo?.type === (isYearly ? 'Pro Year' : 'Pro') ? () => addToast('أنت مشترك بالفعل في هذه الباقة', 'info') : openActivationModal}
                variant="glow"
                delay={0.2}
                currency={currency}
                licenseType={licenseInfo?.type}
            />
            <PricingCard 
                title="Business"
                {...calculateDiscountedPrice(isYearly ? currentPricing.businessYearly : currentPricing.businessMonthly)}
                period={isYearly ? 'سنة' : 'شهر'}
                description="بنية تحتية متينة وحلول مخصصة للمؤسسات والشركات الرائدة."
                color="bg-indigo-600"
                icon={<Building2 size={24} />}
                limits={getPlanDetails(isYearly ? 'Business Year' : 'Business').displayLimits}
                features={getPlanDetails(isYearly ? 'Business Year' : 'Business').features}
                isCurrentPlan={licenseInfo?.type === (isYearly ? 'Business Year' : 'Business')}
                onSubscribe={licenseInfo?.type === (isYearly ? 'Business Year' : 'Business') ? () => addToast('أنت مشترك بالفعل في هذه الباقة', 'info') : openActivationModal}
                variant="glow"
                delay={0.3}
                currency={currency}
                licenseType={licenseInfo?.type}
            />
        </div>

        {/* Free Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            <PricingCard 
                title="Trial (التجربة)"
                price="0"
                period={`${getPlanLimits('Trial').trialDays || 3} أيام`}
                description="اكتشف قوة النظام وتعرف على إمكانياته كاملة بشكل مجاني."
                color="bg-sky-500"
                icon={<Zap size={24} />}
                limits={getPlanDetails('Trial').displayLimits}
                features={getPlanDetails('Trial').features}
                isCurrentPlan={licenseInfo?.type === 'Trial'}
                buttonText="بدء التجربة الآن"
                onSubscribe={licenseInfo?.type === 'Trial' ? () => addToast('أنت في الفترة التجريبية بالفعل', 'info') : () => setShowTrialConfirm(true)}
                variant="default"
                delay={0.4}
                licenseType={licenseInfo?.type}
            />
            <PricingCard 
                title="Free Forever"
                price="0"
                period="للأبد"
                description="إذا كنت في بداية الطريق، فنحن ندعمك بخطة مصغرة مجانية بالكامل."
                color="bg-slate-400"
                icon={<Heart size={24} />}
                limits={getPlanDetails('Free').displayLimits}
                features={getPlanDetails('Free').features}
                isCurrentPlan={licenseInfo?.type === 'Free'}
                buttonText="اختر الخطة المجانية"
                onSubscribe={licenseInfo?.type === 'Free' ? () => addToast('أنت على الباقة المجانية بالفعل', 'info') : () => setShowFreeConfirm(true)}
                variant="default"
                delay={0.5}
                licenseType={licenseInfo?.type}
            />
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
                <a href="https://wa.me/201020246503" target="_blank" rel="noreferrer" className="w-full sm:w-auto">
                    <Button variant="secondary" className="w-full px-8 h-14 rounded-2xl font-black bg-white/5 hover:bg-white/10 text-white border border-white/10 backdrop-blur-md">
                        <MessageCircle size={18} className="me-2" /> محادثة الدعم
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
        message="هل أنت متأكد؟ تفعيل الخطة المجانية سيؤدي لمسح البيانات التجريبية الحالية، والبدء بسجل مبيعات ومخزون جديد لضمان الاستقرار."
        confirmText="نعم، موافق على التفعيل المحدود"
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
    </div>
  );
};

export default PricingPage;
