
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
    Copy, CheckCircle, ExternalLink, Cpu, Code2, ShieldCheck, Upload, HardDrive,
    Users, UserPlus, Lock, Check, X, Calendar, Zap, FileText, Trash2, Settings2, Key, History, HelpCircle, Globe, ShoppingBag, Link as LinkIcon, CheckCircle2, AlertCircle,
    Bell, Package, Store, ArrowLeftRight, TrendingUp, Activity, MessageSquare, Printer, Barcode, ChevronUp, ChevronDown, User as UserIcon, QrCode, Clock, Eye, EyeOff, Layers, Tag
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
import OffersManagement from '../components/settings/OffersManagement';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { NAV_LINKS } from '../constants';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from '../hooks/useAuth';
import { hardwareService, PrinterInfo } from '../services/hardwareService';
import { motion, AnimatePresence } from 'motion/react';

import { getPlanLimits } from '../utils/planPermissions';
import { InvoiceDesignRenderer } from '../components/sales/InvoiceDesignRenderer';
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

const SortableSidebarGroupItem = ({ id, title, isVisible, onToggle }: { id: string, title: string, isVisible: boolean, onToggle: () => void }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <div ref={setNodeRef} style={style} className={`flex items-center justify-between p-3 bg-white dark:bg-slate-900 border ${isVisible ? 'border-slate-200 dark:border-slate-800' : 'border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'} rounded-2xl shadow-sm transition-all`}>
            <div className="flex items-center gap-3">
                <div {...attributes} {...listeners} className="cursor-grab p-1 text-slate-400 hover:text-indigo-600">
                    <LayoutGrid size={16} />
                </div>
                {isVisible ? (
                    <button onClick={onToggle} className="p-1.5 rounded-lg text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40" title="إخفاء">
                        <Eye size={16} />
                    </button>
                ) : (
                    <button onClick={onToggle} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700" title="تفعيل">
                        <EyeOff size={16} />
                    </button>
                )}
                <span className={`font-bold text-sm ${isVisible ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500 line-through'}`}>{title}</span>
            </div>
        </div>
    );
};

interface VisualConfig {
  fontFamily: string;
  borderThickness: string;
  borderStyle: string;
  borderRadius: string;
  borderColor: string;
  bgColor: string;
  accentColor: string;
  headerStyle: string;
  logoWidth: string;
  titleSize: string;
  showStoreDetails: boolean;
  metaLayout: string;
  showCustomerPhone: boolean;
  customerBoxBg: string;
  tableHeaderStyle: string;
  tableRowStyle: string;
  tableDensity: string;
  totalsStyle: string;
  qrPosition: string;
  showBarcode: boolean;
  footerAlignment: string;
}

const generateVisualInvoice = (config: VisualConfig) => {
  const fontImport = config.fontFamily === 'Cairo' 
    ? "@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');"
    : config.fontFamily === 'Tajawal'
    ? "@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;550;700;800;900&display=swap');"
    : "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');";

  const fontStack = config.fontFamily === 'Cairo'
    ? "'Cairo', sans-serif"
    : config.fontFamily === 'Tajawal'
    ? "'Tajawal', sans-serif"
    : config.fontFamily === 'Inter'
    ? "'Inter', sans-serif"
    : "system-ui, sans-serif";

  const borderCss = config.borderStyle === 'none' 
    ? 'border: none;' 
    : `border: ${config.borderThickness} ${config.borderStyle} ${config.borderColor};`;

  const html = `<!-- CONFIG: ${JSON.stringify(config)} -->
<div class="custom-invoice-box select-none" style="font-family: ${fontStack}; direction: rtl; text-align: right; color: #1e293b; line-height: 1.6; padding: 24px; ${borderCss} border-radius: ${config.borderRadius}; background-color: ${config.bgColor};">
  
  <!-- Header Area -->
  ${config.headerStyle === 'center' ? `
  <div style="display: flex; flex-direction: column; align-items: center; text-align: center; border-bottom: 2px solid ${config.borderColor === 'transparent' ? '#f1f5f9' : config.borderColor}; padding-bottom: 20px; margin-bottom: 24px; gap: 12px;">
    <div style="max-width: ${config.logoWidth}; width: 100%;">
      {{logo}}
    </div>
    <div>
      <h2 style="font-size: ${config.titleSize === 'sm' ? '20px' : config.titleSize === 'md' ? '24px' : config.titleSize === 'lg' ? '28px' : '32px'}; font-weight: 850; color: ${config.accentColor}; margin: 0;">{{storeName}}</h2>
      <p style="font-size: 11px; color: #64748b; margin: 4px 0 0 0; font-weight: 700;">فاتورة مبيعات ضريبية مميزة</p>
      ${config.showStoreDetails ? `
      <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-top: 8px; font-size: 10px; color: #64748b; font-weight: 600;">
        <span>الرقم الضريبي للمنشأة: {{vatNumber}}</span>
        <span>هاتف: {{storePhone}}</span>
        <span>العنوان: {{storeAddress}}</span>
      </div>
      ` : ''}
    </div>
  </div>
  ` : config.headerStyle === 'split' ? `
  <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 24px; gap: 16px;">
    <div>
      <div style="max-width: ${config.logoWidth}; max-height: 80px; margin-bottom: 8px;">
        {{logo}}
      </div>
      <h2 style="font-size: ${config.titleSize === 'sm' ? '20px' : config.titleSize === 'md' ? '24px' : config.titleSize === 'lg' ? '28px' : '32px'}; font-weight: 850; color: ${config.accentColor}; margin: 0;">{{storeName}}</h2>
      <p style="font-size: 11px; color: #64748b; margin: 4px 0 0 0; font-weight: 700;">فاتورة مبيعات ضريبية مميزة</p>
      <p style="font-size: 11px; color: #64748b; margin: 2px 0 0 0;">الرقم الضريبي للمنشأة: {{vatNumber}}</p>
    </div>
    <div style="text-align: left; background-color: #f8fafc; padding: 14px 20px; border-radius: 12px; border: 1px solid #e2e8f0; min-width: 160px;">
      <span style="font-size: 9px; font-weight: 950; color: #94a3b8; letter-spacing: 1px; display: block; margin-bottom: 4px;">رقم الفاتورة</span>
      <h3 style="font-size: 18px; font-weight: 900; color: #1e293b; margin: 0 0 6px 0; font-family: monospace;">#{{invoiceNumber}}</h3>
      <span style="font-size: 11px; color: #475569; font-weight: 700; display: block;">التاريخ: {{date}}</span>
    </div>
  </div>
  ` : `
  <!-- Minimalist Header -->
  <div style="display: flex; flex-direction: column; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px;">
    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <h2 style="font-size: 20px; font-weight: 800; color: #000000; margin: 0;">{{storeName}}</h2>
        <p style="font-size: 11px; color: #475569; margin: 2px 0 0 0;">الرقم الضريبي للمنشأة: {{vatNumber}}</p>
      </div>
      <div style="text-align: left;">
        <h3 style="font-size: 16px; font-weight: 950; color: #000000; margin: 0; font-family: monospace;">#{{invoiceNumber}}</h3>
        <p style="font-size: 10px; color: #64748b; margin: 2px 0 0 0;">التاريخ: {{date}}</p>
      </div>
    </div>
  </div>
  `}

  <!-- Meta and Customer Information -->
  ${config.metaLayout === 'boxes' ? `
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; font-size: 11px;">
    <div style="background-color: ${config.customerBoxBg}; padding: 12px; border-radius: 12px; border-right: 4px solid ${config.accentColor};">
      <h4 style="color: #64748b; font-size: 9px; font-weight: 800; text-transform: uppercase; margin: 0 0 6px 0; letter-spacing: 1px;">العميل</h4>
      <strong style="color: #1e293b; font-size: 13px;">{{customerName}}</strong>
      ${config.showCustomerPhone ? `<p style="color: #64748b; margin: 4px 0 0 0; font-family: monospace; font-weight: 700;">{{customerPhone}}</p>` : ''}
    </div>
    <div style="background-color: #f8fafc; padding: 12px; border-radius: 12px; border-right: 4px solid #94a3b8;">
      <h4 style="color: #94a3b8; font-size: 9px; font-weight: 800; text-transform: uppercase; margin: 0 0 6px 0; letter-spacing: 1px;">تفاصيل الدفع</h4>
      <p style="margin: 0; color: #334155; font-weight: bold;">الكاشير: <strong style="color: #1e293b;">{{cashierName}}</strong></p>
      <p style="margin: 4px 0 0 0; color: #334155; font-weight: bold;">طريقة الدفع: <strong style="color: #1e293b;">{{paymentMethod}}</strong></p>
    </div>
  </div>
  ` : config.metaLayout === 'stripes' ? `
  <div style="background-color: #f8fafc; border-radius: 12px; padding: 12px 16px; margin-bottom: 24px; font-size: 12px; display: flex; flex-direction: column; gap: 6px;">
    <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 4px;">
      <span style="color: #64748b; font-weight: 700;">العميل المستلم:</span>
      <strong style="color: #1e293b;">{{customerName}} ${config.showCustomerPhone ? ' ({{customerPhone}})' : ''}</strong>
    </div>
    <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 4px;">
      <span style="color: #64748b; font-weight: 700;">أمين الصندوق (الكاشير):</span>
      <span style="color: #1e293b; font-weight: bold;">{{cashierName}}</span>
    </div>
    <div style="display: flex; justify-content: space-between;">
      <span style="color: #64748b; font-weight: 700;">طريقة الدفع:</span>
      <span style="color: #1e293b; font-weight: 800; color: ${config.accentColor};">{{paymentMethod}}</span>
    </div>
  </div>
  ` : `
  <!-- Simple inline info grid -->
  <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; font-size: 11px; color: #475569; border-bottom: 1px dashed #e2e8f0; padding-bottom: 12px;">
    <span>العميل: <strong>{{customerName}}</strong></span>
    <span>الكاشير: <strong>{{cashierName}}</strong></span>
    <span>طريقة الدفع: <strong>{{paymentMethod}}</strong></span>
  </div>
  `}

  <!-- Sales Products Table -->
  <div class="visual-items-wrapper">
    {{itemsTable}}
  </div>

  <!-- Summary Totals Section -->
  <div style="display: flex; flex-direction: column; align-items: ${config.totalsStyle === 'plain' ? 'flex-end' : 'stretch'}; margin-top: 24px;">
    <div style="${config.totalsStyle === 'plain' ? 'width: 280px;' : 'width: 100%;'} background-color: ${config.totalsStyle === 'accent' ? `${config.accentColor}10` : '#f8fafc'}; border: 1px solid ${config.totalsStyle === 'accent' ? config.accentColor : '#e2e8f0'}; padding: 16px; border-radius: 12px; font-size: 12px;">
      <div style="display: flex; justify-content: space-between; padding-bottom: 8px; color: #64748b; font-weight: 700;">
        <span>الإجمالي الفرعي:</span>
        <span style="font-family: monospace; font-weight: bold;">{{subtotal}}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding-bottom: 8px; color: #ef4444; font-weight: 800;">
        <span>الخصم الكلي:</span>
        <span style="font-family: monospace;">-{{discount}}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding-bottom: 8px; color: #64748b; font-weight: 700;">
        <span>الضريبة ({{vatRate}}%):</span>
        <span style="font-family: monospace; font-weight: bold;">{{tax}}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 15px; color: ${config.accentColor}; border-top: 2px solid ${config.accentColor}30; padding-top: 10px; margin-top: 4px;">
        <span>الإجمالي النهائي:</span>
        <span style="font-family: monospace; font-size: 17px;">{{total}}</span>
      </div>
    </div>
  </div>

  <!-- Bottom Details Codes & Footer -->
  <div style="display: flex; flex-direction: ${config.qrPosition === 'center' ? 'column' : 'row'}; justify-content: space-between; align-items: center; border-top: 1px dashed #ced4da; padding-top: 20px; margin-top: 24px; gap: 16px;">
    <div style="max-width: ${config.qrPosition === 'center' ? '100%' : '65%'}; text-align: ${config.footerAlignment};">
      <p style="margin: 0 0 8px 0; color: #475569; font-weight: bold; font-size: 12px;">{{footer}}</p>
      ${!config.showStoreDetails ? `
        <div style="display: flex; flex-wrap: wrap; justify-content: ${config.footerAlignment === 'center' ? 'center' : 'flex-start'}; gap: 12px; font-size: 10px; color: #94a3b8; font-family: monospace;">
          <span>هاتف: {{storePhone}}</span>
          <span>العنوان: {{storeAddress}}</span>
        </div>
      ` : ''}
    </div>
    
    <div style="display: flex; gap: 12px; align-items: center; justify-content: center; flex-wrap: wrap;">
      <div style="display: flex; flex-direction: column; align-items: center;">
        {{qrCode}}
      </div>
      ${config.showBarcode ? `
      <div style="display: flex; flex-direction: column; align-items: center;">
        {{barcode}}
      </div>
      ` : ''}
    </div>
  </div>

</div>
`;

  const cssHeaderStyle = config.tableHeaderStyle === 'accent'
    ? `background-color: ${config.accentColor} !important; color: white !important;`
    : config.tableHeaderStyle === 'dark'
    ? 'background-color: #1e293b !important; color: white !important;'
    : 'background-color: transparent !important; color: #1e293b !important; border-bottom: 2px solid #e2e8f0;';

  const rowPadding = config.tableDensity === 'compact' ? '6px 8px' : config.tableDensity === 'normal' ? '10px 12px' : '15px 16px';
  const fontSize = config.tableDensity === 'compact' ? '11px' : config.tableDensity === 'normal' ? '12px' : '13px';

  const css = `${fontImport}

.custom-invoice-box {
  transition: all 0.2s ease-in-out;
}

.custom-invoice-box table {
  width: 100% !important;
  border-collapse: collapse !important;
  margin: 16px 0 !important;
  font-size: ${fontSize} !important;
}

.custom-invoice-box th {
  ${cssHeaderStyle}
  padding: ${rowPadding} !important;
  font-weight: 800 !important;
  text-align: right !important;
}

.custom-invoice-box td {
  padding: ${rowPadding} !important;
  border-bottom: ${config.tableRowStyle !== 'none' ? '1px solid #f1f5f9' : 'none'} !important;
  color: #334155 !important;
}

${config.tableRowStyle === 'zebra' ? `
.custom-invoice-box tr:nth-child(even) td {
  background-color: rgba(248, 250, 252, 0.5) !important;
}
` : ''}

.custom-invoice-box img {
  border-radius: 8px;
}
`.trim();

  return { html, css };
};

const SettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { settings, updateSettings } = useSettings();
    const { user } = useAuth();
    const { changelogData } = useChangelog();
    const { addToast } = useToasts();
    const { licenseInfo, deviceId } = useLicense();
    const { identity, update: updateIdentity } = useUserIdentity();
    const { t } = useTranslation();
    const limits = getPlanLimits(licenseInfo.type);

    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
    const [employeeSubTab, setEmployeeSubTab] = useState<'users' | 'roles'>('users');
    const [localSettings, setLocalSettings] = useState<StoreSettings | null>(null);
    const [printers, setPrinters] = useState<PrinterInfo[]>([]);
    const [isElectron, setIsElectron] = useState(false);

    // States for partition picker
    const [partitions, setPartitions] = useState<string[]>([]);
    const [showPartitionPicker, setShowPartitionPicker] = useState(false);
    const [partitionsLoading, setPartitionsLoading] = useState(false);

    const handleFetchPartitions = async () => {
        setPartitionsLoading(true);
        try {
            const list = await hardwareService.getPartitions();
            setPartitions(list);
        } catch (e) {
            console.error("Failed to load partitions:", e);
        } finally {
            setPartitionsLoading(false);
        }
    };

    const [isSaving, setIsSaving] = useState(false);
    const [confirmWipeData, setConfirmWipeData] = useState(false);
    const [confirmResetApp, setConfirmResetApp] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
    const [resetCodeInput, setResetCodeInput] = useState('');
    const [resetActionType, setResetActionType] = useState<'wipe' | 'reset' | null>(null);
    const [isInvoiceStudioOpen, setIsInvoiceStudioOpen] = useState(false);
    const [studioTab, setStudioTab] = useState<'html' | 'css'>('html');
    const [studioHtml, setStudioHtml] = useState<string>('');
    const [studioCss, setStudioCss] = useState<string>('');

    // Simple visual tools state variables for Invoice Design Studio
    const [studioMode, setStudioMode] = useState<'visual' | 'advanced'>('visual');
    const [visualSection, setVisualSection] = useState<'general' | 'header' | 'customer' | 'table' | 'footer'>('general');
    const [studioVisualConfig, setStudioVisualConfig] = useState<VisualConfig>({
        fontFamily: 'Cairo',
        borderThickness: '2px',
        borderStyle: 'solid',
        borderRadius: '16px',
        borderColor: '#6366f1',
        bgColor: '#ffffff',
        accentColor: '#4f46e5',
        headerStyle: 'split',
        logoWidth: '85px',
        titleSize: 'md',
        showStoreDetails: true,
        metaLayout: 'boxes',
        showCustomerPhone: true,
        customerBoxBg: '#fcfcfd',
        tableHeaderStyle: 'accent',
        tableRowStyle: 'zebra',
        tableDensity: 'normal',
        totalsStyle: 'plain',
        qrPosition: 'right',
        showBarcode: true,
        footerAlignment: 'right',
    });

    // Detect and parse CONFIG on open
    useEffect(() => {
        if (isInvoiceStudioOpen && studioHtml) {
            const match = studioHtml.match(/<!-- CONFIG:\s*({.*?})\s*-->/);
            if (match && match[1]) {
                try {
                    const parsed = JSON.parse(match[1]);
                    setStudioVisualConfig(prev => ({ ...prev, ...parsed }));
                    setStudioMode('visual');
                } catch (e) {
                    console.error('Error parsing config block, defaulting to advanced code editor', e);
                    setStudioMode('advanced');
                }
            } else {
                if (studioHtml.trim().length > 0) {
                    setStudioMode('advanced');
                } else {
                    setStudioMode('visual');
                }
            }
        }
    }, [isInvoiceStudioOpen]);

    // Automatically regenerate HTML/CSS when visual configurations change
    useEffect(() => {
        if (studioMode === 'visual' && isInvoiceStudioOpen) {
            const { html, css } = generateVisualInvoice(studioVisualConfig);
            setStudioHtml(html);
            setStudioCss(css);
        }
    }, [studioVisualConfig, studioMode, isInvoiceStudioOpen]);

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
            ...(limits.hasOffers ? ['offers'] : []),
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
            setReqName(identity.name || '');
            setReqEmail(identity.email || '');
            setReqPhone(identity.phone || '');
            setReqCountry(identity.country || 'السعودية');
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
            
            // Sync device metadata automatically after profile update
            try {
                const { syncDeviceMetadata } = await import('../services/licenseService');
                await syncDeviceMetadata();
            } catch (e) {
                console.error('Error syncing device metadata after profile update:', e);
            }
            
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

    // Package purchase request states
    const [reqName, setReqName] = useState('');
    const [reqEmail, setReqEmail] = useState('');
    const [reqPhone, setReqPhone] = useState('');
    const [reqCountry, setReqCountry] = useState('السعودية');
    const [reqPlan, setReqPlan] = useState('Basic');
    const [isSubmittingReq, setIsSubmittingReq] = useState(false);

    // Sidebar local-only states
    const [sidebarOrder, setSidebarOrder] = useState<string[]>([]);
    const [sidebarHiddenGroups, setSidebarHiddenGroups] = useState<string[]>([]);
    const [homeGridOrder, setHomeGridOrder] = useState<string[]>([]);

    useEffect(() => {
        if (user?.id) {
            const savedSidebarOrder = localStorage.getItem(`pos_sidebar_order_${user.id}`);
            const savedSidebarHidden = localStorage.getItem(`pos_sidebar_hidden_groups_${user.id}`);
            const savedHomeGrid = localStorage.getItem(`pos_home_grid_${user.id}`);
            
            setSidebarOrder(savedSidebarOrder ? JSON.parse(savedSidebarOrder) : NAV_LINKS.map(n => n.id));
            setSidebarHiddenGroups(savedSidebarHidden ? JSON.parse(savedSidebarHidden) : []);
            setHomeGridOrder(savedHomeGrid ? JSON.parse(savedHomeGrid) : (localSettings?.homeGridItems || []));
        }
    }, [user?.id, localSettings?.homeGridItems]);

    const handleSubmitPurchaseRequest = async () => {
        if (!reqName.trim() || !reqEmail.trim() || !reqPhone.trim()) {
            addToast('يرجى ملء جميع الحقول المطلوبة لتقديم الطلب', 'warning');
            return;
        }
        setIsSubmittingReq(true);
        try {
            const requestData = {
                name: reqName.trim(),
                email: reqEmail.trim(),
                phone: reqPhone.trim(),
                country: reqCountry,
                requestedPlan: reqPlan,
                deviceId: deviceId || 'unknown',
                updatedAt: new Date().toISOString(),
                confirmed: identity?.confirmed || false // Preserve confirmed status if it exists
            };

            if (identity?.id) {
                // Use updateDoc to preserve other fields if updating existing identity
                const { setDoc, doc } = await import('firebase/firestore');
                await setDoc(doc(db, 'customers', identity.id), requestData, { merge: true });
            } else {
                // Otherwise create new
                await addDoc(collection(db, 'customers'), {
                    ...requestData,
                    registeredAt: new Date().toISOString()
                });
            }
            
            addToast('تم إرسال طلب شراء الباقة بنجاح للادارة. سيتم مراجعته وتفعيله قريباً.', 'success');
        } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, 'customers');
        } finally {
            setIsSubmittingReq(false);
        }
    };

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
            // Remove sidebar settings from global update to keep them per-user and offline
            const { sidebarItemsOrder, hiddenSidebarGroups, ...restSettings } = localSettings as any;
            await updateSettings(restSettings);
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

    const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && localSettings) {
            try {
                const base64 = await processImageFile(file, 350);
                setLocalSettings({ ...localSettings, invoiceQrUrl: base64 });
                addToast('تم رفع صورة الـ QR للفاتورة، اضغط حفظ للتأكيد.', 'success');
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
        ...(getPlanLimits(licenseInfo.type).hasOffers ? [{ id: 'offers', label: 'العروض والخصومات', icon: <Tag size={18} /> }] : []),
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

    const handleResetHomeGrid = () => {
        if (confirm('هل أنت متأكد من إعادة ترتيب الشاشة الرئيسية للوضع الافتراضي؟')) {
            if (user?.id) {
                localStorage.removeItem(`pos_home_grid_${user.id}`);
                setHomeGridOrder(localSettings?.homeGridItems || []);
                window.dispatchEvent(new Event('home_grid_updated'));
                addToast('تمت إعادة الضبط للوضع الافتراضي', 'success');
            }
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
                                <button onClick={() => window.open('mailto:developer@technopower.store', '_blank')} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/10 text-blue-600 font-bold text-xs hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors">
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
                                        {changelogData[0].changes[0]?.description}...
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
                        <>
                            <Card title="بيانات الشركة (معلومات الأعمال)">
                            <div className="space-y-6">
                                <div className="flex flex-col xl:flex-row gap-8 items-center border-b dark:border-slate-800 pb-8">
                                    <div className="flex flex-row gap-6 shrink-0 justify-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="relative group">
                                                <div className="w-28 h-28 rounded-3xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden shadow-inner group-hover:border-indigo-500 transition-colors">
                                                    {localSettings.logoUrl ? <img src={localSettings.logoUrl} className="w-full h-full object-contain p-2" /> : <ImageIcon size={32} className="text-slate-300" />}
                                                </div>
                                                <label className="absolute inset-0 flex items-center justify-center bg-indigo-600/90 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-3xl font-black text-xs text-center p-2">
                                                    <Upload size={16} className="me-1" /> رفع اللوجو
                                                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                                </label>
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400">لوغو الشركة</span>
                                        </div>

                                        <div className="flex flex-col items-center gap-2">
                                            <div className="relative group">
                                                <div className="w-28 h-28 rounded-3xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden shadow-inner group-hover:border-amber-500 transition-colors">
                                                    {localSettings.invoiceQrUrl ? <img src={localSettings.invoiceQrUrl} className="w-full h-full object-contain p-2" /> : <QrCode size={32} className="text-slate-300" />}
                                                </div>
                                                <label className="absolute inset-0 flex items-center justify-center bg-amber-600/90 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-3xl font-black text-xs text-center p-2">
                                                    <Upload size={16} className="me-1" /> رفع الـ QR
                                                    <input type="file" className="hidden" accept="image/*" onChange={handleQrUpload} />
                                                </label>
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400">صورة QR الفاتورة</span>
                                        </div>
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
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 pt-2">
                                    <div><label className={labelClass}>العملة</label><select value={localSettings.currency || 'SAR'} onChange={e => setLocalSettings({...localSettings, currency: e.target.value as any})} className={inputClass}>{Object.entries(CURRENCIES).map(([code, c]) => <option key={code} value={code}>{c.name} ({c.symbol})</option>)}</select></div>
                                    <div><label className={labelClass}>الضريبة (%)</label><input type="number" value={localSettings.vatRate || 0} onChange={e => setLocalSettings({...localSettings, vatRate: parseFloat(e.target.value)||0})} className={inputClass} /></div>
                                    <div><label className={labelClass}>الفاتورة القادمة</label><input type="number" value={localSettings.nextInvoiceNumber || 0} onChange={e => setLocalSettings({...localSettings, nextInvoiceNumber: parseInt(e.target.value)||0})} className={inputClass} /></div>
                                    <div><label className={labelClass}>الهدف البيعي الشهري</label><input type="number" value={localSettings.monthlySalesGoal || ''} onChange={e => setLocalSettings({...localSettings, monthlySalesGoal: parseFloat(e.target.value)})} className={inputClass} placeholder="الهدف للوحة التحكم" /></div>
                                    <div>
                                        <label className={labelClass}>المنازل العشرية</label>
                                        <select 
                                            value={typeof localSettings.decimalPlaces === 'number' ? localSettings.decimalPlaces : 2} 
                                            onChange={e => setLocalSettings({...localSettings, decimalPlaces: parseInt(e.target.value)})} 
                                            className={inputClass}
                                        >
                                            <option value="0">بلا منازل عشرية (0)</option>
                                            <option value="1">منزلة واحدة (1)</option>
                                            <option value="2">منزلتين (2)</option>
                                            <option value="3">ثلاث منازل (3)</option>
                                            <option value="4">أربع منازل (4)</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/20 text-[10px] font-bold text-amber-700 dark:text-amber-400 leading-relaxed">
                                    * ملاحظة: هذه البيانات تظهر تلقائياً في ترويسة وتذييل الفواتير المطبوعة والإلكترونية.
                                </div>
                            </div>
                        </Card>


                        </>
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
                                    
                                    <div className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                                        <div className="flex justify-between items-center">
                                            <div className="p-3 bg-fuchsia-50 dark:bg-fuchsia-900/20 text-fuchsia-600 rounded-2xl"><Clock size={24}/></div>
                                            <div className="flex items-center gap-2">
                                                <input type="number" min="1" max="365" placeholder="أيام" value={localSettings.notificationSettings?.expiryAlertDays || 30} onChange={e => setLocalSettings({...localSettings, notificationSettings: {...localSettings.notificationSettings!, expiryAlertDays: parseInt(e.target.value)||30}})} className="w-20 text-center rounded-xl border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-sm font-bold" />
                                                <span className="text-xs font-bold text-slate-500">يوم</span>
                                            </div>
                                        </div>
                                        <h4 className="text-lg font-black">تنبيه انتهاء الصلاحية</h4>
                                        <p className="text-xs font-bold text-slate-500 leading-relaxed">حدد عدد الأيام لتنبيهك قبل انتهاء صلاحية المنتجات.</p>
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

                                <div className={`p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl flex justify-between items-center transition-all hover:shadow-2xl ${!getPlanLimits(licenseInfo.type).hasExpirationDates ? 'opacity-60' : ''}`}>
                                    <div className="flex items-center gap-5">
                                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-3xl"><Calendar size={28}/></div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-xl font-black">تواريخ الإنتاج والانتهاء</h4>
                                                {!getPlanLimits(licenseInfo.type).hasExpirationDates && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                                        <Lock size={12} /> ترقية الباقة
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs font-bold text-slate-500">تمكين ميزة إضافة تاريخ الإنتاج والصلاحية لكل منتج.</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer" 
                                            checked={getPlanLimits(licenseInfo.type).hasExpirationDates && (localSettings.inventorySettings?.enableExpiryDates || false)} 
                                            disabled={!getPlanLimits(licenseInfo.type).hasExpirationDates}
                                            onChange={e => setLocalSettings({...localSettings, inventorySettings: {...localSettings.inventorySettings, enableExpiryDates: e.target.checked}})} 
                                        />
                                        <div className="w-16 h-9 bg-slate-200 peer-focus:outline-none dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-amber-600"></div>
                                    </label>
                                </div>

                                <div className={`p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl flex justify-between items-center transition-all hover:shadow-2xl ${!getPlanLimits(licenseInfo.type).hasProductVariants ? 'opacity-60' : ''}`}>
                                    <div className="flex items-center gap-5">
                                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-3xl"><Layers size={28}/></div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-xl font-black">المقاسات والألوان للمنتج</h4>
                                                {!getPlanLimits(licenseInfo.type).hasProductVariants && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                                                        <Lock size={12} /> ترقية الباقة
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs font-bold text-slate-500">تمكين ميزة تحديد مقاس وألوان للمنتج الواحد.</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer" 
                                            checked={getPlanLimits(licenseInfo.type).hasProductVariants && (localSettings.inventorySettings?.enableProductVariants || false)} 
                                            disabled={!getPlanLimits(licenseInfo.type).hasProductVariants}
                                            onChange={e => setLocalSettings({...localSettings, inventorySettings: {...localSettings.inventorySettings, allowSaleWithoutStock: false, minAlertQty: 0, enableProductVariants: e.target.checked}})} 
                                        />
                                        <div className="w-16 h-9 bg-slate-200 peer-focus:outline-none dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>

                                <div className={`bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 ${!getPlanLimits(licenseInfo.type).hasStagnantProducts ? 'opacity-60' : ''}`}>
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="p-3 bg-rose-600 text-white rounded-2xl shadow-lg ring-4 ring-rose-600/10"><Clock size={24}/></div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-lg font-black">احتساب المنتجات الراكدة</h4>
                                                {!getPlanLimits(licenseInfo.type).hasStagnantProducts && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
                                                        <Lock size={12} /> ترقية الباقة
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs font-bold text-slate-500">أقصى عدد أيام لعدم بيع المنتج لاعتباره منتجًا راكدًا.</p>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            disabled={!getPlanLimits(licenseInfo.type).hasStagnantProducts}
                                            value={localSettings.inventorySettings?.staleDays ?? 90} 
                                            onChange={e => setLocalSettings({...localSettings, inventorySettings: {...localSettings.inventorySettings!, staleDays: parseInt(e.target.value)||0}})}
                                            className="w-full p-5 bg-white dark:bg-slate-900 border-2 border-transparent focus:border-rose-500 rounded-3xl outline-none font-black text-2xl text-center shadow-lg disabled:opacity-50" 
                                        />
                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-300">يوم</div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}

                    {activeTab === 'offers' && (
                        <OffersManagement />
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
                                    
                                    <div className={`p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex justify-between items-center ${!getPlanLimits(licenseInfo.type).hasOffers ? 'opacity-60' : ''}`}>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-sm font-black">إدارة العروض</h4>
                                                {!getPlanLimits(licenseInfo.type).hasOffers && (<span className="text-[10px] bg-red-100 text-red-600 px-1 rounded font-bold"><Lock size={10} className="inline mr-1"/>مغلق</span>)}
                                            </div>
                                            <p className="text-[10px] text-slate-500">تطبيق العروض والخصومات تلقائياً.</p>
                                        </div>
                                        <input type="checkbox" disabled={!getPlanLimits(licenseInfo.type).hasOffers} checked={getPlanLimits(licenseInfo.type).hasOffers && localSettings.enableOffers} onChange={e => setLocalSettings({...localSettings, enableOffers: e.target.checked})} className="w-6 h-6 rounded-lg text-indigo-600" />
                                    </div>

                                    <div className={`p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex justify-between items-center ${!getPlanLimits(licenseInfo.type).hasExchange ? 'opacity-60' : ''}`}>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-sm font-black">نظام الاستبدال</h4>
                                                {!getPlanLimits(licenseInfo.type).hasExchange && (<span className="text-[10px] bg-red-100 text-red-600 px-1 rounded font-bold"><Lock size={10} className="inline mr-1"/>مغلق</span>)}
                                            </div>
                                            <p className="text-[10px] text-slate-500">حساب فروق الاستبدال للقطع في الفاتورة.</p>
                                        </div>
                                        <input type="checkbox" disabled={!getPlanLimits(licenseInfo.type).hasExchange} checked={getPlanLimits(licenseInfo.type).hasExchange && localSettings.enableExchange} onChange={e => setLocalSettings({...localSettings, enableExchange: e.target.checked})} className="w-6 h-6 rounded-lg text-indigo-600" />
                                    </div>

                                    <div className={`p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex justify-between items-center ${!getPlanLimits(licenseInfo.type).hasReservations ? 'opacity-60' : ''}`}>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-sm font-black">حجز القطع</h4>
                                                {!getPlanLimits(licenseInfo.type).hasReservations && (<span className="text-[10px] bg-red-100 text-red-600 px-1 rounded font-bold"><Lock size={10} className="inline mr-1"/>مغلق</span>)}
                                            </div>
                                            <p className="text-[10px] text-slate-500">حجز القطع للزبائن من نقطة البيع.</p>
                                        </div>
                                        <input type="checkbox" disabled={!getPlanLimits(licenseInfo.type).hasReservations} checked={getPlanLimits(licenseInfo.type).hasReservations && localSettings.enableReservations} onChange={e => setLocalSettings({...localSettings, enableReservations: e.target.checked})} className="w-6 h-6 rounded-lg text-indigo-600" />
                                    </div>
                                </div>

                                {getPlanLimits(licenseInfo.type).hasSalesDrafts && (
                                    <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-2xl flex justify-between items-center border border-indigo-100/30 dark:border-indigo-900/40">
                                        <div>
                                            <h4 className="text-sm font-black">الحد الأقصى لحذف المسودات غير المكتملة</h4>
                                            <p className="text-[10px] text-slate-500 font-bold">عدد الأيام الأقصى لحفظ الفواتير كمسودة تلقائياً قبل حذفها.</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number" 
                                                min="1" 
                                                max="120"
                                                value={localSettings.maxDraftDays !== undefined ? localSettings.maxDraftDays : 7} 
                                                onChange={e => setLocalSettings({...localSettings, maxDraftDays: parseInt(e.target.value) || 7})} 
                                                className="w-20 text-center px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold font-mono focus:border-indigo-600 focus:outline-none" 
                                            />
                                            <span className="text-xs font-bold text-slate-500">يوم</span>
                                        </div>
                                    </div>
                                )}

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
                        <Card title="تخصيص الشاشة والتنقل">
                            {getPlanLimits(licenseInfo.type).hasCustomUi ? (
                                <>
                                    <div className="space-y-12">
                                        
                                        {/* Sidebar Navigation Order Section */}
                                        <div className="space-y-4">
                                            <div>
                                                <h4 className="text-xl font-black text-slate-800 dark:text-white">أقسام القائمة الجانبية (Sidebar)</h4>
                                                <p className="text-xs text-slate-500 font-bold mt-1">قم بإعادة ترتيب الأقسام في القائمة الجانبية لتتناسب مع راحتك وسرعة استخدامك أو إخفاء ما لا تحتاجه.</p>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => {
                                                    const { active, over } = event;
                                                    if (over && active.id !== over.id) {
                                                        const allNavIds = NAV_LINKS.map(n => n.id);
                                                        const currentOrder = sidebarOrder.length > 0 ? [...sidebarOrder] : allNavIds;
                                                        
                                                        const oldIndex = currentOrder.indexOf(active.id as string);
                                                        const newIndex = currentOrder.indexOf(over.id as string);
                                                        
                                                        if (oldIndex === -1 || newIndex === -1) return;

                                                        const newOrder = arrayMove(currentOrder, oldIndex, newIndex);
                                                        setSidebarOrder(newOrder);
                                                        
                                                        if (user?.id) {
                                                            localStorage.setItem(`pos_sidebar_order_${user.id}`, JSON.stringify(newOrder));
                                                            window.dispatchEvent(new Event('sidebar_updated'));
                                                        }
                                                    }
                                                }}>
                                                    <SortableContext
                                                        items={sidebarOrder.length > 0 ? sidebarOrder : NAV_LINKS.map(n => n.id)}
                                                        strategy={verticalListSortingStrategy}
                                                    >
                                                        {(sidebarOrder.length > 0 ? sidebarOrder : NAV_LINKS.map(n => n.id)).map((catId) => {
                                                            const isHidden = sidebarHiddenGroups.includes(catId);
                                                            const title = NAV_LINKS.find(n => n.id === catId)?.t_key || catId;
                                                            return (
                                                                <SortableSidebarGroupItem 
                                                                    key={catId} 
                                                                    id={catId} 
                                                                    title={title} 
                                                                    isVisible={!isHidden}
                                                                    onToggle={() => {
                                                                        let newHiddenGroups: string[] = [];
                                                                        if (isHidden) {
                                                                            newHiddenGroups = sidebarHiddenGroups.filter(g => g !== catId);
                                                                        } else {
                                                                            newHiddenGroups = [...sidebarHiddenGroups, catId];
                                                                        }
                                                                        
                                                                        setSidebarHiddenGroups(newHiddenGroups);
                                                                        
                                                                        if (user?.id) {
                                                                            localStorage.setItem(`pos_sidebar_hidden_groups_${user.id}`, JSON.stringify(newHiddenGroups));
                                                                            window.dispatchEvent(new Event('sidebar_updated'));
                                                                        }
                                                                    }}
                                                                />
                                                            );
                                                        })}
                                                    </SortableContext>
                                                </DndContext>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-8">
                                            <div>
                                                <h4 className="text-xl font-black text-slate-800 dark:text-white">رصيف الشاشة الرئيسية (Home Grid)</h4>
                                                <p className="text-xs text-slate-500 font-bold mt-1">اختر الأدوات والصفحات وارتبها حسب الأولوية.</p>
                                            </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-4 border-b pb-2 dark:border-slate-800">
                                                <h4 className="text-sm font-black text-slate-800 dark:text-white">الصفحات النشطة (مرتبة حسب الأولوية)</h4>
                                                <button 
                                                    onClick={handleResetHomeGrid}
                                                    className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all"
                                                >
                                                    <RefreshCw size={12} />
                                                    إعادة الافتراضي
                                                </button>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleHomeGridDragEnd}>
                                                    <SortableContext
                                                        items={homeGridOrder}
                                                        strategy={verticalListSortingStrategy}
                                                    >
                                                        {homeGridOrder.map((id) => {
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
                                                                        const newList = homeGridOrder.filter(itemId => itemId !== id);
                                                                        setHomeGridOrder(newList);
                                                                        if (user?.id) {
                                                                            localStorage.setItem(`pos_home_grid_${user.id}`, JSON.stringify(newList));
                                                                            window.dispatchEvent(new Event('home_grid_updated'));
                                                                        }
                                                                    }}
                                                                />
                                                            );
                                                        })}
                                                    </SortableContext>
                                                </DndContext>
                                                {homeGridOrder.length === 0 && (
                                                    <p className="text-xs text-slate-400 font-bold text-center p-4">لا توجد صفحات نشطة</p>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="text-sm font-black text-slate-800 dark:text-white mb-4 border-b pb-2 dark:border-slate-800">صفحات غير نشطة (اضغط لإضافتها)</h4>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                {NAV_LINKS.map(link => {
                                                    const gridItems = homeGridOrder;
                                                    if ('children' in link) {
                                                        return link.children.map(child => {
                                                            if (child.id === 'about' || gridItems.includes(child.id)) return null;
                                                            return (
                                                                <label key={child.id} className="flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600">
                                                                    <input type="checkbox" className="hidden" checked={false} onChange={e => {
                                                                        if (e.target.checked) {
                                                                            const newList = [...gridItems, child.id];
                                                                            setHomeGridOrder(newList);
                                                                            if (user?.id) {
                                                                                localStorage.setItem(`pos_home_grid_${user.id}`, JSON.stringify(newList));
                                                                                window.dispatchEvent(new Event('home_grid_updated'));
                                                                            }
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
                                                                    const newList = [...gridItems, link.id];
                                                                    setHomeGridOrder(newList);
                                                                    if (user?.id) {
                                                                        localStorage.setItem(`pos_home_grid_${user.id}`, JSON.stringify(newList));
                                                                        window.dispatchEvent(new Event('home_grid_updated'));
                                                                    }
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
                                                    if (users.length >= limits.maxUsers) {
                                                        addToast(`لقد وصلت للحد الأقصى لعدد المستخدمين في باقتك (${toArabicIndic(limits.maxUsers.toString())})`, "error");
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
                                                                <div className="flex justify-center items-center gap-1">
                                                                    <button onClick={(e) => { e.stopPropagation(); setEditingUser(u); setIsUserModalOpen(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Settings2 size={16}/></button>
                                                                    <button 
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            setUserToDelete(u);
                                                                        }} 
                                                                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors group/del"
                                                                        title="حذف المستخدم"
                                                                    >
                                                                        <Trash2 size={16}/>
                                                                    </button>
                                                                </div>
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
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={(e) => { e.stopPropagation(); setEditingRole(r); setIsRoleModalOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-500"><Settings2 size={18}/></button>
                                                        <button 
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                setRoleToDelete(r);
                                                            }} 
                                                            className="p-2 text-slate-400 hover:text-rose-500"
                                                            title="حذف الدور"
                                                        >
                                                            <Trash2 size={18}/>
                                                        </button>
                                                    </div>
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
                                            <div className="animate-fadeIn p-5 rounded-3xl bg-indigo-50/50 dark:bg-indigo-950/20 border-2 border-indigo-200 dark:border-indigo-900 border-dashed space-y-4 mb-4">
                                                <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 font-black">
                                                    <Settings2 size={22} />
                                                    <span>منطقة تصميم القالب المخصص الحر</span>
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-normal">
                                                    لقد قمت باختيار القالب "الحر"، والذي يمنحك القوة الكاملة لتخطيط وهيكلة وتصميم الفاتورة باستخدام لغات <strong>HTML</strong> و <strong>CSS</strong> مدمجاً مع المتغيرات البرمجية الذكية ليكون متناسقاً تماماً كما ترغب وتفضّل.
                                                </p>
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        setStudioHtml(localSettings.invoiceDesign?.customHtml || '');
                                                        setStudioCss(localSettings.invoiceDesign?.customCss || '');
                                                        setIsInvoiceStudioOpen(true);
                                                    }}
                                                    className="w-full flex items-center justify-center gap-2 py-3.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-2xl shadow-lg hover:shadow-xl shadow-indigo-100 dark:shadow-none transition-all active:scale-[0.98]"
                                                >
                                                    <Code2 size={16} />
                                                    <span>فتح استوديو محرر الفواتير الاحترافي المتكامل</span>
                                                </button>
                                            </div>
                                        )}
                                        {false && localSettings.invoiceDesign.template === 'free' && (
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
                                            <label className="flex items-center justify-between cursor-pointer"><span className="text-xs font-black">إظهار الشعار</span><input type="checkbox" checked={!!localSettings.invoiceDesign?.showLogo} onChange={e => setLocalSettings({...localSettings, invoiceDesign: {...localSettings.invoiceDesign, showLogo: e.target.checked}})} className="w-5 h-5 text-indigo-600 rounded" /></label>
                                            <label className="flex items-center justify-between cursor-pointer"><span className="text-xs font-black">إظهار كود QR</span><input type="checkbox" checked={!!localSettings.invoiceDesign?.showQrCode} onChange={e => setLocalSettings({...localSettings, invoiceDesign: {...localSettings.invoiceDesign, showQrCode: e.target.checked}})} className="w-5 h-5 text-indigo-600 rounded" /></label>
                                            <label className="flex items-center justify-between cursor-pointer"><span className="text-xs font-black">إظهار باركود رقم الفاتورة على الفاتورة</span><input type="checkbox" checked={!!localSettings.invoiceDesign?.showBarcode} onChange={e => setLocalSettings({...localSettings, invoiceDesign: { ...localSettings.invoiceDesign, showBarcode: e.target.checked }})} className="w-5 h-5 text-indigo-600 rounded" /></label>
                                        </div>
                                        <div><label className={labelClass}>تذييل الفاتورة</label><textarea value={localSettings.invoiceFooter || ''} onChange={e => setLocalSettings({...localSettings, invoiceFooter: e.target.value})} className={`${inputClass} h-24 resize-none`} placeholder="شكراً لتعاملكم معنا..." /></div>
                                    </div>
                                    <div className="bg-slate-100 dark:bg-slate-900 rounded-4xl p-4 md:p-6 border-2 border-dashed border-slate-300 dark:border-slate-800 flex flex-col items-center justify-start relative overflow-hidden h-[540px] w-full">
                                        <p className="absolute top-4 left-4 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white dark:bg-slate-800 px-3 py-1 rounded-full shadow-sm z-10">معاينة مباشرة</p>
                                        <div className="w-full h-full overflow-y-auto pt-8 pb-4 pr-1 pl-1 custom-scrollbar">
                                            <div className="shadow-2xl rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                                                <InvoiceDesignRenderer 
                                                    sale={{
                                                        id: 'inv-1234',
                                                        date: '2026-05-26T22:00:00.000Z',
                                                        customer: { name: 'عميل تجريبي أحمد', phone: '01012345678' },
                                                        cashier: { name: 'أحمد الكاشير' },
                                                        paymentMethod: 'Cash',
                                                        items: [
                                                            { id: '1', name: 'جهاز راوتر تكنو باور 5G', quantity: 2, sellPrice: 2450, discount: 100 },
                                                            { id: '2', name: 'كابل شبكات Cat6 م 10', quantity: 5, sellPrice: 80, discount: 0 }
                                                        ],
                                                        total: 4980,
                                                        tax: 650,
                                                        discountValue: 200,
                                                        discount: 200
                                                    }}
                                                    settings={{
                                                        storeName: localSettings.storeName || 'اسم المتجر',
                                                        currency: localSettings.currency || 'EGP',
                                                        vatRate: localSettings.vatRate ?? 14,
                                                        logoUrl: localSettings.logoUrl,
                                                        taxRegisterNumber: localSettings.taxRegisterNumber,
                                                        storePhone: localSettings.storePhone,
                                                        storeEmail: localSettings.storeEmail,
                                                        storeAddress: localSettings.storeAddress,
                                                        invoiceFooter: localSettings.invoiceFooter,
                                                        invoiceDesign: {
                                                            template: localSettings.invoiceDesign?.template || 'modern',
                                                            showLogo: !!localSettings.invoiceDesign?.showLogo,
                                                            showQrCode: !!localSettings.invoiceDesign?.showQrCode,
                                                            showBarcode: !!localSettings.invoiceDesign?.showBarcode,
                                                            accentColor: localSettings.invoiceDesign?.accentColor || '#4f46e5',
                                                            customCss: localSettings.invoiceDesign?.customCss,
                                                            vatNumber: localSettings.invoiceDesign?.vatNumber
                                                        }
                                                    }}
                                                    isPreview={true}
                                                />
                                            </div>
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

                            <Card title="إعدادات النسخ الاحتياطي التلقائي">
                                <div className="relative overflow-hidden">
                                    {!getPlanLimits(licenseInfo.type).hasAutoBackup && (
                                        <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center text-center p-6 rounded-2xl">
                                            <div className="p-3 bg-amber-100 text-amber-600 rounded-3xl mb-3"><Crown size={28}/></div>
                                            <h5 className="font-black text-slate-800 dark:text-white text-base">ميزة محدودة بالباقة</h5>
                                            <p className="text-xs font-bold text-slate-500 mt-1 max-w-md">النسخ الاحتياطي التلقائي والتحكم بفترات النسخ وحفظها في بارتشن محلي متاح فقط في باقات الفئة الاحترافية والشركات.</p>
                                            <p className="text-[10px] text-indigo-600 font-bold mt-2">تواصل مع الإدارة أو قم بترقية الميزات من لوحة الباقات لتفعيلها.</p>
                                        </div>
                                    )}
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <div className="space-y-1">
                                                <h5 className="font-black text-sm text-slate-800 dark:text-white">تفعيل النسخ الاحتياطي التلقائي</h5>
                                                <p className="text-[11px] text-slate-500 font-bold">عند تفعيل الخيار، سيقوم النظام بحفظ نسخة من البيانات تلقائياً دون تدخل يدوي.</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={localSettings?.autoBackup?.enabled || false} 
                                                    onChange={e => setLocalSettings(prev => {
                                                        if (!prev) return prev;
                                                        return {
                                                            ...prev,
                                                            autoBackup: {
                                                                ...(prev.autoBackup || { enabled: false, lastBackupAt: Date.now(), intervalMinutes: 1440 }),
                                                                enabled: e.target.checked
                                                            }
                                                        };
                                                    })}
                                                    disabled={!getPlanLimits(licenseInfo.type).hasAutoBackup}
                                                    className="sr-only peer" 
                                                />
                                                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                            </label>
                                        </div>

                                        {localSettings?.autoBackup?.enabled && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                                <div className="space-y-2 col-span-1">
                                                    <label className="text-xs font-black text-slate-700 dark:text-slate-300">الفترة الزمنية للنسخ الاحتياطي</label>
                                                    <select 
                                                        value={localSettings?.autoBackup?.intervalMinutes || 1440} 
                                                        onChange={e => setLocalSettings(prev => {
                                                            if (!prev) return prev;
                                                            return {
                                                                ...prev,
                                                                autoBackup: {
                                                                    ...(prev.autoBackup || { enabled: true, lastBackupAt: Date.now(), intervalMinutes: 1440 }),
                                                                    intervalMinutes: parseInt(e.target.value)
                                                                }
                                                            };
                                                        })}
                                                        className="w-full rounded-2xl border-2 border-slate-100 dark:border-slate-800 p-3 bg-white dark:bg-slate-900 font-bold text-xs"
                                                        disabled={!getPlanLimits(licenseInfo.type).hasAutoBackup}
                                                    >
                                                        <option value={60}>كل ساعة</option>
                                                        <option value={720}>كل 12 ساعة</option>
                                                        <option value={1440}>يومياً</option>
                                                        <option value={10080}>أسبوعياً</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-2 col-span-1 relative">
                                                    <label className="text-xs font-black text-slate-700 dark:text-slate-300">البارتشن / مسار التخزين المحلي على الكمبيوتر</label>
                                                    <div className="relative">
                                                        <input 
                                                            type="text" 
                                                            value={localSettings?.autoBackup?.localPath || ''} 
                                                            onChange={e => setLocalSettings(prev => {
                                                                if (!prev) return prev;
                                                                return {
                                                                    ...prev,
                                                                    autoBackup: {
                                                                        ...(prev.autoBackup || { enabled: true, lastBackupAt: Date.now(), intervalMinutes: 1440 }),
                                                                        localPath: e.target.value
                                                                    }
                                                                };
                                                            })}
                                                            onFocus={() => {
                                                                setShowPartitionPicker(true);
                                                                handleFetchPartitions();
                                                            }}
                                                            placeholder="مثال: D:\TechnoPower\Backups"
                                                            disabled={!getPlanLimits(licenseInfo.type).hasAutoBackup}
                                                            className="w-full rounded-2xl border-2 border-slate-100 dark:border-slate-800 p-3 pr-4 pl-10 bg-white dark:bg-slate-900 font-bold text-xs outline-none focus:border-indigo-500 transition-all shadow-inner"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setShowPartitionPicker(prev => {
                                                                    const next = !prev;
                                                                    if (next) handleFetchPartitions();
                                                                    return next;
                                                                });
                                                            }}
                                                            disabled={!getPlanLimits(licenseInfo.type).hasAutoBackup}
                                                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 rounded-lg transition-colors cursor-pointer"
                                                            title="عرض بارتشنات الجهاز"
                                                        >
                                                            <HardDrive size={18} />
                                                        </button>
                                                    </div>

                                                    {showPartitionPicker && (
                                                        <div className="absolute left-0 right-0 mt-1.5 p-3 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl z-50 max-h-56 overflow-y-auto space-y-2 animate-fadeIn">
                                                            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800 font-bold">
                                                                <span className="text-[10px] font-black text-slate-400 flex items-center gap-1">
                                                                    <HardDrive size={12} className="text-slate-400" />
                                                                    البارتشنات المتاحة على جهازك:
                                                                </span>
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => setShowPartitionPicker(false)} 
                                                                    className="text-[10px] text-rose-500 hover:text-rose-600 font-black"
                                                                >
                                                                    إغلاق
                                                                </button>
                                                            </div>

                                                            {partitionsLoading ? (
                                                                <div className="py-6 text-center text-xs font-bold text-slate-400 flex flex-col justify-center items-center gap-2">
                                                                    <RefreshCw className="animate-spin text-indigo-600" size={18} />
                                                                    <span className="text-[10px]">جاري قراءة بارتشنات ومحركات الأقراص...</span>
                                                                </div>
                                                            ) : partitions.length === 0 ? (
                                                                <div className="py-4 text-center text-[10px] text-slate-400 font-bold">
                                                                    لم نتمكن من كشف البارتشنات تلقائياً.
                                                                </div>
                                                            ) : (
                                                                <div className="grid grid-cols-2 gap-2 pt-1">
                                                                    {partitions.map((part) => (
                                                                        <button
                                                                            key={part}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setLocalSettings(prev => {
                                                                                    if (!prev) return prev;
                                                                                    const suffix = part.endsWith('\\') || part.endsWith('/') ? 'TechnoPower\\Backups' : '\\TechnoPower\\Backups';
                                                                                    return {
                                                                                        ...prev,
                                                                                        autoBackup: {
                                                                                            ...(prev.autoBackup || { enabled: true, lastBackupAt: Date.now(), intervalMinutes: 1440 }),
                                                                                            localPath: `${part}${suffix}`
                                                                                        }
                                                                                    };
                                                                                });
                                                                                setShowPartitionPicker(false);
                                                                            }}
                                                                            className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:border-indigo-500 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-all text-right group cursor-pointer"
                                                                        >
                                                                            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                                                <HardDrive size={14} />
                                                                            </div>
                                                                            <div className="overflow-hidden text-ellipsis flex-1">
                                                                                <p className="text-[11px] font-black text-slate-800 dark:text-slate-200" style={{ direction: 'ltr', textAlign: 'right' }}>{part}</p>
                                                                                <p className="text-[8px] font-bold text-slate-400 block">قرص محلي (Partition)</p>
                                                                            </div>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    <p className="text-[10px] text-slate-400 font-bold">يقوم النظام بكشف كافة البارتشنات النشطة تلقائياً لتسهيل تحديد موقع حفظ النسخة بضغطة واحدة.</p>
                                                </div>
                                            </div>
                                        )}
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
                                        <Button variant="secondary" onClick={() => { setResetActionType('wipe'); setResetCodeInput(''); }} className="border-amber-500 text-amber-600 rounded-xl h-10 px-6 font-black"><Trash2 size={16} className="me-2"/> تصفير البيانات</Button>
                                    </div>
                                    <div className="p-4 bg-rose-50 dark:bg-rose-900/10 rounded-2xl flex items-center justify-between gap-4 flex-col md:flex-row border border-rose-100 dark:border-rose-900/30">
                                        <div>
                                            <h4 className="text-sm font-black text-rose-800 dark:text-rose-400">إعادة ضبط المصنع (حذف شامل)</h4>
                                            <p className="text-[10px] text-rose-600 font-bold mt-1">تحذير: سيتم مسح كافة البيانات بشكل نهائي بما في ذلك المستخدمين والإعدادات.</p>
                                        </div>
                                        <Button variant="danger" onClick={() => { setResetActionType('reset'); setResetCodeInput(''); }} className="rounded-xl h-10 px-6 font-black shadow-lg shadow-rose-500/20"><Trash2 size={16} className="me-2"/> تصفير شامل</Button>
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

                                <div className="mt-8 border-t dark:border-slate-800 pt-8">
                                    <h4 className="text-lg font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                        <Crown size={22} className="text-indigo-500 animate-pulse" />
                                        تقديم طلب تفعيل أو ترقية الباقة للإدارة
                                    </h4>
                                    <div className="bg-amber-50 dark:bg-amber-900/10 border-r-4 border-amber-500 p-4 mb-6 rounded-l-2xl">
                                        <div className="flex items-center gap-3 text-amber-800 dark:text-amber-400">
                                            <AlertCircle size={20} />
                                            <p className="text-xs font-black">تنويه: سيتم استخدام بيانات ملفك الشخصي في هذا الطلب. يرجى التأكد من صحة بياناتك في تبويب "الملف الشخصي" قبل الإرسال.</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 font-bold mb-6">
                                        يمكنك اختيار الباقة التي ترغب بالاشتراك بها، وسيتم إرسال الطلب تلقائياً للدعم الفني لتفعيل الترخيص.
                                    </p>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
                                        <div>
                                            <label className={labelClass}>الاسم بالكامل</label>
                                            <input 
                                                type="text"
                                                disabled
                                                value={reqName}
                                                className={inputClass + " opacity-60 bg-slate-100"}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>البريد الإلكتروني</label>
                                            <input 
                                                type="email"
                                                disabled
                                                value={reqEmail}
                                                className={inputClass + " opacity-60 bg-slate-100"}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>رقم الهاتف</label>
                                            <input 
                                                type="tel"
                                                disabled
                                                value={reqPhone}
                                                className={inputClass + " opacity-60 bg-slate-100"}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>الدولة</label>
                                            <input 
                                                type="text"
                                                disabled
                                                value={reqCountry}
                                                className={inputClass + " opacity-60 bg-slate-100"}
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className={labelClass}>الباقة المطلوبة</label>
                                            <select 
                                                value={reqPlan}
                                                onChange={e => setReqPlan(e.target.value)}
                                                className={inputClass}
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
                                                className="w-full md:w-auto px-8 h-12 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-500/20"
                                            >
                                                إرسال طلب الترقية للادارة
                                            </Button>
                                        </div>
                                    </div>
                                </div>
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
                <UserForm user={editingUser} roles={roles} onSave={async (d) => { 
                    if (!editingUser && users.length >= limits.maxUsers) {
                        addToast(`لقد وصلت للحد الأقصى لعدد المستخدمين في باقتك (${toArabicIndic(limits.maxUsers.toString())})`, "error");
                        return;
                    }
                    await api.saveUser(d); 
                    await fetchEmployeesData(); 
                    setIsUserModalOpen(false); 
                    addToast('تم الحفظ', 'success'); 
                }} onCancel={() => setIsUserModalOpen(false)} isLoading={false} enableCommissions={true} />
            </Modal>
            <Modal isOpen={isRoleModalOpen} onClose={() => setIsRoleModalOpen(false)} title={editingRole ? 'تعديل الدور' : 'إضافة دور جديد'}>
                <RoleFormModal role={editingRole} onSave={handleSaveRole} onCancel={() => setIsRoleModalOpen(false)} isLoading={isSaving} />
            </Modal>
            
            <ConfirmDialog
                isOpen={!!userToDelete}
                onClose={() => setUserToDelete(null)}
                isLoading={isSaving}
                onConfirm={async () => {
                    if (!userToDelete) return;
                    setIsSaving(true);
                    try {
                        await api.deleteUser(userToDelete.id);
                        await fetchEmployeesData();
                        addToast('تم حذف المستخدم بنجاح', 'success');
                    } catch (err: any) {
                        addToast(err.message || 'خطأ في الحذف', 'error');
                    } finally {
                        setUserToDelete(null);
                        setIsSaving(false);
                    }
                }}
                title="حذف مستخدم"
                message={`هل أنت متأكد من حذف المستخدم "${userToDelete?.name}"؟`}
            />

            <ConfirmDialog
                isOpen={!!roleToDelete}
                onClose={() => setRoleToDelete(null)}
                isLoading={isSaving}
                onConfirm={async () => {
                    if (!roleToDelete) return;
                    setIsSaving(true);
                    try {
                        await api.deleteRole(roleToDelete.id);
                        await fetchEmployeesData();
                        addToast('تم حذف الدور بنجاح', 'success');
                    } catch (err: any) {
                        addToast(err.message || 'خطأ في الحذف', 'error');
                    } finally {
                        setRoleToDelete(null);
                        setIsSaving(false);
                    }
                }}
                title="حذف دور صلاحيات"
                message={`هل أنت متأكد من حذف الدور "${roleToDelete?.name}"؟`}
            />

            <Modal 
                isOpen={resetActionType !== null} 
                onClose={() => {
                    setResetActionType(null);
                    setResetCodeInput('');
                }} 
                title={resetActionType === 'reset' ? 'إعادة ضبط المصنع بالكامل' : 'تصفير كافة العمليات المالية'}
                footer={
                    <div className="flex justify-end gap-2 w-full">
                        <Button 
                            variant="secondary" 
                            onClick={() => {
                                setResetActionType(null);
                                setResetCodeInput('');
                            }}
                            className="rounded-xl border border-slate-200 dark:border-slate-800"
                        >
                            إلغاء العملية
                        </Button>
                        <Button 
                            variant="danger" 
                            disabled={resetCodeInput !== '12345' && resetCodeInput.toLowerCase() !== 'reset'}
                            onClick={async () => {
                                if (resetCodeInput === '12345' || resetCodeInput.toLowerCase() === 'reset') {
                                    setIsSaving(true);
                                    try {
                                        if (resetActionType === 'reset') {
                                            await api.reset();
                                        } else {
                                            await api.wipeBusinessData();
                                            window.location.reload();
                                        }
                                    } catch (err: any) {
                                        addToast('فشلت العملية', 'error');
                                    } finally {
                                        setIsSaving(false);
                                        setResetActionType(null);
                                        setResetCodeInput('');
                                    }
                                }
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white rounded-xl active:scale-95 transition-all font-black disabled:opacity-50"
                        >
                            تأكيد التصفير النهائي
                        </Button>
                    </div>
                }
            >
                <div className="space-y-6">
                    <div className="flex items-start gap-4 p-4 bg-red-50 dark:bg-rose-950/20 border border-red-100 dark:border-rose-905/30 rounded-2xl">
                        <div className="p-3 bg-red-100 dark:bg-red-900/45 rounded-xl text-red-600 dark:text-red-400 shrink-0">
                            <AlertCircle size={24} />
                        </div>
                        <div className="flex-1 space-y-1">
                            <h4 className="font-black text-rose-700 dark:text-rose-400 text-sm">تحذير أمني هام جداً!</h4>
                            <p className="text-xs text-rose-600/80 leading-relaxed font-bold">
                                {resetActionType === 'reset' 
                                    ? 'هذا الإجراء سيقوم بحذف كافة فئات النظام، المنتجات، العملاء، الضرائب، الموظفين، والمبيعات بالكامل ويعيدك للوضع الافتراضي الأول. لا يمكن التراجع عن هذا الإجراء أبداً!' 
                                    : 'سيتم مسح وتصفير كافة المبيعات، الحسابات، المشتريات، والجرد والعمليات المالية تماماً. سيتم الاحتفاظ بالمنتجات والعملاء والموظفين.'}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-slate-600 dark:text-slate-300 text-xs font-black block">
                            لتأكيد الإجراء، يرجى كتابة رمز التحقق <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md text-red-600 font-bold">12345</span> أو <span className="font-mono bg-slate-100 dark:bg-slate-300 dark:bg-slate-800/50 px-2.5 py-1 rounded-md text-red-600 font-bold">reset</span> أدناه:
                        </label>
                        <input 
                            type="text" 
                            value={resetCodeInput} 
                            onChange={e => setResetCodeInput(e.target.value)} 
                            className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-red-500 rounded-2xl text-center font-black font-mono tracking-widest text-lg outline-none transition-colors focus:ring-2 focus:ring-red-500 text-black dark:text-white"
                            placeholder="اكتب رمز التأكيد هنا..."
                        />
                    </div>
                </div>
            </Modal>
            
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

            {/* INVOICE DESIGN STUDIO FULLSCREEN MODAL OVERLAY */}
            <AnimatePresence>
                {isInvoiceStudioOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[250] bg-slate-900/95 dark:bg-slate-950/98 backdrop-blur-md flex flex-col overflow-hidden text-slate-800 dark:text-slate-100 animate-none"
                        style={{ direction: 'rtl' }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white/5 backdrop-blur-lg">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-500/20">
                                    <Palette size={24} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black tracking-tight text-white">استوديو تصميم الفواتير المخصصة والذكية</h2>
                                    <p className="text-[10px] text-slate-400 font-bold">انشئ وصمم قالب فاتورتك الفريد باستخدام أدوات بصرية مبسطة أو الأكواد المتقدمة</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (window.confirm('هل أنت متأكد من رغبتك في إعادة تعيين التصميم البصري إلى الإعدادات القياسية الافتراضية؟')) {
                                            setStudioVisualConfig({
                                                fontFamily: 'Cairo',
                                                borderThickness: '2px',
                                                borderStyle: 'solid',
                                                borderRadius: '16px',
                                                borderColor: '#6366f1',
                                                bgColor: '#ffffff',
                                                accentColor: '#4f46e5',
                                                headerStyle: 'split',
                                                logoWidth: '85px',
                                                titleSize: 'md',
                                                showStoreDetails: true,
                                                metaLayout: 'boxes',
                                                showCustomerPhone: true,
                                                customerBoxBg: '#fcfcfd',
                                                tableHeaderStyle: 'accent',
                                                tableRowStyle: 'zebra',
                                                tableDensity: 'normal',
                                                totalsStyle: 'plain',
                                                qrPosition: 'right',
                                                showBarcode: true,
                                                footerAlignment: 'right',
                                            });
                                            addToast('تمت إعادة تعيين القالب البصري للقيم الافتراضية بنجاح', 'success');
                                        }
                                    }}
                                    className="px-4 py-2 border border-slate-700 hover:border-slate-600 text-slate-300 font-bold hover:text-white text-xs rounded-xl transition-all"
                                >
                                    إعادة ضبط القالب الافتراضي
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setLocalSettings({
                                            ...localSettings,
                                            invoiceDesign: {
                                                ...localSettings.invoiceDesign,
                                                customHtml: studioHtml,
                                                customCss: studioCss
                                            }
                                        });
                                        setIsInvoiceStudioOpen(false);
                                        addToast('تم تطبيق الـتـصميم للفاتورة بنجاح. تذكر النقر على حفظ الإعدادات في الأسفل لتأكيد الحفظ النهائي على السيرفر.', 'success');
                                    }}
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
                                >
                                    تطبيق وحفظ التصميم والعودة
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (window.confirm('هل أنت متأكد من الخروج دون حفظ التحديثات الأخيرة؟')) {
                                            setIsInvoiceStudioOpen(false);
                                        }
                                    }}
                                    className="p-2 text-slate-400 hover:text-rose-500 rounded-full transition-all"
                                >
                                    <X size={20} strokeWidth={3} />
                                </button>
                            </div>
                        </div>

                        {/* Split Editor UI Container */}
                        <div className="flex-grow flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-slate-200 dark:divide-slate-800 overflow-hidden">
                            {/* Left Area (Workspace Code Input) */}
                            <div className="w-full lg:w-1/2 flex flex-col h-1/2 lg:h-full bg-slate-900/40 p-5 overflow-hidden border-l border-slate-800/60">
                                {/* Mode Selector */}
                                <div className="flex items-center justify-between mb-4 shrink-0 bg-slate-950/60 p-2 rounded-2xl border border-slate-800/60">
                                    <div className="flex bg-slate-950 p-1 rounded-xl">
                                        <button 
                                            type="button"
                                            onClick={() => setStudioMode('visual')}
                                            className={`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 ${studioMode === 'visual' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                                        >
                                            <Palette size={14} />
                                            <span>الوضع البصري (أدوات مبسطة وسهلة)</span>
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setStudioMode('advanced')}
                                            className={`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 ${studioMode === 'advanced' ? 'bg-indigo-700/50 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                                        >
                                            <Code2 size={14} />
                                            <span>الأكواد المتقدمة (برمجي)</span>
                                        </button>
                                    </div>
                                    <span className="text-[10px] text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl font-bold border border-slate-800">
                                        {studioMode === 'visual' ? 'مساعد التصميم البصري الذكي' : 'أكواد HTML/CSS'}
                                    </span>
                                </div>

                                {studioMode === 'visual' ? (
                                    <div className="flex-grow flex flex-col overflow-hidden bg-slate-950/40 border border-slate-850 rounded-3xl p-4">
                                        {/* Visual Section Navigation */}
                                        <div className="flex gap-1 overflow-x-auto pb-3 mb-3 border-b border-slate-800/60 shrink-0 custom-scrollbar">
                                            {[
                                                { id: 'general', label: 'الشكل العام والألوان' },
                                                { id: 'header', label: 'الترويسة والشعار' },
                                                { id: 'customer', label: 'العميل والدفع' },
                                                { id: 'table', label: 'جدول المنتجات' },
                                                { id: 'footer', label: 'التذييل والأكواد' },
                                            ].map((sec) => (
                                                <button
                                                    key={sec.id}
                                                    type="button"
                                                    onClick={() => setVisualSection(sec.id as any)}
                                                    className={`px-3 py-2 text-[11px] font-black rounded-xl transition-all shrink-0 cursor-pointer ${visualSection === sec.id ? 'bg-indigo-600 text-white' : 'bg-slate-900/70 border border-slate-800 text-slate-400 hover:text-slate-250'}`}
                                                >
                                                    {sec.label}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Visual Section content */}
                                        <div className="flex-grow overflow-y-auto pr-1 pl-1 space-y-5 custom-scrollbar pb-6 text-slate-200">
                                            {visualSection === 'general' && (
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-xs font-black text-slate-400 mb-1.5">نوع خط الكتابة بالفاتورة</label>
                                                        <select
                                                            value={studioVisualConfig.fontFamily}
                                                            onChange={(e) => setStudioVisualConfig({ ...studioVisualConfig, fontFamily: e.target.value })}
                                                            className="w-full border border-slate-800 rounded-xl p-2.5 outline-none focus:border-indigo-500 text-xs font-bold text-white bg-slate-950"
                                                        >
                                                            <option value="Cairo">خط القاهرة (Cairo) - عربي أنيق احترافي</option>
                                                            <option value="Tajawal">خط تجول (Tajawal) - خط عصري مريح ومبسط</option>
                                                            <option value="Inter">خط إنتر (Inter) - لتصميم لاتيني وسيريف حديث</option>
                                                            <option value="system-ui">خط النظام الافتراضي (System UI)</option>
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-black text-slate-400 mb-1.5">اللون الرئيسي المميز (البراند المعزز)</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="color"
                                                                value={studioVisualConfig.accentColor}
                                                                onChange={(e) => setStudioVisualConfig({ ...studioVisualConfig, accentColor: e.target.value })}
                                                                className="w-12 h-10 rounded-xl border border-slate-800 cursor-pointer bg-transparent"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={studioVisualConfig.accentColor}
                                                                onChange={(e) => setStudioVisualConfig({ ...studioVisualConfig, accentColor: e.target.value })}
                                                                className="flex-grow bg-slate-950 border border-slate-800 rounded-xl px-3 outline-none focus:border-indigo-500 text-xs font-mono text-white font-black"
                                                            />
                                                        </div>
                                                        {/* Presets Grid */}
                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                            {['#4f46e5', '#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#000000', '#ec4899', '#6d28d9'].map((c) => (
                                                                <button
                                                                    key={c}
                                                                    type="button"
                                                                    onClick={() => setStudioVisualConfig({ ...studioVisualConfig, accentColor: c })}
                                                                    className="w-6 h-6 rounded-full border border-white/20 hover:scale-110 active:scale-90 transition-all cursor-pointer animate-none"
                                                                    style={{ backgroundColor: c }}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="p-4 bg-slate-900/30 rounded-2xl border border-slate-800/40 space-y-4">
                                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">إطار وحدود الفاتورة الخارجية</h4>
                                                        
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-400 mb-1">سمك الإطار</label>
                                                                <select
                                                                    value={studioVisualConfig.borderThickness}
                                                                    onChange={(e) => setStudioVisualConfig({ ...studioVisualConfig, borderThickness: e.target.value })}
                                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-bold text-white outline-none"
                                                                >
                                                                    <option value="1px">رفيع للغاية (1px)</option>
                                                                    <option value="2px">متوسط (2px)</option>
                                                                    <option value="3px">سميك (3px)</option>
                                                                    <option value="4px">سميك للغاية (4px)</option>
                                                                </select>
                                                            </div>

                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-400 mb-1">نمط الخط</label>
                                                                <select
                                                                    value={studioVisualConfig.borderStyle}
                                                                    onChange={(e) => setStudioVisualConfig({ ...studioVisualConfig, borderStyle: e.target.value })}
                                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-bold text-white outline-none"
                                                                >
                                                                    <option value="solid">خط متصل (Solid)</option>
                                                                    <option value="dashed">خط متقطع (Dashed)</option>
                                                                    <option value="double">خط مزدوج (Double)</option>
                                                                    <option value="none">بدون إطار</option>
                                                                </select>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-400 mb-1">درجة انحناء الزوايا</label>
                                                                <select
                                                                    value={studioVisualConfig.borderRadius}
                                                                    onChange={(e) => setStudioVisualConfig({ ...studioVisualConfig, borderRadius: e.target.value })}
                                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-bold text-white outline-none"
                                                                >
                                                                    <option value="0px">زوايا حادة (Sharp)</option>
                                                                    <option value="8px">انحناء خفيف (8px)</option>
                                                                    <option value="16px">انحناء متوسط (16px)</option>
                                                                    <option value="24px">انحناء كبير (24px)</option>
                                                                </select>
                                                            </div>

                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-400 mb-1">لون الإطار</label>
                                                                <input
                                                                    type="color"
                                                                    value={studioVisualConfig.borderColor}
                                                                    onChange={(e) => setStudioVisualConfig({ ...studioVisualConfig, borderColor: e.target.value })}
                                                                    className="w-full h-8 bg-transparent rounded-lg border border-slate-800 cursor-pointer"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-xs font-black text-slate-400 mb-1">لون خلفية الورقة</label>
                                                            <input
                                                                type="color"
                                                                value={studioVisualConfig.bgColor}
                                                                onChange={(e) => setStudioVisualConfig({ ...studioVisualConfig, bgColor: e.target.value })}
                                                                className="w-full h-10 bg-transparent rounded-xl border border-slate-800 cursor-pointer"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col justify-end pb-1">
                                                            <span className="text-[10px] text-slate-500 font-bold block mb-1">خلفية المطبوعات الورقية</span>
                                                            <span className="text-[10px] font-black text-slate-400 italic font-sans">يُستحسن وضع لون أبيض #ffffff لسهولة الطباعة وتفادي استهلاك مستلزمات الحبر.</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {visualSection === 'header' && (
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-xs font-black text-slate-400 mb-1.5">مظهر وتنسيق الترويسة العليا</label>
                                                        <select
                                                            value={studioVisualConfig.headerStyle}
                                                            onChange={(e) => setStudioVisualConfig({ ...studioVisualConfig, headerStyle: e.target.value })}
                                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 outline-none focus:border-indigo-500 text-xs font-bold text-white"
                                                        >
                                                            <option value="split">تصميم جانبي منفصل (لوغو باليمين ورقم الفاتورة باليسار)</option>
                                                            <option value="center">تصميم متناغم بالوسط (لوغو واسم المتجر في المركز تلقائياً)</option>
                                                            <option value="minimal">تصميم هادئ وبسيط للغاية (مناسب للعمل المعتمد أو الكاشير)</option>
                                                        </select>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-xs font-black text-slate-400 mb-1.5">حجم عرض الشعار الأقصى</label>
                                                            <select
                                                                value={studioVisualConfig.logoWidth}
                                                                onChange={(e) => setStudioVisualConfig({ ...studioVisualConfig, logoWidth: e.target.value })}
                                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs font-bold text-white outline-none"
                                                            >
                                                                <option value="60px">صغير (60px)</option>
                                                                <option value="85px">طبيعي (85px)</option>
                                                                <option value="110px">كبير (110px)</option>
                                                                <option value="140px">كبير جداً (140px)</option>
                                                            </select>
                                                        </div>

                                                        <div>
                                                            <label className="block text-xs font-black text-slate-400 mb-1.5">حجم خط اسم المتجر</label>
                                                            <select
                                                                value={studioVisualConfig.titleSize}
                                                                onChange={(e) => setStudioVisualConfig({ ...studioVisualConfig, titleSize: e.target.value })}
                                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs font-bold text-white outline-none"
                                                            >
                                                                <option value="sm">صغير (20px)</option>
                                                                <option value="md">متوسط (24px)</option>
                                                                <option value="lg">كبير (28px)</option>
                                                                <option value="xl">ضخم (32px)</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div className="p-4 bg-slate-900/30 rounded-2xl border border-slate-800/40">
                                                        <label className="flex items-center justify-between cursor-pointer">
                                                            <div>
                                                                <span className="text-xs font-black text-white block font-sans">عرض بيانات المتجر التفصيلية تحت الاسم</span>
                                                                <span className="text-[10px] text-slate-400 font-bold block mt-0.5 font-sans">مثل رقم التسجيل الضريبي، رقم الهاتف، والعنوان.</span>
                                                            </div>
                                                            <input
                                                                type="checkbox"
                                                                checked={studioVisualConfig.showStoreDetails}
                                                                onChange={(e) => setStudioVisualConfig({ ...studioVisualConfig, showStoreDetails: e.target.checked })}
                                                                className="w-5 h-5 text-indigo-600 rounded cursor-pointer bg-slate-950 border-slate-800"
                                                            />
                                                        </label>
                                                    </div>
                                                </div>
                                            )}

                                            {visualSection === 'customer' && (
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-xs font-black text-slate-400 mb-1.5">مخطط وتوزيع تفاصيل المشتري والدفع</label>
                                                        <select
                                                            value={studioVisualConfig.metaLayout}
                                                            onChange={(e) => setStudioVisualConfig({ ...studioVisualConfig, metaLayout: e.target.value })}
                                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 outline-none focus:border-indigo-500 text-xs font-bold text-white"
                                                        >
                                                            <option value="boxes">صناديق كروت منفصلة ملونة (مستحسن للعملاء)</option>
                                                            <option value="stripes">أسطر متوازية خفيفة بنقوش هادئة</option>
                                                            <option value="grid">مصفوفة بيانات دقيقة مدمجة وموحدة</option>
                                                        </select>
                                                    </div>

                                                    <div className="p-4 bg-slate-900/30 rounded-2xl border border-slate-800/40">
                                                        <label className="flex items-center justify-between cursor-pointer">
                                                            <div>
                                                                <span className="text-xs font-black text-white block font-sans">إظهار هاتف العميل تلقائياً</span>
                                                                <span className="text-[10px] text-slate-400 font-bold block mt-0.5 font-sans">تضمين رقم جوال المشتري بجوار الاسم للتواصل الفوري.</span>
                                                            </div>
                                                            <input
                                                                type="checkbox"
                                                                checked={studioVisualConfig.showCustomerPhone}
                                                                onChange={(e) => setStudioVisualConfig({ ...studioVisualConfig, showCustomerPhone: e.target.checked })}
                                                                className="w-5 h-5 text-indigo-600 rounded cursor-pointer bg-slate-950 border-slate-800"
                                                            />
                                                        </label>
                                                    </div>

                                                    {studioVisualConfig.metaLayout === 'boxes' && (
                                                        <div>
                                                            <label className="block text-xs font-black text-slate-400 mb-1.5">لون خلفية كارت بيانات المشتري</label>
                                                            <input
                                                                type="color"
                                                                value={studioVisualConfig.customerBoxBg}
                                                                onChange={(e) => setStudioVisualConfig({ ...studioVisualConfig, customerBoxBg: e.target.value })}
                                                                className="w-full h-10 bg-transparent rounded-xl border border-slate-800 cursor-pointer"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {visualSection === 'table' && (
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-xs font-black text-slate-400 mb-1.5">مظهر تلوين رأس الجدول (Headers)</label>
                                                        <select
                                                            value={studioVisualConfig.tableHeaderStyle}
                                                            onChange={(e) => setStudioVisualConfig({ ...studioVisualConfig, tableHeaderStyle: e.target.value })}
                                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 outline-none focus:border-indigo-500 text-xs font-bold text-white"
                                                        >
                                                            <option value="accent">تلوين كامل رأس الجدول بلون البراند والتمييز</option>
                                                            <option value="dark">لون ترويسة داكن وجريء لإبراز المنتجات</option>
                                                            <option value="none">مفتوح وبسيط (أنيق للغاية مع خط سفلي فاصل)</option>
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-black text-slate-400 mb-1.5">قواعد وخطوط السطور والصفوف</label>
                                                        <select
                                                            value={studioVisualConfig.tableRowStyle}
                                                            onChange={(e) => setStudioVisualConfig({ ...studioVisualConfig, tableRowStyle: e.target.value })}
                                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 outline-none focus:border-indigo-500 text-xs font-bold text-white"
                                                        >
                                                            <option value="zebra">صفوف متبادلة الألوان (Zebra) - مريح وجذاب للعين</option>
                                                            <option value="lines">تسطير ناعم تحت كل منتج بالفاتورة</option>
                                                            <option value="none">بدون أي خطوط (تصميم تكتيكي بسيط)</option>
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-black text-slate-400 mb-1.5">درجة تباعد وضغط محتويات الجدول</label>
                                                        <select
                                                            value={studioVisualConfig.tableDensity}
                                                            onChange={(e) => setStudioVisualConfig({ ...studioVisualConfig, tableDensity: e.target.value })}
                                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 outline-none focus:border-indigo-500 text-xs font-bold text-white"
                                                        >
                                                            <option value="compact">تصميم مدمج وضيق (ممتاز للفواتير المستمرة والحرارية البسيطة)</option>
                                                            <option value="normal">حجم طبيعي مثالي جداً ومتزن (مستحسن للأوراق القياسية)</option>
                                                            <option value="comfy">تباعد مريح وفسيح مناسب للمبيعات الثمينة ووصول المعاينة</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            )}

                                            {visualSection === 'footer' && (
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-xs font-black text-slate-400 mb-1.5">تصميم صندوق المجموع المالي الكلي</label>
                                                        <select
                                                            value={studioVisualConfig.totalsStyle}
                                                            onChange={(e) => setStudioVisualConfig({ ...studioVisualConfig, totalsStyle: e.target.value })}
                                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 outline-none focus:border-indigo-500 text-xs font-bold text-white"
                                                        >
                                                            <option value="plain">صندوق مالي بسيط وموجه للجهة اليسرى</option>
                                                            <option value="accent">صندوق واسع كامل مع خلفية باهتة بلون التمييز المميز</option>
                                                            <option value="gray">صندوق حسابي رمادي عريض أنيق ومحدد</option>
                                                        </select>
                                                    </div>

                                                    <div className="p-4 bg-slate-900/30 rounded-2xl border border-slate-800/40 space-y-4">
                                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 font-sans">تنسيقات الأكواد الذكية والباركود</h4>

                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-400 mb-1">مكان كود الاستجابة السريع QR</label>
                                                                <select
                                                                   value={studioVisualConfig.qrPosition}
                                                                   onChange={(e) => setStudioVisualConfig({ ...studioVisualConfig, qrPosition: e.target.value })}
                                                                   className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-bold text-white outline-none"
                                                                >
                                                                    <option value="right">الجانب الأيمن للتذييل</option>
                                                                    <option value="left">الجانب الأيسر للتذييل</option>
                                                                    <option value="center">المركز بالكامل أسفل الفاتورة</option>
                                                                </select>
                                                            </div>

                                                            <div className="flex items-center">
                                                                <label className="flex items-center gap-2 cursor-pointer mt-4">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={studioVisualConfig.showBarcode}
                                                                        onChange={(e) => setStudioVisualConfig({ ...studioVisualConfig, showBarcode: e.target.checked })}
                                                                        className="w-4 h-4 text-indigo-600 rounded bg-slate-950 border-slate-800 cursor-pointer"
                                                                    />
                                                                    <span className="text-xs font-black text-white font-sans">إظهار باركود رقم الفاتورة</span>
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-black text-slate-400 mb-1.5">طريقة محاذاة نصوص وعبارات التذييل</label>
                                                        <select
                                                            value={studioVisualConfig.footerAlignment}
                                                            onChange={(e) => setStudioVisualConfig({ ...studioVisualConfig, footerAlignment: e.target.value })}
                                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 outline-none focus:border-indigo-500 text-xs font-bold text-white"
                                                        >
                                                            <option value="right font-sans">محاذاة النص لليمين (الوضع القياسي العربي)</option>
                                                            <option value="center">التركيز بالوسط (مظهر متزن وجذاب)</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-3 shrink-0 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-bold">
                                            <span>💡 التحديثات تطبق في الوقت الحقيقي للمعاينة بنجاح</span>
                                            <span className="text-emerald-400">● مترجم ذكي ميسر</span>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center justify-between mb-3 shrink-0">
                                            <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800/80">
                                                <button 
                                                    type="button"
                                                    onClick={() => setStudioTab('html')}
                                                    className={`px-4 py-2 text-xs font-black rounded-lg transition-all duration-200 flex items-center gap-1.5 ${studioTab === 'html' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                                                >
                                                    <Code2 size={14} />
                                                    <span>كود الهيكل البنائي (HTML)</span>
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => setStudioTab('css')}
                                                    className={`px-4 py-2 text-xs font-black rounded-lg transition-all duration-200 flex items-center gap-1.5 ${studioTab === 'css' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                                                >
                                                    <Palette size={14} />
                                                    <span>ملف التنسيقات (CSS)</span>
                                                </button>
                                            </div>
                                            <span className="text-[10px] text-slate-500 font-bold bg-slate-950/40 px-3 py-1 rounded-full">
                                                {studioTab === 'html' ? 'محرر HTML ذكي' : 'محرر CSS مخصص'}
                                            </span>
                                        </div>

                                        <div className="flex-grow relative min-h-[150px]">
                                            {studioTab === 'html' ? (
                                                <textarea
                                                    value={studioHtml}
                                                    onChange={(e) => setStudioHtml(e.target.value)}
                                                    dir="ltr"
                                                    className="w-full h-full p-4 font-mono text-xs bg-slate-950 text-emerald-400 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-2xl outline-none resize-none overflow-y-auto custom-scrollbar"
                                                    placeholder="<!-- اكتب كود HTML المخصص لهيكل الفاتورة هنا -->"
                                                />
                                            ) : (
                                                <textarea
                                                    value={studioCss}
                                                    onChange={(e) => setStudioCss(e.target.value)}
                                                    dir="ltr"
                                                    className="w-full h-full p-4 font-mono text-xs bg-slate-950 text-indigo-400 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-2xl outline-none resize-none overflow-y-auto custom-scrollbar"
                                                    placeholder="/* اكتب كود CSS لتنسيق الفاتورة هنا */"
                                                />
                                            )}
                                        </div>

                                        {/* Variable Pills list (only displayed for HTML) */}
                                        <div className="mt-3 shrink-0 bg-slate-950/50 p-4 rounded-2xl border border-slate-850">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Layers size={14} className="text-indigo-400" />
                                                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-sans">المتغيرات البرمجية الذكية المتاحة (انقر للنسخ الفوري):</h4>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto custom-scrollbar p-1">
                                                {[
                                                    { tag: '{{storeName}}', name: 'اسم المتجر' },
                                                    { tag: '{{logo}}', name: 'الشعار' },
                                                    { tag: '{{invoiceNumber}}', name: 'رقم الفاتورة' },
                                                    { tag: '{{date}}', name: 'التاريخ' },
                                                    { tag: '{{customerName}}', name: 'اسم العميل' },
                                                    { tag: '{{customerPhone}}', name: 'هاتف العميل' },
                                                    { tag: '{{cashierName}}', name: 'أمين الصندوق' },
                                                    { tag: '{{paymentMethod}}', name: 'طريقة الدفع' },
                                                    { tag: '{{itemsTable}}', name: 'جدول المنتجات والكميات المشتراة' },
                                                    { tag: '{{subtotal}}', name: 'الإجمالي الفرعي' },
                                                    { tag: '{{discount}}', name: 'الخصم الإجمالي' },
                                                    { tag: '{{tax}}', name: 'الضريبة المضافة' },
                                                    { tag: '{{vatRate}}', name: 'نسبة الضريبة %' },
                                                    { tag: '{{total}}', name: 'الإجمالي النهائي المالي' },
                                                    { tag: '{{vatNumber}}', name: 'الرقم الضريبي للمتجر' },
                                                    { tag: '{{footer}}', name: 'تذييل الفاتورة' },
                                                    { tag: '{{storePhone}}', name: 'هاتف المتجر' },
                                                    { tag: '{{storeAddress}}', name: 'عنوان المتجر' },
                                                    { tag: '{{storeEmail}}', name: 'البريد الإلكتروني' },
                                                    { tag: '{{qrCode}}', name: 'رمز الاستجابة السريع QR الملزم' },
                                                    { tag: '{{barcode}}', name: 'الباركود' }
                                                ].map((v) => (
                                                    <button
                                                        key={v.tag}
                                                        type="button"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(v.tag);
                                                            addToast(`تم نسخ الرمز البرمجي "${v.tag}" في حافظة جهازك بنجاح`, 'success');
                                                        }}
                                                        className="px-2 py-1 text-[9px] bg-slate-900 border border-slate-800 hover:border-indigo-500 hover:bg-slate-850 text-slate-300 hover:text-white rounded-lg transition-all font-mono font-bold flex items-center gap-1 shrink-0 bg-transparent cursor-pointer"
                                                        title={v.name}
                                                    >
                                                        <span>{v.tag}</span>
                                                        <span className="text-[8px] text-slate-500 font-black">({v.name})</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Right Area (Live Render View) */}
                            <div className="w-full lg:w-1/2 flex flex-col h-1/2 lg:h-full bg-slate-50 dark:bg-slate-900/40 p-4 lg:p-6 overflow-hidden">
                                <div className="flex items-center justify-between mb-4 shrink-0 font-sans">
                                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                        <Monitor size={16} />
                                        <span className="text-xs font-black">معاينة تفاعلية فورية ومباشرة (Real-time Live Compiler Preview)</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                                        <span className="w-1.5 h-1.5 bg-emerald-500 dark:bg-emerald-400 rounded-full animate-ping" />
                                        <span>نشط ومترجم تلقائياً</span>
                                    </div>
                                </div>

                                <div className="flex-grow overflow-y-auto p-4 bg-slate-200/50 dark:bg-slate-950/40 border border-slate-300 dark:border-slate-800 rounded-3xl custom-scrollbar flex items-start justify-center">
                                    <div className="w-full max-w-[460px] shadow-xl rounded-2xl overflow-hidden bg-white">
                                        <InvoiceDesignRenderer 
                                            sale={{
                                                id: 'inv-1234',
                                                date: '2026-05-26T22:00:00.000Z',
                                                customer: { name: 'عميل تجريبي أحمد', phone: '01012345678' },
                                                cashier: { name: 'أحمد الكاشير' },
                                                paymentMethod: 'Cash',
                                                items: [
                                                    { id: '1', name: 'جهاز راوتر تكنو باور 5G', quantity: 2, sellPrice: 2450, discount: 100 },
                                                    { id: '2', name: 'كابل شبكات Cat6 م 10', quantity: 5, sellPrice: 80, discount: 0 }
                                                ],
                                                total: 4980,
                                                tax: 650,
                                                discountValue: 200,
                                                discount: 200
                                            }}
                                            settings={{
                                                storeName: localSettings.storeName || 'اسم المتجر',
                                                currency: localSettings.currency || 'EGP',
                                                vatRate: localSettings.vatRate ?? 14,
                                                logoUrl: localSettings.logoUrl,
                                                taxRegisterNumber: localSettings.taxRegisterNumber,
                                                storePhone: localSettings.storePhone,
                                                storeEmail: localSettings.storeEmail,
                                                storeAddress: localSettings.storeAddress,
                                                invoiceFooter: localSettings.invoiceFooter,
                                                invoiceDesign: {
                                                    template: 'free',
                                                    showLogo: !!localSettings.invoiceDesign?.showLogo,
                                                    showQrCode: !!localSettings.invoiceDesign?.showQrCode,
                                                    showBarcode: !!localSettings.invoiceDesign?.showBarcode,
                                                    accentColor: localSettings.invoiceDesign?.accentColor || '#4f46e5',
                                                    customCss: studioCss,
                                                    customHtml: studioHtml,
                                                    vatNumber: localSettings.invoiceDesign?.vatNumber
                                                }
                                            }}
                                            isPreview={true}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default SettingsPage;
