import React, { useMemo } from 'react';
import { useQuery } from 'react-query';
import { motion } from 'framer-motion';
import {
  FileText,
  TrendingUp,
  Clock,
  Zap,
  Users,
  Activity,
  BarChart3,
  PieChart
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUserPreferences } from '../../context/UserPreferencesContext';
import { getDocuments, Document } from '../../services/documentService';
import { 
  Card, 
  StatsCard, 
  LoadingSpinner, 
  EmptyState,
  NetworkError 
} from '../ui';
import { formatFileSize, formatDate } from '../../utils/formatters';

interface DashboardStats {
  totalDocuments: number;
  totalSize: number;
  recentUploads: number;
  processingCount: number;
  categoryCounts: Record<string, number>;
  weeklyActivity: number[];
  topCategories: Array<{ category: string; count: number; percentage: number }>;
}

const EnhancedDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { preferences } = useUserPreferences();

  // Fetch documents
  const { 
    data: documents, 
    isLoading, 
    isError, 
    error,
    refetch 
  } = useQuery(
    ['documents', currentUser?.uid],
    () => getDocuments(currentUser?.uid || ''),
    {
      enabled: !!currentUser?.uid,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchInterval: preferences.autoRefresh ? 30000 : false
    }
  );

  // Calculate comprehensive statistics
  const stats: DashboardStats = useMemo(() => {
    if (!documents) {
      return {
        totalDocuments: 0,
        totalSize: 0,
        recentUploads: 0,
        processingCount: 0,
        categoryCounts: {},
        weeklyActivity: Array(7).fill(0),
        topCategories: []
      };
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const categoryCounts: Record<string, number> = {};
    const weeklyActivity = Array(7).fill(0);
    let totalSize = 0;
    let recentUploads = 0;
    let processingCount = 0;

    documents.forEach(doc => {
      // Total size
      totalSize += doc.size || 0;

      // Category counts
      const category = doc.category || 'other';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;

      // Recent uploads (last 24 hours)
      const uploadDate = doc.uploadedAt?.toDate?.() || new Date(doc.uploadedAt || 0);
      if (uploadDate > dayAgo) {
        recentUploads++;
      }

      // Weekly activity
      if (uploadDate > weekAgo) {
        const dayIndex = Math.floor((now.getTime() - uploadDate.getTime()) / (24 * 60 * 60 * 1000));
        if (dayIndex < 7) {
          weeklyActivity[6 - dayIndex]++;
        }
      }

      // Processing count
      if (doc.status === 'processing') {
        processingCount++;
      }
    });

    // Top categories
    const topCategories = Object.entries(categoryCounts)
      .map(([category, count]) => ({
        category,
        count,
        percentage: Math.round((count / documents.length) * 100)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalDocuments: documents.length,
      totalSize,
      recentUploads,
      processingCount,
      categoryCounts,
      weeklyActivity,
      topCategories
    };
  }, [documents]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return <NetworkError onRetry={() => refetch()} />;
  }

  if (!documents?.length) {
    return (
      <EmptyState
        icon={<FileText className="w-12 h-12 text-gray-400" />}
        title="Welcome to AppVault!"
        description="Start by uploading your first document to see your dashboard come to life."
        action={
          <button className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
            Upload Your First Document
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome back, {currentUser?.displayName || 'User'}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Here's what's happening with your documents
        </p>
      </motion.div>

      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          icon={<FileText className="w-6 h-6 text-blue-600" />}
          label="Total Documents"
          value={stats.totalDocuments}
          trend={stats.recentUploads > 0 ? 'up' : 'neutral'}
          trendValue={stats.recentUploads > 0 ? `+${stats.recentUploads} today` : 'No new uploads'}
          onClick={() => {}}
        />

        <StatsCard
          icon={<TrendingUp className="w-6 h-6 text-green-600" />}
          label="Storage Used"
          value={formatFileSize(stats.totalSize)}
          trend="neutral"
          onClick={() => {}}
        />

        <StatsCard
          icon={<Clock className="w-6 h-6 text-orange-600" />}
          label="Recent Uploads"
          value={stats.recentUploads}
          trend={stats.recentUploads > 0 ? 'up' : 'neutral'}
          trendValue="Last 24h"
          onClick={() => {}}
        />

        <StatsCard
          icon={<Zap className="w-6 h-6 text-purple-600" />}
          label="Processing"
          value={stats.processingCount}
          trend={stats.processingCount > 0 ? 'up' : 'neutral'}
          trendValue={stats.processingCount > 0 ? 'In progress' : 'All complete'}
          onClick={() => {}}
        />
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Activity Chart */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Weekly Activity
              </h3>
              <BarChart3 className="w-5 h-5 text-gray-500" />
            </div>
            <div className="flex items-end space-x-2 h-32">
              {stats.weeklyActivity.map((count, index) => {
                const maxCount = Math.max(...stats.weeklyActivity, 1);
                const height = (count / maxCount) * 100;
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <motion.div
                      className="w-full bg-primary-500 rounded-t"
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      title={`${count} uploads on ${days[index]}`}
                    />
                    <span className="text-xs text-gray-500 mt-2">{days[index]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Category Distribution */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Document Categories
              </h3>
              <PieChart className="w-5 h-5 text-gray-500" />
            </div>
            <div className="space-y-3">
              {stats.topCategories.map((category, index) => (
                <motion.div
                  key={category.category}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full bg-primary-${500 + index * 100}`} />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                      {category.category}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">{category.count}</span>
                    <span className="text-xs text-gray-400">({category.percentage}%)</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="p-4 text-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800 hover:shadow-md transition-all"
            >
              <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Upload</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="p-4 text-center bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800 hover:shadow-md transition-all"
            >
              <Activity className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Analytics</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="p-4 text-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800 hover:shadow-md transition-all"
            >
              <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Share</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="p-4 text-center bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg border border-orange-200 dark:border-orange-800 hover:shadow-md transition-all"
            >
              <BarChart3 className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Reports</span>
            </motion.button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default EnhancedDashboard;