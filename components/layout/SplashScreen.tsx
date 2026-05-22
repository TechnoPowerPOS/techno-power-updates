import React from 'react';

const SplashScreen: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen bg-gray-100 dark:bg-slate-950 text-gray-800 dark:text-gray-200">
      <div className="flex flex-col items-center gap-4 animate-fadeIn">
        {/* Icon with a new bounce animation */}
        <div className="w-28 h-28 bg-blue-600 rounded-full flex items-center justify-center shadow-lg animate-bounceIn">
            <span className="text-6xl text-white" role="img" aria-label="Lightning bolt icon">⚡</span>
        </div>
        
        {/* App name and new tagline */}
        <div className="text-center mt-4">
            <h1 className="text-4xl font-extrabold tracking-tight">تكنو باور POS</h1>
            <p className="text-lg text-gray-500 dark:text-gray-400 mt-2">نقطة البيع الحديثة لعملك</p>
        </div>
        
        {/* Dynamic loading bar */}
        <div className="w-64 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-8">
            <div className="h-full bg-blue-500 rounded-full animate-loading-bar-fill"></div>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">...جاري تهيئة بيئة العمل</p>
      </div>
    </div>
  );
};

export default SplashScreen;