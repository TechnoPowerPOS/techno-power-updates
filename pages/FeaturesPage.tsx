import React from 'react';
import Card from '../components/ui/Card';
import {
    ShoppingCart, Package, Users, BarChart3, BrainCircuit,
    WifiOff, Palette, Gift, Banknote, RefreshCcw, GraduationCap, Camera
} from 'lucide-react';

interface FeatureCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
}

// FIX: Changed component definition to use a separate interface and React.FC to fix typing issue with the `key` prop.
const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => (
    <Card className="text-center p-6">
        <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/50 mb-4">
            {icon}
        </div>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm">{description}</p>
    </Card>
);

const FeaturesPage: React.FC = () => {
    const features = [
        { icon: <ShoppingCart size={28} className="text-blue-500"/>, title: "نقطة بيع متكاملة", description: "واجهة بيع سريعة وسهلة تدعم طرق الدفع المختلفة ونظام الباركود." },
        { icon: <Package size={28} className="text-blue-500"/>, title: "إدارة المخزون", description: "تحكم كامل في المنتجات والمستودعات مع تنبيهات عند انخفاض المخزون." },
        { icon: <Users size={28} className="text-blue-500"/>, title: "إدارة العملاء والموردين", description: "سجل متكامل للعملاء والموردين لتتبع الديون والمشتريات." },
        { icon: <BarChart3 size={28} className="text-blue-500"/>, title: "تقارير شاملة", description: "لوحة تحكم وتقارير تفصيلية لتحليل أداء المبيعات والموظفين." },
        { icon: <BrainCircuit size={28} className="text-blue-500"/>, title: "ميزات الذكاء الاصطناعي", description: "اقتراحات أسعار، تحليل رضا العملاء، توقعات المبيعات، والمزيد." },
        { icon: <WifiOff size={28} className="text-blue-500"/>, title: "دعم العمل بدون انترنت", description: "يعمل البرنامج بكفاءة حتى عند انقطاع الاتصال بالإنترنت." },
        { icon: <Palette size={28} className="text-blue-500"/>, title: "تصميم عصري", description: "واجهة حديثة تدعم الوضع الليلي والنهاري لتجربة مريحة." },
        { icon: <Gift size={28} className="text-blue-500"/>, title: "برنامج ولاء العملاء", description: "نظام نقاط ومكافآت لزيادة ولاء عملائك وتشجيعهم على الشراء." },
        { icon: <Banknote size={28} className="text-blue-500"/>, title: "نظام الأقساط", description: "إمكانية بيع المنتجات بنظام التقسيط وإدارة الدفعات بسهولة." },
        { icon: <RefreshCcw size={28} className="text-blue-500"/>, title: "إدارة المرتجعات", description: "نظام متكامل لإدارة مرتجعات المبيعات والمشتريات وتأثيرها على المخزون." },
        { icon: <GraduationCap size={28} className="text-blue-500"/>, title: "مساعد تدريب ذكي", description: "جولة تعليمية تفاعلية للموظفين الجدد لتعلم استخدام النظام بسرعة." },
        { icon: <Camera size={28} className="text-blue-500"/>, title: "ربط كاميرات المراقبة (BETA)", description: "عرض بث مباشر من كاميرات المتجر مباشرة من داخل البرنامج (الميزة قيد التطوير)." },
    ];

    return (
        <div className="animate-fadeIn">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-extrabold text-gray-800 dark:text-white">مميزات نظام تكنو باور</h1>
                <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                    اكتشف مجموعة الأدوات القوية التي يوفرها النظام لمساعدتك على إدارة أعمالك بكفاءة وذكاء.
                </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {features.map((feature, index) => (
                    <FeatureCard key={index} icon={feature.icon} title={feature.title} description={feature.description} />
                ))}
            </div>
        </div>
    );
};

export default FeaturesPage;