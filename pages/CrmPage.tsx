import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/mockApi';
import type { Customer, Supplier } from '../types';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency, toArabicIndic } from '../utils/localization';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import CustomerForm from '../components/customers/CustomerForm';
import SupplierForm from '../components/suppliers/SupplierForm';
import CustomerDetailsModal from '../components/customers/CustomerDetailsModal';
import { 
    Users, Briefcase, Search, PlusCircle, CreditCard, 
    ArrowUpRight, ArrowDownLeft, FileText, ChevronRight, Edit, Building2
} from 'lucide-react';
import { useToasts } from '../hooks/useToasts';
import TableSkeleton from '../components/ui/TableSkeleton';

const StatCard: React.FC<{ 
    title: string; 
    value: string; 
    icon: React.ReactNode, 
    bgColor: string, 
    iconColor: string, 
    delay: number 
  }> = ({ title, value, icon, bgColor, iconColor, delay }) => (
    <Card className={`p-6 overflow-hidden animate-slide-up group border border-slate-100 dark:border-slate-800/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 relative bg-white dark:bg-slate-900 rounded-[2.5rem]`} style={{ animationDelay: `${delay}ms`}}>
      <div className={`absolute top-0 right-0 w-32 h-32 ${bgColor} rounded-full blur-[3.5rem] opacity-20 -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700`}></div>
      <div className="flex items-start justify-between relative z-10 h-full">
          <div className="flex flex-col h-full justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
                  <span className={`w-1 h-1 rounded-full ${iconColor.replace('text-', 'bg-')}`}></span>
                  {title}
                </p>
                <p className="text-3xl font-black text-slate-800 dark:text-white leading-tight tracking-tight drop-shadow-sm">{value}</p>
              </div>
          </div>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${bgColor} ${iconColor} shadow-inner group-hover:rotate-6 group-hover:scale-110 transition-all duration-300`}>
              {icon}
          </div>
      </div>
    </Card>
  );

const CrmPage: React.FC = () => {
    const { settings } = useSettings();
    const { addToast } = useToasts();
    
    const [view, setView] = useState<'customers' | 'suppliers'>('customers');
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showIncompleteData, setShowIncompleteData] = useState(false);

    const [isCustModalOpen, setIsCustModalOpen] = useState(false);
    const [isSupModalOpen, setIsSupModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [detailsCustomer, setDetailsCustomer] = useState<Customer | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [c, s] = await Promise.all([api.getCustomers(), api.getSuppliers()]);
        setCustomers(c);
        setSuppliers(s);
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const totalCustomerDebt = useMemo(() => customers.reduce((sum, c) => sum + (c.debt || 0), 0), [customers]);
    const totalSupplierDebt = useMemo(() => suppliers.reduce((sum, s) => sum + (s.debt || 0), 0), [suppliers]);

    const filteredCustomers = useMemo(() => {
        return customers.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm);
            if (!matchesSearch) return false;
            if (showIncompleteData) {
                return !c.phone || !c.address || c.phone.trim() === '' || c.address.trim() === '';
            }
            return true;
        })
    }, [customers, searchTerm, showIncompleteData]);

    const filteredSuppliers = useMemo(() => suppliers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.phone.includes(searchTerm)), [suppliers, searchTerm]);

    return (
        <div className="space-y-6 animate-fadeIn pb-10">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Users size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800">إدارة العلاقات (CRM)</h1>
                        <p className="text-sm font-bold text-slate-500">نظام متكامل للعملاء والموردين</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => { setEditingCustomer(null); setIsCustModalOpen(true); view !== 'customers' && setView('customers'); }} className="rounded-xl h-10"><PlusCircle size={18} className="me-2"/> عميل جديد</Button>
                    <Button onClick={() => { setEditingSupplier(null); setIsSupModalOpen(true); view !== 'suppliers' && setView('suppliers'); }} variant="outline" className="rounded-xl h-10"><Building2 size={18} className="me-2"/> مورد جديد</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard 
                    title="مديونيات العملاء (لنا طرفهم)"
                    value={formatCurrency(totalCustomerDebt, settings?.currency || 'SAR')}
                    icon={<Users size={24} />}
                    bgColor="bg-indigo-50 dark:bg-indigo-900/30"
                    iconColor="text-indigo-600"
                    delay={100}
                />
                <StatCard 
                    title="مستحقات الموردين (علينا طرفهم)"
                    value={formatCurrency(totalSupplierDebt, settings?.currency || 'SAR')}
                    icon={<Building2 size={24} />}
                    bgColor="bg-rose-50 dark:bg-rose-900/30"
                    iconColor="text-rose-600"
                    delay={200}
                />
            </div>

            <Card className="border-none shadow-premium overflow-hidden">
                <div className="flex items-center border-b p-2 gap-2 bg-slate-50">
                    <button 
                        onClick={() => setView('customers')}
                        className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all flex justify-center items-center gap-2 ${view === 'customers' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                        <Users size={18} /> سجل العملاء
                    </button>
                    <button 
                        onClick={() => setView('suppliers')}
                        className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all flex justify-center items-center gap-2 ${view === 'suppliers' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                        <Building2 size={18} /> سجل الموردين
                    </button>
                </div>

                <div className="p-4 border-b bg-white flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder={`بحث في مسار ${view === 'customers' ? 'العملاء' : 'الموردين'}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-4 pr-10 py-2 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-600 transition-all"
                        />
                    </div>
                    {view === 'customers' && (
                        <div className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                id="showIncomplete" 
                                checked={showIncompleteData}
                                onChange={(e) => setShowIncompleteData(e.target.checked)}
                                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                            />
                            <label htmlFor="showIncomplete" className="text-sm font-bold text-slate-600 cursor-pointer">
                                عرض العملاء ذوي البيانات غير المكتملة فقط
                            </label>
                        </div>
                    )}
                </div>

                {loading ? <TableSkeleton cols={5} /> : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-400 text-xs uppercase font-black">
                                <tr>
                                    <th className="px-6 py-4 text-start">الاسم</th>
                                    <th className="px-6 py-4 text-start">الهاتف</th>
                                    {view === 'suppliers' && <th className="px-6 py-4 text-start">مسؤول التواصل</th>}
                                    <th className="px-6 py-4 text-start">رصيد الحساب</th>
                                    <th className="px-6 py-4 text-start">حد الائتمان</th>
                                    <th className="px-6 py-4 text-center">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {view === 'customers' && filteredCustomers.map(c => (
                                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-bold">{c.name}</td>
                                        <td className="px-6 py-4 text-slate-500 font-mono">{c.phone}</td>
                                        <td className="px-6 py-4 font-black">
                                            <span className={c.debt > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                                                {formatCurrency(c.debt, settings?.currency || 'SAR')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-400">
                                            {c.creditLimit ? formatCurrency(c.creditLimit, settings?.currency || 'SAR') : '---'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => {setDetailsCustomer(c); setIsDetailsOpen(true);}} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg"><FileText size={18}/></button>
                                                <button onClick={() => {setEditingCustomer(c); setIsCustModalOpen(true);}} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit size={18}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {view === 'suppliers' && filteredSuppliers.map(s => (
                                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-bold">{s.name}</td>
                                        <td className="px-6 py-4 text-slate-500 font-mono">{s.phone}</td>
                                        <td className="px-6 py-4 font-medium">{s.contactPerson}</td>
                                        <td className="px-6 py-4 font-black">
                                            <span className={(s.debt || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                                                {formatCurrency(s.debt || 0, settings?.currency || 'SAR')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-400">
                                            {s.creditLimit ? formatCurrency(s.creditLimit, settings?.currency || 'SAR') : '---'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => {setEditingSupplier(s); setIsSupModalOpen(true);}} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit size={18}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal isOpen={isCustModalOpen} onClose={() => setIsCustModalOpen(false)} title="بيانات العميل">
                <CustomerForm customer={editingCustomer} onSave={async (d) => { await api.saveCustomer(d); await fetchData(); setIsCustModalOpen(false); addToast('تم الحفظ', 'success'); }} onCancel={() => setIsCustModalOpen(false)} isLoading={false}/>
            </Modal>
            
            <Modal isOpen={isSupModalOpen} onClose={() => setIsSupModalOpen(false)} title="بيانات المورد">
                <SupplierForm supplier={editingSupplier} onSave={async (d) => { await api.saveSupplier(d); await fetchData(); setIsSupModalOpen(false); addToast('تم الحفظ', 'success'); }} onCancel={() => setIsSupModalOpen(false)} isLoading={false} />
            </Modal>

            <CustomerDetailsModal isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} customer={detailsCustomer} />
        </div>
    );
};

export default CrmPage;
