
import React, { useState, useEffect } from 'react';
import type { Supplier, User } from '../../types';
import Button from '../ui/Button';
import { CreditCard, DollarSign, User as UserIcon } from 'lucide-react';
import { api } from '../../services/mockApi';

interface SupplierFormProps {
  supplier: Supplier | null;
  onSave: (supplier: Omit<Supplier, 'id' | 'debt'> & { id?: string, debt?: number }) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const SupplierForm: React.FC<SupplierFormProps> = ({ supplier, onSave, onCancel, isLoading }) => {
  const [users, setUsers] = useState<User[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    debt: 0,
    creditLimit: 0,
    userId: '',
    companyName: ''
  });

  useEffect(() => {
     api.getUsers().then(setUsers);
  }, []);

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name,
        contactPerson: supplier.contactPerson,
        phone: supplier.phone,
        email: supplier.email || '',
        address: supplier.address || '',
        debt: supplier.debt || 0,
        creditLimit: supplier.creditLimit || 0,
        userId: supplier.userId || '',
        companyName: supplier.companyName || ''
      });
    } else {
        setFormData({
            name: '',
            contactPerson: '',
            phone: '',
            email: '',
            address: '',
            debt: 0,
            creditLimit: 0,
            userId: '',
            companyName: ''
        });
    }
  }, [supplier]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, id: supplier?.id });
  };
  
  const inputStyle = "mt-1 block w-full rounded-xl border-slate-300 shadow-sm focus:border-indigo-600 focus:ring-indigo-600 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white p-2.5 border transition-all";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-black text-slate-700 dark:text-slate-200">اسم المورد</label>
          <input type="text" name="name" value={formData.name} onChange={handleChange} required className={inputStyle} />
        </div>
        <div>
          <label className="block text-sm font-black text-slate-700 dark:text-slate-200">الشركة التابعة لها <span className="text-red-500">*</span></label>
          <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} required className={inputStyle} placeholder="مثل: شركة التوريدات المحدودة" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-black text-slate-700 dark:text-slate-200">مسؤول التواصل</label>
          <input type="text" name="contactPerson" value={formData.contactPerson} onChange={handleChange} required className={inputStyle} />
        </div>
        <div>
          <label className="block text-sm font-black text-slate-700 dark:text-slate-200">الهاتف</label>
          <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required className={inputStyle} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-black text-slate-700 dark:text-slate-200 flex items-center gap-1">
                <CreditCard size={14} className="text-indigo-600" /> حد الائتمان (مسموح بالدين حتى)
            </label>
            <input type="number" name="creditLimit" value={formData.creditLimit} onChange={handleChange} className={inputStyle} />
          </div>
          <div>
             <label className="block text-sm font-black text-slate-700 dark:text-slate-200 flex items-center gap-1">
                 <UserIcon size={14} className="text-indigo-600"/> مرتبط بالموظف
             </label>
             <select name="userId" value={formData.userId} onChange={handleChange} className={inputStyle}>
                 <option value="">بدون ارتباط</option>
                 {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role?.name})</option>)}
             </select>
          </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {!supplier && (
              <div>
                <label className="block text-sm font-black text-slate-700 dark:text-slate-200 flex items-center gap-1 text-emerald-600">
                    <DollarSign size={14} /> رصيد افتتاحي (لها / مورد دائن)
                </label>
                <input type="number" name="debt" value={formData.debt} onChange={handleChange} className={inputStyle} placeholder="إذا كان للمورد مبلغ مستحق مسبقاً" />
              </div>
          )}
      </div>

      <div>
        <label className="block text-sm font-black text-slate-700 dark:text-slate-200">العنوان</label>
        <textarea name="address" value={formData.address} onChange={handleChange} rows={2} className={inputStyle} />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} className="rounded-xl">إلغاء</Button>
        <Button type="submit" isLoading={isLoading} className="rounded-xl px-8">{supplier ? 'حفظ التعديلات' : 'إضافة المورد'}</Button>
      </div>
    </form>
  );
};

export default SupplierForm;
