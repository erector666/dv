import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Activity, TrendingUp } from 'lucide-react';
import { StatsCard } from '../ui';
import { formatFileSize } from '../../utils/formatters';
import { DocumentStats } from '../../hooks/useOptimizedDocuments';

export interface DashboardStatsProps {
  documentStats: DocumentStats;
  className?: string;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  documentStats,
  className = '',
}) => {
  const navigate = useNavigate();

  // Memoized stats cards to prevent unnecessary re-renders
  const statsCards = useMemo(() => [
    {
      key: 'total',
      variant: 'glass' as const,
      icon: <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />,
      label: 'Total Documents',
      value: documentStats.totalDocuments,
      trend: documentStats.weeklyGrowth > 0 ? 'up' as const : documentStats.weeklyGrowth < 0 ? 'down' as const : 'neutral' as const,
      trendValue: `${Math.abs(documentStats.weeklyGrowth).toFixed(0)}%`,
      onClick: () => navigate('/search'),
    },
    {
      key: 'storage',
      variant: 'glassPurple' as const,
      icon: <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />,
      label: 'Storage Used',
      value: formatFileSize(documentStats.totalSize),
      onClick: () => navigate('/settings'),
    },
    {
      key: 'recent',
      variant: 'neonGreen' as const,
      icon: <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />,
      label: 'This Week',
      value: documentStats.recentDocuments,
      onClick: () => navigate('/search'),
    },
    {
      key: 'processing',
      variant: 'gradientSunset' as const,
      icon: <Activity className="w-5 h-5 sm:w-6 sm:h-6" />,
      label: 'Processing',
      value: documentStats.processingCount,
      onClick: () => navigate('/search'),
    },
  ], [documentStats, navigate]);

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8 relative z-10 ${className}`}>
      {statsCards.map((card) => (
        <StatsCard
          key={card.key}
          variant={card.variant}
          icon={card.icon}
          label={card.label}
          value={card.value}
          trend={card.trend}
          trendValue={card.trendValue}
          className="active:scale-95 transition-all duration-200 touch-manipulation"
          onClick={card.onClick}
        />
      ))}
    </div>
  );
};

export default DashboardStats;