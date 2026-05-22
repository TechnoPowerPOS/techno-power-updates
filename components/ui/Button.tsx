import React from 'react';
import { useSettings } from '../../hooks/useSettings';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  isLoading = false,
  ...props
}) => {
  const { settings } = useSettings();
  const shape = settings?.buttonStyle || 'rounded';
  const customColor = settings?.buttonColor;

  const shapeStyles = {
    rounded: 'rounded-2xl',
    squared: 'rounded-md',
    pill: 'rounded-full'
  };

  const baseStyles = `relative font-bold focus:outline-none focus:ring-4 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform active:scale-[0.98] overflow-hidden`;
  const shapeClass = shapeStyles[shape as keyof typeof shapeStyles] || 'rounded-2xl';

  const sizeStyles = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
  };

  const isPrimaryCustom = variant === 'primary' && customColor;
  
  const variantStyles = {
    primary: isPrimaryCustom ? 'text-white shadow-sm' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-[0_2px_12px_rgba(37,99,235,0.2)] hover:shadow-[0_4px_16px_rgba(37,99,235,0.3)] focus:ring-blue-500/30',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 shadow-sm focus:ring-slate-200/50 dark:focus:ring-slate-800/50',
    danger: 'bg-rose-500 hover:bg-rose-600 text-white shadow-[0_2px_12px_rgba(244,63,94,0.2)] hover:shadow-[0_4px_16px_rgba(244,63,94,0.3)] focus:ring-rose-500/30',
    success: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_2px_12px_rgba(16,185,129,0.2)] hover:shadow-[0_4px_16px_rgba(16,185,129,0.3)] focus:ring-emerald-500/30',
    outline: 'bg-transparent border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200 focus:ring-slate-200/50 dark:focus:ring-slate-800/50',
    ghost: 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-slate-200/50 dark:focus:ring-slate-800/50',
  };

  const customStyle = isPrimaryCustom ? { backgroundColor: customColor } : {};

  // Remove any conflicting rounded classes from incoming className to respect global shape setting
  const cleanedClassName = className.replace(/rounded-[^\s]+/g, '');

  return (
    <button
      type={props.type || "button"}
      className={`${baseStyles} ${shapeClass} ${sizeStyles[size]} ${variantStyles[variant]} ${cleanedClassName}`}
      disabled={isLoading || props.disabled}
      style={customStyle}
      {...props}
    >
      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none"></div>
      {isLoading && (
        <svg className="animate-spin h-5 w-5 z-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      <span className={`z-10 transition-opacity duration-200 ${isLoading ? 'opacity-0' : 'opacity-100'} flex items-center justify-center gap-2`}>{children}</span>
      {isLoading && <span className="absolute z-10">{children}</span>}
    </button>
  );
};

export default Button;
