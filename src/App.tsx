import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import './App.css';

// Contexts
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { UploadModalProvider } from './context/UploadModalContext';

// Routes
import AppRoutes from './routes';

// Create a client for React Query
const queryClient = new QueryClient();

// Create router with React Router v7 future flags to eliminate deprecation warnings
const router = createBrowserRouter([
  {
    path: "*",
    element: <AppRoutes />
  }
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
});

function App() {
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
