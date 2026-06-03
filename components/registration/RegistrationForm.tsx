import React, { useState } from 'react';
import { UserIdentity } from '../../types';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { User, Mail, Phone, Globe, UserPlus, Award, Briefcase } from 'lucide-react';

interface RegistrationFormProps {
    onRegister: (data: Omit<UserIdentity, 'id' | 'registeredAt'>) => void;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ onRegister }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        country: 'مصر',
        requestedPlan: 'Free',
        businessType: 'محل ملابس'
    });
    
    const [customBusinessType, setCustomBusinessType] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.phone) return;
        
        const finalBusinessType = formData.businessType === 'اخري' && customBusinessType 
            ? customBusinessType 
            : formData.businessType;
            
        onRegister({
            ...formData,
            businessType: finalBusinessType
        });
    };

    return (
        <div className="fixed inset-0 z-[60] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <Card className="max-w-md w-full p-8 my-8 space-y-6 dir-rtl animate-scaleIn shadow-2xl border-none">
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

                    <div className="space-y-1">
                        <label className="text-xs font-black text-slate-400 flex items-center gap-1">
                            <Briefcase size={12} /> نوع النشاط
                        </label>
                        <select 
                            className="w-full bg-slate-50 border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 font-black h-[50px]"
                            value={formData.businessType}
                            onChange={e => setFormData({...formData, businessType: e.target.value})}
                            required
                        >
                            <option value="محل ملابس">محل ملابس</option>
                            <option value="محل مراتب">محل مراتب</option>
                            <option value="سوبر ماركت">سوبر ماركت</option>
                            <option value="محل العاب">محل ألعاب</option>
                            <option value="اخري">أخرى</option>
                        </select>
                    </div>

                    {formData.businessType === 'اخري' && (
                        <div className="space-y-1 animate-fadeIn">
                            <label className="text-xs font-black text-slate-400 flex items-center gap-1">
                                ادخل نوع النشاط
                            </label>
                            <input 
                                required
                                type="text" 
                                className="w-full bg-slate-50 border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                                placeholder="مثال: صيدلية، مطعم..."
                                value={customBusinessType}
                                onChange={e => setCustomBusinessType(e.target.value)}
                            />
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-xs font-black text-slate-400 flex items-center gap-1">
                            <Award size={12} /> نوع الترخيص / الباقة المطلوبة
                        </label>
                        <select 
                            className="w-full bg-slate-50 border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 font-black h-[50px]"
                            value={formData.requestedPlan}
                            onChange={e => setFormData({...formData, requestedPlan: e.target.value})}
                        >
                            <option value="Free">الباقة المجانية (Free)</option>
                            <option value="Basic">الباقة الأساسية سنوي (Basic Annual)</option>
                            <option value="Pro">الباقة الاحترافية سنوي (Professional Annual)</option>
                            <option value="Enterprise">باقة الأعمال سنوي (Business Annual)</option>
                        </select>
                    </div>

                    <Button type="submit" className="w-full h-14 rounded-2xl font-black text-lg bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20 mt-4">
                        تسجيل الدخول والبدء
                    </Button>
                </form>
            </Card>
        </div>
    );
};

export default RegistrationForm;
