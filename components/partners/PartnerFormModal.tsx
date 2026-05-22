
import React, { useState, useEffect } from 'react';
import type { Partner } from '../../types';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { Building2, FileText, Phone, Mail, MapPin, Landmark, StickyNote } from 'lucide-react';

interface PartnerFormProps {
  isOpen: boolean;
  onClose: () => void;
  partner: Partner | null;
  onSave: (partner: any) => void;
  isLoading: boolean;
}

const PartnerFormModal: React.FC<PartnerFormProps> = ({ isOpen, onClose, partner, onSave, isLoading }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    companyName: '',
    taxNumber: '',
    commercialRecord: '',
    sharePercentage: 0,
    capitalInvested: 0,
    status: 'Active' as 'Active' | 'Inactive' | 'Suspended',
    joinedDate: new Date().toISOString().split('T')[0],
    profitShareConfig: {
      shareInSales: true,
      shareInExpenses: true
    },
    bankDetails: {
      bankName: '',
      accountName: '',
      accountNumber: '',
      iban: ''
    },
    notes: ''
  });

  const [activeTab, setActiveTab] = useState<'basic' | 'financial' | 'bank' | 'other'>('basic');

  useEffect(() => {
    if (partner) {
      setFormData({
        name: partner.name,
        phone: partner.phone,
        email: partner.email || '',
        address: partner.address || '',
        companyName: partner.companyName || '',
        taxNumber: partner.taxNumber || '',
        commercialRecord: partner.commercialRecord || '',
        sharePercentage: partner.sharePercentage,
        capitalInvested: partner.capitalInvested,
        profitShareConfig: partner.profitShareConfig || { shareInSales: true, shareInExpenses: true, shareInPurchases: false },
        status: partner.status || 'Active',
        joinedDate: partner.joinedDate.split('T')[0],
        bankDetails: partner.bankDetails || { bankName: '', accountName: '', accountNumber: '', iban: '' },
        notes: partner.notes || ''
      });
    } else {
        setFormData({
            name: '',
            phone: '',
            email: '',
            address: '',
            companyName: '',
            taxNumber: '',
            commercialRecord: '',
            sharePercentage: 0,
            capitalInvested: 0,
            profitShareConfig: { shareInSales: true, shareInExpenses: true, shareInPurchases: false },
            status: 'Active',
            joinedDate: new Date().toISOString().split('T')[0],
            bankDetails: { bankName: '', accountName: '', accountNumber: '', iban: '' },
            notes: ''
        });
    }
  }, [partner, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    if (name.startsWith('bank.')) {
        const bankField = name.split('.')[1];
        setFormData(prev => ({
            ...prev,
            bankDetails: { ...prev.bankDetails, [bankField]: value }
        }));
    } else if (name.startsWith('config.')) {
        const configField = name.split('.')[1];
        setFormData(prev => ({
            ...prev,
            profitShareConfig: { ...prev.profitShareConfig, [configField]: checked }
        }));
    } else {
        setFormData(prev => ({
            ...prev,
            [name]: (type === 'number' || type === 'number') ? parseFloat(value) || 0 : value
        }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, id: partner?.id, currentBalance: partner?.currentBalance || formData.capitalInvested });
  };
  
  const inputStyle = "w-full p-3 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-sm";
  const labelStyle = "text-[10px] font-black text-slate-400 uppercase mb-2 block";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={partner ? 'تعديل بيانات الشريك' : 'إضافة شريك جديد'} size="xl">
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex gap-2 overflow-x-auto pb-2 border-b dark:border-slate-800">
                <button type="button" onClick={() => setActiveTab('basic')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'basic' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>المعلومات الأساسية</button>
                <button type="button" onClick={() => setActiveTab('financial')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'financial' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>الماليات والنسب</button>
                <button type="button" onClick={() => setActiveTab('bank')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'bank' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>الحساب البنكي</button>
                <button type="button" onClick={() => setActiveTab('other')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'other' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>ملاحظات وحالة</button>
            </div>

            {activeTab === 'basic' && (
                <div className="space-y-4 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={labelStyle}>اسم الشريك <span className="text-rose-500">*</span></label>
                            <input type="text" name="name" value={formData.name} onChange={handleChange} required className={inputStyle} />
                        </div>
                        <div>
                            <label className={labelStyle}>الهاتف <span className="text-rose-500">*</span></label>
                            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required className={inputStyle} />
                        </div>
                        <div>
                            <label className={labelStyle}>البريد الإلكتروني</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} className={inputStyle} />
                        </div>
                        <div>
                            <label className={labelStyle}>العنوان / المقر</label>
                            <input type="text" name="address" value={formData.address} onChange={handleChange} className={inputStyle} />
                        </div>
                    </div>
                    
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-4 border border-slate-100 dark:border-slate-800">
                        <h4 className="text-xs font-black text-indigo-600 flex items-center gap-2"><Building2 size={16}/> بيانات الشركة (إن وجدت)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className={labelStyle}>اسم الشركة المؤسسة</label>
                                <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} className={inputStyle} />
                            </div>
                            <div>
                                <label className={labelStyle}>السجل التجاري</label>
                                <input type="text" name="commercialRecord" value={formData.commercialRecord} onChange={handleChange} className={inputStyle} />
                            </div>
                            <div>
                                <label className={labelStyle}>الرقم الضريبي</label>
                                <input type="text" name="taxNumber" value={formData.taxNumber} onChange={handleChange} className={inputStyle} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'financial' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                    <div>
                        <label className={labelStyle}>نسبة الشراكة (%) <span className="text-rose-500">*</span></label>
                        <input type="number" step="0.01" name="sharePercentage" value={formData.sharePercentage} onChange={handleChange} required className={inputStyle} />
                    </div>
                    <div>
                        <label className={labelStyle}>رأس المال الافتتاحي المستثمر <span className="text-rose-500">*</span></label>
                        <input type="number" step="0.01" name="capitalInvested" value={formData.capitalInvested} disabled={!!partner} onChange={handleChange} required className={`${inputStyle} ${partner ? 'opacity-50 cursor-not-allowed' : ''}`} />
                        {partner && <p className="text-[10px] text-slate-500 mt-1">لا يمكن تعديل رأس المال بعد الحفظ، يرجى استخدام المعاملات المالية.</p>}
                    </div>
                    <div>
                        <label className={labelStyle}>تاريخ الانضمام / بداية الشراكة</label>
                        <input type="date" name="joinedDate" value={formData.joinedDate} onChange={handleChange} required className={inputStyle} />
                    </div>
                    
                    <div className="md:col-span-2 mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                        <h4 className="text-xs font-black text-indigo-700 dark:text-indigo-400 mb-4">إعدادات حساب الأرباح والخسائر للشركة</h4>
                        <div className="space-y-3">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" name="config.shareInSales" checked={formData.profitShareConfig.shareInSales} onChange={handleChange} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" />
                                <div>
                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">يشارك في المبيعات</span>
                                    <p className="text-[10px] text-slate-500">سيتم حساب الأرباح بناءً على المبيعات والمرتجعات للمبيعات وتكلفة البضاعة المباعة.</p>
                                </div>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" name="config.shareInPurchases" checked={formData.profitShareConfig.shareInPurchases} onChange={handleChange} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" />
                                <div>
                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">يشارك في المشتريات المستقلة</span>
                                    <p className="text-[10px] text-slate-500">سيتم خصم قيمة فواتير المشتريات من أرباح الشريك كأصل مستقل.</p>
                                </div>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" name="config.shareInExpenses" checked={formData.profitShareConfig.shareInExpenses} onChange={handleChange} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" />
                                <div>
                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">يشارك في المصروفات وتكاليف التشغيل</span>
                                    <p className="text-[10px] text-slate-500">سيتم خصم نسبة من المصروفات المسجلة من أرباح هذا الشريك.</p>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'bank' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                    <div>
                        <label className={labelStyle}>اسم البنك</label>
                        <input type="text" name="bank.bankName" value={formData.bankDetails.bankName} onChange={handleChange} className={inputStyle} placeholder="مثل: البنك الأهلي" />
                    </div>
                    <div>
                        <label className={labelStyle}>اسم صاحب الحساب</label>
                        <input type="text" name="bank.accountName" value={formData.bankDetails.accountName} onChange={handleChange} className={inputStyle} />
                    </div>
                    <div>
                        <label className={labelStyle}>رقم الحساب</label>
                        <input type="text" name="bank.accountNumber" value={formData.bankDetails.accountNumber} onChange={handleChange} className={inputStyle} />
                    </div>
                    <div>
                        <label className={labelStyle}>الايبان (IBAN)</label>
                        <input type="text" name="bank.iban" value={formData.bankDetails.iban} onChange={handleChange} className={inputStyle} dir="ltr" />
                    </div>
                </div>
            )}

            {activeTab === 'other' && (
                <div className="space-y-4 animate-fadeIn">
                    <div>
                        <label className={labelStyle}>حالة الشريك</label>
                        <select name="status" value={formData.status} onChange={handleChange} className={inputStyle}>
                            <option value="Active">نشط / فعال</option>
                            <option value="Suspended">موقوف</option>
                            <option value="Inactive">منسحب / غير نشط</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelStyle}>ملاحظات ومعلومات إضافية</label>
                        <textarea name="notes" value={formData.notes} onChange={handleChange} rows={4} className={inputStyle} placeholder="أضف أي تفاصيل أخرى تخص الشراكة أو بنود الاتفاق..."></textarea>
                    </div>
                </div>
            )}

            <div className="flex justify-end gap-3 pt-6 border-t dark:border-slate-800">
                <Button type="button" variant="secondary" onClick={onClose} className="rounded-xl px-6">إلغاء</Button>
                <Button type="submit" isLoading={isLoading} className="rounded-xl px-8 font-black">{partner ? 'حفظ التعديلات' : 'إعتماد الشريك'}</Button>
            </div>
        </form>
    </Modal>
  );
};

export default PartnerFormModal;
