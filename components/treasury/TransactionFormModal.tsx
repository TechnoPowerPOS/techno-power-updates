
import React, { useState, useEffect } from 'react';
import type { Transaction, Treasury } from '../../types';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import Button from '../ui/Button';

interface TransactionFormProps {
  transaction: Transaction | null;
  onSave: (data: any) => void;
  onCancel: () => void;
  isLoading: boolean;
  treasuries: Treasury[];
}

const TransactionFormModal: React.FC<TransactionFormProps> = ({ transaction, onSave, onCancel, isLoading, treasuries }) => {
  const [formData, setFormData] = useState({
    type: 'withdrawal' as 'income' | 'withdrawal',
    category: '',
    amount: 0,
    description: '',
    treasuryId: '',
    fromAccountId: '',
    toAccountId: '',
  });

  const financialAccounts = treasuries.filter(t => t.type === 'bank');

  useEffect(() => {
    if (!transaction) {
        const defaultT = treasuries.find(t => t.isDefault) || treasuries[0];
        if (defaultT) setFormData(prev => ({ ...prev, treasuryId: defaultT.id }));
    } else {
      setFormData({
        type: transaction.type,
        category: transaction.category,
        amount: transaction.amount,
        description: transaction.description,
        treasuryId: transaction.treasuryId || '',
        fromAccountId: '',
        toAccountId: '',
      });
    }
  }, [transaction, treasuries]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(!formData.treasuryId) {
        alert('يجب تحديد الخزينة');
        return;
    }
    const submitData: any = { ...formData, id: transaction?.id };
    if (formData.type !== 'income') delete submitData.fromAccountId;
    if (formData.type !== 'withdrawal') delete submitData.toAccountId;
    onSave(submitData);
  };
  
  const inputStyle = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">نوع الحركة</label>
            <select name="type" value={formData.type} onChange={handleChange} required className={inputStyle}>
                <option value="withdrawal">سحب (مصروف من الخزينة)</option>
                <option value="income">إيداع (دخل للخزينة)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">الخزينة</label>
            <select name="treasuryId" value={formData.treasuryId} onChange={handleChange} required className={inputStyle}>
                <option value="" disabled>-- اختر --</option>
                {treasuries.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                ))}
            </select>
          </div>
          {formData.type === 'income' && !transaction && (
            <div className="md:col-span-2">
                <label className="block text-sm font-medium">سحب من حساب مالي؟ (اختياري)</label>
                <select name="fromAccountId" value={formData.fromAccountId} onChange={handleChange} className={inputStyle}>
                    <option value="">لا يوجد (إيداع كاش حر)</option>
                    {financialAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
            </div>
          )}
          {formData.type === 'withdrawal' && !transaction && (
            <div className="md:col-span-2">
                <label className="block text-sm font-medium">إيداع في حساب مالي؟ (اختياري)</label>
                <select name="toAccountId" value={formData.toAccountId} onChange={handleChange} className={inputStyle}>
                    <option value="">لا يوجد (سحب كاش حر)</option>
                    {financialAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
            </div>
          )}
      </div>
      <div>
        <label className="block text-sm font-medium">المبلغ</label>
        <input type="number" step="0.01" min="0.01" name="amount" value={formData.amount} onChange={handleChange} required className={inputStyle} />
      </div>
      <div>
        <label className="block text-sm font-medium">الفئة</label>
        <input type="text" name="category" value={formData.category} onChange={handleChange} required className={inputStyle} placeholder="مثل: فواتير، رواتب، إيجار..." />
      </div>
      <div>
        <label className="block text-sm font-medium">الوصف</label>
        <textarea name="description" value={formData.description} onChange={handleChange} rows={3} required className={inputStyle} />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>إلغاء</Button>
        <Button type="submit" isLoading={isLoading}>{transaction ? 'حفظ التعديلات' : 'تأكيد العملية'}</Button>
      </div>
    </form>
  );
};

export default TransactionFormModal;
