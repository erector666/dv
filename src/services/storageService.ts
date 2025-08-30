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
    console.log('calculateStorageUsage called with userId:', userId);
    
    let firestoreSize = 0;
    let firestoreCount = 0;
    
    // Check Firestore documents
    try {
      const documentsRef = collection(db, 'documents');
      const q = query(documentsRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      console.log('Found Firestore documents:', querySnapshot.size);
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('Firestore document data:', data);
        if (data.fileSize && typeof data.fileSize === 'number') {
          firestoreSize += data.fileSize;
          firestoreCount++;
          console.log('Added Firestore file size:', data.fileSize, 'Total so far:', firestoreSize);
        }
      });
    } catch (error) {
      console.error('Error querying Firestore:', error);
    }
    
    // For testing: If no documents found in Firestore but you know there are files in Storage
    // You can manually add some test data here
    if (firestoreCount === 0) {
      console.log('No documents found in Firestore. If you have files in Storage, they may not be tracked in Firestore.');
      console.log('To see real storage usage, upload a file through the app interface.');
    }
    
    const result = {
      totalSize: firestoreSize,
      documentCount: firestoreCount,
      lastUpdated: new Date(),
      firestoreSize,
      firestoreCount
    };
    
    console.log('Final storage calculation result:', result);
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
  console.log('getStorageUsage called with userId:', userId);
  
  const now = Date.now();
  const cached = storageCache[userId];
  
  // Return cached data if it's still valid
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    console.log('Returning cached storage data:', cached.data);
    return cached.data;
  }
  
  // Calculate fresh data
  console.log('Calculating fresh storage data...');
  const usage = await calculateStorageUsage(userId);
  console.log('Calculated storage usage:', usage);
  
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
