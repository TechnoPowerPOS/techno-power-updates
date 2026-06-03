
import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm" 
          onClick={onClose}
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-white dark:bg-slate-950 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] w-full max-w-2xl m-4 border border-slate-100 dark:border-slate-800/80 overflow-hidden" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/20">
              <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">{title}</h3>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 p-2 rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
              >
                <X size={20} strokeWidth={3} />
              </button>
            </div>
            <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {children}
            </div>
            {footer && (
              <div className="flex items-center justify-end px-8 py-5 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/80 dark:bg-slate-900/50 gap-3">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
