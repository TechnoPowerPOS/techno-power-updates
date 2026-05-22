import React, { useState } from 'react';
import { UserIdentity } from '../../types';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { User, Mail, Phone, Globe, UserPlus } from 'lucide-react';

interface RegistrationFormProps {
    onRegister: (data: Omit<UserIdentity, 'id' | 'registeredAt'>) => void;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ onRegister }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        country: 'مصر'
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.phone) return;
        onRegister(formData);
    };

    return (
        <div className="fixed inset-0 z-[60] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="max-w-md w-full p-8 space-y-6 dir-rtl animate-scaleIn shadow-2xl border-none">
                <div className="text-center space-y-2">
                    <div className="w-20 h-20 bg-indigo-100 rounded-3xl flex items-center justify-center mx-auto text-indigo-600">
                        <UserPlus size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800">مرحباً بك في تكنو باور</h2>
                    <p className="text-slate-500 font-bold">يرجى تسجيل بياناتك للبدء في استخدام البرنامج</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-black text-slate-400 flex items-center gap-1">
                            <User size={12} /> الاسم بالكامل
                        </label>
                        <input 
                            required
                            type="text" 
                            className="w-full bg-slate-50 border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                            placeholder="مثال: محمد الشبل"
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-black text-slate-400 flex items-center gap-1">
                            <Mail size={12} /> البريد الإلكتروني
                        </label>
                        <input 
                            required
                            type="email" 
                            className="w-full bg-slate-50 border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                            placeholder="user@example.com"
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs font-black text-slate-400 flex items-center gap-1">
                                <Phone size={12} /> رقم الهاتف
                            </label>
                            <input 
                                required
                                type="tel" 
                                className="w-full bg-slate-50 border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                                placeholder="01234567890"
                                value={formData.phone}
                                onChange={e => setFormData({...formData, phone: e.target.value})}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-black text-slate-400 flex items-center gap-1">
                                <Globe size={12} /> الدولة
                            </label>
                            <select 
                                className="w-full bg-slate-50 border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 font-black h-[50px]"
                                value={formData.country}
                                onChange={e => setFormData({...formData, country: e.target.value})}
                            >
                                <option>مصر</option>
                                <option>السعودية</option>
                                <option>الإمارات</option>
                                <option>الكويت</option>
                                <option>الأردن</option>
                                <option>ليبيا</option>
                                <option>أخرى</option>
                            </select>
                        </div>
                    </div>

                    <Button type="submit" className="w-full h-14 rounded-2xl font-black text-lg bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20">
                        تسجيل الدخول والبدء
                    </Button>
                </form>
            </Card>
        </div>
    );
};

export default RegistrationForm;
