import React, { useState, useEffect } from 'react';
import { getAllLicenses, LicenseInfo, renewLicense } from '../services/licenseService';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { ShieldAlert, Calendar, User, Search, RefreshCw, ArrowLeft, Smartphone, PlayCircle } from 'lucide-react';
import { toArabicIndic } from '../utils/localization';
import { useNavigate } from 'react-router-dom';
import { useToasts } from '../hooks/useToasts';

const AdminExpiredLicensesPage: React.FC = () => {
    const navigate = useNavigate();
    const { addToast } = useToasts();
    const [expiredLicenses, setExpiredLicenses] = useState<LicenseInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const all = await getAllLicenses();
            const now = new Date();
            const expired = all.filter(lic => 
                lic.status === 'active' && 
                lic.expiresAt && 
                new Date(lic.expiresAt) < now
            );
            setExpiredLicenses(expired);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const filtered = expiredLicenses.filter(lic => 
        lic.licenseKey.toLowerCase().includes(search.toLowerCase()) ||
        lic.deviceId?.toLowerCase().includes(search.toLowerCase())
    );

    const handleRenew = async (key: string) => {
        if (!window.confirm('هل أنت متأكد من تجديد التخخيص وبدء فترة جديدة كلياً؟')) return;
        setLoading(true);
        try {
            await renewLicense(key);
            addToast('تم تجديد الترخيص بنجاح وتحديث تاريخ الانتهاء', 'success');
            await load();
        } catch (e: any) {
            addToast('فشل في تجديد الترخيص: ' + e.message, 'error');
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 dir-rtl pb-10 animate-fadeIn">
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl border shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => navigate('/admin-tool')} className="rounded-full w-10 h-10 p-0 text-slate-400">
                        <ArrowLeft />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 flex items-center gap-2">
                            <ShieldAlert className="text-rose-600" />
                            التراخيص المنتهية
                        </h1>
                        <p className="text-slate-500 font-bold">عرض وإدارة الحسابات التي انتهت فترة صلاحيتها</p>
                    </div>
                </div>
                <div className="flex gap-2">
                   <Button onClick={load} variant="outline" className="rounded-2xl h-12 w-12 p-0"><RefreshCw size={20} className={loading ? 'animate-spin' : ''} /></Button>
                </div>
            </div>

            <Card className="p-4 border-none shadow-sm bg-white">
                <div className="relative">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text"
                        placeholder="البحث برقم المفتاح أو معرف الجهاز..."
                        className="w-full bg-slate-50 border-none rounded-2xl pr-12 pl-4 py-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(lic => (
                    <Card key={lic.licenseKey} className="p-6 border-none shadow-premium bg-white group hover:scale-[1.02] transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                                <Calendar size={24} />
                            </div>
                            <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-[10px] font-black uppercase">منتهي الصلاحية</span>
                        </div>
                        
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 block uppercase">مفتاح الترخيص</label>
                                <p className="font-mono font-bold text-lg text-slate-800">{lic.licenseKey}</p>
                            </div>

                            <div className="flex justify-between gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 block uppercase">تاريخ الانتهاء</label>
                                    <p className="font-bold text-rose-600">{lic.expiresAt ? new Date(lic.expiresAt).toLocaleDateString('ar-EG') : 'غير محدد'}</p>
                                </div>
                                <div className="text-end">
                                    <label className="text-[10px] font-black text-slate-400 block uppercase">نوع الخطة</label>
                                    <p className="font-bold text-slate-800">{lic.type}</p>
                                </div>
                            </div>

                            <div className="pt-3 border-t flex items-center gap-2 text-xs font-bold text-slate-500">
                                <Smartphone size={14} />
                                <span className="truncate">{lic.deviceId || 'لم يتم التفعيل بعد'}</span>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                            <Button className="flex-1 bg-slate-800 hover:bg-slate-900 rounded-xl h-10 font-bold text-xs" onClick={() => navigate(`/admin-tool/licenses`)}>
                                إيقاف / إعادة تفعيل
                            </Button>
                            <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 font-bold text-xs flex items-center justify-center gap-1" onClick={() => handleRenew(lic.licenseKey)}>
                                <PlayCircle size={14} /> اعادة تجديد
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>

            {filtered.length === 0 && !loading && (
                <div className="text-center py-20">
                    <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShieldAlert size={40} />
                    </div>
                    <h3 className="text-xl font-black text-slate-800">لا يوجد تراخيص منتهية</h3>
                    <p className="text-slate-500 font-bold">جميع التراخيص المفعلة لا زالت ضمن فترة الصلاحية</p>
                </div>
            )}
        </div>
    );
};

export default AdminExpiredLicensesPage;
