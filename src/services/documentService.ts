import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject
} from 'firebase/storage';
import { db, storage } from './firebase';
import { clearStorageCache } from './storageService';

export interface Document {
  id?: string;
  name: string;
  type: string;
  size: number;
  url: string;
  path: string;
  userId: string;
  category?: string;
  tags?: string[];
  uploadedAt: any;
  lastModified?: any;
  metadata?: Record<string, any>;
}

export interface DocumentUploadProgress {
  progress: number;
  snapshot: any;
}

/**
 * Upload a document to Firebase Storage and save metadata to Firestore
 */
export const uploadDocument = async (
  file: File, 
  userId: string,
  category?: string,
  tags?: string[],
  metadata?: Record<string, any>,
  onProgress?: (progress: DocumentUploadProgress) => void
): Promise<Document> => {
  try {
    // Create a storage reference
    const storageRef = ref(storage, `documents/${userId}/${Date.now()}_${file.name}`);
    
    // Upload file to Firebase Storage
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    // Return a promise that resolves when the upload is complete
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Track upload progress
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) {
            onProgress({ progress, snapshot });
          }
        },
        (error) => {
          // Handle upload errors
          reject(error);
        },
        async () => {
          // Upload completed successfully
          try {
            // Get download URL
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            // Create document metadata in Firestore
            const documentData: Omit<Document, 'id'> = {
              name: file.name,
              type: file.type,
              size: file.size,
              url: downloadURL,
              path: uploadTask.snapshot.ref.fullPath,
              userId,
              uploadedAt: serverTimestamp(),
              lastModified: serverTimestamp(),
              ...(category && { category }),
              ...(tags && { tags }),
              ...(metadata && { metadata })
            };
            
            // Add document to Firestore
            const docRef = await addDoc(collection(db, 'documents'), documentData);
            
            // Clear storage cache to reflect new upload
            clearStorageCache(documentData.userId);
            
            // Return the document with its ID
            resolve({
              id: docRef.id,
              ...documentData
            });
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
};

/**
 * Get a document by ID
 */
export const getDocument = async (documentId: string): Promise<Document | null> => {
  try {
    const docRef = doc(db, `documents/${documentId}`);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Document;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting document:', error);
    throw error;
  }
};

/**
 * Get all documents for a user
 */
export const getUserDocuments = async (
  userId: string,
  category?: string,
  orderByField: string = 'uploadedAt',
  orderDirection: 'asc' | 'desc' = 'desc'
): Promise<Document[]> => {
  try {
    let q = query(
      collection(db, 'documents'),
      where('userId', '==', userId),
      orderBy(orderByField, orderDirection)
    );
    
    if (category) {
      q = query(
        collection(db, 'documents'),
        where('userId', '==', userId),
        where('category', '==', category),
        orderBy(orderByField, orderDirection)
      );
    }
    
    const querySnapshot = await getDocs(q);
    const documents: Document[] = [];
    
    querySnapshot.forEach((doc) => {
      documents.push({
        id: doc.id,
        ...doc.data()
      } as Document);
    });
    
    return documents;
  } catch (error) {
    console.error('Error getting user documents:', error);
    throw error;
  }
};

/**
 * Update a document's metadata
 */
export const updateDocument = async (
  documentId: string,
  updates: Partial<Document>
): Promise<void> => {
  try {
    const docRef = doc(db, `documents/${documentId}`);
    
    // Add last modified timestamp
    const updatedData = {
      ...updates,
      lastModified: serverTimestamp()
    };
    
    await updateDoc(docRef, updatedData);
  } catch (error) {
    console.error('Error updating document:', error);
    throw error;
  }
};

/**
 * Delete a document from Firestore and Storage
 */
export const deleteDocument = async (documentId: string): Promise<void> => {
  try {
    // Get document data to get the storage path
    const docRef = doc(db, `documents/${documentId}`);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error('Document not found');
    }
    
    const documentData = docSnap.data() as Document;
    
    // Delete from Storage
    const storageRef = ref(storage, documentData.path);
    await deleteObject(storageRef);
    
    // Delete from Firestore
    await deleteDoc(docRef);
    
    // Clear storage cache to reflect deletion
    clearStorageCache(documentData.userId);
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

/**
 * Search documents by name, tags, or content
 */
export const searchDocuments = async (
  userId: string,
  searchTerm: string
): Promise<Document[]> => {
  try {
    // For basic search, we'll just query by userId and filter client-side
    // In a production app, you would use a more sophisticated search solution like Algolia
    const q = query(
      collection(db, 'documents'),
      where('userId', '==', userId),
      orderBy('uploadedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const documents: Document[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data() as Document;
      
      // Simple client-side filtering
      if (
        data.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (data.tags && data.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))) ||
        (data.metadata && data.metadata.content && data.metadata.content.toLowerCase().includes(searchTerm.toLowerCase()))
      ) {
        documents.push({
          id: doc.id,
          ...data
        });
      }
    });
    
    return documents;
  } catch (error) {
    console.error('Error searching documents:', error);
    throw error;
  }
};

/**
 * Get document categories for a user
 */
export const getDocumentCategories = async (userId: string): Promise<string[]> => {
  try {
    const q = query(
      collection(db, 'documents'),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const categories = new Set<string>();
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.category) {
        categories.add(data.category);
      }
    });
    
    return Array.from(categories);
  } catch (error) {
    console.error('Error getting document categories:', error);
    throw error;
  }
};

/**
 * Get document tags for a user
 */
export const getDocumentTags = async (userId: string): Promise<string[]> => {
  try {
    const q = query(
      collection(db, 'documents'),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const tags = new Set<string>();
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.tags && Array.isArray(data.tags)) {
        data.tags.forEach((tag: string) => tags.add(tag));
      }
    });
    
    return Array.from(tags);
  } catch (error) {
    console.error('Error getting document tags:', error);
    throw error;
  }
};
