
import React, { useState, useMemo } from 'react';
import Card from '../components/ui/Card';
import { FAQ_DATA, FaqItem } from '../faqData';
import { 
    ChevronDown, 
    HelpCircle, 
    Search, 
    MessageCircle, 
    Sparkles, 
    BookOpen, 
    ShieldCheck, 
    Zap,
    Layout,
    Box,
    ShoppingCart,
    Calculator,
    Users,
    Key,
    Activity,
    Lock,
    Mail
} from 'lucide-react';

interface AccordionItemProps {
    item: FaqItem;
    isOpen: boolean;
    onClick: () => void;
    icon: React.ReactNode;
}

const AccordionItem: React.FC<AccordionItemProps> = ({ item, isOpen, onClick, icon }) => {
    return (
        <div className={`group border-b border-slate-100 dark:border-slate-800 last:border-none transition-all duration-300 ${isOpen ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}>
            <button
                onClick={onClick}
                className="w-full flex justify-between items-center text-start p-6 outline-none"
            >
                <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl transition-all duration-300 ${isOpen ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 rotate-12' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                        {icon}
                    </div>
                    <div className="flex flex-col">
                        <span className={`text-[10px] uppercase tracking-wider font-black mb-1 opacity-60 ${isOpen ? 'text-indigo-600' : 'text-slate-500'}`}>
                            {item.category}
                        </span>
                        <span className={`font-black text-sm md:text-base transition-colors ${isOpen ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-200'}`}>
                            {item.question}
                        </span>
                    </div>
                </div>
                <div className={`p-1 rounded-full transition-all duration-500 ${isOpen ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 rotate-180' : 'text-slate-400'}`}>
                    <ChevronDown size={20} />
                </div>
            </button>
            <div
                className={`grid transition-all duration-500 ease-in-out ${
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
            >
                <div className="overflow-hidden">
                    <div className="px-6 pb-6 pr-[72px] text-slate-600 dark:text-slate-400 text-sm md:text-base leading-relaxed font-medium">
                        {item.answer}
                    </div>
                </div>
            </div>
        </div>
    );
};

const FaqPage: React.FC = () => {
    const [openIndex, setOpenIndex] = useState<string | null>('gen-1');
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('All');

    const categories = ['All', 'General', 'Sales', 'Inventory', 'Accounting', 'Partners', 'Technical'];

    const categoryIcons: Record<string, any> = {
        'General': <Layout size={18} />,
        'Sales': <ShoppingCart size={18} />,
        'Inventory': <Box size={18} />,
        'Accounting': <Calculator size={18} />,
        'Partners': <Users size={18} />,
        'Technical': <Key size={18} />,
        'Security': <Lock size={18} />,
        'All': <Activity size={18} />
    };

    const handleToggle = (id: string) => {
        setOpenIndex(openIndex === id ? null : id);
    };

    const filteredFaqs = useMemo(() => {
        return FAQ_DATA.filter(faq => {
            const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = activeCategory === 'All' || faq.category === activeCategory;
            return matchesSearch && matchesCategory;
        });
    }, [searchTerm, activeCategory]);

    return (
        <div className="max-w-5xl mx-auto pb-20 animate-fadeIn px-4">
            {/* Header Section */}
            <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center p-4 bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-500/20 mb-6 animate-bounceIn">
                    <HelpCircle size={48} className="text-white" />
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-white tracking-tight">الدعم والمساعدة</h1>
                <p className="mt-4 text-lg text-slate-500 dark:text-slate-400 font-bold max-w-xl mx-auto leading-relaxed">
                    كل ما تحتاجه لإتقان استخدام نظام تكنو باور في مكان واحد. ابحث عن سؤالك أو تصفح الأقسام.
                </p>
                
                {/* Search Bar */}
                <div className="mt-10 relative max-w-2xl mx-auto group">
                    <Search className="absolute top-1/2 -translate-y-1/2 start-6 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={22} />
                    <input 
                        type="text" 
                        placeholder="ماذا يمكننا أن نساعدك اليوم؟"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-16 ps-16 pe-8 rounded-full border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-premium outline-none focus:border-indigo-500 transition-all font-bold text-slate-800 dark:text-white"
                    />
                </div>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-sm ${
                            activeCategory === cat 
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 active:scale-95' 
                            : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                    >
                        {categoryIcons[cat]}
                        {cat === 'All' ? 'الكل' : 
                         cat === 'General' ? 'عام' : 
                         cat === 'Sales' ? 'المبيعات' : 
                         cat === 'Inventory' ? 'المخازن' : 
                         cat === 'Accounting' ? 'الحسابات' : 
                         cat === 'Partners' ? 'الشركاء' : 'تقني'}
                    </button>
                ))}
            </div>
            
            {/* FAQ List */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-8">
                    <Card className="p-0 overflow-hidden border-slate-100 dark:border-slate-800 shadow-2xl rounded-[32px]">
                        {filteredFaqs.length > 0 ? (
                            filteredFaqs.map((item, index) => (
                                <AccordionItem
                                    key={item.id}
                                    item={item}
                                    isOpen={openIndex === item.id}
                                    onClick={() => handleToggle(item.id)}
                                    icon={categoryIcons[item.category] || <HelpCircle size={20} />}
                                />
                            ))
                        ) : (
                            <div className="p-20 text-center space-y-4">
                                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto opacity-50">
                                    <Search size={32} className="text-slate-400" />
                                </div>
                                <p className="text-slate-500 font-black text-xl">لم نجد نتائج مطابقة</p>
                                <p className="text-slate-400 font-bold">جرب كلمات بحث مختلفة أو تصفح قسماً آخر.</p>
                            </div>
                        )}
                    </Card>
                </div>

                <div className="lg:col-span-4 space-y-6">
                    <div className="p-8 bg-white dark:bg-slate-900 rounded-[32px] border dark:border-slate-800 shadow-xl">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-2xl">
                                <MessageCircle size={24} />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 dark:text-white">تحتاج لمساعدة فنية؟</h3>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 font-bold mb-6 leading-relaxed">
                            فريق الدعم الفني متواجد لمساعدتك في أي وقت عبر واتساب.
                        </p>
                        <div className="flex flex-col gap-3">
                            <a 
                                href="mailto:support@technopower.store" 
                                className="flex items-center justify-center gap-3 w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
                            >
                                <Mail size={20} />
                                support@technopower.store
                            </a>
                            <a 
                                href="https://wa.me/201020246503" 
                                target="_blank" 
                                rel="noreferrer" 
                                className="flex items-center justify-center gap-3 w-full py-4 bg-green-600 text-white rounded-2xl font-black shadow-lg shadow-green-500/20 hover:bg-green-700 transition-all active:scale-95"
                            >
                                تواصل معنا الآن
                            </a>
                        </div>
                    </div>

                    <div className="p-8 bg-indigo-600 rounded-[32px] shadow-xl text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        <h3 className="text-xl font-black mb-2 relative z-10">تعرف على التحديثات</h3>
                        <p className="opacity-90 font-bold mb-6 relative z-10 leading-relaxed uppercase text-xs tracking-widest">
                            دائماً ما نضيف ميزات جديدة لنظامك.
                        </p>
                        <button className="w-full py-4 bg-white/20 hover:bg-white text-white hover:text-indigo-600 rounded-2xl font-black transition-all">
                            مشاهدة سجل التغيير
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FaqPage;

