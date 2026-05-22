import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../hooks/useAdminAuth';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Image as ImageIcon, Upload, Save, ArrowLeft, MessageSquare, AlertCircle, GripVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { handleFirestoreError, OperationType } from '../services/firestoreErrorHandler';
import { useToasts } from '../hooks/useToasts';
import { processImageFile } from '../utils/imageHelpers';
import { GlobalSettings } from '../types';
import { NAV_LINKS } from '../constants';
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

const SortableItem = ({ id, active, title, icon: Icon }: { id: string, active: boolean, title: string, icon: any }) => {
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
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={`flex items-center gap-3 p-3 mb-2 rounded-xl border transition-all ${active ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm cursor-grab' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-50'}`}>
            <GripVertical className="text-slate-400" size={16} />
            <Icon size={18} className={active ? 'text-indigo-600' : 'text-slate-400'} />
            <span className={`font-bold text-sm ${active ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400'}`}>{title}</span>
        </div>
    );
};

const AdminGlobalSettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const { addToast } = useToasts();
    
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setSettings((prev) => {
                if (!prev) return prev;
                const currentOrder = prev.moduleOrder || NAV_LINKS.map(l => l.id);
                const oldIndex = currentOrder.indexOf(active.id as string);
                const newIndex = currentOrder.indexOf(over.id as string);
                return {
                    ...prev,
                    moduleOrder: arrayMove(currentOrder, oldIndex, newIndex),
                };
            });
        }
    };
    
    const [settings, setSettings] = useState<GlobalSettings>({
        popupOffer: {
            enabled: false,
            title: '',
            message: '',
            buttonText: 'تخطي',
            linkUrl: ''
        },
        hiddenModules: [],
        supportContact: {
            phone: '',
            email: ''
        }
    });
    
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            setLoading(true);
            const path = 'adminSettings/globalAdmin';
            try {
                const docRef = doc(db, 'adminSettings', 'globalAdmin');
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    const data = snap.data() as GlobalSettings;
                    setSettings({
                        ...data,
                        popupOffer: data.popupOffer || { enabled: false, title: '', message: '' }
                    });
                }
            } catch (e) {
                handleFirestoreError(e, OperationType.GET, path);
            }
            setLoading(false);
        };
        loadSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        const path = 'adminSettings/globalAdmin';
        try {
            const docRef = doc(db, 'adminSettings', 'globalAdmin');
            await setDoc(docRef, settings, { merge: true });
            
            // Also notify local changes using localStorage/events so apps reload
            localStorage.setItem('adminGlobalVersion', Date.now().toString());
            window.dispatchEvent(new Event('adminGlobalUpdated'));
            
            addToast('تم حفظ الإعدادات بنجاح', 'success');
        } catch (e) {
             handleFirestoreError(e, OperationType.WRITE, path);
             addToast('حدث خطأ أثناء الحفظ', 'error');
        }
        setSaving(false);
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const base64 = await processImageFile(file, 500);
                setSettings({ ...settings, globalLogoUrl: base64 });
            } catch (err) { addToast('فشل معالجة الصورة', 'error'); }
        }
    };
    
    const handlePopupImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const base64 = await processImageFile(file, 600);
                setSettings({ ...settings, popupOffer: { ...settings.popupOffer!, imageUrl: base64 } });
            } catch (err) { addToast('فشل معالجة الصورة', 'error'); }
        }
    };

    return (
        <div className="p-4 sm:p-6 max-w-4xl mx-auto animate-fadeIn" dir="rtl">
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl border shadow-sm mb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => navigate('/admin-tool')} className="rounded-full w-10 h-10 p-0 text-slate-400">
                        <ArrowLeft />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                            إعدادات الواجهة والإعلانات
                        </h1>
                        <p className="text-slate-500 font-bold text-sm">تخصيص الهوية وعروض العملاء الترويجية</p>
                    </div>
                </div>
                <Button onClick={handleSave} isLoading={saving} className="rounded-2xl h-12 shadow-md hover:shadow-lg font-black px-8">
                    <Save size={20} className="me-2" />
                    حفظ التغييرات
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-10">جاري التحميل...</div>
            ) : (
                <div className="space-y-6">
                    <Card title="بيانات الدعم الفني">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                            <div>
                                <label className="text-xs font-black text-slate-500 mb-1 block">رقم هاتفي للتواصل (واتساب)</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold"
                                    placeholder="مثال: +966..."
                                    value={settings.supportContact?.phone || ''}
                                    onChange={e => setSettings({ ...settings, supportContact: { ...(settings.supportContact || {email: ''}), phone: e.target.value } })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-black text-slate-500 mb-1 block">البريد الإلكتروني للدعم</label>
                                <input 
                                    type="email" 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold"
                                    placeholder="support@example.com"
                                    value={settings.supportContact?.email || ''}
                                    onChange={e => setSettings({ ...settings, supportContact: { ...(settings.supportContact || {phone: ''}), email: e.target.value } })}
                                />
                            </div>
                        </div>
                    </Card>

                    <Card title="هوية النظام (لوجو عالمي)">
                        <div className="flex flex-col gap-6">
                             <div className="flex flex-col md:flex-row gap-8 items-center pt-2">
                                <div className="relative group">
                                    <div className="w-40 h-40 rounded-4xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden transition-colors group-hover:border-indigo-500">
                                        {settings.globalLogoUrl ? (
                                            <img src={settings.globalLogoUrl} className="w-full h-full object-contain p-2" />
                                        ) : (
                                            <ImageIcon size={48} className="text-slate-300" />
                                        )}
                                    </div>
                                    <label className="absolute inset-0 flex items-center justify-center bg-indigo-600/90 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-4xl font-black text-sm">
                                        <Upload size={24} className="me-2" /> رفع الصورة
                                        <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                    </label>
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold mb-2">شعار النظام الخاص بلوحة تسجيل الدخول والدفع</h4>
                                    <p className="text-sm text-slate-500 max-w-md">
                                        هذا الشعار سيظهر لجميع العملاء عند تسجيل الدخول أو عند عدم تحديدهم لشعار خاص لمتجرهم، مفيد لمنح النظام هويتك الخاصة.
                                    </p>
                                    {settings.globalLogoUrl && (
                                        <Button variant="danger" className="mt-4 text-xs font-bold" onClick={() => setSettings({ ...settings, globalLogoUrl: undefined })}>إزالة الشعار</Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card title="إعلان منبثق للعملاء (Popup Offer)">
                        <div className="space-y-6 pt-2">
                            <div className="flex items-center gap-4 bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                                <AlertCircle className="text-indigo-600 flex-shrink-0" size={24} />
                                <div className="flex-1">
                                    <h4 className="font-bold text-indigo-900">تفعيل الإعلان المنبثق</h4>
                                    <p className="text-xs text-indigo-700 font-medium">سيظهر هذا الإعلان لجميع العملاء مرة واحدة عند دخولهم للنظام.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer" 
                                        checked={settings.popupOffer?.enabled || false}
                                        onChange={e => setSettings({ ...settings, popupOffer: { ...settings.popupOffer!, enabled: e.target.checked } })}
                                    />
                                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                </label>
                            </div>

                            {settings.popupOffer?.enabled && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border-2 border-indigo-100 rounded-3xl bg-white shadow-sm">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-black text-slate-500 mb-1 block">عنوان الإعلان</label>
                                            <input 
                                                type="text" 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold"
                                                placeholder="مثال: خصم 50% بمناسبة الجمعة البيضاء"
                                                value={settings.popupOffer.title}
                                                onChange={e => setSettings({ ...settings, popupOffer: { ...settings.popupOffer!, title: e.target.value } })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-black text-slate-500 mb-1 block">نص الإعلان أو العرض</label>
                                            <textarea 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium h-24"
                                                placeholder="تفاصيل العرض هنا..."
                                                value={settings.popupOffer.message}
                                                onChange={e => setSettings({ ...settings, popupOffer: { ...settings.popupOffer!, message: e.target.value } })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-black text-slate-500 mb-1 block">نص زر التخطي</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-sm"
                                                    placeholder="تخطي"
                                                    value={settings.popupOffer.buttonText}
                                                    onChange={e => setSettings({ ...settings, popupOffer: { ...settings.popupOffer!, buttonText: e.target.value } })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-black text-slate-500 mb-1 block">رابط العرض (اختياري)</label>
                                                <input 
                                                    type="url" 
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm"
                                                    placeholder="https://..."
                                                    value={settings.popupOffer.linkUrl || ''}
                                                    onChange={e => setSettings({ ...settings, popupOffer: { ...settings.popupOffer!, linkUrl: e.target.value } })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center justify-center space-y-4">
                                        <label className="text-xs font-black text-slate-500 w-full text-start">صورة الإعلان (اختياري)</label>
                                        <div className="w-full h-48 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center relative group overflow-hidden">
                                            {settings.popupOffer.imageUrl ? (
                                                <img src={settings.popupOffer.imageUrl} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="text-center text-slate-400">
                                                    <ImageIcon size={48} className="mx-auto mb-2" />
                                                    <span className="text-sm font-bold">اضغط أو اسحب صورة</span>
                                                </div>
                                            )}
                                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handlePopupImageUpload} />
                                        </div>
                                        {settings.popupOffer.imageUrl && (
                                            <Button variant="danger" className="text-xs" onClick={() => setSettings({ ...settings, popupOffer: { ...settings.popupOffer!, imageUrl: undefined } })}>
                                                إزالة الصورة
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card title="إدارة ظهور القائمة الجانبية (Sidebar Modules)">
                        <div className="space-y-4 pt-2">
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 mb-4">
                                <p className="text-xs font-bold text-slate-500 mb-2">اختر الأقسام التي تود إخفاءها من القائمة الجانبية لجميع المستخدمين:</p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {NAV_LINKS.flatMap(item => {
                                        if ('children' in item) {
                                            return [item, ...item.children];
                                        }
                                        return [item];
                                    }).map(link => (
                                        <button
                                            key={link.id}
                                            onClick={() => {
                                                const current = settings.hiddenModules || [];
                                                const isHidden = current.includes(link.id);
                                                const next = isHidden 
                                                    ? current.filter(id => id !== link.id)
                                                    : [...current, link.id];
                                                setSettings({ ...settings, hiddenModules: next });
                                            }}
                                            className={`p-3 rounded-xl border-2 transition-all flex items-center gap-3 text-start ${
                                                !(settings.hiddenModules || []).includes(link.id)
                                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700'
                                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 grayscale'
                                            }`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${!(settings.hiddenModules || []).includes(link.id) ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                                                <link.icon size={18} />
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-xs font-black truncate">{'t_key' in link ? link.t_key : 'تسمية مفقودة'}</p>
                                                <p className="text-[10px] opacity-70 font-bold">{!(settings.hiddenModules || []).includes(link.id) ? 'ظاهر' : 'مخفي'}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                                <p className="text-xs font-bold text-slate-500 mb-4">ترتيب وإدارة أولوية الأقسام (اسحب وأفلت للترتيب):</p>
                                
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                    <SortableContext
                                        items={settings.moduleOrder || NAV_LINKS.map(l => l.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="flex flex-col gap-1 max-w-xl">
                                            {(settings.moduleOrder ? 
                                                settings.moduleOrder.map(id => NAV_LINKS.find(l => l.id === id)).filter(Boolean) as typeof NAV_LINKS
                                                : NAV_LINKS
                                            ).map(link => {
                                                const isActive = !(settings.hiddenModules || []).includes(link.id);
                                                const defaultName = 't_key' in link ? link.t_key : 'تسمية مفقودة';
                                                const displayName = settings.customModuleNames?.[defaultName] || defaultName;
                                                return (
                                                    <SortableItem 
                                                        key={link.id} 
                                                        id={link.id} 
                                                        active={isActive} 
                                                        title={displayName} 
                                                        icon={link.icon} 
                                                    />
                                                );
                                            })}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            </div>
                            
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                                <p className="text-xs font-bold text-slate-500 mb-4">تعديل أسماء الأقسام (تغيير مسميات القائمة الجانبية):</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {NAV_LINKS.flatMap(item => ('children' in item ? [item, ...item.children] : [item])).map(link => {
                                        const defaultName = 't_key' in link ? link.t_key : 'تسمية مفقودة';
                                        const isActive = !(settings.hiddenModules || []).includes(link.id);
                                        if (!isActive) return null;
                                        return (
                                            <div key={link.id} className="flex flex-col gap-1.5">
                                                <label className="text-[10px] font-bold text-slate-400 ms-1 flex items-center gap-1.5">
                                                    <link.icon size={12} />
                                                    الاسم الافتراضي: {defaultName}
                                                </label>
                                                <input 
                                                    type="text" 
                                                    className="w-full p-2.5 bg-white dark:bg-slate-900 border rounded-xl font-bold text-sm focus:border-indigo-500 transition-all dark:border-slate-700" 
                                                    placeholder={defaultName}
                                                    value={settings.customModuleNames?.[defaultName] || ''}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setSettings(prev => ({
                                                            ...prev,
                                                            customModuleNames: {
                                                                ...(prev.customModuleNames || {}),
                                                                [defaultName]: val
                                                            }
                                                        }));
                                                    }}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default AdminGlobalSettingsPage;
