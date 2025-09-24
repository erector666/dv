import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  documentContext?: {
    documentId?: string;
    documentName?: string;
    category?: string;
  };
}

interface ChatbotResponse {
  message: string;
  confidence: number;
  suggestedActions?: Array<{
    action: string;
    label: string;
    data?: any;
  }>;
  documentReferences?: Array<{
    id: string;
    name: string;
    relevance: number;
  }>;
}

interface ConversationContext {
  userId: string;
  language: string;
  recentDocuments: Array<{
    id: string;
    name: string;
    category: string;
    uploadDate: Date;
  }>;
  userPreferences?: {
    preferredCategories: string[];
    language: string;
    systemNote?: string;
  };
}

class ChatbotService {
  private chatbotFunction = httpsCallable(functions, 'chatbot');

  /**
   * Send message to chatbot and get response
   */
  async sendMessage(
    message: string,
    context: ConversationContext,
    conversationId?: string
  ): Promise<ChatbotResponse> {
    try {

      // Try Firebase Callable Function first
      try {

        const result = await this.chatbotFunction({
          message: message.trim(),
          conversationId:
            conversationId || this.generateConversationId(context.userId),
          context: {
            language: context.language,
            recentDocuments: context.recentDocuments,
            userPreferences: context.userPreferences,
          },
        });

        const data = result.data as {
          success: boolean;
          response: ChatbotResponse;
        };

        if (!data.success) {
          throw new Error('Chatbot service returned error');
        }


        return data.response;
      } catch (firebaseError) {

        // Fallback to HTTP endpoint with CORS
        return await this.sendMessageHTTP(message, context, conversationId);
      }
    } catch (error) {

      // Return fallback response based on language
      return this.getFallbackResponse(context.language, message);
    }
  }

  /**
   * HTTP fallback method for development/CORS issues
   */
  private async sendMessageHTTP(
    message: string,
    context: ConversationContext,
    conversationId?: string
  ): Promise<ChatbotResponse> {
    try {
      // Always use production URL since we deployed the functions
      const functionsURL =
        'https://us-central1-gpt1-77ce0.cloudfunctions.net/chatbotHttp';


      const response = await fetch(functionsURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: window.location.origin,
        },
        body: JSON.stringify({
          message: message.trim(),
          conversationId:
            conversationId || this.generateConversationId(context.userId),
          context: {
            language: context.language,
            recentDocuments: context.recentDocuments,
            userPreferences: context.userPreferences,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error('HTTP chatbot service returned error');
      }


      return data.response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate conversation ID
   */
  private generateConversationId(userId: string): string {
    return `chat_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get fallback response when service fails
   */
  private getFallbackResponse(language: string, userMessage?: string): ChatbotResponse {
    // Try to provide a contextual response based on the user's message
    if (userMessage) {
      const lowerMessage = userMessage.toLowerCase();
      
      // Handle specific questions about Macedonia
      if (lowerMessage.includes('macedonia') || lowerMessage.includes('македонија')) {
        const macedoniaResponses = {
          en: "Macedonia is a beautiful country in Southeast Europe! 🇲🇰 It's known for its rich history, stunning landscapes, and warm people. The capital is Skopje, and it's famous for Lake Ohrid, ancient monasteries, and delicious food like ajvar and tavče gravče. Is there something specific about Macedonia you'd like to know?",
          mk: "Македонија е прекрасна земја во југоисточна Европа! 🇲🇰 Позната е по својата богата историја, прекрасни пејзажи и топли луѓе. Главен град е Скопје, а позната е по Охридското Езеро, древните манастири и вкусната храна како ајвар и тавче гравче. Дали има нешто конкретно за Македонија што сакате да знаете?",
          fr: "La Macédoine est un magnifique pays d'Europe du Sud-Est ! 🇲🇰 Elle est connue pour sa riche histoire, ses paysages époustouflants et ses habitants chaleureux. La capitale est Skopje, et elle est célèbre pour le lac Ohrid, les anciens monastères et la délicieuse nourriture comme l'ajvar et le tavče gravče. Y a-t-il quelque chose de spécifique sur la Macédoine que vous aimeriez savoir ?"
        };
        
        return {
          message: macedoniaResponses[language as keyof typeof macedoniaResponses] || macedoniaResponses.en,
          confidence: 0.8,
        };
      }
      
      // Handle document-related questions
      if (lowerMessage.includes('document') || lowerMessage.includes('file') || lowerMessage.includes('документ')) {
        const documentResponses = {
          en: "I can help you with your documents! 📄 You can ask me to search for specific files, help categorize them, or provide information about your uploaded documents. What would you like to know about your documents?",
          mk: "Можам да ви помогнам со документите! 📄 Можете да ме прашате да пребарам специфични датотеки, да ви помогнам да ги категоризирам или да дадам информации за вашите прикачени документи. Што сакате да знаете за вашите документи?",
          fr: "Je peux vous aider avec vos documents ! 📄 Vous pouvez me demander de rechercher des fichiers spécifiques, vous aider à les catégoriser ou fournir des informations sur vos documents téléchargés. Que souhaitez-vous savoir sur vos documents ?"
        };
        
        return {
          message: documentResponses[language as keyof typeof documentResponses] || documentResponses.en,
          confidence: 0.8,
        };
      }
    }

    // Default fallback responses
    const responses = {
      en: "Hi I am Dorian, how can I help? 😊 I'm sorry, I'm having trouble right now. Please try again later or contact support if the issue persists.",
      mk: 'Здраво, јас сум Дориан, како можам да помогнам? 😊 Извинете, имам проблеми моментално. Обидете се повторно подоцна.',
      fr: "Salut, je suis Dorian, comment puis-je aider? 😊 Je suis désolé, j'ai des difficultés en ce moment. Veuillez réessayer plus tard.",
    };

    return {
      message: responses[language as keyof typeof responses] || responses.en,
      confidence: 0.5,
      suggestedActions: [
        {
          action: 'refresh_page',
          label:
            language === 'mk'
              ? 'Освежи страница'
              : language === 'fr'
                ? 'Actualiser la page'
                : 'Refresh Page',
        },
      ],
    };
  }

  /**
   * Clear conversation history (if needed)
   */
  async clearConversation(conversationId: string): Promise<void> {
    // In a real implementation, you might want to call a backend function
    // to clear the conversation history from the server
    // Clearing conversation history
  }

  /**
   * Get chatbot capabilities
   */
  getCapabilities(): {
    documentSearch: boolean;
    documentUpload: boolean;
    documentManagement: boolean;
    appHelp: boolean;
    generalConversation: boolean;
    multiLanguage: boolean;
    supportedLanguages: string[];
  } {
    return {
      documentSearch: true,
      documentUpload: true,
      documentManagement: true,
      appHelp: true,
      generalConversation: true,
      multiLanguage: true,
      supportedLanguages: ['en', 'mk', 'fr'],
    };
  }

  /**
   * Format message for display
   */
  formatMessage(message: ChatMessage): {
    content: string;
    timestamp: string;
    isUser: boolean;
  } {
    return {
      content: message.content,
      timestamp: message.timestamp.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      isUser: message.role === 'user',
    };
  }

  /**
   * Validate message before sending
   */
  validateMessage(message: string): {
    isValid: boolean;
    error?: string;
  } {
    if (!message || typeof message !== 'string') {
      return {
        isValid: false,
        error: 'Message must be a non-empty string',
      };
    }

    const trimmed = message.trim();

    if (trimmed.length === 0) {
      return {
        isValid: false,
        error: 'Message cannot be empty',
      };
    }

    if (trimmed.length > 1000) {
      return {
        isValid: false,
        error: 'Message is too long (max 1000 characters)',
      };
    }

    return { isValid: true };
  }

  /**
   * Extract search terms from message (helper for UI)
   */
  extractSearchTerms(message: string): string[] {
    const searchWords = message
      .toLowerCase()
      .replace(/^(find|search|look for|show me|where is|get)\s+/i, '')
      .replace(/\b(document|file|doc|paper)\b/gi, '')
      .split(/\s+/)
      .filter(word => word.length > 2);

    // Remove duplicates using filter and indexOf instead of Set spread
    const uniqueWords = searchWords.filter(
      (word, index) => searchWords.indexOf(word) === index
    );
    return uniqueWords.slice(0, 5);
  }

  /**
   * Detect message intent (helper for UI feedback)
   */
  detectIntent(message: string): {
    intent: 'search' | 'upload' | 'help' | 'management' | 'general';
    confidence: number;
  } {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.match(/\b(search|find|look|where|show)\b/)) {
      return { intent: 'search', confidence: 0.8 };
    }

    if (lowerMessage.match(/\b(upload|add|create|new)\b/)) {
      return { intent: 'upload', confidence: 0.8 };
    }

    if (lowerMessage.match(/\b(help|how|what|explain|guide)\b/)) {
      return { intent: 'help', confidence: 0.8 };
    }

    if (lowerMessage.match(/\b(manage|organize|delete|move|category)\b/)) {
      return { intent: 'management', confidence: 0.8 };
    }

    return { intent: 'general', confidence: 0.6 };
  }
}

// Export singleton instance
export const chatbotService = new ChatbotService();

export type { ChatMessage, ChatbotResponse, ConversationContext };
