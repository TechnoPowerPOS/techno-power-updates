
import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import { ShieldAlert, FileText, CheckCircle, Lock } from 'lucide-react';

const TERMS_STORAGE_KEY = 'pos_terms_accepted_v1';

const TermsModal: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [canAgree, setCanAgree] = useState(false);

    useEffect(() => {
        const hasAccepted = localStorage.getItem(TERMS_STORAGE_KEY);
        if (!hasAccepted) {
            setIsOpen(true);
        }
    }, []);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const bottom = e.currentTarget.scrollHeight - e.currentTarget.scrollTop === e.currentTarget.clientHeight;
        if (bottom || e.currentTarget.scrollTop > 100) { 
            setCanAgree(true); 
        }
    };

    const handleAgree = () => {
        localStorage.setItem(TERMS_STORAGE_KEY, 'true');
        setIsOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp">
                
                {/* Header */}
                <div className="bg-red-600 p-6 text-white text-center">
                    <ShieldAlert className="w-12 h-12 mx-auto mb-2 opacity-90" />
                    <h2 className="text-2xl font-bold">اتفاقية الاستخدام والمسؤولية القانونية</h2>
                    <p className="text-red-100 text-sm mt-1">يجب قراءة هذه الشروط والموافقة عليها للمتابعة</p>
                </div>

                {/* Content */}
                <div 
                    className="p-6 overflow-y-auto space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed custom-scrollbar"
                    onScroll={handleScroll}
                >
                    <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg flex gap-3">
                        <Lock className="shrink-0 text-yellow-600" size={20} />
                        <p className="font-bold text-yellow-800 dark:text-yellow-500">
                            تنبيه هام: استخدامك لهذا البرنامج يعني موافقتك الصريحة والملزمة قانونياً على البنود التالية. مخالفة هذه البنود تعرضك للمساءلة القانونية والملاحقة القضائية.
                        </p>
                    </div>

                    <section>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                            <FileText size={18} /> 1. حقوق الملكية الفكرية
                        </h3>
                        <p>
                            هذا البرنامج (تكنو باور POS) محمي بموجب قوانين حقوق الملكية الفكرية المحلية والدولية. يمنع منعاً باتاً نسخ، تعديل، تفكيك (Reverse Engineering)، أو إعادة بيع الكود المصدري أو أي جزء من النظام دون إذن كتابي صريح من المطور (Eng. Mohamed Shibl).
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                            <FileText size={18} /> 2. الترخيص والاستخدام
                        </h3>
                        <p>
                            يمنحك الترخيص حق استخدام البرنامج لجهاز واحد (أو حسب الخطة المشتركة) ولغرض تجاري مشروع. يحظر استخدام أي وسائل غير مشروعة لتجاوز نظام الترخيص (Cracking) أو تفعيل ميزات مدفوعة بطرق ملتوية. سيتم حظر الجهاز ورقم IP فوراً وإبلاغ الجهات المختصة في حال اكتشاف تلاعب.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                            <FileText size={18} /> 3. سياسة الخصوصية والبيانات
                        </h3>
                        <ul className="list-disc list-inside space-y-1 mr-2">
                            <li><strong>تخزين محلي:</strong> جميع بياناتك (العملاء، المبيعات، المنتجات) مخزنة محلياً على جهازك. نحن لا نقوم برفع بياناتك التجارية لأي خادم سحابي (إلا في حال تفعيل المزامنة الاختيارية).</li>
                            <li><strong>مسؤولية البيانات:</strong> المستخدم هو المسؤول الوحيد عن الحفاظ على بياناته وعمل نسخ احتياطية دورية. المطور غير مسؤول عن أي فقدان للبيانات ناتج عن سوء الاستخدام، الفيروسات، أو عطل الجهاز.</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                            <FileText size={18} /> 4. إخلاء المسؤولية
                        </h3>
                        <p>
                            يتم تقديم البرنامج "كما هو". لا يتحمل المطور أي مسؤولية عن أي خسائر مالية مباشرة أو غير مباشرة قد تنتج عن استخدام البرنامج أو عن أي أخطاء حسابية ناجمة عن إدخال بيانات خاطئة من قبل المستخدم.
                        </p>
                    </section>
                </div>

                {/* Footer */}
                <div className="p-6 border-t dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                    <div className="flex flex-col gap-3">
                        <label className="flex items-start gap-3 cursor-pointer group">
                            <div className="relative flex items-center">
                                <input 
                                    type="checkbox" 
                                    className="peer sr-only" 
                                    onChange={(e) => setCanAgree(e.target.checked)} 
                                />
                                <div className="w-6 h-6 border-2 border-slate-400 rounded transition-colors peer-checked:bg-blue-600 peer-checked:border-blue-600"></div>
                                <CheckCircle className="absolute w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity left-1 top-1" />
                            </div>
                            <span className="text-sm font-semibold select-none group-hover:text-blue-600 transition-colors">
                                أقر بأنني قرأت وفهمت الشروط أعلاه، وأوافق على الالتزام بها، وأتحمل كامل المسؤولية القانونية في حال المخالفة.
                            </span>
                        </label>
                        
                        <Button 
                            onClick={handleAgree} 
                            disabled={!canAgree} 
                            className={`w-full py-4 text-lg font-bold transition-all ${!canAgree ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] shadow-lg'}`}
                            variant={canAgree ? 'primary' : 'secondary'}
                        >
                            {canAgree ? 'موافق وبدء الاستخدام' : 'يرجى الموافقة للمتابعة'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TermsModal;
