
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Customer, CustomerTier } from '../types';
import { api } from '../services/mockApi';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import CustomerForm from '../components/customers/CustomerForm';
import CustomerDetailsModal from '../components/customers/CustomerDetailsModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { PlusCircle, Edit, Search, FileText, Crown, Upload, Download, Trash2 } from 'lucide-react';
import { exportToCsv } from '../utils/export';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency, toArabicIndic } from '../utils/localization';
import TableSkeleton from '../components/ui/TableSkeleton';
import { useToasts } from '../hooks/useToasts';

const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showIncompleteData, setShowIncompleteData] = useState(false);
  const [detailsCustomer, setDetailsCustomer] = useState<Customer | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { settings } = useSettings();
  const { addToast } = useToasts();

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const data = await api.getCustomers();
    setCustomers(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const text = event.target?.result as string;
              const rows = text.split('\n').slice(1);
              for (const row of rows) {
                  const [name, phone, tier, limit] = row.split(',');
                  if (name && phone) await api.saveCustomer({ name: name.trim(), phone: phone.trim(), tier: (tier?.trim() || 'Regular') as any, creditLimit: parseFloat(limit) || 0 });
              }
              await fetchCustomers();
              addToast('تم استيراد العملاء بنجاح', 'success');
          } catch (e) { addToast('فشل الاستيراد', 'error'); }
      };
      reader.readAsText(file);
  };

  const filteredCustomers = useMemo(() => {
        return customers.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm);
            if (!matchesSearch) return false;
            if (showIncompleteData) {
                return !c.phone || c.phone.trim() === '' || !c.address || c.address.trim() === '';
            }
            return true;
        })
  }, [customers, searchTerm, showIncompleteData]);

  const handleBulkDelete = async () => {
      const customersWithDebt = selectedItems.map(id => customers.find(c => c.id === id)).filter(c => c && c.debt > 0);
      if (customersWithDebt.length > 0) {
          addToast(`لا يمكن حذف بعض العملاء المحددين لوجود مديونية مستحقة عليهم (${customersWithDebt.length} عميل).`, 'error');
          setConfirmBulkDelete(false);
          return;
      }

      setIsSaving(true);
      try {
          for (const id of selectedItems) {
              await api.deleteCustomer(id);
          }
          await fetchCustomers();
          setSelectedItems([]);
          addToast(`تم حذف ${selectedItems.length} عميل بنجاح`, 'success');
      } catch (e) {
          addToast('فشل في حذف بعض العملاء', 'error');
      } finally {
          setIsSaving(false);
          setConfirmBulkDelete(false);
      }
  };

  const handleSingleDelete = async () => {
        if (!confirmDeleteId) return;
        const customer = customers.find(c => c.id === confirmDeleteId);
        if (customer && customer.debt > 0) {
            addToast('لا يمكن حذف عميل لديه مديونية مستحقة. يرجى تصفية المديونية أولاً.', 'error');
            setConfirmDeleteId(null);
            return;
        }

        try {
            await api.deleteCustomer(confirmDeleteId);
            fetchCustomers();
            addToast('تم حذف العميل بنجاح', 'success');
        } catch (e) {
             addToast('فشل في حذف العميل', 'error');
        } finally {
             setConfirmDeleteId(null);
        }
  };

  const toggleSelectItem = (id: string) => {
      setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
      if (selectedItems.length === filteredCustomers.length) {
          setSelectedItems([]);
      } else {
          setSelectedItems(filteredCustomers.map(p => p.id));
      }
  };

  return (
    <div className="animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
           <h1 className="text-3xl font-black text-slate-800 dark:text-white mb-2">إدارة العملاء</h1>
           <div className="flex items-center gap-2">
                <input 
                    type="checkbox" 
                    id="showIncompleteDataCust" 
                    checked={showIncompleteData}
                    onChange={(e) => setShowIncompleteData(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="showIncompleteDataCust" className="text-sm font-bold text-slate-600 cursor-pointer">
                    عرض العملاء ذوي البيانات غير المكتملة فقط
                </label>
           </div>
        </div>
        <div className="flex gap-2 flex-wrap">
            <div className="relative">
                 <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                 <input
                     type="text"
                     placeholder="بحث..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="pl-4 pr-10 py-2 border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-600 w-full md:w-48 transition-all"
                 />
            </div>
            {selectedItems.length > 0 && (
                <button 
                    onClick={() => setConfirmBulkDelete(true)}
                    disabled={isSaving}
                    className="h-10 px-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl transition-all flex items-center gap-2 shadow-sm font-bold text-xs hover:bg-rose-100"
                >
                    <Trash2 size={16} /> حذف ({selectedItems.length})
                </button>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleImportCSV} />
            <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="rounded-xl h-10"><Upload size={18} /> استيراد CSV</Button>
            <Button onClick={() => { setEditingCustomer(null); setIsModalOpen(true); }} className="rounded-xl h-10"><PlusCircle size={18} /> إضافة عميل</Button>
        </div>
      </div>
      <Card className="p-0 border-none shadow-premium">
        {loading ? <TableSkeleton cols={4} hasActions /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase">
                <tr>
                    <th className="px-6 py-4 w-10">
                        <input 
                            type="checkbox" 
                            checked={selectedItems.length === filteredCustomers.length && filteredCustomers.length > 0} 
                            onChange={toggleSelectAll} 
                            className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                        />
                    </th>
                    <th className="px-6 py-4">العميل</th><th className="px-6 py-4">الهاتف</th><th className="px-6 py-4">المديونية</th><th className="px-6 py-4">حد الائتمان</th><th className="px-6 py-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800">
                 {filteredCustomers.map((c) => {
                     const isSelected = selectedItems.includes(c.id);
                     return (
                   <tr key={c.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                     <td className="px-6 py-4 text-center">
                         <input 
                             type="checkbox" 
                             checked={isSelected} 
                             onChange={() => toggleSelectItem(c.id)} 
                             className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                         />
                     </td>
                     <td className="px-6 py-4 font-bold">{c.name}</td>
                    <td className="px-6 py-4 font-mono">{c.phone}</td>
                    <td className={`px-6 py-4 font-black ${c.debt > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{formatCurrency(c.debt, settings?.currency || 'SAR')}</td>
                    <td className="px-6 py-4 font-bold text-slate-400">{c.creditLimit ? formatCurrency(c.creditLimit, settings?.currency || 'SAR') : '---'}</td>
                    <td className="px-6 py-4 text-center">
                       <div className="flex justify-center gap-2">
                        <button onClick={() => {setDetailsCustomer(c); setIsDetailsOpen(true);}} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg"><FileText size={18}/></button>
                        <button onClick={() => {setEditingCustomer(c); setIsModalOpen(true);}} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit size={18}/></button>
                        <button onClick={() => setConfirmDeleteId(c.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 size={18}/></button>
                      </div>
                    </td>
                  </tr>
                 );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="بيانات العميل"><CustomerForm customer={editingCustomer} onSave={async (d) => { setIsSaving(true); await api.saveCustomer(d); await fetchCustomers(); setIsModalOpen(false); setIsSaving(false); addToast('تم الحفظ', 'success'); }} onCancel={() => setIsModalOpen(false)} isLoading={isSaving}/></Modal>
      <CustomerDetailsModal isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} customer={detailsCustomer} />
      <ConfirmDialog 
          isOpen={!!confirmDeleteId} 
          onClose={() => setConfirmDeleteId(null)} 
          onConfirm={handleSingleDelete} 
          title="تأكيد حذف العميل" 
          message="هل أنت متأكد من حذف هذا العميل؟ لا يمكن التراجع عن هذا الإجراء."
      />
      <ConfirmDialog 
          isOpen={confirmBulkDelete} 
          onClose={() => setConfirmBulkDelete(false)} 
          onConfirm={handleBulkDelete} 
          title="تأكيد الحذف الجماعي" 
          message={`هل أنت متأكد من حذف ${selectedItems.length} عميل؟ لا يمكن التراجع عن هذا الإجراء وسيتم حذف সকল التعاملات المرتبطة.`}
      />
    </div>
  );
};

export default CustomersPage;
