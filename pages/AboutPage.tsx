import React from 'react';
import Card from '../components/ui/Card';
import { Code2, Heart, Mail, Smartphone, Sparkles, Building, Rocket, Shield } from 'lucide-react';
import { useGlobalSettings } from '../hooks/useGlobalSettings';

const AboutPage: React.FC = () => {
    const { settings } = useGlobalSettings();
    const supportPhone = settings?.supportContact?.phone || "+20 102 024 6503";
    const supportEmail = settings?.supportContact?.email || "technopowereg@hotmail.com";
    const waLink = `https://wa.me/${supportPhone.replace(/[^0-9]/g, '')}`;

    return (
        <div className="max-w-6xl mx-auto pb-20 animate-fadeIn space-y-12">
            {/* Header Section */}
            <div className="relative rounded-[3rem] overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 p-12 md:p-20 text-center shadow-[0_8px_40px_rgba(37,99,235,0.2)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.1),_transparent_50%)]"></div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3"></div>
                
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-24 h-24 mb-8 bg-white/10 backdrop-blur-xl rounded-[2rem] border border-white/20 flex items-center justify-center shadow-2xl">
                        {settings?.globalLogoUrl ? (
                            <img src={settings.globalLogoUrl} alt="Logo" className="w-16 h-16 object-contain" />
                        ) : (
                            <span className="text-5xl drop-shadow-lg">⚡</span>
                        )}
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-4 drop-shadow-md">
                        تكنو باور POS
                    </h1>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
                        <Sparkles size={16} className="text-blue-200" />
                        <span className="text-blue-100 font-bold uppercase tracking-widest text-sm">إصدار الترا (v1.18.0) 🚀</span>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Mission Section */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 md:p-12 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-slate-100 dark:border-slate-800/60 relative overflow-hidden group hover:shadow-[0_8px_32px_rgba(0,0,0,0.04)] transition-all">
                        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 mb-6">
                            <Rocket size={32} />
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-6">مهمتنا ورؤيتنا</h2>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-bold text-lg md:text-xl">
                            نسعى في <strong>تكنو باور</strong> إلى توفير حلول برمجية ذكية وسهلة الاستخدام تُمكّن أصحاب المشاريع الصغيرة والمتوسطة من إدارة أعمالهم باحترافية، مع التركيز على الخصوصية الكاملة والأداء الفائق دون الحاجة لاتصال دائم بالإنترنت. نحن نؤمن بأن البرمجيات يجب أن تكون أداة لتمكين نجاحك.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-slate-100 dark:border-slate-800/60 transition-all hover:-translate-y-1">
                            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center text-emerald-600 mb-4">
                                <Shield size={24} />
                            </div>
                            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2">أمان وموثوقية</h3>
                            <p className="text-slate-500 font-medium text-sm leading-relaxed">بيانات شركتك محمية بالكامل وتعمل بشكل محلي لضمان سرية وأمان معلوماتك الحساسة على مدار الساعة.</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-slate-100 dark:border-slate-800/60 transition-all hover:-translate-y-1">
                            <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-center text-purple-600 mb-4">
                                <Building size={24} />
                            </div>
                            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2">مصمم لنمو أعمالك</h3>
                            <p className="text-slate-500 font-medium text-sm leading-relaxed">نظام قابل للتوسع يتطور مع شركتك ليلبي احتياجاتك المتزايدة سواء كان لديك فرع واحد أو فروع متعددة.</p>
                        </div>
                    </div>
                </div>

                {/* Developer Info Side */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-slate-100 dark:border-slate-800/60 h-full flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-slate-50 dark:bg-slate-800/30 rounded-full blur-3xl z-0"></div>
                        <div className="relative z-10">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-8 border-b border-slate-100 dark:border-slate-800 pb-4">المطور والدعم</h3>
                            
                            <div className="flex flex-col gap-6 mb-8 group">
                                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 transform group-hover:scale-105 transition-all">
                                    <Code2 size={36} />
                                </div>
                                <div>
                                    <h4 className="text-2xl font-black text-slate-800 dark:text-white mb-1">Eng. Mohamed Shibl</h4>
                                    <p className="text-slate-500 font-bold text-sm bg-slate-100 dark:bg-slate-800 inline-block px-3 py-1 rounded-lg">Full Stack Software Engineer</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <a href={`mailto:${supportEmail}`} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-blue-50 dark:bg-slate-800/50 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-blue-100 dark:hover:border-slate-700 group">
                                    <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-slate-400 group-hover:text-blue-600 shadow-sm transition-colors">
                                        <Mail size={18}/>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">البريد الإلكتروني</p>
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{supportEmail}</p>
                                    </div>
                                </a>
                                
                                <a href={waLink} target="_blank" rel="noreferrer" className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-green-50 dark:bg-slate-800/50 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-green-100 dark:hover:border-slate-700 group">
                                    <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-slate-400 group-hover:text-green-600 shadow-sm transition-colors">
                                        <Smartphone size={18}/>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">تواصل عبر واتساب</p>
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300" dir="ltr">{supportPhone}</p>
                                    </div>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col items-center justify-center gap-4 text-slate-400 pt-8 border-t border-slate-200 dark:border-slate-800/50 mt-12 pb-4">
                <div className="flex items-center gap-2 text-sm font-bold">
                    صُنع بكل <Heart size={16} className="text-rose-500 fill-current animate-pulse-slow"/> في مصر
                </div>
                <p className="text-[10px] uppercase font-bold tracking-[0.3em] opacity-60">Techno Power System &copy; 2025</p>
            </div>
        </div>
    );
};

export default AboutPage;