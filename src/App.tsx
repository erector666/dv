import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
// import { cleanupFirebase } from './services/firebase'; // Removed - not needed
import './App.css';

// Contexts
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { UploadModalProvider } from './context/UploadModalContext';

// Components
import ErrorBoundary from './components/ErrorBoundary';

// Routes
import AppRoutes from './routes';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Increase stale time to reduce unnecessary refetches
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Increase cache time to keep data longer
      cacheTime: 10 * 60 * 1000, // 10 minutes
      // Retry configuration for network errors
      retry: (failureCount, error: any) => {
        // Don't retry on authentication errors
        if (
          error?.code === 'permission-denied' ||
          error?.code === 'unauthenticated'
        ) {
          return false;
        }
        // Retry up to 3 times for network errors
        return failureCount < 3;
      },
      // Retry delay with exponential backoff
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Don't refetch on window focus to prevent QUIC errors
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect to prevent connection issues
      refetchOnReconnect: 'always',
      // Background refetch interval
      refetchInterval: false,
      // Don't refetch on mount if data is fresh
      refetchOnMount: 'always',
    },
    mutations: {
      // Retry mutations once for network errors
      retry: (failureCount, error: any) => {
        if (
          error?.code === 'permission-denied' ||
          error?.code === 'unauthenticated'
        ) {
          return false;
        }
        return failureCount < 1;
      },
    },
  },
});

// Create router with React Router v7 future flags to eliminate deprecation warnings
const router = createBrowserRouter(
  [
    {
      path: '*',
      element: <AppRoutes />,
      errorElement: (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg
                  className="h-8 w-8 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Loading Error
                </h3>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Failed to load application resources. This is usually a temporary issue.
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Reload Page
              </button>
              <button
                onClick={() => {
                  if ('caches' in window) {
                    caches.keys().then((names) => {
                      names.forEach((name) => {
                        caches.delete(name);
                      });
                    });
                  }
                  window.location.reload();
                }}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Clear Cache & Reload
              </button>
            </div>
          </div>
        </div>
      ),
    },
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  }
);

function App() {
  // Firebase cleanup removed - not needed for production

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <UploadModalProvider>
                <RouterProvider router={router} />
              </UploadModalProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
