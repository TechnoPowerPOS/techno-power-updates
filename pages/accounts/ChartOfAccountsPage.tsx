
import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, updateDoc, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { handleFirestoreError, OperationType } from '../../services/firestoreErrorHandler';
import { useToasts } from '../../hooks/useToasts';
import { List, Plus, Search, ChevronRight, ChevronDown, FolderTree, FileText, Trash2, Edit3, Save, X } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/layout/PageHeader';

interface Account {
    id: string;
    code: string;
    nameAr: string;
    nameEn: string;
    type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
    parentId: string | null;
    balance: number;
}

const ChartOfAccountsPage: React.FC = () => {
    const { addToast } = useToasts();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [isAdding, setIsAdding] = useState(false);
    
    const [formData, setFormData] = useState<Partial<Account>>({
        code: '',
        nameAr: '',
        nameEn: '',
        type: 'Asset',
        parentId: null
    });

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'acc_chart'), orderBy('code', 'asc'));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
            
            if (data.length === 0) {
                // Seed basic accounts if empty
                await seedInitialAccounts();
                fetchAccounts();
            } else {
                setAccounts(data);
            }
        } catch (error) {
            handleFirestoreError(error, OperationType.GET, 'acc_chart');
        } finally {
            setLoading(false);
        }
    };

    const seedInitialAccounts = async () => {
        const initial = [
            { code: '1', nameAr: 'الأصول', nameEn: 'Assets', type: 'Asset', parentId: null, balance: 0 },
            { code: '2', nameAr: 'الخصوم', nameEn: 'Liabilities', type: 'Liability', parentId: null, balance: 0 },
            { code: '3', nameAr: 'حقوق الملكية', nameEn: 'Equity', type: 'Equity', parentId: null, balance: 0 },
            { code: '4', nameAr: 'الإيرادات', nameEn: 'Revenue', type: 'Revenue', parentId: null, balance: 0 },
            { code: '5', nameAr: 'المصروفات', nameEn: 'Expense', type: 'Expense', parentId: null, balance: 0 },
        ];
        for (const acc of initial) {
            await addDoc(collection(db, 'acc_chart'), acc);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, 'acc_chart'), {
                ...formData,
                balance: 0
            });
            fetchAccounts();
            setIsAdding(false);
            setFormData({ code: '', nameAr: '', nameEn: '', type: 'Asset', parentId: null });
            addToast('تم إضافة الحساب بنجاح', 'success');
        } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'acc_chart');
        }
    };

    const toggleExpand = (id: string) => {
        const next = new Set(expandedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedIds(next);
    };

    const renderAccountRow = (acc: Account, level: number = 0) => {
        const children = accounts.filter(child => child.parentId === acc.id);
        const isExpanded = expandedIds.has(acc.id);
        const hasChildren = children.length > 0;

        return (
            <React.Fragment key={acc.id}>
                <div 
                    className={`flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800 ${level === 0 ? 'bg-slate-50/50 dark:bg-slate-900/50' : ''}`}
                    style={{ paddingRight: `${level * 2 + 1}rem` }}
                >
                    <button 
                        onClick={() => toggleExpand(acc.id)}
                        className={`w-6 h-6 flex items-center justify-center rounded-lg transition-colors ${hasChildren ? 'text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30' : 'text-slate-300 pointer-events-none'}`}
                    >
                        {hasChildren ? (isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />) : <div className="w-1 h-1 bg-slate-300 rounded-full" />}
                    </button>
                    
                    <div className="flex-1 flex items-center gap-4">
                        <span className="font-mono text-xs font-black px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-slate-500">{acc.code}</span>
                        <span className="font-bold text-slate-800 dark:text-white">{acc.nameAr}</span>
                        <span className="text-xs text-slate-400 font-medium hidden md:inline">{acc.nameEn}</span>
                    </div>

                    <div className="flex items-center gap-8">
                        <div className="text-left w-32 hidden md:block">
                            <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${
                                acc.type === 'Asset' ? 'bg-emerald-100 text-emerald-700' :
                                acc.type === 'Liability' ? 'bg-rose-100 text-rose-700' :
                                acc.type === 'Expense' ? 'bg-amber-100 text-amber-700' :
                                'bg-blue-100 text-blue-700'
                            }`}>{acc.type}</span>
                        </div>
                        <div className="font-black text-sm w-32 text-left rtl:text-right">
                            {acc.balance.toLocaleString()} ر.س
                        </div>
                        <div className="flex gap-2">
                             <button onClick={() => {
                                 setFormData({ ...acc, parentId: acc.id, code: `${acc.code}.`, nameAr: '', nameEn: '' });
                                 setIsAdding(true);
                             }} className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl" title="إضافة حساب فرعي">
                                 <Plus size={16} />
                             </button>
                        </div>
                    </div>
                </div>
                {hasChildren && isExpanded && children.map(child => renderAccountRow(child, level + 1))}
            </React.Fragment>
        );
    };

    return (
        <div className="space-y-6">
            <PageHeader 
                title="دليل الحسابات (شجرة الحسابات)" 
                subtitle="تنظيم وهيكلة جميع الحسابات المالية للمنشأة لضمان دقة التقارير"
            />
            
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-200/50 flex items-center gap-4 flex-1">
                    <FolderTree className="text-amber-600 hidden md:block" />
                    <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                        يتم بناء شجرة الحسابات بشكل هرمي. الحسابات الرئيسية لا تقبل حركات مباشرة بل يظهر عليها مجموع حساباتها الفرعية.
                    </p>
                </div>
                <Button onClick={() => setIsAdding(!isAdding)} className="h-12 bg-indigo-600 px-8 rounded-2xl font-black">
                    <Plus className="me-2" size={18} />
                    إضافة حساب
                </Button>
            </div>

            {isAdding && (
                <Card className="p-8 border-2 border-indigo-600 animate-in slide-in-from-top">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-lg">إضافة حساب جديد</h3>
                        <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-rose-500"><X /></button>
                    </div>
                    <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500">رقم الحساب (Code)</label>
                            <input 
                                required
                                value={formData.code}
                                onChange={e => setFormData({...formData, code: e.target.value})}
                                placeholder="مثال: 1.1.01"
                                className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none font-mono font-bold"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500">اسم الحساب (عربي)</label>
                            <input 
                                required
                                value={formData.nameAr}
                                onChange={e => setFormData({...formData, nameAr: e.target.value})}
                                className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none font-bold"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500">طبيعة الحساب</label>
                            <select 
                                value={formData.type}
                                onChange={e => setFormData({...formData, type: e.target.value as any})}
                                className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none font-bold cursor-pointer"
                            >
                                <option value="Asset">أصول</option>
                                <option value="Liability">خصوم</option>
                                <option value="Equity">حقوق ملكية</option>
                                <option value="Revenue">إيرادات</option>
                                <option value="Expense">مصروفات</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <Button type="submit" className="w-full h-12 bg-indigo-600 rounded-xl font-black">حفظ الحساب</Button>
                        </div>
                    </form>
                </Card>
            )}

            <Card className="overflow-hidden border border-slate-100 dark:border-slate-800">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 flex items-center justify-between text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-4 pr-12">
                         <span>الحساب المالي</span>
                    </div>
                    <div className="flex items-center gap-12">
                        <span className="w-32 hidden md:block">النوع</span>
                        <span className="w-32 text-left rtl:text-right">الرصيد الحالي</span>
                        <div className="w-10"></div>
                    </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto custom-scrollbar">
                    {loading ? (
                        Array(5).fill(0).map((_, i) => <div key={i} className="h-16 animate-pulse bg-slate-50 dark:bg-slate-900/50"></div>)
                    ) : accounts.filter(a => !a.parentId).map(acc => renderAccountRow(acc))}
                </div>
            </Card>
        </div>
    );
};

export default ChartOfAccountsPage;
