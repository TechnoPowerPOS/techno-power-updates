
import React, { useState, useEffect } from 'react';
import type { Warehouse } from '../../types';
import Button from '../ui/Button';

interface WarehouseFormProps {
  warehouse: Warehouse | null;
  onSave: (data: Omit<Warehouse, 'id'> & { id?: string }) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const WarehouseFormModal: React.FC<WarehouseFormProps> = ({ warehouse, onSave, onCancel, isLoading }) => {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    isDefault: false,
  });

  useEffect(() => {
    if (warehouse) {
      setFormData({
        name: warehouse.name,
        location: warehouse.location,
        isDefault: warehouse.isDefault,
      });
    } else {
      setFormData({ name: '', location: '', isDefault: false });
    }
  }, [warehouse]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, id: warehouse?.id });
  };

  const inputStyle = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">اسم المستودع</label>
        <input type="text" name="name" value={formData.name} onChange={handleChange} required className={inputStyle} />
      </div>
      <div>
        <label className="block text-sm font-medium">الموقع / العنوان</label>
        <input type="text" name="location" value={formData.location} onChange={handleChange} required className={inputStyle} />
      </div>
      <div className="flex items-center">
        <input id="isDefault" name="isDefault" type="checkbox" checked={formData.isDefault} onChange={handleChange} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
        <label htmlFor="isDefault" className="ms-2 block text-sm text-gray-900 dark:text-gray-300">
          تعيين كمستودع افتراضي
        </label>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>إلغاء</Button>
        <Button type="submit" isLoading={isLoading}>{warehouse ? 'حفظ التعديلات' : 'إضافة المستودع'}</Button>
      </div>
    </form>
  );
};

export default WarehouseFormModal;
