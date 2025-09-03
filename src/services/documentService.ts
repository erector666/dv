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
  serverTimestamp,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { db, storage } from './firebase';
import { clearStorageCache } from './storageService';
import {
  extractTextFromDocument,
  detectLanguage,
  classifyDocument,
  generateDocumentSummary,
} from './classificationService';

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
    const storageRef = ref(
      storage,
      `documents/${userId}/${Date.now()}_${file.name}`
    );

    // Upload file to Firebase Storage
    const uploadTask = uploadBytesResumable(storageRef, file);

    // Return a promise that resolves when the upload is complete
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        snapshot => {
          // Track upload progress
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) {
            onProgress({ progress, snapshot });
          }
        },
        error => {
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
              ...(metadata && { metadata }),
            };

            // Add document to Firestore
            const docRef = await addDoc(
              collection(db, 'documents'),
              documentData
            );

            // Clear storage cache to reflect new upload
            clearStorageCache(documentData.userId);

            // Return the document with its ID
            resolve({
              id: docRef.id,
              ...documentData,
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
 * Upload a document with full AI processing pipeline
 * This function uploads the document and then processes it through all AI services
 */
export const uploadDocumentWithAI = async (
  file: File,
  userId: string,
  category?: string,
  tags?: string[],
  metadata?: Record<string, any>,
  onProgress?: (progress: DocumentUploadProgress) => void,
  onAIProgress?: (stage: string, progress: number) => void
): Promise<Document> => {
  try {
    console.log('🚀 Starting AI-enhanced document upload for:', file.name);
    
    // Step 1: Convert file to PDF (if not already PDF)
    onAIProgress?.('converting_to_pdf', 20);
    console.log('📄 Converting file to PDF...');
    
    let pdfFile: File;
    let originalType = file.type;
    
    if (file.type === 'application/pdf') {
      pdfFile = file;
      console.log('✅ File is already PDF, skipping conversion');
    } else {
      // For now, we'll use a placeholder conversion
      // In production, you'd use a proper conversion service
      console.log('⚠️ File conversion not implemented yet, using original file');
      pdfFile = file;
    }
    
    // Step 2: Upload PDF to Firebase Storage
    onAIProgress?.('uploading_pdf', 40);
    console.log('☁️ Uploading PDF to Firebase Storage...');
    
    const document = await uploadDocument(pdfFile, userId, category, tags, {
      ...metadata,
      originalType: originalType,
      convertedToPdf: true,
      originalFileName: file.name
    });
    
    console.log('✅ PDF uploaded successfully, starting AI processing...');
    
    // Step 3: Extract text from PDF
    onAIProgress?.('extracting_text', 60);
    console.log('🔍 Extracting text from PDF...');
    const textExtraction = await extractTextFromDocument(document.url, 'application/pdf');
    console.log('✅ Text extraction completed:', {
      wordCount: textExtraction.wordCount,
      confidence: textExtraction.confidence
    });
    
    // Step 4: Detect language
    onAIProgress?.('detecting_language', 70);
    console.log('🌐 Detecting document language...');
    const languageDetection = await detectLanguage(document.url, 'application/pdf');
    console.log('✅ Language detection completed:', {
      language: languageDetection.language,
      confidence: languageDetection.confidence
    });
    
    // Step 5: Classify document and assign category
    onAIProgress?.('classifying_document', 80);
    console.log('🏷️ Classifying document and assigning category...');
    const classification = await classifyDocument(document.id || '', document.url, 'application/pdf');
    console.log('✅ Document classification completed:', {
      category: classification.category,
      tags: classification.tags,
      confidence: classification.confidence
    });
    
    // Step 6: Generate document summary
    onAIProgress?.('generating_summary', 90);
    console.log('📝 Generating document summary...');
    const summary = await generateDocumentSummary(document.url, 'application/pdf');
    console.log('✅ Summary generation completed:', {
      summaryLength: summary.summary.length,
      confidence: summary.confidence
    });
    
    // Step 7: Update document with AI processing results
    onAIProgress?.('updating_document', 95);
    console.log('💾 Updating document with AI results...');
    
    const updatedDocument: Document = {
      ...document,
      category: classification.category || document.category,
      tags: classification.tags || document.tags || [],
      metadata: {
        ...document.metadata,
        summary: summary.summary,
        language: languageDetection.language,
        categories: classification.classificationDetails?.categories || [],
        classificationConfidence: classification.confidence,
        textExtraction: {
          confidence: textExtraction.confidence,
          wordCount: textExtraction.wordCount,
          documentType: textExtraction.documentType
        },
        languageDetection: {
          confidence: languageDetection.confidence,
          allLanguages: languageDetection.allLanguages || []
        },
        summarization: {
          confidence: summary.confidence,
          quality: summary.quality,
          metrics: summary.metrics
        },
        entities: classification.classificationDetails?.entities || [],
        sentiment: classification.classificationDetails?.sentiment,
        aiProcessed: true,
        aiProcessedAt: new Date().toISOString(),
        originalType: originalType,
        convertedToPdf: true,
        originalFileName: file.name
      },
    };
    
    // Update the document in Firestore with AI results
    await updateDocument(document.id || '', updatedDocument);
    
    onAIProgress?.('completed', 100);
    console.log('🎉 AI processing completed successfully!');
    console.log('📊 Final document:', {
      name: updatedDocument.name,
      category: updatedDocument.category,
      language: updatedDocument.metadata?.language,
      tags: updatedDocument.tags,
      aiProcessed: updatedDocument.metadata?.aiProcessed
    });
    
    return updatedDocument;
    
  } catch (error) {
    console.error('❌ Error in AI-enhanced upload:', error);
    
    // If AI processing fails, still return the basic document
    // but log the error for debugging
    try {
      const basicDocument = await uploadDocument(file, userId, category, tags, metadata, onProgress);
      console.warn('⚠️ AI processing failed, returning basic document:', basicDocument.name);
      return basicDocument;
    } catch (uploadError) {
      console.error('❌ Basic upload also failed:', uploadError);
      throw uploadError;
    }
  }
};

/**
 * Get a document by ID
 */
export const getDocument = async (
  documentId: string
): Promise<Document | null> => {
  try {
    const docRef = doc(db, `documents/${documentId}`);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
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
    console.log('=== getUserDocuments DEBUG ===');
    console.log('User ID:', userId);
    console.log('Category:', category);
    console.log('Order by:', orderByField, orderDirection);

    if (!userId) {
      console.warn('⚠️ No userId provided, returning empty array');
      return [];
    }

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

    console.log('Executing Firestore query...');
    const querySnapshot = await getDocs(q);
    console.log('Query result:', querySnapshot);
    console.log('Query size:', querySnapshot.size);

    const documents: Document[] = [];

    querySnapshot.forEach(doc => {
      const data = doc.data();
      console.log('Document data:', { id: doc.id, ...data });
      documents.push({
        id: doc.id,
        ...data,
      } as Document);
    });

    console.log('Final documents array:', documents);
    console.log('Returning', documents.length, 'documents');

    return documents;
  } catch (error) {
    console.error('❌ Error getting user documents:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code || 'No code',
      stack: error instanceof Error ? error.stack : 'No stack',
    });
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
      lastModified: serverTimestamp(),
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
    console.log('🗑️ Starting document deletion for ID:', documentId);
    
    // Get document data to get the storage path
    const docRef = doc(db, `documents/${documentId}`);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.warn('⚠️ Document not found in Firestore:', documentId);
      throw new Error('Document not found');
    }

    const documentData = docSnap.data() as Document;
    console.log('📄 Document data for deletion:', {
      id: documentId,
      name: documentData.name,
      path: documentData.path,
      userId: documentData.userId
    });

    // Try to delete from Storage first, but don't fail if it's already gone
    if (documentData.path) {
      try {
        const storageRef = ref(storage, documentData.path);
        await deleteObject(storageRef);
        console.log('✅ Storage object deleted successfully');
      } catch (storageError: any) {
        // Handle specific Storage errors gracefully
        if (storageError?.code === 'storage/object-not-found') {
          console.warn('⚠️ Storage object already deleted, continuing with Firestore cleanup');
        } else if (storageError?.code === 'storage/unauthorized') {
          console.warn('⚠️ Unauthorized to delete Storage object, continuing with Firestore cleanup');
        } else {
          console.warn('⚠️ Storage deletion failed, but continuing with Firestore cleanup:', storageError);
        }
        // Don't throw the error - continue with Firestore deletion
      }
    } else {
      console.warn('⚠️ No storage path found for document, skipping Storage deletion');
    }

    // Delete from Firestore
    await deleteDoc(docRef);
    console.log('✅ Firestore document deleted successfully');

    // Clear storage cache to reflect deletion
    clearStorageCache(documentData.userId);
    console.log('✅ Storage cache cleared');

    console.log('🎉 Document deletion completed successfully');
  } catch (error) {
    console.error('❌ Error deleting document:', error);
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

    querySnapshot.forEach(doc => {
      const data = doc.data() as Document;

      // Simple client-side filtering
      if (
        data.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (data.tags &&
          data.tags.some(tag =>
            tag.toLowerCase().includes(searchTerm.toLowerCase())
          )) ||
        (data.metadata &&
          data.metadata.content &&
          data.metadata.content
            .toLowerCase()
            .includes(searchTerm.toLowerCase()))
      ) {
        documents.push({
          id: doc.id,
          ...data,
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
export const getDocumentCategories = async (
  userId: string
): Promise<string[]> => {
  try {
    const q = query(collection(db, 'documents'), where('userId', '==', userId));

    const querySnapshot = await getDocs(q);
    const categories = new Set<string>();

    querySnapshot.forEach(doc => {
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
    const q = query(collection(db, 'documents'), where('userId', '==', userId));

    const querySnapshot = await getDocs(q);
    const tags = new Set<string>();

    querySnapshot.forEach(doc => {
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
