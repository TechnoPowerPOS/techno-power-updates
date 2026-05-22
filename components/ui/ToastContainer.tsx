import React from 'react';
import { useToasts } from '../../hooks/useToasts';
import Toast from './Toast';

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToasts();

  return (
    <div className="fixed top-20 end-4 z-[9999] w-full max-w-sm space-y-3">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          onDismiss={removeToast}
        />
      ))}
    </div>
  );
};

export default ToastContainer;