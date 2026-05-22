
import React from 'react';

interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  variant?: 'glass' | 'flat' | 'outline';
}

const Card: React.FC<CardProps> = ({ children, className = '', title, variant = 'flat', ...props }) => {
  const variants = {
    glass: 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)] border border-slate-100/50 dark:border-slate-800/50',
    flat: 'bg-white dark:bg-slate-950 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-slate-100 dark:border-slate-800/80',
    outline: 'bg-transparent border-2 border-slate-200 dark:border-slate-800 border-dashed'
  };

  return (
    <div 
      className={`
        relative rounded-3xl overflow-hidden
        transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]
        ${variants[variant]}
        ${className}
      `} 
      {...props}
    >
        {title && (
          <div className="px-6 pt-6 pb-2">
            <h3 className="text-base font-bold text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
              {title}
            </h3>
          </div>
        )}
        <div className={`flex-1 ${title ? 'px-6 pb-6 pt-3' : 'p-6'}`}>
          {children}
        </div>
    </div>
  );
};

export default Card;

