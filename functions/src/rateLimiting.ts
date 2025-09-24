import * as admin from 'firebase-admin';

// Rate limiting configuration
export const RATE_LIMIT_CONFIG = {
  // General API endpoints
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
  
  // File upload endpoints (more restrictive)
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 uploads per hour
    skipSuccessfulRequests: false,
    skipFailedRequests: true,
  },
  
  // AI processing endpoints (most restrictive)
  aiProcessing: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // 50 AI requests per hour
    skipSuccessfulRequests: false,
    skipFailedRequests: true,
  },
  
  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 failed attempts per window
    skipSuccessfulRequests: true,
    skipFailedRequests: false,
  }
};

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

// In-memory store for rate limiting (in production, use Redis or Firestore)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Rate limiting middleware for Firebase Functions
 */
export function rateLimit(
  config: typeof RATE_LIMIT_CONFIG.general,
  keyGenerator?: (req: any) => string
) {
  return async (req: any, res: any, next: () => void) => {
    try {
      // Generate rate limit key
      const key = keyGenerator ? keyGenerator(req) : generateRateLimitKey(req);
      
      const now = Date.now();
      const windowStart = now - config.windowMs;
      
      // Get or create rate limit entry
      let entry = rateLimitStore.get(key);
      
      if (!entry || entry.resetTime <= now) {
        // Create new window
        entry = {
          count: 0,
          resetTime: now + config.windowMs,
          firstRequest: now
        };
        rateLimitStore.set(key, entry);
      }
      
      // Check if request should be counted
      const shouldCount = !config.skipSuccessfulRequests || !config.skipFailedRequests;
      
      if (shouldCount) {
        entry.count++;
      }
      
      // Check rate limit
      if (entry.count > config.max) {
        console.warn('🚨 Rate limit exceeded:', {
          key,
          count: entry.count,
          max: config.max,
          resetTime: new Date(entry.resetTime).toISOString(),
          userAgent: req.get('User-Agent'),
          ip: getClientIP(req)
        });
        
        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': config.max.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': entry.resetTime.toString(),
          'X-RateLimit-Window': config.windowMs.toString(),
          'Retry-After': Math.ceil((entry.resetTime - now) / 1000).toString()
        });
        
        return res.status(429).json({
          success: false,
          error: 'Too Many Requests - Rate limit exceeded',
          details: {
            limit: config.max,
            window: config.windowMs,
            resetTime: entry.resetTime,
            retryAfter: Math.ceil((entry.resetTime - now) / 1000)
          },
          timestamp: new Date().toISOString()
        });
      }
      
      // Set rate limit headers for successful requests
      res.set({
        'X-RateLimit-Limit': config.max.toString(),
        'X-RateLimit-Remaining': Math.max(0, config.max - entry.count).toString(),
        'X-RateLimit-Reset': entry.resetTime.toString(),
        'X-RateLimit-Window': config.windowMs.toString()
      });
      
      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Don't block requests if rate limiting fails
      next();
    }
  };
}

/**
 * Generate rate limit key based on request
 */
function generateRateLimitKey(req: any): string {
  // Priority order: user ID > IP address > user agent hash
  const authHeader = req.get('Authorization');
  
  if (authHeader) {
    try {
      // Extract user ID from JWT token (simplified)
      const token = authHeader.replace('Bearer ', '');
      // In production, properly decode the JWT
      const userId = extractUserIdFromToken(token);
      if (userId) {
        return `user:${userId}`;
      }
    } catch (error) {
      // Fallback to IP-based limiting
    }
  }
  
  const ip = getClientIP(req);
  if (ip) {
    return `ip:${ip}`;
  }
  
  // Last resort: hash of user agent
  const userAgent = req.get('User-Agent') || 'unknown';
  return `ua:${hashString(userAgent)}`;
}

/**
 * Extract client IP address from request
 */
function getClientIP(req: any): string | null {
  return (
    req.ip ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    null
  );
}

/**
 * Extract user ID from Firebase Auth token (simplified)
 */
function extractUserIdFromToken(token: string): string | null {
  try {
    // In production, use Firebase Admin SDK to verify the token
    // This is a simplified version for demonstration
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return payload.user_id || payload.sub || null;
    }
  } catch (error) {
    // Token parsing failed
  }
  return null;
}

/**
 * Simple hash function for strings
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Advanced rate limiting with Firestore persistence (for production)
 */
export class FirestoreRateLimit {
  private db: admin.firestore.Firestore;
  
  constructor() {
    this.db = admin.firestore();
  }
  
  async checkRateLimit(
    key: string,
    config: typeof RATE_LIMIT_CONFIG.general
  ): Promise<{
    allowed: boolean;
    count: number;
    resetTime: number;
    remaining: number;
  }> {
    const now = Date.now();
    const docRef = this.db.collection('rateLimits').doc(key);
    
    try {
      const result = await this.db.runTransaction(async (transaction) => {
        const doc = await transaction.get(docRef);
        const data = doc.data();
        
        let count = 0;
        let resetTime = now + config.windowMs;
        
        if (data && data.resetTime > now) {
          // Within existing window
          count = data.count + 1;
          resetTime = data.resetTime;
        } else {
          // New window
          count = 1;
        }
        
        transaction.set(docRef, {
          count,
          resetTime,
          lastRequest: now,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        return {
          allowed: count <= config.max,
          count,
          resetTime,
          remaining: Math.max(0, config.max - count)
        };
      });
      
      return result;
    } catch (error) {
      console.error('Firestore rate limit error:', error);
      // Fallback to allowing the request
      return {
        allowed: true,
        count: 0,
        resetTime: now + config.windowMs,
        remaining: config.max
      };
    }
  }
  
  async cleanupExpiredEntries(): Promise<void> {
    const now = Date.now();
    const expiredQuery = this.db
      .collection('rateLimits')
      .where('resetTime', '<=', now)
      .limit(100);
    
    const snapshot = await expiredQuery.get();
    const batch = this.db.batch();
    
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    if (!snapshot.empty) {
      await batch.commit();
      console.log(`🧹 Cleaned up ${snapshot.size} expired rate limit entries`);
    }
  }
}

/**
 * Specialized rate limiting for different endpoint types
 */
export const rateLimitMiddleware = {
  general: rateLimit(RATE_LIMIT_CONFIG.general),
  upload: rateLimit(RATE_LIMIT_CONFIG.upload),
  aiProcessing: rateLimit(RATE_LIMIT_CONFIG.aiProcessing),
  auth: rateLimit(RATE_LIMIT_CONFIG.auth),
  
  // Custom rate limiter for user-specific endpoints
  userBased: (config: typeof RATE_LIMIT_CONFIG.general) => 
    rateLimit(config, (req) => {
      const authHeader = req.get('Authorization');
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const userId = extractUserIdFromToken(token);
        if (userId) return `user:${userId}`;
      }
      return generateRateLimitKey(req);
    }),
  
  // IP-based rate limiter
  ipBased: (config: typeof RATE_LIMIT_CONFIG.general) =>
    rateLimit(config, (req) => {
      const ip = getClientIP(req);
      return ip ? `ip:${ip}` : `ua:${hashString(req.get('User-Agent') || 'unknown')}`;
    })
};

// Cleanup expired entries every hour - lazy initialization
let firestoreRateLimit: FirestoreRateLimit | null = null;
setInterval(async () => {
  try {
    if (!firestoreRateLimit) {
      firestoreRateLimit = new FirestoreRateLimit();
    }
    await firestoreRateLimit.cleanupExpiredEntries();
  } catch (error) {
    console.error('Rate limit cleanup error:', error);
  }
}, 60 * 60 * 1000);