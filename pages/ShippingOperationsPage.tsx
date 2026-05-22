import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { api } from '../services/mockApi';
import { Package, PlusCircle, Edit, Trash2, Truck, Download, Link as LinkIcon, Lock } from 'lucide-react';
import type { ShippingOperation, ShippingCompany } from '../types';
import { useToasts } from '../hooks/useToasts';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';
import TableSkeleton from '../components/ui/TableSkeleton';
import { useAuth } from '../hooks/useAuth';
import { exportToCsv } from '../utils/export';
import ShippingCompanyForm from '../components/shipping/ShippingCompanyForm';
import { useLicense } from '../hooks/useLicense';
import { getPlanLimits } from '../utils/planPermissions';
import { Link } from 'react-router-dom';

export const ShippingOperationsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'operations' | 'companies'>('operations');
    const [operations, setOperations] = useState<ShippingOperation[]>([]);
    const [companies, setCompanies] = useState<ShippingCompany[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { addToast } = useToasts();
    const { userHasPermission } = useAuth();
    const { licenseInfo } = useLicense();
    const limits = getPlanLimits(licenseInfo.type);
    
    // Form state (Operations)
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingOp, setEditingOp] = useState<ShippingOperation | null>(null);
    const [form, setForm] = useState<Partial<ShippingOperation>>({
        saleId: '',
        customerName: '',
        customerPhone: '',
        customerAddress: '',
        shippingCompanyId: '',
        trackingNumber: '',
        status: 'Pending',
        cost: 0
    });

    // Form state (Companies)
    const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState<ShippingCompany | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [deleteType, setDeleteType] = useState<'operation' | 'company'>('operation');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [ops, comps] = await Promise.all([
                api.getShippingOperations(),
                api.getShippingCompanies()
            ]);
            setOperations(ops || []);
            setCompanies(comps || []);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveOperation = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const comp = companies.find(c => c.id === form.shippingCompanyId);
            await api.saveShippingOperation({
                ...editingOp,
                ...form,
                shippingCompanyName: comp?.name || '',
                date: editingOp?.date || new Date().toISOString()
            } as any);
            addToast('تم حفظ العملية الشحن بنجاح', 'success');
            setIsFormOpen(false);
            loadData();
        } catch (error) {
            addToast('حدث خطأ أثناء الحفظ', 'error');
        }
    };

    const handleSaveCompany = async (companyData: Omit<ShippingCompany, 'id'> & { id?: string }) => {
        setIsSaving(true);
        try {
            await api.saveShippingCompany(companyData);
            await loadData();
            addToast(companyData.id ? 'تم تعديل بيانات الشركة.' : 'تم إضافة شركة شحن جديدة.', 'success');
            setIsCompanyModalOpen(false);
            setEditingCompany(null);
        } catch (error) {
            addToast("فشل حفظ شركة الشحن.", 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirmId) return;
        try {
            if (deleteType === 'operation') {
                await api.deleteShippingOperation(deleteConfirmId);
            } else {
                await api.deleteShippingCompany(deleteConfirmId);
            }
            addToast('تم الحذف بنجاح', 'success');
            loadData();
        } catch (error) {
            addToast('حدث خطأ أثناء الحذف', 'error');
        } finally {
            setDeleteConfirmId(null);
        }
    };

    const openForm = (op?: ShippingOperation) => {
        if (op) {
            setEditingOp(op);
            setForm(op);
        } else {
            setEditingOp(null);
            setForm({
                saleId: '',
                customerName: '',
                customerPhone: '',
                customerAddress: '',
                shippingCompanyId: '',
                trackingNumber: '',
                status: 'Pending',
                cost: 0
            });
        }
        setIsFormOpen(true);
    };

    const handleExportCompanies = () => {
        const dataToExport = companies.map(({ id, ...rest }) => rest);
        exportToCsv(`shipping-companies-${new Date().toISOString().split('T')[0]}.csv`, dataToExport);
        addToast('تم تصدير بيانات شركات الشحن.', 'success');
    };

    if (!limits.hasShipping) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fadeIn">
                <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-4">
                    <Lock size={64} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">إدارة الشحن (Premium)</h1>
                    <p className="text-slate-500 mt-2 max-w-md mx-auto">إدارة شركات الشحن وعمليات التوصيل متوفرة في الخطط المدفوعة فقط.</p>
                </div>
                <Link to="/pricing">
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-lg px-8 rounded-2xl">
                        ترقية الاشتراك
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl">
                        <Truck size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white">إدارة الشحن واللوجستيات</h1>
                        <p className="text-sm text-slate-500 font-bold">تتبع العمليات وإدارة شركات الشحن</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {activeTab === 'companies' && (
                        <Button onClick={handleExportCompanies} variant="secondary" className="gap-2 rounded-xl">
                            <Download size={18} /> تصدير
                        </Button>
                    )}
                    <Button 
                        onClick={() => activeTab === 'operations' ? openForm() : (setEditingCompany(null), setIsCompanyModalOpen(true))} 
                        className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg"
                    >
                        <PlusCircle size={20} />
                        {activeTab === 'operations' ? 'إضافة عملية شحن' : 'إضافة شركة شحن'}
                    </Button>
                </div>
            </div>

            <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit">
                <button 
                    onClick={() => setActiveTab('operations')}
                    className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${activeTab === 'operations' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    عمليات الشحن
                </button>
                <button 
                    onClick={() => setActiveTab('companies')}
                    className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${activeTab === 'companies' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    شركات الشحن
                </button>
            </div>

            {activeTab === 'operations' ? (
                <Card className="border-none shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl overflow-hidden p-0">
                    <div className="overflow-x-auto">
                        {isLoading ? (
                            <TableSkeleton rows={5} cols={7} />
                        ) : operations.length === 0 ? (
                            <div className="text-center py-20">
                                <Package className="mx-auto h-16 w-16 text-slate-300 mb-4" />
                                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">لا توجد عمليات شحن</h3>
                                <p className="text-slate-500">قم بإضافة عملية شحن جديدة للبدء.</p>
                            </div>
                        ) : (
                            <table className="w-full text-right">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800">
                                        <th className="p-4 font-bold text-slate-600 dark:text-slate-400">رقم الفاتورة</th>
                                        <th className="p-4 font-bold text-slate-600 dark:text-slate-400">العميل</th>
                                        <th className="p-4 font-bold text-slate-600 dark:text-slate-400">شركة الشحن</th>
                                        <th className="p-4 font-bold text-slate-600 dark:text-slate-400">رقم التتبع</th>
                                        <th className="p-4 font-bold text-slate-600 dark:text-slate-400">التكلفة</th>
                                        <th className="p-4 font-bold text-slate-600 dark:text-slate-400">الحالة</th>
                                        <th className="p-4 font-bold text-slate-600 dark:text-slate-400 text-left">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {operations.map((op) => (
                                        <tr key={op.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="p-4 font-bold text-slate-800 dark:text-white bg-slate-50/50 dark:bg-slate-800/20 rounded-r-xl">{op.saleId || '-'}</td>
                                            <td className="p-4">
                                                <div className="font-bold text-slate-800 dark:text-white">{op.customerName}</div>
                                                <div className="text-xs text-slate-500">{op.customerPhone}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 px-3 py-1 rounded-lg text-sm font-bold">
                                                    {op.shippingCompanyName}
                                                </span>
                                            </td>
                                            <td className="p-4 font-medium text-slate-600 dark:text-slate-400">{op.trackingNumber || '-'}</td>
                                            <td className="p-4 font-black text-emerald-600">{op.cost.toFixed(2)}</td>
                                            <td className="p-4">
                                                <span className={`px-3 py-1 rounded-lg text-xs font-black ${
                                                    op.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' :
                                                    op.status === 'In Transit' ? 'bg-amber-100 text-amber-700' :
                                                    op.status === 'Returned' ? 'bg-red-100 text-red-700' :
                                                    'bg-slate-100 text-slate-700'
                                                }`}>
                                                    {op.status === 'Delivered' ? 'تم التوصيل' :
                                                     op.status === 'In Transit' ? 'جاري التوصيل' :
                                                     op.status === 'Returned' ? 'مرتجع' : 'قيد الانتظار'}
                                                </span>
                                            </td>
                                            <td className="p-4 rounded-l-xl text-left">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => openForm(op)} className="p-2 text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100">
                                                        <Edit size={18} />
                                                    </button>
                                                    <button onClick={() => { setDeleteType('operation'); setDeleteConfirmId(op.id); }} className="p-2 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </Card>
            ) : (
                <Card className="border-none shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl overflow-hidden p-0">
                    <div className="overflow-x-auto">
                        {isLoading ? (
                            <TableSkeleton rows={5} cols={5} />
                        ) : companies.length === 0 ? (
                            <div className="text-center py-20">
                                <Truck className="mx-auto h-16 w-16 text-slate-300 mb-4" />
                                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">لا توجد شركات شحن</h3>
                                <p className="text-slate-500">قم بإضافة شركة شحن جديدة للبدء.</p>
                            </div>
                        ) : (
                            <table className="w-full text-right text-sm">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800">
                                        <th className="p-4 font-bold text-slate-600 dark:text-slate-400">اسم الشركة</th>
                                        <th className="p-4 font-bold text-slate-600 dark:text-slate-400">مسؤول التواصل</th>
                                        <th className="p-4 font-bold text-slate-600 dark:text-slate-400">الهاتف</th>
                                        <th className="p-4 font-bold text-slate-600 dark:text-slate-400">رابط التتبع</th>
                                        <th className="p-4 font-bold text-slate-600 dark:text-slate-400 text-left">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {companies.map((company) => (
                                        <tr key={company.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="p-4 font-bold text-slate-800 dark:text-white">{company.name}</td>
                                            <td className="p-4 text-slate-600 dark:text-slate-400">{company.contactPerson}</td>
                                            <td className="p-4 text-slate-600 dark:text-slate-400 font-medium">{company.phone}</td>
                                            <td className="p-4">
                                                {company.trackingUrl && (
                                                    <a href={company.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1 justify-end">
                                                        <LinkIcon size={14} />
                                                        <span>زيارة</span>
                                                    </a>
                                                )}
                                            </td>
                                            <td className="p-4 text-left">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => { setEditingCompany(company); setIsCompanyModalOpen(true); }} className="p-2 text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100">
                                                        <Edit size={18} />
                                                    </button>
                                                    <button onClick={() => { setDeleteType('company'); setDeleteConfirmId(company.id); }} className="p-2 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </Card>
            )}

            {/* Modals */}
            <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingOp ? 'تعديل عملية الشحن' : 'إضافة عملية شحن'}>
                <form onSubmit={handleSaveOperation} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">العميل</label>
                            <input
                                type="text"
                                value={form.customerName || ''}
                                onChange={e => setForm({...form, customerName: e.target.value})}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">رقم هاتف العميل</label>
                            <input
                                type="text"
                                value={form.customerPhone || ''}
                                onChange={e => setForm({...form, customerPhone: e.target.value})}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-white"
                                required
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">العنوان</label>
                            <input
                                type="text"
                                value={form.customerAddress || ''}
                                onChange={e => setForm({...form, customerAddress: e.target.value})}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">شركة الشحن</label>
                            <select
                                value={form.shippingCompanyId || ''}
                                onChange={e => setForm({...form, shippingCompanyId: e.target.value})}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-white"
                                required
                            >
                                <option value="">اختيار شركة...</option>
                                {companies.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">حالة الشحنة</label>
                            <select
                                value={form.status || 'Pending'}
                                onChange={e => setForm({...form, status: e.target.value as any})}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-white"
                            >
                                <option value="Pending">قيد الانتظار</option>
                                <option value="In Transit">جاري التوصيل</option>
                                <option value="Delivered">تم التوصيل</option>
                                <option value="Returned">مرتجع</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">رقم الفاتورة (اختياري)</label>
                            <input
                                type="text"
                                value={form.saleId || ''}
                                onChange={e => setForm({...form, saleId: e.target.value})}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">رقم التتبع</label>
                            <input
                                type="text"
                                value={form.trackingNumber || ''}
                                onChange={e => setForm({...form, trackingNumber: e.target.value})}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">تكلفة الشحن</label>
                            <input
                                type="number"
                                value={form.cost || 0}
                                onChange={e => setForm({...form, cost: Number(e.target.value)})}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-white"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)} className="rounded-xl px-6">
                            إلغاء
                        </Button>
                        <Button type="submit" className="rounded-xl px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-black">
                            حفظ
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isCompanyModalOpen} onClose={() => setIsCompanyModalOpen(false)} title={editingCompany ? 'تعديل شركة شحن' : 'إضافة شركة شحن'}>
                <ShippingCompanyForm company={editingCompany} onSave={handleSaveCompany} onCancel={() => setIsCompanyModalOpen(false)} isLoading={isSaving} />
            </Modal>

            <ConfirmDialog
                isOpen={!!deleteConfirmId}
                title="تأكيد الحذف"
                message={`هل أنت متأكد من حذف ${deleteType === 'operation' ? 'هذه العملية' : 'هذه الشركة'}؟`}
                confirmText="حذف"
                cancelText="إلغاء"
                onConfirm={handleDelete}
                onClose={() => setDeleteConfirmId(null)}
            />
        </div>
    );
};
