import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  chatbotService,
  ChatMessage,
  ConversationContext,
} from '../../services/chatbotService';

// Interface definitions moved to chatbotService.ts

interface ChatBotProps {
  isOpen: boolean;
  onClose: () => void;
  onAction?: (action: string, data?: any) => void;
  recentDocuments?: Array<{
    id: string;
    name: string;
    category: string;
    uploadDate: Date;
    url?: string;
    size?: number;
    type?: string;
  }>;
}

const ChatBot: React.FC<ChatBotProps> = ({
  isOpen,
  onClose,
  onAction,
  recentDocuments = [],
}) => {
  const { currentUser } = useAuth();
  const { language, translate } = useLanguage();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const conversationId = useRef<string>(
    `chat_${currentUser?.uid}_${Date.now()}`
  );

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Initialize chat with Dorian's welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: `welcome_${Date.now()}`,
        role: 'assistant',
        content: translate('dorian.welcome') || `Hi! I'm Dorian, your AI assistant for DocVault! 😊

I can help you analyze your documents, answer questions about your files, and explain how to use DocVault features.

Try asking me about your last uploaded file, document statistics, or how to organize your documents!`,
        timestamp: new Date(),
      };

      setMessages([welcomeMessage]);
    }
  }, [isOpen, language, messages.length, translate]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      // Validate message
      const validation = chatbotService.validateMessage(userMessage.content);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Build context
      const context: ConversationContext = {
        userId: currentUser?.uid || '',
        language: language,
        recentDocuments: recentDocuments,
        userPreferences: {
          preferredCategories: [],
          language: language,
          systemNote: "You are Dorian, an AI assistant for DocVault. You can analyze documents, answer questions about files, provide insights about document content and metadata, and explain app features. When asked about capabilities, be specific about what you can actually do with the user's documents. You cannot directly perform actions in the app interface.",
        },
      };

      // Call real chatbot service
      const response = await chatbotService.sendMessage(
        userMessage.content,
        context,
        conversationId.current
      );

      // Simulate typing delay for better UX
      await new Promise(resolve =>
        setTimeout(resolve, 800 + Math.random() * 1200)
      );

      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Add suggested actions if available
      if (response.suggestedActions && response.suggestedActions.length > 0) {
        const actionsMessage: ChatMessage = {
          id: `actions_${Date.now()}`,
          role: 'system',
          content: JSON.stringify(response.suggestedActions),
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, actionsMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessages = {
        en: "Sorry, I'm having trouble right now. Please try again later.",
        mk: 'Извинете, имам проблеми моментално. Обидете се повторно подоцна.',
        fr: "Désolé, j'ai des difficultés en ce moment. Veuillez réessayer plus tard.",
      };

      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content:
          errorMessages[language as keyof typeof errorMessages] ||
          errorMessages.en,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleActionClick = (action: string, data?: any) => {
    if (onAction) {
      onAction(action, data);
    }

    // Add user action message
    const actionLabels = {
      search_documents: {
        en: 'Search Documents',
        mk: 'Пребарај документи',
        fr: 'Rechercher documents',
      },
      open_upload_modal: {
        en: 'Upload Document',
        mk: 'Прикачи документ',
        fr: 'Télécharger document',
      },
      show_recent_documents: {
        en: 'Show Recent Documents',
        mk: 'Прикажи скорешни',
        fr: 'Afficher récents',
      },
      browse_categories: {
        en: 'Browse Categories',
        mk: 'Разгледај категории',
        fr: 'Parcourir catégories',
      },
      view_document: {
        en: 'View Document',
        mk: 'Прегледај документ',
        fr: 'Voir document',
      },
      explain_features: {
        en: 'Learn Features',
        mk: 'Научи функции',
        fr: 'Apprendre fonctionnalités',
      },
      show_tutorial: {
        en: 'Show Tutorial',
        mk: 'Прикажи упатство',
        fr: 'Afficher tutoriel',
      },
      organize_documents: {
        en: 'Organize Documents',
        mk: 'Организирај документи',
        fr: 'Organiser documents',
      },
      analyze_document: {
        en: 'Deep Analysis',
        mk: 'Длабока анализа',
        fr: 'Analyse approfondie',
      },
      translate_document: {
        en: 'Translate Document',
        mk: 'Преведи документ',
        fr: 'Traduire document',
      },
    };

    const actionLabel = actionLabels[action as keyof typeof actionLabels];
    if (actionLabel) {
      const actionMessage: ChatMessage = {
        id: `action_${Date.now()}`,
        role: 'user',
        content: `🎯 ${actionLabel[language as keyof typeof actionLabel] || actionLabel.en}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, actionMessage]);
    }
  };

  const clearChat = () => {
    setMessages([]);
    conversationId.current = `chat_${currentUser?.uid}_${Date.now()}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <Card variant="glass" className="w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] h-full sm:h-auto min-h-[400px] flex flex-col rounded-none sm:rounded-lg">
        <CardHeader className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-500 shadow-md">
                <img
                  src="/dorian-io.jpg"
                  alt="Dorian AI Assistant"
                  className="w-full h-full object-cover"
                  onError={e => {
                    // Fallback to emoji if image fails to load
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).parentElement!.innerHTML =
                      '<div class="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center"><span class="text-white font-semibold text-lg">🤖</span></div>';
                  }}
                />
              </div>
              <div>
                <CardTitle className="text-lg">
                  {translate('chatbot.title') || 'Dorian - Your AI Assistant'}
                </CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isTyping
                    ? translate('chatbot.thinking') || 'Dorian is thinking...'
                    : translate('chatbot.online') || 'Online'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearChat}
                title={translate('chatbot.clear') || 'Clear Chat'}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                title={translate('chatbot.close') || 'Close Chat'}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 min-h-0">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {messages.map(message => (
              <div key={message.id}>
                {message.role === 'system' ? (
                  <SuggestedActions
                    actions={JSON.parse(message.content)}
                    onActionClick={handleActionClick}
                  />
                ) : (
                  <MessageBubble
                    message={message}
                    isUser={message.role === 'user'}
                  />
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center space-x-2 text-gray-500">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.1s' }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  ></div>
                </div>
                <span className="text-sm">
                  {translate('chatbot.thinking') || 'Assistant is thinking...'}
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div
            className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4"
            style={{ paddingBottom: 'calc(1rem + var(--safe-bottom, 0px))' }}
          >
            <div className="flex items-end space-x-2">
              <div className="flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  onFocus={() => {
                    setTimeout(() => {
                      inputRef.current?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                      });
                    }, 50);
                  }}
                  placeholder={
                    translate('chatbot.placeholder') ||
                    'Ask Dorian anything about your documents...'
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  disabled={isLoading}
                />
              </div>
              <Button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                loading={isLoading}
                size="md"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              Dorian can analyze your documents and provide intelligent insights about your files.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Message Bubble Component
const MessageBubble: React.FC<{ message: ChatMessage; isUser: boolean }> = ({
  message,
  isUser,
}) => {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] p-3 rounded-2xl ${
          isUser
            ? 'bg-primary-600 text-white rounded-br-md'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-md'
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>
        <p
          className={`text-xs mt-1 opacity-70 ${isUser ? 'text-primary-100' : 'text-gray-500'}`}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
};

// Suggested Actions Component
const SuggestedActions: React.FC<{
  actions: Array<{ action: string; label: string; data?: any }>;
  onActionClick: (action: string, data?: any) => void;
}> = ({ actions, onActionClick }) => {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {actions.map((action, index) => (
        <Button
          key={index}
          variant="outline"
          size="sm"
          onClick={() => onActionClick(action.action, action.data)}
          className="text-sm"
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
};

// ChatBot component now uses the real chatbotService

export default ChatBot;
