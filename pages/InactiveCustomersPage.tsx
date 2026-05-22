import React, { useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { api } from '../services/mockApi';
import { generateFollowUpMessage } from '../services/geminiService';
import type { InactiveCustomer } from '../types';
import { UserX, MessageSquare, Copy } from 'lucide-react';
import TableSkeleton from '../components/ui/TableSkeleton';

const InactiveCustomersPage: React.FC = () => {
    const [daysInactive, setDaysInactive] = useState(30);
    const [customers, setCustomers] = useState<InactiveCustomer[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<InactiveCustomer | null>(null);
    const [aiMessage, setAiMessage] = useState('');
    const [loadingMessage, setLoadingMessage] = useState(false);

    const fetchInactiveCustomers = async () => {
        setLoading(true);
        const data = await api.getInactiveCustomers(daysInactive);
        setCustomers(data);
        setLoading(false);
    };
    
    const handleGenerateMessage = async (customer: InactiveCustomer) => {
        setSelectedCustomer(customer);
        setIsModalOpen(true);
        setLoadingMessage(true);
        setAiMessage('');
        const message = await generateFollowUpMessage(customer.name, customer.lastPurchaseDate);
        setAiMessage(message);
        setLoadingMessage(false);
    };
    
    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(aiMessage).then(() => {
            alert('تم نسخ الرسالة!');
        });
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">تقرير العملاء الغائبين (AI)</h1>
            
            <Card>
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <label htmlFor="days-inactive" className="font-medium">عرض العملاء الذين لم يشتروا منذ أكثر من</label>
                    <input
                        id="days-inactive"
                        type="number"
                        value={daysInactive}
                        onChange={(e) => setDaysInactive(parseInt(e.target.value, 10) || 30)}
                        className="w-24 p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600"
                    />
                    <label>يومًا</label>
                    <Button onClick={fetchInactiveCustomers} isLoading={loading}>
                        عرض التقرير
                    </Button>
                </div>
            </Card>

            <Card className="p-0">
                {loading ? (
                    <TableSkeleton cols={3} hasActions />
                ) : customers.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-start">
                            <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="px-4 py-3">العميل</th>
                                    <th className="px-4 py-3">الهاتف</th>
                                    <th className="px-4 py-3">آخر عملية شراء</th>
                                    <th className="px-4 py-3 text-center">إجراء</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customers.map((c) => (
                                    <tr key={c.id} className="border-b dark:border-slate-800">
                                        <td className="px-4 py-3 font-medium">{c.name}</td>
                                        <td className="px-4 py-3">{c.phone}</td>
                                        <td className="px-4 py-3">{c.lastPurchaseDate === 'لا يوجد مشتريات' ? 'لا يوجد' : new Date(c.lastPurchaseDate).toLocaleDateString('ar-EG')}</td>
                                        <td className="px-4 py-3 text-center">
                                            <Button size="sm" variant="secondary" onClick={() => handleGenerateMessage(c)}>
                                                <MessageSquare size={16} />
                                                رسالة متابعة
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-16 text-slate-500">
                        <UserX size={48} className="mx-auto opacity-50 mb-4" />
                        <h3 className="font-semibold text-lg">لا يوجد عملاء غائبون</h3>
                        <p>لم يتم العثور على عملاء يطابقون هذه المعايير. جرب تغيير عدد الأيام.</p>
                    </div>
                )}
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`رسالة متابعة لـ ${selectedCustomer?.name}`}>
                <div className="space-y-4">
                    {loadingMessage ? (
                         <p className="text-slate-500">جاري إنشاء رسالة ذكية...</p>
                    ) : (
                        <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                           <p className="whitespace-pre-wrap">{aiMessage}</p>
                        </div>
                    )}
                    <div className="text-end">
                        <Button onClick={handleCopyToClipboard} disabled={loadingMessage || !aiMessage}>
                            <Copy size={16} />
                            نسخ الرسالة
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default InactiveCustomersPage;
