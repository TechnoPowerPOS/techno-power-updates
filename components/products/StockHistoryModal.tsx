import React, { useState, useEffect } from 'react';
import type { Product } from '../../types';
import { api } from '../../services/mockApi';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { formatCurrency, toArabicIndic } from '../../utils/localization';
import { useToasts } from '../../hooks/useToasts';
import { useSettings } from '../../hooks/useSettings';
import { 
  History, Calendar, Info, RefreshCw, ArrowUpRight, ArrowDownLeft, 
  Settings, Loader, FileSpreadsheet, Package
} from 'lucide-react';

interface StockHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

const StockHistoryModal: React.FC<StockHistoryModalProps> = ({ isOpen, onClose, product }) => {
    const { addToast } = useToasts();
    const { settings } = useSettings();
    const [loading, setLoading] = useState(false);
    const [movements, setMovements] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen && product) {
            loadStockHistory();
        }
    }, [isOpen, product]);

    const loadStockHistory = async () => {
        if (!product) return;
        setLoading(true);
        try {
            // Fetch everything we need to compute full stock movements
            const [sales, purchases, activityLogs, transfers, salesReturns, purchaseReturns] = await Promise.all([
                api.getSales ? api.getSales() : Promise.resolve([]),
                api.getPurchases ? api.getPurchases() : Promise.resolve([]),
                api.getActivityLogs ? api.getActivityLogs() : Promise.resolve([]),
                api.getStockTransfers ? api.getStockTransfers() : Promise.resolve([]),
                api.getSalesReturns ? api.getSalesReturns() : Promise.resolve([]),
                api.getPurchaseReturns ? api.getPurchaseReturns() : Promise.resolve([])
            ]);

            const list: any[] = [];

            // 1. Sales
            sales.forEach((s: any) => {
                if (s.status === 'Refunded') return;
                const item = s.items?.find((it: any) => it.id === product.id);
                if (item) {
                    list.push({
                        date: s.date,
                        type: 'sale',
                        label: 'مبيعات كاشير',
                        change: -item.quantity,
                        qty: item.quantity,
                        price: item.sellPrice,
                        ref: s.invoiceNumber || s.id,
                        details: `بيع للعميل: ${s.customer?.name || 'عميل نقدي'}`
                    });
                }
            });

            // 2. Purchases
            purchases.forEach((p: any) => {
                const item = p.items?.find((it: any) => it.id === product.id);
                if (item) {
                    list.push({
                        date: p.date || p.createdAt,
                        type: 'purchase',
                        label: 'أمر شراء وارد',
                        change: item.quantity,
                        qty: item.quantity,
                        price: item.costPrice,
                        ref: p.invoiceNumber || p.id,
                        details: `التوريد من: ${p.supplierName || 'غير محدد'}`
                    });
                }
            });

            // 3. Stock Transfers
            transfers.forEach((st: any) => {
                // If transfer item list exists
                if (st.items) {
                    const item = st.items.find((it: any) => it.id === product.id);
                    if (item) {
                        list.push({
                            date: st.date || st.createdAt || new Date().toISOString(),
                            type: 'transfer',
                            label: 'تحويل بين المستودعات',
                            change: st.fromWarehouseId ? -item.quantity : item.quantity,
                            qty: item.quantity,
                            ref: st.transferNumber || st.id,
                            details: `من: ${st.fromWarehouseName || st.fromWarehouseId} -> إلى: ${st.toWarehouseName || st.toWarehouseId}`
                        });
                    }
                } else if (st.productId === product.id) {
                    list.push({
                        date: st.date || st.createdAt || new Date().toISOString(),
                        type: 'transfer',
                        label: 'تحويل بين المستودعات',
                        change: 0,
                        qty: st.quantity,
                        ref: st.id,
                        details: `من مخزن لآخر بمقدار ${st.quantity}`
                    });
                }
            });

            // 4. Sales Returns
            salesReturns.forEach((sr: any) => {
                const item = sr.items?.find((it: any) => it.id === product.id);
                if (item) {
                    list.push({
                        date: sr.date || sr.createdAt,
                        type: 'sale_return',
                        label: 'مرتجع مبيعات للرف',
                        change: item.returnQuantity || item.quantity,
                        qty: item.returnQuantity || item.quantity,
                        ref: sr.id,
                        details: `إرجاع من العميل للفاتورة الأصلية: ${sr.saleId || '-'}`
                    });
                }
            });

            // 5. Purchase Returns
            purchaseReturns?.forEach((pr: any) => {
                const item = pr.items?.find((it: any) => it.id === product.id);
                if (item) {
                    list.push({
                        date: pr.date || pr.createdAt,
                        type: 'purchase_return',
                        label: 'مرتجع مشتريات للمورد',
                        change: -(item.returnQuantity || item.quantity),
                        qty: item.returnQuantity || item.quantity,
                        ref: pr.id,
                        details: `استرجاع للمورد بأمر الشراء الأصلي: ${pr.purchaseId || '-'}`
                    });
                }
            });

            // 6. Manual Adjustments / Activity Logs
            activityLogs.forEach((log: any) => {
                const detailsStr = log.details || '';
                const actionStr = log.action || '';
                if (detailsStr.includes(product.name) || actionStr.includes(product.name)) {
                    list.push({
                        date: log.date || log.timestamp || new Date().toISOString(),
                        type: 'adjustment',
                        label: log.action || 'تسوية مخزنية',
                        change: detailsStr.includes('تم تعديل') ? 'تعديل' : 'معلومة',
                        ref: '-',
                        details: detailsStr
                    });
                }
            });

            // Sort movements by date descending
            list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setMovements(list);
        } catch (error) {
            addToast('حدث خطأ أثناء تحميل سجل حركة المخزون.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`سجل حركة المخزون: ${product?.name}`}>
            <div className="space-y-6 max-h-[75vh] overflow-y-auto px-1">
                
                {/* Product Summary Header Card */}
                {product && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 border rounded-2xl flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 rounded-xl">
                                <Package size={22} />
                            </div>
                            <div>
                                <h4 className="font-black text-slate-800 dark:text-slate-100 text-sm md:text-base">{product.name}</h4>
                                <span className="text-xs font-mono font-bold text-slate-400">SKU: {product.sku}</span>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="text-center">
                                <span className="block text-[10px] font-black text-slate-400">المخزون الكلي الحالي</span>
                                <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-base">{toArabicIndic(product.stock)}</span>
                            </div>
                            <div className="text-center border-s pr-4">
                                <span className="block text-[10px] font-black text-slate-400">سعر البيع</span>
                                <span className="font-extrabold text-slate-700 dark:text-slate-300 text-base">{formatCurrency(product.sellPrice, settings?.currency || 'EGP')}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Movements List Container */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                        <Loader className="animate-spin text-indigo-600" size={32} />
                        <span className="font-bold text-sm">جاري جرد وتجميع سجلات حركة المخزون...</span>
                    </div>
                ) : movements.length === 0 ? (
                    <div className="text-center py-16 border rounded-2xl bg-slate-50/50 flex flex-col items-center justify-center gap-2">
                        <History size={32} className="text-slate-300" />
                        <span className="font-bold text-slate-600 dark:text-slate-400">لا توجد حركات مسجلة لهذا المنتج بعد.</span>
                        <p className="text-xs text-slate-400 max-w-xs mt-1">أي عمليات بيع أو شراء أو جرد وتعديل مخزون ستظهر هنا كرصد تدفقي.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto border rounded-xl shadow-inner scrollbar-thin">
                        <table className="w-full text-right text-xs">
                            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 font-extrabold text-[10px] md:text-xs">
                                <tr>
                                    <th className="px-4 py-3">التاريخ والوقت</th>
                                    <th className="px-4 py-3">الحركة</th>
                                    <th className="px-4 py-3 text-center">التغيير</th>
                                    <th className="px-4 py-3">المرجع</th>
                                    <th className="px-4 py-3">تفاصيل المعاملة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {movements.map((m, idx) => {
                                    // Style formatting for stock changes
                                    const isNumericChange = typeof m.change === 'number';
                                    const isPositive = isNumericChange && m.change > 0;
                                    const isNegative = isNumericChange && m.change < 0;

                                    return (
                                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                            <td className="px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">
                                                {new Date(m.date).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                                            </td>
                                            <td className="px-4 py-3 font-extrabold">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                                    m.type === 'sale' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20' :
                                                    m.type === 'purchase' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' :
                                                    m.type === 'transfer' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20' :
                                                    m.type === 'sale_return' ? 'bg-purple-50 text-purple-600' :
                                                    'bg-amber-50 text-amber-600'
                                                }`}>
                                                    {m.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center font-black">
                                                {isPositive ? (
                                                    <span className="text-emerald-600 text-xs flex items-center justify-center gap-0.5" dir="ltr">
                                                        +{toArabicIndic(m.qty)}
                                                        <ArrowUpRight size={14} />
                                                    </span>
                                                ) : isNegative ? (
                                                    <span className="text-rose-600 text-xs flex items-center justify-center gap-0.5" dir="ltr">
                                                        -{toArabicIndic(m.qty)}
                                                        <ArrowDownLeft size={14} />
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-500 text-xs">{toArabicIndic(m.qty || 0)}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-slate-400 font-bold whitespace-nowrap">
                                                {m.ref}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-bold min-w-[200px]">
                                                {m.details}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="flex justify-end pt-2 border-t dark:border-slate-800">
                    <Button onClick={onClose} variant="ghost" className="rounded-xl px-5 h-10 font-bold hover:bg-slate-100 border-none">
                        إغلاق النافذة
                    </Button>
                </div>

            </div>
        </Modal>
    );
};

export default StockHistoryModal;
