/**
 * Profile validation utilities for enhanced security and data integrity
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ProfileValidationData {
  displayName?: string;
  bio?: string;
  phoneNumber?: string;
  location?: string;
  website?: string;
  email?: string;
}

export interface PasswordValidationData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Validates display name
 */
export const validateDisplayName = (displayName: string): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!displayName.trim()) {
    errors.push('Display name is required');
  } else {
    if (displayName.length < 2) {
      errors.push('Display name must be at least 2 characters long');
    }
    if (displayName.length > 50) {
      errors.push('Display name must be less than 50 characters');
    }
    if (!/^[a-zA-Z0-9\s\-_.]+$/.test(displayName)) {
      errors.push('Display name can only contain letters, numbers, spaces, hyphens, underscores, and periods');
    }
    if (/^\s|\s$/.test(displayName)) {
      warnings.push('Display name should not start or end with spaces');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Validates bio text
 */
export const validateBio = (bio: string): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (bio.length > 500) {
    errors.push('Bio must be less than 500 characters');
  }

  // Check for potentially harmful content
  const suspiciousPatterns = [
    /javascript:/i,
    /<script/i,
    /onclick/i,
    /onload/i,
    /onerror/i,
    /data:text\/html/i
  ];

  if (suspiciousPatterns.some(pattern => pattern.test(bio))) {
    errors.push('Bio contains potentially unsafe content');
  }

  if (bio.length > 300) {
    warnings.push('Consider keeping your bio concise for better readability');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Validates phone number
 */
export const validatePhoneNumber = (phoneNumber: string): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (phoneNumber && phoneNumber.trim()) {
    // Remove all non-digit characters for validation
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    
    if (digitsOnly.length < 7) {
      errors.push('Phone number must contain at least 7 digits');
    }
    if (digitsOnly.length > 15) {
      errors.push('Phone number must contain no more than 15 digits');
    }
    
    // Basic format validation
    const phoneRegex = /^[\+]?[1-9][\d]{0,14}$/;
    if (!phoneRegex.test(digitsOnly)) {
      errors.push('Please enter a valid phone number');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Validates location
 */
export const validateLocation = (location: string): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (location.length > 100) {
    errors.push('Location must be less than 100 characters');
  }

  // Check for suspicious content
  if (/<[^>]*>/.test(location)) {
    errors.push('Location cannot contain HTML tags');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Validates website URL
 */
export const validateWebsite = (website: string): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (website && website.trim()) {
    try {
      const url = new URL(website);
      
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push('Website URL must use http:// or https://');
      }
      
      // Check for suspicious domains or patterns
      const suspiciousDomains = ['localhost', '127.0.0.1', '0.0.0.0'];
      if (suspiciousDomains.some(domain => url.hostname.includes(domain))) {
        warnings.push('Local URLs may not be accessible to others');
      }
      
      if (url.hostname.length > 253) {
        errors.push('Website URL domain is too long');
      }
      
    } catch (error) {
      errors.push('Please enter a valid website URL (e.g., https://example.com)');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Validates email address
 */
export const validateEmail = (email: string): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!email.trim()) {
    errors.push('Email address is required');
  } else {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      errors.push('Please enter a valid email address');
    }
    
    if (email.length > 254) {
      errors.push('Email address is too long');
    }
    
    // Check for common disposable email domains
    const disposableDomains = [
      '10minutemail.com',
      'tempmail.org',
      'guerrillamail.com',
      'mailinator.com'
    ];
    
    const domain = email.split('@')[1]?.toLowerCase();
    if (domain && disposableDomains.includes(domain)) {
      warnings.push('Consider using a permanent email address');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Validates password strength and requirements
 */
export const validatePassword = (passwordData: PasswordValidationData): ValidationResult => {
  const { currentPassword, newPassword, confirmPassword } = passwordData;
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if current password is provided
  if (!currentPassword.trim()) {
    errors.push('Current password is required');
  }

  // Validate new password
  if (!newPassword.trim()) {
    errors.push('New password is required');
  } else {
    if (newPassword.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (newPassword.length > 128) {
      errors.push('Password must be less than 128 characters long');
    }
    
    // Password strength requirements
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
    
    let strengthScore = 0;
    if (hasLowercase) strengthScore++;
    if (hasUppercase) strengthScore++;
    if (hasNumbers) strengthScore++;
    if (hasSpecialChars) strengthScore++;
    
    if (strengthScore < 3) {
      warnings.push('Consider using a mix of uppercase, lowercase, numbers, and special characters for better security');
    }
    
    // Check for common weak patterns
    const commonPatterns = [
      /123456/,
      /password/i,
      /qwerty/i,
      /admin/i,
      /letmein/i,
      /welcome/i
    ];
    
    if (commonPatterns.some(pattern => pattern.test(newPassword))) {
      errors.push('Password contains common patterns that are easy to guess');
    }
    
    // Check if password is same as current
    if (newPassword === currentPassword) {
      errors.push('New password must be different from current password');
    }
  }

  // Validate password confirmation
  if (!confirmPassword.trim()) {
    errors.push('Password confirmation is required');
  } else if (newPassword !== confirmPassword) {
    errors.push('New passwords do not match');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Validates complete profile data
 */
export const validateProfileData = (profileData: ProfileValidationData): ValidationResult => {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  // Validate each field
  if (profileData.displayName !== undefined) {
    const displayNameResult = validateDisplayName(profileData.displayName);
    allErrors.push(...displayNameResult.errors);
    allWarnings.push(...displayNameResult.warnings);
  }

  if (profileData.bio !== undefined) {
    const bioResult = validateBio(profileData.bio);
    allErrors.push(...bioResult.errors);
    allWarnings.push(...bioResult.warnings);
  }

  if (profileData.phoneNumber !== undefined) {
    const phoneResult = validatePhoneNumber(profileData.phoneNumber);
    allErrors.push(...phoneResult.errors);
    allWarnings.push(...phoneResult.warnings);
  }

  if (profileData.location !== undefined) {
    const locationResult = validateLocation(profileData.location);
    allErrors.push(...locationResult.errors);
    allWarnings.push(...locationResult.warnings);
  }

  if (profileData.website !== undefined) {
    const websiteResult = validateWebsite(profileData.website);
    allErrors.push(...websiteResult.errors);
    allWarnings.push(...websiteResult.warnings);
  }

  if (profileData.email !== undefined) {
    const emailResult = validateEmail(profileData.email);
    allErrors.push(...emailResult.errors);
    allWarnings.push(...emailResult.warnings);
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
};

/**
 * Validates file upload for avatar
 */
export const validateAvatarFile = (file: File): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (file.size > maxSize) {
    errors.push('Image file must be smaller than 5MB');
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    errors.push('Only JPEG, PNG, GIF, and WebP image files are allowed');
  }

  // Warn about large files
  if (file.size > 1024 * 1024) { // 1MB
    warnings.push('Large image files may take longer to upload');
  }

  // Check file name length
  if (file.name.length > 255) {
    errors.push('File name is too long');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Sanitizes text input to prevent XSS and other security issues
 */
export const sanitizeTextInput = (input: string): string => {
  if (!input) return '';
  
  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Remove potentially dangerous characters
  sanitized = sanitized.replace(/[<>\"']/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
};

/**
 * Rate limiting helper for profile updates
 */
export class ProfileUpdateRateLimit {
  private static lastUpdate: number = 0;
  private static updateCount: number = 0;
  private static readonly MIN_INTERVAL = 5000; // 5 seconds between updates
  private static readonly MAX_UPDATES_PER_HOUR = 20;

  static canUpdate(): { allowed: boolean; message?: string; waitTime?: number } {
    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastUpdate;
    
    // Check minimum interval
    if (timeSinceLastUpdate < this.MIN_INTERVAL) {
      return {
        allowed: false,
        message: 'Please wait before updating your profile again',
        waitTime: this.MIN_INTERVAL - timeSinceLastUpdate
      };
    }
    
    // Reset counter every hour
    if (timeSinceLastUpdate > 60 * 60 * 1000) { // 1 hour
      this.updateCount = 0;
    }
    
    // Check hourly limit
    if (this.updateCount >= this.MAX_UPDATES_PER_HOUR) {
      return {
        allowed: false,
        message: 'Too many profile updates. Please try again later',
        waitTime: 60 * 60 * 1000 - timeSinceLastUpdate
      };
    }
    
    return { allowed: true };
  }
  
  static recordUpdate(): void {
    this.lastUpdate = Date.now();
    this.updateCount++;
  }
}