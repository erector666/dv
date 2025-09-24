import React from 'react';
import { Upload, Search, FileText, Camera, FolderOpen, Sparkles } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';

interface ContextualEmptyStateProps {
  userType: 'first-time' | 'power-user' | 'regular';
  documentCount: number;
  onUpload?: () => void;
  onSearch?: () => void;
  className?: string;
}

export const ContextualEmptyState: React.FC<ContextualEmptyStateProps> = ({
  userType,
  documentCount,
  onUpload,
  onSearch,
  className = ''
}) => {
  if (documentCount > 0) {
    return null; // Don't show empty state if there are documents
  }

  const getEmptyStateContent = () => {
    switch (userType) {
      case 'first-time':
        return {
          icon: <Sparkles className="w-16 h-16 text-blue-500" />,
          title: "Welcome to Your Document Vault! 🎉",
          description: "Get started by uploading your first document. We'll help you organize, search, and manage all your files in one place.",
          primaryAction: {
            label: "Upload Your First Document",
            icon: <Upload className="w-5 h-5" />,
            onClick: onUpload
          },
          secondaryAction: {
            label: "Learn More",
            onClick: () => window.open('/help', '_blank')
          },
          tips: [
            "Drag and drop files directly onto the upload area",
            "Use the camera to scan documents instantly",
            "All documents are automatically categorized and searchable"
          ]
        };

      case 'power-user':
        return {
          icon: <FolderOpen className="w-16 h-16 text-purple-500" />,
          title: "No Documents Found",
          description: "It looks like your document collection is empty. Upload some documents to get started with advanced features like AI-powered search and automatic categorization.",
          primaryAction: {
            label: "Bulk Upload",
            icon: <Upload className="w-5 h-5" />,
            onClick: onUpload
          },
          secondaryAction: {
            label: "Import from Cloud",
            onClick: () => window.open('/import', '_blank')
          },
          tips: [
            "Use bulk upload for multiple files at once",
            "Connect cloud storage for automatic syncing",
            "Set up automated workflows for document processing"
          ]
        };

      case 'regular':
      default:
        return {
          icon: <FileText className="w-16 h-16 text-green-500" />,
          title: "Start Building Your Document Library",
          description: "Upload documents to begin organizing your digital files. Our AI will help categorize and make them searchable.",
          primaryAction: {
            label: "Upload Documents",
            icon: <Upload className="w-5 h-5" />,
            onClick: onUpload
          },
          secondaryAction: {
            label: "Browse Templates",
            onClick: () => window.open('/templates', '_blank')
          },
          tips: [
            "Supported formats: PDF, images, Word docs",
            "Documents are automatically processed and categorized",
            "Use search to find any document instantly"
          ]
        };
    }
  };

  const content = getEmptyStateContent();

  return (
    <div className={`flex items-center justify-center min-h-[60vh] px-4 ${className}`}>
      <Card variant="floating" className="max-w-2xl w-full text-center">
        <div className="p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            {content.icon}
          </div>

          {/* Title */}
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {content.title}
          </h2>

          {/* Description */}
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
            {content.description}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            {content.primaryAction && (
              <Button
                onClick={content.primaryAction.onClick}
                size="lg"
                className="min-w-[200px]"
              >
                {content.primaryAction.icon}
                {content.primaryAction.label}
              </Button>
            )}
            
            {content.secondaryAction && (
              <Button
                onClick={content.secondaryAction.onClick}
                variant="outline"
                size="lg"
                className="min-w-[200px]"
              >
                {content.secondaryAction.label}
              </Button>
            )}
          </div>

          {/* Quick Upload Options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
              <Upload className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">Upload Files</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Drag & drop or click to browse</p>
            </div>
            
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
              <Camera className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">Scan Document</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Use your camera to scan</p>
            </div>
            
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
              <Search className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">Search Later</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Find documents instantly</p>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-3">💡 Quick Tips</h3>
            <ul className="text-left space-y-2">
              {content.tips.map((tip, index) => (
                <li key={index} className="text-sm text-blue-800 dark:text-blue-200 flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

// Hook to determine user type based on behavior
export const useUserType = (documentCount: number, userBehavior?: any) => {
  if (documentCount === 0) {
    return 'first-time';
  }
  
  if (userBehavior?.isPowerUser) {
    return 'power-user';
  }
  
  return 'regular';
};

export default ContextualEmptyState;
