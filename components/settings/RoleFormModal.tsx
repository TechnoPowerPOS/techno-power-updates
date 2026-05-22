
import React, { useState, useEffect } from 'react';
import type { Role, PermissionKey, Permissions } from '../../types';
import Button from '../ui/Button';
import { PERMISSION_DEFINITIONS } from '../../permissions';
import { Shield, Info } from 'lucide-react';

interface RoleFormProps {
  role: Role | null;
  onSave: (data: Omit<Role, 'id'> & { id?: string }) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const RoleFormModal: React.FC<RoleFormProps> = ({ role, onSave, onCancel, isLoading }) => {
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState<Permissions>({});

  useEffect(() => {
    if (role) {
      setName(role.name);
      setPermissions(role.permissions);
    } else {
      setName('');
      setPermissions({});
    }
  }, [role]);

  const handlePermissionChange = (key: PermissionKey, checked: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [key]: checked,
    }));
  };

  const handleSelectAll = () => {
    const allPerms: Permissions = {};
    Object.keys(PERMISSION_DEFINITIONS).forEach(key => {
        allPerms[key as PermissionKey] = true;
    });
    setPermissions(allPerms);
  };

  const handleClearAll = () => {
    setPermissions({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ id: role?.id, name, permissions });
  };
  
  const inputStyle = "mt-1 block w-full rounded-xl border-slate-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-slate-800 dark:text-white p-3 border transition-all font-black";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fadeIn">
      <div>
        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ms-1">اسم الدور الوظيفي</label>
        <input 
            type="text" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            required 
            className={inputStyle} 
            placeholder="مثال: كاشير مسائي، مدير مخازن..." 
        />
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
            <h4 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Shield size={20} className="text-indigo-600" />
                صلاحيات الوصول المحددة
            </h4>
            <div className="flex gap-2">
                <button type="button" onClick={handleSelectAll} className="text-[10px] font-black text-indigo-600 hover:underline">تحديد الكل</button>
                <button type="button" onClick={handleClearAll} className="text-[10px] font-black text-rose-500 hover:underline">إلغاء الكل</button>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-3 border dark:border-slate-800 rounded-2xl p-4 max-h-[400px] overflow-y-auto bg-slate-50 dark:bg-slate-900/50 custom-scrollbar">
            {Object.entries(PERMISSION_DEFINITIONS).map(([key, { name, description }]) => (
                <label 
                    key={key} 
                    className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer group ${permissions[key as PermissionKey] ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-white dark:border-slate-800 bg-white dark:bg-slate-800 hover:border-slate-200'}`}
                >
                    <div className="pt-0.5">
                        <input
                            type="checkbox"
                            checked={permissions[key as PermissionKey] || false}
                            onChange={e => handlePermissionChange(key as PermissionKey, e.target.checked)}
                            className="h-5 w-5 text-indigo-600 border-slate-300 rounded-lg focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <p className={`font-black text-sm transition-colors ${permissions[key as PermissionKey] ? 'text-indigo-600' : 'text-slate-700 dark:text-slate-200'}`}>
                            {name}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed font-bold">
                            {description}
                        </p>
                    </div>
                </label>
            ))}
        </div>
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-400">
            <Info size={16} />
            <p className="text-[10px] font-bold">سيتم تحديث صلاحيات جميع الموظفين المرتبطين بهذا الدور فور ضغط زر الحفظ.</p>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t dark:border-slate-800">
        <Button type="button" variant="secondary" onClick={onCancel} className="rounded-xl px-6">إلغاء</Button>
        <Button type="submit" isLoading={isLoading} className="rounded-xl px-10 bg-indigo-600 font-black shadow-lg shadow-indigo-500/20">
            {role ? 'حفظ التعديلات' : 'إنشاء الدور'}
        </Button>
      </div>
    </form>
  );
};

export default RoleFormModal;
