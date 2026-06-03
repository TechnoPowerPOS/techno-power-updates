import React, { useState, useEffect } from 'react';
import { api } from '../../services/mockApi';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { PlusCircle, Edit, Trash2, Tag, CheckCircle2, XCircle } from 'lucide-react';
import { useToasts } from '../../hooks/useToasts';
import { toArabicIndic } from '../../utils/localization';

interface Offer {
    id: string;
    name: string;
    type: 'bundle' | 'seasonal' | 'storewide';
    discountType: 'percent' | 'amount';
    discountValue: number;
    isActive: boolean;
}

const OffersManagement: React.FC = () => {
    const [offers, setOffers] = useState<Offer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
    const { addToast } = useToasts();

    const fetchOffers = async () => {
        setIsLoading(true);
        try {
            const data = await api.getOffers();
            setOffers(data || []);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchOffers();
    }, []);

    const [formData, setFormData] = useState<Partial<Offer>>({
        name: '',
        type: 'seasonal',
        discountType: 'percent',
        discountValue: 0,
        isActive: true,
    });

    const handleOpenModal = (offer: Offer | null = null) => {
        if (offer) {
            setEditingOffer(offer);
            setFormData(offer);
        } else {
            setEditingOffer(null);
            setFormData({
                name: '',
                type: 'seasonal',
                discountType: 'percent',
                discountValue: 0,
                isActive: true,
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.saveOffer({ ...formData, id: editingOffer?.id });
            addToast('تم حفظ العرض بنجاح', 'success');
            fetchOffers();
            setIsModalOpen(false);
        } catch (err) {
            addToast('فشل حفظ العرض', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('هل أنت متأكد من حذف هذا العرض؟')) {
            try {
                await api.deleteOffer(id);
                addToast('تم حذف العرض', 'success');
                fetchOffers();
            } catch (err) {
                addToast('فشل حذف العرض', 'error');
            }
        }
    };

    const inputStyle = "mt-1 block w-full rounded-xl border-slate-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-slate-800 dark:text-white p-2.5 border transition-all";

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div>
                    <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2"><Tag size={20} className="text-indigo-600" /> إدارة العروض والخصومات</h3>
                    <p className="text-[10px] sm:text-xs text-slate-500 mt-1">إنشاء وإدارة العروض الترويجية والخصومات ليتم تطبيقها على المنتجات</p>
                </div>
                <Button onClick={() => handleOpenModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-4 h-10 rounded-xl shadow-lg shadow-indigo-500/20 gap-2"><PlusCircle size={18} /> عرض جديد</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-40 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse"></div>
                    ))
                ) : offers.length > 0 ? (
                    offers.map(offer => (
                        <div key={offer.id} className={`p-5 rounded-3xl border ${offer.isActive ? 'border-indigo-100 dark:border-indigo-900/50 bg-white dark:bg-slate-800/80 shadow-sm' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 opacity-70'} relative transition-shadow`}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="font-black text-slate-800 dark:text-white text-base">{offer.name}</h4>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 inline-block mt-1">
                                        {offer.type === 'seasonal' ? 'موسمي' : offer.type === 'bundle' ? 'كميات (Bundle)' : 'على مستوى المتجر'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => handleOpenModal(offer)} className="text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/40 p-1.5 rounded-lg transition-colors"><Edit size={16} /></button>
                                    <button onClick={() => handleDelete(offer.id)} className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/40 p-1.5 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 mb-5">
                                <span className={`font-black text-lg ${offer.discountType === 'percent' ? 'text-indigo-600' : 'text-emerald-600'}`}>
                                    {toArabicIndic(offer.discountValue)} {offer.discountType === 'percent' ? '%' : 'ر.س'}
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold">قيمة الخصم</span>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-700">
                                {offer.isActive ? (
                                    <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded uppercase tracking-wider"><CheckCircle2 size={12} /> نشط</span>
                                ) : (
                                    <span className="flex items-center gap-1 text-[10px] font-black text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded uppercase tracking-wider"><XCircle size={12} /> متوقف</span>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-16 text-center flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl bg-slate-50 dark:bg-[#0b1120]">
                        <div className="w-20 h-20 mb-4 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm">
                            <Tag size={32} className="text-slate-300 dark:text-slate-600" />
                        </div>
                        <h4 className="font-black text-slate-600 dark:text-slate-400 mb-1">لا يوجد أي عروض</h4>
                        <p className="text-xs text-slate-500 mb-6 max-w-sm">قم بإنشاء وتسويق عروض ترويجية للعملاء وسيتم تطبيقها تلقائياً على المنتجات في شاشة البيع.</p>
                        <Button onClick={() => handleOpenModal()} className="bg-white dark:bg-slate-800 text-indigo-600 border border-slate-200 dark:border-slate-700 shadow-sm hover:border-indigo-300 rounded-xl px-6 h-10 font-bold text-xs">إضافة عرض الآن</Button>
                    </div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingOffer ? "تعديل العرض" : "عرض جديد"}>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">اسم العرض</label>
                        <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className={inputStyle} placeholder="مثل: تخفيضات اليوم الوطني" />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">نوع العرض</label>
                        <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })} className={inputStyle}>
                            <option value="seasonal">موسمي (عرض عام)</option>
                            <option value="storewide">على مستوى المتجر كامل</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">نوع الخصم</label>
                            <select value={formData.discountType} onChange={e => setFormData({ ...formData, discountType: e.target.value as any })} className={inputStyle}>
                                <option value="percent">نسبة مئوية (%)</option>
                                <option value="amount">مبلغ ثابت</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">قيمة الخصم</label>
                            <input type="number" required min="0" step="0.01" value={formData.discountValue} onChange={e => setFormData({ ...formData, discountValue: parseFloat(e.target.value) || 0 })} className={inputStyle} />
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 mt-4">
                        <input type="checkbox" id="isActiveOffer" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} className="w-5 h-5 rounded text-indigo-600 cursor-pointer" />
                        <label htmlFor="isActiveOffer" className="text-sm font-black text-slate-700 dark:text-slate-300 cursor-pointer">تفعيل العرض حالياً</label>
                    </div>
                    <div className="flex justify-end gap-2 pt-6">
                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
                        <Button type="submit" className="bg-indigo-600 px-6 font-black h-11">حفظ العرض</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default OffersManagement;
