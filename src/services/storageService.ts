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
 * Calculate storage usage from Firestore documents
 * This avoids CORS issues with Firebase Storage listAll
 */
export const calculateStorageUsage = async (userId: string): Promise<StorageUsage> => {
  try {
    let firestoreSize = 0;
    let firestoreCount = 0;
    
    // Check Firestore documents
    try {
      const documentsRef = collection(db, 'documents');
      const q = query(documentsRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.fileSize && typeof data.fileSize === 'number') {
          firestoreSize += data.fileSize;
          firestoreCount++;
        }
      });
    } catch (error) {
      console.error('Error querying Firestore:', error);
    }
    
    const result = {
      totalSize: firestoreSize,
      documentCount: firestoreCount,
      lastUpdated: new Date(),
      firestoreSize,
      firestoreCount
    };
    return result;
  } catch (error) {
    console.error('Error calculating storage usage:', error);
    // Return default values on error
    return {
      totalSize: 0,
      documentCount: 0,
      lastUpdated: new Date(),
      firestoreSize: 0,
      firestoreCount: 0
    };
  }
};

/**
 * Get storage usage with caching to avoid excessive Firestore reads
 */
let storageCache: { [userId: string]: { data: StorageUsage; timestamp: number } } = {};
const CACHE_DURATION = 30000; // 30 seconds

export const getStorageUsage = async (userId: string): Promise<StorageUsage> => {
  const now = Date.now();
  const cached = storageCache[userId];
  
  // Return cached data if it's still valid
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    return cached.data;
  }
  
  // Calculate fresh data
  const usage = await calculateStorageUsage(userId);
  
  // Cache the result
  storageCache[userId] = {
    data: usage,
    timestamp: now
  };
  
  return usage;
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
