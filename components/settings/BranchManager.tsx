import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Store, Plus, Trash2, CheckCircle, RefreshCw } from 'lucide-react';
import { getBranches, addBranch, deleteBranch, getCurrentBranchId, setCurrentBranchId, Branch } from '../../services/branchService';
import { useToasts } from '../../hooks/useToasts';
import { useTranslation } from '../../hooks/useTranslation';

export const BranchManager: React.FC = () => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [currentBranchId, setLocalCurrentBranchId] = useState<string>('');
    const [newBranchName, setNewBranchName] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const { addToast } = useToasts();
    const { t } = useTranslation();

    useEffect(() => {
        loadBranches();
    }, []);

    const loadBranches = () => {
        setBranches(getBranches());
        setLocalCurrentBranchId(getCurrentBranchId());
    };

    const handleAddBranch = () => {
        if (!newBranchName.trim()) {
            addToast('الرجاء إدخال اسم الفرع', 'error');
            return;
        }
        
        try {
            addBranch(newBranchName);
            setNewBranchName('');
            loadBranches();
            addToast('تمت إضافة الفرع بنجاح', 'success');
        } catch (e: any) {
            addToast(e.message || 'حدث خطأ أثناء إضافة الفرع', 'error');
        }
    };

    const handleDelete = (id: string) => {
        if (branches.length <= 1) {
            addToast('لا يمكن حذف الفرع الوحيد', 'error');
            return;
        }
        setConfirmDeleteId(id);
    };

    const confirmDelete = () => {
        if (!confirmDeleteId) return;
        try {
            deleteBranch(confirmDeleteId);
            addToast('تم الحذف بنجاح!', 'success');
            setConfirmDeleteId(null);
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } catch (e: any) {
            addToast(e.message || 'حدث خطأ أثناء الحذف', 'error');
            setConfirmDeleteId(null);
        }
    };

    const handleSwitch = (id: string) => {
        if (id === currentBranchId) return;
        setCurrentBranchId(id);
        addToast('تم التبديل بنجاح! جاري التحديث...', 'success');
        setTimeout(() => {
            window.location.reload();
        }, 800);
    };

    return (
        <Card title="إدارة الفروع (فروع غير محدودة)">
            <div className="space-y-6">
                <div className="flex gap-4">
                    <input 
                        type="text" 
                        value={newBranchName}
                        onChange={(e) => setNewBranchName(e.target.value)}
                        placeholder="اسم الفرع الجديد..."
                        className="flex-grow p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 font-bold transition-all shadow-sm"
                    />
                    <Button onClick={handleAddBranch} className="rounded-2xl px-6 font-black bg-indigo-600 text-white">
                        <Plus size={20} className="me-2" /> إضافة فرع
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    {branches.map(branch => (
                        <div key={branch.id} className={`p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${branch.id === currentBranchId ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-3 rounded-2xl ${branch.id === currentBranchId ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                                        <Store size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-lg text-slate-800 dark:text-white">{branch.name}</h4>
                                        <p className="text-xs text-slate-500 font-bold mt-1">تاريخ الإنشاء: {new Date(branch.createdAt).toLocaleDateString('ar-EG')}</p>
                                    </div>
                                </div>
                                {branch.id === currentBranchId && (
                                    <span className="flex items-center text-xs font-black text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 rounded-full"><CheckCircle size={14} className="me-1"/> نشط الآن</span>
                                )}
                            </div>
                            
                            <div className="flex gap-2 justify-end mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                                {branch.id !== currentBranchId && (
                                    <Button variant="secondary" onClick={() => handleSwitch(branch.id)} className="h-9 px-4 rounded-xl text-xs font-black flex-grow">
                                        <RefreshCw size={14} className="me-2" /> تبديل إلى هذا الفرع
                                    </Button>
                                )}
                                {branches.length > 1 && (
                                    confirmDeleteId === branch.id ? (
                                        <div className="flex gap-2">
                                            <button onClick={confirmDelete} className="px-3 py-1 bg-rose-600 text-white rounded-xl text-[10px] font-black">تأكيد الحذف</button>
                                            <button onClick={() => setConfirmDeleteId(null)} className="px-3 py-1 bg-slate-100 rounded-xl text-[10px] font-black text-slate-500">إلغاء</button>
                                        </div>
                                    ) : (
                                        <button 
                                            type="button"
                                            onClick={() => handleDelete(branch.id)} 
                                            className="w-9 h-9 flex items-center justify-center text-rose-500 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-500 hover:text-white rounded-xl transition-colors"
                                            title="حذف الفرع"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/20 text-[11px] font-bold text-amber-700 dark:text-amber-400 leading-relaxed mt-4">
                    ملاحظة: البيانات (مثل المنتجات، المبيعات والمخزون) تكون منفصلة تماماً لكل فرع. يمكنك التبديل بين الفروع بسهولة.
                </div>
            </div>
        </Card>
    );
};
