
import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { handleFirestoreError, OperationType } from '../services/firestoreErrorHandler';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useSettings } from '../hooks/useSettings';
import { useChangelog } from '../hooks/useChangelog';
import { api } from '../services/mockApi';
import type { StoreSettings, User, Role } from '../types';
import { 
    Save, Monitor, Shield, Database, ImageIcon, LayoutGrid, Crown,
    Palette, Info, ShoppingCart, Heart, Download, RefreshCw, Smartphone, 
    Copy, CheckCircle, ExternalLink, Cpu, Code2, ShieldCheck, Upload,
    Users, UserPlus, Lock, Check, X, Calendar, Zap, FileText, Trash2, Settings2, Key, History, HelpCircle, Globe, ShoppingBag, Link as LinkIcon, CheckCircle2, AlertCircle,
    Bell, Package, Store, ArrowLeftRight, TrendingUp, Activity, MessageSquare, Printer, Barcode, ChevronUp, ChevronDown, User as UserIcon
} from 'lucide-react';
import { useToasts } from '../hooks/useToasts';
import { useLicense } from '../hooks/useLicense';
import { useUserIdentity } from '../hooks/useUserIdentity';
import { CURRENCIES, toArabicIndic, formatCurrency } from '../utils/localization';
import { processImageFile } from '../utils/imageHelpers';
import Modal from '../components/ui/Modal';
import UserForm from '../components/users/UserForm';
import RoleFormModal from '../components/settings/RoleFormModal';
import { BranchManager } from '../components/settings/BranchManager';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { NAV_LINKS } from '../constants';
import { useTranslation } from '../hooks/useTranslation';
import { hardwareService, PrinterInfo } from '../services/hardwareService';

import { getPlanLimits } from '../utils/planPermissions';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableHomeGridItem = ({ id, title, icon: Icon, onRemove }: { id: string, title: string, icon: any, onRemove: () => void }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center justify-between p-3 rounded-2xl border-2 border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/10 transition-all">
            <div className="flex items-center gap-3">
                <div {...attributes} {...listeners} className="cursor-grab">
                    <LayoutGrid className="text-indigo-400" size={16} />
                </div>
                <input type="checkbox" className="w-4 h-4 text-indigo-600 cursor-pointer rounded" checked={true} onChange={onRemove} />
                <div className="p-2 rounded-xl bg-indigo-600 text-white"><Icon size={16}/></div>
                <span className="text-sm font-black text-indigo-600">{title}</span>
            </div>
        </div>
    );
};

const SettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { settings, updateSettings } = useSettings();
    const { changelogData } = useChangelog();
    const { addToast } = useToasts();
    const { licenseInfo, deviceId } = useLicense();
    const { identity, update: updateIdentity } = useUserIdentity();
    const { t } = useTranslation();

    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
    const [employeeSubTab, setEmployeeSubTab] = useState<'users' | 'roles'>('users');
    const [localSettings, setLocalSettings] = useState<StoreSettings | null>(null);
    const [printers, setPrinters] = useState<PrinterInfo[]>([]);
    const [isElectron, setIsElectron] = useState(false);

    const [isSaving, setIsSaving] = useState(false);
    const [confirmWipeData, setConfirmWipeData] = useState(false);
    const [confirmResetApp, setConfirmResetApp] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleHomeGridDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setLocalSettings((prev) => {
                if (!prev) return prev;
                const currentOrder = prev.homeGridItems || [];
                const oldIndex = currentOrder.indexOf(active.id as string);
                const newIndex = currentOrder.indexOf(over.id as string);
                return {
                    ...prev,
                    homeGridItems: arrayMove(currentOrder, oldIndex, newIndex),
                };
            });
        }
    };

    // Profile state
    const [profileData, setProfileData] = useState({
        name: '',
        email: '',
        phone: '',
        country: 'السعودية'
    });

    // Check if the current tab is allowed
    useEffect(() => {
        const limits = getPlanLimits(licenseInfo.type);
        const allowedTabs = [
            'profile',
            'business',
            ...(limits.maxBranches > 1 ? ['branches'] : []),
            ...(limits.hasEcommerceAPI ? ['ecommerce'] : []),
            ...(limits.hasLogoUpload || limits.hasCustomUi ? ['appearance', 'homepage'] : []),
            ...(limits.hasNotifications ? ['notifications'] : []),
            ...(limits.maxWarehouses > 1 || limits.hasOperations ? ['inventory'] : []),
            'pos',
            'hardware',
            ...(limits.hasHR || limits.maxUsers > 1 ? ['employees'] : []),
            ...(limits.hasMultipleInvoiceDesigns ? ['invoice'] : []),
            'subscription',
            'maintenance',
            'suggestion'
        ];

        if (!allowedTabs.includes(activeTab)) {
            setActiveTab('profile');
        }
        
        if (activeTab === 'employees' && employeeSubTab === 'roles' && limits.maxUsers <= 2) {
             setEmployeeSubTab('users');
        }
    }, [activeTab, licenseInfo.type, employeeSubTab]);

    useEffect(() => {
        if (identity) {
            setProfileData({
                name: identity.name || '',
                email: identity.email || '',
                phone: identity.phone || '',
                country: identity.country || 'السعودية'
            });
        }
    }, [identity]);

    useEffect(() => {
        setIsElectron(hardwareService.isElectron());
        if (hardwareService.isElectron()) {
            hardwareService.getPrinters().then(list => setPrinters(list));
        }
    }, []);

    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            await updateIdentity(profileData);
            addToast('تم تحديث الملف الشخصي بنجاح', 'success');
        } catch (error) {
            addToast('حدث خطأ أثناء حفظ الملف الشخصي', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Ecommerce States
    const [ecommercePlatform, setEcommercePlatform] = useState('salla');
    const [ecommerceApiKey, setEcommerceApiKey] = useState('');
    const [ecommerceStoreUrl, setEcommerceStoreUrl] = useState('');
    const [isEcommerceConnected, setIsEcommerceConnected] = useState(false);

    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [isRenewalsModalOpen, setIsRenewalsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editingRole, setEditingRole] = useState<Role | null>(null);

    const [policies, setPolicies] = useState({
        privacyPolicy: '',
        termsOfUse: '',
        intellectualProperty: '',
        userGuide: ''
    });
    const [activePolicyModal, setActivePolicyModal] = useState<string | null>(null);
    
    // Suggestions
    const [suggestionText, setSuggestionText] = useState('');
    const [suggestionPhone, setSuggestionPhone] = useState('');
    const [isSubmittingSuggestion, setIsSubmittingSuggestion] = useState(false);

    // Support Tickets
    const [ticketSubject, setTicketSubject] = useState('');
    const [ticketMessage, setTicketMessage] = useState('');
    const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

    useEffect(() => {
        const fetchPolicies = async () => {
            const path = 'app_policies/main';
            try {
                const docRef = doc(db, 'app_policies', 'main');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setPolicies(docSnap.data() as any);
                }
            } catch (e) {
                handleFirestoreError(e, OperationType.GET, path);
            }
        };
        fetchPolicies();
    }, []);

    useEffect(() => {
        if (settings) setLocalSettings(JSON.parse(JSON.stringify(settings)));
        fetchEmployeesData();
    }, [settings]);

    const fetchEmployeesData = async () => {
        try {
            const [u, r] = await Promise.all([api.getUsers(), api.getRoles()]);
            setUsers(u);
            setRoles(r);
        } catch (e) {
            console.error(e);
        }
    };

    const handleSave = async () => {
        if (!localSettings) return;
        setIsSaving(true);
        try {
            await updateSettings(localSettings);
            addToast('تم حفظ كافة الإعدادات بنجاح', 'success');
        } catch (e) { addToast('خطأ في الحفظ', 'error'); }
        finally { setIsSaving(false); }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && localSettings) {
            try {
                const base64 = await processImageFile(file, 300);
                setLocalSettings({ ...localSettings, logoUrl: base64 });
                addToast('تم رفع الشعار، اضغط حفظ للتأكيد.', 'success');
            } catch (err) { addToast('فشل معالجة الصورة', 'error'); }
        }
    };

    const handleSaveRole = async (roleData: any) => {
        setIsSaving(true);
        try {
            await api.saveRole(roleData);
            await fetchEmployeesData();
            addToast('تم حفظ الدور بنجاح', 'success');
            setIsRoleModalOpen(false);
        } catch (e) { addToast('فشل في حفظ الدور', 'error'); }
        finally { setIsSaving(false); }
    };

    // حساب الأيام المتبقية والمميزات
    const subscriptionDetails = useMemo(() => {
        if (!licenseInfo.activationDate || !licenseInfo.type) return null;

        const now = new Date().getTime();
        let remaining = 0;
        
        if (licenseInfo.expiresAt) {
            const expires = new Date(licenseInfo.expiresAt).getTime();
            remaining = Math.max(0, Math.ceil((expires - now) / (1000 * 60 * 60 * 24)));
        } else {
            // Fallback to calculation based on type and activation date
            const start = new Date(licenseInfo.activationDate).getTime();
            let totalDuration = 0;
            switch(licenseInfo.type) {
                case 'Free': totalDuration = Infinity; break;
                case 'Trial': totalDuration = 7; break;
                case 'Monthly': totalDuration = 30; break;
                case 'Semiannual': totalDuration = 182; break;
                case 'Yearly': totalDuration = 365; break;
                case 'Basic': totalDuration = 30; break;
                case 'Pro': totalDuration = 30; break;
                case 'Business': totalDuration = 30; break;
                case 'Lifetime': totalDuration = Infinity; break;
                default: totalDuration = 30;
            }
            if (totalDuration === Infinity) {
                remaining = Infinity;
            } else {
                remaining = Math.max(0, totalDuration - Math.floor((now - start) / (1000 * 60 * 60 * 24)));
            }
        }
        
        const limits = getPlanLimits(licenseInfo.type);
        let features: string[] = [];

        if (licenseInfo.type === 'Free') {
            features = [
                `${toArabicIndic(limits.maxWarehouses)} مخزن فقط`,
                `${toArabicIndic(limits.maxTreasuries)} خزينة فقط`,
                `${toArabicIndic(limits.maxProducts)} منتج كحد أقصى`,
                "إدارة عملاء أساسية",
                "دعم فني محدود"
            ];
        } else {
            features = [
                `${limits.maxWarehouses === 999 ? 'مخازن غير محدودة' : toArabicIndic(limits.maxWarehouses) + ' مخازن'}`,
                `${limits.maxTreasuries === 999 ? 'خزائن غير محدودة' : toArabicIndic(limits.maxTreasuries) + ' خزائن'}`,
                `${limits.maxProducts > 10000 ? 'منتجات غير محدودة' : toArabicIndic(limits.maxProducts) + ' منتج'}`,
                limits.hasAI ? "دعم الذكاء الاصطناعي (AI)" : null,
                limits.hasAccounting ? "نظام محاسبي متكامل" : null,
                limits.hasHR ? "إدارة الموظفين والرواتب" : null,
                limits.hasOperations ? "إدارة التصنيع والإنتاج" : null,
                limits.hasShipping ? "ربط شركات وعمليات الشحن" : null,
                limits.hasBackup ? "نسخ احتياطي سحابي" : null,
                "تحديثات النظام المستمرة",
                "دعم فني مباشر"
            ].filter(Boolean) as string[];
        }

        return { remaining, features };
    }, [licenseInfo]);

    if (!localSettings) return <div className="p-20 text-center animate-pulse font-black text-indigo-600">جاري تحميل الإعدادات...</div>;

    const navItems = [
        { id: 'profile', label: 'الملف الشخصي', icon: <UserIcon size={18} /> },
        { id: 'business', label: 'بيانات الشركة', icon: <Store size={18} /> },
        ...(getPlanLimits(licenseInfo.type).maxBranches > 1 ? [{ id: 'branches', label: 'إدارة الفروع', icon: <Store size={18} /> }] : []),
        ...(getPlanLimits(licenseInfo.type).hasEcommerceAPI ? [{ id: 'ecommerce', label: 'الربط الإلكتروني', icon: <Globe size={18} />, permission: 'manage_ecommerce_api' }] : []),
        ...(getPlanLimits(licenseInfo.type).hasLogoUpload || getPlanLimits(licenseInfo.type).hasCustomUi ? [{ id: 'appearance', label: 'تخصيص الواجهة', icon: <LayoutGrid size={18} /> }] : []),
        ...(getPlanLimits(licenseInfo.type).hasLogoUpload || getPlanLimits(licenseInfo.type).hasCustomUi ? [{ id: 'homepage', label: 'الشاشة الرئيسية', icon: <Activity size={18} /> }] : []),
        ...(getPlanLimits(licenseInfo.type).hasNotifications ? [{ id: 'notifications', label: 'الإشعارات', icon: <Bell size={18} /> }] : []),
        ...(getPlanLimits(licenseInfo.type).maxWarehouses > 1 || getPlanLimits(licenseInfo.type).hasOperations ? [{ id: 'inventory', label: 'إعدادات المخزون', icon: <Package size={18} /> }] : []),
        { id: 'pos', label: 'البيع والولاء', icon: <ShoppingCart size={18} /> },
        { id: 'hardware', label: 'الطابعة والباركود', icon: <Printer size={18} /> },
        ...(getPlanLimits(licenseInfo.type).hasHR || getPlanLimits(licenseInfo.type).maxUsers > 1 ? [{ id: 'employees', label: 'الموظفين والصلاحيات', icon: <Users size={18} /> }] : []),
        ...(getPlanLimits(licenseInfo.type).hasMultipleInvoiceDesigns ? [{ id: 'invoice', label: 'مصمم الفاتورة', icon: <Palette size={18} /> }] : []),
        { id: 'subscription', label: 'حالة الاشتراك', icon: <Crown size={18} /> },
        { id: 'maintenance', label: 'البيانات والصيانة', icon: <Database size={18} /> },
        { id: 'suggestion', label: 'إرسال اقتراح', icon: <MessageSquare size={18} /> },
    ];

    const inputClass = "w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 font-bold transition-all shadow-sm";
    const labelClass = "block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ms-1";

    const handleSubmitSuggestion = async () => {
        if (!suggestionText.trim()) return;
        if (!suggestionPhone.trim()) {
            addToast('يرجى إضافة رقم الهاتف للتواصل معك بخصوص هذا الاقتراح', 'warning');
            return;
        }

        setIsSubmittingSuggestion(true);
        try {
            // التحقق من الحد اليومي (3 اقتراحات)
            const userId = licenseInfo?.customerId || deviceId || 'unknown';
            const todayStr = new Date().toLocaleDateString();
            const spamKey = `app_suggestions_count_${todayStr}`;
            const currentCount = parseInt(localStorage.getItem(spamKey) || '0', 10);
            
            if (currentCount >= 3) {
                addToast('عذراً، يمكنك إرسال 3 اقتراحات فقط في اليوم الواحد.', 'error');
                return;
            }

            await addDoc(collection(db, 'app_suggestions'), {
                userId: userId,
                suggestionText: suggestionText,
                phone: suggestionPhone,
                createdAt: new Date().toISOString()
            });

            localStorage.setItem(spamKey, (currentCount + 1).toString());
            
            addToast('شكرًا لك! تم إرسال اقتراحك بنجاح للإدارة للتطوير.', 'success');
            setSuggestionText('');
            setSuggestionPhone('');
        } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, 'app_suggestions');
        } finally {
            setIsSubmittingSuggestion(false);
        }
    };

    const handleOpenTicket = async () => {
        if (!ticketSubject.trim() || !ticketMessage.trim()) {
            addToast('يرجى ملء جميع الحقول المطلوبة', 'warning');
            return;
        }

        setIsSubmittingTicket(true);
        try {
            const userId = licenseInfo?.customerId || deviceId || 'unknown';
            await addDoc(collection(db, 'app_support_tickets'), {
                userId: userId,
                storeName: localSettings.storeName || 'غير محدد',
                phone: localSettings.storePhone || 'غير محدد',
                subject: ticketSubject,
                message: ticketMessage,
                status: 'Open',
                createdAt: new Date().toISOString(),
                priority: 'Normal'
            });
            addToast('تم فتح التذكرة بنجاح. سيتم التواصل معك قريباً.', 'success');
            setTicketSubject('');
            setTicketMessage('');
        } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, 'app_support_tickets');
        } finally {
            setIsSubmittingTicket(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto animate-fadeIn pb-20">
            {/* Settings Header Hub */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 md:p-14 mb-10 relative overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.03)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)] flex flex-col md:flex-row justify-between items-center gap-10 border border-slate-100 dark:border-slate-800/60 transition-all">
                <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-blue-50 dark:bg-blue-900/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
                
                <div className="relative z-10 space-y-4 text-center md:text-start flex-1">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-slate-800 rounded-2xl border border-blue-100 dark:border-slate-700 mb-2">
                        <Settings2 size={16} className="text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">الإعدادات العامة</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">مركز التحكم الذكي</h1>
                    <p className="text-slate-500 font-medium text-lg">بوابة الإدارة الشاملة لنظام تكنو باور POS المتكامل.</p>
                </div>
                <div className="relative z-10 flex gap-4">
                    <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-700 text-center shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">إصدار النظام</p>
                        <p className="text-lg font-black text-slate-800 dark:text-white">v3.0.0 <span className="text-xs text-emerald-500 font-bold ms-2 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md">الترا</span></p>
                    </div>
                    <Button onClick={handleSave} isLoading={isSaving} className="h-full px-8 rounded-2xl font-bold border-none shadow-[0_4px_16px_rgba(37,99,235,0.2)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.3)] ring-0 transition-all">
                        <Save size={18} className="me-2" /> حفظ التغييرات
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <nav className="lg:col-span-1 space-y-1.5 h-fit sticky top-32">
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                        <div className="space-y-1.5">
                            {navItems.map(item => (
                                <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl font-bold text-sm transition-all ${activeTab === item.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                                    {React.cloneElement(item.icon as React.ReactElement, { size: 18, strokeWidth: activeTab === item.id ? 2.5 : 2 })} 
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-[0_4px_24px_rgba(0,0,0,0.02)] mt-6">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 ps-2">الدعم والسياسات</p>
                        <div className="space-y-1">
                            <button onClick={() => navigate('/pricing')} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-xs font-bold text-slate-600 hover:text-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"><Crown size={14}/> الخطط والاشتراكات</button>
                            <button onClick={() => setActivePolicyModal('userGuide')} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-xs font-bold text-slate-600 hover:text-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"><Info size={14}/> دليل الاستخدام</button>
                            <button onClick={() => setActivePolicyModal('privacyPolicy')} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-xs font-bold text-slate-600 hover:text-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"><Shield size={14}/> سياسة الخصوصية</button>
                            <button onClick={() => setActivePolicyModal('termsOfUse')} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-xs font-bold text-slate-600 hover:text-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"><FileText size={14}/> شروط الاستخدام</button>
                            <button onClick={() => setActivePolicyModal('intellectualProperty')} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-xs font-bold text-slate-600 hover:text-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"><ExternalLink size={14}/> حقوق الملكية</button>
                            <div className="pt-5 mt-3 border-t border-slate-100 dark:border-slate-800/60">
                                <button onClick={() => window.open('mailto:support@technopower.eg', '_blank')} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/10 text-blue-600 font-bold text-xs hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors">
                                    <MessageSquare size={14}/> تحدث مع المطور
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/20 dark:to-slate-900 rounded-[2rem] border border-indigo-100 dark:border-indigo-800/30 shadow-[0_4px_24px_rgba(0,0,0,0.02)] mt-6">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest ps-2">آخر تحديثات النظام</p>
                            <Zap size={14} className="text-indigo-500 animate-pulse" />
                        </div>
                        <div className="space-y-3">
                            {changelogData && changelogData.length > 0 ? (
                                <div className="bg-white dark:bg-slate-800/80 p-4 rounded-2xl shadow-sm border border-indigo-50/50 dark:border-slate-700/50 cursor-pointer hover:border-indigo-200 transition-colors" onClick={() => navigate('/system-updates')}>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="inline-block px-2 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold rounded-md">
                                            الإصدار {changelogData[0].version}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-bold">{new Date(changelogData[0].date).toLocaleDateString('ar-EG')}</span>
                                    </div>
                                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                                        {changelogData[0].title}
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                                        {changelogData[0].changes[0]}...
                                    </p>
                                </div>
                            ) : (
                                <div className="text-center text-xs text-slate-400 p-4">لا توجد تحديثات حالياً</div>
                            )}
                        </div>
                    </div>
                </nav>

                <div className="lg:col-span-3 space-y-8">
                    {activeTab === 'profile' && (
                        <Card title="الملف الشخصي والحساب" icon={<UserIcon className="text-indigo-500" size={24}/>}>
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">اسم المالك / المدير</label>
                                        <input 
                                            type="text" 
                                            value={profileData.name} 
                                            onChange={(e) => setProfileData({...profileData, name: e.target.value})} 
                                            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">رقم الجوال</label>
                                        <input 
                                            type="tel" 
                                            dir="ltr"
                                            value={profileData.phone} 
                                            onChange={(e) => setProfileData({...profileData, phone: e.target.value})} 
                                            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                            placeholder="+966xxxxxxxxx"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">البريد الإلكتروني</label>
                                        <input 
                                            type="email" 
                                            dir="ltr"
                                            value={profileData.email} 
                                            onChange={(e) => setProfileData({...profileData, email: e.target.value})} 
                                            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">الدولة</label>
                                        <select 
                                            value={profileData.country} 
                                            onChange={(e) => setProfileData({...profileData, country: e.target.value})} 
                                            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        >
                                            {['السعودية', 'مصر', 'الإمارات', 'الكويت', 'عمان', 'قطر', 'البحرين', 'الأردن', 'أخرى'].map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex justify-end pt-4">
                                    <button 
                                        onClick={handleSaveProfile}
                                        disabled={isSaving}
                                        className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all disabled:opacity-50"
                                    >
                                        <Save size={18} />
                                        {isSaving ? 'جاري الحفظ...' : 'حفظ الملف الشخصي'}
                                    </button>
                                </div>
                            </div>
                        </Card>
                    )}

                    {activeTab === 'business' && (
                        <Card title="بيانات الشركة (معلومات الأعمال)">
                            <div className="space-y-6">
                                <div className="flex flex-col md:flex-row gap-8 items-center border-b dark:border-slate-800 pb-8">
                                    <div className="relative group">
                                        <div className="w-40 h-40 rounded-4xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden shadow-inner group-hover:border-indigo-500 transition-colors">
                                            {localSettings.logoUrl ? <img src={localSettings.logoUrl} className="w-full h-full object-contain p-2" /> : <ImageIcon size={48} className="text-slate-300" />}
                                        </div>
                                        <label className="absolute inset-0 flex items-center justify-center bg-indigo-600/90 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-4xl font-black text-sm">
                                            <Upload size={24} className="me-2" /> تغيير اللوجو
                                            <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                        </label>
                                    </div>
                                    <div className="flex-grow space-y-4 w-full">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div><label className={labelClass}>اسم الشركة / المحل</label><input type="text" value={localSettings.storeName || ''} onChange={e => setLocalSettings({...localSettings, storeName: e.target.value})} className={inputClass} placeholder="اسم نشاطك التجاري..." /></div>
                                            <div><label className={labelClass}>الرقم الضريبي</label><input type="text" value={localSettings.taxRegisterNumber || ''} onChange={e => setLocalSettings({...localSettings, taxRegisterNumber: e.target.value})} className={inputClass} placeholder="الرقم الضريبي للقيمة المضافة..." /></div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div><label className={labelClass}>رقم الموبايل للتواصل</label><input type="text" dir="ltr" value={localSettings.storePhone || ''} onChange={e => setLocalSettings({...localSettings, storePhone: e.target.value})} className={inputClass} placeholder="05xxxxxxxx" /></div>
                                            <div><label className={labelClass}>البريد الإلكتروني للتواصل</label><input type="email" dir="ltr" value={localSettings.storeEmail || ''} onChange={e => setLocalSettings({...localSettings, storeEmail: e.target.value})} className={inputClass} placeholder="email@example.com" /></div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                                            <div><label className={labelClass}>العنوان / الفروع</label><input type="text" value={localSettings.storeAddress || ''} onChange={e => setLocalSettings({...localSettings, storeAddress: e.target.value})} className={inputClass} placeholder="المنطقة، المدينة، الشارع..." /></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-2">
                                    <div><label className={labelClass}>العملة</label><select value={localSettings.currency || 'SAR'} onChange={e => setLocalSettings({...localSettings, currency: e.target.value as any})} className={inputClass}>{Object.entries(CURRENCIES).map(([code, c]) => <option key={code} value={code}>{c.name} ({c.symbol})</option>)}</select></div>
                                    <div><label className={labelClass}>الضريبة (%)</label><input type="number" value={localSettings.vatRate || 0} onChange={e => setLocalSettings({...localSettings, vatRate: parseFloat(e.target.value)||0})} className={inputClass} /></div>
                                    <div><label className={labelClass}>الفاتورة القادمة</label><input type="number" value={localSettings.nextInvoiceNumber || 0} onChange={e => setLocalSettings({...localSettings, nextInvoiceNumber: parseInt(e.target.value)||0})} className={inputClass} /></div>
                                    <div><label className={labelClass}>الهدف البيعي الشهري</label><input type="number" value={localSettings.monthlySalesGoal || ''} onChange={e => setLocalSettings({...localSettings, monthlySalesGoal: parseFloat(e.target.value)})} className={inputClass} placeholder="الهدف للوحة التحكم" /></div>
                                </div>
                                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/20 text-[10px] font-bold text-amber-700 dark:text-amber-400 leading-relaxed">
                                    * ملاحظة: هذه البيانات تظهر تلقائياً في ترويسة وتذييل الفواتير المطبوعة والإلكترونية.
                                </div>
                            </div>
                        </Card>
                    )}

                    {activeTab === 'branches' && (
                        <BranchManager />
                    )}

                    {activeTab === 'ecommerce' && (
                        <div className="space-y-6 animate-fadeIn">
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Card className="md:col-span-2 p-8 rounded-[2.5rem] space-y-6">
                                    <div className="space-y-4">
                                        <label className={labelClass}>اختر المنصة</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {['salla', 'zid', 'shopify'].map(p => (
                                                <button 
                                                    key={p}
                                                    onClick={() => setEcommercePlatform(p)}
                                                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${ecommercePlatform === p ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' : 'border-slate-100 dark:border-slate-800 hover:border-indigo-200 text-slate-400'}`}
                                                >
                                                    <ShoppingBag size={24} />
                                                    <span className="font-black text-xs uppercase">{p}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <label className={labelClass}>رابط المتجر</label>
                                        <div className="relative">
                                            <LinkIcon className="absolute top-1/2 -translate-y-1/2 start-4 text-slate-400" size={18} />
                                            <input 
                                                type="text"
                                                value={ecommerceStoreUrl}
                                                onChange={e => setEcommerceStoreUrl(e.target.value)}
                                                placeholder="https://your-store.com"
                                                className={inputClass + " ps-12 h-14"}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <label className={labelClass}>مفتاح الـ API (Access Token)</label>
                                        <div className="relative">
                                            <Key className="absolute top-1/2 -translate-y-1/2 start-4 text-slate-400" size={18} />
                                            <input 
                                                type="password"
                                                value={ecommerceApiKey}
                                                onChange={e => setEcommerceApiKey(e.target.value)}
                                                placeholder="********************************"
                                                className={inputClass + " ps-12 h-14"}
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <Button 
                                            variant="outline" 
                                            onClick={async () => {
                                                if (!ecommerceApiKey || !ecommerceStoreUrl) {
                                                    addToast('يرجى إدخال الرابط ومفتاح الـ API أولاً', 'error');
                                                    return;
                                                }
                                                setIsSaving(true);
                                                await new Promise(resolve => setTimeout(resolve, 1500));
                                                setIsEcommerceConnected(true);
                                                addToast('تم التحقق من الاتصال بالمتجر بنجاح', 'success');
                                                setIsSaving(false);
                                            }} 
                                            disabled={isSaving}
                                            className={`w-full h-14 rounded-2xl font-black ${isEcommerceConnected ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : ''}`}
                                        >
                                            {isEcommerceConnected ? <CheckCircle2 className="me-2" /> : <Globe className="me-2" />}
                                            {isEcommerceConnected ? 'تم الاتصال بنجاح' : 'اختبار الاتصال بالمتجر'}
                                        </Button>
                                    </div>
                                </Card>

                                <div className="space-y-6">
                                    <Card className="p-6 rounded-[2rem] bg-indigo-600 text-white border-none shadow-xl shadow-indigo-600/20">
                                        <h3 className="font-black text-lg mb-3 flex items-center gap-2">
                                            <Zap size={20} /> خيارات المزامنة
                                        </h3>
                                        <div className="space-y-4">
                                            <label className="flex items-center gap-3 cursor-pointer group">
                                                <div className="w-5 h-5 rounded border-2 border-white/30 flex items-center justify-center group-hover:border-white transition-all">
                                                    <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                                                </div>
                                                <span className="text-sm font-bold">مزامنة المخزون تلقائياً</span>
                                            </label>
                                            <label className="flex items-center gap-3 cursor-pointer group">
                                                <div className="w-5 h-5 rounded border-2 border-white/30 flex items-center justify-center group-hover:border-white transition-all">
                                                    <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                                                </div>
                                                <span className="text-sm font-bold">استيراد الطلبات لحظياً</span>
                                            </label>
                                            <label className="flex items-center gap-3 cursor-pointer group">
                                                <div className="w-5 h-5 rounded border-2 border-white/30 flex items-center justify-center group-hover:border-white transition-all">
                                                    <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                                                </div>
                                                <span className="text-sm font-bold">تحديث الأسعار في المتجر</span>
                                            </label>
                                        </div>
                                    </Card>

                                    <Card className="p-6 rounded-[2rem] border-amber-100 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900/30">
                                        <div className="flex gap-3 text-amber-700 dark:text-amber-400">
                                            <AlertCircle className="shrink-0" size={20} />
                                            <div>
                                                <h4 className="font-black text-sm mb-1">تعليمات الربط</h4>
                                                <p className="text-[10px] font-bold leading-relaxed">يرجى التأكد من إنشاء تطبيق جديد في لوحة تحكم التاجر بمنصة سلة أو زد للحصول على مفتاح الـ API الخاص بمتجرك.</p>
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'appearance' && (
                        <Card title="تخصيص الواجهة الرئيسية">
                            <div className="space-y-6">
                                {getPlanLimits(licenseInfo.type).hasCustomUi ? (
                                    <>
                                        <div className="space-y-3">
                                            <h4 className="text-sm font-black text-slate-700 dark:text-white">شكل الصفحة الرئيسية</h4>
                                            <p className="text-xs text-slate-500 font-bold mb-4">اختر النمط المناسب لعرض الصفحة الرئيسية للنظام</p>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div 
                                                    onClick={() => setLocalSettings({...localSettings, homePageStyle: 'modern'})}
                                                    className={`p-6 rounded-3xl border-2 cursor-pointer transition-all ${(!localSettings.homePageStyle || localSettings.homePageStyle === 'modern') ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10 shadow-lg shadow-indigo-500/10' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}
                                                >
                                                    <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 mb-4 mx-auto"><LayoutGrid size={32}/></div>
                                                    <h5 className="font-black text-center text-slate-800 dark:text-white">الشكل الحديث (الجديد)</h5>
                                                    <p className="text-[10px] text-center text-slate-500 mt-2">يعرض الأقسام بشكل كروت ملونة وجذابة مع أيقونات بصرية.</p>
                                                </div>
                                                <div 
                                                    onClick={() => setLocalSettings({...localSettings, homePageStyle: 'classic'})}
                                                    className={`p-6 rounded-3xl border-2 cursor-pointer transition-all ${localSettings.homePageStyle === 'classic' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10 shadow-lg shadow-indigo-500/10' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}
                                                >
                                                    <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 mb-4 mx-auto"><Activity size={32}/></div>
                                                    <h5 className="font-black text-center text-slate-800 dark:text-white">الشكل الكلاسيكي (القديم)</h5>
                                                    <p className="text-[10px] text-center text-slate-500 mt-2">يعرض إحصائيات سريعة ووصول سريع للأدوات التقليدية.</p>
                                                </div>
                                                <div 
                                                    onClick={() => setLocalSettings({...localSettings, homePageStyle: 'bento'})}
                                                    className={`p-6 rounded-3xl border-2 cursor-pointer transition-all ${localSettings.homePageStyle === 'bento' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10 shadow-lg shadow-indigo-500/10' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}
                                                >
                                                    <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4 mx-auto"><LayoutGrid size={32}/></div>
                                                    <h5 className="font-black text-center text-slate-800 dark:text-white">شكل مساحة العمل (Bento)</h5>
                                                    <p className="text-[10px] text-center text-slate-500 mt-2">تصميم متقدم يعرض أدوات الوصول السريع مع ملخص للإحصائيات بشكل متداخل.</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <h4 className="text-sm font-black text-slate-700 dark:text-white">شكل نقاط البيع (فاتورة المبيعات)</h4>
                                            <p className="text-xs text-slate-500 font-bold mb-4">اختر التصميم المناسب لشاشة المبيعات (نظام كاشير أو نظام فاتورة المبيعات)</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div 
                                                    onClick={() => setLocalSettings({...localSettings, posLayout: 'grid'})}
                                                    className={`p-6 rounded-3xl border-2 cursor-pointer transition-all ${localSettings.posLayout === 'grid' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10 shadow-lg shadow-indigo-500/10' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}
                                                >
                                                    <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 mb-4 mx-auto"><LayoutGrid size={32}/></div>
                                                    <h5 className="font-black text-center text-slate-800 dark:text-white">تصميم الكاشير للأسواق (Grid)</h5>
                                                    <p className="text-[10px] text-center text-slate-500 mt-2">شكل مبسط، سريع للكاشير والسوبرماركت.</p>
                                                </div>
                                                <div 
                                                    onClick={() => setLocalSettings({...localSettings, posLayout: 'invoice'})}
                                                    className={`p-6 rounded-3xl border-2 cursor-pointer transition-all ${(!localSettings.posLayout || localSettings.posLayout === 'invoice') ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10 shadow-lg shadow-indigo-500/10' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}
                                                >
                                                    <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-slate-800 flex items-center justify-center text-emerald-600 mb-4 mx-auto"><FileText size={32}/></div>
                                                    <h5 className="font-black text-center text-slate-800 dark:text-white">جدول فاتورة المبيعات المنظم (الافتراضي)</h5>
                                                    <p className="text-[10px] text-center text-slate-500 mt-2">تصميم متقدم لشركات الجملة والأنشطة التجارية الكبيرة يعرض كجدول.</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                                            <h4 className="text-sm font-black text-slate-700 dark:text-white">حجم خطوط النظام</h4>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div onClick={() => setLocalSettings({...localSettings, fontSize: 'small'})} className={`p-4 cursor-pointer text-center rounded-2xl border-2 ${localSettings.fontSize === 'small' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10' : 'border-slate-200 dark:border-slate-700'} text-xs`}>صغير</div>
                                                <div onClick={() => setLocalSettings({...localSettings, fontSize: 'medium'})} className={`p-4 cursor-pointer text-center rounded-2xl border-2 ${(!localSettings.fontSize || localSettings.fontSize === 'medium') ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10' : 'border-slate-200 dark:border-slate-700'} text-sm`}>متوسط (تلقائي)</div>
                                                <div onClick={() => setLocalSettings({...localSettings, fontSize: 'large'})} className={`p-4 cursor-pointer text-center rounded-2xl border-2 ${localSettings.fontSize === 'large' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10' : 'border-slate-200 dark:border-slate-700'} text-lg`}>كبير</div>
                                            </div>
                                        </div>

                                        <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                                            <h4 className="text-sm font-black text-slate-700 dark:text-white">شكل الأزرار</h4>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div onClick={() => setLocalSettings({...localSettings, buttonStyle: 'rounded'})} className={`p-4 cursor-pointer text-center rounded-2xl border-2 ${(!localSettings.buttonStyle || localSettings.buttonStyle === 'rounded') ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10' : 'border-slate-200 dark:border-slate-700'}`}>جوانب دائرية عادية</div>
                                                <div onClick={() => setLocalSettings({...localSettings, buttonStyle: 'squared'})} className={`p-4 cursor-pointer text-center rounded-2xl border-2 ${localSettings.buttonStyle === 'squared' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10' : 'border-slate-200 dark:border-slate-700'}`}>زوايا حادة</div>
                                                <div onClick={() => setLocalSettings({...localSettings, buttonStyle: 'pill'})} className={`p-4 cursor-pointer text-center rounded-2xl border-2 ${localSettings.buttonStyle === 'pill' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10' : 'border-slate-200 dark:border-slate-700'}`}>كبسولة (دائرية بالكامل)</div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="p-8 bg-indigo-50 dark:bg-indigo-900/10 rounded-3xl border border-indigo-100 dark:border-indigo-800 text-center">
                                        <Crown size={48} className="mx-auto text-amber-500 mb-4" />
                                        <h4 className="text-lg font-black text-slate-800 dark:text-white mb-2">ميزات التخصيص المتقدمة</h4>
                                        <p className="text-xs text-slate-500 font-bold">هذه الميزات (تغيير أشكال الصفحة الرئيسية، نقاط البيع، حجم الخطوط، وشكل الأزرار) متوفرة فقط في الباقات المتقدمة.</p>
                                        <Button 
                                            variant="outline" 
                                            onClick={() => navigate('/pricing')}
                                            className="mt-6 font-black border-indigo-600 text-indigo-600"
                                        >
                                            ترقية الباقة الآن
                                        </Button>
                                    </div>
                                )}
                                
                                {getPlanLimits(licenseInfo.type).hasLogoUpload && (
                                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                                        <label className={labelClass}>اللون الأساسي للبرنامج</label>
                                        <div className="flex gap-2 items-center">
                                            <input type="color" value={localSettings.buttonColor || '#4f46e5'} onChange={e => setLocalSettings({...localSettings, buttonColor: e.target.value})} className="w-12 h-12 rounded-xl cursor-pointer border-none shadow-sm" />
                                            <span className="text-xs font-bold text-slate-500">سيتم تطبيق هذا اللون على الأزرار الأساسية في النظام.</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}

                    {activeTab === 'notifications' && (
                        <Card title="الإشعارات (الإخطارات)">
                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-transparent hover:border-indigo-500/20 transition-all">
                                    <div className="flex items-center gap-5">
                                        <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg ring-4 ring-indigo-600/10"><Bell size={24}/></div>
                                        <div><h4 className="text-base font-black">تشغيل / إيقاف الإشعارات</h4><p className="text-xs font-bold text-slate-500">التحكم العام في ظهور التنبيهات على الشاشة.</p></div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={localSettings.notificationSettings?.enabled} onChange={e => setLocalSettings({...localSettings, notificationSettings: {...localSettings.notificationSettings!, enabled: e.target.checked}})} />
                                        <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                                    <div className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                                        <div className="flex justify-between items-center">
                                            <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-2xl"><TrendingUp size={24}/></div>
                                            <input type="checkbox" checked={localSettings.notificationSettings?.debtAlert} onChange={e => setLocalSettings({...localSettings, notificationSettings: {...localSettings.notificationSettings!, debtAlert: e.target.checked}})} className="w-6 h-6 rounded-lg text-rose-600" />
                                        </div>
                                        <h4 className="text-lg font-black">تنبيه مديونيات العملاء</h4>
                                        <p className="text-xs font-bold text-slate-500 leading-relaxed">تلقي إشعارات عندما يتخطى العميل حد الائتمان أو يقترب موعد سداد دين.</p>
                                    </div>

                                    <div className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                                        <div className="flex justify-between items-center">
                                            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-2xl"><Package size={24}/></div>
                                            <input type="checkbox" checked={localSettings.notificationSettings?.stockAlert} onChange={e => setLocalSettings({...localSettings, notificationSettings: {...localSettings.notificationSettings!, stockAlert: e.target.checked}})} className="w-6 h-6 rounded-lg text-amber-600" />
                                        </div>
                                        <h4 className="text-lg font-black">تنبيه نفاذ المخزون</h4>
                                        <p className="text-xs font-bold text-slate-500 leading-relaxed">تنبيه فوري عند وصول كمية المنتج إلى الحد الأدنى المحدد في إعدادات المخزون.</p>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}

                    {activeTab === 'inventory' && (
                        <Card title="إعدادات المخزون والتوفر">
                            <div className="space-y-8">
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg ring-4 ring-indigo-600/10"><ArrowLeftRight size={24}/></div>
                                        <div><h4 className="text-lg font-black">أقل كمية للتنبيه</h4><p className="text-xs font-bold text-slate-500">سيتم تنبيهك عند وصول الرصيد لهذا الرقم.</p></div>
                                    </div>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            value={localSettings.inventorySettings?.minAlertQty || 0} 
                                            onChange={e => setLocalSettings({...localSettings, inventorySettings: {...localSettings.inventorySettings!, minAlertQty: parseInt(e.target.value)||0}})}
                                            className="w-full p-5 bg-white dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-3xl outline-none font-black text-2xl text-center shadow-lg" 
                                        />
                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-300">وحدة</div>
                                    </div>
                                </div>

                                <div className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl flex justify-between items-center transition-all hover:shadow-2xl">
                                    <div className="flex items-center gap-5">
                                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-3xl"><Activity size={28}/></div>
                                        <div><h4 className="text-xl font-black">السماح بالبيع بدون مخزون</h4><p className="text-xs font-bold text-slate-500">إمكانية تنفيذ عمليات البيع حتى لو كان رصيد المنتج صفر (أرصدة سالبة).</p></div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={localSettings.inventorySettings?.allowSaleWithoutStock} onChange={e => setLocalSettings({...localSettings, inventorySettings: {...localSettings.inventorySettings!, allowSaleWithoutStock: e.target.checked}})} />
                                        <div className="w-16 h-9 bg-slate-200 peer-focus:outline-none dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-emerald-600"></div>
                                    </label>
                                </div>
                            </div>
                        </Card>
                    )}

                    {activeTab === 'pos' && (
                        <Card title="إعدادات البيع والولاء">
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex justify-between items-center">
                                        <div><h4 className="text-sm font-black">تأثيرات صوتية (Beep)</h4><p className="text-[10px] text-slate-500">صوت عند قراءة الباركود بنجاح.</p></div>
                                        <input type="checkbox" checked={localSettings.enableSoundEffects} onChange={e => setLocalSettings({...localSettings, enableSoundEffects: e.target.checked})} className="w-6 h-6 rounded-lg text-indigo-600" />
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex justify-between items-center">
                                        <div><h4 className="text-sm font-black">إدارة الورديات</h4><p className="text-[10px] text-slate-500">إلزام الكاشير بفتح وإغلاق اليومية.</p></div>
                                        <input type="checkbox" checked={localSettings.enableShiftManagement} onChange={e => setLocalSettings({...localSettings, enableShiftManagement: e.target.checked})} className="w-6 h-6 rounded-lg text-indigo-600" />
                                    </div>
                                </div>

                                <div className="h-px bg-slate-100 dark:bg-slate-800 my-4"></div>

                                {getPlanLimits(licenseInfo.type).hasLoyalty && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-indigo-600 text-white rounded-xl"><Crown size={18}/></div>
                                                <div><h4 className="text-sm font-black">برنامج ولاء العملاء</h4><p className="text-[10px] text-slate-500">تجميع النقاط واستبدالها بخصومات نقدية.</p></div>
                                            </div>
                                            <input type="checkbox" checked={localSettings.loyaltySettings.enabled} onChange={e => setLocalSettings({...localSettings, loyaltySettings: {...localSettings.loyaltySettings, enabled: e.target.checked}})} className="w-6 h-6 rounded-lg text-indigo-600" />
                                        </div>

                                        {localSettings.loyaltySettings.enabled && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slideDown">
                                                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-800 flex justify-between items-center">
                                                    <div><h4 className="text-xs font-black text-amber-900 dark:text-amber-400">منح نقاط للمبيعات الآجلة</h4><p className="text-[10px] text-amber-700/70">تفعيل النقاط حتى عند الدفع بالآجل.</p></div>
                                                    <input type="checkbox" checked={localSettings.loyaltySettings.allowCreditPoints} onChange={e => setLocalSettings({...localSettings, loyaltySettings: {...localSettings.loyaltySettings, allowCreditPoints: e.target.checked}})} className="w-5 h-5 rounded-md text-amber-600" />
                                                </div>
                                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="flex-1">
                                                        <label className={labelClass} title="كم يجب أن يشتري العميل ليحصل على نقطة واحدة">المبلغ الي بيساوي نقطة</label>
                                                        <input type="number" step="0.1" value={localSettings.loyaltySettings?.amountPerPoint !== undefined ? localSettings.loyaltySettings?.amountPerPoint : (1 / (localSettings.loyaltySettings?.earningRate || 1))} onChange={e => setLocalSettings({...localSettings, loyaltySettings: {...localSettings.loyaltySettings, amountPerPoint: parseFloat(e.target.value)||0}})} className={inputClass} placeholder="مثال: 10" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className={labelClass} title="الحد الأدنى لقيمة الفاتورة ليتم احتساب النقاط">الحد الأدنى لكسب النقاط</label>
                                                        <input type="number" step="0.1" value={localSettings.loyaltySettings?.minOrderAmountToEarn || 0} onChange={e => setLocalSettings({...localSettings, loyaltySettings: {...localSettings.loyaltySettings, minOrderAmountToEarn: parseFloat(e.target.value)||0}})} className={inputClass} placeholder="مثال: 50" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className={labelClass} title="قيمة النقطة الواحدة عند استبدالها كخصم">سعر النقطة للاستبدال</label>
                                                        <input type="number" step="0.1" value={localSettings.loyaltySettings?.redemptionRate || 0} onChange={e => setLocalSettings({...localSettings, loyaltySettings: {...localSettings.loyaltySettings, redemptionRate: parseFloat(e.target.value)||0}})} className={inputClass} placeholder="مثال: 0.5" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}

                    {activeTab === 'hardware' && (
                        <Card title="إعدادات الأجهزة (الطابعة والباركود)">
                            <div className="space-y-8">
                                {/* Barcode Settings */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl"><Barcode size={24}/></div>
                                        <h3 className="font-black text-lg">قارئ الباركود (Barcode Scanner)</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
                                            <div>
                                                <h4 className="text-sm font-black text-slate-800 dark:text-white">تفعيل القارئ التلقائي</h4>
                                                <p className="text-[10px] text-slate-500 font-bold mt-1">تجاهل ضغطات المفاتيح وتحويلها لقارئ الباركود</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" checked={localSettings.hardwareSettings?.enableScanner} onChange={e => setLocalSettings({...localSettings, hardwareSettings: {...localSettings.hardwareSettings, enableScanner: e.target.checked}})} />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                            </label>
                                        </div>
                                        <div>
                                            <label className={labelClass}>اللاحقة التلقائية (Suffix)</label>
                                            <select value={localSettings.hardwareSettings?.barcodeSuffix || 'Enter'} onChange={e => setLocalSettings({...localSettings, hardwareSettings: {...localSettings.hardwareSettings, barcodeSuffix: e.target.value}})} className={inputClass}>
                                                <option value="Enter">Enter (افتراضي)</option>
                                                <option value="Tab">Tab</option>
                                                <option value="None">بدون</option>
                                            </select>
                                            <p className="text-[10px] text-slate-500 font-bold mt-2">عكس ما يقوم به الجهاز لإدخال المنتج تلقائياً.</p>
                                        </div>
                                        <div className="md:col-span-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                                            <label className={labelClass}>مربع اختبار قارئ الباركود</label>
                                            <div className="flex gap-2">
                                                <input 
                                                    type="text" 
                                                    className={inputClass} 
                                                    placeholder="قف هنا واقرأ باركود بالكاميرا أو القارئ لتجربته..." 
                                                    onKeyDown={(e) => {
                                                        const suffix = localSettings.hardwareSettings?.barcodeSuffix || 'Enter';
                                                        if (suffix === 'Enter' && e.key === 'Enter') {
                                                            e.preventDefault();
                                                            addToast(`تم قراءة الباركود بنجاح: ${(e.target as HTMLInputElement).value}`, 'success');
                                                            (e.target as HTMLInputElement).value = '';
                                                        } else if (suffix === 'Tab' && e.key === 'Tab') {
                                                            e.preventDefault();
                                                            addToast(`تم قراءة الباركود بنجاح: ${(e.target as HTMLInputElement).value}`, 'success');
                                                            (e.target as HTMLInputElement).value = '';
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <p className="text-[10px] text-slate-500 font-bold mt-2">قم بوضع المؤشر في هذا المربع ثم امسح الباركود للتحقق من أن النظام يلتقطه بشكل سليم وأن اللاحقة (Enter/Tab) تعمل.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px bg-slate-100 dark:bg-slate-800"></div>

                                {/* Printer Settings */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl"><Printer size={24}/></div>
                                        <h3 className="font-black text-lg">طابعة الإيصالات (Thermal Printer)</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
                                            <div>
                                                <h4 className="text-sm font-black text-slate-800 dark:text-white">الطباعة التلقائية</h4>
                                                <p className="text-[10px] text-slate-500 font-bold mt-1">طباعة الفاتورة تلقائياً عند حفظ عملية البيع</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" checked={localSettings.hardwareSettings?.autoPrintReceipt} onChange={e => setLocalSettings({...localSettings, hardwareSettings: {...localSettings.hardwareSettings, autoPrintReceipt: e.target.checked}})} />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                            </label>
                                        </div>
                                        
                                        <div>
                                            <label className={labelClass}>مقاس الورق (Paper Size)</label>
                                            <select value={localSettings.hardwareSettings?.printerPaperSize || '80mm'} onChange={e => setLocalSettings({...localSettings, hardwareSettings: {...localSettings.hardwareSettings, printerPaperSize: e.target.value as any}})} className={inputClass}>
                                                <option value="80mm">80mm (طابعات رول كبيرة)</option>
                                                <option value="58mm">58mm (طابعات رول صغيرة)</option>
                                                <option value="A4">A4 (طابعات عادية)</option>
                                            </select>
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className={labelClass}>نظام الطباعة المتصل</label>
                                            <select value={localSettings.hardwareSettings?.printMode || 'browser'} onChange={e => setLocalSettings({...localSettings, hardwareSettings: {...localSettings.hardwareSettings, printMode: e.target.value as any}})} className={inputClass}>
                                                <option value="browser">واجهة المتصفح (نافذة طباعة ويندوز/ماك)</option>
                                                <option value="escpos">إرسال مباشر (ESC/POS) [يتطلب أداة مساعدة]</option>
                                                {isElectron && <option value="direct">إرسال مباشر للنظام (Direct Printing)</option>}
                                            </select>
                                            {localSettings.hardwareSettings?.printMode === 'direct' && isElectron && printers.length > 0 && (
                                                <div className="mt-4 animate-fadeIn">
                                                    <label className={labelClass}>اختر الطابعة الافتراضية</label>
                                                    <select 
                                                        value={localSettings.hardwareSettings?.defaultPrinterName || ''} 
                                                        onChange={e => setLocalSettings({...localSettings, hardwareSettings: {...localSettings.hardwareSettings, defaultPrinterName: e.target.value}})} 
                                                        className={inputClass}
                                                    >
                                                        <option value="">-- اختر طابعة من النظام --</option>
                                                        {printers.map(p => (
                                                            <option key={p.name} value={p.name}>{p.displayName} {p.isDefault ? '(الافتراضية)' : ''}</option>
                                                        ))}
                                                    </select>
                                                    <p className="text-[10px] text-emerald-600 font-bold mt-2">تم اكتشاف {toArabicIndic(printers.length)} طابعة متصلة بمحطة العمل.</p>
                                                </div>
                                            )}
                                            {localSettings.hardwareSettings?.printMode === 'direct' && isElectron && printers.length === 0 && (
                                                <p className="text-[10px] text-rose-500 font-bold mt-2">لم يتم العثور على طابعات معرفة في هذا الجهاز. يرجى التأكد من تعريف الطابعة في لوحة تحكم الويندوز.</p>
                                            )}
                                            <p className="text-[10px] text-slate-500 font-bold mt-2">اختر <strong className="text-indigo-600">واجهة المتصفح</strong> لمعظم الطابعات المتصلة بـ USB. لاختبار الإعدادات، استخدم زر اختبار الطابعة أدناه.</p>
                                        </div>
                                        
                                        <div className="md:col-span-2 flex justify-end">
                                            <Button onClick={() => {
                                                addToast('جاري إرسال أمر اختبار طباعة...', 'info');
                                                setTimeout(() => {
                                                    const printWindow = window.open('', '_blank', 'width=300,height=400');
                                                    if(printWindow) {
                                                        printWindow.document.write(`
                                                            <html dir="rtl">
                                                            <head><title>Test Print</title><style>body { font-family: monospace; text-align: center; padding: 20px; }</style></head>
                                                            <body>
                                                                <h3>اختبار الطابعة بنجاح</h3>
                                                                <p>مرحباً بك في تكنو باور POS</p>
                                                                <p>إعداد الورق: ${localSettings.hardwareSettings?.printerPaperSize || '80mm'}</p>
                                                                <p>---- END OF RECEIPT ----</p>
                                                                <script>window.print(); window.onafterprint = function(){ window.close(); }</script>
                                                            </body>
                                                            </html>
                                                        `);
                                                        printWindow.document.close();
                                                    }
                                                }, 500);
                                            }} variant="secondary" className="rounded-xl h-10 px-8 font-black"><Printer size={16} className="me-2"/> تجربة الطباعة (Test Print)</Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}

                    {activeTab === 'homepage' && (
                        <Card title="تخصيص الشاشة الرئيسية">
                            {getPlanLimits(licenseInfo.type).hasCustomUi ? (
                                <>
                                    <p className="text-xs text-slate-500 font-bold mb-6">اختر الأدوات والصفحات التي ترغب في ظهورها على الشاشة الرئيسية (Home Grid) ورتبها حسب احتياجاتك:</p>
                                    
                                    <div className="space-y-8">
                                        <div>
                                            <h4 className="text-sm font-black text-slate-800 dark:text-white mb-4 border-b pb-2 dark:border-slate-800">الصفحات النشطة (مرتبة حسب الأولوية)</h4>
                                            <div className="flex flex-col gap-2">
                                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleHomeGridDragEnd}>
                                                    <SortableContext
                                                        items={localSettings.homeGridItems || []}
                                                        strategy={verticalListSortingStrategy}
                                                    >
                                                        {(localSettings.homeGridItems || []).map((id, index) => {
                                                            // Find the link details
                                                            let linkDetails: any = null;
                                                            NAV_LINKS.forEach(link => {
                                                                if ('children' in link) {
                                                                    const child = (link.children as any[]).find(c => c.id === id);
                                                                    if (child) linkDetails = child;
                                                                } else if (link.id === id) {
                                                                    linkDetails = link;
                                                                }
                                                            });

                                                            if (!linkDetails || linkDetails.id === 'about') return null;

                                                            return (
                                                                <SortableHomeGridItem
                                                                    key={id}
                                                                    id={id}
                                                                    title={t(linkDetails.t_key)}
                                                                    icon={linkDetails.icon}
                                                                    onRemove={() => {
                                                                        const current = localSettings.homeGridItems || [];
                                                                        const newList = current.filter(itemId => itemId !== id);
                                                                        setLocalSettings({...localSettings, homeGridItems: newList});
                                                                    }}
                                                                />
                                                            );
                                                        })}
                                                    </SortableContext>
                                                </DndContext>
                                                {(!localSettings.homeGridItems || localSettings.homeGridItems.length === 0) && (
                                                    <p className="text-xs text-slate-400 font-bold text-center p-4">لا توجد صفحات نشطة</p>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="text-sm font-black text-slate-800 dark:text-white mb-4 border-b pb-2 dark:border-slate-800">صفحات غير نشطة (اضغط لإضافتها)</h4>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                {NAV_LINKS.map(link => {
                                                    const gridItems = localSettings.homeGridItems || [];
                                                    if ('children' in link) {
                                                        return link.children.map(child => {
                                                            if (child.id === 'about' || gridItems.includes(child.id)) return null;
                                                            return (
                                                                <label key={child.id} className="flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600">
                                                                    <input type="checkbox" className="hidden" checked={false} onChange={e => {
                                                                        if (e.target.checked) {
                                                                            setLocalSettings({...localSettings, homeGridItems: [...gridItems, child.id]});
                                                                        }
                                                                    }} />
                                                                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400"><child.icon size={16}/></div>
                                                                    <span className="text-xs font-black text-slate-500">{t(child.t_key)}</span>
                                                                </label>
                                                            );
                                                        });
                                                    }
                                                    if (link.id === 'about' || gridItems.includes(link.id)) return null;
                                                    return (
                                                        <label key={link.id} className="flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600">
                                                            <input type="checkbox" className="hidden" checked={false} onChange={e => {
                                                                if (e.target.checked) {
                                                                    setLocalSettings({...localSettings, homeGridItems: [...gridItems, link.id]});
                                                                }
                                                            }} />
                                                            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400"><link.icon size={16}/></div>
                                                            <span className="text-xs font-black text-slate-500">{t(link.t_key)}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="p-8 bg-indigo-50 dark:bg-indigo-900/10 rounded-3xl border border-indigo-100 dark:border-indigo-800 text-center">
                                    <Activity size={48} className="mx-auto text-indigo-500 mb-4" />
                                    <h4 className="text-lg font-black text-slate-800 dark:text-white mb-2">تخصيص رصيف الشاشة الرئيسية</h4>
                                    <p className="text-xs text-slate-500 font-bold">إمكانية ترتيب وإضافة/حذف كروت الوصول السريع في الشاشة الرئيسية متوفرة فقط لمشتركي الباقات المتقدمة.</p>
                                    <Button 
                                        variant="outline" 
                                        onClick={() => navigate('/pricing')}
                                        className="mt-6 font-black border-indigo-600 text-indigo-600"
                                    >
                                        ترقية الباقة الآن
                                    </Button>
                                </div>
                            )}
                        </Card>
                    )}

                    {activeTab === 'employees' && (
                        <div className="space-y-6">
                            <Card title="الموظفين والصلاحيات">
                                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mb-8 w-fit">
                                    <button onClick={() => setEmployeeSubTab('users')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${employeeSubTab === 'users' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-500'}`}>المستخدمين</button>
                                    {getPlanLimits(licenseInfo.type).maxUsers > 2 && (
                                        <button onClick={() => setEmployeeSubTab('roles')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${employeeSubTab === 'roles' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-500'}`}>أدوار الصلاحيات</button>
                                    )}
                                </div>

                                {employeeSubTab === 'users' ? (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h4 className="font-black text-sm text-slate-500">قائمة مستخدمي النظام</h4>
                                            <Button 
                                                onClick={() => {
                                                    if (licenseInfo.type === 'Free' && users.length >= 1) {
                                                        addToast("الخطة المجانية تتيح مستخدماً واحداً فقط.", "warning");
                                                        return;
                                                    }
                                                    setEditingUser(null); 
                                                    setIsUserModalOpen(true);
                                                }} 
                                                size="sm" 
                                                className="rounded-xl h-10 px-4 font-black"
                                            >
                                                <UserPlus size={16} className="me-2"/> إضافة مستخدم
                                            </Button>
                                        </div>
                                        <div className="overflow-x-auto border dark:border-slate-800 rounded-3xl">
                                            <table className="w-full text-xs">
                                                <thead className="bg-slate-50 dark:bg-slate-800/50 font-black">
                                                    <tr><th className="p-4 text-start">المستخدم</th><th className="p-4 text-start">الدور</th><th className="p-4 text-center">إجراءات</th></tr>
                                                </thead>
                                                <tbody className="divide-y dark:divide-slate-800">
                                                    {users.map(u => (
                                                        <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                            <td className="p-4 flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-black">{u.name.charAt(0)}</div>
                                                                <div><p className="font-black">{u.name}</p><p className="text-[10px] text-slate-400">{u.email}</p></div>
                                                            </td>
                                                            <td className="p-4"><span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg font-bold">{roles.find(r=>r.id===u.roleId)?.name || 'مخصص'}</span></td>
                                                            <td className="p-4 text-center">
                                                                <button onClick={() => {setEditingUser(u); setIsUserModalOpen(true);}} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Settings2 size={16}/></button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h4 className="font-black text-sm text-slate-500">أدوار صلاحيات الوصول</h4>
                                            <Button onClick={() => {setEditingRole(null); setIsRoleModalOpen(true);}} size="sm" className="rounded-xl h-10 px-4 font-black"><ShieldCheck size={16} className="me-2"/> إضافة دور</Button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {roles.map(r => (
                                                <div key={r.id} className="p-4 border dark:border-slate-800 rounded-3xl flex justify-between items-center group hover:border-indigo-300 transition-all">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all"><Shield size={18}/></div>
                                                        <span className="font-black text-sm">{r.name}</span>
                                                    </div>
                                                    <button onClick={() => {setEditingRole(r); setIsRoleModalOpen(true);}} className="p-2 text-slate-400 hover:text-indigo-500"><Settings2 size={18}/></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </Card>
                        </div>
                    )}

                    {activeTab === 'invoice' && (
                        <Card title="مصمم الفاتورة">
                            <div className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-6">
                                        <div>
                                            <label className={labelClass}>قالب الفاتورة</label>
                                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                                {(getPlanLimits(licenseInfo.type).hasMultipleInvoiceDesigns ? ['modern', 'classic', 'minimal', 'thermal', 'professional', 'free'] : ['thermal']).map(t => (
                                                    <button key={t} onClick={() => setLocalSettings({...localSettings, invoiceDesign: {...localSettings.invoiceDesign, template: t as any}})} className={`p-4 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${localSettings.invoiceDesign.template === t ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}>{t === 'professional' ? 'احترافي' : t}</button>
                                                ))}
                                            </div>
                                            {!getPlanLimits(licenseInfo.type).hasMultipleInvoiceDesigns && (
                                                <p className="text-[10px] text-amber-500 mt-2 font-bold">الخطة المجانية تتيح تصميم واحد فقط (القياسي Thermal). قم بالترقية للحصول على تصاميم لا محدودة وقالب حر.</p>
                                            )}
                                        </div>
                                        
                                        {localSettings.invoiceDesign.template === 'free' && (
                                            <div className="animate-fadeIn">
                                                <label className={labelClass}>تخصيص الـ CSS (قالب حر)</label>
                                                <textarea 
                                                    value={localSettings.invoiceDesign.customCss || ''} 
                                                    onChange={e => setLocalSettings({...localSettings, invoiceDesign: {...localSettings.invoiceDesign, customCss: e.target.value}})} 
                                                    className={`${inputClass} font-mono text-[10px] h-32 leading-tight`} 
                                                    placeholder=".receipt-container { background: gold !important; }" 
                                                />
                                                <p className="text-[9px] text-slate-400 mt-2 font-bold">● استخدم الكلاس .receipt-container لاستهداف حاوية الفاتورة الأساسية.</p>
                                            </div>
                                        )}

                                        <div><label className={labelClass}>لون التمييز (Accent Color)</label><div className="flex gap-2"><input type="color" value={localSettings.invoiceDesign?.accentColor || '#4f46e5'} onChange={e => setLocalSettings({...localSettings, invoiceDesign: {...localSettings.invoiceDesign, accentColor: e.target.value}})} className="w-12 h-12 rounded-xl cursor-pointer border-none" /><input type="text" value={localSettings.invoiceDesign?.accentColor || '#4f46e5'} onChange={e => setLocalSettings({...localSettings, invoiceDesign: {...localSettings.invoiceDesign, accentColor: e.target.value}})} className={`${inputClass} flex-grow`} /></div></div>
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl space-y-4">
                                            <label className="flex items-center justify-between cursor-pointer"><span className="text-xs font-black">إظهار الشعار</span><input type="checkbox" checked={localSettings.invoiceDesign?.showLogo} onChange={e => setLocalSettings({...localSettings, invoiceDesign: {...localSettings.invoiceDesign, showLogo: e.target.checked}})} className="w-5 h-5 text-indigo-600 rounded" /></label>
                                            <label className="flex items-center justify-between cursor-pointer"><span className="text-xs font-black">إظهار كود QR</span><input type="checkbox" checked={localSettings.invoiceDesign?.showQrCode} onChange={e => setLocalSettings({...localSettings, invoiceDesign: {...localSettings.invoiceDesign, showQrCode: e.target.checked}})} className="w-5 h-5 text-indigo-600 rounded" /></label>
                                        </div>
                                        <div><label className={labelClass}>تذييل الفاتورة</label><textarea value={localSettings.invoiceFooter || ''} onChange={e => setLocalSettings({...localSettings, invoiceFooter: e.target.value})} className={`${inputClass} h-24 resize-none`} placeholder="شكراً لتعاملكم معنا..." /></div>
                                    </div>
                                    <div className="bg-slate-200 dark:bg-slate-900 rounded-4xl p-6 border-2 border-dashed border-slate-300 dark:border-slate-800 flex flex-col items-center justify-center relative overflow-hidden">
                                        <p className="absolute top-4 left-4 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white dark:bg-slate-800 px-3 py-1 rounded-full shadow-sm">معاينة مباشرة</p>
                                        <div className="w-full bg-white text-black p-6 shadow-2xl rounded-sm scale-90 origin-center space-y-4" style={{borderTop: localSettings.invoiceDesign.template !== 'free' ? `4px solid ${localSettings.invoiceDesign.accentColor}` : undefined}}>
                                            <div className="flex justify-between items-start"><div className="w-10 h-10 bg-slate-100 rounded-lg"></div><div className="text-end font-mono text-[8px]">INV-1234<br/>2025/12/11</div></div>
                                            <div className="h-2 w-2/3 bg-slate-100 rounded"></div>
                                            <div className="space-y-1"><div className="h-1.5 w-full bg-slate-50 rounded"></div><div className="h-1.5 w-full bg-slate-50 rounded"></div><div className="h-1.5 w-full bg-slate-50 rounded"></div></div>
                                            <div className="flex justify-between pt-2 border-t"><div className="h-2 w-12 bg-slate-100 rounded"></div><div className="h-3 w-20 rounded" style={{backgroundColor: localSettings.invoiceDesign.accentColor}}></div></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}

                    {activeTab === 'maintenance' && (
                        <div className="space-y-6">
                            <Card title="إدارة البيانات والنسخ الاحتياطي">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="p-6 border rounded-3xl space-y-4 hover:border-indigo-500 transition-colors relative overflow-hidden">
                                        {!getPlanLimits(licenseInfo.type).hasBackup && (
                                            <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center text-center p-4">
                                                <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl mb-2"><Crown size={24}/></div>
                                                <h5 className="font-black text-slate-800 dark:text-white text-sm">ميزة محدودة</h5>
                                                <p className="text-[10px] font-bold text-slate-500 mt-1">النسخ الاحتياطي متاح فقط في الخطط المدفوعة.</p>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-3 text-indigo-600"><Download size={24}/><h4 className="font-black">تصدير البيانات</h4></div>
                                        <p className="text-xs text-slate-500 font-bold">حفظ نسخة احتياطية كاملة من المخزن، المبيعات، والعملاء على جهازك.</p>
                                        <Button onClick={async () => {
                                            try {
                                                const data = await api.getBackupData();
                                                const blob = new Blob([data], { type: 'application/json' });
                                                const url = URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
                                                a.click();
                                                addToast('تم تصدير النسخة الاحتياطية بنجاح.', 'success');
                                            } catch (e) { addToast('فشل النسخ الاحتياطي', 'error'); }
                                        }} className="w-full rounded-xl h-11 bg-indigo-600">بدء التصدير الآن</Button>
                                    </div>
                                    <div className="p-6 border rounded-3xl space-y-4 hover:border-blue-500 transition-colors relative overflow-hidden">
                                         {!getPlanLimits(licenseInfo.type).hasBackup && (
                                            <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center text-center p-4">
                                                <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl mb-2"><Crown size={24}/></div>
                                                <h5 className="font-black text-slate-800 dark:text-white text-sm">ميزة محدودة</h5>
                                                <p className="text-[10px] font-bold text-slate-500 mt-1">استعادة البيانات متاحة فقط في الخطط المدفوعة.</p>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-3 text-blue-600"><Upload size={24}/><h4 className="font-black">استعادة البيانات</h4></div>
                                        <p className="text-xs text-slate-500 font-bold">رفع ملف نسخة احتياطية سابقة لاستعادتها داخل النظام.</p>
                                        <Button variant="secondary" className="w-full rounded-xl h-11">اختيار ملف الاستعادة</Button>
                                    </div>
                                </div>
                            </Card>
                            <Card title="المنطقة الخطرة" className="border-rose-100 dark:border-rose-900/30">
                                <div className="space-y-4">
                                    <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl flex items-center justify-between gap-4 flex-col md:flex-row border border-amber-100 dark:border-amber-900/30">
                                        <div>
                                            <h4 className="text-sm font-black text-amber-800 dark:text-amber-400">تصفير العمليات والبيانات فقط</h4>
                                            <p className="text-[10px] text-amber-600 font-bold mt-1">سيتم مسح المبيعات والمشتريات والمخزون مع الاحتفاظ بالإعدادات والمستخدمين.</p>
                                        </div>
                                        <Button variant="secondary" onClick={() => setConfirmWipeData(true)} className="border-amber-500 text-amber-600 rounded-xl h-10 px-6 font-black"><Trash2 size={16} className="me-2"/> تصفير البيانات</Button>
                                    </div>
                                    <div className="p-4 bg-rose-50 dark:bg-rose-900/10 rounded-2xl flex items-center justify-between gap-4 flex-col md:flex-row border border-rose-100 dark:border-rose-900/30">
                                        <div>
                                            <h4 className="text-sm font-black text-rose-800 dark:text-rose-400">إعادة ضبط المصنع (حذف شامل)</h4>
                                            <p className="text-[10px] text-rose-600 font-bold mt-1">تحذير: سيتم مسح كافة البيانات بشكل نهائي بما في ذلك المستخدمين والإعدادات.</p>
                                        </div>
                                        <Button variant="danger" onClick={() => setConfirmResetApp(true)} className="rounded-xl h-10 px-6 font-black shadow-lg shadow-rose-500/20"><Trash2 size={16} className="me-2"/> تصفير شامل</Button>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'subscription' && (
                        <Card title="حالة النظام والترخيص">
                            <div className="space-y-8">
                                <div className={`p-8 rounded-4xl flex flex-col md:flex-row items-center justify-between gap-6 border-2 ${licenseInfo.status === 'LICENSED' ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800' : 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800'}`}>
                                    <div className="flex items-center gap-6">
                                        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl ${licenseInfo.status === 'LICENSED' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                                            {licenseInfo.status === 'LICENSED' ? <ShieldCheck size={40} /> : <Zap size={40} />}
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black">{licenseInfo.type || 'Trial'} Plan</h3>
                                            <p className="text-slate-500 font-bold mt-1">تاريخ التفعيل: {licenseInfo.activationDate ? new Date(licenseInfo.activationDate).toLocaleDateString('ar-EG') : '---'}</p>
                                            
                                            {subscriptionDetails && (
                                                <div className="mt-4 flex flex-wrap gap-2">
                                                    <div className="px-3 py-1.5 bg-white/50 dark:bg-black/20 rounded-xl border border-white/30 backdrop-blur-sm">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">الأيام المتبقية</p>
                                                        <p className="text-sm font-black text-indigo-600">
                                                            {subscriptionDetails.remaining === Infinity ? 'صلاحية مفتوحة' : `${toArabicIndic(subscriptionDetails.remaining)} يوم`}
                                                        </p>
                                                    </div>
                                                    <div className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/20">
                                                        <p className="text-[10px] font-black opacity-70 uppercase tracking-tighter">حالة الاشتراك</p>
                                                        <p className="text-sm font-black">نشط ومفعل</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <Button onClick={() => setIsRenewalsModalOpen(true)} variant="secondary" className="rounded-2xl h-12 px-6 font-black bg-white dark:bg-slate-800"><History size={18} className="me-2"/> سجل التجديدات</Button>
                                        {licenseInfo?.status !== 'LICENSED' && (
                                            <Button onClick={() => window.location.href='/pricing'} className="rounded-2xl h-12 px-8 font-black bg-indigo-600 shadow-lg shadow-indigo-500/30">ترقية الباقة</Button>
                                        )}
                                    </div>
                                </div>

                                {subscriptionDetails && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="p-8 bg-slate-50 dark:bg-slate-800/40 rounded-4xl border dark:border-slate-800">
                                            <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                                <CheckCircle size={18} className="text-emerald-500"/>
                                                مميزات باقتك الحالية
                                            </h4>
                                            <ul className="grid grid-cols-1 gap-4">
                                                {subscriptionDetails.features.map((f, i) => (
                                                    <li key={i} className="flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                                        {f}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="p-8 bg-slate-50 dark:bg-slate-800/40 rounded-4xl border dark:border-slate-800 flex flex-col justify-center">
                                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                                                <Smartphone size={16} className="text-indigo-500"/>
                                                معرف الجهاز الرقمي
                                            </h4>
                                            <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-inner border dark:border-slate-800">
                                                <code className="text-xl font-black text-indigo-600 dark:text-indigo-400 tracking-widest">{deviceId}</code>
                                                <button onClick={() => {navigator.clipboard.writeText(deviceId); addToast('تم النسخ', 'info');}} className="p-2 text-slate-400 hover:text-indigo-500 transition-colors"><Copy size={20}/></button>
                                            </div>
                                            <p className="mt-4 text-[10px] text-slate-500 font-bold">هذا الكود فريد لجهازك الحالي ولا يتغير.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}

                    {activeTab === 'suggestion' && (
                        <Card title="إرسال اقتراح لتطوير النظام">
                            <div className="space-y-6">
                                <div className="p-6 bg-indigo-50 dark:bg-indigo-900/10 rounded-3xl border border-indigo-100 dark:border-indigo-800 text-center">
                                    <MessageSquare size={48} className="mx-auto text-indigo-500 mb-4" />
                                    <h4 className="text-lg font-black text-slate-800 dark:text-white mb-2">هل لديك فكرة لتطوير النظام؟</h4>
                                    <p className="text-xs text-slate-500 font-bold mb-6">نحن دائماً نستمع لعملائنا لتطوير وإضافة ميزات جديدة تلبي احتياجات سوق العمل. شاركنا أفكارك!</p>
                                    
                                    <div className="space-y-4 max-w-2xl mx-auto">
                                        <textarea 
                                            value={suggestionText}
                                            onChange={e => setSuggestionText(e.target.value)}
                                            placeholder="اكتب اقتراحك هنا بشكل واضح ومفصل..."
                                            className={`${inputClass} h-40 resize-none`}
                                        />
                                        <div>
                                            <label className={labelClass}>رقم الهاتف</label>
                                            <input 
                                                type="text"
                                                value={suggestionPhone}
                                                onChange={e => setSuggestionPhone(e.target.value)}
                                                placeholder="أدخل رقم هاتفك للتواصل معك..."
                                                className={inputClass}
                                            />
                                        </div>
                                        <Button 
                                            onClick={handleSubmitSuggestion} 
                                            isLoading={isSubmittingSuggestion}
                                            className="w-full h-12 rounded-2xl font-black bg-indigo-600 outline-none"
                                        >
                                            إرسال الاقتراح للإدارة
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}


                </div>
            </div>

            {/* Modals */}
            <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title={editingUser ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}>
                <UserForm user={editingUser} roles={roles} onSave={async (d) => { await api.saveUser(d); await fetchEmployeesData(); setIsUserModalOpen(false); addToast('تم الحفظ', 'success'); }} onCancel={() => setIsUserModalOpen(false)} isLoading={false} enableCommissions={true} />
            </Modal>
            <Modal isOpen={isRoleModalOpen} onClose={() => setIsRoleModalOpen(false)} title={editingRole ? 'تعديل الدور' : 'إضافة دور جديد'}>
                <RoleFormModal role={editingRole} onSave={handleSaveRole} onCancel={() => setIsRoleModalOpen(false)} isLoading={isSaving} />
            </Modal>
            
            <ConfirmDialog
                isOpen={confirmWipeData}
                onClose={() => setConfirmWipeData(false)}
                onConfirm={() => {
                    setConfirmWipeData(false);
                    api.wipeBusinessData().then(() => window.location.reload());
                }}
                title="تصفير البيانات"
                message="هل أنت متأكد من تصفير كافة العمليات المالية والمخزون؟ (سيتم الاحتفاظ بالموظفين والإعدادات)"
            />

            <ConfirmDialog
                isOpen={confirmResetApp}
                onClose={() => setConfirmResetApp(false)}
                onConfirm={() => {
                    setConfirmResetApp(false);
                    api.reset();
                }}
                title="تحذير حاسم"
                message="سيتم مسح كافة النظام نهائياً! هل أنت متأكد؟"
                confirmText="تصفير شامل"
            />
            
            <Modal isOpen={isRenewalsModalOpen} onClose={() => setIsRenewalsModalOpen(false)} title="سجل تجديدات الرخص وتفاصيل الاشتراك">
                <div className="space-y-6 flex flex-col items-center">
                    <div className="w-full bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border dark:border-slate-800">
                         <div className="flex justify-between items-center mb-6">
                             <div>
                                 <h4 className="text-lg font-black text-slate-800 dark:text-white">الاشتراك الحالي</h4>
                                 <p className="text-xs text-slate-500 font-bold">تفاصيل تفعيل النسخة الحالية على هذا الجهاز</p>
                             </div>
                             <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                                 <Crown size={24} />
                             </div>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                             <div>
                                 <p className="text-[10px] font-black uppercase text-slate-400">نوع الترخيص</p>
                                 <p className="font-black text-indigo-600">{licenseInfo.type}</p>
                             </div>
                             <div>
                                 <p className="text-[10px] font-black uppercase text-slate-400">حالة التفعيل</p>
                                 <p className="font-black text-emerald-600">{licenseInfo.status === 'LICENSED' ? 'مفعل نشط' : licenseInfo.status}</p>
                             </div>
                             <div>
                                 <p className="text-[10px] font-black uppercase text-slate-400">تاريخ البدء</p>
                                 <p className="font-bold">{licenseInfo.activationDate ? new Date(licenseInfo.activationDate).toLocaleDateString('ar-EG') : '---'}</p>
                             </div>
                             <div>
                                 <p className="text-[10px] font-black uppercase text-slate-400">تاريخ الانتهاء</p>
                                 <p className="font-bold text-rose-600">{licenseInfo.expiresAt ? new Date(licenseInfo.expiresAt).toLocaleDateString('ar-EG') : 'غير محدد / مدى الحياة'}</p>
                             </div>
                             <div className="col-span-2">
                                 <p className="text-[10px] font-black uppercase text-slate-400">مفتاح الترخيص (Key)</p>
                                 <p className="font-mono text-xs mt-1 bg-white dark:bg-slate-900 p-2 rounded-xl border dark:border-slate-700 select-all tracking-widest">{licenseInfo.licenseKey || 'لا يوجد'}</p>
                             </div>
                         </div>
                    </div>

                    <div className="w-full">
                        <h4 className="text-sm font-black mb-3">سجل العمليات السابقة</h4>
                        <div className="overflow-x-auto border dark:border-slate-800 rounded-2xl">
                            <table className="w-full text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-800 font-black">
                                    <tr><th className="p-4 text-start">التاريخ</th><th className="p-4 text-start">النوع</th><th className="p-4 text-start">ملاحظات</th></tr>
                                </thead>
                                <tbody className="divide-y dark:divide-slate-800">
                                    {licenseInfo.activationDate ? (
                                        <tr>
                                            <td className="p-4 font-bold text-slate-600 dark:text-slate-300">{new Date(licenseInfo.activationDate).toLocaleString('ar-EG')}</td>
                                            <td className="p-4 uppercase font-black text-indigo-600">{licenseInfo.type}</td>
                                            <td className="p-4"><span className="px-2 py-1 bg-green-100/50 text-green-700 rounded-lg font-black text-[10px]">تفعيل النسخة الحالية</span></td>
                                        </tr>
                                    ) : (
                                        <tr><td colSpan={3} className="p-10 text-center font-bold text-slate-400">لا يوجد سجلات سابقة</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </Modal>
            <Modal
                isOpen={!!activePolicyModal} 
                onClose={() => setActivePolicyModal(null)}
                title={
                    activePolicyModal === 'privacyPolicy' ? 'سياسة الخصوصية' : 
                    activePolicyModal === 'termsOfUse' ? 'شروط الاستخدام' : 
                    activePolicyModal === 'intellectualProperty' ? 'حقوق الملكية الفكرية' : 
                    activePolicyModal === 'userGuide' ? 'دليل الاستخدام الشامل' : ''
                }
                size="xl"
            >
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {activePolicyModal && policies[activePolicyModal as keyof typeof policies] ? (
                        <div className="markdown-body text-slate-700 dark:text-slate-300 font-bold leading-loose [&>h1]:text-2xl [&>h1]:font-black [&>h1]:mb-4 [&>h2]:text-xl [&>h2]:font-black [&>h2]:mb-3 [&>h2]:mt-6 [&>h3]:text-lg [&>h3]:font-black [&>h3]:mb-2 [&>p]:mb-4 [&>ul]:list-disc [&>ul]:ps-5 [&>ul]:mb-4 [&>ol]:list-decimal [&>ol]:ps-5 [&>ol]:mb-4 [&>li]:mb-2 [&>a]:text-indigo-600 [&>a]:underline">
                            <ReactMarkdown>{policies[activePolicyModal as keyof typeof policies]}</ReactMarkdown>
                        </div>
                    ) : (
                        <div className="text-center py-10 opacity-50">
                            <FileText size={48} className="mx-auto mb-4" />
                            <p className="text-sm font-bold">لم يتم إضافة محتوى بعد. (يمكن للمسؤول إضافته من صفحة الإدارة)</p>
                        </div>
                    )}
                </div>
            </Modal>

        </div>
    );
};

export default SettingsPage;
