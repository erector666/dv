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
  listAll,
} from 'firebase/storage';
import { db, storage, recoverFromNetworkError } from './firebase';
import { clearStorageCache } from './storageService';
import { processDocument } from './classificationService';
import jsPDF from 'jspdf';

// AI Processing with Timeout, Retry Logic, and DETAILED PROGRESS FEEDBACK
const processDocumentWithRetry = async (
  document: Document,
  maxRetries = 3,
  onProgress?: (stage: string, progress: number) => void
): Promise<Document> => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `🤖 AI processing attempt ${attempt}/${maxRetries} for:`,
        document.name
      );
      onProgress?.(`ai_attempt_${attempt}`, 30 + attempt * 5); // Show retry progress

      // Create detailed progress tracking
      const progressTracker = {
        stage: 'starting',
        progress: 30,
      };

      // Create a timeout promise with progress updates
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeout = setTimeout(() => {
          reject(
            new Error(
              `AI processing timeout after 120 seconds (attempt ${attempt}) - Last stage: ${progressTracker.stage}`
            )
          );
        }, 120000); // 120 second timeout

        // Progress updates during processing
        const progressInterval = setInterval(() => {
          if (progressTracker.stage === 'starting') {
            progressTracker.stage = 'extracting_text';
            progressTracker.progress = 35;
            onProgress?.('extracting_text', 35);
          } else if (progressTracker.stage === 'extracting_text') {
            progressTracker.stage = 'analyzing_content';
            progressTracker.progress = 40;
            onProgress?.('analyzing_content', 40);
          } else if (progressTracker.stage === 'analyzing_content') {
            progressTracker.stage = 'classifying_document';
            progressTracker.progress = 45;
            onProgress?.('classifying_document', 45);
          } else if (progressTracker.stage === 'classifying_document') {
            progressTracker.stage = 'generating_summary';
            progressTracker.progress = 50;
            onProgress?.('generating_summary', 50);
          }
        }, 5000); // Update every 5 seconds

        return () => {
          clearTimeout(timeout);
          clearInterval(progressInterval);
        };
      });

      // Update progress - starting AI processing
      onProgress?.('processing_with_ai', 32);

      // Race between processing and timeout
      const processedDocument = await Promise.race([
        processDocument(document),
        timeoutPromise,
      ]);

      console.log(`✅ AI processing successful on attempt ${attempt}`);
      onProgress?.('ai_completed', 55);
      return processedDocument;
    } catch (error: any) {
      lastError = error;
      console.warn(
        `❌ AI processing failed on attempt ${attempt}:`,
        error.message
      );
      onProgress?.(`ai_failed_attempt_${attempt}`, 30 + attempt * 2);

      // Check if it's a network error and try to recover
      if (
        error.message?.includes('QUIC') ||
        error.message?.includes('network')
      ) {
        console.log('🔄 Attempting network recovery...');
        onProgress?.('network_recovery', 28);
        await recoverFromNetworkError(error);
      }

      // If this isn't the last attempt, wait before retrying
      if (attempt < maxRetries) {
        const delay = Math.min(2000 * attempt, 10000); // Exponential backoff, max 10s
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        onProgress?.(
          `retrying_in_${Math.round(delay / 1000)}s`,
          30 + attempt * 3
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // If all retries failed, throw the last error
  console.error(`🚨 All ${maxRetries} AI processing attempts failed`);
  throw new Error(
    `AI processing failed after ${maxRetries} attempts: ${lastError?.message}`
  );
};

// Firestore Operations with Retry Logic
const saveDocumentWithRetry = async (
  documentData: any,
  maxRetries = 3
): Promise<any> => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`💾 Firestore save attempt ${attempt}/${maxRetries}`);

      const docRef = await addDoc(
        collection(db, 'documents'),
        omitUndefinedDeep(documentData)
      );

      console.log(`✅ Firestore save successful on attempt ${attempt}`);
      return docRef;
    } catch (error: any) {
      lastError = error;
      console.warn(
        `❌ Firestore save failed on attempt ${attempt}:`,
        error.message
      );

      // Check if it's a network error and try to recover
      if (
        error.message?.includes('QUIC') ||
        error.message?.includes('network') ||
        error.code?.includes('unavailable')
      ) {
        console.log('🔄 Attempting network recovery for Firestore...');
        await recoverFromNetworkError(error);
      }

      // If this isn't the last attempt, wait before retrying
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * attempt, 5000); // Exponential backoff, max 5s
        console.log(`⏳ Waiting ${delay}ms before Firestore retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // If all retries failed, throw the last error
  console.error(`🚨 All ${maxRetries} Firestore save attempts failed`);
  throw new Error(
    `Firestore save failed after ${maxRetries} attempts: ${lastError?.message}`
  );
};

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
  language?: string;
  category?: string;
  tags?: string[];
  uploadedAt: any;
  lastModified?: any;
  metadata?: Record<string, any>;
  suggestedName?: string; // Add AI-suggested name
  status?: 'processing' | 'ready' | 'error';
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
      `incoming/${userId}/${Date.now()}_${file.name}`
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
              status: 'processing',
              ...(category && { category }),
              ...(tags && { tags }),
              metadata: {
                ...(metadata || {}),
                aiProcessed: false,
              },
            };

            // Add document to Firestore (with retry)
            const docRef = await saveDocumentWithRetry(documentData);

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
 * OPTIMIZED FLOW: File → PDF conversion → Single upload → AI processing on permanent URL
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
    console.log('🚀 Starting optimized AI-enhanced document upload for:', file.name);
    let currentProgress = 0;

    // Step 1: Convert to PDF first (if needed) - before upload
    onAIProgress?.('converting_to_pdf', 10);
    console.log('🔄 Converting to PDF before upload...');

    let pdfFile: File;
    const originalType = file.type;

    if (file.type === 'application/pdf') {
      pdfFile = file;
      console.log('✅ File is already PDF, skipping conversion');
    } else {
      // Convert non-PDF files to PDF using a conversion service
      try {
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

    // Update progress after PDF conversion
    currentProgress = Math.max(currentProgress, 15);
    if (onProgress) {
      onProgress({ progress: currentProgress, snapshot: null });
    }

    // Step 2: Single upload to permanent storage
    onAIProgress?.('uploading', 20);
    console.log('☁️ Uploading to permanent storage...');

    const storageRef = ref(
      storage,
      `documents/${userId}/${Date.now()}_${pdfFile.name}`
    );

    const uploadTask = uploadBytesResumable(storageRef, pdfFile);

    // Wait for upload to complete with progress tracking
    const downloadURL = await new Promise<string>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        snapshot => {
          const uploadProgress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          // Smooth progress: 20-60% for upload
          const newProgress = 20 + (uploadProgress * 0.4);
          if (onProgress && newProgress > currentProgress) {
            currentProgress = Math.max(currentProgress, newProgress);
            onProgress({ progress: currentProgress, snapshot });
          }
        },
        error => reject(error),
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            currentProgress = Math.max(currentProgress, 60); // Ensure we're at 60%
            resolve(url);
          } catch (error) {
            reject(error);
          }
        }
      );
    });

    console.log('✅ File uploaded to permanent storage:', downloadURL);

    // Step 3: Create initial document record in Firestore (before AI processing)
    onAIProgress?.('creating_record', 65);
    console.log('💾 Creating initial document record...');

    const initialDocument: Omit<Document, 'id'> = {
      name: pdfFile.name,
      type: pdfFile.type,
      size: pdfFile.size,
      url: downloadURL,
      path: storageRef.fullPath,
      userId,
      category: category || 'uncategorized',
      tags: tags || [],
      uploadedAt: new Date(),
      lastModified: new Date(),
      status: 'processing', // Mark as processing while AI runs
      metadata: {
        ...initialMetadata,
        originalFileType: originalType,
        convertedToPdf: originalType !== 'application/pdf',
        originalFileName: file.name,
        aiProcessed: false,
      },
    };

    // Save initial document to Firestore
    const docRef = await saveDocumentWithRetry(initialDocument);
    const documentId = docRef.id;

    // Update progress after initial save
    currentProgress = Math.max(currentProgress, 70);
    if (onProgress) {
      onProgress({ progress: currentProgress, snapshot: null });
    }

    // Step 4: AI Processing using the permanent URL (asynchronous)
    onAIProgress?.('processing_ai', 75);
    console.log('🤖 Starting AI processing on uploaded file...');

    // Create document object for AI processing using permanent URL
    const documentForAI: Document = {
      id: documentId,
      firestoreId: documentId,
      name: pdfFile.name,
      type: originalType, // Use original file type for better AI processing
      size: file.size,
      url: downloadURL, // Use permanent URL
      path: storageRef.fullPath,
      userId,
      category: category || 'uncategorized',
      tags: tags || [],
      uploadedAt: new Date(),
      metadata: initialMetadata,
    };

    // Process document with AI using the permanent URL
    let processedDocument: Document;
    try {
      processedDocument = await processDocumentWithRetry(
        documentForAI,
        3,
        onAIProgress
      );
      console.log('✅ AI processing completed successfully');
      
      // Update progress after AI completion
      currentProgress = Math.max(currentProgress, 90);
      if (onProgress) {
        onProgress({ progress: currentProgress, snapshot: null });
      }
    } catch (aiError) {
      console.warn('⚠️ AI processing failed, using basic document:', aiError);
      // Continue with basic document if AI fails
      processedDocument = documentForAI;
      
      currentProgress = Math.max(currentProgress, 90);
      if (onProgress) {
        onProgress({ progress: currentProgress, snapshot: null });
      }
    }

    // Step 5: Update document with AI results
    onAIProgress?.('updating_metadata', 95);
    console.log('💾 Updating document with AI results...');

    // Create AI-suggested name if available
    const aiSuggestedName =
      processedDocument.suggestedName ||
      processedDocument.metadata?.suggestedName;
    const sanitizeFileName = (name: string) =>
      name.replace(/[\\/:*?"<>|]/g, '').trim();
    const finalName = aiSuggestedName
      ? `${sanitizeFileName(aiSuggestedName)}.pdf`
      : pdfFile.name;

    // Prepare update data with AI results
    const updateData: Partial<Document> = {
      name: finalName,
      status: 'ready',
      category: processedDocument.category || category || 'uncategorized',
      tags: Array.from(
        new Set([
          ...(processedDocument.tags || []),
          ...(tags || []),
          processedDocument.language ? `lang:${processedDocument.language}` : '',
          // Add useful time-based tags
          new Date().getFullYear().toString(),
          'this-year',
          // Add content-based tags based on processing results
          processedDocument.metadata?.textExtraction?.wordCount > 500 ? 'text-heavy' : '',
          originalType?.includes('image/') ? 'image-only' : '',
          // Add confidence-based tags
          processedDocument.metadata?.classificationConfidence > 0.8 ? 'high-confidence' : '',
          processedDocument.metadata?.classificationConfidence < 0.6 ? 'low-confidence' : '',
          // Add processing status tags
          'processed',
          'ai-enhanced'
        ])
      ).filter(Boolean) as string[],
      metadata: {
        ...initialMetadata,
        ...processedDocument.metadata,
        originalFileType: originalType,
        convertedToPdf: originalType !== 'application/pdf',
        originalFileName: file.name,
        aiProcessingCompleted: new Date(),
        aiProcessed: true,
      },
      // Promote language to top-level for quick filtering
      ...(processedDocument.language ? { language: processedDocument.language } : {}),
    };

    // Update the document in Firestore with AI results
    await updateDocument(documentId, updateData);

    // Create final document object
    const finalDocument: Document = {
      ...initialDocument,
      ...updateData,
      id: documentId,
      firestoreId: documentId,
      uploadedAt: initialDocument.uploadedAt,
      lastModified: new Date(),
    };

    // Final progress update
    currentProgress = 100;
    if (onProgress) {
      onProgress({ progress: currentProgress, snapshot: null });
    }

    onAIProgress?.('completed', 100);
    console.log('🎉 Optimized AI-enhanced document upload completed successfully!');

    return finalDocument;
  } catch (error) {
    console.error('❌ Error in optimized AI-enhanced upload:', error);

    // If everything fails, try basic upload as fallback
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
 * Reprocess existing documents with new AI
 */
export const reprocessDocumentsWithNewAI = async (
  documents: Document[]
): Promise<any> => {
  try {
    console.log(`🔄 Reprocessing ${documents.length} documents with new AI...`);
    console.log(
      'Documents to reprocess:',
      documents.map(doc => ({ name: doc.name, url: doc.url }))
    );

    const documentUrls = documents.map(doc => doc.url);
    console.log('Document URLs:', documentUrls);

    const response = await fetch(
      'https://us-central1-gpt1-77ce0.cloudfunctions.net/reprocessDocuments',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentUrls,
        }),
      }
    );

    console.log(
      'Reprocessing response status:',
      response.status,
      response.statusText
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Reprocessing error response:', errorText);
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      } catch (parseError) {
        throw new Error(
          `HTTP ${response.status}: ${response.statusText} - ${errorText}`
        );
      }
    }

    const result = await response.json();
    console.log('✅ Batch reprocessing completed:', result);

    // Log individual classification results for debugging
    result.results?.forEach((r: any, index: number) => {
      console.log(`Classification result ${index}:`, {
        success: r.success,
        documentUrl: r.documentUrl,
        category: r.classification?.category,
        suggestedName: r.classification?.suggestedName,
        extractedDates: r.classification?.extractedDates,
        tags: r.classification?.tags,
      });
    });

    // Update Firestore documents with new classifications
    const updatePromises = result.results
      .filter((r: any) => r.success)
      .map(async (r: any) => {
        const document = documents.find(doc => doc.url === r.documentUrl);
        if (document && document.firestoreId) {
          const docRef = doc(db, `documents/${document.firestoreId}`);
          // Prepare update data, filtering out undefined values
          const updateData: any = {
            category: r.classification.category || 'personal',
            tags: r.classification.tags || ['document'],
            'metadata.aiReprocessed': true,
            'metadata.reprocessedAt': new Date(),
          };

          // Only add fields if they have valid values
          if (r.classification.suggestedName) {
            updateData['metadata.suggestedName'] =
              r.classification.suggestedName;
            updateData.name = `${r.classification.suggestedName}.pdf`;
          }

          if (
            r.classification.extractedDates &&
            r.classification.extractedDates.length > 0
          ) {
            updateData['metadata.extractedDates'] =
              r.classification.extractedDates;
          }

          console.log('Updating document with data:', updateData);
          await updateDoc(docRef, updateData);
          console.log(
            `✅ Updated Firestore for: ${document.name} -> ${r.classification.category}`
          );
        }
      });

    await Promise.all(updatePromises);
    return result;
  } catch (error) {
    console.error('❌ Error reprocessing documents:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type',
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
export const deleteDocument = async (
  documentId: string,
  firestoreId?: string
): Promise<void> => {
  try {
    // Validate that we have a proper Firestore document ID
    if (!firestoreId || firestoreId === '') {
      console.error('❌ Cannot delete document: Missing or empty Firestore ID');
      throw new Error(
        'Cannot delete document: Missing document ID in database'
      );
    }

    console.log(
      '🗑️ Starting document deletion for ID:',
      documentId,
      'Firestore ID:',
      firestoreId
    );

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
            const fileName =
              documentData.path.split('/').pop() || documentData.name;
            const alternativePath = `documents/${documentData.userId}/${fileName}`;

            const alternativeRef = ref(storage, alternativePath);
            await deleteObject(alternativeRef);
            console.log(
              '✅ Storage object deleted successfully using alternative path:',
              alternativePath
            );
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
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Connection health check removed - Firebase handles reconnection automatically

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
      lastError = error as Error;
      console.warn(
        `📄 getDocuments attempt ${attempt}/${maxRetries} failed:`,
        error
      );

      // Try to recover from network errors
      const recovered = await recoverFromNetworkError(error);
      if (recovered && attempt < maxRetries) {
        console.log(
          `✅ Network recovered, retrying getDocuments (attempt ${attempt + 1})`
        );
        continue;
      }

      // If this is the last attempt or recovery failed, throw the error
      if (attempt === maxRetries) {
        console.error('❌ getDocuments failed after all retry attempts');
        throw lastError;
      }

      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw lastError || new Error('getDocuments failed for unknown reason');
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

/**
 * Clean up orphaned temporary files for a user
 * This function removes temp files that were left behind due to failed AI processing
 */
export const cleanupOrphanedTempFiles = async (
  userId: string
): Promise<{
  deletedCount: number;
  errors: string[];
}> => {
  const result = {
    deletedCount: 0,
    errors: [] as string[],
  };

  try {
    console.log(
      `🧹 Starting cleanup of orphaned temp files for user: ${userId}`
    );

    // List all files in the temp folder for this user
    const tempRef = ref(storage, `temp/${userId}`);
    const listResult = await listAll(tempRef);

    console.log(`📁 Found ${listResult.items.length} temp files to check`);

    // Delete each temp file
    for (const itemRef of listResult.items) {
      try {
        await deleteObject(itemRef);
        result.deletedCount++;
        console.log(`✅ Deleted temp file: ${itemRef.name}`);
      } catch (deleteError: any) {
        const errorMsg = `Failed to delete ${itemRef.name}: ${deleteError.message}`;
        result.errors.push(errorMsg);
        console.warn(`⚠️ ${errorMsg}`);
      }
    }

    console.log(
      `🎉 Cleanup completed: ${result.deletedCount} files deleted, ${result.errors.length} errors`
    );
  } catch (error: any) {
    const errorMsg = `Failed to list temp files: ${error.message}`;
    result.errors.push(errorMsg);
    console.error(`❌ ${errorMsg}`);
  }

  return result;
};

/**
 * Clean up all orphaned temporary files (admin function)
 * This function removes all temp files across all users
 */
export const cleanupAllOrphanedTempFiles = async (): Promise<{
  deletedCount: number;
  errors: string[];
}> => {
  const result = {
    deletedCount: 0,
    errors: [] as string[],
  };

  try {
    console.log('🧹 Starting cleanup of ALL orphaned temp files');

    // List all files in the temp folder
    const tempRef = ref(storage, 'temp');
    const listResult = await listAll(tempRef);

    console.log(`📁 Found ${listResult.items.length} temp files to check`);

    // Delete each temp file
    for (const itemRef of listResult.items) {
      try {
        await deleteObject(itemRef);
        result.deletedCount++;
        console.log(`✅ Deleted temp file: ${itemRef.name}`);
      } catch (deleteError: any) {
        const errorMsg = `Failed to delete ${itemRef.name}: ${deleteError.message}`;
        result.errors.push(errorMsg);
        console.warn(`⚠️ ${errorMsg}`);
      }
    }

    console.log(
      `🎉 Global cleanup completed: ${result.deletedCount} files deleted, ${result.errors.length} errors`
    );
  } catch (error: any) {
    const errorMsg = `Failed to list temp files: ${error.message}`;
    result.errors.push(errorMsg);
    console.error(`❌ ${errorMsg}`);
  }

  return result;
};

/**
 * Improve categorization for existing documents with poor categories
 * This function reprocesses documents that have generic categories like "document" or "personal"
 */
export const improveDocumentCategories = async (
  userId: string,
  onProgress?: (processed: number, total: number, currentDoc?: string) => void
): Promise<{
  processed: number;
  improved: number;
  errors: string[];
}> => {
  const result = {
    processed: 0,
    improved: 0,
    errors: [] as string[],
  };

  try {
    console.log('🔧 Starting category improvement for user:', userId);

    // Get all documents for the user
    const documents = await getUserDocuments(userId);
    console.log(`📄 Found ${documents.length} documents to check`);

    // Enhanced category normalization function (same as in classificationService)
    const normalizeCategory = (
      rawCategory: string | undefined,
      text: string,
      fileName?: string,
      fileType?: string
    ): string => {
      const t = (text || '').toLowerCase();
      const f = (fileName || '').toLowerCase();
      const c = (rawCategory || '').toLowerCase();

      // Enhanced keyword-based categorization
      if (/invoice|receipt|vat|amount due|facture|reçu|total\s*\$|total\s*€|payment|bill|statement/.test(t)) {
        return 'Finance';
      }
      if (/contract|agreement|terms|signature|law|attorney|legal|clause|settlement|court/.test(t)) {
        return 'Legal';
      }
      if (/hospital|clinic|doctor|prescription|diagnosis|medical|healthcare|medication|health|patient/.test(t)) {
        return 'Medical';
      }
      if (/certificate|certificat|attestation|diploma|universit[eé]|school|course|degree|transcript|graduation/.test(t)) {
        return 'Education';
      }
      if (/passport|visa|boarding pass|itinerary|booking|hotel|flight|travel|trip/.test(t)) {
        return 'Travel';
      }
      if (/insurance|policy|claim|premium|coverage|auto|car|home|life/.test(t)) {
        return 'Insurance';
      }
      if (/tax|irs|income|deduction|return|w2|1099|filing/.test(t)) {
        return 'Tax';
      }
      if (/bank|account|statement|balance|transaction|credit|debit|loan/.test(t)) {
        return 'Banking';
      }
      if (/employment|job|work|resume|cv|application|interview|salary|payroll/.test(t)) {
        return 'Employment';
      }
      if (/utility|electric|water|gas|phone|cable|internet|service/.test(t)) {
        return 'Utilities';
      }
      if (/real estate|property|lease|rent|mortgage|deed|title|house|apartment/.test(t)) {
        return 'Real Estate';
      }
      if (/warranty|manual|instruction|guide|technical|specification/.test(t)) {
        return 'Technical';
      }
      if (/photo|image|picture|scan|screenshot|screenshot/.test(f) || /jpg|jpeg|png|gif|bmp|tiff/.test(f)) {
        return 'Photos';
      }

      // Language-specific document detection
      if (/уверение|certificate|attestation/i.test(t) || /mk_|macedonian|македонски/i.test(f)) {
        return 'Certificates';
      }
      if (/français|francais|french|fr_/i.test(t) || /fr_|francais|français/i.test(f)) {
        return 'French Documents';
      }

      // If AI already proposed a meaningful category, keep it (but capitalize properly)
      if (c && !['document', 'personal', 'unknown', 'other', 'misc', 'miscellaneous'].includes(c)) {
        return c.charAt(0).toUpperCase() + c.slice(1);
      }

      // Enhanced fallback based on file type and content
      if (fileType?.includes('image/')) {
        return 'Photos';
      }
      if (fileType?.includes('pdf') && t.length < 100) {
        return 'Scanned Documents';
      }
      if (t.length > 500) {
        return 'Text Documents';
      }

      // Default fallback - use "Personal" instead of generic "document"
      return 'Personal';
    };

    // Process each document
    for (const doc of documents) {
      try {
        result.processed++;
        onProgress?.(result.processed, documents.length, doc.name);

        const currentCategory = doc.category?.toLowerCase() || '';
        
        // Check if document needs category improvement
        const needsImprovement = 
          !doc.category || 
          ['document', 'personal', 'unknown', 'other', 'misc', 'miscellaneous'].includes(currentCategory) ||
          currentCategory === '';

        if (!needsImprovement) {
          console.log(`✅ Document "${doc.name}" already has good category: ${doc.category}`);
          continue;
        }

        // Extract text from metadata if available
        const extractedText = doc.metadata?.textExtraction?.extractedText || 
                             doc.metadata?.summary || 
                             '';

        // Apply improved categorization
        const improvedCategory = normalizeCategory(
          doc.category,
          extractedText,
          doc.name,
          doc.type
        );

        // Generate improved tags
        const generateImprovedTags = (category: string, fileType: string, extractedText: string): string[] => {
          const tags: string[] = [];
          const currentYear = new Date().getFullYear().toString();
          
          // Add base tags
          tags.push(currentYear, 'this-year', 'processed', 'improved');
          
          // Add category-based tags
          const categoryLower = category.toLowerCase();
          if (categoryLower.includes('finance')) tags.push('financial', 'statement');
          if (categoryLower.includes('legal')) tags.push('legal', 'contract');
          if (categoryLower.includes('medical')) tags.push('medical', 'health');
          if (categoryLower.includes('education')) tags.push('education', 'certificate');
          if (categoryLower.includes('travel')) tags.push('travel', 'important');
          if (categoryLower.includes('insurance')) tags.push('insurance', 'important');
          if (categoryLower.includes('tax')) tags.push('tax', 'important');
          
          // Add file type tags
          if (fileType.includes('image/')) tags.push('image-only');
          if (fileType.includes('pdf')) tags.push('pdf');
          
          // Add content-based tags
          if (extractedText && extractedText.length > 500) tags.push('text-heavy');
          if (extractedText && extractedText.length < 100) tags.push('scanned');
          
          return tags;
        };

        const improvedTags = generateImprovedTags(improvedCategory, doc.type, extractedText);

        // Only update if we got a better category or better tags
        if (improvedCategory !== doc.category || improvedTags.length > (doc.tags?.length || 0)) {
          console.log(`🔄 Improving category and tags for "${doc.name}": ${doc.category} → ${improvedCategory}`);
          
          // Update the document in Firestore
          if (doc.firestoreId) {
            await updateDocument(doc.firestoreId, {
              category: improvedCategory,
              tags: improvedTags,
              metadata: {
                ...doc.metadata,
                categoryImprovedAt: new Date().toISOString(),
                originalCategory: doc.category,
                improvedCategory: improvedCategory,
                originalTags: doc.tags,
                improvedTags: improvedTags,
              },
            });
            result.improved++;
            console.log(`✅ Updated category and tags for "${doc.name}" to: ${improvedCategory}`);
          } else {
            console.warn(`⚠️ Document "${doc.name}" missing Firestore ID, skipping update`);
          }
        } else {
          console.log(`ℹ️ No improvement needed for "${doc.name}" (category: ${improvedCategory})`);
        }

        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error: any) {
        const errorMsg = `Failed to improve category for "${doc.name}": ${error.message}`;
        result.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    console.log(
      `🎉 Category improvement completed: ${result.improved}/${result.processed} documents improved, ${result.errors.length} errors`
    );

  } catch (error: any) {
    const errorMsg = `Category improvement failed: ${error.message}`;
    result.errors.push(errorMsg);
    console.error(`❌ ${errorMsg}`);
  }

  return result;
};
