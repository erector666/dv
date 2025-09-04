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
  processDocument,
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
 * NEW IMPROVED FLOW: Original file → Temp storage → AI processing → PDF conversion → Final storage
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

    // Step 1: Upload ORIGINAL file to temp folder for AI processing
    onAIProgress?.('uploading_for_ai', 10);
    console.log('📤 Uploading original file to temp folder for AI processing...');

    const tempStorageRef = ref(
      storage,
      `temp/${userId}/${Date.now()}_${file.name}`
    );
    
    const tempUploadTask = uploadBytesResumable(tempStorageRef, file);
    
    // Wait for temp upload to complete
    const tempUploadURL = await new Promise<string>((resolve, reject) => {
      tempUploadTask.on(
        'state_changed',
        snapshot => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) {
            onProgress({ progress: progress * 0.2, snapshot }); // 20% of total progress
          }
        },
        error => reject(error),
        async () => {
          try {
            const downloadURL = await getDownloadURL(tempUploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (error) {
            reject(error);
          }
        }
      );
    });
    
    console.log('✅ Original file uploaded to temp storage:', tempUploadURL);

    let originalType = file.type;
    let tempFilePath = tempStorageRef.fullPath;

    // Step 2: AI Processing on ORIGINAL file (not converted PDF!)
    onAIProgress?.('processing_ai', 30);
    console.log('🤖 Starting AI processing on original file...');
    
    // Create temporary document object for AI processing
    const tempDocument: Document = {
      name: file.name,
      type: originalType, // Use original file type for AI processing
      size: file.size,
      url: tempUploadURL, // Use temp URL for AI processing
      path: tempFilePath,
      userId,
      category,
      tags,
      uploadedAt: new Date(),
      metadata: initialMetadata,
    };

    // Process document with AI using the ORIGINAL file
    const processedDocument = await processDocument(tempDocument);
    console.log('✅ AI processing completed successfully');

    // Step 3: Convert to PDF AFTER AI processing
    onAIProgress?.('converting_to_pdf', 60);
    console.log('🔄 Converting to PDF after AI processing...');

    let pdfFile: File;

    if (file.type === 'application/pdf') {
      pdfFile = file;
      console.log('✅ File is already PDF, skipping conversion');
    } else {
      // Convert non-PDF files to PDF using a conversion service
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

    // Step 4: Upload final PDF to permanent storage
    onAIProgress?.('uploading_final', 80);
    console.log('☁️ Uploading final PDF to permanent storage...');

    const finalStorageRef = ref(
      storage,
      `documents/${userId}/${Date.now()}_${pdfFile.name}`
    );
    
    const finalUploadTask = uploadBytesResumable(finalStorageRef, pdfFile);
    
    // Wait for final upload to complete
    const finalDownloadURL = await new Promise<string>((resolve, reject) => {
      finalUploadTask.on(
        'state_changed',
        snapshot => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) {
            onProgress({ progress: 60 + (progress * 0.3), snapshot }); // 60-90% of total progress
          }
        },
        error => reject(error),
        async () => {
          try {
            const downloadURL = await getDownloadURL(finalUploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (error) {
            reject(error);
          }
        }
      );
    });
    
    console.log('✅ Final PDF uploaded to permanent storage:', finalDownloadURL);
    
    // This old document creation is no longer needed - we have finalDocument from AI processing

    // Step 6: Clean up temp file
    onAIProgress?.('cleaning_up', 95);
    console.log('🧹 Cleaning up temp file...');
    
    try {
      // Delete the temp file
      await deleteObject(tempStorageRef);
      console.log('✅ Temp file cleaned up successfully');
    } catch (cleanupError) {
      console.warn('⚠️ Failed to clean up temp file:', cleanupError);
      // Don't fail the entire process if cleanup fails
    }

    // Step 7: Create final document with AI results and PDF details
    onAIProgress?.('saving_to_database', 98);
    console.log('💾 Creating final document with AI results...');
    
    // Create final document object with AI processing results and final PDF URL
    const finalDocument: Omit<Document, 'id'> = {
      name: pdfFile.name, // Use PDF filename
      type: pdfFile.type, // Use PDF type for storage
      size: pdfFile.size, // Use PDF size
      url: finalDownloadURL, // Use final PDF URL
      path: finalStorageRef.fullPath, // Use final PDF path
      userId,
      category: processedDocument.category || category, // Use AI-detected category
      tags: processedDocument.tags || tags, // Use AI-detected tags
      uploadedAt: new Date(),
      lastModified: new Date(),
      metadata: {
        ...initialMetadata,
        ...processedDocument.metadata, // Include all AI processing results
        originalFileType: originalType, // Remember original file type
        tempProcessingUrl: tempUploadURL, // For debugging if needed
        convertedToPdf: originalType !== 'application/pdf',
        originalFileName: file.name,
        aiProcessingCompleted: new Date(),
      },
    };
    
    // Save the document to Firestore with AI results
    const finalDocRef = await addDoc(
      collection(db, 'documents'),
      omitUndefinedDeep(finalDocument)
    );
    
    const savedDocument: Document = {
      ...finalDocument,
      id: finalDocRef.id,
      firestoreId: finalDocRef.id,
    };
    
    onAIProgress?.('completed', 100);
    console.log('🎉 AI-enhanced document upload completed successfully!');
    
    return savedDocument;
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
      
      // Check if this document has a proper Firestore ID
      if (!doc.id) {
        console.warn('⚠️ Document missing Firestore ID:', data);
        // Skip documents without proper IDs for now
        return;
      }
      
      // Use the Firestore document ID as the primary ID
      documents.push({
        id: doc.id, // Use Firestore ID as the primary ID
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
    // Validate that we have a proper Firestore document ID
    if (!firestoreId || firestoreId === '') {
      console.error('❌ Cannot delete document: Missing or empty Firestore ID');
      throw new Error('Cannot delete document: Missing document ID in database');
    }
    
    console.log('🗑️ Starting document deletion for ID:', documentId, 'Firestore ID:', firestoreId);

    // Get document data to get the storage path
    const docRef = doc(db, `documents/${firestoreId}`);
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
        firestoreId: doc.id, // Store the actual Firestore document ID
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
