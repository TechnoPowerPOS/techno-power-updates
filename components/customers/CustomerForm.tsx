
import React, { useState, useEffect } from 'react';
import type { Customer, CustomerTier, User } from '../../types';
import Button from '../ui/Button';
import { AlertCircle, CreditCard, User as UserIcon } from 'lucide-react';
import { api } from '../../services/mockApi';

interface CustomerFormProps {
  customer: Customer | null;
  onSave: (customer: Omit<Customer, 'id' | 'debt' | 'points'> & { id?: string }) => void;
  onCancel: () => void;
  isLoading: boolean;
  error?: string;
}

const CustomerForm: React.FC<CustomerFormProps> = ({ customer, onSave, onCancel, isLoading, error }) => {
  const [users, setUsers] = useState<User[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    tier: 'Regular' as CustomerTier,
    creditLimit: 0,
    userId: ''
  });

  useEffect(() => {
     api.getUsers().then(setUsers);
  }, []);

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        tier: customer.tier || 'Regular',
        creditLimit: customer.creditLimit || 0,
        userId: customer.userId || ''
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        tier: 'Regular',
        creditLimit: 0,
        userId: ''
      });
    }
  }, [customer]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : parseFloat(value) || 0) : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, id: customer?.id });
  };
  
  const inputStyle = "mt-1 block w-full rounded-xl border-slate-300 shadow-sm focus:border-indigo-600 focus:ring-indigo-600 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white p-2.5 border transition-all";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 flex items-center gap-2" role="alert">
            <AlertCircle size={20} />
            <span className="font-medium">خطأ!</span> {error}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-black text-slate-700 dark:text-slate-200">اسم العميل</label>
          <input type="text" name="name" value={formData.name || ''} onChange={handleChange} required className={inputStyle} />
        </div>
        <div>
          <label className="block text-sm font-black text-slate-700 dark:text-slate-200">تصنيف العميل</label>
          <select name="tier" value={formData.tier || 'Regular'} onChange={handleChange} className={inputStyle}>
            <option value="Regular">عادي</option>
            <option value="Wholesale">جملة</option>
            <option value="Retail">قطاعي</option>
            <option value="VIP">VIP</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-black text-slate-700 dark:text-slate-200">الهاتف</label>
            <input type="tel" name="phone" value={formData.phone || ''} onChange={handleChange} required className={inputStyle} />
          </div>
          <div>
            <label className="block text-sm font-black text-slate-700 dark:text-slate-200 flex items-center gap-1">
                <CreditCard size={14} className="text-indigo-600" /> حد الائتمان (مسموح بالدين حتى)
            </label>
            <input type="number" name="creditLimit" value={formData.creditLimit ?? 0} onChange={handleChange} className={inputStyle} />
          </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
             <label className="block text-sm font-black text-slate-700 dark:text-slate-200 flex items-center gap-1">
                 <UserIcon size={14} className="text-indigo-600"/> مرتبط بالموظف
             </label>
             <select name="userId" value={formData.userId || ''} onChange={handleChange} className={inputStyle}>
                 <option value="">بدون ارتباط</option>
                 {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role?.name})</option>)}
             </select>
          </div>
          {!customer && (
              <div>
                <label className="block text-sm font-black text-slate-700 dark:text-slate-200 flex items-center gap-1 text-rose-600">
                    <CreditCard size={14} /> رصيد افتتاحي (عليه / مدين)
                </label>
                <input type="number" name="debt" value={(formData as any).debt ?? 0} onChange={handleChange} className={inputStyle} placeholder="إذا كان على العميل مبلغ مستحق مسبقاً" />
              </div>
          )}
      </div>

      <div>
        <label className="block text-sm font-black text-slate-700 dark:text-slate-200">العنوان</label>
        <textarea name="address" value={formData.address || ''} onChange={handleChange} rows={2} className={inputStyle} />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} className="rounded-xl">إلغاء</Button>
        <Button type="submit" isLoading={isLoading} className="rounded-xl px-8">{customer ? 'حفظ التعديلات' : 'إضافة العميل'}</Button>
      </div>
    </form>
  );
};

export default CustomerForm;
