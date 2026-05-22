import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { MessageSquare, X, Send, Bot } from 'lucide-react';
import { api } from '../../services/mockApi';
import { initSalesChatbot, sendChatMessage } from '../../services/geminiService';
import type { ChatMessage, Product } from '../../types';

const ChatbotWidget: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const initializeChat = async () => {
            if (isOpen && !isInitialized) {
                const products = await api.getProducts();
                await initSalesChatbot(products);
                setMessages([{
                    id: 'init',
                    text: 'مرحباً! أنا مساعد المبيعات الذكي. كيف يمكنني مساعدتك اليوم؟ يمكنك سؤالي عن أسعار المنتجات أو الكميات المتوفرة.',
                    sender: 'bot',
                    timestamp: Date.now()
                }]);
                setIsInitialized(true);
            }
        };
        initializeChat();
    }, [isOpen, isInitialized]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e: FormEvent) => {
        e.preventDefault();
        if (input.trim() === '' || isLoading) return;

        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            text: input,
            sender: 'user',
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        const botResponseText = await sendChatMessage(input);

        const botMessage: ChatMessage = {
            id: `bot-${Date.now()}`,
            text: botResponseText,
            sender: 'bot',
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, botMessage]);
        setIsLoading(false);
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-6 end-6 w-16 h-16 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center transform transition-all duration-300 hover:scale-110 hover:bg-blue-700 ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
                aria-label="افتح مساعد المبيعات"
            >
                <MessageSquare size={28} />
            </button>

            {isOpen && (
                <div className="fixed bottom-6 end-6 w-full max-w-sm h-[600px] bg-white dark:bg-slate-900 rounded-xl shadow-2xl flex flex-col animate-scaleUp origin-bottom-right border dark:border-slate-700">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-t-xl">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
                                <Bot size={22} className="text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white">مساعد المبيعات الذكي</h3>
                                <p className="text-xs text-green-500">● متصل</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-white"><X size={20}/></button>
                    </div>
                    
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map(msg => (
                            <div key={msg.id} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.sender === 'bot' && <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0"><Bot size={18} /></div>}
                                <div className={`max-w-[80%] p-3 rounded-2xl ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none'}`}>
                                    <p className="text-sm" style={{ whiteSpace: "pre-wrap" }}>{msg.text}</p>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex items-end gap-2 justify-start">
                               <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0"><Bot size={18} /></div>
                               <div className="max-w-[80%] p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none">
                                   <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-0"></span>
                                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-150"></span>
                                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-300"></span>
                                   </div>
                               </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSend} className="p-4 border-t dark:border-slate-800">
                        <div className="relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="اسأل عن منتج..."
                                className="w-full p-3 pe-12 rounded-full bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                            <button type="submit" className="absolute top-1/2 -translate-y-1/2 end-2 w-9 h-9 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:bg-slate-400">
                                <Send size={18} />
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
};

export default ChatbotWidget;