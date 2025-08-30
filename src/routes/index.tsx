import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Lazy load pages for better performance
const Dashboard = React.lazy(() => import('../pages/Dashboard'));
const CategoryView = React.lazy(() => import('../pages/CategoryView'));
const Settings = React.lazy(() => import('../pages/Settings'));
const NotFound = React.lazy(() => import('../pages/NotFound'));

// Loading component for lazy-loaded routes
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
  </div>
);

const AppRoutes: React.FC = () => {
  return (
    <React.Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/category/:categoryId" element={<CategoryView />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </React.Suspense>
  );
};

export default AppRoutes;
