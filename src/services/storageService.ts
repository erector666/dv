import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export interface StorageUsage {
  totalSize: number;
  documentCount: number;
  lastUpdated: Date;
  firestoreSize: number;
  firestoreCount: number;
}

/**
 * Retry logic for Firestore operations to handle network issues
 */
const retryFirestoreOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      // Only log on final attempt to reduce console spam
      if (attempt === maxRetries - 1) {
        console.warn(
          `Firestore operation failed after ${maxRetries} attempts:`,
          error
        );
      }

      // Don't retry on authentication errors
      if (
        error instanceof Error &&
        error.message.includes('permission-denied')
      ) {
        throw error;
      }

      // Handle QUIC protocol errors with longer delay
      if (
        error instanceof Error &&
        (error.message.includes('QUIC') ||
          error.message.includes('net::ERR_QUIC_PROTOCOL_ERROR'))
      ) {
        console.warn(
          `QUIC protocol error on attempt ${attempt + 1}, retrying with longer delay...`
        );
        if (attempt < maxRetries - 1) {
          await new Promise(resolve =>
            setTimeout(resolve, delay * Math.pow(3, attempt))
          ); // Longer delay for QUIC errors
          continue;
        }
      }

      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries - 1) {
        await new Promise(resolve =>
          setTimeout(resolve, delay * Math.pow(2, attempt))
        );
      }
    }
  }

  throw lastError;
};

/**
 * Calculate storage usage from Firestore documents
 * This avoids CORS issues with Firebase Storage listAll
 * Includes retry logic for network connectivity issues
 */
export const calculateStorageUsage = async (
  userId: string
): Promise<StorageUsage> => {
  try {
    let firestoreSize = 0;
    let firestoreCount = 0;

    // Check Firestore documents with retry logic
    try {
      const result = await retryFirestoreOperation(async () => {
        const documentsRef = collection(db, 'documents');
        const q = query(documentsRef, where('userId', '==', userId));
        return await getDocs(q);
      });

      result.forEach(doc => {
        const data = doc.data();
        if (data.fileSize && typeof data.fileSize === 'number') {
          firestoreSize += data.fileSize;
          firestoreCount++;
        }
      });
    } catch (error) {
      // Only log QUIC errors once to reduce spam
      if (
        error instanceof Error &&
        (error.message.includes('QUIC') ||
          error.message.includes('ERR_QUIC_PROTOCOL_ERROR'))
      ) {
        console.info(
          'Network connectivity issue (QUIC protocol). Using cached data.'
        );
      } else {
        console.error('Error querying Firestore after retries:', error);
      }
    }

    const result = {
      totalSize: firestoreSize,
      documentCount: firestoreCount,
      lastUpdated: new Date(),
      firestoreSize,
      firestoreCount,
    };
    return result;
  } catch (error) {
    // Reduce error logging spam
    if (!(error instanceof Error && error.message.includes('QUIC'))) {
      console.error('Error calculating storage usage:', error);
    }
    // Return default values on error
    return {
      totalSize: 0,
      documentCount: 0,
      lastUpdated: new Date(),
      firestoreSize: 0,
      firestoreCount: 0,
    };
  }
};

/**
 * Get storage usage with caching to avoid excessive Firestore reads
 */
let storageCache: {
  [userId: string]: { data: StorageUsage; timestamp: number };
} = {};
const CACHE_DURATION = 30000; // 30 seconds

export const getStorageUsage = async (
  userId: string
): Promise<StorageUsage> => {
  const now = Date.now();
  const cached = storageCache[userId];

  // Return cached data if it's still valid
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    // Calculate fresh data
    const usage = await calculateStorageUsage(userId);

    // Cache the result
    storageCache[userId] = {
      data: usage,
      timestamp: now,
    };

    return usage;
  } catch (error) {
    console.error('Storage usage calculation failed:', error);

    // Return cached data even if expired, or default values
    if (cached) {
      console.warn('Using expired cached storage data due to error');
      return cached.data;
    }

    // Fallback to default values when Firestore is unavailable
    return {
      totalSize: 0,
      documentCount: 0,
      lastUpdated: new Date(),
      firestoreSize: 0,
      firestoreCount: 0,
    };
  }
};

/**
 * Clear storage cache (useful when documents are uploaded/deleted)
 */
export const clearStorageCache = (userId?: string) => {
  if (userId) {
    delete storageCache[userId];
  } else {
    storageCache = {};
  }
};
