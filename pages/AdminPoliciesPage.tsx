import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { handleFirestoreError, OperationType } from '../services/firestoreErrorHandler';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Settings, Save, FileText, Shield, Info, HelpCircle } from 'lucide-react';
import { useToasts } from '../hooks/useToasts';
import { useAdminAuth } from '../hooks/useAdminAuth';

const AdminPoliciesPage: React.FC = () => {
    const { isAdminLoggedIn } = useAdminAuth();
    const { addToast } = useToasts();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [policies, setPolicies] = useState({
        privacyPolicy: '',
        termsOfUse: '',
        intellectualProperty: '',
        userGuide: ''
    });

    useEffect(() => {
        const load = async () => {
            const path = 'app_policies/main';
            try {
                const docRef = doc(db, 'app_policies', 'main');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setPolicies(docSnap.data() as any);
                }
            } catch (e) {
                handleFirestoreError(e, OperationType.GET, path);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setPolicies(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleSave = async () => {
        if (!isAdminLoggedIn) {
            addToast('يجب تسجيل الدخول كمسؤول لحفظ التغييرات', 'error');
            return;
        }
        setSaving(true);
        const path = 'app_policies/main';
        try {
            await setDoc(doc(db, 'app_policies', 'main'), policies);
            addToast('تم حفظ السياسات بنجاح', 'success');
        } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, path);
        } finally {
            setSaving(false);
        }
    };

    const textareaClass = "w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 font-bold transition-all min-h-[200px] resize-y leading-relaxed text-sm";

    if (loading) {
        return <div className="p-10 text-center text-slate-500 font-bold">جاري التحميل...</div>;
    }

    return (
        <div className="space-y-6 animate-fadeIn pb-10">
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-6 rounded-3xl border shadow-sm gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-2">
                        <Settings className="text-indigo-600" />
                        إدارة سياسات التطبيق
                    </h1>
                    <p className="text-slate-500 font-bold mb-2">تعديل سياسة الخصوصية، شروط الاستخدام، وحقوق الملكية وغيرها</p>
                    <p className="text-xs text-indigo-600 font-black bg-indigo-50 px-3 py-1.5 rounded-lg inline-block">💡 يمكنك استخدام تنسيقات Markdown (مثل # للعناوين العريضة، و ** للخط العريض).</p>
                </div>
                <Button onClick={handleSave} isLoading={saving} className="flex items-center gap-2">
                    <Save size={18} />
                    حفظ جميع التغييرات
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 border-none shadow-sm" title={
                    <div className="flex items-center gap-2 text-indigo-700">
                        <Shield size={20} />
                        سياسة الخصوصية
                    </div>
                }>
                    <textarea 
                        name="privacyPolicy" 
                        value={policies.privacyPolicy} 
                        onChange={handleChange} 
                        className={textareaClass} 
                        placeholder="أدخل نص سياسة الخصوصية هنا... (سيظهر للمستخدمين في الإعدادات)"
                    />
                </Card>

                <Card className="p-6 border-none shadow-sm" title={
                    <div className="flex items-center gap-2 text-indigo-700">
                        <FileText size={20} />
                        شروط الاستخدام
                    </div>
                }>
                    <textarea 
                        name="termsOfUse" 
                        value={policies.termsOfUse} 
                        onChange={handleChange} 
                        className={textareaClass} 
                        placeholder="أدخل نص شروط الاستخدام هنا..."
                    />
                </Card>

                <Card className="p-6 border-none shadow-sm" title={
                    <div className="flex items-center gap-2 text-indigo-700">
                        <FileText size={20} />
                        حقوق الملكية الفكرية
                    </div>
                }>
                    <textarea 
                        name="intellectualProperty" 
                        value={policies.intellectualProperty} 
                        onChange={handleChange} 
                        className={textareaClass} 
                        placeholder="أدخل نص حقوق الملكية الفكرية هنا... (مثال: جميع الحقوق محفوظة لشركة كذا)"
                    />
                </Card>

                <Card className="p-6 border-none shadow-sm" title={
                    <div className="flex items-center gap-2 text-indigo-700">
                        <Info size={20} />
                        دليل الاستخدام
                    </div>
                }>
                    <textarea 
                        name="userGuide" 
                        value={policies.userGuide} 
                        onChange={handleChange} 
                        className={textareaClass} 
                        placeholder="أدخل دليل الاستخدام أو كيفية استخدام البرنامج هنا..."
                    />
                </Card>
            </div>
        </div>
    );
};

export default AdminPoliciesPage;
