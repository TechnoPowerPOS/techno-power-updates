
import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/mockApi';
import type { Product, Sale, Customer, Warehouse, Treasury, PaymentDetail } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import CustomerForm from '../components/customers/CustomerForm';
import { Search, ShoppingCart, Trash2, Plus, Minus, User, Warehouse as WhIcon, Wallet, Percent, Truck, UserPlus, Gift, CreditCard, DollarSign, Lock, Coins, Calendar, FileText, Clock } from 'lucide-react';
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
    const limits = getPlanLimits(licenseInfo?.type || 'Free');
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    const [products, setProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [treasuries, setTreasuries] = useState<Treasury[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    
    const [searchTerm, setSearchTerm] = useState('');
    const [topProducts, setTopProducts] = useState<Product[]>([]);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
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
    
    const [showVariantPicker, setShowVariantPicker] = useState(false);
    const [productForVariant, setProductForVariant] = useState<Product | null>(null);

    const handleProductSelect = (p: Product) => {
        if (p.hasVariants && p.variants && p.variants.length > 0) {
            setProductForVariant(p);
            setShowVariantPicker(true);
        } else {
            addToCart(p);
            addToast(`تم إضافة ${p.name} للسلة`, 'success');
            setSearchTerm('');
        }
    };

    useBarcodeScanner((barcode) => {
        // Check if barcode represents a sales invoice
        api.getSales().then((sales) => {
            const foundSale = sales.find((s: any) => s.id.toLowerCase() === barcode.trim().toLowerCase());
            if (foundSale) {
                // Load this invoice for exchange!
                navigate(`/pos?exchangeId=${foundSale.id}`, { replace: true });
                addToast(`تم تحميل الفاتورة رقم ${foundSale.id} لعمل استبدال`, 'success');
                return;
            }

            // Fallback: search for a product with this barcode/sku
            let foundProduct = products.find(p => p.sku === barcode);
            let foundVariant = undefined;
            
            if (!foundProduct) {
                for (const p of products) {
                    if (p.hasVariants && p.variants) {
                        const v = p.variants.find(v => v.barcode === barcode || v.sku === barcode);
                        if (v) {
                            foundProduct = p;
                            foundVariant = v;
                            break;
                        }
                    }
                }
            }

            if (foundProduct) {
                if (foundProduct.hasVariants && foundProduct.variants?.length && !foundVariant) {
                    setProductForVariant(foundProduct);
                    setShowVariantPicker(true);
                } else {
                    addToCart(foundProduct, foundVariant);
                    addToast(`تم إضافة ${foundProduct.name} للسلة`, 'success');
                }
            } else {
                addToast(`المنتج ذو الباركود ${barcode} غير موجود`, 'error');
            }
        }).catch((err) => {
            console.error("Error fetching sales during barcode scan", err);
        });
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

            // Calculate Best Sellers
            try {
                const salesCounts: Record<string, number> = {};
                allSales.forEach((sale: any) => {
                    if (sale && sale.items && Array.isArray(sale.items)) {
                        sale.items.forEach((item: any) => {
                            if (item && item.id) {
                                salesCounts[item.id] = (salesCounts[item.id] || 0) + (item.quantity || 0);
                            }
                        });
                    }
                });
                const sorted = [...p].sort((a, b) => {
                    const countA = salesCounts[a.id] || 0;
                    const countB = salesCounts[b.id] || 0;
                    return countB - countA;
                });
                setTopProducts(sorted.slice(0, 5));
            } catch (err) {
                console.error("Error computing top selling products:", err);
                setTopProducts(p.slice(0, 5));
            }

            // Load Draft invoice if draftId parameter is present
            const draftId = searchParams.get('draftId');
            if (draftId) {
                const drafts = await api.getSalesDrafts();
                const foundDraft = drafts.find((d: any) => d.id === draftId);
                if (foundDraft) {
                    setCart(foundDraft.items || []);
                    setSelectedCustomerId(foundDraft.customerId || 'cust-1');
                    if (foundDraft.warehouseId) setSelectedWhId(foundDraft.warehouseId);
                    if (foundDraft.treasuryId) setSelectedTrId(foundDraft.treasuryId);
                    if (foundDraft.globalDiscount !== undefined) setGlobalDiscount(foundDraft.globalDiscount);
                    if (foundDraft.globalDiscountType) setGlobalDiscountType(foundDraft.globalDiscountType);
                    if (foundDraft.shippingCost !== undefined) setShippingCost(foundDraft.shippingCost);
                    addToast('تم استعادة واستكمال الفاتورة المسودة بنجاح.', 'success');
                }
            }

            // Load Reservation
            const reservationId = searchParams.get('reservationId');
            if (reservationId) {
                const allSales = await api.getSales();
                const foundRes = allSales.find((d: any) => d.id === reservationId && d.status === 'Reservation');
                if (foundRes) {
                    setCart(foundRes.items || []);
                    setSelectedCustomerId(foundRes.customer?.id || 'cust-1');
                    if (foundRes.warehouseId) setSelectedWhId(foundRes.warehouseId);
                    if (foundRes.treasuryId) setSelectedTrId(foundRes.treasuryId);
                    if (foundRes.discount !== undefined) setGlobalDiscount(foundRes.discount);
                    if (foundRes.discountType) setGlobalDiscountType(foundRes.discountType);
                    if (foundRes.shipping !== undefined) setShippingCost(foundRes.shipping);
                    addToast('تم استعادة بيانات الحجز بنجاح للاستكمال.', 'success');
                }
            }
            
            // Load Exchange / Edit
            const exchangeId = searchParams.get('exchangeId') || searchParams.get('edit');
            if (exchangeId) {
                const allSales = await api.getSales();
                const foundEx = allSales.find((d: any) => d.id === exchangeId);
                if (foundEx) {
                    setExchangeSale(foundEx);
                    // Flag items as from old sale if needed, but for now just load them into cart
                    setCart(foundEx.items || []);
                    setSelectedCustomerId(foundEx.customer?.id || 'cust-1');
                    if (foundEx.warehouseId) setSelectedWhId(foundEx.warehouseId);
                    if (foundEx.treasuryId) setSelectedTrId(foundEx.treasuryId);
                    if (foundEx.discount !== undefined) setGlobalDiscount(foundEx.discount);
                    if (foundEx.discountType) setGlobalDiscountType(foundEx.discountType);
                    if (foundEx.shipping !== undefined) setShippingCost(foundEx.shipping);
                    addToast(`جاري استبدال/تعديل الفاتورة رقم ${foundEx.id}`, 'info');
                }
            }
        };
        load();
    }, [searchParams]);

    const [showReservationModal, setShowReservationModal] = useState(false);
    const [reservationDays, setReservationDays] = useState(1);
    const [exchangeSale, setExchangeSale] = useState<any>(null);

    const handleReservation = async () => {
        if (!cart.length) {
            addToast('سلة المبيعات فارغة، لا يمكن حجز الفاتورة.', 'warning');
            return;
        }
        setShowReservationModal(true);
    };

    const confirmReservation = async () => {
        setShowReservationModal(false);
        await handleCheckout('Reservation' as any, undefined, undefined, reservationDays);
    };

    const handleSaveDraft = async () => {
        if (!cart.length) {
            addToast('سلة المبيعات فارغة، لا يمكن حفظ مسودة فارغة.', 'warning');
            return;
        }
        try {
            const existingDraftId = searchParams.get('draftId') || undefined;
            await api.saveSalesDraft({
                id: existingDraftId,
                customerId: selectedCustomerId,
                customerName: selectedCustomer?.name,
                items: cart,
                total: finalTotal,
                warehouseId: selectedWhId,
                treasuryId: selectedTrId,
                globalDiscount,
                globalDiscountType,
                shippingCost,
                date: new Date().toISOString()
            });
            addToast('تم حفظ الفاتورة كمسودة بنجاح!', 'success');
            setCart([]);
            setGlobalDiscount(0);
            setShippingCost(0);
            setPointsToRedeem(0);
            if (existingDraftId) {
                navigate('/pos', { replace: true });
            }
        } catch (error) {
            addToast('حدث خطأ أثناء حفظ المسودة.', 'error');
        }
    };

    useEffect(() => {
        if (!settings?.enableOffers) return;
        setCart(prev => {
            let hasChanges = false;
            const newCart = prev.map(item => {
                const product = products.find(p => p.id === (item.productId || item.id));
                if (!product || product.offerType === 'none' || !product.offerType) return item;
                
                let calculatedDiscountPercent = 0;
                
                if (product.offerType === 'seasonal') {
                    if (product.offerDiscountType === 'percent') {
                        calculatedDiscountPercent = product.offerDiscountValue || 0;
                    } else if (product.offerDiscountType === 'amount' && item.sellPrice > 0) {
                        calculatedDiscountPercent = ((product.offerDiscountValue || 0) / item.sellPrice) * 100;
                    }
                } else if (product.offerType === 'bundle') {
                    const totalQtyForProduct = prev.filter(i => (i.productId || i.id) === product.id).reduce((s, i) => s + (i.isReturn ? 0 : i.quantity), 0);
                    if (totalQtyForProduct >= (product.offerThreshold || 1)) {
                        if (product.offerDiscountType === 'percent') {
                            calculatedDiscountPercent = product.offerDiscountValue || 0;
                        } else if (product.offerDiscountType === 'amount' && item.sellPrice > 0) {
                            calculatedDiscountPercent = ((product.offerDiscountValue || 0) / item.sellPrice) * 100;
                        }
                    }
                }
                
                if (Math.abs((item.discountPercent || 0) - calculatedDiscountPercent) > 0.01) {
                    hasChanges = true;
                    return { ...item, discountPercent: calculatedDiscountPercent };
                }
                return item;
            });
            return hasChanges ? newCart : prev;
        });
    }, [cart, products, settings?.enableOffers]);

    const selectedCustomer = useMemo(() => customers.find(c => c.id === selectedCustomerId), [customers, selectedCustomerId]);
    
    const pointsDiscount = useMemo(() => {
        if (!limits.hasLoyalty || !settings?.loyaltySettings?.enabled || !selectedCustomer) return 0;
        const rate = settings.loyaltySettings.redemptionRate || 0;
        return Math.min(pointsToRedeem * rate, (selectedCustomer.points || 0) * rate);
    }, [pointsToRedeem, selectedCustomer, settings, limits.hasLoyalty]);

    const subtotalRaw = useMemo(() => cart.reduce((s, i) => s + ((i.sellPrice || 0) * i.quantity * (i.isReturn ? -1 : 1)), 0), [cart]);

    const subtotal = useMemo(() => cart.reduce((s, i) => {
        const price = i.sellPrice || 0;
        const discount = i.discountPercent ? (price * i.discountPercent / 100) : 0;
        return s + ((price - discount) * i.quantity * (i.isReturn ? -1 : 1));
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

    const exchangeDiff = useMemo(() => {
        if (!exchangeSale) return null;
        return finalTotal - (exchangeSale.total || 0);
    }, [finalTotal, exchangeSale]);

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

    const handleDeferredCheckoutClick = () => {
        if (!selectedCustomer) {
            addToast('يرجى اختيار عميل أولاً لإعداد خطة تقسيط / دفع آجل.', 'warning');
            return;
        }
        if (!cart.length) {
            addToast('سلة المبيعات فارغة.', 'warning');
            return;
        }
        setPendingSplitPayments([{ method: 'Credit', amount: finalTotal }]);
        setShowInstallmentModal(true);
    };

    const handleCheckout = async (method: 'Cash' | 'Card' | 'Transfer' | 'Split' | 'Credit' | 'Reservation', payments?: PaymentDetail[], plan?: any, reservationExpiryDays?: number) => {
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

            const activeReservationId = searchParams.get('reservationId');
            
            const actualMethod = method === 'Reservation' ? 'Credit' : method;
            const amountPaid = method === 'Split' ? (payments?.filter(p => p.method !== 'Credit').reduce((a, b) => a + b.amount, 0) || 0) : ((method === 'Credit' || method === 'Reservation') ? 0 : finalTotal);
            
            let expiryDate = undefined;
            if (method === 'Reservation' && reservationExpiryDays) {
                const d = new Date();
                d.setDate(d.getDate() + reservationExpiryDays);
                expiryDate = d.toISOString();
            }

            const res = await api.saveSale({
                id: activeReservationId || exchangeSale?.id || undefined,
                reservationExpiryDate: expiryDate,
                customer: { id: selectedCustomerId, name: selectedCustomer?.name, phone: selectedCustomer?.phone },
                cashier: { id: 'u-1', name: 'المدير' },
                employeeId: selectedEmployeeId || undefined,
                commissionAmount,
                items: cart.map(i => ({
                    ...i,
                    discount: (i.sellPrice * (i.discountPercent || 0) / 100)
                })),
                subtotal, total: finalTotal, amountPaid,
                paymentMethod: actualMethod, discount: globalDiscount, discountType: globalDiscountType,
                shipping: shippingCost, warehouseId: selectedWhId, treasuryId: selectedTrId,
                payments: payments || (actualMethod !== 'Split' ? [{ method: actualMethod as any, amount: finalTotal }] : []),
                installmentPlan: plan, pointsRedeemed: pointsToRedeem,
                shiftId: currentShift?.id,
                status: method === 'Reservation' ? 'Reservation' : undefined
            });
            
            if (method === 'Reservation') {
                setCart([]); setGlobalDiscount(0); setShippingCost(0); setPointsToRedeem(0); setPendingSplitPayments(null); setExchangeSale(null);
                addToast('تم حجز القطع بنجاح.', 'success');
                setIsSubmitting(false);
                return;
            }
            
            setLastSale(res); setShowReceipt(true); setCart([]); setGlobalDiscount(0); setShippingCost(0); setPointsToRedeem(0); setPendingSplitPayments(null); setExchangeSale(null);
            
            // Delete draft if checkout was completed from an active draft
            const activeDraftId = searchParams.get('draftId');
            if (activeDraftId) {
                await api.deleteSalesDraft(activeDraftId);
                navigate('/pos', { replace: true });
            }

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

            addToast('تم إنشاء فاتورة المبيعات وحفظها بنجاح!', 'success');

            // Auto WhatsApp logic
            whatsappService.autoSendInvoice(res, settings as any);
            
        } catch (e) { addToast('فشل إتمام العملية', 'error'); } finally { setIsSubmitting(false); }
    };

    const addToCart = (p: Product, variant?: any) => {
        let stockInWh = p.warehouseStocks?.[selectedWhId] || 0;
        if (variant && variant.stock !== undefined) {
            stockInWh = variant.stock;
        }

        const cartItemId = variant ? `${p.id}-${variant.id}` : p.id;
        const currentQty = cart.find(i => i.id === cartItemId)?.quantity || 0;
        
        if (currentQty >= stockInWh && !settings?.inventorySettings?.allowSaleWithoutStock) {
            addToast('لا يمكن تجاوز المخزون المتاح في المستودع للطراز المختار', 'error');
            return;
        }
        
        setCart(prev => {
            const ex = prev.find(i => i.id === cartItemId);
            if (ex) return prev.map(i => i.id === cartItemId ? {...i, quantity: i.quantity + 1} : i);
            
            const nameWithVariant = variant ? `${p.name} (${variant.size || ''} ${variant.color || ''})`.trim() : p.name;
            return [...prev, { id: cartItemId, productId: p.id, variantId: variant?.id, name: nameWithVariant, quantity: 1, sellPrice: p.sellPrice, costPrice: p.costPrice, discountPercent: 0, isReturn: false }];
        });
        setSearchTerm('');
    };

    const handleBarcodeSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && searchTerm.trim()) {
            // Check direct product barcode/sku
            let found = products.find(p => p.sku === searchTerm.trim() || p.id === searchTerm.trim());
            let foundVariant = undefined;

            // Check variants if not found or if we want exact variant match
            if (!found) {
                for (const p of products) {
                    if (p.variants) {
                        const variant = p.variants.find(v => v.barcode === searchTerm.trim());
                        if (variant) {
                            found = p;
                            foundVariant = variant;
                            break;
                        }
                    }
                }
            }
            
            if (found) {
                if (settings?.enableSoundEffects) {
                    const audio = new Audio('/beep.mp3'); // or pure browser beep
                    audio.play().catch(()=>{});
                }
                addToCart(found, foundVariant);
            } else {
                addToast('لم يتم العثور على المنتج', 'error');
            }
        }
    };

    const filteredSearchResults = useMemo(() => {
        if (!searchTerm.trim()) return [];
        return products.filter(p => {
            const matchesQuery = p.name.includes(searchTerm) || p.sku.includes(searchTerm) || p.variants?.some(v => v.barcode === searchTerm);
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
                        <button key={p.id} onClick={() => handleProductSelect(p)} className="bg-white dark:bg-slate-800 rounded-2xl p-3 border border-slate-100 dark:border-slate-700 hover:border-indigo-300 shadow-sm flex flex-col items-center justify-between aspect-square transition-all hover:scale-[1.02] hover:shadow-md">
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
                            placeholder="إضافة منتج أو متغير للسلة (بحث أو مسح باركود)..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            onFocus={() => setIsSearchFocused(true)}
                            onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
                            onKeyDown={handleBarcodeSearch}
                            className="w-full h-10 ps-10 rounded-xl bg-white dark:bg-slate-900 border-2 border-indigo-100 dark:border-slate-700 font-black text-xs outline-none shadow-sm focus:border-indigo-500 transition-colors"
                        />
                        {((isSearchFocused && !searchTerm) || searchTerm) && (
                            <div className="absolute top-full left-0 right-0 z-[100] mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-xl border dark:border-slate-700 max-h-60 overflow-y-auto">
                                {!searchTerm ? (
                                    <>
                                        <div className="p-2.5 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 font-black text-[10px] border-b dark:border-slate-700 flex items-center gap-1.5 justify-between">
                                            <span>المنتجات الأكثر مبيعاً</span>
                                            <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-[9px] rounded font-bold">اقتراح ذكي</span>
                                        </div>
                                        {topProducts.slice(0, 5).map(p => (
                                            <button key={p.id} type="button" onClick={() => handleProductSelect(p)} className="w-full p-2.5 border-b dark:border-slate-700 flex justify-between hover:bg-slate-50 dark:hover:bg-slate-800 font-black text-xs text-start transition-colors items-center">
                                                <span className="flex items-center gap-1.5">
                                                    {p.name}
                                                    <span className="text-emerald-500 font-bold text-[9px] bg-emerald-100 dark:bg-emerald-950/30 px-1 py-0.5 rounded">الرصيد: {toArabicIndic(p.warehouseStocks?.[selectedWhId] || 0)}</span>
                                                </span>
                                                <span className="text-indigo-600">{formatAmount(p.sellPrice)}</span>
                                            </button>
                                        ))}
                                    </>
                                ) : (
                                    <>
                                        {filteredSearchResults.map(p => (
                                            <button key={p.id} type="button" onClick={() => handleProductSelect(p)} className="w-full p-2.5 border-b dark:border-slate-700 flex justify-between hover:bg-indigo-50 font-black text-xs text-start">
                                                <span>{p.name} <span className="text-emerald-500 ms-1">({toArabicIndic(p.warehouseStocks?.[selectedWhId] || 0)})</span></span>
                                                <span className="text-indigo-600">{formatAmount(p.sellPrice)}</span>
                                            </button>
                                        ))}
                                        {filteredSearchResults.length === 0 && <p className="p-3 text-center text-[10px] text-slate-400 font-bold">لا توجد نتائج</p>}
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {cart.map(item => (
                        <div key={item.id} className="flex gap-2 items-center p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                    <h4 className="font-black text-xs truncate">{item.name}</h4>
                                    {settings?.enableExchange && (
                                        <button onClick={() => setCart(prev => prev.map(i => i.id === item.id ? {...i, isReturn: !i.isReturn} : i))}
                                         className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${item.isReturn ? 'bg-rose-100 text-rose-600' : 'bg-slate-200 text-slate-500'}`}
                                         title="تبديل بين بيع/إرجاع">
                                            {item.isReturn ? 'مرتجع' : 'إرجاع'}
                                        </button>
                                    )}
                                </div>
                                <div className="text-indigo-600 font-bold text-[10px] mt-1">{formatAmount(item.sellPrice)} <span className="text-slate-400 font-normal">{(item.discountPercent || 0)>0 && `(-${item.discountPercent}%)`}</span></div>
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
                    {exchangeDiff !== null ? (
                        <div className="flex flex-col mb-4">
                            <div className="flex justify-between items-center text-xs text-slate-500 line-through">
                                <span>الفاتورة الأصلية</span>
                                <span>{formatCurrency(exchangeSale?.total || 0, settings?.currency)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs text-slate-500">
                                <span>الفاتورة الجديدة</span>
                                <span>{formatCurrency(finalTotal, settings?.currency)}</span>
                            </div>
                            <div className="flex justify-between items-center mt-2 border-t border-slate-200 dark:border-slate-700 pt-2">
                                <span className="font-black text-xs text-slate-500">الفرق ({exchangeDiff > 0 ? 'مطلوب من العميل' : exchangeDiff < 0 ? 'مستحق للعميل' : 'لا يوجد فرق'})</span>
                                <span className={`font-black text-xl ${exchangeDiff > 0 ? 'text-rose-600' : exchangeDiff < 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                                    {formatCurrency(Math.abs(exchangeDiff), settings?.currency)}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex justify-between items-center mb-4">
                            <span className="font-black text-xs text-slate-500">الإجمالي</span>
                            <span className="font-black text-2xl text-indigo-600">{formatCurrency(finalTotal, settings?.currency)}</span>
                        </div>
                    )}
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-2 [&>*]:flex-1 [&>*]:min-w-[100px]">
                            <Button onClick={() => handleCheckout('Cash')} className="bg-emerald-500 h-12 rounded-xl text-[11px] font-black shadow-lg shadow-emerald-500/20 px-2">دفع كاش</Button>
                            {limits.hasMixedPayment && (
                                <Button onClick={() => setShowSplitModal(true)} className="bg-slate-800 dark:bg-slate-700 h-12 rounded-xl text-[11px] font-black shadow-lg flex items-center justify-center gap-1.5 px-2"><CreditCard size={14} className="shrink-0"/> دفع مختلط</Button>
                            )}
                            {limits.hasDeferredPayment && (
                                <Button onClick={handleDeferredCheckoutClick} className="bg-indigo-600 hover:bg-indigo-700 text-white h-12 rounded-xl text-[11px] font-black shadow-lg flex items-center justify-center gap-1.5 px-2"><Calendar size={14} className="shrink-0"/> دفع آجل</Button>
                            )}
                            {limits.hasSalesDrafts && (
                                <Button onClick={handleSaveDraft} className="bg-amber-600 hover:bg-amber-700 text-white h-12 rounded-xl text-[11px] font-black shadow-md flex items-center justify-center gap-1.5 px-2">حفظ مسودة</Button>
                            )}
                            {limits.hasReservations && settings?.enableReservations && (
                                <Button onClick={handleReservation} className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white h-12 rounded-xl text-[11px] font-black shadow-md flex items-center justify-center gap-1.5 px-2"><Clock size={14} className="shrink-0"/> حجز</Button>
                            )}
                        </div>
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
                                    placeholder="إضافة منتج سريع للسلة (اسم أو متغيّر أو باركود)..." 
                                    value={searchTerm} 
                                    onChange={e => setSearchTerm(e.target.value)} 
                                    onFocus={() => setIsSearchFocused(true)}
                                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
                                    onKeyDown={handleBarcodeSearch}
                                    className="w-full h-12 ps-12 rounded-xl bg-white dark:bg-slate-900 border-2 border-indigo-100 dark:border-slate-700 font-black text-sm outline-none shadow-sm focus:border-indigo-500 transition-colors"
                                />
                                {((isSearchFocused && !searchTerm) || searchTerm) && (
                                    <div className="absolute top-full left-0 right-0 z-[100] mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-xl border dark:border-slate-700 max-h-60 overflow-y-auto w-full">
                                        {!searchTerm ? (
                                            <>
                                                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 font-black text-xs border-b dark:border-slate-700 flex items-center gap-1.5 justify-between">
                                                    <span>المنتجات الأكثر مبيعاً</span>
                                                    <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-[10px] rounded font-bold">اقتراح ذكي</span>
                                                </div>
                                                {topProducts.slice(0, 5).map(p => (
                                                    <button key={p.id} type="button" onClick={() => handleProductSelect(p)} className="w-full p-3 border-b dark:border-slate-700 flex justify-between hover:bg-slate-50 dark:hover:bg-slate-800 font-black text-xs text-start transition-colors items-center">
                                                        <span className="flex items-center gap-2">
                                                            {p.name}
                                                            <span className="text-emerald-500 font-bold text-[10px] bg-emerald-100 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded">الرصيد: {toArabicIndic(p.warehouseStocks?.[selectedWhId] || 0)}</span>
                                                        </span>
                                                        <span className="text-indigo-600">{formatAmount(p.sellPrice)}</span>
                                                    </button>
                                                ))}
                                            </>
                                        ) : (
                                            <>
                                                {filteredSearchResults.map(p => (
                                                    <button key={p.id} type="button" onClick={() => handleProductSelect(p)} className="w-full p-3 border-b dark:border-slate-700 flex justify-between hover:bg-indigo-50 font-black text-xs text-start">
                                                        <span>{p.name} <span className="text-emerald-500 ms-2">({toArabicIndic(p.warehouseStocks?.[selectedWhId] || 0)})</span></span>
                                                        <span className="text-indigo-600">{formatAmount(p.sellPrice)}</span>
                                                    </button>
                                                ))}
                                                {filteredSearchResults.length === 0 && <p className="p-4 text-center text-xs text-slate-400 font-bold">لا توجد نتائج</p>}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            {cart.map(item => (
                                <div key={item.id} className="grid grid-cols-12 gap-2 items-center p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-700/50 hover:border-indigo-300 transition-colors">
                                    <div className="col-span-5 flex flex-col">
                                        <div className="flex items-center gap-1">
                                            <span className="font-black text-xs truncate">{item.name}</span>
                                            {settings?.enableExchange && (
                                                <button onClick={() => setCart(prev => prev.map(i => i.id === item.id ? {...i, isReturn: !i.isReturn} : i))}
                                                 className={`text-[9px] px-1 py-0.5 rounded font-bold ${item.isReturn ? 'bg-rose-100 text-rose-600' : 'bg-slate-200 text-slate-500'}`}
                                                 title="تبديل بين بيع/إرجاع">
                                                    {item.isReturn ? 'مرتجع' : 'إرجاع'}
                                                </button>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-slate-400">SKU: {products.find(p=>p.id===item.productId)?.sku || products.find(p=>p.id===item.id)?.sku}</span>
                                    </div>
                                    <div className="col-span-2">
                                        <input type="number" step="0.01" value={item.sellPrice ?? ''} onChange={e => setCart(prev => prev.map(i => i.id === item.id ? {...i, sellPrice: parseFloat(e.target.value)||0} : i))} className="w-full p-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-black text-xs text-indigo-600 bg-white dark:bg-slate-800"/>
                                    </div>
                                    <div className="col-span-1 flex items-center justify-center gap-1">
                                        <button onClick={() => setCart(prev => prev.map(i => i.id === item.id ? {...i, quantity: Math.max(1, i.quantity - 1)} : i))} className="p-1 text-slate-400 hover:bg-white dark:hover:bg-slate-700 rounded"><Minus size={10}/></button>
                                        <input type="number" min="1" value={item.quantity ?? ''} onChange={e => setCart(prev => prev.map(i => i.id === item.id ? {...i, quantity: Math.max(1, parseInt(e.target.value) || 1)} : i))} className="w-10 bg-[#f8fafc] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center font-black text-xs p-1 rounded-md [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                        <button onClick={() => setCart(prev => prev.map(i => i.id === item.id ? {...i, quantity: i.quantity + 1} : i))} className="p-1 text-indigo-600 hover:bg-white dark:hover:bg-slate-700 rounded"><Plus size={10}/></button>
                                    </div>
                                    <div className="col-span-2 flex justify-center">
                                        <input type="number" value={item.discountPercent ?? ''} onChange={e => setCart(prev => prev.map(i => i.id === item.id ? {...i, discountPercent: parseFloat(e.target.value)||0} : i))} className="w-12 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-center text-[10px] font-bold py-1.5"/>
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

                            <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-2xl flex flex-col items-center justify-center h-16 col-span-1 border border-slate-100 dark:border-slate-800 shadow-sm">
                                <span className="text-[9px] font-black text-slate-400 uppercase">قبل الخصم</span>
                                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{formatAmount(subtotalRaw)}</span>
                            </div>

                            {exchangeDiff !== null ? (
                                <div className={`${exchangeDiff > 0 ? 'bg-rose-600' : exchangeDiff < 0 ? 'bg-emerald-600' : 'bg-slate-600'} text-white p-2 rounded-[1.5rem] flex flex-col items-center justify-center shadow-xl h-16 col-span-1 border border-white/10 ring-2 ring-black/5`}>
                                    <span className="text-[9px] font-black opacity-70 uppercase tracking-widest">{exchangeDiff > 0 ? 'الفرق (مطلوب)' : exchangeDiff < 0 ? 'الفرق (مستحق)' : 'لا فرق'}</span>
                                    <span className="text-lg font-black leading-none mt-1">{formatCurrency(Math.abs(exchangeDiff), settings?.currency)}</span>
                                </div>
                            ) : (
                                <div className="bg-indigo-600 text-white p-2 rounded-[1.5rem] flex flex-col items-center justify-center shadow-xl h-16 col-span-1 border border-indigo-500 ring-2 ring-indigo-500/20">
                                    <span className="text-[9px] font-black opacity-70 uppercase tracking-widest">صافي المطلوب</span>
                                    <span className="text-lg font-black leading-none mt-1">{formatCurrency(finalTotal, settings?.currency)}</span>
                                    {partnerProfitText && <span className="text-[8px] opacity-80 mt-1 truncate max-w-full px-1">{partnerProfitText}</span>}
                                </div>
                            )}

                            <div className="col-span-full mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex flex-wrap gap-2 lg:gap-3 [&>*]:flex-1 [&>*]:min-w-[120px]">
                                    <Button onClick={() => handleCheckout('Cash')} className="bg-emerald-500 h-14 rounded-2xl text-xs font-black shadow-lg shadow-emerald-500/15 hover:bg-emerald-600 transition-all active:scale-95 flex items-center justify-center gap-2 group px-2"><Coins size={16} className="group-hover:scale-110 transition-transform shrink-0"/>دفع كاش</Button>
                                    
                                    {limits.hasMixedPayment && (
                                        <Button onClick={() => setShowSplitModal(true)} className="bg-amber-500 h-14 rounded-2xl text-xs font-black shadow-lg shadow-amber-500/15 hover:bg-amber-600 transition-all active:scale-95 flex items-center justify-center gap-2 group px-2"><CreditCard size={16} className="group-hover:scale-110 transition-transform shrink-0"/>مختلط</Button>
                                    )}
                                    
                                    {limits.hasDeferredPayment && (
                                        <Button onClick={handleDeferredCheckoutClick} className="bg-indigo-600 h-14 rounded-2xl text-xs font-black shadow-lg shadow-indigo-600/15 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2 group px-2"><Calendar size={16} className="group-hover:scale-110 transition-transform shrink-0"/>دفع آجل</Button>
                                    )}
                                    
                                    {limits.hasSalesDrafts && (
                                        <Button onClick={handleSaveDraft} className="bg-slate-700 h-14 rounded-2xl text-xs font-black shadow-lg shadow-slate-700/15 hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2 group px-2"><FileText size={16} className="group-hover:scale-110 transition-transform shrink-0"/>مسودة</Button>
                                    )}
                                    {limits.hasReservations && settings?.enableReservations && (
                                        <Button onClick={handleReservation} className="bg-fuchsia-600 h-14 rounded-2xl text-xs font-black shadow-lg shadow-fuchsia-600/15 hover:bg-fuchsia-700 transition-all active:scale-95 flex items-center justify-center gap-2 group px-2"><Clock size={16} className="group-hover:scale-110 transition-transform shrink-0"/>حجز</Button>
                                    )}
                                </div>
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
            <Modal isOpen={showReservationModal} onClose={() => setShowReservationModal(false)} title="تأكيد الحجز">
                <div className="space-y-4">
                    <p className="font-bold text-sm text-slate-600 dark:text-slate-400">حدد عدد أيام الحجز. سيتم إلغاء الحجز وإرجاع المنتجات للمخزون إذا لم يتم الاستكمال قبل انتهاء المدة.</p>
                    <div>
                        <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">عدد الأيام</label>
                        <input type="number" min="1" max="30" value={reservationDays} onChange={e => setReservationDays(parseInt(e.target.value) || 1)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <Button variant="secondary" onClick={() => setShowReservationModal(false)}>إلغاء</Button>
                        <Button onClick={confirmReservation} className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-4">تأكيد الحجز</Button>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={showVariantPicker} onClose={() => { setShowVariantPicker(false); setProductForVariant(null); }} title={`اختر مقاس/لون - ${productForVariant?.name || ''}`}>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {productForVariant?.variants?.map(v => {
                        const isOutOfStock = v.stock === 0;
                        return (
                        <button key={v.id} onClick={() => {
                            if (isOutOfStock) return;
                            addToCart(productForVariant, v);
                            addToast(`تم إضافة ${productForVariant.name} (${v.color||''} - ${v.size||''}) للسلة`, 'success');
                            setShowVariantPicker(false);
                            setProductForVariant(null);
                            setSearchTerm('');
                        }} disabled={isOutOfStock} className={`flex flex-col items-center justify-center p-3 border rounded-xl transition-all text-center gap-1 ${isOutOfStock ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'}`}>
                            {v.color && <span className={`text-sm font-black ${isOutOfStock ? 'text-slate-400' : 'text-slate-800 dark:text-white'}`}>{v.color}</span>}
                            {v.size && <span className={`text-xs font-bold ${isOutOfStock ? 'text-slate-400' : 'text-slate-500'}`}>{v.size}</span>}
                            <span className={`text-[10px] px-2 rounded-full font-bold mt-1 ${isOutOfStock ? 'bg-slate-200 text-slate-500' : 'bg-emerald-100 text-emerald-600'}`}>الرصيد: {v.stock}</span>
                        </button>
                    )})}
                </div>
            </Modal>
            <ShiftManagerModal isOpen={isShiftModalOpen} onClose={() => setIsShiftModalOpen(false)} />
        </div>
    );
};

export default PosPage;
