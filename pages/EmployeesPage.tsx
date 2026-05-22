import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/mockApi';
import type { Employee, Sale } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { PlusCircle, Edit3, Trash2, Users, Percent, ShieldBan, FileText, User, DollarSign } from 'lucide-react';
import { useToasts } from '../hooks/useToasts';
import { useSettings } from '../hooks/useSettings';
import { toArabicIndic, formatCurrency, formatAmount } from '../utils/localization';

const EmployeesPage: React.FC = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'management' | 'reports'>('management');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const { addToast } = useToasts();
    const { settings } = useSettings();

    // Report states
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(1);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [selectedReportEmployeeId, setSelectedReportEmployeeId] = useState<string>('');

    const [formData, setFormData] = useState({
        name: '', phone: '', commissionPercentage: 0, maxDiscountLimit: 0, status: 'Active' as 'Active' | 'Inactive'
    });

    const fetchData = async () => {
        setIsLoading(true);
        const [emps, allSales] = await Promise.all([
            api.getEmployees(),
            api.getSales()
        ]);
        setEmployees(emps);
        setSales(allSales);
        setIsLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const handleEdit = (e: Employee) => {
        setEditingEmployee(e);
        setFormData({
            name: e.name, phone: e.phone || '', commissionPercentage: e.commissionPercentage, maxDiscountLimit: e.maxDiscountLimit, status: e.status
        });
        setIsModalOpen(true);
    };

    const handleDelete = async () => {
        if (!confirmDeleteId) return;
        try {
            await api.deleteEmployee(confirmDeleteId);
            addToast('تم حذف الموظف بنجاح', 'success');
            fetchData();
        } catch (error) {
            addToast('فشل في عملية الحذف', 'error');
        } finally {
            setConfirmDeleteId(null);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.saveEmployee({ ...formData, id: editingEmployee?.id });
            addToast('تم حفظ الموظف بنجاح', 'success');
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            addToast('حدث خطأ أثناء الحفظ', 'error');
        }
    };

    const filteredSales = useMemo(() => {
        return sales.filter(s => {
            if (!s.employeeId) return false;
            if (s.status !== 'Completed') return false;
            const sDate = new Date(s.date).toISOString().split('T')[0];
            if (startDate && sDate < startDate) return false;
            if (endDate && sDate > endDate) return false;
            if (selectedReportEmployeeId && s.employeeId !== selectedReportEmployeeId) return false;
            return true;
        });
    }, [sales, startDate, endDate, selectedReportEmployeeId]);

    const employeeStats = useMemo(() => {
        const stats: Record<string, { totalCommission: number, saleCount: number, totalSales: number }> = {};
        employees.forEach(emp => {
            stats[emp.id] = { totalCommission: 0, saleCount: 0, totalSales: 0 };
        });
        filteredSales.forEach(s => {
            if (s.employeeId && stats[s.employeeId]) {
                const c = s.commissionAmount || 0;
                stats[s.employeeId].totalCommission += c;
                stats[s.employeeId].saleCount += 1;
                stats[s.employeeId].totalSales += s.total;
            }
        });
        return stats;
    }, [filteredSales, employees]);

    const totalCommissions = useMemo(() => Object.values(employeeStats).reduce((a, b) => a + b.totalCommission, 0), [employeeStats]);

    if (isLoading) return <div className="p-8 text-center font-bold">جاري تحميل البيانات...</div>;

    return (
        <div className="animate-fadeIn pb-20">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 dark:text-white">نظام الموظفين والعمولات</h1>
                    <p className="text-slate-500 font-bold mt-1">إدارة الموظفين والاطلاع على تقارير العمولات.</p>
                </div>
            </div>

            <div className="flex gap-4 mb-8 border-b dark:border-slate-800">
                <button 
                    onClick={() => setActiveTab('management')}
                    className={`pb-4 px-4 font-black transition-all ${activeTab === 'management' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    إدارة الموظفين
                </button>
                <button 
                    onClick={() => setActiveTab('reports')}
                    className={`pb-4 px-4 font-black transition-all ${activeTab === 'reports' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    تقارير العمولات
                </button>
            </div>

            {activeTab === 'management' && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="flex justify-end">
                        <Button onClick={() => { setEditingEmployee(null); setFormData({name: '', phone: '', commissionPercentage: 0, maxDiscountLimit: 0, status: 'Active'}); setIsModalOpen(true); }} className="rounded-2xl font-black h-12 px-6">
                            <PlusCircle size={18} className="me-2"/> إضافة موظف
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {employees.map(emp => (
                            <Card key={emp.id} className={`relative overflow-hidden border-2 shadow-sm hover:shadow-lg transition-all ${emp.status === 'Inactive' ? 'opacity-70 grayscale border-slate-200' : 'border-indigo-100 dark:border-indigo-800/30'}`}>
                                <div className={`absolute top-0 right-0 py-1.5 px-4 rounded-bl-3xl font-black text-[10px] text-white shadow-md ${emp.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-500'}`}>
                                    {emp.status === 'Active' ? 'نشط' : 'غير نشط'}
                                </div>
                                <div className="absolute top-3 left-3 flex gap-2">
                                    <button onClick={() => handleEdit(emp)} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:scale-110"><Edit3 size={16}/></button>
                                    <button onClick={() => setConfirmDeleteId(emp.id)} className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:scale-110"><Trash2 size={16}/></button>
                                </div>
                                <div className="flex flex-col items-center mt-6 mb-6">
                                    <div className="w-16 h-16 bg-slate-100 text-indigo-600 rounded-full flex items-center justify-center font-black text-2xl shadow-inner mb-4">{emp.name.charAt(0)}</div>
                                    <h3 className="text-lg font-black">{emp.name}</h3>
                                    <p className="text-xs text-slate-400 font-bold">{emp.phone || 'بدون رقم'}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] uppercase font-black text-slate-400 mb-1 flex items-center gap-1"><Percent size={12}/> نسبة العمولة</p>
                                        <p className="font-black text-indigo-600">{toArabicIndic(emp.commissionPercentage)}%</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-black text-slate-400 mb-1 flex items-center gap-1"><ShieldBan size={12}/> حد الخصم الأقصى</p>
                                        <p className="font-black text-rose-600">{toArabicIndic(emp.maxDiscountLimit)}%</p>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>

                    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingEmployee ? 'تعديل موظف' : 'إضافة موظف جديد'}>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">اسم الموظف</label>
                                <input type="text" required value={formData.name || ''} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-sm"/>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">رقم الهاتف</label>
                                <input type="text" value={formData.phone || ''} onChange={e=>setFormData({...formData, phone: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-sm"/>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">نسبة العمولة (%)</label>
                                    <input type="number" step="0.01" required value={formData.commissionPercentage || 0} onChange={e=>setFormData({...formData, commissionPercentage: parseFloat(e.target.value)||0})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-sm"/>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black w-full text-slate-400 uppercase mb-2 block">حد الخصم لمنع العمولة (%)</label>
                                    <input type="number" step="0.01" required value={formData.maxDiscountLimit || 0} onChange={e=>setFormData({...formData, maxDiscountLimit: parseFloat(e.target.value)||0})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-sm"/>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">الحالة</label>
                                <select value={formData.status} onChange={e=>setFormData({...formData, status: e.target.value as any})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
                                    <option value="Active">نشط</option>
                                    <option value="Inactive">غير نشط</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="rounded-xl">إلغاء</Button>
                                <Button type="submit" className="rounded-xl">حفظ</Button>
                            </div>
                        </form>
                    </Modal>

                    <ConfirmDialog
                        isOpen={!!confirmDeleteId}
                        onClose={() => setConfirmDeleteId(null)}
                        onConfirm={handleDelete}
                        title="تأكيد الحذف"
                        message="هل أنت متأكد من حذف هذا الموظف؟ لا يمكن التراجع عن هذا الإجراء."
                    />
                </div>
            )}

            {activeTab === 'reports' && (
                <div className="space-y-6 animate-fadeIn">
                    <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">من تاريخ</label>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">إلى تاريخ</label>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">الموظف</label>
                                <select value={selectedReportEmployeeId} onChange={e => setSelectedReportEmployeeId(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold">
                                    <option value="">الجميع</option>
                                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                </select>
                            </div>
                            <div className="bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 rounded-xl p-3 flex flex-col justify-center items-center h-[50px] border border-indigo-100 dark:border-indigo-800">
                                <span className="text-[10px] font-black uppercase">إجمالي العمولات للفترة</span>
                                <span className="text-sm font-black">{formatCurrency(totalCommissions, settings?.currency)}</span>
                            </div>
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {(selectedReportEmployeeId ? employees.filter(e => e.id === selectedReportEmployeeId) : employees)
                          .filter(emp => employeeStats[emp.id]?.totalCommission > 0)
                          .map(emp => {
                            const st = employeeStats[emp.id];
                            return (
                                <Card key={emp.id} className="p-6 border-2 border-indigo-50 dark:border-indigo-900/30 shadow-md flex items-center gap-4">
                                    <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
                                        <User size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-black text-lg">{emp.name}</h3>
                                        <p className="text-xs text-slate-500 font-bold">{toArabicIndic(st.saleCount)} فاتورة مبيعات</p>
                                    </div>
                                    <div className="text-end">
                                        <p className="text-[10px] uppercase font-black text-slate-400">إجمالي العمولات</p>
                                        <p className="text-xl font-black text-emerald-600">{formatAmount(st.totalCommission)}</p>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>

                    <Card className="overflow-hidden border border-slate-100 dark:border-slate-800">
                        <div className="bg-slate-50 dark:bg-slate-800 p-4 border-b dark:border-slate-700 font-black flex gap-2 items-center">
                            <FileText size={18} className="text-indigo-600"/> تفاصيل الفواتير المحسوبة
                        </div>
                        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                            <table className="w-full text-sm font-bold text-slate-700 dark:text-slate-300">
                                <thead>
                                    <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] uppercase text-slate-400 font-black border-y">
                                        <th className="p-4 text-start">رقم الفاتورة</th>
                                        <th className="p-4 text-start">التاريخ</th>
                                        <th className="p-4 text-start">الموظف</th>
                                        <th className="p-4 text-center">إجمالي الفاتورة</th>
                                        <th className="p-4 text-center">الخصم المطبق</th>
                                        <th className="p-4 text-end">قيمة العمولة</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {filteredSales.slice().sort((a,b)=> new Date(b.date).getTime() - new Date(a.date).getTime()).map(sale => {
                                        const emp = employees.find(e => e.id === sale.employeeId);
                                        return (
                                            <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="p-4 font-mono text-xs">#{sale.id}</td>
                                                <td className="p-4 text-xs">{new Date(sale.date).toLocaleString('ar-EG')}</td>
                                                <td className="p-4 text-indigo-600">{emp?.name || sale.employeeId}</td>
                                                <td className="p-4 text-center text-xs">{formatCurrency(sale.total, settings?.currency)}</td>
                                                <td className="p-4 text-center text-xs text-rose-500">{sale.discount} ({sale.discountType === 'percent' ? '%' : settings?.currency})</td>
                                                <td className="p-4 text-end font-black text-emerald-600 bg-emerald-50/30 dark:bg-emerald-900/10">
                                                    {formatCurrency(sale.commissionAmount || 0, settings?.currency)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredSales.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">لا يوجد مبيعات مطابقة لمعايير البحث</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default EmployeesPage;
