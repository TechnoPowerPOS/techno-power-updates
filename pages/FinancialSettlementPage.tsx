import React, { useState, useEffect, useCallback } from 'react';
import { 
    CheckCircle2, AlertCircle, Scale, ArrowLeftRight, TrendingUp,
    FileText, User, Calendar, DollarSign, Wallet, Edit2, History as HistoryIcon, Plus, Trash2, ArrowDownCircle, ArrowUpCircle, Search
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency, toArabicIndic } from '../utils/localization';
import { useToasts } from '../hooks/useToasts';
import { api } from '../services/mockApi';
import type { Partner, Employee, Customer, Supplier, Treasury, InstallmentPlan } from '../types';

interface SettlementRecord {
    id: string;
    beneficiaryName: string;
    beneficiaryId: string;
    beneficiaryType: string;
    treasuryId: string;
    treasuryName: string;
    type: string;
    amount: number;
    direction: 'in' | 'out';
    status: string;
    date: string;
}

const FinancialSettlementPage: React.FC = () => {
    const { settings } = useSettings();
    const { addToast } = useToasts();
    
    // Lists
    const [partners, setPartners] = useState<Partner[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [treasuries, setTreasuries] = useState<Treasury[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Form States
    const [beneficiaryType, setBeneficiaryType] = useState('Partner');
    const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState<string | null>(null);
    const [selectedTreasury, setSelectedTreasury] = useState<string | null>(null);
    const [settlementAmount, setSettlementAmount] = useState<number>(0);
    const [settlementType, setSettlementType] = useState('أرباح شركاء المساهمين');
    const [customType, setCustomType] = useState('');
    const [direction, setDirection] = useState<'out' | 'in'>('out');
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [pendingInstallments, setPendingInstallments] = useState<InstallmentPlan[]>([]);

    const fetchPendingInstallments = async (customerName: string) => {
        try {
            const allPlans = await api.getInstallmentPlans();
            const filtered = allPlans.filter(p => p.customerName === customerName && p.status === 'Active');
            setPendingInstallments(filtered);
        } catch (e) {
            console.error("Error fetching installments:", e);
        }
    };

    useEffect(() => {
        if (beneficiaryType === 'Customer' && selectedBeneficiaryId) {
            const customer = customers.find(c => c.id === selectedBeneficiaryId);
            if (customer) {
                fetchPendingInstallments(customer.name);
            }
        } else {
            setPendingInstallments([]);
        }
    }, [selectedBeneficiaryId, beneficiaryType, customers]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [pList, eList, cList, sList, tList, stList] = await Promise.all([
                api.getPartners(),
                api.getEmployees(),
                api.getCustomers(),
                api.getSuppliers(),
                api.getTreasuries(true),
                api.getSettlements()
            ]);

            setPartners(pList);
            setEmployees(eList);
            setCustomers(cList);
            setSuppliers(sList);
            setTreasuries(tList);
            setSettlements(stList);

            if (tList.length > 0 && !selectedTreasury) {
                const def = tList.find(t => t.isDefault) || tList[0];
                setSelectedTreasury(def.id);
            }
        } catch (err) {
            console.error("Fetch finance data failed", err);
            addToast('فشل في تحميل البيانات', 'error');
        } finally {
            setLoading(false);
        }
    }, [selectedTreasury, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getBeneficiariesList = () => {
        let list: any[] = [];
        if (beneficiaryType === 'Partner') list = partners;
        else if (beneficiaryType === 'Employee') list = employees;
        else if (beneficiaryType === 'Customer') list = customers;
        else if (beneficiaryType === 'Supplier') list = suppliers;
        
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            return list.filter(item => 
                item.name?.toLowerCase().includes(lowerSearch) || 
                item.phone?.includes(searchTerm) ||
                item.mobile?.includes(searchTerm)
            );
        }
        return list;
    };

    const getBeneficiaryDetails = () => {
        if (beneficiaryType === 'Partner') return partners.find(x => x.id === selectedBeneficiaryId);
        if (beneficiaryType === 'Employee') return employees.find(x => x.id === selectedBeneficiaryId);
        if (beneficiaryType === 'Customer') return customers.find(x => x.id === selectedBeneficiaryId);
        if (beneficiaryType === 'Supplier') return suppliers.find(x => x.id === selectedBeneficiaryId);
        return null;
    };

    const currentBeneficiary = getBeneficiaryDetails();
    
    const getBalance = () => {
        const b = currentBeneficiary;
        if (!b) return 0;
        if (beneficiaryType === 'Partner') return (b as Partner).currentBalance || 0;
        if (beneficiaryType === 'Employee') return (b as any).balance || 0;
        if (beneficiaryType === 'Supplier') return (b as any).debt || 0;
        if (beneficiaryType === 'Customer') return (b as any).debt || 0;
        return 0;
    };

    const handleSettlement = async () => {
        if (!selectedBeneficiaryId || !selectedTreasury || settlementAmount <= 0) {
            addToast('يرجى اختيار المستفيد والخزينة وإدخال مبلغ صحيح', 'error');
            return;
        }

        const treasury = treasuries.find(t => t.id === selectedTreasury);
        if (direction === 'out' && treasury && treasury.balance < settlementAmount) {
            addToast('رصيد الخزينة غير كافٍ للصرف', 'error');
            return;
        }

        setIsProcessing(true);
        try {
            const typeLabel = settlementType === 'أخرى' ? customType : settlementType;
            if (!typeLabel) { addToast('يرجى تحديد نوع العملية', 'error'); setIsProcessing(false); return; }

            const settlement = {
                beneficiaryId: selectedBeneficiaryId,
                beneficiaryName: (currentBeneficiary as any)?.name || 'غير معروف',
                beneficiaryType,
                treasuryId: selectedTreasury,
                treasuryName: treasury?.name || 'خزينة',
                type: typeLabel,
                amount: settlementAmount,
                direction,
                status: 'مكتملة',
                date: new Date().toISOString()
            };

            await api.saveSettlement(settlement);
            
            addToast('تمت التسوية المالية وتحديث الأرصدة بنجاح', 'success');
            setSettlementAmount(0);
            setSelectedBeneficiaryId(null);
            setCustomType('');
            fetchData();
        } catch (e) {
            console.error("Settlement failed", e);
            addToast('فشل في حفظ التسوية', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteSettlement = async (s: SettlementRecord) => {
        if (!window.confirm('الإلغاء سيقوم باسترداد الأموال وإعادة الأرصدة. هل أنت متأكد؟')) return;
        
        setIsProcessing(true);
        try {
            await api.deleteSettlement(s.id);
            addToast('تم إلغاء التسوية واستعادة الأرصدة', 'success');
            fetchData();
        } catch (err) {
            console.error("Delete settlement failed", err);
            addToast('فشل في حذف التسوية', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="animate-fadeIn pb-20 space-y-12">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                        <Scale size={12}/> الإدارة المالية المتقدمة
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-white tracking-tight">تسويات مالية</h1>
                    <p className="text-slate-500 font-bold text-lg">تصفية العهد، تسوية الأرباح، والمديونيات بشكل دقيق.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Settlement Form Side */}
                <div className="lg:col-span-5 space-y-8">
                    <div className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-8 border-b dark:border-slate-800 pb-6">طلب تسوية جديد</h3>
                        
                        <div className="space-y-6">
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">نوع المستفيد</label>
                                    <select 
                                        value={beneficiaryType}
                                        onChange={e => { setBeneficiaryType(e.target.value); setSelectedBeneficiaryId(null); }}
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-3xl outline-none font-black text-slate-700 dark:text-white transition-all"
                                    >
                                        <option value="Partner">شريك</option>
                                        <option value="Employee">موظف / مندوب</option>
                                        <option value="Supplier">مورد</option>
                                        <option value="Customer">عميل</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">اسم المستفيد (البحث بالاسم أو الهاتف)</label>
                                    <div className="flex gap-2 mb-2">
                                        <div className="relative flex-1">
                                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                            <input 
                                                type="text"
                                                placeholder="أدخل الاسم أو رقم الهاتف..."
                                                className="w-full p-4 pl-10 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-slate-700 dark:text-white transition-all text-sm"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <select 
                                        value={selectedBeneficiaryId || ''} 
                                        onChange={e => setSelectedBeneficiaryId(e.target.value)}
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-3xl outline-none font-black text-slate-700 dark:text-white transition-all"
                                    >
                                        <option value="">{searchTerm ? `نتائج البحث عن "${searchTerm}"` : 'اختر من القائمة...'}</option>
                                        {getBeneficiariesList().map((b:any) => <option key={b.id} value={b.id}>{b.name} {b.phone ? `(${b.phone})` : ''}</option>)}
                                    </select>
                                </div>
                            </div>
                            
                             {currentBeneficiary && (
                                <div className="space-y-3">
                                    <div className="p-5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-3xl text-center">
                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">
                                            الحساب للرصيد الحالي
                                            {(beneficiaryType === 'Supplier' || beneficiaryType === 'Customer') && ' (مديونيات مسجلة)'}
                                        </p>
                                        <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(getBalance(), settings?.currency)}</p>
                                    </div>
                                    
                                    {beneficiaryType === 'Customer' && pendingInstallments.length > 0 && (
                                        <div className="p-5 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-3xl">
                                            <div className="flex items-center gap-2 mb-3">
                                                <TrendingUp size={16} className="text-amber-600" />
                                                <h4 className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase">الأقساط القائمة (الدين)</h4>
                                            </div>
                                            <div className="space-y-2">
                                                {pendingInstallments.map((plan) => (
                                                    <div key={plan.id} className="flex justify-between items-center bg-white/50 dark:bg-black/20 p-3 rounded-2xl border border-amber-200/30">
                                                        <div className="text-right">
                                                            <p className="text-[10px] font-black text-slate-500">{plan.productName || 'تقسيط مشتريات'}</p>
                                                            <p className="text-xs font-bold text-slate-400">متبقى: {toArabicIndic(plan.remainingAmount.toString())} {settings?.currency}</p>
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="text-sm font-black text-amber-600 dark:text-amber-400">{formatCurrency(plan.remainingAmount, settings?.currency)}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-[10px] text-amber-600 font-bold mt-3 text-center">* أي إيداع سيقوم بسداد هذه الأقساط تلقائياً</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 pb-4 border-b dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setDirection('out')}
                                    className={`p-4 rounded-3xl border-2 transition-all flex items-center justify-center gap-2 font-black ${direction === 'out' ? 'border-rose-500 bg-rose-50 text-rose-600 dark:bg-rose-900/20' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}
                                >
                                    <ArrowUpCircle size={20} /> سحب (صرف للأطراف)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDirection('in')}
                                    className={`p-4 rounded-3xl border-2 transition-all flex items-center justify-center gap-2 font-black ${direction === 'in' ? 'border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}
                                >
                                    <ArrowDownCircle size={20} /> إيداع (تحصيل/مردود)
                                </button>
                            </div>

                            <div className="space-y-2 relative">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">المبلغ المراد {direction === 'in' ? 'إيداعه' : 'سداده/صرفه'}</label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        value={settlementAmount || ''} 
                                        onChange={e => setSettlementAmount(parseFloat(e.target.value)||0)}
                                        className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-3xl outline-none font-black text-slate-700 dark:text-white transition-all ps-14" 
                                        placeholder="0.00"
                                    />
                                    <Wallet className={`absolute left-5 top-1/2 -translate-y-1/2 ${direction === 'out' ? 'text-rose-500' : 'text-emerald-500'}`} size={24} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">الخزينة {direction === 'in' ? 'المستفيدة' : 'المسحوب منها'}</label>
                                <select 
                                    value={selectedTreasury || ''} 
                                    onChange={e => setSelectedTreasury(e.target.value)}
                                    className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-3xl outline-none font-black text-slate-700 dark:text-white transition-all"
                                >
                                    {treasuries.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.name} ({formatCurrency(t.balance, settings?.currency)})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">تصنيف العملية / التبرير</label>
                                <select 
                                    value={settlementType}
                                    onChange={e => setSettlementType(e.target.value)}
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-3xl outline-none font-bold text-slate-700 dark:text-white transition-all mb-2"
                                >
                                    <option>أرباح شركاء المساهمين</option>
                                    <option>تصفية عهد مناديب مبيعات</option>
                                    <option>تسوية فروقات مخزنية / تالف</option>
                                    <option>أخرى</option>
                                </select>
                                {settlementType === 'أخرى' && (
                                    <input 
                                        type="text"
                                        value={customType}
                                        onChange={e => setCustomType(e.target.value)}
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-3xl outline-none font-bold text-slate-700 dark:text-white"
                                        placeholder="اكتب نوع العملية هنا..."
                                    />
                                )}
                            </div>

                            <div className="pt-4">
                                <Button 
                                    onClick={handleSettlement} 
                                    isLoading={isProcessing}
                                    disabled={!selectedBeneficiaryId || settlementAmount <= 0}
                                    className="w-full h-16 rounded-[2rem] shadow-2xl shadow-indigo-500/30 font-black text-lg"
                                >
                                    تأكيد واعتماد العملية
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* History Table Side */}
                <div className="lg:col-span-7 flex flex-col gap-8">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden flex-1">
                        <div className="p-8 border-b dark:border-slate-800 flex justify-between items-center">
                            <h3 className="text-xl font-black text-slate-800 dark:text-white">سجل التسويات السابقة</h3>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-start">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50">
                                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-start">العملية / الخزينة</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-start">المستفيد</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-start">المبلغ / التبرير</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">إلغاء</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-slate-800">
                                    {settlements.map((s) => (
                                        <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${s.direction === 'in' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                                                       {s.direction === 'in' ? <ArrowDownCircle size={16}/> : <ArrowUpCircle size={16}/>}
                                                    </div>
                                                    <div>
                                                        <span className="font-mono text-[10px] font-black text-slate-400">{s.id}</span>
                                                        <p className="text-xs font-bold text-slate-700 dark:text-white">{s.treasuryName}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-black text-slate-700 dark:text-white">{s.beneficiaryName}</p>
                                                <p className="text-[10px] text-slate-400 mt-1">{s.beneficiaryType}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className={`font-black text-sm ${s.direction === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {s.direction === 'in' ? '+' : '-'}{formatCurrency(s.amount, settings?.currency)}
                                                </p>
                                                <p className="text-[10px] font-bold text-slate-500 mt-1 max-w-[200px] truncate">{s.type}</p>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button 
                                                    onClick={() => handleDeleteSettlement(s)}
                                                    className="p-2.5 bg-rose-50 dark:bg-rose-900/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all"
                                                    title="إلغاء واسترداد"
                                                >
                                                    <Trash2 size={16}/>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {settlements.length === 0 && (
                            <div className="p-16 text-center bg-slate-50/50 dark:bg-slate-800/10">
                                <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl flex items-center justify-center mx-auto mb-6 ring-4 ring-slate-100 dark:ring-slate-800">
                                    <Scale size={40} className="text-slate-200" />
                                </div>
                                <h4 className="text-xl font-black text-slate-800 dark:text-white mb-2">سجل فارغ</h4>
                                <p className="text-slate-400 font-bold text-sm max-w-xs mx-auto">لم يتم العثور على عمليات تسوية مالية بعد.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinancialSettlementPage;

