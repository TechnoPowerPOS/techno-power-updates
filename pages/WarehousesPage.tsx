
import React, { useState, useEffect, useCallback } from 'react';
import type { Warehouse } from '../types';
import { api } from '../services/mockApi';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import WarehouseFormModal from '../components/warehouses/WarehouseFormModal';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useLicense } from '../hooks/useLicense';
import type { LicenseType } from '../types';
import TableSkeleton from '../components/ui/TableSkeleton';
import { useToasts } from '../hooks/useToasts';
import { toArabicIndic } from '../utils/localization';
import { getPlanLimits } from '../utils/planPermissions';

const WarehousesPage: React.FC = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { licenseInfo } = useLicense();
  const { addToast } = useToasts();
  const limits = getPlanLimits(licenseInfo.type);

  const fetchWarehouses = useCallback(async () => {
    setLoading(true);
    const data = await api.getWarehouses();
    setWarehouses(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  const currentLimit = limits.maxWarehouses; 
  const canAddWarehouse = warehouses.length < currentLimit;

  const handleOpenModal = (warehouse: Warehouse | null = null) => {
    if (!warehouse && !canAddWarehouse) {
      addToast(`لقد وصلت إلى الحد الأقصى لعدد المستودعات (${currentLimit}) في الخطة ${licenseInfo.type}.`, 'warning');
      return;
    }
    setEditingWarehouse(warehouse);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingWarehouse(null);
  };

  const handleSaveWarehouse = async (data: Omit<Warehouse, 'id'> & { id?: string }) => {
    setIsSaving(true);
    try {
      await api.saveWarehouse(data);
      await fetchWarehouses();
      addToast(data.id ? 'تم تعديل بيانات المستودع.' : 'تم إضافة مستودع جديد.', 'success');
      handleCloseModal();
    } catch (error) {
      addToast("فشل حفظ المستودع.", 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteWarehouse = (id: string) => {
    const warehouse = warehouses.find(w => w.id === id);
    if (warehouse?.isDefault) {
        addToast("لا يمكن حذف المستودع الافتراضي.", 'warning');
        return;
    }
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (confirmDeleteId) {
      try {
        await api.deleteWarehouse(confirmDeleteId);
        await fetchWarehouses();
        addToast('تم حذف المستودع بنجاح.', 'success');
      } catch (error) {
        addToast("فشل حذف المستودع.", 'error');
      } finally {
        setConfirmDeleteId(null);
      }
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-3xl font-black text-slate-800 dark:text-white">المستودعات</h1>
            <p className="text-sm text-slate-500 mt-1 font-bold">الحد المسموح: {toArabicIndic(warehouses.length)} / {toArabicIndic(currentLimit)} مستودع</p>
        </div>
        <Button 
          onClick={() => handleOpenModal()}
          disabled={!canAddWarehouse}
          className="rounded-2xl font-black"
        >
          <PlusCircle size={20} />
          إضافة مستودع
        </Button>
      </div>
      
      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 mb-8">
        <div className={`h-2 rounded-full transition-all duration-1000 ${warehouses.length >= currentLimit ? 'bg-rose-500' : 'bg-indigo-600'}`} style={{ width: `${Math.min((warehouses.length / currentLimit) * 100, 100)}%` }}></div>
      </div>

      <Card className="p-0 border-none shadow-premium">
        {loading ? <TableSkeleton cols={3} hasActions /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th scope="col" className="px-8 py-4">اسم المستودع</th>
                  <th scope="col" className="px-8 py-4">الموقع</th>
                  <th scope="col" className="px-8 py-4">الحالة</th>
                  <th scope="col" className="px-8 py-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800">
                {warehouses.map((warehouse, index) => (
                  <tr key={warehouse.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-8 py-4 font-bold">{warehouse.name}</td>
                    <td className="px-8 py-4 font-medium text-slate-500">{warehouse.location}</td>
                    <td className="px-8 py-4">
                      {warehouse.isDefault && <span className="px-3 py-1 text-[10px] font-black text-indigo-700 bg-indigo-100 rounded-full dark:bg-indigo-900/30 dark:text-indigo-400">افتراضي</span>}
                    </td>
                    <td className="px-8 py-4 text-center">
                      <div className="flex justify-center gap-x-2">
                        <button onClick={() => handleOpenModal(warehouse)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"><Edit size={18} /></button>
                        <button onClick={() => handleDeleteWarehouse(warehouse.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingWarehouse ? 'تعديل مستودع' : 'إضافة مستودع جديد'}>
        <WarehouseFormModal warehouse={editingWarehouse} onSave={handleSaveWarehouse} onCancel={handleCloseModal} isLoading={isSaving} />
      </Modal>
      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
        title="تأكيد حذف المستودع"
        message="هل أنت متأكد من حذف هذا المستودع؟"
      />
    </div>
  );
};

export default WarehousesPage;
