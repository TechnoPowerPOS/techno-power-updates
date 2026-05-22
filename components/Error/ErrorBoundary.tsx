import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white">
          <h2 className="text-2xl font-bold mb-4">عذراً، حدث خطأ غير متوقع.</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{this.state.error?.message}</p>
          <button
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            onClick={() => window.location.reload()}
          >
            إعادة تحميل البرنامج
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
