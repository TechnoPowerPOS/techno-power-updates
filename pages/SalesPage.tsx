
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Sale } from '../types';
import { api } from '../services/mockApi';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Printer, Download, Search, Edit, Eye, RotateCcw, Truck, Trash2, FileText, ShoppingBag, Clock, DollarSign, RefreshCw } from 'lucide-react';
import { exportToCsv } from '../utils/export';
import ReceiptModal from '../components/sales/ReceiptModal';
import ShippingModal from '../components/shipping/ShippingModal';
import SalesReturnModal from '../components/returns/SalesReturnModal';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency, toArabicIndic } from '../utils/localization';
import TableSkeleton from '../components/ui/TableSkeleton';
import { useToasts } from '../hooks/useToasts';
import { useLicense } from '../hooks/useLicense';
import { getPlanLimits } from '../utils/planPermissions';
import { useAuth } from '../hooks/useAuth';

import ConfirmDialog from '../components/ui/ConfirmDialog';

const StatCard: React.FC<{ 
    title: string; 
    value: string; 
    icon: React.ReactNode, 
    color: 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate',
    delay: number 
  }> = ({ title, value, icon, color, delay }) => {
    const colorClasses = {
        indigo: 'from-indigo-500/20 to-indigo-600/5 text-indigo-600 bg-indigo-500 dark:bg-indigo-600',
        emerald: 'from-emerald-500/20 to-emerald-600/5 text-emerald-600 bg-emerald-500 dark:bg-emerald-600',
        amber: 'from-amber-500/20 to-amber-600/5 text-amber-600 bg-amber-500 dark:bg-amber-600',
        rose: 'from-rose-500/20 to-rose-600/5 text-rose-600 bg-rose-500 dark:bg-rose-600',
        slate: 'from-slate-500/20 to-slate-600/5 text-slate-600 bg-slate-500 dark:bg-slate-600'
    };

    return (
        <Card className={`group relative p-0 overflow-hidden animate-slide-up border-none shadow-xl hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-500 rounded-[2rem] bg-white dark:bg-slate-900`} style={{ animationDelay: `${delay}ms`}}>
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colorClasses[color].split(' ')[0]} rounded-full blur-3xl opacity-40 -translate-y-1/2 translate-x-1/2 transition-all duration-700 group-hover:scale-150`}></div>
            <div className="p-6 flex flex-col h-full relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-white dark:bg-slate-800 shadow-lg border border-slate-100 dark:border-slate-700/50 ${colorClasses[color].split(' ')[1]} transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110`}>
                        {icon}
                    </div>
                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 opacity-60`}>
                        Stats
                    </div>
                </div>
                <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{title}</p>
                <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{value}</h3>
                <div className="mt-4 flex items-center gap-2">
                    <div className={`h-1.5 w-12 rounded-full ${colorClasses[color].split(' ')[2].replace('bg-', 'bg-').split(' ')[0]} opacity-20`}>
                        <div className={`h-full w-2/3 rounded-full ${colorClasses[color].split(' ')[2].split(' ')[0]}`}></div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">نمو إيجابي</span>
                </div>
            </div>
        </Card>
    );
};

const SalesPage: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const { settings } = useSettings();
  const { addToast } = useToasts();
  const { licenseInfo } = useLicense();
  const limits = getPlanLimits(licenseInfo.type);
  const navigate = useNavigate();
  const { user, userHasPermission } = useAuth();
  
  const canDelete = userHasPermission('access_admin_tool') || user?.roleId === 'admin';

  const fetchSales = async () => {
    setLoading(true);
    try {
        const data = await api.getSales();
        setSales(data);
    } catch (e) {
        addToast("خطأ في تحميل المبيعات", "error");
    } finally {
        setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchSales();
  }, []);

  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
        const transDate = sale.date.split('T')[0];
        const matchesDate = (!startDate || transDate >= startDate) && (!endDate || transDate <= endDate);
        
        const lowercasedTerm = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm || 
            sale.id.toLowerCase().includes(lowercasedTerm) ||
            sale.customer.name.toLowerCase().includes(lowercasedTerm);
            
        let matchesStatus = true;
        if (filterStatus === 'Reservation') matchesStatus = sale.status === 'Reservation';
        else if (filterStatus === 'Completed') matchesStatus = sale.status !== 'Reservation' && sale.status !== 'Refunded';
        else if (filterStatus === 'Refunded') matchesStatus = sale.status === 'Refunded';

        return matchesDate && matchesSearch && matchesStatus;
    });
  }, [sales, searchTerm, startDate, endDate, filterStatus]);

  const handleBulkDelete = async () => {
      if (selectedItems.length === 0) return;
      setConfirmBulkDelete(true);
  };

  const confirmHandleBulkDelete = async () => {
      setConfirmBulkDelete(false);
      setIsSaving(true);
      try {
          for (const id of selectedItems) {
              await api.deleteInvoice(id); 
          }
          await fetchSales();
          setSelectedItems([]);
          addToast(`تم حذف ${selectedItems.length} فاتورة بنجاح`, 'success');
      } catch (e) {
          addToast('فشل في حذف بعض الفواتير', 'error');
      } finally {
          setIsSaving(false);
      }
  };

  const handleBulkDeleteIndividual = (id: string) => {
      setConfirmDeleteId(id);
  };

  const confirmHandleDeleteIndividual = async () => {
      if (!confirmDeleteId) return;
      
      const id = confirmDeleteId;
      setConfirmDeleteId(null);
      
      setIsSaving(true);
      try {
          const success = await api.deleteInvoice(id); 
          if (success) {
            await fetchSales();
            addToast(`تم حذف الفاتورة ${id} بنجاح`, 'success');
          } else {
            addToast('فشل حذف الفاتورة', 'error');
          }
      } catch (e) {
          addToast('حدث خطأ أثناء الحذف', 'error');
      } finally {
          setIsSaving(false);
      }
  };

  const toggleSelectItem = (id: string) => {
      setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
      if (selectedItems.length === filteredSales.length) {
          setSelectedItems([]);
      } else {
          setSelectedItems(filteredSales.map(p => p.id));
      }
  };

  const handleExport = () => {
    const dataToExport = filteredSales.map(s => ({
        id: s.id,
        date: s.date,
        customer: s.customer.name,
        total: s.total,
        paymentMethod: s.paymentMethod
    }));
    exportToCsv(`sales-${new Date().toISOString().split('T')[0]}.csv`, dataToExport);
    addToast('تم تصدير سجل المبيعات.', 'success');
  };

  const handleOpenReceipt = (sale: Sale) => {
    setSelectedSale(sale);
    setIsReceiptModalOpen(true);
  };

  const handleOpenShipping = (sale: Sale) => {
    setSelectedSale(sale);
    setIsShippingModalOpen(true);
  };

  const handleEditSale = (saleId: string) => {
    navigate(`/pos?edit=${saleId}`);
  };

  const handleOpenReturn = (sale: Sale) => {
      // بناءً على طلب المستخدم: فتح الفاتورة في شاشة البيع لعمل المرتجع أو الاستبدال وحساب الفرق
      navigate(`/pos?exchangeId=${sale.id}`);
  };

  const handleSaveReturn = async (data: any) => {
      setIsSaving(true);
      try {
          await api.saveSalesReturn(data);
          addToast("تم تسجيل المرتجع بنجاح", "success");
          fetchSales();
          setIsReturnModalOpen(false);
      } catch (e) {
          addToast("فشل تسجيل المرتجع", "error");
      } finally {
          setIsSaving(false);
      }
  };

  const stats = useMemo(() => {
     const today = new Date().toDateString();
     const todaySales = sales.filter(s => new Date(s.date).toDateString() === today);
     
     return {
         totalInvoices: sales.length,
         todayInvoices: todaySales.length,
         totalRevenue: sales.reduce((a, b) => a + Number(b.total || 0), 0),
         todayRevenue: todaySales.reduce((a, b) => a + Number(b.total || 0), 0)
     };
  }, [sales]);

  return (
    <div className="animate-fadeIn">
      <div className="flex flex-col xl:flex-row justify-between items-center gap-4 mb-6">
        <h1 className="text-3xl font-black text-slate-800 dark:text-white">سجل المبيعات</h1>
        
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full xl:w-auto">
             <div className="relative flex-grow sm:flex-grow-0 sm:w-64">
                <Search className="absolute top-1/2 -translate-y-1/2 start-3 text-slate-400" size={20} />
                <input 
                  type="text" 
                  placeholder="ابحث برقم الفاتورة أو العميل..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  className="w-full p-2 ps-10 border rounded-xl dark:bg-slate-700 dark:border-slate-600 font-bold shadow-sm outline-none focus:border-indigo-500 transition-all"
                />
             </div>

             <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 rounded-xl border dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-1">
                    <span className="text-[10px] font-black text-slate-400 px-1 uppercase">حالة الفاتورة</span>
                    <select 
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="p-1 text-xs border-none bg-transparent font-bold outline-none"
                    >
                        <option value="all">الكل</option>
                        <option value="Completed">مكتملة</option>
                        <option value="Reservation">محجوزة</option>
                        <option value="Refunded">مرجع كامل</option>
                    </select>
                </div>
             </div>

             <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 rounded-xl border dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-1">
                    <span className="text-[10px] font-black text-slate-400 px-1 uppercase">من</span>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="p-1 text-xs border-none bg-transparent font-bold outline-none" />
                </div>
                <div className="flex items-center gap-1 border-s dark:border-slate-700">
                    <span className="text-[10px] font-black text-slate-400 px-1 uppercase">إلى</span>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="p-1 text-xs border-none bg-transparent font-bold outline-none" />
                </div>
             </div>

            <Button onClick={handleExport} variant="secondary" className="rounded-xl shadow-sm">
              <Download size={18} />
            </Button>
            {canDelete && selectedItems.length > 0 && (
                <button 
                    onClick={handleBulkDelete}
                    disabled={isSaving}
                    className="h-10 px-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl transition-all flex items-center gap-2 shadow-sm font-bold text-xs hover:bg-rose-100"
                >
                    حذف ({selectedItems.length})
                </button>
            )}
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
              title="إجمالي الفواتير"
              value={toArabicIndic(stats.totalInvoices)}
              icon={<FileText size={24} />}
              color="indigo"
              delay={100}
          />
          <StatCard 
              title="فواتير اليوم"
              value={toArabicIndic(stats.todayInvoices)}
              icon={<ShoppingBag size={24} />}
              color="amber"
              delay={200}
          />
          <StatCard 
              title="إجمالي الإيرادات"
              value={formatCurrency(stats.totalRevenue, settings?.currency)}
              icon={<DollarSign size={24} />}
              color="emerald"
              delay={300}
          />
          <StatCard 
              title="إيرادات اليوم"
              value={formatCurrency(stats.todayRevenue, settings?.currency)}
              icon={<Clock size={24} />}
              color="indigo"
              delay={400}
          />
      </div>

      {(startDate || endDate) && (
          <div className="mb-6 p-4 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-between dark:bg-indigo-900/30 dark:border-indigo-800/50">
              <span className="font-bold text-indigo-800 dark:text-indigo-200">إجمالي الفترة المحددة:</span>
              <span className="text-xl font-black text-indigo-900 dark:text-indigo-100">{formatCurrency(filteredSales.reduce((a, b) => a + Number(b.total || 0), 0), settings?.currency)}</span>
          </div>
      )}

      <Card className="p-0 border-none shadow-premium overflow-hidden">
        {loading ? <TableSkeleton cols={6} hasActions /> : !settings ? <p className="p-6 text-center">جاري تحميل...</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  {canDelete && (
                    <th className="px-6 py-4 w-10">
                        <input 
                            type="checkbox" 
                            checked={selectedItems.length === filteredSales.length && filteredSales.length > 0} 
                            onChange={toggleSelectAll} 
                            className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                        />
                    </th>
                  )}
                  <th className="px-6 py-4">رقم الفاتورة</th>
                  <th className="px-6 py-4">التاريخ</th>
                  <th className="px-6 py-4">العميل</th>
                  <th className="px-6 py-4">الإجمالي</th>
                  <th className="px-6 py-4">طريقة الدفع</th>
                  <th className="px-6 py-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800">
                {filteredSales.map((sale) => {
                    const isSelected = selectedItems.includes(sale.id);
                    return (
                  <tr key={sale.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${sale.status === 'Refunded' ? 'bg-rose-50/30 dark:bg-rose-900/5' : ''} ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                    {canDelete && (
                      <td className="px-6 py-4 text-center">
                           <input 
                               type="checkbox" 
                               checked={isSelected} 
                               onChange={() => toggleSelectItem(sale.id)} 
                               className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                           />
                      </td>
                    )}
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                            <span className="font-black text-indigo-600 font-mono">{sale.id.toUpperCase()}</span>
                            {sale.status === 'Refunded' && (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-600 rounded-lg text-[9px] font-black border border-rose-200">
                                    <RotateCcw size={10} /> مرتجع
                                </span>
                            )}
                            {sale.status === 'Reservation' && (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-fuchsia-100 text-fuchsia-600 rounded-lg text-[9px] font-black border border-fuchsia-200">
                                     محجوز
                                </span>
                            )}
                        </div>
                    </td>
                    <td className="px-6 py-4 font-bold">{new Date(sale.date).toLocaleDateString('ar-EG')}</td>
                    <td className="px-6 py-4 font-medium">{sale.customer.name}</td>
                    <td className="px-6 py-4 font-black text-slate-800 dark:text-white">{formatCurrency(sale.total, settings.currency)}</td>
                    <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-black">
                            {sale.paymentMethod === 'Cash' ? 'نقدي' : sale.paymentMethod === 'Card' ? 'بطاقة' : sale.paymentMethod === 'Split' ? 'مجزأ' : sale.paymentMethod === 'Reservation' ? 'حجز' : 'آجل'}
                        </span>
                    </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center items-center gap-2">
                              {sale.status === 'Reservation' ? (
                                <button onClick={() => navigate(`/pos?reservationId=${sale.id}`)} className="p-2 text-fuchsia-600 hover:bg-fuchsia-50 rounded-xl transition-all font-bold text-xs" title="استكمال/دفع">استكمال الفاتورة</button>
                              ) : (
                                <>
                                  <button onClick={() => navigate(`/pos?exchangeId=${sale.id}`)} className="p-2 text-amber-500 hover:bg-amber-50 rounded-xl transition-all" title="استبدال/تعديل"><RefreshCw size={18} /></button>
                                  <button onClick={() => handleOpenReceipt(sale)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all" title="عرض"><Eye size={18} /></button>
                                  {limits.hasShipping && (
                                     <button onClick={() => handleOpenShipping(sale)} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all" title="شحن"><Truck size={18} /></button>
                                  )}
                                  <button onClick={() => handleOpenReceipt(sale)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all" title="طباعة"><Printer size={18} /></button>
                                </>
                              )}
                              <button onClick={() => handleOpenReturn(sale)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all" title="مرتجع"><RotateCcw size={18} /></button>
                               {canDelete && (
                                 <button 
                                    onClick={() => handleBulkDeleteIndividual(sale.id)} 
                                    disabled={isSaving}
                                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all" 
                                    title="حذف"
                                 >
                                    <Trash2 size={18} />
                                 </button>
                               )}
                            </div>
                          </td>
                  </tr>
                 );
                })}
              </tbody>
            </table>
            {!loading && filteredSales.length === 0 && (
              <div className="text-center py-20 text-slate-400 font-bold">لا توجد فواتير تطابق معايير البحث.</div>
            )}
          </div>
        )}
      </Card>
      <ReceiptModal isOpen={isReceiptModalOpen} onClose={() => setIsReceiptModalOpen(false)} sale={selectedSale} />
      <ShippingModal isOpen={isShippingModalOpen} onClose={() => setIsShippingModalOpen(false)} sale={selectedSale} />
      <SalesReturnModal 
        isOpen={isReturnModalOpen} 
        onClose={() => setIsReturnModalOpen(false)} 
        initialSaleId={selectedSale?.id}
        onSave={handleSaveReturn}
        isLoading={isSaving}
      />
      {canDelete && (
          <ConfirmDialog
              isOpen={confirmBulkDelete}
              onClose={() => setConfirmBulkDelete(false)}
              onConfirm={confirmHandleBulkDelete}
              title="تأكيد الحذف"
              message={`هل أنت متأكد من حذف ${selectedItems.length} فاتورة مبيعات؟ سيتم التأثير على المخزون بشكل عكسي.`}
          />
      )}
      {canDelete && (
          <ConfirmDialog
              isOpen={!!confirmDeleteId}
              onClose={() => setConfirmDeleteId(null)}
              onConfirm={confirmHandleDeleteIndividual}
              title="تأكيد الحذف"
              message={`هل أنت متأكد من حذف فاتورة المبيعات #${confirmDeleteId}؟ سيتم استعادة المخزون.`}
          />
      )}
    </div>
  );
};

export default SalesPage;
