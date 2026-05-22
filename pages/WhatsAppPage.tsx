import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { MessageCircle, Settings, FileText, Activity, AlertTriangle, Plus, Edit2, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '../services/mockApi';
import { whatsappService } from '../services/whatsappService';
import { useSettings } from '../hooks/useSettings';
import { useToasts } from '../hooks/useToasts';
import { WhatsAppTemplate, WhatsAppLog } from '../types';

export const WhatsAppPage: React.FC = () => {
    const { settings, updateSettings } = useSettings();
    const { addToast } = useToasts();
    
    const [activeTab, setActiveTab] = useState<'settings' | 'templates' | 'broadcast' | 'logs'>('settings');
    const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
    const [logs, setLogs] = useState<WhatsAppLog[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    
    // Broadcast state
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    
    // Setting state
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [waSettings, setWaSettings] = useState({
        mode: settings?.whatsappMode || 'wa.me',
        apiUrl: settings?.whatsappApiUrl || '',
        token: settings?.whatsappToken || '',
        phoneId: settings?.whatsappPhoneId || '',
        autoSendOnInvoice: settings?.whatsappAutoSendOnInvoice || false,
        autoSendOnDebt: settings?.whatsappAutoSendOnDebt || false,
    });

    // Template Modal state
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
    const [templateForm, setTemplateForm] = useState<Partial<WhatsAppTemplate>>({
        name: '',
        type: 'invoice',
        body: '',
    });

    useEffect(() => {
        if (settings) {
            setWaSettings({
                mode: settings.whatsappMode || 'wa.me',
                apiUrl: settings.whatsappApiUrl || '',
                token: settings.whatsappToken || '',
                phoneId: settings.whatsappPhoneId || '',
                autoSendOnInvoice: settings.whatsappAutoSendOnInvoice || false,
                autoSendOnDebt: settings.whatsappAutoSendOnDebt || false,
            });
        }
    }, [settings]);

    useEffect(() => {
        if (activeTab === 'templates') loadTemplates();
        if (activeTab === 'logs') loadLogs();
        if (activeTab === 'broadcast') {
            loadTemplates();
            loadCustomers();
        }
    }, [activeTab]);

    const loadTemplates = async () => {
        setTemplates(await api.getWhatsAppTemplates());
    };

    const loadLogs = async () => {
        setLogs(await api.getWhatsAppLogs());
    };

    const loadCustomers = async () => {
        setCustomers(await api.getCustomers());
    };

    const handleSaveSettings = async () => {
        setIsSavingSettings(true);
        try {
            await updateSettings({
                ...settings,
                whatsappMode: waSettings.mode as any,
                whatsappApiUrl: waSettings.apiUrl,
                whatsappToken: waSettings.token,
                whatsappPhoneId: waSettings.phoneId,
                whatsappAutoSendOnInvoice: waSettings.autoSendOnInvoice,
                whatsappAutoSendOnDebt: waSettings.autoSendOnDebt,
            } as any);
            addToast('تم حفظ إعدادات واتساب بنجاح', 'success');
        } catch (error) {
            addToast('حدث خطأ أثناء حفظ الإعدادات', 'error');
        } finally {
            setIsSavingSettings(false);
        }
    };

    const handleSaveTemplate = async () => {
        if (!templateForm.name || !templateForm.body) {
            addToast('الرجاء إدخال اسم القالب والنص', 'warning');
            return;
        }
        await api.saveWhatsAppTemplate({
            ...editingTemplate,
            ...templateForm,
        });
        addToast('تم حفظ القالب بنجاح', 'success');
        setIsTemplateModalOpen(false);
        loadTemplates();
    };

    const handleDeleteTemplate = async (id: string) => {
        if (window.confirm('هل أنت متأكد من حذف هذا القالب؟')) {
            await api.deleteWhatsAppTemplate(id);
            addToast('تم الحذف بنجاح', 'success');
            loadTemplates();
        }
    };

    const openTemplateModal = (template?: WhatsAppTemplate) => {
        if (template) {
            setEditingTemplate(template);
            setTemplateForm({
                name: template.name,
                type: template.type,
                body: template.body,
            });
        } else {
            setEditingTemplate(null);
            setTemplateForm({
                name: '',
                type: 'invoice',
                body: '',
            });
        }
        setIsTemplateModalOpen(true);
    };

    const handleBroadcast = async () => {
        if (!selectedTemplateId) {
            addToast('الرجاء اختيار القالب', 'warning');
            return;
        }
        
        const template = templates.find(t => t.id === selectedTemplateId);
        if (!template) return;

        const custs = Array.isArray(customers) ? customers : [];
        const customersWithPhone = custs.filter(c => c.phone);
        if (customersWithPhone.length === 0) {
            addToast('لا يوجد عملاء لديهم أرقام هواتف', 'warning');
            return;
        }

        if (!window.confirm(`سيتم إرسال الرسالة إلى ${customersWithPhone.length} عميل. هل أنت متأكد؟ (قد يستغرق بعض الوقت)`)) {
            return;
        }

        setIsBroadcasting(true);
        let successCount = 0;
        let failCount = 0;

        for (const customer of customersWithPhone) {
            const messageData = {
                customer_name: customer.name,
                store_name: settings?.storeName || 'المتجر',
            };
            const formattedMessage = whatsappService.formatMessage(template.body, messageData);
            
            // In wa.me mode, bulk broadcast is not possible to run hands-free because it requires user interaction.
            // But we will generate logs anyway. Realistically API mode is required.
            try {
                const result = await whatsappService.sendMessage(
                    customer.phone,
                    formattedMessage,
                    settings as any,
                    template.id,
                    customer.name
                );
                if (result.success) successCount++;
                else failCount++;
            } catch (e) {
                failCount++;
            }
            // slight delay to not overwhelm
            await new Promise(r => setTimeout(r, 500));
        }

        setIsBroadcasting(false);
        addToast(`اكتمل الإرسال. نجاح: ${successCount}، فشل: ${failCount}`, 'info');
    };

    const getVariableHint = (type: string) => {
        if (type === 'invoice') return '{{invoice_number}}, {{customer_name}}, {{amount}}, {{store_name}}, {{date}}';
        if (type === 'debt') return '{{customer_name}}, {{debt_amount}}, {{store_name}}';
        return '{{customer_name}}, {{store_name}}';
    };

    return (
        <div className="p-6 max-w-7xl mx-auto animate-fadeIn">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
                    <MessageCircle size={28} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white">إدارة الواتساب</h1>
                    <p className="text-slate-500 font-bold">ربط النظام برسائل واتساب وتخصيص القوالب</p>
                </div>
            </div>

            <div className="flex gap-2 mb-6 border-b border-slate-200 dark:border-slate-800 pb-2">
                {[
                    { id: 'settings', label: 'الإعدادات والربط', icon: Settings },
                    { id: 'templates', label: 'القوالب', icon: FileText },
                    { id: 'broadcast', label: 'رسائل جماعية', icon: MessageCircle },
                    { id: 'logs', label: 'سجل الرسائل', icon: Activity },
                ].map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-2 font-bold rounded-xl transition-all ${
                                activeTab === tab.id 
                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' 
                                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            <Icon size={18} /> {tab.label}
                        </button>
                    )
                })}
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                {activeTab === 'settings' && (
                    <div className="max-w-2xl space-y-6">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-xl space-y-2 border border-blue-100 dark:border-blue-800">
                            <h4 className="font-black flex items-center gap-2">
                                <AlertTriangle size={18} /> نمط الإرسال
                            </h4>
                            <p className="text-sm font-bold">
                                <strong>wa.me:</strong> سيقوم بفتح واتساب ويب أو التطبيق لإرسال الرسالة يدوياً (مجاني بالكامل). <br/>
                                <strong>API Mode:</strong> سيقوم بإرسال الرسائل تلقائياً في الخلفية. <em>تنبيه: خدمات WhatsApp API قد تكون مدفوعة حسب مزود الخدمة ويجب أن يكون لديك حساب مفعل ومرتبط لدى مزود API للحصول على Token و URL.</em>
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2">طريقة الإرسال (النمط)</label>
                                <select 
                                    value={waSettings.mode} 
                                    onChange={e => setWaSettings({...waSettings, mode: e.target.value as any})}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                                >
                                    <option value="wa.me">مجاني - فتح التطبيق أو الويب (wa.me)</option>
                                    <option value="api">تلقائي - عبر واجهة برمجة التطبيقات (API)</option>
                                </select>
                            </div>

                            {waSettings.mode === 'api' && (
                                <div className="space-y-4 p-5 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                                    <h4 className="font-black text-slate-800 dark:text-white">إعدادات مزود الخدمة (API Credentials)</h4>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">API URL (مثال: منصة Meta أو مبرمجك)</label>
                                        <input 
                                            type="text" 
                                            value={waSettings.apiUrl} 
                                            onChange={e => setWaSettings({...waSettings, apiUrl: e.target.value})}
                                            className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-emerald-500 text-left font-mono"
                                            placeholder="https://graph.facebook.com/v17.0"
                                            dir="ltr"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Access Token</label>
                                        <input 
                                            type="password" 
                                            value={waSettings.token} 
                                            onChange={e => setWaSettings({...waSettings, token: e.target.value})}
                                            className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-emerald-500 text-left font-mono"
                                            placeholder="EAAQA..."
                                            dir="ltr"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Phone Number ID</label>
                                        <input 
                                            type="text" 
                                            value={waSettings.phoneId} 
                                            onChange={e => setWaSettings({...waSettings, phoneId: e.target.value})}
                                            className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-emerald-500 text-left font-mono"
                                            placeholder="1234567890"
                                            dir="ltr"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Automation settings coming soon, just UI for now */}
                            <div className="flex flex-col gap-3 py-4">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={waSettings.autoSendOnInvoice} 
                                        onChange={e => setWaSettings({...waSettings, autoSendOnInvoice: e.target.checked})} 
                                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 dark:border-slate-600 focus:ring-emerald-500 dark:bg-slate-700" 
                                    />
                                    <span className="font-bold text-slate-700 dark:text-slate-300">إرسال الفاتورة تلقائياً عند الحفظ (يتطلب API Mode)</span>
                                </label>
                            </div>

                            <Button onClick={handleSaveSettings} isLoading={isSavingSettings} className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl px-10 h-12">
                                حفظ الإعدادات
                            </Button>
                        </div>
                    </div>
                )}

                {activeTab === 'templates' && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-slate-800 dark:text-white">قوالب الرسائل</h3>
                            <Button onClick={() => openTemplateModal()} className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100" variant="secondary">
                                <Plus size={18} className="me-2" /> قالب جديد
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {templates.map(t => (
                                <div key={t.id} className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex flex-col h-full bg-slate-50 dark:bg-slate-800/50">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-black text-indigo-600 dark:text-indigo-400">{t.name}</h4>
                                        <span className="text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded uppercase">{t.type}</span>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium whitespace-pre-wrap flex-grow mb-4">{t.body}</p>
                                    <div className="flex justify-end gap-2 mt-auto pt-4 border-t border-slate-200 dark:border-slate-700">
                                        <button onClick={() => openTemplateModal(t)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                                        <button onClick={() => handleDeleteTemplate(t.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            ))}
                            {templates.length === 0 && (
                                <div className="col-span-full py-12 text-center text-slate-400 font-bold border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                                    لا يوجد قوالب محفوظة. قم بإنشاء قالب لسرعة إرسال الرسائل للعملاء.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'broadcast' && (
                    <div className="max-w-2xl space-y-6">
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 rounded-xl space-y-2 border border-emerald-100 dark:border-emerald-800">
                            <h4 className="font-black flex items-center gap-2">
                                <MessageCircle size={18} /> إرسال رسائل جماعية للعملاء
                            </h4>
                            <p className="text-sm font-bold">
                                هذه الخاصية ستقوم بإرسال الرسالة إلى جميع العملاء المسجلين ولديهم أرقام هواتف. 
                                ينصح بتفعيل <strong>API Mode</strong> للإرسال التلقائي دون الحاجة لتدخلك.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2">اختر القالب</label>
                            <select 
                                value={selectedTemplateId} 
                                onChange={e => setSelectedTemplateId(e.target.value)}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold mb-4"
                            >
                                <option value="">-- اختر القالب --</option>
                                {templates.map(t => (
                                    <option key={t.id} value={t.id}>{t.name} ({t.type})</option>
                                ))}
                            </select>
                            
                            <div className="text-sm font-medium text-slate-500 mb-6 font-mono bg-slate-100 dark:bg-slate-800 p-4 rounded-xl whitespace-pre-wrap">
                                {selectedTemplateId ? templates.find(t => t.id === selectedTemplateId)?.body : 'اختر قالباً لمعاينة النص هنا'}
                            </div>

                            <Button onClick={handleBroadcast} isLoading={isBroadcasting} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl h-12">
                                بدء الإرسال الجماعي ({Array.isArray(customers) ? customers.filter(c => c.phone).length : 0} عميل)
                            </Button>
                        </div>
                    </div>
                )}

                {activeTab === 'logs' && (
                    <div>
                        <h3 className="font-black text-slate-800 dark:text-white mb-6">سجل إرسال الرسائل</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-black">
                                        <th className="py-3 px-4 text-start rounded-r-xl">التاريخ</th>
                                        <th className="py-3 px-4 text-start">إلى رقم</th>
                                        <th className="py-3 px-4 text-start">العميل</th>
                                        <th className="py-3 px-4 text-start">النمط</th>
                                        <th className="py-3 px-4 text-center rounded-l-xl">الحالة</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map(log => (
                                        <tr key={log.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                            <td className="py-3 px-4 font-bold">{new Date(log.date).toLocaleString('ar-EG')}</td>
                                            <td className="py-3 px-4" dir="ltr">{log.to}</td>
                                            <td className="py-3 px-4">{log.customerName || '-'}</td>
                                            <td className="py-3 px-4 font-mono text-xs">{log.mode}</td>
                                            <td className="py-3 px-4">
                                                <div className="flex justify-center items-center gap-1">
                                                    {log.status === 'success' ? (
                                                        <span className="text-emerald-500 flex items-center gap-1 font-bold"><CheckCircle2 size={16} /> نجاح</span>
                                                    ) : (
                                                        <span className="text-rose-500 flex items-center gap-1 font-bold" title={log.error}><XCircle size={16} /> فشل</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {logs.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-12 text-center text-slate-400 font-bold">لا توجد رسائل سابقة.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Template Form Modal */}
            {isTemplateModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="font-black text-xl">{editingTemplate ? 'تعديل القالب' : 'قالب رسالة جديد'}</h3>
                            <button onClick={() => setIsTemplateModalOpen(false)} className="text-slate-400 hover:text-slate-600"><XCircle size={24} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">اسم القالب</label>
                                <input 
                                    type="text" 
                                    value={templateForm.name} 
                                    onChange={e => setTemplateForm({...templateForm, name: e.target.value})}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold outline-none focus:border-emerald-500"
                                    placeholder="مثال: رسالة تأكيد الفاتورة"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">النوع</label>
                                <select 
                                    value={templateForm.type} 
                                    onChange={e => setTemplateForm({...templateForm, type: e.target.value as any})}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold outline-none focus:border-emerald-500"
                                >
                                    <option value="invoice">فاتورة (مبيعات)</option>
                                    <option value="debt">تحصيل ديون</option>
                                    <option value="generic">عام</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">محتوى الرسالة</label>
                                <textarea 
                                    value={templateForm.body} 
                                    onChange={e => setTemplateForm({...templateForm, body: e.target.value})}
                                    className="w-full h-32 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold outline-none focus:border-emerald-500 resize-none"
                                    placeholder="مرحباً {{customer_name}}، شكراً لتسوقكم..."
                                />
                                <p className="text-[11px] text-slate-400 mt-2 font-mono" dir="ltr">Variables: {getVariableHint(templateForm.type || 'generic')}</p>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setIsTemplateModalOpen(false)}>إلغاء</Button>
                            <Button onClick={handleSaveTemplate} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black">حفظ القالب</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
