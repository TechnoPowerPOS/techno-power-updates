
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Sale } from '../types';
import { api } from '../services/mockApi';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Printer, Download, Search, Edit, Eye, RotateCcw, Truck, Trash2 } from 'lucide-react';
import { exportToCsv } from '../utils/export';
import ReceiptModal from '../components/sales/ReceiptModal';
import ShippingModal from '../components/shipping/ShippingModal';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency } from '../utils/localization';
import TableSkeleton from '../components/ui/TableSkeleton';
import { useToasts } from '../hooks/useToasts';
import { useLicense } from '../hooks/useLicense';
import { getPlanLimits } from '../utils/planPermissions';
import { useAuth } from '../hooks/useAuth';

import ConfirmDialog from '../components/ui/ConfirmDialog';

const SalesPage: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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

        return matchesDate && matchesSearch;
    });
  }, [sales, searchTerm, startDate, endDate]);

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
                        </div>
                    </td>
                    <td className="px-6 py-4 font-bold">{new Date(sale.date).toLocaleDateString('ar-EG')}</td>
                    <td className="px-6 py-4 font-medium">{sale.customer.name}</td>
                    <td className="px-6 py-4 font-black text-slate-800 dark:text-white">{formatCurrency(sale.total, settings.currency)}</td>
                    <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-black">
                            {sale.paymentMethod === 'Cash' ? 'نقدي' : sale.paymentMethod === 'Card' ? 'بطاقة' : sale.paymentMethod === 'Split' ? 'مجزأ' : 'آجل'}
                        </span>
                    </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center items-center gap-2">
                              <button onClick={() => handleOpenReceipt(sale)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all" title="عرض"><Eye size={18} /></button>
                              {limits.hasShipping && (
                                 <button onClick={() => handleOpenShipping(sale)} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all" title="شحن"><Truck size={18} /></button>
                              )}
                              <button onClick={() => handleOpenReceipt(sale)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all" title="طباعة"><Printer size={18} /></button>
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
