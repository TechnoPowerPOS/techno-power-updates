
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, Navigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { api } from '../services/mockApi';
import type { User } from '../types';
import { LogIn, User as UserIcon, Lock, Sparkles, ArrowRight } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';

const LoginPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsername, setSelectedUsername] = useState('');
  const [password, setPassword] = useState('password');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const auth = useAuth();
  const navigate = useNavigate();
  const { settings } = useSettings();

  useEffect(() => {
    const fetchUsers = async () => {
      const fetchedUsers = await api.getUsers();
      setUsers(fetchedUsers);
      if (fetchedUsers.length > 0) {
        setSelectedUsername(fetchedUsers[0].name);
      }
    };
    fetchUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUsername) return;
    setIsLoading(true);
    setError('');
    try {
      await auth.login(selectedUsername, password);
      navigate('/');
    } catch (err) {
      setError('كلمة المرور غير صحيحة');
    } finally {
      setIsLoading(false);
    }
  };

  if (auth.user) return <Navigate to="/" />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 font-sans p-4 relative overflow-hidden">
        {/* Soft background shapes */}
        <div className="absolute inset-0 z-0">
            <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-blue-100/50 dark:bg-blue-900/20 blur-3xl mix-blend-multiply dark:mix-blend-lighten animate-blob"></div>
            <div className="absolute top-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-purple-100/50 dark:bg-purple-900/20 blur-3xl mix-blend-multiply dark:mix-blend-lighten animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-[20%] left-[20%] w-[80vw] h-[80vw] rounded-full bg-pink-100/50 dark:bg-pink-900/20 blur-3xl mix-blend-multiply dark:mix-blend-lighten animate-blob animation-delay-4000"></div>
            <div className="absolute inset-0 bg-white/40 dark:bg-slate-950/40 backdrop-blur-[100px]"></div>
        </div>

        <div className="relative z-10 w-full max-w-5xl flex flex-col md:flex-row bg-white/70 dark:bg-slate-900/70 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_8px_40px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.2)] border border-white/50 dark:border-slate-800/80 overflow-hidden">
            {/* Visual Side */}
            <div className="hidden md:flex flex-1 relative bg-gradient-to-br from-blue-600 to-indigo-700 p-12 overflow-hidden items-center justify-center">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] [background-size:24px_24px]"></div>
                <div className="relative z-10 flex flex-col items-center text-center space-y-8 animate-fade-in-up">
                    <div className="w-32 h-32 bg-white/10 backdrop-blur-md rounded-[2.5rem] flex items-center justify-center shadow-2xl border border-white/20 overflow-hidden relative">
                        {localStorage.getItem('tp_global_logo') || settings?.logoUrl ? (
                            <img src={localStorage.getItem('tp_global_logo') || settings!.logoUrl} alt="Logo" className="w-full h-full object-contain p-2 relative z-10 drop-shadow-xl" />
                        ) : (
                            <span className="text-6xl drop-shadow-lg relative z-10">⚡</span>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                    </div>
                    <div className="space-y-4">
                        <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tight">{settings?.storeName || 'تكنو باور'}</h1>
                        <p className="text-blue-100 text-lg font-medium opacity-90 max-w-sm leading-relaxed">
                            النظام الأذكى والأسرع لإدارة مبيعاتك وأعمالك بكل استقرار واحترافية.
                        </p>
                    </div>
                </div>
            </div>

            {/* Form Side */}
            <div className="flex-1 flex flex-col justify-center p-8 sm:p-14 lg:p-16 animate-fade-in-up bg-white/50 dark:bg-slate-950/50">
                <div className="w-full max-w-sm mx-auto">
                    <div className="mb-10 text-center md:text-start">
                        <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight mb-2">تسجيل الدخول</h2>
                        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">مرحباً بك مجدداً، يرجى اختيار حسابك للمتابعة.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ms-1">اسم المستخدم</label>
                            <div className="relative group">
                                <UserIcon className="absolute top-1/2 -translate-y-1/2 start-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                                <select
                                    value={selectedUsername}
                                    onChange={(e) => setSelectedUsername(e.target.value)}
                                    className="w-full h-14 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl ps-12 pe-4 text-slate-800 dark:text-white font-bold outline-none cursor-pointer hover:border-slate-200 dark:hover:border-slate-700 transition-all shadow-sm appearance-none"
                                >
                                    {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ms-1">كلمة المرور</label>
                            <div className="relative group">
                                <Lock className="absolute top-1/2 -translate-y-1/2 start-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full h-14 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl ps-12 pe-4 text-slate-800 dark:text-white font-bold outline-none hover:border-slate-200 dark:hover:border-slate-700 transition-all shadow-sm placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                    placeholder="••••••••••••"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-2xl text-sm font-bold text-center border border-rose-100 dark:border-rose-900/30">
                                {error}
                            </div>
                        )}

                        <div className="pt-4">
                            <Button 
                                type="submit" 
                                className="w-full h-14 rounded-2xl text-base shadow-[0_4px_14px_rgba(37,99,235,0.2)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.25)]" 
                                isLoading={isLoading}
                            >
                                الدخول للنظام
                                <ArrowRight size={18} className="ms-2" />
                            </Button>
                        </div>
                    </form>

                    <div className="mt-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 opacity-60">
                        <Sparkles size={14} className="text-blue-500" />
                        Power System
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default LoginPage;
