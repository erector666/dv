import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { clsx } from 'clsx';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);

    // Auto-remove toast after duration
    const duration = toast.duration || 5000;
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearAllToasts }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => (
  <div 
    className="fixed top-4 right-4 z-50 space-y-3 max-w-sm w-full"
    role="region"
    aria-label="Notifications"
    aria-live="polite"
  >
    <AnimatePresence>
      {toasts.map(toast => (
        <ToastItem 
          key={toast.id} 
          toast={toast} 
          onRemove={() => onRemove(toast.id)} 
        />
      ))}
    </AnimatePresence>
  </div>
);

interface ToastItemProps {
  toast: Toast;
  onRemove: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info
  };

  const colorClasses = {
    success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200',
    error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200',
    info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200'
  };

  const iconColorClasses = {
    success: 'text-green-500',
    error: 'text-red-500',
    warning: 'text-yellow-500',
    info: 'text-blue-500'
  };

  const Icon = icons[toast.type];

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.8 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={clsx(
        'relative bg-white dark:bg-gray-800 border rounded-lg shadow-lg p-4',
        colorClasses[toast.type]
      )}
      role="alert"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
    >
      <div className="flex items-start">
        <Icon className={clsx('w-5 h-5 mt-0.5 mr-3 flex-shrink-0', iconColorClasses[toast.type])} aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm mb-1">
            {toast.title}
          </h4>
          {toast.description && (
            <p className="text-sm opacity-90 leading-relaxed">
              {toast.description}
            </p>
          )}
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="mt-3 text-sm font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-current rounded"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          onClick={onRemove}
          className="ml-3 flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-current rounded"
          aria-label={`Dismiss ${toast.title} notification`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

// Convenience functions for common toast types
export const createToastHelpers = (addToast: ToastContextType['addToast']) => ({
  success: (title: string, description?: string, options?: Partial<Toast>) =>
    addToast({ type: 'success', title, description, ...options }),
  
  error: (title: string, description?: string, options?: Partial<Toast>) =>
    addToast({ type: 'error', title, description, duration: 7000, ...options }),
  
  warning: (title: string, description?: string, options?: Partial<Toast>) =>
    addToast({ type: 'warning', title, description, duration: 6000, ...options }),
  
  info: (title: string, description?: string, options?: Partial<Toast>) =>
    addToast({ type: 'info', title, description, ...options }),

  // Specific use cases
  uploadSuccess: (fileName: string) =>
    addToast({
      type: 'success',
      title: 'Upload Complete',
      description: `${fileName} has been successfully uploaded and processed.`,
      duration: 4000
    }),

  uploadError: (fileName: string, error: string) =>
    addToast({
      type: 'error',
      title: 'Upload Failed',
      description: `Failed to upload ${fileName}: ${error}`,
      duration: 8000
    }),

  processingComplete: (fileName: string) =>
    addToast({
      type: 'success',
      title: 'Processing Complete',
      description: `AI processing for ${fileName} has finished successfully.`,
      duration: 4000
    }),

  networkError: () =>
    addToast({
      type: 'error',
      title: 'Connection Error',
      description: 'Unable to connect to the server. Please check your internet connection.',
      duration: 10000,
      action: {
        label: 'Retry',
        onClick: () => window.location.reload()
      }
    })
});

// Progress notification component
interface ProgressToastProps {
  title: string;
  progress: number;
  onCancel?: () => void;
  className?: string;
}

export const ProgressToast: React.FC<ProgressToastProps> = ({
  title,
  progress,
  onCancel,
  className
}) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      className={clsx(
        'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 min-w-[300px]',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900 dark:text-white">
          {title}
        </h4>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-500 rounded"
            aria-label="Cancel operation"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      
      <div className="mb-2">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
          <span>Progress</span>
          <span>{Math.round(clampedProgress)}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <motion.div
            className="bg-primary-500 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${clampedProgress}%` }}
            transition={{ duration: 0.3 }}
            role="progressbar"
            aria-valuenow={clampedProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${title} ${Math.round(clampedProgress)}% complete`}
          />
        </div>
      </div>
    </motion.div>
  );
};

// Status indicator component
interface StatusIndicatorProps {
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  message,
  className
}) => {
  const statusConfig = {
    idle: { icon: null, color: 'text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-800' },
    loading: { icon: null, color: 'text-blue-500', bgColor: 'bg-blue-100 dark:bg-blue-900/20' },
    success: { icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-100 dark:bg-green-900/20' },
    error: { icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-100 dark:bg-red-900/20' }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={clsx('flex items-center space-x-2', className)} role="status" aria-live="polite">
      <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center', config.bgColor)}>
        {status === 'loading' ? (
          <div className={clsx('w-4 h-4 border-2 border-t-transparent rounded-full animate-spin', config.color.replace('text-', 'border-'))} />
        ) : Icon ? (
          <Icon className={clsx('w-4 h-4', config.color)} />
        ) : (
          <div className={clsx('w-2 h-2 rounded-full', config.color.replace('text-', 'bg-'))} />
        )}
      </div>
      {message && (
        <span className={clsx('text-sm font-medium', config.color)}>
          {message}
        </span>
      )}
    </div>
  );
};