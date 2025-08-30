import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import { useAuth } from '../context/AuthContext';

// Lazy load pages for better performance
const Dashboard = React.lazy(() => import('../pages/Dashboard'));
const CategoryView = React.lazy(() => import('../pages/CategoryView'));
const Settings = React.lazy(() => import('../pages/Settings'));
const NotFound = React.lazy(() => import('../pages/NotFound'));

// Auth pages
const Login = React.lazy(() => import('../components/auth/Login'));
const Register = React.lazy(() => import('../components/auth/Register'));
const ForgotPassword = React.lazy(() => import('../components/auth/ForgotPassword'));

// Loading component for lazy-loaded routes
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
  </div>
);

const AppRoutes: React.FC = () => {
  const { currentUser } = useAuth();

  return (
    <React.Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={!currentUser ? <Login /> : <Navigate to="/dashboard" replace />} />
        <Route path="/register" element={!currentUser ? <Register /> : <Navigate to="/dashboard" replace />} />
        <Route path="/forgot-password" element={!currentUser ? <ForgotPassword /> : <Navigate to="/dashboard" replace />} />
        
        {/* Protected routes */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/category/:categoryId" 
          element={
            <ProtectedRoute>
              <CategoryView />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </React.Suspense>
  );
};

export default AppRoutes;
