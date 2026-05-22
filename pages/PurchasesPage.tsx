
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Purchase } from '../types';
import { api } from '../services/mockApi';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Printer, Download, PlusCircle, Search, Edit, Trash2 } from 'lucide-react';
import { exportToCsv } from '../utils/export';
import PurchaseReceiptModal from '../components/purchases/PurchaseReceiptModal';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency } from '../utils/localization';
import TableSkeleton from '../components/ui/TableSkeleton';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToasts } from '../hooks/useToasts';

const PurchasesPage: React.FC = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { settings } = useSettings();
  const navigate = useNavigate();
  const { addToast } = useToasts();

  const fetchPurchases = async () => {
    setLoading(true);
    try {
        const data = await api.getPurchases();
        setPurchases(data);
    } catch (e) {
        addToast("فشل تحميل المشتريات", "error");
    } finally {
        setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchPurchases();
  }, []);

  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
        const transDate = p.date.split('T')[0];
        const matchesDate = (!startDate || transDate >= startDate) && (!endDate || transDate <= endDate);
        
        const lowercasedTerm = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm || 
            p.id.toLowerCase().includes(lowercasedTerm) ||
            (p.supplier?.name || '').toLowerCase().includes(lowercasedTerm);

        return matchesDate && matchesSearch;
    });
  }, [purchases, searchTerm, startDate, endDate]);

  const handleSingleDelete = async () => {
      if (!confirmDeleteId) return;
      setIsSaving(true);
      try {
          await api.deleteInvoice(confirmDeleteId);
          await fetchPurchases();
          setSelectedItems(prev => prev.filter(id => id !== confirmDeleteId));
          addToast('تم حذف فاتورة المشتريات بنجاح', 'success');
      } catch (e) {
          addToast('فشل في حذف الفاتورة', 'error');
      } finally {
          setIsSaving(false);
          setConfirmDeleteId(null);
      }
  };

  const handleBulkDelete = async () => {
      if (selectedItems.length === 0) return;
      
      setIsSaving(true);
      try {
          // Assuming api.deleteInvoice exists. Let's see if mockApi has deletePurchase or deleteInvoice
          for (const id of selectedItems) {
              await api.deleteInvoice(id); 
          }
          await fetchPurchases();
          setSelectedItems([]);
          addToast(`تم حذف ${selectedItems.length} فاتورة بنجاح`, 'success');
      } catch (e) {
          addToast('فشل في حذف بعض الفواتير', 'error');
      } finally {
          setIsSaving(false);
          setConfirmBulkDelete(false);
      }
  };

  const toggleSelectItem = (id: string) => {
      setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
      if (selectedItems.length === filteredPurchases.length) {
          setSelectedItems([]);
      } else {
          setSelectedItems(filteredPurchases.map(p => p.id));
      }
  };

  const handleExport = () => {
    const dataToExport = filteredPurchases.map(p => ({
        id: p.id,
        date: p.date,
        supplier: p.supplier?.name || 'مورد محذوف',
        total: p.total,
        status: p.status
    }));
    exportToCsv(`purchases-${new Date().toISOString().split('T')[0]}.csv`, dataToExport);
    addToast('تم تصدير سجل المشتريات.', 'success');
  };

  const getStatusChip = (status: string) => {
    const s = status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : '';
    switch (s) {
        case 'Paid': return <span className="px-3 py-1 text-[10px] font-black text-emerald-700 bg-emerald-100 rounded-full border border-emerald-200">مدفوع</span>;
        case 'Partial': return <span className="px-3 py-1 text-[10px] font-black text-amber-700 bg-amber-100 rounded-full border border-amber-200">جزئي</span>;
        case 'Unpaid': return <span className="px-3 py-1 text-[10px] font-black text-rose-700 bg-rose-100 rounded-full border border-rose-200">غير مدفوع</span>;
        default: return <span className="px-3 py-1 text-[10px] font-black text-slate-500 bg-slate-100 rounded-full">غير محدد</span>;
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="flex flex-col xl:flex-row justify-between items-center gap-4 mb-6">
        <h1 className="text-3xl font-black text-slate-800 dark:text-white">سجل المشتريات</h1>
        
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full xl:w-auto">
            <div className="relative flex-grow sm:flex-grow-0 sm:w-64">
              <Search className="absolute top-1/2 -translate-y-1/2 start-3 text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="ابحث برقم الطلب أو المورد..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="w-full p-2 ps-10 border rounded-xl dark:bg-slate-700 dark:border-slate-600 font-bold outline-none focus:border-indigo-500 shadow-sm transition-all"
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

            <Button onClick={handleExport} variant="secondary" className="rounded-xl shadow-sm"><Download size={18} /></Button>
            {selectedItems.length > 0 && (
                <button 
                    onClick={() => setConfirmBulkDelete(true)}
                    disabled={isSaving}
                    className="h-10 px-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl transition-all flex items-center gap-2 shadow-sm font-bold text-xs hover:bg-rose-100"
                >
                    حذف ({selectedItems.length})
                </button>
            )}
            <Button onClick={() => navigate('/purchases/new')} className="rounded-xl font-black shadow-lg shadow-indigo-500/20"><PlusCircle size={18} /> إضافة طلب</Button>
        </div>
      </div>

      {(startDate || endDate) && (
          <div className="mb-6 p-4 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-between dark:bg-orange-900/30 dark:border-orange-800/50">
              <span className="font-bold text-orange-800 dark:text-orange-200">إجمالي مشتريات الفترة المحددة:</span>
              <span className="text-xl font-black text-orange-900 dark:text-orange-100">{formatCurrency(filteredPurchases.reduce((a, b) => a + Number(b.total || 0), 0), settings?.currency)}</span>
          </div>
      )}

      <Card className="p-0 border-none shadow-premium overflow-hidden">
        {loading ? <TableSkeleton cols={5} hasActions /> : !settings ? <p className="p-6 text-center">جاري تحميل...</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-4 w-10">
                      <input 
                          type="checkbox" 
                          checked={selectedItems.length === filteredPurchases.length && filteredPurchases.length > 0} 
                          onChange={toggleSelectAll} 
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                  </th>
                  <th className="px-6 py-4">رقم الطلب</th>
                  <th className="px-6 py-4">التاريخ</th>
                  <th className="px-6 py-4">المورد</th>
                  <th className="px-6 py-4 text-center">الإجمالي</th>
                  <th className="px-6 py-4 text-center">الحالة</th>
                  <th className="px-6 py-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800">
                {filteredPurchases.map((purchase) => {
                    const isSelected = selectedItems.includes(purchase.id);
                    return (
                  <tr key={purchase.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                     <td className="px-6 py-4 text-center">
                         <input 
                             type="checkbox" 
                             checked={isSelected} 
                             onChange={() => toggleSelectItem(purchase.id)} 
                             className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                         />
                     </td>
                    <td className="px-6 py-4 font-black text-indigo-600 font-mono">{purchase.id.toUpperCase()}</td>
                    <td className="px-6 py-4 font-bold">{new Date(purchase.date).toLocaleDateString('ar-EG')}</td>
                    <td className="px-6 py-4 font-medium">{purchase.supplier?.name || 'مورد محذوف'}</td>
                    <td className="px-6 py-4 text-center font-black">{formatCurrency(purchase.total, settings.currency)}</td>
                    <td className="px-6 py-4 text-center">{getStatusChip(purchase.status)}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center items-center gap-2">
                        <button onClick={() => {setSelectedPurchase(purchase); setIsReceiptModalOpen(true);}} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all"><Printer size={18} /></button>
                        <button onClick={() => navigate(`/purchases/new?edit=${purchase.id}`)} className="p-2 text-amber-500 hover:bg-amber-50 rounded-xl transition-all"><Edit size={18} /></button>
                        <button onClick={() => setConfirmDeleteId(purchase.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                 );
                })}
              </tbody>
            </table>
             {filteredPurchases.length === 0 && (
                <div className="text-center py-20 text-slate-400 font-bold">لم يتم تسجيل أي طلبات شراء تطابق البحث.</div>
            )}
          </div>
        )}
      </Card>
      <PurchaseReceiptModal isOpen={isReceiptModalOpen} onClose={() => setIsReceiptModalOpen(false)} purchase={selectedPurchase} />
      
      <ConfirmDialog 
          isOpen={!!confirmDeleteId} 
          onClose={() => setConfirmDeleteId(null)} 
          onConfirm={handleSingleDelete} 
          title="تأكيد الحذف النهائي" 
          message="هل أنت متأكد من حذف هذه الفاتورة؟ سيتم التأثير على المخزون بشكل عكسي وسيتم حذفه نهائياً من قاعدة البيانات."
      />
      <ConfirmDialog 
          isOpen={confirmBulkDelete} 
          onClose={() => setConfirmBulkDelete(false)} 
          onConfirm={handleBulkDelete} 
          title="تأكيد الحذف الجماعي" 
          message={`هل أنت متأكد من حذف ${selectedItems.length} فاتورة نهائياً؟ سيتم التأثير على المخزون بشكل عكسي وسيتم حذفه نهائياً من قاعدة البيانات.`}
      />
    </div>
  );
};

export default PurchasesPage;
