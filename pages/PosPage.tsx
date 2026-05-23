
import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/mockApi';
import type { Product, Sale, Customer, Warehouse, Treasury, PaymentDetail } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import CustomerForm from '../components/customers/CustomerForm';
import { Search, ShoppingCart, Trash2, Plus, Minus, User, Warehouse as WhIcon, Wallet, Percent, Truck, UserPlus, Gift, CreditCard, DollarSign, Lock } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency, toArabicIndic, formatAmount } from '../utils/localization';
import { useToasts } from '../hooks/useToasts';
import ReceiptModal from '../components/sales/ReceiptModal';
import SplitPaymentModal from '../components/pos/SplitPaymentModal';
import { whatsappService } from '../services/whatsappService';
import InstallmentSetupModal from '../components/sales/InstallmentSetupModal';
import { useShift } from '../hooks/useShift';
import ShiftManagerModal from '../components/shifts/ShiftManagerModal';
import { useLicense } from '../hooks/useLicense';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { getPlanLimits } from '../utils/planPermissions';

const PosPage: React.FC = () => {
    const { settings } = useSettings();
    const { addToast } = useToasts();
    const { currentShift } = useShift();
    const { licenseInfo } = useLicense();
    const limits = getPlanLimits(licenseInfo.type);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    const [products, setProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [treasuries, setTreasuries] = useState<Treasury[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    
    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState<any[]>([]);
    
    const [selectedCustomerId, setSelectedCustomerId] = useState('cust-1');
    const [customerQuery, setCustomerQuery] = useState('');
    const [showCustResults, setShowCustResults] = useState(false);
    const [isNewCustModalOpen, setIsNewCustModalOpen] = useState(false);
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    const [selectedWhId, setSelectedWhId] = useState('');
    const [selectedTrId, setSelectedTrId] = useState('');
    const [shippingCompanies, setShippingCompanies] = useState<any[]>([]);
    const [selectedShippingCompanyId, setSelectedShippingCompanyId] = useState('');
    const [partners, setPartners] = useState<any[]>([]);
    
    const [globalDiscount, setGlobalDiscount] = useState(0);
    const [globalDiscountType, setGlobalDiscountType] = useState<'amount' | 'percent'>('amount');
    const [shippingCost, setShippingCost] = useState(0);
    const [pointsToRedeem, setPointsToRedeem] = useState(0);

    const [showReceipt, setShowReceipt] = useState(false);
    const [lastSale, setLastSale] = useState<Sale | null>(null);
    const [showSplitModal, setShowSplitModal] = useState(false);
    const [showInstallmentModal, setShowInstallmentModal] = useState(false);
    const [pendingSplitPayments, setPendingSplitPayments] = useState<PaymentDetail[] | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useBarcodeScanner((barcode) => {
        const product = products.find(p => p.sku === barcode);
        if (product) {
            addToCart(product);
            addToast(`تم إضافة ${product.name} للسلة`, 'success');
        } else {
            addToast(`المنتج ذو الباركود ${barcode} غير موجود`, 'error');
        }
    });

    useEffect(() => {
        const load = async () => {
            const [p, c, w, t, allSales, emps, ships, parts] = await Promise.all([
                api.getProducts(), api.getCustomers(), api.getWarehouses(), api.getTreasuries(), api.getSales(), api.getEmployees(), api.getShippingCompanies(), api.getPartners()
            ]);
            setProducts(p); setCustomers(c); setWarehouses(w); setTreasuries(t); setEmployees(emps);
            setShippingCompanies(ships);
            setPartners(parts.filter((p: any) => p.status === 'Active') || []);
            if (w.length) setSelectedWhId(w.find(i => i.isDefault)?.id || w[0].id);
            if (t.length) setSelectedTrId(t.find(i => i.isDefault)?.id || t[0].id);
        };
        load();
    }, []);

    const selectedCustomer = useMemo(() => customers.find(c => c.id === selectedCustomerId), [customers, selectedCustomerId]);
    
    const pointsDiscount = useMemo(() => {
        if (!limits.hasLoyalty || !settings?.loyaltySettings?.enabled || !selectedCustomer) return 0;
        const rate = settings.loyaltySettings.redemptionRate || 0;
        return Math.min(pointsToRedeem * rate, (selectedCustomer.points || 0) * rate);
    }, [pointsToRedeem, selectedCustomer, settings, limits.hasLoyalty]);

    const subtotalRaw = useMemo(() => cart.reduce((s, i) => s + ((i.sellPrice || 0) * i.quantity), 0), [cart]);

    const subtotal = useMemo(() => cart.reduce((s, i) => {
        const price = i.sellPrice || 0;
        const discount = i.discountPercent ? (price * i.discountPercent / 100) : 0;
        return s + ((price - discount) * i.quantity);
    }, 0), [cart]);

    const discountVal = useMemo(() => {
        const val = globalDiscountType === 'percent' ? (subtotal * globalDiscount / 100) : globalDiscount;
        return Number(val.toFixed(2));
    }, [subtotal, globalDiscount, globalDiscountType]);

    const afterDiscount = Math.max(0, subtotal - discountVal);
    
    const taxAmount = useMemo(() => {
        const val = (settings?.taxEnabled !== false && settings?.vatRate) ? (afterDiscount * settings.vatRate / 100) : 0;
        return Number(val.toFixed(2));
    }, [afterDiscount, settings]);

    const finalTotal = useMemo(() => {
        const val = afterDiscount + taxAmount - pointsDiscount + shippingCost;
        return Number(Math.max(0, val).toFixed(2));
    }, [afterDiscount, taxAmount, pointsDiscount, shippingCost]);

    // Calculate approx partner profit real-time
    const currentCost = useMemo(() => cart.reduce((s, i) => s + ((i.costPrice || 0) * i.quantity), 0), [cart]);
    const currentProfit = Math.max(0, finalTotal - currentCost - shippingCost); // ignore shipping from profit
    
    const partnerProfitText = useMemo(() => {
        if (!partners.length || currentProfit <= 0) return null;
        const totalShare = partners.reduce((a, b) => a + (b.sharePercentage || 0), 0);
        if (totalShare <= 0) return null;
        const totalPartnerProfit = (currentProfit * totalShare) / 100;
        return `إجمالي ربح الشركاء: ${formatAmount(totalPartnerProfit)} ${settings?.currency || 'ر.س'}`;
    }, [partners, currentProfit, settings]);

    const handleCheckout = async (method: 'Cash' | 'Card' | 'Transfer' | 'Split' | 'Credit', payments?: PaymentDetail[], plan?: any) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        if (settings?.enableShiftManagement && !currentShift) {
            setIsShiftModalOpen(true);
            setIsSubmitting(false);
            return;
        }
        
        if (!cart.length || !selectedWhId || !selectedTrId) { addToast('يرجى اختيار المنتجات وتحديد المخزن والخزينة', 'warning'); setIsSubmitting(false); return; }
        
        // Final sanity check for inventory
        for (const item of cart) {
            const product = products.find(p => p.id === item.id);
            if (product) {
                const available = product.warehouseStocks?.[selectedWhId] || 0;
                if (item.quantity > available && !settings?.inventorySettings?.allowSaleWithoutStock) {
                    addToast(`عذراً، المخزون لا يكفي للمنتج: ${item.name} (المتاح: ${available})`, 'error');
                    setIsSubmitting(false);
                    return;
                }
            }
        }
        
        // Check daily and yearly sales limits
        try {
            const allSales = await api.getSales();
            const today = new Date().toISOString().split('T')[0];
            const year = today.split('-')[0];
            const todaySales = allSales.filter((s: any) => s.date.split('T')[0] === today);
            const yearSales = allSales.filter((s: any) => s.date.startsWith(year));
            
            if (todaySales.length >= limits.maxDailySales) {
                addToast(`لقد بلغت الحد الأقصى للمبيعات اليومية (${limits.maxDailySales}). يرجى الترقية لإضافة المزيد.`, "warning");
                setIsSubmitting(false);
                return;
            }
            if (yearSales.length >= limits.maxYearlySales) {
                addToast(`لقد بلغت الحد الأقصى للمبيعات السنوية (${limits.maxYearlySales}). يرجى الترقية لإضافة المزيد.`, "warning");
                setIsSubmitting(false);
                return;
            }
        } catch (e) {
            console.error("Error checking sales limits", e);
        }

        const hasCredit = method === 'Credit' || (payments && payments.some(p => p.method === 'Credit'));
        
        // Credit limit check
        const amountPaidCheck = method === 'Split' ? (payments?.filter(p => !!p && p.method !== 'Credit').reduce((a, b) => a + (b.amount||0), 0) || 0) : (method === 'Credit' ? 0 : finalTotal);
        const debtToBeAdded = Math.max(0, finalTotal - amountPaidCheck);
        
        if (debtToBeAdded > 0 && selectedCustomer) {
             const currentDebt = (selectedCustomer.debt || 0);
             const limit = (selectedCustomer.creditLimit); 
             
             // If limit is not undefined/null, check it. If it's 0, it blocks all credit.
             if (limit !== undefined && limit !== null && (currentDebt + debtToBeAdded) > limit) {
                  addToast(`عذراً: تم تجاوز الحد الائتماني المسموح به للعميل (${formatAmount(limit)}). المديونية الحالية: ${formatAmount(currentDebt)}. المديونية بعد العملية: ${formatAmount(currentDebt + debtToBeAdded)}. يرجى سداد جزء من المديونية أو رفع الحد الائتماني للإتمام.`, 'error');
                  setIsSubmitting(false);
                  return; // Block checkout
             }
        }

        if (hasCredit && !plan) {
            if (licenseInfo?.type === 'Free') {
                addToast('إعداد خطة التقسيط غير متاح في الخطة المجانية. يرجى الترقية.', 'error');
                setIsSubmitting(false);
                return;
            }
            setPendingSplitPayments(payments || null);
            setShowInstallmentModal(true);
            setIsSubmitting(false);
            return;
        }

        try {
            let commissionAmount = 0;
            if (selectedEmployeeId) {
                const emp = employees.find(e => e.id === selectedEmployeeId);
                if (emp && emp.status === 'Active') {
                    const totalDiscountValue = (subtotalRaw - subtotal) + discountVal;
                    const discountPercent = subtotalRaw > 0 ? (totalDiscountValue / subtotalRaw) * 100 : 0;
                    if (discountPercent <= emp.maxDiscountLimit) {
                        const baseAmt = settings?.commissionCalcMethod === 'before_discount' ? subtotal : finalTotal;
                        commissionAmount = (baseAmt * emp.commissionPercentage) / 100;
                    }
                }
            }

            const amountPaid = method === 'Split' ? (payments?.filter(p => p.method !== 'Credit').reduce((a, b) => a + b.amount, 0) || 0) : (method === 'Credit' ? 0 : finalTotal);
            const res = await api.saveSale({
                customer: { id: selectedCustomerId, name: selectedCustomer?.name, phone: selectedCustomer?.phone },
                cashier: { id: 'u-1', name: 'المدير' },
                employeeId: selectedEmployeeId || undefined,
                commissionAmount,
                items: cart.map(i => ({
                    ...i,
                    discount: (i.sellPrice * (i.discountPercent || 0) / 100)
                })),
                subtotal, total: finalTotal, amountPaid,
                paymentMethod: method, discount: globalDiscount, discountType: globalDiscountType,
                shipping: shippingCost, warehouseId: selectedWhId, treasuryId: selectedTrId,
                payments: payments || (method !== 'Split' ? [{ method: method as any, amount: finalTotal }] : []),
                installmentPlan: plan, pointsRedeemed: pointsToRedeem,
                shiftId: currentShift?.id 
            });
            setLastSale(res); setShowReceipt(true); setCart([]); setGlobalDiscount(0); setShippingCost(0); setPointsToRedeem(0); setPendingSplitPayments(null);
            
            // Auto create shipping operation if company is selected
            if (selectedShippingCompanyId) {
                const company = shippingCompanies.find(sc => sc.id === selectedShippingCompanyId);
                if (company) {
                    await api.saveShippingOperation({
                        saleId: res.id,
                        customerName: selectedCustomer?.name || 'عميل',
                        customerPhone: selectedCustomer?.phone || '',
                        customerAddress: selectedCustomer?.address || '',
                        shippingCompanyId: company.id,
                        shippingCompanyName: company.name,
                        trackingNumber: `SO-${Date.now()}`,
                        cost: shippingCost,
                        status: 'Pending',
                        date: new Date().toISOString()
                    });
                }
            }
            setSelectedShippingCompanyId('');

            addToast('تمت العملية بنجاح', 'success');

            // Auto WhatsApp logic
            whatsappService.autoSendInvoice(res, settings as any);
            
        } catch (e) { addToast('فشل إتمام العملية', 'error'); } finally { setIsSubmitting(false); }
    };

    const addToCart = (p: Product) => {
        const stockInWh = p.warehouseStocks?.[selectedWhId] || 0;
        const currentQty = cart.find(i => i.id === p.id)?.quantity || 0;
        if (currentQty >= stockInWh && !settings?.inventorySettings?.allowSaleWithoutStock) {
            addToast('لا يمكن تجاوز المخزون المتاح في المستودع', 'error');
            return;
        }
        setCart(prev => {
            const ex = prev.find(i => i.id === p.id);
            if (ex) return prev.map(i => i.id === p.id ? {...i, quantity: i.quantity + 1} : i);
            return [...prev, { id: p.id, name: p.name, quantity: 1, sellPrice: p.sellPrice, costPrice: p.costPrice, discountPercent: 0 }];
        });
        setSearchTerm('');
    };

    const filteredSearchResults = useMemo(() => {
        if (!searchTerm.trim()) return [];
        return products.filter(p => {
            const matchesQuery = p.name.includes(searchTerm) || p.sku.includes(searchTerm);
            return matchesQuery;
        });
    }, [searchTerm, products]);

    const isGrid = settings?.posLayout === 'grid';
    const categories = useMemo(() => ['All', ...Array.from(new Set(products.map(p => p.category)))], [products]);
    const gridProducts = useMemo(() => {
        let filtered = products;
        if (selectedCategory !== 'All') filtered = filtered.filter(p => p.category === selectedCategory);
        if (searchTerm) filtered = filtered.filter(p => p.name.includes(searchTerm) || p.sku.includes(searchTerm));
        return filtered;
    }, [products, selectedCategory, searchTerm]);

    // UI Guard for Shift
    const isShiftLocked = settings?.enableShiftManagement && !currentShift;

    const renderGrid = () => (
        <div className="flex flex-col lg:flex-row h-full gap-4">
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                        <WhIcon className="absolute top-1/2 -translate-y-1/2 start-3 text-slate-400" size={16} />
                        <select value={selectedWhId} onChange={e => { setSelectedWhId(e.target.value); setCart([]); }} className="w-full h-10 ps-10 pe-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 font-black text-xs outline-none shadow-sm">
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar flex-shrink-0">
                    {categories.map(c => (
                        <button key={c} onClick={() => setSelectedCategory(c)} className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-colors ${selectedCategory === c ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700 hover:bg-slate-50'}`}>
                            {c === 'All' ? 'الكل' : c}
                        </button>
                    ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 overflow-y-auto pb-4 custom-scrollbar content-start">
                    {gridProducts.map(p => (
                        <button key={p.id} onClick={() => addToCart(p)} className="bg-white dark:bg-slate-800 rounded-2xl p-3 border border-slate-100 dark:border-slate-700 hover:border-indigo-300 shadow-sm flex flex-col items-center justify-between aspect-square transition-all hover:scale-[1.02] hover:shadow-md">
                            <div className="text-center w-full">
                                <h3 className="font-black text-xs text-slate-800 dark:text-white line-clamp-2 leading-tight mb-1">{p.name}</h3>
                                <p className="text-[9px] text-slate-400 truncate w-full">{p.category}</p>
                            </div>
                            <div className="w-full mt-2 bg-slate-50 dark:bg-slate-900 rounded-xl p-2 flex items-center justify-between">
                                <span className="font-black text-xs text-indigo-600">{formatAmount(p.sellPrice)}</span>
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-lg">{toArabicIndic(p.warehouseStocks?.[selectedWhId] || 0)}</span>
                            </div>
                        </button>
                    ))}
                    {gridProducts.length === 0 && <div className="col-span-full h-40 flex items-center justify-center text-slate-400 font-bold"><p>لا توجد منتجات مطابقة</p></div>}
                </div>
            </div>

            <div className="w-full lg:w-[380px] flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex-shrink-0 lg:h-full overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="relative mb-2">
                        <User className="absolute top-1/2 -translate-y-1/2 start-3 text-slate-400" size={16} />
                        <input type="text" placeholder="بحث عن عميل..." value={showCustResults ? customerQuery : (selectedCustomer?.name || '')} onFocus={() => setShowCustResults(true)} onChange={e => setCustomerQuery(e.target.value)} className="w-full h-10 ps-10 pe-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-black text-xs outline-none"/>
                        {showCustResults && (
                            <div className="absolute top-full left-0 right-0 z-[100] mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-xl border overflow-hidden">
                                {customers.filter(c => c.name.includes(customerQuery)).map(c => (
                                    <button key={c.id} onClick={() => { setSelectedCustomerId(c.id); setShowCustResults(false); }} className="w-full p-2.5 text-start hover:bg-slate-50 border-b last:border-0 font-bold text-xs">{c.name}</button>
                                ))}
                                <button onClick={() => setIsNewCustModalOpen(true)} className="w-full p-2.5 bg-indigo-50 text-indigo-600 text-[10px] font-black flex items-center justify-center gap-2"><UserPlus size={14}/> إضافة عميل</button>
                            </div>
                        )}
                    </div>
                    <div className="relative">
                        <Wallet className="absolute top-1/2 -translate-y-1/2 start-3 text-slate-400" size={16} />
                        <select value={selectedTrId} onChange={e => setSelectedTrId(e.target.value)} className="w-full h-10 ps-10 pe-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-black text-xs outline-none">{treasuries.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                    <div className="mb-2 relative sticky top-0 z-50">
                        <Search className="absolute top-1/2 -translate-y-1/2 start-3 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="إضافة منتج سريع..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            className="w-full h-10 ps-10 rounded-xl bg-white dark:bg-slate-900 border-2 border-indigo-100 dark:border-slate-700 font-black text-xs outline-none shadow-sm focus:border-indigo-500 transition-colors"
                        />
                        {searchTerm && (
                            <div className="absolute top-full left-0 right-0 z-[100] mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-xl border dark:border-slate-700 max-h-60 overflow-y-auto">
                                {filteredSearchResults.map(p => (
                                    <button key={p.id} onClick={() => addToCart(p)} className="w-full p-2.5 border-b dark:border-slate-700 flex justify-between hover:bg-indigo-50 font-black text-xs text-start">
                                        <span>{p.name} <span className="text-emerald-500 ms-1">({toArabicIndic(p.warehouseStocks?.[selectedWhId] || 0)})</span></span>
                                        <span className="text-indigo-600">{formatAmount(p.sellPrice)}</span>
                                    </button>
                                ))}
                                {filteredSearchResults.length === 0 && <p className="p-3 text-center text-[10px] text-slate-400 font-bold">لا توجد نتائج</p>}
                            </div>
                        )}
                    </div>

                    {cart.map(item => (
                        <div key={item.id} className="flex gap-2 items-center p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                            <div className="flex-1 min-w-0">
                                <h4 className="font-black text-xs truncate">{item.name}</h4>
                                <div className="text-indigo-600 font-bold text-[10px] mt-1">{formatAmount(item.sellPrice)}</div>
                            </div>
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 p-1">
                                <button onClick={() => setCart(prev => prev.map(i => i.id === item.id ? {...i, quantity: Math.max(1, i.quantity - 1)} : i))} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600 bg-slate-50 dark:bg-slate-800 rounded-lg"><Minus size={12}/></button>
                                <span className="font-black text-xs w-4 text-center">{item.quantity}</span>
                                <button onClick={() => setCart(prev => prev.map(i => i.id === item.id ? {...i, quantity: i.quantity + 1} : i))} className="w-6 h-6 flex items-center justify-center text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg"><Plus size={12}/></button>
                            </div>
                            <button onClick={() => setCart(cart.filter(i => i.id !== item.id))} className="text-rose-400 p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors"><Trash2 size={16}/></button>
                        </div>
                    ))}
                    {!cart.length && <div className="h-full flex flex-col items-center justify-center opacity-30 text-slate-500"><ShoppingCart size={48} className="mb-2"/><p className="font-black text-sm">السلة فارغة</p></div>}
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-center mb-4">
                        <span className="font-black text-xs text-slate-500">الإجمالي</span>
                        <span className="font-black text-2xl text-indigo-600">{formatCurrency(finalTotal, settings?.currency)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <Button onClick={() => handleCheckout('Cash')} className="bg-emerald-500 h-12 rounded-xl text-sm font-black shadow-lg shadow-emerald-500/20">دفع كاش</Button>
                        <Button onClick={() => setShowSplitModal(true)} className="bg-slate-800 dark:bg-slate-700 h-12 rounded-xl text-sm font-black shadow-lg"><CreditCard size={16} className="me-2"/> متعدد</Button>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] gap-4 animate-fadeIn overflow-hidden relative">
            {isShiftLocked && (
                <div className="absolute inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center rounded-4xl">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl text-center max-w-sm animate-scaleUp border dark:border-slate-800">
                        <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Lock size={40} />
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">الوردية مغلقة</h2>
                        <p className="text-slate-500 font-bold mb-8">يجب فتح وردية جديدة قبل البدء في عمليات البيع لضمان دقة التقارير.</p>
                        <Button onClick={() => setIsShiftModalOpen(true)} className="w-full h-12 rounded-xl text-lg font-black bg-indigo-600 shadow-lg shadow-indigo-500/20">فتح وردية العمل</Button>
                    </div>
                </div>
            )}

            {isGrid ? renderGrid() : (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-shrink-0">
                        <div className="lg:col-span-5 border border-slate-100 dark:border-slate-800 rounded-2xl flex relative overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                            <WhIcon className="absolute top-1/2 -translate-y-1/2 start-3 text-slate-400" size={16} />
                            <select value={selectedWhId} onChange={e => { setSelectedWhId(e.target.value); setCart([]); }} className="w-full h-12 ps-10 pe-4 bg-transparent font-black text-xs outline-none">
                                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                        <div className="lg:col-span-5 border border-slate-100 dark:border-slate-800 rounded-2xl flex relative bg-white dark:bg-slate-900 shadow-sm">
                            <User className="absolute top-1/2 -translate-y-1/2 start-3 text-slate-400" size={16} />
                            <input type="text" placeholder="بحث عن عميل..." value={showCustResults ? customerQuery : (selectedCustomer?.name || '')} onFocus={() => setShowCustResults(true)} onChange={e => setCustomerQuery(e.target.value)} className="w-full h-12 ps-10 pe-4 bg-transparent font-black text-xs outline-none"/>
                            {showCustResults && (
                                <div className="absolute top-full left-0 right-0 z-[100] mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border dark:border-slate-700 overflow-hidden">
                                    {customers.filter(c => c.name.includes(customerQuery)).map(c => (
                                        <button key={c.id} onClick={() => { setSelectedCustomerId(c.id); setShowCustResults(false); }} className="w-full p-3 text-start hover:bg-slate-50 dark:hover:bg-slate-800 border-b dark:border-slate-700 last:border-0 font-bold text-xs text-slate-700 dark:text-slate-300 transition-colors">{c.name}</button>
                                    ))}
                                    <button onClick={() => setIsNewCustModalOpen(true)} className="w-full p-3 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[11px] font-black flex items-center justify-center gap-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"><UserPlus size={14}/> إضافة عميل جديد</button>
                                </div>
                            )}
                        </div>
                        <div className="lg:col-span-2 border border-slate-100 dark:border-slate-800 rounded-2xl flex relative bg-white dark:bg-slate-900 shadow-sm">
                            <User className="absolute top-1/2 -translate-y-1/2 start-3 text-emerald-500" size={16} />
                            <select 
                                value={selectedEmployeeId} 
                                onChange={e => setSelectedEmployeeId(e.target.value)} 
                                className="w-full h-12 ps-10 pe-4 bg-transparent font-black text-xs outline-none text-emerald-600 appearance-none"
                            >
                                <option value="">البائع: افتراضي</option>
                                {employees.filter(emp => emp.status === 'Active').map(e => <option key={e.id} value={e.id}>بائع: {e.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                        <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-2 border-b dark:border-slate-700 grid grid-cols-12 text-[10px] font-black text-slate-400 uppercase">
                            <div className="col-span-5">المنتج</div>
                            <div className="col-span-2 text-center">السعر</div>
                            <div className="col-span-1 text-center">الكمية</div>
                            <div className="col-span-2 text-center">خصم %</div>
                            <div className="col-span-2 text-end">الإجمالي</div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                            <div className="mb-4 relative sticky top-0 z-50">
                                <Search className="absolute top-1/2 -translate-y-1/2 start-4 text-slate-400" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="إضافة منتج سريع للسلة..." 
                                    value={searchTerm} 
                                    onChange={e => setSearchTerm(e.target.value)} 
                                    className="w-full h-12 ps-12 rounded-xl bg-white dark:bg-slate-900 border-2 border-indigo-100 dark:border-slate-700 font-black text-sm outline-none shadow-sm focus:border-indigo-500 transition-colors"
                                />
                                {searchTerm && (
                                    <div className="absolute top-full left-0 right-0 z-[100] mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-xl border dark:border-slate-700 max-h-60 overflow-y-auto">
                                        {filteredSearchResults.map(p => (
                                            <button key={p.id} onClick={() => addToCart(p)} className="w-full p-3 border-b dark:border-slate-700 flex justify-between hover:bg-indigo-50 font-black text-xs text-start">
                                                <span>{p.name} <span className="text-emerald-500 ms-2">({toArabicIndic(p.warehouseStocks?.[selectedWhId] || 0)})</span></span>
                                                <span className="text-indigo-600">{formatAmount(p.sellPrice)}</span>
                                            </button>
                                        ))}
                                        {filteredSearchResults.length === 0 && <p className="p-4 text-center text-xs text-slate-400 font-bold">لا توجد نتائج</p>}
                                    </div>
                                )}
                            </div>

                            {cart.map(item => (
                                <div key={item.id} className="grid grid-cols-12 gap-2 items-center p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-700/50 hover:border-indigo-300 transition-colors">
                                    <div className="col-span-5 flex flex-col">
                                        <span className="font-black text-xs truncate">{item.name}</span>
                                        <span className="text-[10px] text-slate-400">SKU: {products.find(p=>p.id===item.id)?.sku}</span>
                                    </div>
                                    <div className="col-span-2">
                                        <input type="number" step="0.01" value={item.sellPrice} onChange={e => setCart(prev => prev.map(i => i.id === item.id ? {...i, sellPrice: parseFloat(e.target.value)||0} : i))} className="w-full p-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-black text-xs text-indigo-600 bg-white dark:bg-slate-800"/>
                                    </div>
                                    <div className="col-span-1 flex items-center justify-center gap-1">
                                        <button onClick={() => setCart(prev => prev.map(i => i.id === item.id ? {...i, quantity: Math.max(1, i.quantity - 1)} : i))} className="p-1 text-slate-400 hover:bg-white dark:hover:bg-slate-700 rounded"><Minus size={10}/></button>
                                        <input type="number" min="1" value={item.quantity} onChange={e => setCart(prev => prev.map(i => i.id === item.id ? {...i, quantity: Math.max(1, parseInt(e.target.value) || 1)} : i))} className="w-10 bg-[#f8fafc] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center font-black text-xs p-1 rounded-md [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                        <button onClick={() => setCart(prev => prev.map(i => i.id === item.id ? {...i, quantity: i.quantity + 1} : i))} className="p-1 text-indigo-600 hover:bg-white dark:hover:bg-slate-700 rounded"><Plus size={10}/></button>
                                    </div>
                                    <div className="col-span-2 flex justify-center">
                                        <input type="number" value={item.discountPercent} onChange={e => setCart(prev => prev.map(i => i.id === item.id ? {...i, discountPercent: parseFloat(e.target.value)||0} : i))} className="w-12 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-center text-[10px] font-bold py-1.5"/>
                                    </div>
                                    <div className="col-span-2 text-end flex flex-col items-end">
                                        <span className="font-black text-xs">{formatAmount((item.sellPrice - (item.sellPrice * (item.discountPercent || 0) / 100)) * item.quantity)}</span>
                                        <button onClick={() => setCart(cart.filter(i => i.id !== item.id))} className="text-rose-400 p-1 mt-1 hover:text-rose-600 transition-colors"><Trash2 size={12}/></button>
                                    </div>
                                </div>
                            ))}
                            {!cart.length && <div className="h-full flex flex-col items-center justify-center opacity-20"><ShoppingCart size={60}/><p className="font-black mt-2 text-lg">السلة فارغة</p></div>}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-6 shadow-2xl flex-shrink-0">
                        <div className="grid grid-cols-2 md:grid-cols-9 gap-4 items-end">
                            <div className="flex flex-col gap-1 col-span-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase">الموظف (بائع)</label>
                                <select value={selectedEmployeeId} onChange={e => setSelectedEmployeeId(e.target.value)} className="h-10 p-2 border border-slate-100 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-bold text-xs">
                                    <option value="">بدون موظف</option>
                                    {employees.filter(emp => emp.status === 'Active').map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1 col-span-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase">الخزينة</label>
                                <select value={selectedTrId} onChange={e => setSelectedTrId(e.target.value)} className="h-10 p-2 border border-slate-100 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-bold text-xs">{treasuries.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                            </div>
                            <div className="flex flex-col gap-1 col-span-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase">الخصم</label>
                                <div className="flex gap-1 h-10">
                                    <input type="number" value={globalDiscount || ''} onChange={e => setGlobalDiscount(parseFloat(e.target.value)||0)} className="w-full p-2 border border-slate-100 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-bold text-xs" />
                                    <button onClick={() => setGlobalDiscountType(globalDiscountType === 'amount' ? 'percent' : 'amount')} className="px-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl font-black text-[9px] text-indigo-600">{globalDiscountType === 'amount' ? settings?.currency : '%'}</button>
                                </div>
                            </div>
                            {limits.hasLoyalty ? (
                                <div className="flex flex-col gap-1 col-span-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase">النقاط ({toArabicIndic(selectedCustomer?.points || 0)})</label>
                                    <input type="number" value={pointsToRedeem || ''} onChange={e => setPointsToRedeem(parseFloat(e.target.value)||0)} className="w-full h-10 p-2 border border-slate-100 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-bold text-xs" placeholder="استبدال..." />
                                </div>
                            ) : (<div></div>)}

                            {limits.hasShipping && (
                                <div className="flex flex-col gap-1 col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">
                                        <Truck size={10} /> شركة وخدمة الشحن
                                    </label>
                                    <div className="flex gap-1 h-10">
                                        <select value={selectedShippingCompanyId} onChange={e => setSelectedShippingCompanyId(e.target.value)} className="flex-1 p-2 border border-slate-100 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-bold text-[11px] outline-none">
                                            <option value="">اختار شركة شحن...</option>
                                            {shippingCompanies.map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
                                        </select>
                                        <input type="number" placeholder="التكلفة" value={shippingCost || ''} onChange={e => setShippingCost(parseFloat(e.target.value)||0)} className="w-20 p-2 border border-slate-100 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-bold text-xs" />
                                    </div>
                                </div>
                            )}

                            <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-2xl flex flex-col items-center justify-center h-16 col-span-1 border border-slate-100 dark:border-slate-800">
                                <span className="text-[9px] font-black text-slate-400 uppercase">قبل الخصم</span>
                                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{formatAmount(subtotalRaw)}</span>
                            </div>

                            <div className="bg-indigo-600 text-white p-2 rounded-[1.5rem] flex flex-col items-center justify-center shadow-xl h-16 col-span-1">
                                <span className="text-[9px] font-black opacity-70 uppercase">الصافي</span>
                                <span className="text-lg font-black">{formatCurrency(finalTotal, settings?.currency)}</span>
                                {partnerProfitText && <span className="text-[8px] opacity-80 mt-0.5 truncate max-w-full px-1">{partnerProfitText}</span>}
                            </div>

                            <div className="flex gap-3 col-span-2">
                                <Button onClick={() => handleCheckout('Cash')} className="bg-emerald-500 h-16 flex-1 rounded-2xl text-sm font-black shadow-lg hover:bg-emerald-600 transition-all active:scale-95">دفع كاش</Button>
                                <Button onClick={() => setShowSplitModal(true)} className="bg-amber-500 h-16 flex-1 rounded-2xl text-sm font-black shadow-lg hover:bg-amber-600 transition-all active:scale-95"><CreditCard size={20}/></Button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            <ReceiptModal isOpen={showReceipt} onClose={() => setShowReceipt(false)} sale={lastSale} />
            <SplitPaymentModal isOpen={showSplitModal} onClose={() => setShowSplitModal(false)} totalAmount={finalTotal} onConfirm={(p) => { handleCheckout('Split', p); setShowSplitModal(false); }} />
            <InstallmentSetupModal 
                isOpen={showInstallmentModal} 
                onClose={() => setShowInstallmentModal(false)} 
                totalAmount={finalTotal} 
                downPayment={pendingSplitPayments ? pendingSplitPayments.filter(p => p.method !== 'Credit').reduce((a,b) => a + b.amount, 0) : 0} 
                defaultInterestRate={0} 
                onSave={(plan) => { handleCheckout('Split', pendingSplitPayments || undefined, plan); setShowInstallmentModal(false); }} 
            />
            <Modal isOpen={isNewCustModalOpen} onClose={() => setIsNewCustModalOpen(false)} title="إضافة عميل"><CustomerForm customer={null} onCancel={() => setIsNewCustModalOpen(false)} isLoading={false} onSave={async (d) => { const newC = await api.saveCustomer(d); setCustomers([...customers, newC]); setSelectedCustomerId(newC.id); setIsNewCustModalOpen(false); addToast('تم الحفظ', 'success'); }} /></Modal>
            <ShiftManagerModal isOpen={isShiftModalOpen} onClose={() => setIsShiftModalOpen(false)} />
        </div>
    );
};

export default PosPage;
