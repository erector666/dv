import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
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

function App() {

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <UploadModalProvider>
              <Router>
                <div className="App">
                  <AppRoutes />
                </div>
              </Router>
            </UploadModalProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
