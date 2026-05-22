
import React, { useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { MessageSquare, CheckCircle, Smartphone, Lock, AlertTriangle } from 'lucide-react';
import { useLicense } from '../hooks/useLicense';
import { useToasts } from '../hooks/useToasts';
import { Link } from 'react-router-dom';

const ChatPowerPage: React.FC = () => {
    const { licenseInfo } = useLicense();
    
    const isPremium = licenseInfo.type !== 'Free';

    return (
        <div className="space-y-6 animate-fadeIn">
            <header className="text-center mb-10">
                <div className="inline-flex items-center justify-center p-4 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full mb-4">
                    <MessageSquare size={48} />
                </div>
                <h1 className="text-4xl font-extrabold text-slate-800 dark:text-white">شات باور (Chat Power)</h1>
                <p className="text-lg text-slate-600 dark:text-slate-300 mt-2">نظام إدارة المحادثات المتكامل مع العملاء.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                <Card>
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <CheckCircle className="text-green-500" />
                        مميزات الخدمة
                    </h3>
                    <ul className="space-y-3 text-slate-600 dark:text-slate-300">
                        <li className="flex items-start gap-2">✔ ربط واتساب ويب مباشرة داخل النظام.</li>
                        <li className="flex items-start gap-2">✔ قوالب ردود جاهزة وسريعة للفواتير.</li>
                        <li className="flex items-start gap-2">✔ إرسال الفواتير بضغطة زر للعميل.</li>
                        <li className="flex items-start gap-2">✔ دعم رسائل تذكير الأقساط التلقائية.</li>
                    </ul>
                </Card>

                <Card className={isPremium ? 'border-2 border-green-500' : 'border-2 border-slate-200 dark:border-slate-700'}>
                    <div className="text-center h-full flex flex-col justify-center items-center p-4">
                        {isPremium ? (
                            <>
                                <div className="text-green-500 mb-4"><CheckCircle size={64} /></div>
                                <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">الخدمة مفعلة</h3>
                                <p className="text-slate-500 mb-6">أنت تتمتع بكافة مميزات شات باور.</p>
                                <Button className="w-full bg-green-600 hover:bg-green-700">فتح لوحة المحادثات</Button>
                            </>
                        ) : (
                            <>
                                <div className="text-slate-400 mb-4"><Lock size={64} /></div>
                                <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">الخدمة غير مفعلة</h3>
                                <p className="text-slate-500 mb-6">هذه ميزة إضافية تتطلب اشتراكاً مدفوعاً.</p>
                                <Link to="/pricing" className="w-full">
                                    <Button className="w-full">ترقية الآن</Button>
                                </Link>
                            </>
                        )}
                    </div>
                </Card>
            </div>

            {!isPremium && (
                <div className="max-w-3xl mx-auto p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                    <AlertTriangle className="text-yellow-600 flex-shrink-0" />
                    <p className="text-sm text-yellow-800">
                        ملاحظة: شات باور يعتمد على ربط المتصفح بخدمات واتساب ويب، ويتطلب اتصالاً مستقراً بالإنترنت.
                    </p>
                </div>
            )}
        </div>
    );
};

export default ChatPowerPage;
