
import React, { useState, useEffect, useRef } from 'react';
import type { User, Role } from '../../types';
import Button from '../ui/Button';
import { Upload, Trash2, User as UserIcon, Percent } from 'lucide-react';
import { processImageFile } from '../../utils/imageHelpers';
import { useLicense } from '../../hooks/useLicense';

interface UserFormProps {
  user: User | null;
  roles: Role[];
  onSave: (user: Omit<User, 'id' | 'permissions'> & { id?: string; password?: string }) => void;
  onCancel: () => void;
  isLoading: boolean;
  enableCommissions?: boolean;
}

const UserForm: React.FC<UserFormProps> = ({ user, roles, onSave, onCancel, isLoading, enableCommissions }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { licenseInfo } = useLicense();
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    roleId: '',
    avatarUrl: '',
    commissionRate: 0,
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        phone: user.phone || '',
        password: '', // Don't pre-fill password for security
        roleId: user.roleId,
        avatarUrl: user.avatarUrl || '',
        commissionRate: user.commissionRate || 0,
      });
    } else {
        setFormData({
            name: '',
            phone: '',
            password: '',
            roleId: roles[0]?.id || '',
            avatarUrl: '',
            commissionRate: 0,
        });
    }
  }, [user, roles]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          try {
              const base64 = await processImageFile(file, 200); // 200px max for avatars
              setFormData(prev => ({ ...prev, avatarUrl: base64 }));
          } catch (err) {
              alert('فشل معالجة الصورة');
          }
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user && !formData.password) {
        alert("كلمة المرور مطلوبة للمستخدمين الجدد.");
        return;
    }
    const { password, ...rest } = formData;
    const dataToSave: any = { ...rest, id: user?.id };
    if (password) {
        dataToSave.password = password;
    }
    
    onSave(dataToSave);
  };
  
  const inputStyle = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white";
  const isFreePlan = licenseInfo.type === 'Free';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Avatar Section */}
      <div className="flex flex-col items-center justify-center mb-6">
          <div className="relative w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden mb-2 group cursor-pointer bg-slate-50 dark:bg-slate-800" onClick={() => fileInputRef.current?.click()}>
              {formData.avatarUrl ? (
                  <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                  <UserIcon size={32} className="text-gray-400" />
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Upload size={20} className="text-white" />
              </div>
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
          {formData.avatarUrl && (
              <button type="button" onClick={() => setFormData(prev => ({...prev, avatarUrl: ''}))} className="text-red-500 text-xs flex items-center gap-1">
                  <Trash2 size={12} /> حذف الصورة
              </button>
          )}
      </div>

      <div>
        <label className="block text-sm font-medium">الاسم الكامل</label>
        <input type="text" name="name" value={formData.name} onChange={handleChange} required className={inputStyle} />
      </div>
      <div>
        <label className="block text-sm font-medium">رقم التواصل</label>
        <input type="text" name="phone" value={formData.phone} onChange={handleChange} className={inputStyle} placeholder="05xxxxxxxx" />
      </div>
       <div>
        <label className="block text-sm font-medium">كلمة المرور</label>
        <input type="password" name="password" value={formData.password} onChange={handleChange} required={!user} className={inputStyle} />
        {user && <p className="text-xs text-gray-500 mt-1">اترك هذا الحقل فارغًا للحفاظ على كلمة المرور الحالية.</p>}
      </div>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div>
            <label className="block text-sm font-medium">الدور</label>
            <select name="roleId" value={formData.roleId} onChange={handleChange} required className={inputStyle}>
                {roles.map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                ))}
            </select>
          </div>
          
          {enableCommissions && !isFreePlan && (
              <div>
                  <label className="block text-sm font-medium flex items-center gap-1">نسبة العمولة <Percent size={14} /></label>
                  <input type="number" step="0.1" min="0" max="100" name="commissionRate" value={formData.commissionRate} onChange={handleChange} className={inputStyle} placeholder="مثال: 5" />
              </div>
          )}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>إلغاء</Button>
        <Button type="submit" isLoading={isLoading}>{user ? 'حفظ التعديلات' : 'إضافة مستخدم'}</Button>
      </div>
    </form>
  );
};

export default UserForm;
