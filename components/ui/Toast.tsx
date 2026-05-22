import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle as ErrorIcon } from 'lucide-react';
import type { ToastType } from '../../types';

interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  onDismiss: (id: string) => void;
  duration?: number;
}

const toastConfig = {
  success: {
    icon: <CheckCircle />,
    bg: 'bg-green-500',
    border: 'border-green-600',
  },
  error: {
    icon: <ErrorIcon />,
    bg: 'bg-red-500',
    border: 'border-red-600',
  },
  warning: {
    icon: <AlertTriangle />,
    bg: 'bg-yellow-500',
    border: 'border-yellow-600',
  },
  info: {
    icon: <Info />,
    bg: 'bg-blue-500',
    border: 'border-blue-600',
  },
};

const Toast: React.FC<ToastProps> = ({ id, message, type, onDismiss, duration = 5000 }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => {
      clearTimeout(timer);
    };
  }, [id, duration, onDismiss]);
  
  const handleDismiss = () => {
      setIsExiting(true);
      setTimeout(() => onDismiss(id), 500); // Wait for animation to finish
  }

  const config = toastConfig[type];

  return (
    <div
      className={`relative w-full max-w-sm p-4 text-white rounded-lg shadow-2xl flex items-center gap-4 border-l-4 ${config.bg} ${config.border} ${isExiting ? 'animate-fade-out' : 'animate-slide-in-from-right'}`}
      role="alert"
    >
      <div className="flex-shrink-0">{config.icon}</div>
      <p className="flex-grow text-sm font-semibold">{message}</p>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors"
        aria-label="Close"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default Toast;