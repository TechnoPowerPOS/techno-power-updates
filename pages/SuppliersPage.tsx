
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Supplier, Purchase } from '../types';
import { api } from '../services/mockApi';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import SupplierForm from '../components/suppliers/SupplierForm';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { PlusCircle, Edit, Trash2, Download, FileText, ClipboardList, Wallet, ShoppingCart, Scale, Users, TrendingUp, TrendingDown, Landmark, DollarSign } from 'lucide-react';
import { exportToCsv } from '../utils/export';
import { usePlan } from '../hooks/usePlan';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency, toArabicIndic } from '../utils/localization';
import TableSkeleton from '../components/ui/TableSkeleton';
import { useToasts } from '../hooks/useToasts';

const StatCard: React.FC<{ 
    title: string; 
    value: string; 
    icon: React.ReactNode, 
    color: 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate' | 'blue',
    delay: number 
  }> = ({ title, value, icon, color, delay }) => {
    const colorClasses = {
        indigo: 'from-indigo-500/20 to-indigo-600/5 text-indigo-600 bg-indigo-500 dark:bg-indigo-600',
        emerald: 'from-emerald-500/20 to-emerald-600/5 text-emerald-600 bg-emerald-500 dark:bg-emerald-600',
        amber: 'from-amber-500/20 to-amber-600/5 text-amber-600 bg-amber-500 dark:bg-amber-600',
        rose: 'from-rose-500/20 to-rose-600/5 text-rose-600 bg-rose-500 dark:bg-rose-600',
        slate: 'from-slate-500/20 to-slate-600/5 text-slate-600 bg-slate-500 dark:bg-slate-600',
        blue: 'from-blue-500/20 to-blue-600/5 text-blue-600 bg-blue-500 dark:bg-blue-600'
    };

    return (
        <Card className={`group relative p-0 overflow-hidden animate-slide-up border-none shadow-xl hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-500 rounded-[2rem] bg-white dark:bg-slate-900`} style={{ animationDelay: `${delay}ms`}}>
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colorClasses[color].split(' ')[0]} rounded-full blur-3xl opacity-40 -translate-y-1/2 translate-x-1/2 transition-all duration-700 group-hover:scale-150`}></div>
            <div className="p-6 flex flex-col h-full relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-white dark:bg-slate-800 shadow-lg border border-slate-100 dark:border-slate-700/50 ${colorClasses[color].split(' ')[1]} transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110`}>
                        {icon}
                    </div>
                </div>
                <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{title}</p>
                <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{value}</h3>
            </div>
        </Card>
    );
};

const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const { limits } = usePlan();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [statementSupplier, setStatementSupplier] = useState<Supplier | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  // Statement Data
  const [statementData, setStatementData] = useState<any[]>([]);
  const [statementLoading, setStatementLoading] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [confirmDeleteOne, setConfirmDeleteOne] = useState<Supplier | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { settings } = useSettings();
  const { addToast } = useToasts();

  const stats = useMemo(() => {
     let totalCount = suppliers.length;
     let creditorsCount = 0; // we owe them (s.debt > 0)
     let debtorsCount = 0;   // they owe us (s.debt < 0)
     let totalDues = 0;      // sum of positive debt
     let totalDebts = 0;     // sum of negative debt (absolute)

     suppliers.forEach(s => {
         const d = Number(s.debt || 0);
         if (d > 0) {
             creditorsCount++;
             totalDues += d;
         } else if (d < 0) {
             debtorsCount++;
             totalDebts += Math.abs(d);
         }
     });

     return {
         totalCount,
         creditorsCount,
         debtorsCount,
         totalDues,
         totalDebts
     };
  }, [suppliers]);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    const [s, p] = await Promise.all([api.getSuppliers(), api.getPurchases()]);
    setSuppliers(s); setPurchases(p);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  useEffect(() => {
     if (statementSupplier) {
         fetchStatement(statementSupplier.id);
     } else {
         setStatementData([]);
     }
  }, [statementSupplier]);

  const fetchStatement = async (supplierId: string) => {
      setStatementLoading(true);
      try {
          const trans = await api.getSupplierTransactions();
          const pchs = await api.getPurchases();
          const setts = await api.getSettlements();

          const combined = [];
          
          // Purchases
          pchs.filter((p:any) => p.supplier.id === supplierId).forEach((p:any) => {
              combined.push({
                  id: p.id,
                  date: new Date(p.date),
                  typeLabel: 'فاتورة مشتريات',
                  icon: <ShoppingCart size={16} className="text-amber-500"/>,
                  amountAdd: p.total,
                  amountSub: p.amountPaid,
                  balanceImpact: p.total - p.amountPaid,
                  notes: 'عملية شراء بضاعة'
              });
          });

          // Transactions
          trans.filter((t:any) => t.supplierId === supplierId).forEach((t:any) => {
              combined.push({
                  id: t.id,
                  date: new Date(t.date),
                  typeLabel: t.type === 'Payment' ? 'دفعة سداد (نقدي/سند)' : 'مستحقات على المؤسسة (دين)',
                  icon: <Wallet size={16} className={t.type === 'Payment' ? "text-emerald-500" : "text-rose-500"}/>,
                  amountAdd: t.type === 'Debt' ? t.amount : 0,
                  amountSub: t.type === 'Payment' || t.type.toLowerCase() === 'payment' ? t.amount : 0,
                  balanceImpact: t.type === 'Debt' ? t.amount : -t.amount,
                  notes: t.description || 'حركة مالية'
              });
          });

          // Settlements
          setts.filter((s:any) => s.beneficiaryType === 'Supplier' && s.beneficiaryId === supplierId).forEach((s:any) => {
              combined.push({
                  id: s.id,
                  date: new Date(s.date),
                  typeLabel: 'تسوية مالية مجمعة',
                  icon: <Scale size={16} className="text-indigo-500"/>,
                  amountAdd: s.direction === 'in' ? s.amount : 0,
                  amountSub: s.direction === 'out' ? s.amount : 0,
                  balanceImpact: s.direction === 'in' ? s.amount : -s.amount,
                  notes: s.type || 'تسوية'
              });
          });

          // Sort by date old to new
          combined.sort((a,b) => a.date.getTime() - b.date.getTime());
          
          // Calculate running balance
          let currentBalance = 0;
          combined.forEach(item => {
              currentBalance += item.balanceImpact;
              item.runningBalance = currentBalance;
          });

          // Reverse back to new to old for display
          setStatementData(combined.reverse());

      } catch (e) {
          addToast('خطأ في تحميل كشف الحساب', 'error');
      } finally {
          setStatementLoading(false);
      }
  };

  const handleBulkDelete = async () => {
      if (selectedItems.length === 0) return;
      setConfirmBulkDelete(true);
  };

  const confirmHandleBulkDelete = async () => {
      setConfirmBulkDelete(false);
      setIsSaving(true);
      try {
          for (const id of selectedItems) {
              await api.deleteSupplier(id);
          }
          await fetchSuppliers();
          setSelectedItems([]);
          addToast(`تم حذف ${selectedItems.length} مورد بنجاح`, 'success');
      } catch (e) {
          addToast('فشل في حذف بعض الموردين', 'error');
      } finally {
          setIsSaving(false);
      }
  };

  const confirmHandleDeleteOne = async () => {
      if (!confirmDeleteOne) return;
      const s = confirmDeleteOne;
      setConfirmDeleteOne(null);
      await api.deleteSupplier(s.id);
      fetchSuppliers();
      addToast('تم حذف المورد بنجاح', 'success');
  };

  const toggleSelectItem = (id: string) => {
      setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
      if (selectedItems.length === suppliers.length) {
          setSelectedItems([]);
      } else {
          setSelectedItems(suppliers.map(p => p.id));
      }
  };

  const filteredSuppliers = useMemo(() => {
    if (!searchTerm.trim()) return suppliers;
    const lower = searchTerm.toLowerCase();
    return suppliers.filter(s => s.name.toLowerCase().includes(lower) || s.phone.includes(lower));
  }, [suppliers, searchTerm]);

  const handleOpenAddModal = () => {
    if (suppliers.length >= limits.maxSuppliers) {
        addToast(`عذراً، لقد وصلت للحد الأقصى للموردين في خطتك الحالية (${limits.maxSuppliers} مورد). يرجى الترقية لباقة أعلى.`, 'error');
        return;
    }
    setEditingSupplier(null);
    setIsModalOpen(true);
  };

  return (
    <div className="animate-fadeIn">
      <div className="flex justify-between items-center mb-6 border-slate-200 dark:border-slate-800 pb-4 border-b">
        <h1 className="text-3xl font-black text-slate-800 dark:text-white">الموردين</h1>
        <div className="flex gap-2 items-center flex-wrap">
            <input 
                type="text" 
                placeholder="بحث..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-300 w-48 focus:w-64 transition-all"
            />
            {selectedItems.length > 0 && (
                <button 
                    onClick={handleBulkDelete}
                    disabled={isSaving}
                    className="h-10 px-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl transition-all flex items-center gap-2 shadow-sm font-bold text-xs hover:bg-rose-100"
                >
                    <Trash2 size={16} /> حذف المحدد ({selectedItems.length})
                </button>
            )}
            <Button onClick={handleOpenAddModal} className="rounded-xl"><PlusCircle size={20} /> إضافة مورد</Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
          <StatCard 
              title="إجمالي الموردين"
              value={toArabicIndic(stats.totalCount)}
              icon={<Users size={24} />}
              color="indigo"
              delay={100}
          />
          <StatCard 
              title="دائنون (لنا مبالغ)"
              value={toArabicIndic(stats.creditorsCount)}
              icon={<TrendingUp size={24} />}
              color="amber"
              delay={200}
          />
          <StatCard 
              title="مدينون (عليها)"
              value={toArabicIndic(stats.debtorsCount)}
              icon={<TrendingDown size={24} />}
              color="rose"
              delay={300}
          />
          <StatCard 
              title="إجمالي المستحقات"
              value={formatCurrency(stats.totalDues, settings?.currency || 'SAR')}
              icon={<Landmark size={24} />}
              color="emerald"
              delay={400}
          />
          <StatCard 
              title="إجمالي المديونيات"
              value={formatCurrency(stats.totalDebts, settings?.currency || 'SAR')}
              icon={<DollarSign size={24} />}
              color="blue"
              delay={500}
          />
      </div>

      <Card className="p-0 shadow-premium border-none">
        {loading ? <TableSkeleton cols={5} hasActions /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase">
                <tr>
                    <th className="px-6 py-4 w-10">
                        <input 
                            type="checkbox" 
                            checked={selectedItems.length === suppliers.length && suppliers.length > 0} 
                            onChange={toggleSelectAll} 
                            className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                        />
                    </th>
                    <th className="px-6 py-4">المورد / الشركة</th>
                    <th className="px-6 py-4">الهاتف</th>
                    <th className="px-6 py-4">مسؤول التواصل</th>
                    <th className="px-6 py-4 text-center">الرصيد المالي</th>
                    <th className="px-6 py-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800">
                 {filteredSuppliers.map((s) => {
                     const isSelected = selectedItems.includes(s.id);
                     return (
                   <tr key={s.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                     <td className="px-6 py-4 text-center">
                         <input 
                             type="checkbox" 
                             checked={isSelected} 
                             onChange={() => toggleSelectItem(s.id)} 
                             className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                         />
                     </td>
                     <td className="px-6 py-4">
                        <div className="font-bold text-slate-800 dark:text-white">{s.name}</div>
                        {s.companyName && (
                            <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-black bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-md">
                                {s.companyName}
                            </span>
                        )}
                     </td>
                    <td className="px-6 py-4 font-mono">{s.phone}</td>
                    <td className="px-6 py-4 font-medium">{s.contactPerson}</td>
                    <td className="px-6 py-4 text-center">
                        {s.debt > 0 ? (
                            <span className="inline-block px-3 py-1 bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 rounded-lg text-xs font-black">
                                + {formatCurrency(s.debt, settings?.currency)} (دائن/لها)
                            </span>
                        ) : s.debt < 0 ? (
                            <span className="inline-block px-3 py-1 bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 rounded-lg text-xs font-black">
                                - {formatCurrency(Math.abs(s.debt), settings?.currency)} (مدين/عليها)
                            </span>
                        ) : (
                            <span className="inline-block px-3 py-1 bg-slate-50 text-slate-500 dark:bg-slate-800/40 dark:text-slate-400 rounded-lg text-xs font-black">
                                {formatCurrency(0, settings?.currency)}
                            </span>
                        )}
                    </td>
                    <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                        <button onClick={() => setStatementSupplier(s)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg" title="كشف حساب"><ClipboardList size={18}/></button>
                        <button onClick={() => {setEditingSupplier(s); setIsModalOpen(true);}} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit size={18}/></button>
                        <button onClick={() => setConfirmDeleteOne(s)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 size={18}/></button>
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="بيانات المورد">
          <SupplierForm supplier={editingSupplier} onSave={async (d) => {
              if (!editingSupplier && suppliers.length >= limits.maxSuppliers) {
                  addToast(`لقد وصلت للحد الأقصى لعدد الموردين المسموح به في باقتك (${limits.maxSuppliers})`, 'error');
                  return;
              }
              setIsSaving(true); 
              await api.saveSupplier(d); 
              await fetchSuppliers(); 
              setIsModalOpen(false); 
              setIsSaving(false); 
              addToast('تم الحفظ', 'success'); 
          }} onCancel={() => setIsModalOpen(false)} isLoading={isSaving} />
      </Modal>

      <Modal isOpen={!!statementSupplier} onClose={() => setStatementSupplier(null)} title={`كشف حساب المورد: ${statementSupplier?.name}`}>
          <div className="space-y-4">
              <div className="flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
                  <div>
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">إجمالي المديونية الحالية</p>
                      <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{formatCurrency(statementSupplier?.debt || 0, settings?.currency)}</p>
                  </div>
              </div>
              
              <div className="overflow-x-auto rounded-xl border dark:border-slate-800 max-h-[60vh]">
                  {statementLoading ? (
                      <div className="p-8 text-center text-slate-500 font-bold">جاري تحميل السجلات...</div>
                  ) : (
                  <table className="w-full text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-900 font-black relative top-0 z-10 sticky shadow-sm">
                          <tr>
                              <th className="p-3 text-start whitespace-nowrap">العملية / التاريخ</th>
                              <th className="p-3 text-start">البيان</th>
                              <th className="p-3 text-end text-rose-600">مستحقات (دائن)</th>
                              <th className="p-3 text-end text-emerald-600">مدفوعات (مدين)</th>
                              <th className="p-3 text-end text-indigo-600">الرصيد التراكمي</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-slate-800">
                          {statementData.length === 0 ? (
                              <tr><td colSpan={5} className="p-8 text-center text-slate-400 font-bold">لا توجد حركات مسجلة لهذا المورد</td></tr>
                          ) : statementData.map((t, idx) => (
                              <tr key={`${t.id}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                  <td className="p-3">
                                      <div className="flex items-center gap-2">
                                          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">{t.icon}</div>
                                          <div>
                                              <p className="font-bold text-slate-700 dark:text-white line-clamp-1">{t.typeLabel}</p>
                                              <p className="text-[10px] font-mono text-slate-400 mt-0.5">{t.date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td className="p-3 max-w-[200px]">
                                      <p className="font-bold text-slate-600 dark:text-slate-300 truncate" title={t.notes}>{t.notes}</p>
                                      <p className="font-mono text-[9px] text-slate-400 opacity-70 mt-0.5">#{t.id}</p>
                                  </td>
                                  <td className="p-3 text-end font-black text-rose-600 bg-rose-50/30 dark:bg-rose-900/10">
                                      {t.amountAdd > 0 ? formatCurrency(t.amountAdd, settings?.currency) : '-'}
                                  </td>
                                  <td className="p-3 text-end font-black text-emerald-600 bg-emerald-50/30 dark:bg-emerald-900/10">
                                      {t.amountSub > 0 ? formatCurrency(t.amountSub, settings?.currency) : '-'}
                                  </td>
                                  <td className="p-3 text-end font-black text-indigo-600 bg-indigo-50/30 dark:bg-indigo-900/10">
                                      {formatCurrency(t.runningBalance, settings?.currency)}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
                  )}
              </div>
          </div>
      </Modal>

      <ConfirmDialog 
          isOpen={confirmBulkDelete} 
          onClose={() => setConfirmBulkDelete(false)} 
          onConfirm={confirmHandleBulkDelete} 
          title="حذف الموردين المحدد" 
          message="هل أنت متأكد من حذف الموردين المحددين؟ لا يمكن التراجع عن هذا الإجراء." 
      />
      <ConfirmDialog 
          isOpen={!!confirmDeleteOne} 
          onClose={() => setConfirmDeleteOne(null)} 
          onConfirm={confirmHandleDeleteOne} 
          title="حذف المورد" 
          message={`هل أنت متأكد من حذف المورد ${confirmDeleteOne?.name}؟`} 
      />

    </div>
  );
};

export default SuppliersPage;
