import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import { useAuth } from '../context/AuthContext';
import SplashScreen from '../components/splash/SplashScreen';
import Layout from '../components/layout/Layout';

// Lazy load pages for better performance
const Dashboard = React.lazy(() => import('../pages/Dashboard'));
const CategoryView = React.lazy(() => import('../pages/CategoryView'));
const Settings = React.lazy(() => import('../pages/Settings'));
const Upload = React.lazy(() => import('../pages/Upload'));
const Search = React.lazy(() => import('../pages/Search'));
const Profile = React.lazy(() => import('../components/profile/EnhancedProfile'));
const NotFound = React.lazy(() => import('../pages/NotFound'));

// Auth pages
const Login = React.lazy(() => import('../components/auth/Login'));
const Register = React.lazy(() => import('../components/auth/Register'));
const ForgotPassword = React.lazy(
  () => import('../components/auth/ForgotPassword')
);

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
        <Route path="/" element={<SplashScreen />} />
        <Route
          path="/login"
          element={
            !currentUser ? <Login /> : <Navigate to="/dashboard" replace />
          }
        />
        <Route
          path="/register"
          element={
            !currentUser ? <Register /> : <Navigate to="/dashboard" replace />
          }
        />
        <Route
          path="/forgot-password"
          element={
            !currentUser ? (
              <ForgotPassword />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/category/:categoryId"
          element={
            <ProtectedRoute>
              <Layout>
                <CategoryView />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <Upload />
            </ProtectedRoute>
          }
        />
        <Route
          path="/search"
          element={
            <ProtectedRoute>
              <Search />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Layout>
                <Settings />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Layout>
                <Profile />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </React.Suspense>
  );
};

export default AppRoutes;
