/**
 * Secure logging utilities to prevent sensitive data exposure
 */

// Patterns to identify and redact sensitive information
const SENSITIVE_PATTERNS = [
  // Authentication tokens
  /\b(bearer|token|jwt|auth)\s*[:\=]\s*[a-zA-Z0-9\-\._~\+\/]+=*/gi,
  
  // API keys
  /\b(api[_\-]?key|apikey|key)\s*[:\=]\s*[a-zA-Z0-9\-\._~\+\/]+=*/gi,
  
  // Passwords
  /\b(password|passwd|pwd)\s*[:\=]\s*\S+/gi,
  
  // Email addresses (partial redaction)
  /\b([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/gi,
  
  // Phone numbers
  /\b(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/gi,
  
  // Credit card numbers (basic pattern)
  /\b(?:\d{4}[-\s]?){3}\d{4}\b/gi,
  
  // Social Security Numbers
  /\b\d{3}-?\d{2}-?\d{4}\b/gi,
  
  // Firebase project IDs and sensitive URLs
  /https:\/\/[a-zA-Z0-9\-]+\.firebaseapp\.com\/[^\s]*/gi,
  
  // IP addresses (partial redaction)
  /\b(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\b/gi,
  
  // User IDs (Firebase format)
  /\b[a-zA-Z0-9]{28}\b/gi,
];

// Fields that should be completely removed from logs
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'apiKey',
  'secret',
  'authorization',
  'cookie',
  'session',
  'privateKey',
  'publicKey',
  'cert',
  'certificate'
];

// Fields that should be partially redacted
const PARTIALLY_REDACTED_FIELDS = [
  'email',
  'phone',
  'userId',
  'ip',
  'userAgent',
  'referer'
];

export interface SecureLogOptions {
  level: 'debug' | 'info' | 'warn' | 'error';
  redactSensitiveData?: boolean;
  includeStackTrace?: boolean;
  maxLength?: number;
  includeTimestamp?: boolean;
}

export class SecureLogger {
  private isProduction: boolean;
  private defaultOptions: SecureLogOptions;
  
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.defaultOptions = {
      level: 'info',
      redactSensitiveData: true,
      includeStackTrace: !this.isProduction,
      maxLength: 1000,
      includeTimestamp: true
    };
  }
  
  /**
   * Sanitize data by removing or redacting sensitive information
   */
  private sanitizeData(data: any): any {
    if (typeof data === 'string') {
      return this.redactSensitiveString(data);
    }
    
    if (data instanceof Error) {
      return {
        name: data.name,
        message: this.redactSensitiveString(data.message),
        stack: this.defaultOptions.includeStackTrace 
          ? this.redactSensitiveString(data.stack || '') 
          : undefined
      };
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }
    
    if (data && typeof data === 'object') {
      const sanitized: any = {};
      
      for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase();
        
        // Remove sensitive fields completely
        if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
          sanitized[key] = '[REDACTED]';
          continue;
        }
        
        // Partially redact certain fields
        if (PARTIALLY_REDACTED_FIELDS.some(field => lowerKey.includes(field))) {
          sanitized[key] = this.partiallyRedact(String(value));
          continue;
        }
        
        // Recursively sanitize nested objects
        sanitized[key] = this.sanitizeData(value);
      }
      
      return sanitized;
    }
    
    return data;
  }
  
  /**
   * Redact sensitive patterns from strings
   */
  private redactSensitiveString(str: string): string {
    let redacted = str;
    
    for (const pattern of SENSITIVE_PATTERNS) {
      redacted = redacted.replace(pattern, (match) => {
        // Keep the first part visible for debugging
        const parts = match.split(/[:\=]/);
        if (parts.length >= 2) {
          return `${parts[0]}=[REDACTED]`;
        }
        return '[REDACTED]';
      });
    }
    
    return redacted;
  }
  
  /**
   * Partially redact sensitive information (keep some characters visible)
   */
  private partiallyRedact(value: string): string {
    if (!value || value.length <= 4) {
      return '[REDACTED]';
    }
    
    // For emails: show first letter and domain
    if (value.includes('@')) {
      const [local, domain] = value.split('@');
      return `${local[0]}***@${domain}`;
    }
    
    // For other values: show first and last 2 characters
    if (value.length > 6) {
      return `${value.substring(0, 2)}***${value.substring(value.length - 2)}`;
    }
    
    return '[REDACTED]';
  }
  
  /**
   * Create a secure log entry
   */
  private createLogEntry(level: string, message: string, data?: any, options?: Partial<SecureLogOptions>): any {
    const opts = { ...this.defaultOptions, ...options };
    const timestamp = opts.includeTimestamp ? new Date().toISOString() : undefined;
    
    let sanitizedData = data;
    if (opts.redactSensitiveData && data) {
      sanitizedData = this.sanitizeData(data);
    }
    
    let logMessage = message;
    if (opts.maxLength && logMessage.length > opts.maxLength) {
      logMessage = logMessage.substring(0, opts.maxLength) + '...[TRUNCATED]';
    }
    
    const logEntry: any = {
      level,
      message: logMessage,
      timestamp,
      environment: this.isProduction ? 'production' : 'development'
    };
    
    if (sanitizedData) {
      logEntry.data = sanitizedData;
    }
    
    return logEntry;
  }
  
  /**
   * Log debug information (only in development)
   */
  debug(message: string, data?: any, options?: Partial<SecureLogOptions>): void {
    if (this.isProduction) return; // No debug logs in production
    
    const logEntry = this.createLogEntry('debug', message, data, options);
    console.debug('🔍', JSON.stringify(logEntry, null, 2));
  }
  
  /**
   * Log general information
   */
  info(message: string, data?: any, options?: Partial<SecureLogOptions>): void {
    const logEntry = this.createLogEntry('info', message, data, options);
    console.info('ℹ️', JSON.stringify(logEntry, null, 2));
  }
  
  /**
   * Log warnings
   */
  warn(message: string, data?: any, options?: Partial<SecureLogOptions>): void {
    const logEntry = this.createLogEntry('warn', message, data, options);
    console.warn('⚠️', JSON.stringify(logEntry, null, 2));
  }
  
  /**
   * Log errors with enhanced security
   */
  error(message: string, error?: any, data?: any, options?: Partial<SecureLogOptions>): void {
    const logEntry = this.createLogEntry('error', message, { error, ...data }, options);
    console.error('❌', JSON.stringify(logEntry, null, 2));
  }
  
  /**
   * Log security-related events
   */
  security(event: string, data?: any, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'): void {
    const logEntry = this.createLogEntry('security', `🔒 SECURITY EVENT: ${event}`, {
      severity,
      ...data
    }, {
      redactSensitiveData: true,
      includeStackTrace: false
    });
    
    console.warn('🚨', JSON.stringify(logEntry, null, 2));
    
    // In production, you might want to send critical security events to a monitoring service
    if (this.isProduction && severity === 'critical') {
      // TODO: Send to monitoring service (e.g., Sentry, CloudWatch, etc.)
    }
  }
  
  /**
   * Log API requests with sanitization
   */
  apiRequest(method: string, url: string, data?: any, userInfo?: any): void {
    const sanitizedData = {
      method,
      url: this.sanitizeUrl(url),
      userAgent: userInfo?.userAgent ? this.partiallyRedact(userInfo.userAgent) : undefined,
      ip: userInfo?.ip ? this.partiallyRedact(userInfo.ip) : undefined,
      userId: userInfo?.userId ? this.partiallyRedact(userInfo.userId) : undefined,
      timestamp: new Date().toISOString(),
      requestData: data ? this.sanitizeData(data) : undefined
    };
    
    this.info(`API Request: ${method} ${url}`, sanitizedData);
  }
  
  /**
   * Log API responses with sanitization
   */
  apiResponse(method: string, url: string, statusCode: number, duration: number, data?: any): void {
    const sanitizedData = {
      method,
      url: this.sanitizeUrl(url),
      statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      responseData: data ? this.sanitizeData(data) : undefined
    };
    
    const level = statusCode >= 400 ? 'warn' : 'info';
    this[level](`API Response: ${method} ${url} - ${statusCode}`, sanitizedData);
  }
  
  /**
   * Sanitize URLs to remove sensitive query parameters
   */
  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const sensitiveParams = ['token', 'key', 'secret', 'password', 'auth'];
      
      for (const param of sensitiveParams) {
        if (urlObj.searchParams.has(param)) {
          urlObj.searchParams.set(param, '[REDACTED]');
        }
      }
      
      return urlObj.toString();
    } catch {
      // If URL parsing fails, just redact the whole thing after the domain
      const parts = url.split('?');
      if (parts.length > 1) {
        return `${parts[0]}?[QUERY_REDACTED]`;
      }
      return url;
    }
  }
  
  /**
   * Log performance metrics
   */
  performance(operation: string, duration: number, data?: any): void {
    const logEntry = {
      operation,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      ...data
    };
    
    if (duration > 5000) { // Slow operations
      this.warn(`Slow operation detected: ${operation}`, logEntry);
    } else {
      this.info(`Performance: ${operation}`, logEntry);
    }
  }
}

// Export singleton instance
export const secureLogger = new SecureLogger();

// Export convenience functions
export const logSecure = {
  debug: (message: string, data?: any) => secureLogger.debug(message, data),
  info: (message: string, data?: any) => secureLogger.info(message, data),
  warn: (message: string, data?: any) => secureLogger.warn(message, data),
  error: (message: string, error?: any, data?: any) => secureLogger.error(message, error, data),
  security: (event: string, data?: any, severity?: 'low' | 'medium' | 'high' | 'critical') => 
    secureLogger.security(event, data, severity),
  apiRequest: (method: string, url: string, data?: any, userInfo?: any) => 
    secureLogger.apiRequest(method, url, data, userInfo),
  apiResponse: (method: string, url: string, statusCode: number, duration: number, data?: any) => 
    secureLogger.apiResponse(method, url, statusCode, duration, data),
  performance: (operation: string, duration: number, data?: any) => 
    secureLogger.performance(operation, duration, data)
};