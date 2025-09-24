import React from 'react';
import { motion } from 'framer-motion';
import { 
  WifiOff, 
  AlertTriangle, 
  RefreshCw, 
  FileX, 
  FolderOpen,
  Search,
  Upload,
  Shield,
  Zap
} from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';
import { clsx } from 'clsx';

interface ErrorStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  description,
  icon,
  action,
  className
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={clsx('text-center py-12', className)}
  >
    {icon && (
      <div className="w-16 h-16 mx-auto mb-6 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
        {icon}
      </div>
    )}
    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
      {title}
    </h3>
    <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto leading-relaxed">
      {description}
    </p>
    {action}
  </motion.div>
);

interface NetworkErrorProps {
  onRetry: () => void;
  className?: string;
}

export const NetworkError: React.FC<NetworkErrorProps> = ({ onRetry, className }) => (
  <ErrorState
    icon={<WifiOff className="w-8 h-8 text-red-500" />}
    title="Connection Error"
    description="Unable to connect to the server. Please check your internet connection and try again."
    action={
      <Button 
        onClick={onRetry} 
        variant="primary"
        ariaLabel="Retry connection"
        leftIcon={<RefreshCw className="w-4 h-4" />}
      >
        Try Again
      </Button>
    }
    className={className}
  />
);

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className={clsx('text-center py-16', className)}
  >
    {icon && (
      <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
        {icon}
      </div>
    )}
    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
      {title}
    </h3>
    <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
      {description}
    </p>
    {action}
  </motion.div>
);

export const EmptyDocumentList: React.FC<{ 
  category?: string;
  onUpload?: () => void;
  className?: string;
}> = ({ category, onUpload, className }) => (
  <EmptyState
    icon={<FolderOpen className="w-10 h-10 text-gray-400" />}
    title={category ? `No ${category} documents` : 'No documents found'}
    description={
      category 
        ? `You haven't uploaded any ${category} documents yet. Start by uploading your first document.`
        : 'Upload your first document to get started with AppVault.'
    }
    action={
      onUpload && (
        <Button 
          onClick={onUpload}
          variant="primary"
          ariaLabel="Upload your first document"
          leftIcon={<Upload className="w-4 h-4" />}
        >
          Upload Document
        </Button>
      )
    }
    className={className}
  />
);

export const EmptySearchResults: React.FC<{ 
  searchTerm: string;
  onClearSearch?: () => void;
  className?: string;
}> = ({ searchTerm, onClearSearch, className }) => (
  <EmptyState
    icon={<Search className="w-10 h-10 text-gray-400" />}
    title="No results found"
    description={`No documents match "${searchTerm}". Try adjusting your search terms or browse by category.`}
    action={
      onClearSearch && (
        <Button 
          onClick={onClearSearch}
          variant="outline"
          ariaLabel="Clear search and show all documents"
        >
          Clear Search
        </Button>
      )
    }
    className={className}
  />
);

interface FileUploadErrorProps {
  error: string;
  fileName?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const FileUploadError: React.FC<FileUploadErrorProps> = ({
  error,
  fileName,
  onRetry,
  onDismiss,
  className
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className={clsx(
      'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4',
      className
    )}
    role="alert"
    aria-live="assertive"
  >
    <div className="flex items-start">
      <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <h4 className="text-red-800 dark:text-red-200 font-medium mb-1">
          Upload Failed
        </h4>
        {fileName && (
          <p className="text-red-700 dark:text-red-300 text-sm mb-1 font-medium">
            File: {fileName}
          </p>
        )}
        <p className="text-red-700 dark:text-red-300 text-sm mb-3">
          {error}
        </p>
        <div className="flex space-x-3">
          {onRetry && (
            <Button 
              size="sm" 
              variant="danger" 
              onClick={onRetry}
              ariaLabel={`Retry uploading ${fileName || 'file'}`}
              leftIcon={<RefreshCw className="w-3 h-3" />}
            >
              Try Again
            </Button>
          )}
          {onDismiss && (
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={onDismiss}
              ariaLabel="Dismiss error"
              className="text-red-600 hover:text-red-700"
            >
              Dismiss
            </Button>
          )}
        </div>
      </div>
    </div>
  </motion.div>
);

interface ProcessingErrorProps {
  title: string;
  description: string;
  onRetry?: () => void;
  onContact?: () => void;
  className?: string;
}

export const ProcessingError: React.FC<ProcessingErrorProps> = ({
  title,
  description,
  onRetry,
  onContact,
  className
}) => (
  <Card className={clsx('border-red-200 dark:border-red-800', className)}>
    <div className="text-center py-8">
      <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
        <Zap className="w-8 h-8 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
        {description}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {onRetry && (
          <Button 
            onClick={onRetry}
            variant="primary"
            ariaLabel="Retry processing"
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Try Again
          </Button>
        )}
        {onContact && (
          <Button 
            onClick={onContact}
            variant="outline"
            ariaLabel="Contact support for help"
          >
            Contact Support
          </Button>
        )}
      </div>
    </div>
  </Card>
);

interface PermissionErrorProps {
  resource: string;
  onLogin?: () => void;
  className?: string;
}

export const PermissionError: React.FC<PermissionErrorProps> = ({
  resource,
  onLogin,
  className
}) => (
  <ErrorState
    icon={<Shield className="w-8 h-8 text-red-500" />}
    title="Access Denied"
    description={`You don't have permission to access ${resource}. Please log in or contact an administrator.`}
    action={
      onLogin && (
        <Button 
          onClick={onLogin}
          variant="primary"
          ariaLabel="Log in to access this resource"
        >
          Log In
        </Button>
      )
    }
    className={className}
  />
);

export const NotFoundError: React.FC<{ 
  resource: string;
  onGoBack?: () => void;
  onGoHome?: () => void;
  className?: string;
}> = ({ resource, onGoBack, onGoHome, className }) => (
  <ErrorState
    icon={<FileX className="w-8 h-8 text-gray-500" />}
    title={`${resource} Not Found`}
    description={`The ${resource.toLowerCase()} you're looking for doesn't exist or has been moved.`}
    action={
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {onGoBack && (
          <Button 
            onClick={onGoBack}
            variant="outline"
            ariaLabel="Go back to previous page"
          >
            Go Back
          </Button>
        )}
        {onGoHome && (
          <Button 
            onClick={onGoHome}
            variant="primary"
            ariaLabel="Go to dashboard"
          >
            Go to Dashboard
          </Button>
        )}
      </div>
    }
    className={className}
  />
);