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
  );
}

export default App;
