
import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, limit, addDoc, serverTimestamp } from '../../services/localFirestore';
import { db  } from '../../services/localFirestore';
import { handleFirestoreError, OperationType } from '../../services/firestoreErrorHandler';
import { useToasts } from '../../hooks/useToasts';
import { Landmark, Plus, Search, Filter, Home, Truck, Monitor, Database, Tag, Calendar, DollarSign } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/layout/PageHeader';

import Modal from '../../components/ui/Modal';

interface Asset {
    id: string;
    name: string;
    type: 'Real Estate' | 'Vehicle' | 'Equipments' | 'IT' | 'Office';
    value: number;
    purchaseDate: any;
    location: string;
    serial: string;
}

const AssetsPage: React.FC = () => {
    const { addToast } = useToasts();
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        type: 'Equipments' as const,
        value: '',
        location: '',
        serial: ''
    });

    useEffect(() => {
        fetchAssets();
    }, []);

    const fetchAssets = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'acc_assets'), orderBy('name', 'asc'), limit(50));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
            setAssets(data);
        } catch (error) {
            handleFirestoreError(error, OperationType.GET, 'acc_assets');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const assetData = {
                ...formData,
                value: Number(formData.value),
                purchaseDate: serverTimestamp(),
            };
            const docRef = await addDoc(collection(db, 'acc_assets'), assetData);
            setAssets(prev => [...prev, { id: docRef.id, ...assetData, purchaseDate: new Date() as any } as any]);
            setIsModalOpen(false);
            setFormData({ name: '', type: 'Equipments', value: '', location: '', serial: '' });
            addToast('تم إضافة الأصل بنجاح', 'success');
        } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'acc_assets');
        } finally {
            setSubmitting(false);
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'Real Estate': return <Home size={20} />;
            case 'Vehicle': return <Truck size={20} />;
            case 'IT': return <Monitor size={20} />;
            default: return <Database size={20} />;
        }
    };

    const totalValue = assets.reduce((sum, a) => sum + (Number(a.value) || 0), 0);

    return (
        <div className="space-y-6">
            <PageHeader title="إدارة الأصول والممتلكات" subtitle="تتبع وتسجيل الأصول الثابتة، قيمتها الدفترية، ومواقعها">
                 <Button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 rounded-2xl h-12 px-8 font-black shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">
                     <Plus size={18} className="me-2" /> إضافة أصل جديد
                 </Button>
            </PageHeader>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="إضافة أصل جديد">
                <form onSubmit={handleAdd} className="space-y-4 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 pr-2">اسم الأصل</label>
                            <input required value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 rounded-xl border-none outline-none font-bold focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 pr-2">النوع</label>
                            <select value={formData.type || 'Real Estate'} onChange={e => setFormData({...formData, type: e.target.value as any})} className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 rounded-xl border-none outline-none font-bold cursor-pointer focus:ring-2 focus:ring-indigo-500">
                                <option value="Real Estate">عقارات</option>
                                <option value="Vehicle">مركبات</option>
                                <option value="Equipments">معدات</option>
                                <option value="IT">تقنية معلومات</option>
                                <option value="Office">أثاث مكتبي</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 pr-2">القيمة الشرايئة</label>
                            <input type="number" required value={formData.value || ''} onChange={e => setFormData({...formData, value: parseFloat(e.target.value) || 0})} className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 rounded-xl border-none outline-none font-bold focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 pr-2">الموقع</label>
                            <input value={formData.location || ''} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 rounded-xl border-none outline-none font-bold focus:ring-2 focus:ring-indigo-500" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 pr-2">الرقم التسلسلي</label>
                        <input value={formData.serial || ''} onChange={e => setFormData({...formData, serial: e.target.value})} className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 rounded-xl border-none outline-none font-bold focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <Button type="submit" disabled={submitting} className="flex-1 h-12 bg-indigo-600 rounded-xl font-black shadow-lg shadow-indigo-500/20">
                            {submitting ? 'جاري الحفظ...' : 'حفظ الأصل'}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="h-12 px-8 rounded-xl font-black">إلغاء</Button>
                    </div>
                </form>
            </Modal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <Card className="p-6 border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600">
                             <Landmark size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase">إجمالي قيمة الأصول</p>
                            <p className="text-xl font-black">{totalValue.toLocaleString()} <span className="text-xs">ر.س</span></p>
                        </div>
                    </div>
                 </Card>
                 <Card className="p-6 border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600">
                             <Tag size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase">عدد الأصول المسجلة</p>
                            <p className="text-xl font-black">{assets.length}</p>
                        </div>
                    </div>
                 </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {loading ? (
                    Array(4).fill(0).map((_, i) => <div key={i} className="h-48 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-3xl"></div>)
                ) : assets.length > 0 ? (
                    assets.map(asset => (
                        <Card key={asset.id} className="p-6 hover:shadow-lg transition-all border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-indigo-600">
                                    {getTypeIcon(asset.type)}
                                </div>
                                <div className="overflow-hidden">
                                    <h3 className="font-black text-sm truncate">{asset.name}</h3>
                                    <p className="text-[10px] text-slate-400 font-bold">{asset.type}</p>
                                </div>
                            </div>
                            
                            <div className="space-y-2 pt-4 border-t border-slate-50 dark:border-slate-800">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-400 font-bold">القيمة:</span>
                                    <span className="font-black">{asset.value.toLocaleString()} ر.س</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-400 font-bold">الموقع:</span>
                                    <span className="font-bold">{asset.location || '--'}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-400 font-bold">التسلسل:</span>
                                    <span className="font-mono text-[10px]">{asset.serial || '--'}</span>
                                </div>
                            </div>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center opacity-30">
                        <Database size={64} className="mx-auto mb-4" />
                        <p className="font-black">لم يتم تسجيل أي أصول بعد</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AssetsPage;
