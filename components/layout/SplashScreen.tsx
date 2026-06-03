import React from 'react';
import { motion } from 'motion/react';

const SplashScreen: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col items-center gap-6"
      >
        <motion.div 
          animate={{ 
            y: [0, -15, 0],
            boxShadow: [
              "0px 4px 15px rgba(37, 99, 235, 0.2)",
              "0px 20px 25px rgba(37, 99, 235, 0.4)",
              "0px 4px 15px rgba(37, 99, 235, 0.2)"
            ]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-xl"
        >
            <span className="text-5xl text-white">⚡</span>
        </motion.div>
        
        <div className="text-center mt-2">
            <h1 className="text-3xl font-black tracking-tight mb-2">تكنو باور</h1>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">نظام إدارة المبيعات والمخزون</p>
        </div>
        
        <div className="w-48 h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-6">
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: "-100%" }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="h-full bg-blue-500 rounded-full w-1/2"
            />
        </div>
      </motion.div>
    </div>
  );
};

export default SplashScreen;