/**
 * Comprehensive input sanitization utilities
 */

// Common XSS patterns to detect and sanitize
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
  /<link\b[^>]*>/gi,
  /<meta\b[^>]*>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /data:text\/html/gi,
  /on\w+\s*=/gi, // Event handlers like onclick, onload, etc.
];

// SQL injection patterns
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
  /(--|\/\*|\*\/|;)/g,
  /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/gi,
  /('|(\\')|('')|(%27)|(%22))/gi,
];

// NoSQL injection patterns (for MongoDB/Firestore)
const NOSQL_INJECTION_PATTERNS = [
  /\$where/gi,
  /\$ne/gi,
  /\$gt/gi,
  /\$lt/gi,
  /\$regex/gi,
  /\$exists/gi,
];

// Path traversal patterns
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//g,
  /\.\.\\/g,
  /%2e%2e%2f/gi,
  /%2e%2e%5c/gi,
  /\.\.%2f/gi,
];

// Command injection patterns
const COMMAND_INJECTION_PATTERNS = [
  /[;&|`$(){}[\]]/g,
  /\b(cat|ls|pwd|whoami|id|uname|ps|netstat|ifconfig|ping|nslookup|wget|curl|chmod|chown|rm|mv|cp|mkdir|rmdir)\b/gi,
];

export interface SanitizationOptions {
  maxLength?: number;
  allowHtml?: boolean;
  allowSpecialChars?: boolean;
  trimWhitespace?: boolean;
  convertToLowerCase?: boolean;
  removeNullBytes?: boolean;
  preventPathTraversal?: boolean;
  preventXSS?: boolean;
  preventSQLInjection?: boolean;
  preventCommandInjection?: boolean;
}

export interface SanitizationResult {
  sanitized: string;
  isModified: boolean;
  detectedThreats: string[];
  originalLength: number;
  sanitizedLength: number;
}

export class InputSanitizer {
  private defaultOptions: Required<SanitizationOptions> = {
    maxLength: 1000,
    allowHtml: false,
    allowSpecialChars: true,
    trimWhitespace: true,
    convertToLowerCase: false,
    removeNullBytes: true,
    preventPathTraversal: true,
    preventXSS: true,
    preventSQLInjection: true,
    preventCommandInjection: true,
  };

  /**
   * Sanitize a string input
   */
  sanitizeString(input: string, options?: Partial<SanitizationOptions>): SanitizationResult {
    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }

    const opts = { ...this.defaultOptions, ...options };
    let sanitized = input;
    const detectedThreats: string[] = [];
    const originalLength = input.length;
    let isModified = false;

    // Remove null bytes
    if (opts.removeNullBytes && sanitized.includes('\0')) {
      sanitized = sanitized.replace(/\0/g, '');
      detectedThreats.push('null_bytes');
      isModified = true;
    }

    // Trim whitespace
    if (opts.trimWhitespace) {
      const trimmed = sanitized.trim();
      if (trimmed !== sanitized) {
        sanitized = trimmed;
        isModified = true;
      }
    }

    // Length validation
    if (sanitized.length > opts.maxLength) {
      sanitized = sanitized.substring(0, opts.maxLength);
      detectedThreats.push('excessive_length');
      isModified = true;
    }

    // XSS prevention
    if (opts.preventXSS) {
      const xssResult = this.detectAndSanitizeXSS(sanitized);
      if (xssResult.detected) {
        sanitized = xssResult.sanitized;
        detectedThreats.push('xss_attempt');
        isModified = true;
      }
    }

    // SQL injection prevention
    if (opts.preventSQLInjection) {
      const sqlResult = this.detectSQLInjection(sanitized);
      if (sqlResult.detected) {
        sanitized = sqlResult.sanitized;
        detectedThreats.push('sql_injection_attempt');
        isModified = true;
      }
    }

    // NoSQL injection prevention
    const nosqlResult = this.detectNoSQLInjection(sanitized);
    if (nosqlResult.detected) {
      sanitized = nosqlResult.sanitized;
      detectedThreats.push('nosql_injection_attempt');
      isModified = true;
    }

    // Path traversal prevention
    if (opts.preventPathTraversal) {
      const pathResult = this.detectPathTraversal(sanitized);
      if (pathResult.detected) {
        sanitized = pathResult.sanitized;
        detectedThreats.push('path_traversal_attempt');
        isModified = true;
      }
    }

    // Command injection prevention
    if (opts.preventCommandInjection) {
      const cmdResult = this.detectCommandInjection(sanitized);
      if (cmdResult.detected) {
        sanitized = cmdResult.sanitized;
        detectedThreats.push('command_injection_attempt');
        isModified = true;
      }
    }

    // HTML sanitization
    if (!opts.allowHtml) {
      const htmlSanitized = this.sanitizeHTML(sanitized);
      if (htmlSanitized !== sanitized) {
        sanitized = htmlSanitized;
        detectedThreats.push('html_content');
        isModified = true;
      }
    }

    // Special characters handling
    if (!opts.allowSpecialChars) {
      const specialCharSanitized = sanitized.replace(/[<>'"&]/g, '');
      if (specialCharSanitized !== sanitized) {
        sanitized = specialCharSanitized;
        detectedThreats.push('special_characters');
        isModified = true;
      }
    }

    // Case conversion
    if (opts.convertToLowerCase) {
      const lowercased = sanitized.toLowerCase();
      if (lowercased !== sanitized) {
        sanitized = lowercased;
        isModified = true;
      }
    }

    return {
      sanitized,
      isModified,
      detectedThreats,
      originalLength,
      sanitizedLength: sanitized.length,
    };
  }

  /**
   * Detect and sanitize XSS attempts
   */
  private detectAndSanitizeXSS(input: string): { sanitized: string; detected: boolean } {
    let sanitized = input;
    let detected = false;

    for (const pattern of XSS_PATTERNS) {
      if (pattern.test(sanitized)) {
        detected = true;
        sanitized = sanitized.replace(pattern, '');
      }
    }

    // Additional XSS character encoding detection
    const encodedPatterns = [
      /%3C/gi, // <
      /%3E/gi, // >
      /%22/gi, // "
      /%27/gi, // '
      /%28/gi, // (
      /%29/gi, // )
    ];

    for (const pattern of encodedPatterns) {
      if (pattern.test(sanitized)) {
        detected = true;
        sanitized = sanitized.replace(pattern, '');
      }
    }

    return { sanitized, detected };
  }

  /**
   * Detect SQL injection attempts
   */
  private detectSQLInjection(input: string): { sanitized: string; detected: boolean } {
    let sanitized = input;
    let detected = false;

    for (const pattern of SQL_INJECTION_PATTERNS) {
      if (pattern.test(sanitized)) {
        detected = true;
        sanitized = sanitized.replace(pattern, '');
      }
    }

    return { sanitized, detected };
  }

  /**
   * Detect NoSQL injection attempts
   */
  private detectNoSQLInjection(input: string): { sanitized: string; detected: boolean } {
    let sanitized = input;
    let detected = false;

    for (const pattern of NOSQL_INJECTION_PATTERNS) {
      if (pattern.test(sanitized)) {
        detected = true;
        sanitized = sanitized.replace(pattern, '');
      }
    }

    return { sanitized, detected };
  }

  /**
   * Detect path traversal attempts
   */
  private detectPathTraversal(input: string): { sanitized: string; detected: boolean } {
    let sanitized = input;
    let detected = false;

    for (const pattern of PATH_TRAVERSAL_PATTERNS) {
      if (pattern.test(sanitized)) {
        detected = true;
        sanitized = sanitized.replace(pattern, '');
      }
    }

    return { sanitized, detected };
  }

  /**
   * Detect command injection attempts
   */
  private detectCommandInjection(input: string): { sanitized: string; detected: boolean } {
    let sanitized = input;
    let detected = false;

    for (const pattern of COMMAND_INJECTION_PATTERNS) {
      if (pattern.test(sanitized)) {
        detected = true;
        sanitized = sanitized.replace(pattern, '');
      }
    }

    return { sanitized, detected };
  }

  /**
   * Sanitize HTML content
   */
  private sanitizeHTML(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Sanitize an object recursively
   */
  sanitizeObject(obj: any, options?: Partial<SanitizationOptions>): {
    sanitized: any;
    threats: Array<{ field: string; threats: string[] }>;
  } {
    const threats: Array<{ field: string; threats: string[] }> = [];

    const sanitizeRecursive = (value: any, path: string = ''): any => {
      if (typeof value === 'string') {
        const result = this.sanitizeString(value, options);
        if (result.detectedThreats.length > 0) {
          threats.push({ field: path, threats: result.detectedThreats });
        }
        return result.sanitized;
      }

      if (Array.isArray(value)) {
        return value.map((item, index) => 
          sanitizeRecursive(item, `${path}[${index}]`)
        );
      }

      if (value && typeof value === 'object') {
        const sanitized: any = {};
        for (const [key, val] of Object.entries(value)) {
          const fieldPath = path ? `${path}.${key}` : key;
          sanitized[key] = sanitizeRecursive(val, fieldPath);
        }
        return sanitized;
      }

      return value;
    };

    return {
      sanitized: sanitizeRecursive(obj),
      threats,
    };
  }

  /**
   * Validate email format
   */
  validateEmail(email: string): { isValid: boolean; sanitized: string } {
    const sanitized = this.sanitizeString(email, {
      maxLength: 254,
      allowSpecialChars: true,
      convertToLowerCase: true,
      preventXSS: true,
    }).sanitized;

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const isValid = emailRegex.test(sanitized);

    return { isValid, sanitized };
  }

  /**
   * Validate and sanitize URL
   */
  validateUrl(url: string): { isValid: boolean; sanitized: string } {
    const sanitized = this.sanitizeString(url, {
      maxLength: 2048,
      allowSpecialChars: true,
      preventXSS: true,
      preventCommandInjection: true,
    }).sanitized;

    try {
      const urlObj = new URL(sanitized);
      // Only allow HTTP and HTTPS protocols
      const isValid = ['http:', 'https:'].includes(urlObj.protocol);
      return { isValid, sanitized };
    } catch {
      return { isValid: false, sanitized };
    }
  }

  /**
   * Sanitize filename for safe storage
   */
  sanitizeFilename(filename: string): string {
    return this.sanitizeString(filename, {
      maxLength: 255,
      allowHtml: false,
      allowSpecialChars: false,
      preventPathTraversal: true,
      preventCommandInjection: true,
    }).sanitized
      .replace(/[<>:"|?*\\\/]/g, '_') // Replace invalid filename characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
  }
}

// Export singleton instance
export const inputSanitizer = new InputSanitizer();

// Export convenience functions
export const sanitize = {
  string: (input: string, options?: Partial<SanitizationOptions>) =>
    inputSanitizer.sanitizeString(input, options),
  object: (obj: any, options?: Partial<SanitizationOptions>) =>
    inputSanitizer.sanitizeObject(obj, options),
  email: (email: string) => inputSanitizer.validateEmail(email),
  url: (url: string) => inputSanitizer.validateUrl(url),
  filename: (filename: string) => inputSanitizer.sanitizeFilename(filename),
};