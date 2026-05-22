import React, { useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { api } from '../services/mockApi';
import { generateClearanceOffer } from '../services/geminiService';
import type { StagnantProduct } from '../types';
import { Package, Lightbulb, Copy } from 'lucide-react';
import TableSkeleton from '../components/ui/TableSkeleton';
import { useSettings } from '../hooks/useSettings';
import { toArabicIndic } from '../utils/localization';

const StagnantProductsPage: React.FC = () => {
    const [daysThreshold, setDaysThreshold] = useState(90);
    const [products, setProducts] = useState<StagnantProduct[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<StagnantProduct | null>(null);
    const [aiOffer, setAiOffer] = useState('');
    const [loadingOffer, setLoadingOffer] = useState(false);
    const { settings } = useSettings();

    const fetchStagnantProducts = async () => {
        setLoading(true);
        const data = await api.getStagnantProducts(daysThreshold);
        setProducts(data);
        setLoading(false);
    };
    
    const handleGenerateOffer = async (product: StagnantProduct) => {
        setSelectedProduct(product);
        setIsModalOpen(true);
        setLoadingOffer(true);
        setAiOffer('');
        const offer = await generateClearanceOffer(product.name, product.stock, product.daysSinceLastSale);
        setAiOffer(offer);
        setLoadingOffer(false);
    };
    
    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(aiOffer).then(() => {
            alert('تم نسخ الاقتراح!');
        });
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">تقرير المنتجات الراكدة (AI)</h1>
            
            <Card>
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <label htmlFor="days-threshold" className="font-medium">عرض المنتجات التي لم تُبع منذ أكثر من</label>
                    <input
                        id="days-threshold"
                        type="number"
                        value={daysThreshold}
                        onChange={(e) => setDaysThreshold(parseInt(e.target.value, 10) || 90)}
                        className="w-24 p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600"
                    />
                    <label>يومًا</label>
                    <Button onClick={fetchStagnantProducts} isLoading={loading}>
                        إنشاء التقرير
                    </Button>
                </div>
            </Card>

            <Card className="p-0">
                {loading ? (
                    <TableSkeleton cols={3} hasActions />
                ) : products.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-start">
                            <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="px-4 py-3">المنتج</th>
                                    <th className="px-4 py-3">المخزون الحالي</th>
                                    <th className="px-4 py-3">آخر عملية بيع</th>
                                    <th className="px-4 py-3 text-center">إجراء</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((p) => (
                                    <tr key={p.id} className="border-b dark:border-slate-800">
                                        <td className="px-4 py-3 font-medium">{p.name}</td>
                                        <td className="px-4 py-3">{toArabicIndic(p.stock)}</td>
                                        <td className="px-4 py-3">{p.lastSoldDate ? `منذ ${toArabicIndic(p.daysSinceLastSale)} يوم` : 'لم يُبع أبدًا'}</td>
                                        <td className="px-4 py-3 text-center">
                                            <Button size="sm" variant="secondary" onClick={() => handleGenerateOffer(p)}>
                                                <Lightbulb size={16} />
                                                اقتراح عرض
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-16 text-slate-500">
                        <Package size={48} className="mx-auto opacity-50 mb-4" />
                        <h3 className="font-semibold text-lg">لا توجد منتجات راكدة</h3>
                        <p>جميع منتجاتك تباع بانتظام. عمل رائع!</p>
                    </div>
                )}
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`اقتراح عرض لـ ${selectedProduct?.name}`}>
                <div className="space-y-4">
                    {loadingOffer ? (
                         <p className="text-slate-500">جاري إنشاء عرض ترويجي ذكي...</p>
                    ) : (
                        <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                           <p className="whitespace-pre-wrap">{aiOffer}</p>
                        </div>
                    )}
                    <div className="text-end">
                        <Button onClick={handleCopyToClipboard} disabled={loadingOffer || !aiOffer}>
                            <Copy size={16} />
                            نسخ الاقتراح
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default StagnantProductsPage;
