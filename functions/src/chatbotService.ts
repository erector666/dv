// DocVault AI Chatbot Service using Hugging Face
// Provides conversational AI with document context awareness

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
  model?: string; // AI model used (e.g., 'DeepSeek-V3.1')
  thinkingMode?: boolean; // Whether thinking mode was used
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
  };
}

class DorianChatbotService {
  private baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
  private token: string;
  private conversationHistory: Map<string, ChatMessage[]> = new Map();

  constructor() {
    // OpenRouter API key
    this.token =
      process.env.OPENROUTER_API_KEY ||
      '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';

    console.log(
      '🔑 Dorian initialized with token:',
      this.token ? 'TOKEN_PRESENT' : 'NO_TOKEN'
    );
  }

  /**
   * Process user message and generate contextual response
   */
  async processMessage(
    message: string,
    context: ConversationContext,
    conversationId: string
  ): Promise<ChatbotResponse> {
    try {
      console.log('🤖 Processing chatbot message:', {
        message,
        userId: context.userId,
      });

      // Get conversation history
      const history = this.getConversationHistory(conversationId);

      // Determine intent and context
      const intent = await this.analyzeIntent(message);

      // Generate response based on intent
      let response: ChatbotResponse;

      switch (intent.category) {
        case 'document_search':
          response = await this.handleDocumentSearch(message, context, intent);
          break;
        case 'document_upload':
          response = await this.handleDocumentUpload(message, context, intent);
          break;
        case 'document_management':
          response = await this.handleDocumentManagement(
            message,
            context,
            intent
          );
          break;
        case 'app_help':
          response = await this.handleAppHelp(message, context, intent);
          break;
        case 'general_conversation':
        default:
          response = await this.handleGeneralConversation(
            message,
            context,
            history
          );
          break;
      }

      // Save message to conversation history
      this.addToConversationHistory(conversationId, {
        id: this.generateMessageId(),
        role: 'user',
        content: message,
        timestamp: new Date(),
      });

      this.addToConversationHistory(conversationId, {
        id: this.generateMessageId(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
      });

      console.log('✅ Chatbot response generated:', {
        confidence: response.confidence,
        hasActions: !!response.suggestedActions?.length,
        hasReferences: !!response.documentReferences?.length,
      });

      return response;
    } catch (error) {
      console.error('❌ Chatbot processing failed:', error);
      return this.getFallbackResponse(context.language);
    }
  }

  /**
   * Analyze user message intent
   */
  private async analyzeIntent(message: string): Promise<{
    category: string;
    confidence: number;
    entities: any[];
  }> {
    try {
      const intents = [
        'document search',
        'document upload',
        'document management',
        'app help',
        'general conversation',
      ];

      // Use OpenRouter with a classification model (or fallback to pattern matching)
      const response = await this.callOpenRouter(
        'deepseek/deepseek-chat',
        [
          {
            role: 'system',
            content: `You are a classification assistant. Classify the user's message into one of these categories: ${intents.join(', ')}. Respond with just the category name.`,
          },
          {
            role: 'user',
            content: message,
          },
        ],
        50
      );

      const classificationResult =
        response.choices?.[0]?.message?.content?.toLowerCase() ||
        'general conversation';

      // Map classification result to our intent system
      let topIntent = 'general_conversation';
      let confidence = 0.7;

      if (
        classificationResult.includes('document search') ||
        classificationResult.includes('search')
      ) {
        topIntent = 'document_search';
      } else if (
        classificationResult.includes('document upload') ||
        classificationResult.includes('upload')
      ) {
        topIntent = 'document_upload';
      } else if (
        classificationResult.includes('document management') ||
        classificationResult.includes('management')
      ) {
        topIntent = 'document_management';
      } else if (
        classificationResult.includes('app help') ||
        classificationResult.includes('help')
      ) {
        topIntent = 'app_help';
      }

      return {
        category: topIntent.replace(' ', '_'),
        confidence: confidence,
        entities: [],
      };
    } catch (error) {
      console.warn('⚠️ Intent analysis failed:', error);
      return {
        category: 'general_conversation',
        confidence: 0.5,
        entities: [],
      };
    }
  }

  /**
   * Handle document search queries
   */
  private async handleDocumentSearch(
    message: string,
    context: ConversationContext,
    intent: any
  ): Promise<ChatbotResponse> {
    const searchTerms = this.extractSearchTerms(message);

    const responses = {
      en: `Hi I am Dorian, how can I help? 😊 I'd love to help you find "${searchTerms}". Let me guide you through your search options:`,
      mk: `Здраво, јас сум Дориан, како можам да помогнам? 😊 Сакам да ви помогнам да најдете "${searchTerms}". Ајде да ве водам:`,
      fr: `Salut, je suis Dorian, comment puis-je aider? 😊 J'aimerais vous aider à trouver "${searchTerms}". Laissez-moi vous guider :`,
    };

    return {
      message:
        responses[context.language as keyof typeof responses] || responses.en,
      confidence: 0.8,
      suggestedActions: [
        {
          action: 'search_documents',
          label:
            context.language === 'mk'
              ? 'Пребарај документи'
              : context.language === 'fr'
                ? 'Rechercher des documents'
                : 'Search Documents',
          data: { query: searchTerms },
        },
        {
          action: 'browse_categories',
          label:
            context.language === 'mk'
              ? 'Прегледај категории'
              : context.language === 'fr'
                ? 'Parcourir les catégories'
                : 'Browse Categories',
        },
      ],
    };
  }

  /**
   * Handle document upload assistance
   */
  private async handleDocumentUpload(
    message: string,
    context: ConversationContext,
    intent: any
  ): Promise<ChatbotResponse> {
    const responses = {
      en: `Hi I am Dorian, how can I help? 😊 I'll make uploading documents super easy for you! I can guide you step-by-step and suggest the perfect category.`,
      mk: `Здраво, јас сум Дориан, како можам да помогнам? 😊 Ќе го направам прикачувањето многу лесно! Можам да ве водам чекор по чекор.`,
      fr: `Salut, je suis Dorian, comment puis-je aider? 😊 Je vais rendre le téléchargement très facile ! Je peux vous guider étape par étape.`,
    };

    return {
      message:
        responses[context.language as keyof typeof responses] || responses.en,
      confidence: 0.9,
      suggestedActions: [
        {
          action: 'open_upload_modal',
          label:
            context.language === 'mk'
              ? 'Прикачи документ'
              : context.language === 'fr'
                ? 'Télécharger un document'
                : 'Upload Document',
        },
        {
          action: 'explain_categories',
          label:
            context.language === 'mk'
              ? 'Објасни категории'
              : context.language === 'fr'
                ? 'Expliquer les catégories'
                : 'Explain Categories',
        },
      ],
    };
  }

  /**
   * Handle document management queries
   */
  private async handleDocumentManagement(
    message: string,
    context: ConversationContext,
    intent: any
  ): Promise<ChatbotResponse> {
    const lowerMessage = message.toLowerCase();

    // Check if this is about last upload or recent documents - ANALYZE THEM!
    if (
      lowerMessage.includes('last upload') ||
      lowerMessage.includes('recent upload') ||
      lowerMessage.includes('my last') ||
      lowerMessage.includes('tell me more')
    ) {
      const recentDoc = context.recentDocuments[0];
      if (recentDoc) {
        try {
          console.log('🔍 Document management: Analyzing recent document');
          const documentAnalysis = await this.analyzeDocument(recentDoc);
          return {
            message: `Hi I am Dorian! 😊 Here's detailed information about your most recent upload:\n\n${documentAnalysis}\n\nWould you like me to analyze it further or help with other documents?`,
            confidence: 0.95,
            suggestedActions: [
              {
                action: 'analyze_document',
                label: 'Deep Analysis',
                data: { id: recentDoc.id },
              },
              {
                action: 'translate_document',
                label: 'Translate Document',
                data: { id: recentDoc.id },
              },
              { action: 'show_recent_documents', label: 'Show All Documents' },
            ],
          };
        } catch (error) {
          console.warn(
            'Document analysis failed in management handler:',
            error
          );
          // Fall through to generic response
        }
      }
    }

    // Generic document management response
    const responses = {
      en: `Hi I am Dorian, how can I help? 😊 I can help you manage your documents! You have ${context.recentDocuments.length} recent documents.`,
      mk: `Здраво, јас сум Дориан, како можам да помогнам? 😊 Можам да ви помогнам да ги управувате документите! Имате ${context.recentDocuments.length} скорешни документи.`,
      fr: `Salut, je suis Dorian, comment puis-je aider? 😊 Je peux vous aider à gérer vos documents ! Vous avez ${context.recentDocuments.length} documents récents.`,
    };

    return {
      message:
        responses[context.language as keyof typeof responses] || responses.en,
      confidence: 0.85,
      suggestedActions: [
        {
          action: 'show_recent_documents',
          label:
            context.language === 'mk'
              ? 'Прикажи скорешни'
              : context.language === 'fr'
                ? 'Afficher récents'
                : 'Show Recent',
        },
        {
          action: 'organize_documents',
          label:
            context.language === 'mk'
              ? 'Организирај документи'
              : context.language === 'fr'
                ? 'Organiser documents'
                : 'Organize Documents',
        },
      ],
      documentReferences: context.recentDocuments.slice(0, 3).map(doc => ({
        id: doc.id,
        name: doc.name,
        relevance: 0.8,
      })),
    };
  }

  /**
   * Handle app help and guidance
   */
  private async handleAppHelp(
    message: string,
    context: ConversationContext,
    intent: any
  ): Promise<ChatbotResponse> {
    const responses = {
      en: `Hi I am Dorian, how can I help? 😊 I'm your friendly DocVault expert! I know everything about this app and I'm excited to help you master document management. What would you like to learn?`,
      mk: `Здраво, јас сум Дориан, како можам да помогнам? 😊 Јас сум вашиот пријателски DocVault експерт! Знам сé за оваа апликација и сакам да ви помогнам. Што сакате да научите?`,
      fr: `Salut, je suis Dorian, comment puis-je aider? 😊 Je suis votre expert DocVault amical ! Je connais tout sur cette app et je suis ravi de vous aider. Que voulez-vous apprendre ?`,
    };

    return {
      message:
        responses[context.language as keyof typeof responses] || responses.en,
      confidence: 0.9,
      suggestedActions: [
        {
          action: 'show_tutorial',
          label:
            context.language === 'mk'
              ? 'Прикажи упатство'
              : context.language === 'fr'
                ? 'Afficher le tutoriel'
                : 'Show Tutorial',
        },
        {
          action: 'explain_features',
          label:
            context.language === 'mk'
              ? 'Објасни функции'
              : context.language === 'fr'
                ? 'Expliquer les fonctionnalités'
                : 'Explain Features',
        },
      ],
    };
  }

  /**
   * Handle general conversation with intelligent local responses
   */
  private async handleGeneralConversation(
    message: string,
    context: ConversationContext,
    history: ChatMessage[]
  ): Promise<ChatbotResponse> {
    try {
      console.log('🚀 Using DeepSeek-V3.1 - 671B parameter AI powerhouse!');

      // Build DeepSeek conversation context
      const conversationText = this.buildDeepSeekContext(
        message,
        history,
        context
      );

      // Determine if we should use thinking mode for complex queries
      const useThinkingMode = this.shouldUseThinkingMode(message);

      console.log(
        `🧠 DeepSeek mode: ${useThinkingMode ? 'THINKING' : 'DIRECT'} | Context: ${conversationText.length} chars`
      );

      // Build conversation messages for OpenRouter
      const messages = [
        {
          role: 'system',
          content:
            'You are Dorian, a helpful AI assistant for DocVault document management app. Be friendly, concise, and helpful.',
        },
      ];

      // Add conversation history
      history.slice(-6).forEach(msg => {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      });

      // Add current message
      messages.push({
        role: 'user',
        content: message,
      });

      const response = await this.callOpenRouter(
        'deepseek/deepseek-chat',
        messages,
        150
      );

      let botResponse = response.choices?.[0]?.message?.content;

      if (botResponse) {
        return {
          message: botResponse,
          confidence: 0.9,
          model: 'DeepSeek-Chat (OpenRouter)',
          thinkingMode: useThinkingMode,
        };
      } else {
        throw new Error('No response from DeepSeek-V3.1');
      }
    } catch (error) {
      console.warn(
        '⚠️ Intelligent conversation failed, using local analysis:',
        error
      );

      // Use intelligent local response as fallback
      try {
        const intelligentResponse = await this.generateIntelligentResponse(
          message,
          context,
          history
        );
        return {
          message: intelligentResponse.message,
          confidence: intelligentResponse.confidence,
          suggestedActions: intelligentResponse.suggestedActions,
        };
      } catch (fallbackError) {
        console.warn('⚠️ Local intelligent response failed:', fallbackError);
        return this.getFallbackResponse(context.language);
      }
    }
  }

  /**
   * Build conversation context for the model
   */
  private buildConversationContext(
    currentMessage: string,
    history: ChatMessage[],
    context: ConversationContext
  ): string {
    // Use more recent messages for better context, but manage length intelligently
    const recentHistory = history.slice(-20); // Last 20 messages for better context
    let conversationText = `User is using DocVault document management app. User language: ${context.language}.\n\n`;

    // If we have many messages, summarize older ones and keep recent ones detailed
    if (recentHistory.length > 10) {
      const olderMessages = recentHistory.slice(0, -6); // Older messages to summarize
      const recentMessages = recentHistory.slice(-6); // Keep last 6 messages detailed

      if (olderMessages.length > 0) {
        conversationText += `[Previous conversation context: User discussed documents and asked ${olderMessages.length} questions]\n\n`;
      }

      recentMessages.forEach(msg => {
        const role = msg.role === 'user' ? 'Human' : 'Assistant';
        conversationText += `${role}: ${msg.content}\n`;
      });
    } else {
      // For shorter conversations, include all messages
      recentHistory.forEach(msg => {
        const role = msg.role === 'user' ? 'Human' : 'Assistant';
        conversationText += `${role}: ${msg.content}\n`;
      });
    }

    conversationText += `Human: ${currentMessage}\nAssistant:`;

    return conversationText;
  }

  /**
   * Extract search terms from user message
   */
  private extractSearchTerms(message: string): string {
    // Simple extraction - could be enhanced with NER
    const searchWords = message
      .toLowerCase()
      .replace(/^(find|search|look for|show me|where is|get)\s+/i, '')
      .replace(/\b(document|file|doc|paper)\b/gi, '')
      .trim();

    return searchWords || 'documents';
  }

  /**
   * Clean and format bot response
   */
  private cleanResponse(response: string, context: string): string {
    // Remove the context from the response
    const cleanResponse = response.replace(context, '').trim();

    // Remove any remaining conversation markers
    return cleanResponse
      .replace(/^(Assistant:|Human:|User:)\s*/i, '')
      .replace(/\n(Assistant:|Human:|User:).*$/i, '')
      .trim();
  }

  /**
   * Get fallback response for errors
   */
  private getFallbackResponse(language: string): ChatbotResponse {
    const responses = {
      en: "Hi I am Dorian, how can I help? 😊 I'm your DocVault AI assistant and I'm here to help with your documents! You can ask me to search, upload, or manage your files.",
      mk: 'Здраво, јас сум Дориан, како можам да помогнам? 😊 Јас сум вашиот DocVault AI асистент и тука сум да помогнам со документите! Можете да ме прашате за сé.',
      fr: 'Salut, je suis Dorian, comment puis-je aider? 😊 Je suis votre assistant IA DocVault et je suis là pour aider avec vos documents ! Vous pouvez me demander tout.',
    };

    return {
      message: responses[language as keyof typeof responses] || responses.en,
      confidence: 0.6,
    };
  }

  /**
   * Get fallback conversation response
   */
  private getFallbackConversation(language: string): string {
    const responses = {
      en: 'Hi I am Dorian, how can I help? 😊 How can I help you with your documents today?',
      mk: 'Здраво, јас сум Дориан, како можам да помогнам? 😊 Како можам да ви помогнам со документите денес?',
      fr: "Salut, je suis Dorian, comment puis-je aider? 😊 Comment puis-je vous aider avec vos documents aujourd'hui ?",
    };

    return responses[language as keyof typeof responses] || responses.en;
  }

  /**
   * Conversation history management
   */
  private getConversationHistory(conversationId: string): ChatMessage[] {
    return this.conversationHistory.get(conversationId) || [];
  }

  private addToConversationHistory(
    conversationId: string,
    message: ChatMessage
  ): void {
    const history = this.getConversationHistory(conversationId);
    history.push(message);

    // Keep only last 50 messages for better long-term context
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }

    this.conversationHistory.set(conversationId, history);
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Call OpenRouter API with retry logic
   */
  private async callOpenRouter(
    model: string,
    messages: any[],
    maxTokens: number = 100
  ): Promise<any> {
    const maxRetries = 3;
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const payload = {
          model: model,
          messages: messages,
          max_tokens: maxTokens,
          temperature: 0.7,
        };

        console.log(`🔧 DEBUG: Making request to ${this.baseUrl}`);
        console.log(`🔧 DEBUG: Model: ${model}`);
        console.log(
          `🔧 DEBUG: Token starts with: ${this.token.substring(0, 15)}...`
        );
        console.log(`🔧 DEBUG: Payload:`, JSON.stringify(payload, null, 2));

        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://docvault.app',
            'X-Title': 'DocVault AI Assistant',
          },
          body: JSON.stringify(payload),
        });

        console.log(`🔧 DEBUG: Response status: ${response.status}`);
        console.log(
          `🔧 DEBUG: Response headers:`,
          Object.fromEntries(response.headers.entries())
        );

        if (!response.ok) {
          const errorBody = await response.text();
          console.log(`🔧 DEBUG: Error response body:`, errorBody);
          throw new Error(
            `HTTP ${response.status}: ${response.statusText} - ${errorBody}`
          );
        }

        const result = await response.json();
        return result;
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ Attempt ${attempt}/${maxRetries} failed:`, error);

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
      }
    }

    throw lastError!;
  }

  /**
   * Analyze document content and provide insights
   */
  private async analyzeDocument(document: any): Promise<string> {
    try {
      // Get document URL from the document object
      const documentUrl = document.url || document.downloadUrl;
      if (!documentUrl) {
        return `📄 **${document.name}**\n• Category: ${document.category}\n• Size: ${this.formatFileSize(document.size)}\n• Status: Available for analysis`;
      }

      // Try to extract text from the document
      console.log('🔍 Analyzing document:', document.name);

      // Use the existing text extraction function
      const response = await fetch(documentUrl);
      if (!response.ok) {
        throw new Error('Cannot access document');
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Basic text extraction for PDFs
      if (document.name.toLowerCase().endsWith('.pdf')) {
        // For now, provide document metadata analysis
        const analysis = await this.analyzeDocumentWithAI(document, buffer);
        return analysis;
      }

      // For other file types, provide basic info
      return `📄 **${document.name}**\n• Category: ${document.category}\n• Size: ${this.formatFileSize(document.size)}\n• Type: ${document.type || 'Document'}\n• Status: Ready for processing`;
    } catch (error) {
      console.warn('Document analysis error:', error);
      return `📄 **${document.name}**\n• Category: ${document.category}\n• Size: ${this.formatFileSize(document.size || 0)}\n• Status: Analysis temporarily unavailable`;
    }
  }

  /**
   * Use AI to analyze document content
   */
  private async analyzeDocumentWithAI(
    document: any,
    buffer: Buffer
  ): Promise<string> {
    try {
      // Use OpenRouter to analyze the document metadata
      const messages = [
        {
          role: 'system',
          content:
            'You are a document analysis expert. Analyze the document information and provide useful insights.',
        },
        {
          role: 'user',
          content: `Analyze this document:
          Name: ${document.name}
          Category: ${document.category}
          Size: ${this.formatFileSize(document.size || 0)}
          Type: ${document.type || 'PDF'}
          
          Provide a brief analysis of what this document likely contains based on the name and category.`,
        },
      ];

      const response = await this.callOpenRouter(
        'deepseek/deepseek-chat',
        messages,
        200
      );
      const analysis = response.choices?.[0]?.message?.content;

      if (analysis) {
        return `📄 **${document.name}**\n\n${analysis}`;
      }

      return `📄 **${document.name}**\n• Category: ${document.category}\n• Size: ${this.formatFileSize(document.size)}\n• AI analysis temporarily unavailable`;
    } catch (error) {
      console.warn('AI document analysis failed:', error);
      return `📄 **${document.name}**\n• Category: ${document.category}\n• Size: ${this.formatFileSize(document.size || 0)}\n• Status: AI analysis failed, basic info available`;
    }
  }

  /**
   * Format file size helper
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Generate intelligent responses without external APIs
   */
  private async generateIntelligentResponse(
    message: string,
    context: ConversationContext,
    history: ChatMessage[]
  ): Promise<{
    message: string;
    confidence: number;
    suggestedActions?: any[];
  }> {
    const lowerMessage = message.toLowerCase().trim();
    const userName = context.userId ? 'friend' : 'there';

    // Document-related queries - WITH ACTUAL ANALYSIS
    if (
      lowerMessage.includes('last upload') ||
      lowerMessage.includes('recent document')
    ) {
      const recentDoc = context.recentDocuments[0];
      if (recentDoc) {
        // Try to get actual document analysis
        try {
          const documentAnalysis = await this.analyzeDocument(recentDoc);
          return {
            message: `Hi I am Dorian! 😊 Here's your most recent upload:\n\n${documentAnalysis}\n\nWould you like me to analyze it further or help with other documents?`,
            confidence: 0.95,
            suggestedActions: [
              {
                action: 'analyze_document',
                label: 'Deep Analysis',
                data: { id: recentDoc.id },
              },
              {
                action: 'translate_document',
                label: 'Translate Document',
                data: { id: recentDoc.id },
              },
              {
                action: 'show_recent_documents',
                label: 'Show Recent Documents',
              },
            ],
          };
        } catch (error) {
          console.warn('Document analysis failed, using fallback:', error);
          return {
            message: `Hi I am Dorian! 😊 Your last upload was "${recentDoc.name}" in the ${recentDoc.category} category. It was uploaded ${this.getTimeAgo(recentDoc.uploadDate)}. Would you like me to analyze this document for you?`,
            confidence: 0.9,
            suggestedActions: [
              {
                action: 'analyze_document',
                label: 'Analyze Document',
                data: { id: recentDoc.id },
              },
              {
                action: 'show_recent_documents',
                label: 'Show Recent Documents',
              },
            ],
          };
        }
      } else {
        return {
          message: `Hi I am Dorian! 😊 I don't see any recent uploads in your account yet. Would you like me to help you upload a document or show you how to get started?`,
          confidence: 0.8,
          suggestedActions: [
            { action: 'open_upload_modal', label: 'Upload Document' },
            { action: 'show_tutorial', label: 'Show Tutorial' },
          ],
        };
      }
    }

    // Document search queries
    if (
      lowerMessage.includes('find') ||
      lowerMessage.includes('search') ||
      lowerMessage.includes('look for')
    ) {
      const searchTerms = this.extractSearchTerms(message);
      return {
        message: `Hi I am Dorian! 😊 I can help you search for "${searchTerms}" in your documents. I'll look through your ${context.recentDocuments.length} documents to find what you need. What specific information are you looking for?`,
        confidence: 0.85,
        suggestedActions: [
          {
            action: 'search_documents',
            label: 'Search Documents',
            data: { query: searchTerms },
          },
          { action: 'browse_categories', label: 'Browse by Category' },
        ],
      };
    }

    // Help and guidance queries
    if (
      lowerMessage.includes('help') ||
      lowerMessage.includes('how') ||
      lowerMessage.includes('what can you')
    ) {
      return {
        message: `Hi I am Dorian! 😊 I'm your smart DocVault assistant and I can help you with many things:\n\n📄 **Document Management**: Upload, organize, and find your documents\n🔍 **Smart Search**: Find documents by content, category, or date\n🌍 **Translation**: Translate documents to different languages\n📊 **Analysis**: Get summaries and extract key information\n\nYou have ${context.recentDocuments.length} documents in your vault. What would you like to do first?`,
        confidence: 0.95,
        suggestedActions: [
          { action: 'show_recent_documents', label: 'Show My Documents' },
          { action: 'open_upload_modal', label: 'Upload New Document' },
          { action: 'explain_features', label: 'Learn More Features' },
        ],
      };
    }

    // Greeting responses
    if (
      lowerMessage.includes('hi') ||
      lowerMessage.includes('hello') ||
      lowerMessage.includes('hey')
    ) {
      const timeOfDay =
        new Date().getHours() < 12
          ? 'morning'
          : new Date().getHours() < 18
            ? 'afternoon'
            : 'evening';
      return {
        message: `Hi I am Dorian! 😊 Good ${timeOfDay}! I'm your intelligent DocVault assistant. I can see you have ${context.recentDocuments.length} documents in your collection. How can I help you manage your documents today?`,
        confidence: 0.9,
        suggestedActions: [
          { action: 'show_recent_documents', label: 'Show Recent Documents' },
          { action: 'search_documents', label: 'Search Documents' },
          { action: 'open_upload_modal', label: 'Upload New Document' },
        ],
      };
    }

    // Category-related queries
    if (
      lowerMessage.includes('category') ||
      lowerMessage.includes('organize')
    ) {
      const categories = [
        ...new Set(context.recentDocuments.map(doc => doc.category)),
      ];
      return {
        message: `Hi I am Dorian! 😊 I can help you organize your documents! You currently have documents in these categories: ${categories.join(', ')}. I can help you browse by category, move documents between categories, or create new organizational systems.`,
        confidence: 0.88,
        suggestedActions: [
          { action: 'browse_categories', label: 'Browse Categories' },
          { action: 'organize_documents', label: 'Organize Documents' },
        ],
      };
    }

    // Context-aware response based on conversation history
    if (history.length > 0) {
      const lastMessage = history[history.length - 1];
      if (lastMessage && lastMessage.role === 'user') {
        return {
          message: `Hi I am Dorian! 😊 I remember we were just talking about "${lastMessage.content.substring(0, 50)}...". Is there anything specific about your documents you'd like to explore further? I'm here to help you get the most out of your DocVault!`,
          confidence: 0.8,
        };
      }
    }

    // Default intelligent response
    return {
      message: `Hi I am Dorian! 😊 I'm your intelligent DocVault AI assistant, and I'm excited to help you! I can assist with document management, smart searching, translations, and much more. You currently have ${context.recentDocuments.length} documents. What would you like to explore today?`,
      confidence: 0.75,
      suggestedActions: [
        { action: 'show_recent_documents', label: 'View My Documents' },
        { action: 'search_documents', label: 'Search & Find' },
        { action: 'explain_features', label: 'Learn Features' },
      ],
    };
  }

  /**
   * Get human-readable time ago string
   */
  private getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'just now';
    }
  }

  /**
   * Build DeepSeek-V3.1 conversation context with proper formatting
   */
  private buildDeepSeekContext(
    currentMessage: string,
    history: ChatMessage[],
    context: ConversationContext
  ): string {
    const recentHistory = history.slice(-10); // Use more history with 128K context
    const systemPrompt = `You are Dorian, an intelligent AI assistant for DocVault document management app. You help users manage, search, and understand their documents. User language: ${context.language}. Be helpful, friendly, and knowledgeable about documents.`;

    let conversationText = `<｜begin▁of▁sentence｜>${systemPrompt}`;

    // Add conversation history
    recentHistory.forEach(msg => {
      if (msg.role === 'user') {
        conversationText += `<｜User｜>${msg.content}`;
      } else {
        conversationText += `<｜Assistant｜></think>${msg.content}<｜end▁of▁sentence｜>`;
      }
    });

    // Add current message
    conversationText += `<｜User｜>${currentMessage}<｜Assistant｜>`;

    return conversationText;
  }

  /**
   * Determine if we should use thinking mode for complex queries
   */
  private shouldUseThinkingMode(message: string): boolean {
    const complexKeywords = [
      'analyze',
      'compare',
      'explain',
      'summarize',
      'complex',
      'detailed',
      'why',
      'how',
      'what if',
      'calculate',
      'reason',
      'think',
      'solve',
    ];

    const lowerMessage = message.toLowerCase();
    return (
      complexKeywords.some(keyword => lowerMessage.includes(keyword)) ||
      message.length > 100
    ); // Use thinking for longer queries
  }

  /**
   * Clean DeepSeek response and extract meaningful content
   */
  private cleanDeepSeekResponse(
    response: string,
    originalContext: string,
    thinkingMode: boolean
  ): string {
    if (!response)
      return 'Hi I am Dorian! How can I help you with your documents?';

    // Remove the original context from the response
    let cleaned = response.replace(originalContext, '').trim();

    if (thinkingMode) {
      // Extract content after thinking tags
      const thinkMatch = cleaned.match(/<think>(.*?)<\/think>/s);
      const responseMatch = cleaned.match(
        /<\/think>(.*?)(<｜end▁of▁sentence｜>|$)/s
      );

      if (responseMatch && responseMatch[1]) {
        cleaned = responseMatch[1].trim();
      } else if (thinkMatch && thinkMatch[1]) {
        // Fallback to thinking content if no response after </think>
        cleaned = `I'm thinking about this... ${thinkMatch[1].substring(0, 200)}...`;
      }
    } else {
      // For non-thinking mode, extract content after </think>
      const responseMatch = cleaned.match(
        /<\/think>(.*?)(<｜end▁of▁sentence｜>|$)/s
      );
      if (responseMatch && responseMatch[1]) {
        cleaned = responseMatch[1].trim();
      }
    }

    // Clean up any remaining special tokens
    cleaned = cleaned
      .replace(/<｜[^｜]+｜>/g, '') // Remove special tokens
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Ensure we have a response
    if (!cleaned || cleaned.length < 5) {
      return "Hi I am Dorian! I'm powered by DeepSeek-V3.1 and ready to help you with your documents! 🚀";
    }

    return cleaned;
  }

  /**
   * Clear conversation history for a user
   */
  clearConversation(conversationId: string): void {
    this.conversationHistory.delete(conversationId);
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
}

export {
  DorianChatbotService,
  ChatMessage,
  ChatbotResponse,
  ConversationContext,
};
