import React, { useState, useEffect, useRef, FormEvent } from 'react';
import Modal from '../ui/Modal';
import { X, Send, Bot } from 'lucide-react';
import { initSupportChatbot, sendSupportMessage } from '../../services/geminiService';
import type { ChatMessage } from '../../types';

interface SupportChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SupportChatbotModal: React.FC<SupportChatbotModalProps> = ({ isOpen, onClose }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const initializeChat = async () => {
            if (isOpen && !isInitialized) {
                await initSupportChatbot();
                setMessages([{
                    id: 'init',
                    text: 'مرحباً! أنا مساعد الدعم الفني. كيف يمكنني مساعدتك في استخدام برنامج تكنو فلاش؟',
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

        const botResponseText = await sendSupportMessage(input);

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
        <Modal isOpen={isOpen} onClose={onClose} title="مساعد الدعم الفني الذكي">
            <div className="h-[60vh] flex flex-col">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 -mx-6 -my-4 mb-0 bg-slate-50 dark:bg-slate-800/50">
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.sender === 'bot' && <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0"><Bot size={18} /></div>}
                            <div className={`max-w-[80%] p-3 rounded-2xl ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none shadow-sm'}`}>
                                <p className="text-sm" style={{ whiteSpace: "pre-wrap" }}>{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-end gap-2 justify-start">
                           <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0"><Bot size={18} /></div>
                           <div className="max-w-[80%] p-3 rounded-2xl bg-white dark:bg-slate-700 shadow-sm">
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
                <form onSubmit={handleSend} className="p-4 border-t dark:border-slate-800 -mx-6 -mb-6 mt-0">
                    <div className="relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="اطرح سؤالك هنا..."
                            className="w-full p-3 pe-12 rounded-full bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        <button type="submit" className="absolute top-1/2 -translate-y-1/2 end-2 w-9 h-9 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:bg-slate-400">
                            <Send size={18} />
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default SupportChatbotModal;
