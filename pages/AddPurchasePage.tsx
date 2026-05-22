
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Product, Supplier, Treasury, Warehouse } from '../types';
import { api } from '../services/mockApi';
import { useSettings } from '../hooks/useSettings';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Trash2, Search, ShoppingBag } from 'lucide-react';
import { formatCurrency, toArabicIndic } from '../utils/localization';
import { useToasts } from '../hooks/useToasts';

const AddPurchasePage: React.FC = () => {
    const { settings } = useSettings();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { addToast } = useToasts();
    
    const [products, setProducts] = useState<Product[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [treasuries, setTreasuries] = useState<Treasury[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    
    const [items, setItems] = useState<any[]>([]);
    const [selectedSupId, setSelectedSupId] = useState('');
    const [selectedWhId, setSelectedWhId] = useState('');
    const [selectedTrId, setSelectedTrId] = useState('');
    const [discount, setDiscount] = useState(0);
    const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
    const [amountPaid, setAmountPaid] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Transfer' | 'Credit' | 'Split'>('Cash');
    const [splitPayments, setSplitPayments] = useState({ cash: 0, card: 0, transfer: 0 });
    const [searchTerm, setSearchTerm] = useState('');

    const editId = searchParams.get('edit');

    useEffect(() => {
        Promise.all([api.getProducts(), api.getSuppliers(), api.getWarehouses(), api.getTreasuries(true), api.getPurchases(), api.getEmployees()]).then(([p, s, w, t, allP, emps]) => {
            setProducts(p); setSuppliers(s); setWarehouses(w); setTreasuries(t); setEmployees(emps);
            if (s.length) setSelectedSupId(s[0].id);
            if (w.length) setSelectedWhId(w.find(i=>i.isDefault)?.id || w[0].id);
            if (t.length) setSelectedTrId(t.find(i=>i.isDefault)?.id || t[0].id);
            if (editId) {
                const pToEdit = allP.find((i:any) => i.id === editId);
                if (pToEdit) { setItems(pToEdit.items); setSelectedSupId(pToEdit.supplier.id); setSelectedWhId(pToEdit.warehouseId); setSelectedTrId(pToEdit.treasuryId); setDiscount(pToEdit.discount); setDiscountType(pToEdit.discountType); setAmountPaid(pToEdit.amountPaid); setPaymentMethod(pToEdit.paymentMethod as any); setSelectedEmployeeId(pToEdit.employeeId || ''); }
            }
        });
    }, [editId]);

    const subtotal = items.reduce((s, i) => s + (i.costPrice * i.quantity), 0);
    const discountVal = discountType === 'percent' ? (subtotal * discount / 100) : discount;
    const finalTotal = Math.max(0, subtotal - discountVal);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!items.length || !selectedWhId || !selectedTrId) { addToast('يرجى اختيار المنتجات وتحديد المستودع والخزينة', 'warning'); return; }
        
        const supplier = suppliers.find(s => s.id === selectedSupId);
        const amtToPay = paymentMethod === 'Credit' ? 0 : paymentMethod === 'Split' ? (splitPayments.cash + splitPayments.card + splitPayments.transfer) : amountPaid;
        const debtToBeAdded = finalTotal - amtToPay;

        if (debtToBeAdded > 0 && supplier) {
            const currentDebt = supplier.debt || 0;
            const limit = supplier.creditLimit || 0;
            if (limit > 0 && (currentDebt + debtToBeAdded) > limit) {
                addToast(`تنبيه: تم تجاوز الحد الائتماني للمورد (${limit}). ديوننا المتوقعة: ${currentDebt + debtToBeAdded}.`, 'warning');
            }
        }

        try {
            let commissionAmount = 0;
            if (selectedEmployeeId) {
                const emp = employees.find(e => e.id === selectedEmployeeId);
                if (emp && emp.status === 'Active') {
                    const discountPercent = discountType === 'percent' ? discount : Math.min(100, (discount / (subtotal || 1)) * 100);
                    if (discountPercent <= emp.maxDiscountLimit) {
                        const baseAmt = settings?.commissionCalcMethod === 'before_discount' ? subtotal : finalTotal;
                        commissionAmount = (baseAmt * emp.commissionPercentage) / 100;
                    }
                }
            }

            await api.savePurchase({ id: editId || undefined, supplier, items, total: finalTotal, amountPaid: amtToPay, warehouseId: selectedWhId, treasuryId: selectedTrId, discount, discountType, paymentMethod, splitPayments, employeeId: selectedEmployeeId || undefined, commissionAmount });
            addToast('تم حفظ طلب الشراء', 'success'); navigate('/purchases');
        } catch (e) { addToast('خطأ في الحفظ', 'error'); }
    };

    return (
        <form onSubmit={handleSubmit} className="animate-fadeIn pb-10">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-black">إضافة طلب شراء</h1>
                <div className="flex gap-2">
                    <Button type="button" variant="secondary" onClick={() => navigate('/purchases')} className="rounded-xl">تراجع</Button>
                    <Button type="submit" className="rounded-xl bg-indigo-600 shadow-lg shadow-indigo-500/20 px-8">حفظ الطلب</Button>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <Card title="الأصناف المختارة" className="h-[650px] flex flex-col overflow-hidden">
                        <div className="relative mb-6">
                            <Search className="absolute top-1/2 -translate-y-1/2 start-3 text-slate-400" />
                            <input type="text" placeholder="ابحث عن منتج..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full h-12 ps-10 border rounded-xl dark:bg-slate-800 font-bold" />
                            {searchTerm && (
                                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-slate-800 border rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                                    {products.filter(p => p.name.includes(searchTerm) || p.sku.includes(searchTerm)).map(p => (
                                        <button key={p.id} type="button" onClick={() => { const ex = items.find(i => i.productId === p.id); if (ex) setItems(items.map(i => i.productId === p.id ? {...i, quantity: i.quantity + 1} : i)); else setItems([...items, { productId: p.id, name: p.name, quantity: 1, costPrice: p.costPrice }]); setSearchTerm(''); }} className="w-full p-3 text-start hover:bg-slate-50 border-b last:border-0 font-black text-xs flex justify-between">
                                            <span>{p.name} <span className="text-[10px] text-slate-400 ms-2">({toArabicIndic(p.stock)})</span></span>
                                            <span className="text-indigo-600">{formatCurrency(p.costPrice, settings?.currency)}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                            {items.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-4 p-4 border rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:border-indigo-300 transition-colors">
                                    <div className="flex-grow">
                                        <p className="font-black text-xs">{item.name}</p>
                                        <label className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">تكلفة الوحدة: 
                                          <input type="number" value={item.costPrice || ''} onChange={e => setItems(items.map((it, i) => i === idx ? {...it, costPrice: parseFloat(e.target.value)||0} : it))} className="w-20 p-1 border rounded text-xs font-bold dark:bg-slate-700" />
                                        </label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="number" value={item.quantity} onChange={e => setItems(items.map((it, i) => i === idx ? {...it, quantity: parseFloat(e.target.value)||0} : it))} className="w-20 p-2 border rounded-lg text-center font-bold text-xs" />
                                        <button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-rose-500 p-2 hover:bg-rose-50 rounded-lg"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            ))}
                            {items.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center opacity-30">
                                    <ShoppingBag size={80} strokeWidth={1}/>
                                    <p className="font-black mt-4">لم يتم اختيار أصناف بعد</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
                <div className="space-y-6">
                    <Card title="بيانات الطلب">
                        <div className="space-y-4">
                            <div><label className="text-[10px] font-black text-slate-400 block mb-1">المورد</label><select value={selectedSupId} onChange={e => setSelectedSupId(e.target.value)} className="w-full p-2.5 border rounded-xl dark:bg-slate-800 font-bold text-xs">{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 block mb-1">الموظف (تلقي العمولة)</label>
                                <select value={selectedEmployeeId} onChange={e => setSelectedEmployeeId(e.target.value)} className="w-full p-2.5 border rounded-xl dark:bg-slate-800 font-bold text-xs">
                                    <option value="">بدون موظف</option>
                                    {employees.filter(emp => emp.status === 'Active').map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                </select>
                            </div>
                            <div><label className="text-[10px] font-black text-slate-400 block mb-1">طريقة الدفع</label><select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)} className="w-full p-2.5 border rounded-xl dark:bg-slate-800 font-bold text-xs"><option value="Cash">كاش</option><option value="Card">بطاقة</option><option value="Transfer">تحويل</option><option value="Credit">آجل (دين)</option><option value="Split">دفع متعدد (مقسم)</option></select></div>
                            {paymentMethod === 'Split' && (
                                <div className="grid grid-cols-3 gap-2 p-3 border rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                    <div><label className="text-[10px] font-black text-indigo-600 block mb-1">كاش</label><input type="number" min="0" value={splitPayments.cash || ''} onChange={e => setSplitPayments(p => ({...p, cash: parseFloat(e.target.value)||0}))} className="w-full p-2 border rounded-lg text-xs" /></div>
                                    <div><label className="text-[10px] font-black text-emerald-600 block mb-1">بطاقة</label><input type="number" min="0" value={splitPayments.card || ''} onChange={e => setSplitPayments(p => ({...p, card: parseFloat(e.target.value)||0}))} className="w-full p-2 border rounded-lg text-xs" /></div>
                                    <div><label className="text-[10px] font-black text-amber-600 block mb-1">تحويل</label><input type="number" min="0" value={splitPayments.transfer || ''} onChange={e => setSplitPayments(p => ({...p, transfer: parseFloat(e.target.value)||0}))} className="w-full p-2 border rounded-lg text-xs" /></div>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-[10px] font-black text-slate-400 block mb-1">المستودع</label><select value={selectedWhId} onChange={e => setSelectedWhId(e.target.value)} className="w-full p-2.5 border rounded-xl dark:bg-slate-800 font-bold text-xs">{warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
                                <div><label className="text-[10px] font-black text-slate-400 block mb-1">الخزينة</label><select value={selectedTrId} onChange={e => setSelectedTrId(e.target.value)} className="w-full p-2.5 border rounded-xl dark:bg-slate-800 font-bold text-xs">{treasuries.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 pt-2 border-t dark:border-slate-700">
                                <div><label className="text-[10px] font-black text-slate-400 block mb-1">قيمة الخصم</label><input type="number" min="0" value={discount || ''} onChange={e => setDiscount(parseFloat(e.target.value)||0)} className="w-full p-2.5 border rounded-xl dark:bg-slate-800 font-bold text-xs" /></div>
                                <div><label className="text-[10px] font-black text-slate-400 block mb-1">نوع الخصم</label><select value={discountType} onChange={e => setDiscountType(e.target.value as any)} className="w-full p-2.5 border rounded-xl dark:bg-slate-800 font-bold text-xs"><option value="amount">مبلغ</option><option value="percent">نسبة (%)</option></select></div>
                            </div>
                        </div>
                    </Card>
                    <div className="p-6 bg-indigo-600 text-white rounded-4xl text-center shadow-xl">
                        <p className="text-[10px] font-black opacity-80 uppercase tracking-widest">إجمالي الطلب</p>
                        <p className="text-3xl font-black mt-1">{formatCurrency(finalTotal, settings?.currency)}</p>
                        {paymentMethod !== 'Credit' && paymentMethod !== 'Split' && (
                            <div className="mt-6 pt-6 border-t border-white/20">
                                <label className="text-[10px] font-black opacity-70 block mb-2">المبلغ المدفوع فعلياً</label>
                                {/* FIX: Changed background from white/10 to indigo-800 for better contrast against white numbers */}
                                <input type="number" value={amountPaid || ''} onChange={e => setAmountPaid(parseFloat(e.target.value)||0)} className="w-full p-3 bg-indigo-800/50 rounded-2xl text-center font-black border border-white/20 text-white text-2xl outline-none focus:ring-2 focus:ring-white/50" />
                            </div>
                        )}
                        {paymentMethod === 'Split' && (
                            <div className="mt-6 pt-6 border-t border-white/20 text-center">
                                <label className="text-[10px] font-black opacity-70 block mb-1">يتم دفع {formatCurrency(splitPayments.cash + splitPayments.card + splitPayments.transfer, settings?.currency)} من إجمالي {formatCurrency(finalTotal, settings?.currency)}</label>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </form>
    );
};

export default AddPurchasePage;
