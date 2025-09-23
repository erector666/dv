import * as crypto from 'crypto';

// File validation configuration
export const FILE_VALIDATION_CONFIG = {
  // Maximum file size: 10MB
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  
  // Allowed MIME types with their magic bytes
  ALLOWED_MIME_TYPES: {
    'application/pdf': {
      extensions: ['.pdf'],
      magicBytes: [
        Buffer.from([0x25, 0x50, 0x44, 0x46]), // %PDF
      ],
      description: 'PDF Document'
    },
    'image/jpeg': {
      extensions: ['.jpg', '.jpeg'],
      magicBytes: [
        Buffer.from([0xFF, 0xD8, 0xFF]), // JPEG
      ],
      description: 'JPEG Image'
    },
    'image/png': {
      extensions: ['.png'],
      magicBytes: [
        Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), // PNG
      ],
      description: 'PNG Image'
    },
    'image/gif': {
      extensions: ['.gif'],
      magicBytes: [
        Buffer.from('GIF87a', 'ascii'),
        Buffer.from('GIF89a', 'ascii'),
      ],
      description: 'GIF Image'
    },
    'image/webp': {
      extensions: ['.webp'],
      magicBytes: [
        Buffer.from('RIFF', 'ascii'), // WEBP starts with RIFF
      ],
      description: 'WebP Image'
    },
    'application/msword': {
      extensions: ['.doc'],
      magicBytes: [
        Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]), // OLE2
      ],
      description: 'Microsoft Word Document'
    },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
      extensions: ['.docx'],
      magicBytes: [
        Buffer.from([0x50, 0x4B, 0x03, 0x04]), // ZIP (DOCX is ZIP-based)
      ],
      description: 'Microsoft Word Document (DOCX)'
    },
    'text/plain': {
      extensions: ['.txt'],
      magicBytes: [] as Buffer[], // Text files don't have reliable magic bytes
      description: 'Plain Text'
    }
  },

  // Suspicious file patterns to block
  BLOCKED_PATTERNS: [
    // Executable files
    /\.(exe|bat|cmd|com|scr|pif|vbs|js|jar|app|deb|rpm)$/i,
    // Script files
    /\.(php|asp|jsp|cgi|pl|py|rb|sh)$/i,
    // System files
    /\.(sys|dll|so|dylib)$/i,
    // Archive files that could contain malicious content
    /\.(zip|rar|7z|tar|gz|bz2)$/i,
    // Double extensions
    /\.\w+\.\w+$/,
  ],

  // Maximum filename length
  MAX_FILENAME_LENGTH: 255,
  
  // Blocked filename patterns
  BLOCKED_FILENAMES: [
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i, // Windows reserved names
    /[<>:"|?*]/,  // Invalid filename characters
    /^\./,        // Hidden files
    /\s+$/,       // Trailing whitespace
  ]
};

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  detectedMimeType?: string;
  detectedExtension?: string;
  fileSize: number;
  fileName: string;
  sanitizedFileName?: string;
}

export interface FileValidationOptions {
  maxFileSize?: number;
  allowedMimeTypes?: string[];
  strictMimeTypeValidation?: boolean;
  sanitizeFileName?: boolean;
  checkMagicBytes?: boolean;
}

/**
 * Validates file content, size, type, and filename
 */
export async function validateFile(
  buffer: Buffer,
  fileName: string,
  declaredMimeType?: string,
  options: FileValidationOptions = {}
): Promise<FileValidationResult> {
  const result: FileValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    fileSize: buffer.length,
    fileName: fileName
  };

  const config = {
    maxFileSize: options.maxFileSize || FILE_VALIDATION_CONFIG.MAX_FILE_SIZE,
    allowedMimeTypes: options.allowedMimeTypes || Object.keys(FILE_VALIDATION_CONFIG.ALLOWED_MIME_TYPES),
    strictMimeTypeValidation: options.strictMimeTypeValidation !== false,
    sanitizeFileName: options.sanitizeFileName !== false,
    checkMagicBytes: options.checkMagicBytes !== false
  };

  // 1. Validate file size
  if (buffer.length > config.maxFileSize) {
    result.errors.push(`File size ${(buffer.length / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${(config.maxFileSize / 1024 / 1024).toFixed(2)}MB`);
  }

  if (buffer.length === 0) {
    result.errors.push('File is empty');
  }

  // 2. Validate filename
  const filenameValidation = validateFileName(fileName);
  if (!filenameValidation.isValid) {
    result.errors.push(...filenameValidation.errors);
  }
  if (filenameValidation.warnings.length > 0) {
    result.warnings.push(...filenameValidation.warnings);
  }
  if (config.sanitizeFileName && filenameValidation.sanitizedName) {
    result.sanitizedFileName = filenameValidation.sanitizedName;
  }

  // 3. Detect actual file type from magic bytes
  if (config.checkMagicBytes && buffer.length > 0) {
    const detectedType = detectFileTypeFromMagicBytes(buffer);
    if (detectedType) {
      result.detectedMimeType = detectedType.mimeType;
      result.detectedExtension = detectedType.extension;

      // 4. Validate MIME type consistency
      if (config.strictMimeTypeValidation && declaredMimeType) {
        if (declaredMimeType !== detectedType.mimeType) {
          result.errors.push(`File content (${detectedType.mimeType}) does not match declared type (${declaredMimeType})`);
        }
      }
    } else if (config.strictMimeTypeValidation) {
      result.warnings.push('Could not detect file type from content');
    }
  }

  // 5. Check if detected or declared type is allowed
  const typeToCheck = result.detectedMimeType || declaredMimeType;
  if (typeToCheck && !config.allowedMimeTypes.includes(typeToCheck)) {
    result.errors.push(`File type ${typeToCheck} is not allowed`);
  }

  // 6. Additional security checks
  const securityValidation = performSecurityChecks(buffer, fileName);
  if (!securityValidation.isValid) {
    result.errors.push(...securityValidation.errors);
  }
  if (securityValidation.warnings.length > 0) {
    result.warnings.push(...securityValidation.warnings);
  }

  result.isValid = result.errors.length === 0;
  return result;
}

/**
 * Validates filename for security and compliance
 */
function validateFileName(fileName: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedName?: string;
} {
  const result = {
    isValid: true,
    errors: [] as string[],
    warnings: [] as string[],
    sanitizedName: undefined as string | undefined
  };

  if (!fileName || fileName.trim().length === 0) {
    result.errors.push('Filename is required');
    return result;
  }

  // Check filename length
  if (fileName.length > FILE_VALIDATION_CONFIG.MAX_FILENAME_LENGTH) {
    result.errors.push(`Filename too long (max ${FILE_VALIDATION_CONFIG.MAX_FILENAME_LENGTH} characters)`);
  }

  // Check for blocked patterns
  for (const pattern of FILE_VALIDATION_CONFIG.BLOCKED_PATTERNS) {
    if (pattern.test(fileName)) {
      result.errors.push(`Filename contains blocked pattern: ${pattern.toString()}`);
    }
  }

  // Check for blocked filenames
  for (const pattern of FILE_VALIDATION_CONFIG.BLOCKED_FILENAMES) {
    if (pattern.test(fileName)) {
      result.errors.push(`Filename is not allowed: ${fileName}`);
    }
  }

  // Check for null bytes and control characters
  if (/[\x00-\x1f\x7f-\x9f]/.test(fileName)) {
    result.errors.push('Filename contains invalid control characters');
  }

  // Sanitize filename
  const sanitized = fileName
    .replace(/[<>:"|?*]/g, '_')  // Replace invalid characters
    .replace(/\s+/g, '_')        // Replace spaces with underscores
    .replace(/_{2,}/g, '_')      // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '')     // Remove leading/trailing underscores
    .substring(0, FILE_VALIDATION_CONFIG.MAX_FILENAME_LENGTH);

  if (sanitized !== fileName) {
    result.sanitizedName = sanitized;
    result.warnings.push('Filename was sanitized');
  }

  result.isValid = result.errors.length === 0;
  return result;
}

/**
 * Detects file type from magic bytes
 */
function detectFileTypeFromMagicBytes(buffer: Buffer): {
  mimeType: string;
  extension: string;
} | null {
  for (const [mimeType, config] of Object.entries(FILE_VALIDATION_CONFIG.ALLOWED_MIME_TYPES)) {
    for (const magicBytes of config.magicBytes) {
      if (buffer.length >= magicBytes.length) {
        if (buffer.subarray(0, magicBytes.length).equals(magicBytes)) {
          return {
            mimeType,
            extension: config.extensions[0]
          };
        }
        
        // Special case for WEBP (check for WEBP after RIFF)
        if (mimeType === 'image/webp' && magicBytes.toString() === 'RIFF') {
          if (buffer.length >= 12 && 
              buffer.subarray(0, 4).equals(Buffer.from('RIFF', 'ascii')) &&
              buffer.subarray(8, 12).equals(Buffer.from('WEBP', 'ascii'))) {
            return { mimeType, extension: config.extensions[0] };
          }
        }
      }
    }
  }
  return null;
}

/**
 * Performs additional security checks
 */
function performSecurityChecks(buffer: Buffer, fileName: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const result = {
    isValid: true,
    errors: [] as string[],
    warnings: [] as string[]
  };

  // Check for embedded executables in files
  const suspiciousPatterns = [
    Buffer.from('MZ'),        // DOS/Windows executable header
    Buffer.from('PK'),        // ZIP header (could contain executables)
    Buffer.from('\x7fELF'),   // Linux executable header
    Buffer.from('\xca\xfe\xba\xbe'), // Java class file
  ];

  for (const pattern of suspiciousPatterns) {
    if (buffer.includes(pattern)) {
      // Allow ZIP pattern for legitimate DOCX files
      if (pattern.equals(Buffer.from('PK')) && fileName.toLowerCase().endsWith('.docx')) {
        continue;
      }
      result.warnings.push(`File contains suspicious pattern that may indicate embedded executable content`);
    }
  }

  // Check for excessive file size vs content ratio (possible zip bomb)
  if (buffer.length > 1024 * 1024) { // Files larger than 1MB
    const entropy = calculateEntropy(buffer.subarray(0, 1024)); // Check first 1KB
    if (entropy < 3.0) { // Low entropy might indicate compression bomb
      result.warnings.push('File has unusually low entropy, possible compression bomb');
    }
  }

  // Check for script injection in text files
  if (fileName.toLowerCase().endsWith('.txt')) {
    const content = buffer.toString('utf8', 0, Math.min(1024, buffer.length));
    const scriptPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /onload\s*=/i,
      /onerror\s*=/i,
    ];

    for (const pattern of scriptPatterns) {
      if (pattern.test(content)) {
        result.warnings.push('Text file contains potentially malicious script content');
        break;
      }
    }
  }

  result.isValid = result.errors.length === 0;
  return result;
}

/**
 * Calculates Shannon entropy of buffer (measure of randomness)
 */
function calculateEntropy(buffer: Buffer): number {
  const frequency = new Map<number, number>();
  
  for (const byte of buffer) {
    frequency.set(byte, (frequency.get(byte) || 0) + 1);
  }
  
  let entropy = 0;
  const length = buffer.length;
  
  for (const count of frequency.values()) {
    const probability = count / length;
    entropy -= probability * Math.log2(probability);
  }
  
  return entropy;
}

/**
 * Generates a secure hash of file content for integrity checking
 */
export function generateFileHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Validates file URL for security (prevents SSRF attacks)
 */
export function validateFileUrl(url: string): {
  isValid: boolean;
  errors: string[];
} {
  const result = {
    isValid: true,
    errors: [] as string[]
  };

  try {
    const parsedUrl = new URL(url);
    
    // Only allow HTTPS for external URLs
    if (!['https:', 'gs:'].includes(parsedUrl.protocol)) {
      result.errors.push('Only HTTPS and Google Storage URLs are allowed');
    }
    
    // Block private/internal IP addresses
    const hostname = parsedUrl.hostname;
    const privateIpPatterns = [
      /^127\./,                    // Loopback
      /^10\./,                     // Private Class A
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private Class B
      /^192\.168\./,               // Private Class C
      /^169\.254\./,               // Link-local
      /^::1$/,                     // IPv6 loopback
      /^fc00:/,                    // IPv6 private
      /^fe80:/,                    // IPv6 link-local
    ];
    
    for (const pattern of privateIpPatterns) {
      if (pattern.test(hostname)) {
        result.errors.push('Private/internal IP addresses are not allowed');
        break;
      }
    }
    
    // Block localhost variants
    if (['localhost', '0.0.0.0'].includes(hostname.toLowerCase())) {
      result.errors.push('Localhost URLs are not allowed');
    }
    
  } catch (error) {
    result.errors.push('Invalid URL format');
  }
  
  result.isValid = result.errors.length === 0;
  return result;
}