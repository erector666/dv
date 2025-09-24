import React, { useState, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Check, FileText, Zap } from 'lucide-react';
import { Button, Card } from '../ui';
import { useUserPreferences } from '../../context/UserPreferencesContext';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  targetElement?: string; // CSS selector
  placement?: 'top' | 'bottom' | 'left' | 'right';
  content?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface OnboardingContextType {
  isActive: boolean;
  currentStep: number;
  steps: OnboardingStep[];
  startOnboarding: (steps: OnboardingStep[]) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipOnboarding: () => void;
  completeOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
};

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const { preferences, updatePreference } = useUserPreferences();

  const startOnboarding = (newSteps: OnboardingStep[]) => {
    setSteps(newSteps);
    setCurrentStep(0);
    setIsActive(true);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeOnboarding();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const skipOnboarding = () => {
    setIsActive(false);
    updatePreference('showTutorials', false);
  };

  const completeOnboarding = () => {
    setIsActive(false);
    setCurrentStep(0);
    setSteps([]);
  };

  return (
    <OnboardingContext.Provider value={{
      isActive,
      currentStep,
      steps,
      startOnboarding,
      nextStep,
      prevStep,
      skipOnboarding,
      completeOnboarding
    }}>
      {children}
      {isActive && <OnboardingOverlay />}
    </OnboardingContext.Provider>
  );
};

const OnboardingOverlay: React.FC = () => {
  const { currentStep, steps, nextStep, prevStep, skipOnboarding, completeOnboarding } = useOnboarding();
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

  const currentStepData = steps[currentStep];

  useEffect(() => {
    if (currentStepData?.targetElement) {
      const element = document.querySelector(currentStepData.targetElement) as HTMLElement;
      setTargetElement(element);
      
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      setTargetElement(null);
    }
  }, [currentStepData]);

  if (!currentStepData) return null;

  const isLastStep = currentStep === steps.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-description"
      >
        {/* Highlight target element */}
        {targetElement && (
          <div
            className="absolute border-4 border-primary-500 rounded-lg pointer-events-none"
            style={{
              top: targetElement.offsetTop - 8,
              left: targetElement.offsetLeft - 8,
              width: targetElement.offsetWidth + 16,
              height: targetElement.offsetHeight + 16,
            }}
          />
        )}

        {/* Onboarding card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md mx-4"
        >
          <Card className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                    {currentStep + 1}
                  </span>
                </div>
                <span className="text-sm text-gray-500">
                  {currentStep + 1} of {steps.length}
                </span>
              </div>
              <button
                onClick={skipOnboarding}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="Skip onboarding"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="mb-6">
              <h2 id="onboarding-title" className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                {currentStepData.title}
              </h2>
              <p id="onboarding-description" className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {currentStepData.description}
              </p>
              {currentStepData.content && (
                <div className="mt-4">
                  {currentStepData.content}
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div className="mb-6">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <motion.div
                  className="bg-primary-500 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center">
              <div>
                {currentStep > 0 && (
                  <Button
                    variant="ghost"
                    onClick={prevStep}
                    leftIcon={<ChevronLeft className="w-4 h-4" />}
                    ariaLabel="Previous step"
                  >
                    Back
                  </Button>
                )}
              </div>

              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={skipOnboarding}
                  ariaLabel="Skip onboarding tutorial"
                >
                  Skip Tour
                </Button>
                
                {currentStepData.action ? (
                  <Button
                    variant="primary"
                    onClick={() => {
                      currentStepData.action!.onClick();
                      nextStep();
                    }}
                    ariaLabel={currentStepData.action.label}
                  >
                    {currentStepData.action.label}
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    onClick={isLastStep ? completeOnboarding : nextStep}
                    rightIcon={isLastStep ? <Check className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    ariaLabel={isLastStep ? "Complete onboarding" : "Next step"}
                  >
                    {isLastStep ? 'Complete' : 'Next'}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Predefined onboarding tours
export const onboardingTours = {
  welcome: [
    {
      id: 'welcome',
      title: 'Welcome to AppVault!',
      description: 'Let\'s take a quick tour to get you started with managing your documents.',
      content: (
        <div className="text-center">
          <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-primary-600" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This tour will show you the key features and help you get the most out of AppVault.
          </p>
        </div>
      )
    },
    {
      id: 'upload',
      title: 'Upload Documents',
      description: 'Click here to upload your documents. We support PDF, images, and text files.',
      targetElement: '[data-onboarding="upload-button"]'
    },
    {
      id: 'categories',
      title: 'Organize by Categories',
      description: 'Your documents are automatically organized into categories like Personal, Bills, Medical, etc.',
      targetElement: '[data-onboarding="categories"]'
    },
    {
      id: 'search',
      title: 'Search Everything',
      description: 'Use the search bar to quickly find any document by name, content, or metadata.',
      targetElement: '[data-onboarding="search"]'
    },
    {
      id: 'ai',
      title: 'AI-Powered Features',
      description: 'Our AI automatically extracts text, categorizes documents, and provides translations.',
      content: (
        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            AI processing happens automatically when you upload documents.
          </p>
        </div>
      )
    }
  ],

  features: [
    {
      id: 'dashboard',
      title: 'Your Dashboard',
      description: 'Get an overview of all your documents, recent activity, and quick stats.',
      targetElement: '[data-onboarding="dashboard"]'
    },
    {
      id: 'document-viewer',
      title: 'Document Viewer',
      description: 'Click any document to view it with AI-extracted text and metadata.',
      targetElement: '[data-onboarding="document-card"]'
    },
    {
      id: 'chat',
      title: 'AI Assistant',
      description: 'Ask questions about your documents using our AI chatbot.',
      targetElement: '[data-onboarding="chat-button"]'
    }
  ]
};

// Hook for triggering onboarding
export const useOnboardingTrigger = () => {
  const { startOnboarding } = useOnboarding();
  const { preferences } = useUserPreferences();

  const triggerWelcomeTour = () => {
    if (preferences.showTutorials) {
      startOnboarding(onboardingTours.welcome);
    }
  };

  const triggerFeatureTour = () => {
    startOnboarding(onboardingTours.features);
  };

  return { triggerWelcomeTour, triggerFeatureTour };
};