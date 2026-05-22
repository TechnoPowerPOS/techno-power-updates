
import React, { useState, useEffect } from 'react';
import type { ShippingCompany } from '../../types';
import Button from '../ui/Button';

interface ShippingCompanyFormProps {
  company: ShippingCompany | null;
  onSave: (company: Omit<ShippingCompany, 'id'> & { id?: string }) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const ShippingCompanyForm: React.FC<ShippingCompanyFormProps> = ({ company, onSave, onCancel, isLoading }) => {
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    trackingUrl: '',
  });

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name,
        contactPerson: company.contactPerson,
        phone: company.phone,
        trackingUrl: company.trackingUrl || '',
      });
    } else {
        setFormData({
            name: '',
            contactPerson: '',
            phone: '',
            trackingUrl: '',
        });
    }
  }, [company]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, id: company?.id });
  };
  
  const inputStyle = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">اسم شركة الشحن</label>
        <input type="text" name="name" value={formData.name} onChange={handleChange} required className={inputStyle} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">مسؤول التواصل</label>
            <input type="text" name="contactPerson" value={formData.contactPerson} onChange={handleChange} required className={inputStyle} />
          </div>
          <div>
            <label className="block text-sm font-medium">الهاتف</label>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required className={inputStyle} />
          </div>
      </div>
      <div>
        <label className="block text-sm font-medium">رابط التتبع (اختياري)</label>
        <input type="url" name="trackingUrl" value={formData.trackingUrl} onChange={handleChange} className={inputStyle} placeholder="https://example.com/track?id=" />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>إلغاء</Button>
        <Button type="submit" isLoading={isLoading}>{company ? 'حفظ التعديلات' : 'إضافة الشركة'}</Button>
      </div>
    </form>
  );
};

export default ShippingCompanyForm;
