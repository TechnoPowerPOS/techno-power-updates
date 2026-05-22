
import React, { useState, useEffect } from 'react';
import type { Partner, Sale, Transaction, SalesReturn } from '../types';
import { api } from '../services/mockApi';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import PartnerFormModal from '../components/partners/PartnerFormModal';
import PartnerTransactionsModal from '../components/partners/PartnerTransactionsModal';
import { PlusCircle, TrendingUp, TrendingDown, Briefcase, DollarSign, PieChart, Trash2, Edit3, Trash, History, Building2, Phone, Mail, Landmark } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency, toArabicIndic } from '../utils/localization';
import { useToasts } from '../hooks/useToasts';

import { useLicense } from '../hooks/useLicense';
import { getPlanLimits } from '../utils/planPermissions';
import { Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const PartnersPage: React.FC = () => {
    const [partners, setPartners] = useState<Partner[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [purchases, setPurchases] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [returns, setReturns] = useState<SalesReturn[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTransactionsModalOpen, setIsTransactionsModalOpen] = useState(false);
    const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
    const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
    const [confirmDeletePartner, setConfirmDeletePartner] = useState<Partner | null>(null);
    const { settings } = useSettings();
    const { addToast } = useToasts();
    const { licenseInfo } = useLicense();
    const limits = getPlanLimits(licenseInfo.type);

    const fetchData = async () => {
        if (!limits.hasPartners) return;
        setLoading(true);
        const [p, s, t, r, pu] = await Promise.all([
            api.getPartners(), 
            api.getSales(),
            api.getTransactions(),
            api.getSalesReturns(),
            api.getPurchases()
        ]);
        setPartners(p || []);
        setSales(s || []);
        setTransactions(t || []);
        setReturns(r || []);
        setPurchases(pu || []);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, [licenseInfo.type]);

    if (!limits.hasPartners) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fadeIn">
                <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-4">
                    <Lock size={64} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">ميزة الشركاء (Premium)</h1>
                    <p className="text-slate-500 mt-2 max-w-md mx-auto">إدارة الشركاء وتوزيع الأرباح متوفرة في الخطط المدفوعة فقط.</p>
                </div>
                <Link to="/pricing">
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-lg px-8 rounded-2xl">
                        ترقية الاشتراك
                    </Button>
                </Link>
            </div>
        );
    }

    const calculatePartnerProfit = (partner: Partner) => {
        const startDate = new Date(partner.lastSettlementDate || partner.joinedDate);
        const config = partner.profitShareConfig || { shareInSales: true, shareInExpenses: true, shareInPurchases: false };
        
        let totalNetSalesProfit = 0;

        if (config.shareInSales) {
            const partnerSales = sales.filter(s => new Date(s.date) >= startDate && s.status !== 'Refunded');
            const partnerReturns = returns.filter(r => new Date(r.date) >= startDate);
            
            const totalSalesProfit = partnerSales.reduce((sum, s) => {
                if (s.profit !== undefined) return sum + s.profit;
                const subtotalWithoutTax = s.total - (s.tax || 0) - (s.shipping || 0);
                const saleCost = s.items.reduce((itemSum, item) => itemSum + ((item.costPrice || 0) * (item.quantity || 1)), 0);
                return sum + (subtotalWithoutTax - saleCost);
            }, 0);

            const totalReturnsProfitLoss = partnerReturns.reduce((sum, r) => {
                const originalSale = sales.find(s => s.id === r.originalSaleId);
                if (!originalSale) return sum;
                const returnedItemCost = r.items.reduce((itemSum, item) => {
                    const originalItem = originalSale.items.find(i => i.id === item.id);
                    return itemSum + ((originalItem?.costPrice || 0) * (item.returnQuantity || 1));
                }, 0);
                const returnRevenueWithoutTax = r.totalRefund - (r.taxRefund || 0);
                return sum + (returnRevenueWithoutTax - returnedItemCost);
            }, 0);

            totalNetSalesProfit = totalSalesProfit - totalReturnsProfitLoss;
        }

        let totalExpenses = 0;
        if (config.shareInExpenses) {
            const partnerExpenses = transactions.filter(t => t.type === 'expense' && new Date(t.date) >= startDate);
            totalExpenses = partnerExpenses.reduce((a, b) => a + (b.amount || 0), 0);
        }

        let totalPurchasesCost = 0;
        if (config.shareInPurchases) {
            const partnerPurchases = purchases.filter(p => new Date(p.date) >= startDate);
            totalPurchasesCost = partnerPurchases.reduce((a, b) => a + (b.total || 0), 0);
        }

        const netProfitSinceLastSettlement = totalNetSalesProfit - totalExpenses - totalPurchasesCost;
        return (netProfitSinceLastSettlement * partner.sharePercentage) / 100;
    };

    const handleDeletePartner = async (partner: Partner) => {
        const balance = partner.currentBalance || 0;
        if (Math.abs(balance) > 0.01) {
            addToast(`لا يمكن حذف الشريك "${partner.name}" لوجود رصيد متبقي (${formatCurrency(balance, settings?.currency)}). يجب تسوية الحساب أولاً.`, 'error');
            return;
        }
        setConfirmDeletePartner(partner);
    };

    const confirmDeletePartnerAction = async () => {
        if (!confirmDeletePartner) return;
        try {
            await api.deletePartner(confirmDeletePartner.id);
            fetchData();
            addToast('تم حذف الشريك بنجاح', 'success');
        } catch (e) {
            addToast('فشل في حذف الشريك', 'error');
        } finally {
            setConfirmDeletePartner(null);
        }
    };

    const handleEditPartner = (partner: Partner) => {
        setEditingPartner(partner);
        setIsModalOpen(true);
    };

    const handleViewTransactions = (partner: Partner) => {
        setSelectedPartner(partner);
        setIsTransactionsModalOpen(true);
    };

    const handleSettleProfit = async (partner: Partner) => {
        const profit = calculatePartnerProfit(partner);
        if (Math.abs(profit) < 0.01) {
            addToast('لا توجد أرباح أو خسائر مستحقة للتسوية حالياً لهذا الشريك.', 'warning');
            return;
        }

        const isLoss = profit < 0;
        const confirmMsg = isLoss 
            ? `توجد خسائر بقيمة ${formatCurrency(Math.abs(profit), settings?.currency)}. هل أنت متأكد من تسويتها لخصمها من رصيد الشريك "${partner.name}"؟`
            : `توجد أرباح بقيمة ${formatCurrency(profit, settings?.currency)}. هل أنت متأكد من تسويتها لإضافتها لرصيد الشريك "${partner.name}"؟`;

        if (!window.confirm(confirmMsg)) {
            return;
        }

        try {
            await api.addPartnerTransaction({
                partnerId: partner.id,
                amount: Math.abs(profit),
                type: isLoss ? 'LossDistribution' : 'ProfitDistribution',
                description: `تسوية ${isLoss ? 'خسائر' : 'أرباح'} دورية - تاريخ ${new Date().toLocaleDateString('ar-EG')}`,
                date: new Date().toISOString()
            });
            
            // To reset the settlement window, update lastSettlementDate
            await api.updatePartner(partner.id, { lastSettlementDate: new Date().toISOString() });
            
            fetchData();
            addToast(`تمت تسوية ${isLoss ? 'الخسائر' : 'الأرباح'} بنجاح`, 'success');
        } catch (e) {
            addToast(`فشل في تسوية ${isLoss ? 'الخسائر' : 'الأرباح'}`, 'error');
        }
    };

    return (
        <div className="animate-fadeIn pb-20">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 dark:text-white">نظام الشركاء والأرباح</h1>
                    <p className="text-slate-500 font-bold mt-1">إدارة دقيقة لنسب الشراكة، رأس المال، والعمليات المالية المستمرة.</p>
                </div>
                <Button onClick={() => { setEditingPartner(null); setIsModalOpen(true); }} className="rounded-2xl font-black shadow-lg shadow-indigo-500/20 px-6 h-12 text-sm"><PlusCircle size={18} className="me-2"/> إضافة شريك جديد</Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                {partners.map(p => {
                    const pProfit = calculatePartnerProfit(p);
                    return (
                        <Card key={p.id} className={`relative overflow-hidden border-2 shadow-premium hover:shadow-2xl hover:-translate-y-1 transition-all group ${p.status === 'Inactive' || p.status === 'Suspended' ? 'opacity-70 grayscale border-slate-200' : 'border-indigo-100 dark:border-indigo-900/30'}`}>
                            {/* Status Badge */}
                            <div className={`absolute top-0 right-0 py-1.5 px-4 rounded-bl-3xl font-black text-[10px] text-white shadow-md ${p.status === 'Active' ? 'bg-emerald-500' : p.status === 'Suspended' ? 'bg-amber-500' : 'bg-slate-500'}`}>
                                {p.status === 'Active' ? 'نشط' : p.status === 'Suspended' ? 'موقوف' : 'غير نشط'}
                            </div>

                            <div className="absolute top-3 left-3 flex gap-2">
                                <button onClick={() => handleViewTransactions(p)} className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl hover:scale-110 transition-transform shadow-sm" title="السجل المالي"><History size={16}/></button>
                                <button onClick={() => handleEditPartner(p)} className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-600 rounded-xl hover:scale-110 transition-transform shadow-sm" title="تعديل البيانات"><Edit3 size={16}/></button>
                                <button onClick={() => handleDeletePartner(p)} className="p-2.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 rounded-xl hover:scale-110 transition-transform shadow-sm" title="حذف"><Trash2 size={16}/></button>
                            </div>

                            <div className="flex flex-col items-center text-center mt-6 mb-6">
                                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-3xl flex items-center justify-center font-black text-3xl shadow-xl shadow-indigo-500/30 mb-4 transform group-hover:scale-110 transition-transform">{p.name.charAt(0)}</div>
                                <h3 className="text-xl font-black text-slate-800 dark:text-white">{p.name}</h3>
                                {p.companyName && <p className="text-xs text-indigo-600 font-bold mt-1 flex items-center gap-1 justify-center"><Building2 size={12}/> {p.companyName}</p>}
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 mb-6 grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">نسبة الحصة</p>
                                    <p className="text-lg font-black text-slate-700 dark:text-slate-200">{toArabicIndic(p.sharePercentage)}%</p>
                                </div>
                                <div className="text-end">
                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">رأس المال</p>
                                    <p className="text-sm font-black text-slate-700 dark:text-slate-200">{formatCurrency(p.capitalInvested, settings?.currency)}</p>
                                </div>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex items-center gap-3 text-sm font-bold text-slate-600 dark:text-slate-300">
                                    <Phone size={14} className="text-slate-400"/> {p.phone}
                                </div>
                                {p.email && <div className="flex items-center gap-3 text-sm font-bold text-slate-600 dark:text-slate-300">
                                    <Mail size={14} className="text-slate-400"/> {p.email}
                                </div>}
                                {p.bankDetails?.bankName && <div className="flex items-center gap-3 text-sm font-bold text-slate-600 dark:text-slate-300 truncate">
                                    <Landmark size={14} className="text-slate-400 shrink-0"/> <span className="truncate">{p.bankDetails.bankName} - {p.bankDetails.accountNumber}</span>
                                </div>}
                            </div>

                            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/50 flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-indigo-400 mb-1">إجمالي رصيد الحساب (رأس المال + الأرباح)</p>
                                    <p className={`text-xl font-black ${p.currentBalance + pProfit >= 0 ? 'text-indigo-700 dark:text-indigo-400' : 'text-rose-600'}`}>
                                        {formatCurrency(p.currentBalance + pProfit, settings?.currency)}
                                    </p>
                                </div>
                                <div className="text-end">
                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">الأرباح المستحقة</p>
                                    <p className={`text-sm font-black ${pProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {formatCurrency(Math.abs(pProfit), settings?.currency)} {pProfit < 0 ? '(خسارة)' : ''}
                                    </p>
                                    {Math.abs(pProfit) >= 0.01 && (
                                        <button onClick={() => handleSettleProfit(p)} className="text-[9px] font-black underline text-indigo-600 hover:text-indigo-800 mt-1">
                                            {pProfit < 0 ? 'تسوية الخسائر الآن' : 'تسوية الأرباح الآن'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
            
            <PartnerFormModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                partner={editingPartner} 
                onSave={async (d) => { await api.savePartner(d); fetchData(); setIsModalOpen(false); addToast('تم حفظ الشريك بنجاح', 'success'); }} 
                isLoading={false} 
            />

            <PartnerTransactionsModal 
                isOpen={isTransactionsModalOpen}
                onClose={() => setIsTransactionsModalOpen(false)}
                partner={selectedPartner}
                onTransactionAdded={fetchData}
            />
            {confirmDeletePartner && (
                <ConfirmDialog
                    isOpen={!!confirmDeletePartner}
                    onClose={() => setConfirmDeletePartner(null)}
                    onConfirm={confirmDeletePartnerAction}
                    title="تأكيد حذف الشريك"
                    message={`هل أنت متأكد من حذف الشريك "${confirmDeletePartner.name}"؟`}
                />
            )}
        </div>
    );
};

export default PartnersPage;
