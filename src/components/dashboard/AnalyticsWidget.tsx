import React, { useMemo, useState } from 'react';
import { BarChart3, TrendingUp, PieChart, Calendar, FileText } from 'lucide-react';
import { Card } from '../ui';
import { ToggleButton } from '../ui/AccessibleButton';

interface AnalyticsWidgetProps {
  documents?: any[];
  className?: string;
}

interface ChartData {
  label: string;
  value: number;
  color: string;
  percentage?: number;
}

const AnalyticsWidget: React.FC<AnalyticsWidgetProps> = ({ documents = [], className }) => {
  const [viewMode, setViewMode] = useState<'basic' | 'advanced'>('basic');

  // Memoized analytics data calculation - single pass through documents
  const analyticsData = useMemo(() => {
    const totalDocuments = documents.length;
    const totalSize = documents.reduce((sum: number, doc: any) => sum + (doc.size || 0), 0);
    
    // Single pass to count all categories
    const categoryCounts = documents.reduce((acc: Record<string, number>, doc: any) => {
      const category = doc.category || 'other';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Documents by category with optimized calculation
    const categoryData: ChartData[] = [
      {
        label: 'Personal',
        value: categoryCounts.personal || 0,
        color: 'bg-blue-500',
      },
      {
        label: 'Bills',
        value: categoryCounts.bills || 0,
        color: 'bg-green-500',
      },
      {
        label: 'Medical',
        value: categoryCounts.medical || 0,
        color: 'bg-red-500',
      },
      {
        label: 'Insurance',
        value: categoryCounts.insurance || 0,
        color: 'bg-purple-500',
      },
      {
        label: 'Other',
        value: categoryCounts.other || 0,
        color: 'bg-gray-500',
      },
    ].map(item => ({
      ...item,
      percentage: totalDocuments > 0 ? Math.round((item.value / totalDocuments) * 100) : 0,
    }));

    // Documents uploaded over time (last 7 days) - optimized
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date;
    }).reverse();

    // Single pass to count uploads by day
    const uploadCounts = documents.reduce((acc: Record<string, number>, doc: any) => {
      const uploadDate = doc.uploadedAt?.toDate?.() || new Date(doc.uploadedAt || 0);
      const dayKey = uploadDate.toDateString();
      acc[dayKey] = (acc[dayKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const uploadTrend = last7Days.map(date => ({
      label: date.toLocaleDateString('en-US', { weekday: 'short' }),
      value: uploadCounts[date.toDateString()] || 0,
      color: 'bg-blue-500',
    }));

    const maxTrendValue = Math.max(...uploadTrend.map(d => d.value), 1);

    // File type distribution - optimized single pass
    const typeCounts = documents.reduce((acc: any, doc: any) => {
      const type = doc.type || '';
      if (type === 'application/pdf') {
        acc.pdf++;
      } else if (type.startsWith('image/')) {
        acc.images++;
      } else if (type.includes('word') || type.includes('document')) {
        acc.documents++;
      }
      return acc;
    }, { pdf: 0, images: 0, documents: 0 });

    const typeData: ChartData[] = [
      {
        label: 'PDF',
        value: typeCounts.pdf,
        color: 'bg-red-500',
      },
      {
        label: 'Images',
        value: typeCounts.images,
        color: 'bg-blue-500',
      },
      {
        label: 'Documents',
        value: typeCounts.documents,
        color: 'bg-green-500',
      },
    ].map(item => ({
      ...item,
      percentage: totalDocuments > 0 ? Math.round((item.value / totalDocuments) * 100) : 0,
    }));

    const formatFileSize = (bytes: number): string => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return {
      totalDocuments,
      totalSize,
      categoryData,
      uploadTrend,
      maxTrendValue,
      typeData,
      formatFileSize
    };
  }, [documents]);

  const { totalDocuments, totalSize, categoryData, uploadTrend, maxTrendValue, typeData, formatFileSize } = analyticsData;

  return (
    <div className={className}>
      <Card variant="floating">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <span>Document Analytics</span>
            </h3>
            <div className="flex items-center space-x-2">
              <ToggleButton
                pressed={viewMode === 'basic'}
                onPressedChange={() => setViewMode('basic')}
                size="sm"
              >
                Basic
              </ToggleButton>
              <ToggleButton
                pressed={viewMode === 'advanced'}
                onPressedChange={() => setViewMode('advanced')}
                size="sm"
              >
                Advanced
              </ToggleButton>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Summary Stats */}
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      Total Documents
                    </p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                      {totalDocuments}
                    </p>
                  </div>
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">
                      Storage Used
                    </p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                      {formatFileSize(totalSize)}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                      This Week
                    </p>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                      {uploadTrend.reduce((sum, day) => sum + day.value, 0)}
                    </p>
                  </div>
                  <Calendar className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="space-y-6">
              {/* Category Distribution */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
                  <PieChart className="w-4 h-4" />
                  <span>By Category</span>
                </h4>
                <div className="space-y-2">
                  {categoryData
                    .filter(item => item.value > 0)
                    .map((item, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${item.color}`} />
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {item.label}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {item.value}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({item.percentage}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upload Trend */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>Upload Trend</span>
                </h4>
                <div className="flex items-end space-x-1 h-16">
                  {uploadTrend.map((day, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                        style={{
                          height: `${(day.value / maxTrendValue) * 100}%`,
                          minHeight: day.value > 0 ? '4px' : '2px',
                        }}
                        title={`${day.label}: ${day.value} documents`}
                      />
                      <span className="text-xs text-gray-500 mt-1">
                        {day.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* File Types */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  File Types
                </h4>
                <div className="space-y-2">
                  {typeData
                    .filter(item => item.value > 0)
                    .map((item, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${item.color}`} />
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {item.label}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {item.value}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({item.percentage}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AnalyticsWidget;