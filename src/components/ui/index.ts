// HeroUI-inspired Components
export { default as ThemeToggle } from './ThemeToggle';
export { Button, buttonVariants } from './Button';
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  TiltCard,
  StatsCard,
  FeatureCard,
  TestimonialCard,
} from './Card';

// Enhanced UI Components
export {
  LoadingSpinner,
  LoadingSkeleton as Skeleton,
  LoadingSkeleton as ListSkeleton,
  LoadingDots,
  LoadingProgress,
  DashboardLoadingState,
  DocumentListLoadingState,
  SearchLoadingState,
  UploadLoadingState,
  AnalyticsLoadingState,
  EmptyState
} from './LoadingStates';

export {
  ErrorState,
  NetworkError,
  EmptyDocumentList,
  EmptySearchResults,
  FileUploadError,
  ProcessingError,
  PermissionError,
  NotFoundError
} from './ErrorStates';

export {
  ToastProvider,
  useToast,
  createToastHelpers,
  ProgressToast,
  StatusIndicator
} from './FeedbackSystem';

// Re-export Lucide Icons for convenience
export {
  Sun as SunIcon,
  Moon as MoonIcon,
  Plus as PlusIcon,
  Trash2 as TrashIcon,
  Pencil as PencilIcon,
  Eye as EyeIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  Folder as FolderIcon,
  FileText as DocumentIcon,
  User as UserIcon,
  Settings as CogIcon,
  Bell as BellIcon,
  Search as SearchIcon,
  X as XMarkIcon,
  Check as CheckIcon,
  AlertTriangle as ExclamationTriangleIcon,
  Info as InformationCircleIcon,
} from 'lucide-react';
