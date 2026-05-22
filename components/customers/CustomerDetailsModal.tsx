
import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { api } from '../../services/mockApi';
import type { Customer, Sale, SalesReturn } from '../../types';
import { useSettings } from '../../hooks/useSettings';
import { formatCurrency, toArabicIndic } from '../../utils/localization';
import { FileText, RefreshCcw, Clock } from 'lucide-react';

interface CustomerDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: Customer | null;
}

const CustomerDetailsModal: React.FC<CustomerDetailsModalProps> = ({ isOpen, onClose, customer }) => {
    const [sales, setSales] = useState<Sale[]>([]);
    const [returns, setReturns] = useState<SalesReturn[]>([]);
    const [activeTab, setActiveTab] = useState<'sales' | 'returns'>('sales');
    const [loading, setLoading] = useState(false);
    const { settings } = useSettings();

    useEffect(() => {
        if (isOpen && customer) {
            const fetchData = async () => {
                setLoading(true);
                try {
                    const [salesData, returnsData] = await Promise.all([
                        api.getCustomerPurchaseHistory(customer.id),
                        api.getCustomerReturnsHistory(customer.id)
                    ]);
                    setSales(salesData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                    setReturns(returnsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                } catch (error) {
                    console.error("Failed to fetch customer history", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        }
    }, [isOpen, customer]);

    if (!customer) return null;

    const currency = settings?.currency || 'SAR';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`سجل العميل: ${customer.name}`}>
            <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-center">
                        <p className="text-xs text-slate-500">إجمالي المبيعات</p>
                        <p className="text-lg font-bold">{toArabicIndic(sales.length)}</p>
                    </div>
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-center">
                        <p className="text-xs text-slate-500">المديونية</p>
                        <p className={`text-lg font-bold ${customer.debt > 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {formatCurrency(customer.debt, currency)}
                        </p>
                    </div>
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-center">
                        <p className="text-xs text-slate-500">نقاط الولاء</p>
                        <p className="text-lg font-bold text-blue-500">{toArabicIndic(customer.points)}</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b dark:border-slate-700">
                    <button
                        onClick={() => setActiveTab('sales')}
                        className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
                            activeTab === 'sales'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                        }`}
                    >
                        <FileText size={16} /> سجل المشتريات
                    </button>
                    <button
                        onClick={() => setActiveTab('returns')}
                        className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
                            activeTab === 'returns'
                                ? 'border-red-500 text-red-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                        }`}
                    >
                        <RefreshCcw size={16} /> المرتجعات
                    </button>
                </div>

                {/* Content */}
                <div className="min-h-[200px] max-h-[400px] overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center h-full py-10">
                            <Clock className="animate-spin text-slate-400" size={32} />
                        </div>
                    ) : (
                        <>
                            {activeTab === 'sales' && (
                                <>
                                    {sales.length === 0 ? (
                                        <p className="text-center text-slate-500 py-10">لا يوجد سجل مشتريات.</p>
                                    ) : (
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                                                <tr>
                                                    <th className="p-2 text-start">رقم الفاتورة</th>
                                                    <th className="p-2 text-start">التاريخ</th>
                                                    <th className="p-2 text-end">الإجمالي</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sales.map(sale => (
                                                    <tr key={sale.id} className="border-b dark:border-slate-700">
                                                        <td className="p-2 font-mono">{sale.id.toUpperCase()}</td>
                                                        <td className="p-2">{new Date(sale.date).toLocaleDateString('en-GB')}</td>
                                                        <td className="p-2 text-end font-bold">{formatCurrency(sale.total, currency)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </>
                            )}

                            {activeTab === 'returns' && (
                                <>
                                    {returns.length === 0 ? (
                                        <p className="text-center text-slate-500 py-10">لا يوجد سجل مرتجعات.</p>
                                    ) : (
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                                                <tr>
                                                    <th className="p-2 text-start">رقم المرتجع</th>
                                                    <th className="p-2 text-start">الفاتورة الأصلية</th>
                                                    <th className="p-2 text-start">التاريخ</th>
                                                    <th className="p-2 text-end">المبلغ</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {returns.map(ret => (
                                                    <tr key={ret.id} className="border-b dark:border-slate-700">
                                                        <td className="p-2 font-mono">{ret.id.toUpperCase()}</td>
                                                        <td className="p-2 font-mono">{ret.originalSaleId.toUpperCase()}</td>
                                                        <td className="p-2">{new Date(ret.date).toLocaleDateString('en-GB')}</td>
                                                        <td className="p-2 text-end font-bold text-red-500">{formatCurrency(ret.totalRefund, currency)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
            <div className="mt-4 flex justify-end">
                <Button variant="secondary" onClick={onClose}>إغلاق</Button>
            </div>
        </Modal>
    );
};

export default CustomerDetailsModal;
