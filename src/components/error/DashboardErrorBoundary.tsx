import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card } from '../ui/Card';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export class DashboardErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to monitoring service
    this.logError(error, errorInfo);

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private logError = (error: Error, errorInfo: ErrorInfo) => {
    // In a real app, send to error monitoring service (Sentry, LogRocket, etc.)
    console.group('🚨 Dashboard Error Boundary');
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Component Stack:', errorInfo.componentStack);
    console.groupEnd();

    // You could send to an error tracking service here
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
  };

  private handleRetry = () => {
    const { retryCount } = this.state;
    
    if (retryCount >= 3) {
      // Max retries reached, suggest page reload
      window.location.reload();
      return;
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: retryCount + 1,
    });

    // Add a small delay to prevent immediate re-error
    this.retryTimeoutId = setTimeout(() => {
      // Force a re-render by updating state
      this.forceUpdate();
    }, 100);
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReload = () => {
    window.location.reload();
  };

  private getErrorMessage = (error: Error): string => {
    if (error.message.includes('ChunkLoadError') || error.message.includes('Loading chunk')) {
      return 'Failed to load application resources. This usually happens after an update.';
    }
    
    if (error.message.includes('Network Error') || error.message.includes('fetch')) {
      return 'Network connection error. Please check your internet connection.';
    }
    
    if (error.message.includes('Permission denied') || error.message.includes('Unauthorized')) {
      return 'Authentication error. You may need to log in again.';
    }
    
    return 'An unexpected error occurred in the dashboard.';
  };

  private getSuggestion = (error: Error): string => {
    if (error.message.includes('ChunkLoadError') || error.message.includes('Loading chunk')) {
      return 'Try reloading the page to get the latest version.';
    }
    
    if (error.message.includes('Network Error') || error.message.includes('fetch')) {
      return 'Check your internet connection and try again.';
    }
    
    if (error.message.includes('Permission denied') || error.message.includes('Unauthorized')) {
      return 'Try logging out and logging back in.';
    }
    
    return 'Try refreshing the page or contact support if the problem persists.';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, retryCount } = this.state;
      const errorMessage = error ? this.getErrorMessage(error) : 'Unknown error';
      const suggestion = error ? this.getSuggestion(error) : 'Try reloading the page';

      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
          <Card variant="floating" className="max-w-2xl w-full">
            <div className="text-center">
              {/* Error Icon */}
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-6">
                <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>

              {/* Error Title */}
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Dashboard Error
              </h1>

              {/* Error Message */}
              <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                {errorMessage}
              </p>

              {/* Suggestion */}
              <p className="text-sm text-gray-500 dark:text-gray-500 mb-8">
                {suggestion}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={this.handleRetry}
                  disabled={retryCount >= 3}
                  className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  <RefreshCw className="h-5 w-5 mr-2" />
                  {retryCount >= 3 ? 'Max Retries Reached' : `Retry${retryCount > 0 ? ` (${retryCount}/3)` : ''}`}
                </button>

                <button
                  onClick={this.handleReload}
                  className="flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                >
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Reload Page
                </button>

                <button
                  onClick={this.handleGoHome}
                  className="flex items-center justify-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  <Home className="h-5 w-5 mr-2" />
                  Go Home
                </button>
              </div>

              {/* Development Error Details */}
              {process.env.NODE_ENV === 'development' && error && (
                <details className="mt-8 text-left">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex items-center justify-center">
                    <Bug className="h-4 w-4 mr-2" />
                    Developer Details
                  </summary>
                  <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs overflow-auto">
                    <div className="mb-4">
                      <h4 className="font-semibold text-red-600 dark:text-red-400 mb-2">Error:</h4>
                      <pre className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                        {error.message}
                      </pre>
                    </div>
                    
                    {error.stack && (
                      <div className="mb-4">
                        <h4 className="font-semibold text-red-600 dark:text-red-400 mb-2">Stack Trace:</h4>
                        <pre className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 text-xs">
                          {error.stack}
                        </pre>
                      </div>
                    )}
                    
                    {this.state.errorInfo && (
                      <div>
                        <h4 className="font-semibold text-red-600 dark:text-red-400 mb-2">Component Stack:</h4>
                        <pre className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 text-xs">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Help Text */}
              <p className="mt-6 text-xs text-gray-400 dark:text-gray-600">
                Error ID: {Date.now().toString(36)}-{Math.random().toString(36).substr(2, 9)}
              </p>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default DashboardErrorBoundary;