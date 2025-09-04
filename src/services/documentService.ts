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
import jsPDF from 'jspdf';

// PDF Conversion Functions
const convertImageToPdf = async (imageFile: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      try {
        // Create a new jsPDF instance
        const pdf = new jsPDF('p', 'mm', 'a4');

        // Calculate dimensions to fit image on page
        const imgWidth = img.width;
        const imgHeight = img.height;
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        // Calculate scaling to fit image on page
        const scaleX = pageWidth / imgWidth;
        const scaleY = pageHeight / imgHeight;
        const scale = Math.min(scaleX, scaleY) * 0.9; // 90% of page size

        const scaledWidth = imgWidth * scale;
        const scaledHeight = imgHeight * scale;

        // Center image on page
        const x = (pageWidth - scaledWidth) / 2;
        const y = (pageHeight - scaledHeight) / 2;

        // Convert image to base64
        canvas.width = imgWidth;
        canvas.height = imgHeight;
        ctx?.drawImage(img, 0, 0);
        const imgData = canvas.toDataURL('image/jpeg', 0.8);

        // Add image to PDF
        pdf.addImage(imgData, 'JPEG', x, y, scaledWidth, scaledHeight);

        // Convert PDF to blob
        const pdfBlob = pdf.output('blob');
        const pdfFile = new File(
          [pdfBlob],
          imageFile.name.replace(/\.[^/.]+$/, '.pdf'),
          {
            type: 'application/pdf',
          }
        );

        resolve(pdfFile);
      } catch (error) {
        console.error('Error converting image to PDF:', error);
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(imageFile);
  });
};

const convertDocumentToPdf = async (docFile: File): Promise<File> => {
  try {
    // For text-based documents, create a PDF with the text content
    if (docFile.type.includes('text') || docFile.type.includes('document')) {
      const text = await docFile.text();
      const pdf = new jsPDF('p', 'mm', 'a4');

      // Set font and size
      pdf.setFont('helvetica');
      pdf.setFontSize(12);

      // Split text into lines that fit the page width
      const pageWidth = pdf.internal.pageSize.getWidth() - 20; // 10mm margin on each side
      const lines = pdf.splitTextToSize(text, pageWidth);

      // Add text to PDF
      let yPosition = 20;
      for (let i = 0; i < lines.length; i++) {
        if (yPosition > pdf.internal.pageSize.getHeight() - 20) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.text(lines[i], 10, yPosition);
        yPosition += 7;
      }

      const pdfBlob = pdf.output('blob');
      const pdfFile = new File(
        [pdfBlob],
        docFile.name.replace(/\.[^/.]+$/, '.pdf'),
        {
          type: 'application/pdf',
        }
      );

      return pdfFile;
    }

    // For other types, return original file
    return docFile;
  } catch (error) {
    console.error('Error converting document to PDF:', error);
    return docFile;
  }
};

const createBasicPdfWrapper = async (file: File): Promise<File> => {
  try {
    // Create a basic PDF wrapper for unsupported file types
    const pdf = new jsPDF('p', 'mm', 'a4');

    // Add file information
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text('Document Conversion', 20, 30);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);
    pdf.text(`Original File: ${file.name}`, 20, 50);
    pdf.text(`File Type: ${file.type}`, 20, 60);
    pdf.text(`File Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`, 20, 70);
    pdf.text(`Conversion Date: ${new Date().toLocaleDateString()}`, 20, 80);

    pdf.text(
      'Note: This file was converted to PDF format for storage.',
      20,
      100
    );
    pdf.text('The original file content may not be fully preserved.', 20, 110);

    const pdfBlob = pdf.output('blob');
    const pdfFile = new File(
      [pdfBlob],
      file.name.replace(/\.[^/.]+$/, '.pdf'),
      {
        type: 'application/pdf',
      }
    );

    return pdfFile;
  } catch (error) {
    console.error('Error creating PDF wrapper:', error);
    return file;
  }
};

// Utility function to remove undefined values from objects before sending to Firestore
function omitUndefinedDeep<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj
      .map(omitUndefinedDeep)
      .filter(x => x !== undefined) as unknown as T;
  }
  if (obj && typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanedValue = omitUndefinedDeep(value);
      if (cleanedValue !== undefined) {
        cleaned[key] = cleanedValue;
      }
    }
    return cleaned;
  }
  return obj === undefined ? (undefined as any) : obj;
}

export interface Document {
  id?: string; // Display ID (can be derived from path if Firestore ID is missing)
  firestoreId?: string; // Actual Firestore document ID for operations
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
  initialMetadata?: Record<string, any>,
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
      // Convert non-PDF files to PDF using a conversion service
      console.log('🔄 Converting file to PDF...');
      try {
        // For images, we'll create a simple PDF conversion
        if (file.type.startsWith('image/')) {
          pdfFile = await convertImageToPdf(file);
        } else if (
          file.type.includes('document') ||
          file.type.includes('text')
        ) {
          pdfFile = await convertDocumentToPdf(file);
        } else {
          // For other file types, create a basic PDF wrapper
          pdfFile = await createBasicPdfWrapper(file);
        }
        console.log('✅ File converted to PDF successfully');
      } catch (conversionError) {
        console.warn(
          '⚠️ PDF conversion failed, using original file:',
          conversionError
        );
        pdfFile = file;
      }
    }

    // Step 2: Upload PDF to Firebase Storage
    onAIProgress?.('uploading_pdf', 40);
    console.log('☁️ Uploading PDF to Firebase Storage...');

    // Don't save to database yet - wait for AI processing to complete
    // Just upload to storage and get the URL
    const storageRef = ref(
      storage,
      `documents/${userId}/${Date.now()}_${pdfFile.name}`
    );
    
    const uploadTask = uploadBytesResumable(storageRef, pdfFile);
    
    // Wait for upload to complete
    await new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        snapshot => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) {
            onProgress({ progress: progress * 0.4, snapshot });
          }
        },
        error => reject(error),
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (error) {
            reject(error);
          }
        }
      );
    });
    
    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
    
    // Create document object but don't save to database yet
    const document = {
      id: '', // Will be assigned when saved
      name: pdfFile.name,
      type: pdfFile.type,
      size: pdfFile.size,
      url: downloadURL,
      path: uploadTask.snapshot.ref.fullPath,
      userId,
      uploadedAt: new Date(),
      lastModified: new Date(),
      category: 'processing', // Temporary category while AI processes
      tags: ['processing'],
      metadata: {
        ...initialMetadata,
        originalType: originalType,
        convertedToPdf: true,
        originalFileName: file.name,
        aiProcessing: true,
      },
    };

    console.log('✅ PDF uploaded successfully, starting AI processing...');

    // Step 3: Extract text from PDF
    onAIProgress?.('extracting_text', 60);
    console.log('🔍 Extracting text from PDF...');
    const textExtraction = await extractTextFromDocument(document.url, 'pdf');
    console.log('✅ Text extraction completed:', {
      wordCount: textExtraction.wordCount,
      confidence: textExtraction.confidence,
    });

    // Step 4: Detect language
    onAIProgress?.('detecting_language', 70);
    console.log('🌐 Detecting document language...');
    const languageDetection = await detectLanguage(document.url, 'pdf');
    console.log('✅ Language detection completed:', {
      language: languageDetection.language,
      confidence: languageDetection.confidence,
    });

    // Step 5: Classify document and assign category
    onAIProgress?.('classifying_document', 80);
    console.log('🏷️ Classifying document and assigning category...');
    const classification = await classifyDocument(
      document.id || '',
      document.url,
      'pdf'
    );
    console.log('✅ Document classification completed:', {
      category: classification.category,
      tags: classification.tags,
      confidence: classification.confidence,
    });

    // Step 6: Generate document summary
    onAIProgress?.('generating_summary', 90);
    console.log('📝 Generating document summary...');
    const summary = await generateDocumentSummary(document.url, 'pdf');
    console.log('✅ Summary generation completed:', {
      summaryLength: summary.summary.length,
      confidence: summary.confidence,
    });

    // Step 7: Update document with AI processing results
    onAIProgress?.('updating_document', 95);
    console.log('💾 Updating document with AI results...');

    // Build metadata with safe defaults to avoid undefined values
    const aiMetadata: any = {
      ...document.metadata,
      summary: summary.summary || '',
      language: languageDetection.language || 'en',
      categories: classification.classificationDetails?.categories || [],
      classificationConfidence: classification.confidence || 0,
      textExtraction: {
        confidence: textExtraction.confidence || 0,
        wordCount: textExtraction.wordCount || 0,
        documentType: textExtraction.documentType || 'unknown',
      },
      languageDetection: {
        confidence: languageDetection.confidence || 0,
        allLanguages: languageDetection.allLanguages || [],
      },
      summarization: {
        confidence: summary.confidence || 0,
        quality: summary.quality || 'Unknown',
        metrics: summary.metrics || {},
      },
      entities: classification.classificationDetails?.entities || [],
      sentiment: classification.classificationDetails?.sentiment || null,
      aiProcessed: true,
      aiProcessedAt: new Date().toISOString(),
      originalType: originalType || 'unknown',
      convertedToPdf: true,
      originalFileName: file.name,
    };

    const updatedDocument: Document = {
      ...document,
      category: classification.category || 'other', // Use AI category, never fallback to 'personal'
      tags: classification.tags || ['document'],
      metadata: aiMetadata,
    };

    // Clean the document metadata to remove any undefined values before sending to Firestore
    const cleanedDocument = omitUndefinedDeep(updatedDocument);

    // Log the cleaned metadata for debugging
    console.log('🧹 Cleaned document metadata:', {
      language: cleanedDocument.metadata?.language,
      category: cleanedDocument.category,
      tags: cleanedDocument.tags,
      summary: cleanedDocument.metadata?.summary,
    });

    // Save the document to Firestore with AI results (first time save)
    const docRef = await addDoc(
      collection(db, 'documents'),
      cleanedDocument
    );
    
    // Assign the ID from Firestore
    const finalDocument = {
      ...cleanedDocument,
      id: docRef.id,
    };
    
    // Clear storage cache to refresh storage widget
    clearStorageCache(userId);

    onAIProgress?.('completed', 100);
    console.log('🎉 AI processing completed successfully!');
    console.log('📊 Final document:', {
      name: finalDocument.name,
      category: finalDocument.category,
      language: finalDocument.metadata?.language,
      tags: finalDocument.tags,
      aiProcessed: finalDocument.metadata?.aiProcessed,
    });

    return finalDocument;
  } catch (error) {
    console.error('❌ Error in AI-enhanced upload:', error);

    // If AI processing fails, still return the basic document
    // but log the error for debugging
    try {
      const basicDocument = await uploadDocument(
        file,
        userId,
        category,
        tags,
        initialMetadata,
        onProgress
      );
      console.warn(
        '⚠️ AI processing failed, returning basic document:',
        basicDocument.name
      );
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
      
      // Ensure we have a valid ID - use Firestore doc.id as primary, fallback to path if needed
      const documentId = doc.id || data.path?.split('/').pop()?.replace(/\.pdf$/, '') || `doc_${Date.now()}_${Math.random()}`;
      
      documents.push({
        id: documentId,
        firestoreId: doc.id, // Store the actual Firestore document ID
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

    // Clean the updates to remove any undefined values before sending to Firestore
    const cleanedUpdates = omitUndefinedDeep(updates);

    // Add last modified timestamp
    const updatedData = {
      ...cleanedUpdates,
      lastModified: serverTimestamp(),
    };

    console.log('🧹 Cleaned updates for Firestore:', updatedData);

    await updateDoc(docRef, updatedData);
    console.log('✅ Document updated successfully:', documentId);
  } catch (error) {
    console.error('❌ Error updating document:', error);
    throw error;
  }
};

/**
 * Delete a document from Firestore and Storage
 */
export const deleteDocument = async (documentId: string, firestoreId?: string): Promise<void> => {
  try {
    // Use firestoreId if available, otherwise use documentId
    const actualDocumentId = firestoreId || documentId;
    console.log('🗑️ Starting document deletion for ID:', documentId, 'Firestore ID:', firestoreId, 'Actual ID:', actualDocumentId);

    // Get document data to get the storage path
    const docRef = doc(db, `documents/${actualDocumentId}`);
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
      userId: documentData.userId,
    });

    // Try to delete from Storage first, but don't fail if it's already gone
    if (documentData.path) {
      try {
        // Use the stored path first
        let storageRef = ref(storage, documentData.path);
        await deleteObject(storageRef);
        console.log('✅ Storage object deleted successfully using stored path');
      } catch (storageError: any) {
        // If the stored path fails, try to construct the path from the document name and userId
        if (storageError?.code === 'storage/object-not-found') {
          console.warn(
            '⚠️ Storage object not found at stored path, trying alternative path construction'
          );
          
          try {
            // Try to construct the path based on the expected structure
            // Extract filename from the stored path or use the document name
            const fileName = documentData.path.split('/').pop() || documentData.name;
            const alternativePath = `documents/${documentData.userId}/${fileName}`;
            
            const alternativeRef = ref(storage, alternativePath);
            await deleteObject(alternativeRef);
            console.log('✅ Storage object deleted successfully using alternative path:', alternativePath);
          } catch (alternativeError: any) {
            console.warn(
              '⚠️ Alternative path also failed, continuing with Firestore cleanup:',
              alternativeError
            );
          }
        } else if (storageError?.code === 'storage/unauthorized') {
          console.warn(
            '⚠️ Unauthorized to delete Storage object, continuing with Firestore cleanup'
          );
        } else {
          console.warn(
            '⚠️ Storage deletion failed, but continuing with Firestore cleanup:',
            storageError
          );
        }
        // Don't throw the error - continue with Firestore deletion
      }
    } else {
      console.warn(
        '⚠️ No storage path found for document, skipping Storage deletion'
      );
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
 * Get all documents for a user
 */
export const getDocuments = async (userId: string): Promise<Document[]> => {
  try {
    const q = query(
      collection(db, 'documents'),
      where('userId', '==', userId),
      orderBy('uploadedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const documents: Document[] = [];

    querySnapshot.forEach(doc => {
      const data = doc.data();
      documents.push({
        id: doc.id,
        ...data,
      } as Document);
    });

    return documents;
  } catch (error) {
    console.error('Error getting documents:', error);
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
