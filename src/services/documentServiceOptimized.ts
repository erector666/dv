import {
  collection,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import { db, storage } from './firebase';
import { processDocumentFast } from './classificationServiceFast';
import jsPDF from 'jspdf';
import { Document, DocumentUploadProgress, updateDocument } from './documentService';

/**
 * Optimized document upload with single upload and fast AI processing
 * Target: < 10 seconds total upload time with single upload
 */
export const uploadDocumentOptimized = async (
  file: File,
  userId: string,
  category?: string,
  tags?: string[],
  metadata?: any,
  onProgress?: (progress: DocumentUploadProgress) => void,
  onAIProgress?: (stage: string, progress: number) => void
): Promise<Document> => {
  try {
    console.log('🚀 Starting SINGLE-UPLOAD optimized upload for:', file.name);
    const startTime = Date.now();
    let currentProgress = 0;

    // Step 1: Convert to PDF if needed (before upload)
    onAIProgress?.('converting', 5);
    let pdfFile = file;
    const originalType = file.type;
    
    if (!file.type.includes('pdf')) {
      if (file.type.startsWith('image/')) {
        pdfFile = await convertImageToPdf(file);
      } else if (file.type.includes('text') || file.type.includes('document')) {
        pdfFile = await convertDocumentToPdf(file);
      }
    }

    // Update progress after conversion
    currentProgress = Math.max(currentProgress, 10);
    if (onProgress) {
      onProgress({ progress: currentProgress, snapshot: null });
    }

    // Step 2: Single upload directly to permanent storage
    onAIProgress?.('uploading', 15);
    const storageRef = ref(
      storage,
      `documents/${userId}/${Date.now()}_${pdfFile.name}`
    );

    const uploadTask = uploadBytesResumable(storageRef, pdfFile);
    
    // Upload with smooth progress tracking (15-60% for upload)
    const downloadURL = await new Promise<string>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        snapshot => {
          const uploadProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          // Smooth progress: 15-60% for upload
          const newProgress = 15 + (uploadProgress * 0.45);
          if (onProgress && newProgress > currentProgress) {
            currentProgress = Math.max(currentProgress, newProgress);
            onProgress({ progress: currentProgress, snapshot });
          }
        },
        error => reject(error),
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          currentProgress = Math.max(currentProgress, 60); // Ensure we're at 60%
          resolve(url);
        }
      );
    });

    console.log('✅ File uploaded to permanent storage:', downloadURL);

    // Step 3: Create initial document record
    onAIProgress?.('creating_record', 65);
    const initialDocument = {
      name: pdfFile.name,
      type: pdfFile.type,
      size: pdfFile.size,
      url: downloadURL,
      path: storageRef.fullPath,
      userId,
      category: category || 'uncategorized',
      tags: tags || [],
      uploadedAt: serverTimestamp(),
      lastModified: serverTimestamp(),
      status: 'processing' as const,
      metadata: {
        ...metadata,
        originalFileType: originalType,
        convertedToPdf: originalType !== 'application/pdf',
        originalFileName: file.name,
        aiProcessed: false,
      },
    };

    const docRef = await addDoc(collection(db, 'documents'), initialDocument);
    const documentId = docRef.id;

    // Update progress after document creation
    currentProgress = Math.max(currentProgress, 70);
    if (onProgress) {
      onProgress({ progress: currentProgress, snapshot: null });
    }

    // Step 4: Fast AI processing using permanent URL
    onAIProgress?.('ai_processing', 75);
    
    // Create document object for AI processing using permanent URL
    const documentForAI: Document = {
      id: documentId,
      firestoreId: documentId,
      name: pdfFile.name,
      type: originalType, // Use original type for better AI processing
      size: file.size,
      url: downloadURL, // Use permanent URL
      path: storageRef.fullPath,
      userId,
      category: category || 'uncategorized',
      tags: tags || [],
      uploadedAt: new Date(),
      lastModified: new Date(),
      metadata: metadata || {},
    };

    // Use optimized fast AI processing
    let aiEnhancedDocument = documentForAI;
    try {
      aiEnhancedDocument = await processDocumentFast(documentForAI);
      onAIProgress?.('ai_completed', 85);
      // Update progress after AI completion
      currentProgress = Math.max(currentProgress, 85);
      if (onProgress) {
        onProgress({ progress: currentProgress, snapshot: null });
      }
    } catch (aiError) {
      console.warn('⚠️ Fast AI processing failed, using basic document:', aiError);
      // Continue without AI enhancement
      currentProgress = Math.max(currentProgress, 85);
      if (onProgress) {
        onProgress({ progress: currentProgress, snapshot: null });
      }
    }

    // Step 5: Update document with AI results
    onAIProgress?.('updating_metadata', 90);
    const aiSuggestedName = aiEnhancedDocument.suggestedName || aiEnhancedDocument.metadata?.suggestedName;
    const sanitizeFileName = (name: string) => name.replace(/[\\/:*?"<>|]/g, '').trim();
    const finalName = aiSuggestedName ? `${sanitizeFileName(aiSuggestedName)}.pdf` : pdfFile.name;

    const updateData: Partial<Document> = {
      name: finalName,
      status: 'ready' as const,
      category: aiEnhancedDocument.category || category || 'uncategorized',
      tags: Array.from(new Set([
        ...(aiEnhancedDocument.tags || []),
        ...(tags || []),
        aiEnhancedDocument.language ? `lang:${aiEnhancedDocument.language}` : '',
        new Date().getFullYear().toString(),
        'this-year',
        'processed',
        'ai-enhanced'
      ])).filter(Boolean) as string[],
      metadata: {
        ...metadata,
        ...aiEnhancedDocument.metadata,
        originalFileType: originalType,
        convertedToPdf: originalType !== 'application/pdf',
        originalFileName: file.name,
        aiProcessingCompleted: serverTimestamp(),
        aiProcessed: true,
      },
      lastModified: serverTimestamp(),
      ...(aiEnhancedDocument.language ? { language: aiEnhancedDocument.language } : {}),
    };

    // Update the document in Firestore using the existing updateDocument function
    await updateDocument(documentId, updateData);

    // Create final document object
    const finalDocument: Document = {
      ...initialDocument,
      ...updateData,
      id: documentId,
      firestoreId: documentId,
      uploadedAt: initialDocument.uploadedAt,
      status: 'ready' as const, // Ensure status is properly typed
    };

    // Final progress update
    currentProgress = 100;
    if (onProgress) {
      onProgress({ progress: currentProgress, snapshot: null });
    }

    const elapsed = Date.now() - startTime;
    console.log(`✅ SINGLE-UPLOAD optimized upload completed in ${(elapsed/1000).toFixed(1)}s`);
    onAIProgress?.('completed', 100);

    return finalDocument;
  } catch (error) {
    console.error('❌ Optimized single-upload error:', error);
    throw error;
  }
};

// Reuse existing conversion functions
const convertImageToPdf = async (imageFile: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      try {
        const pdf = new jsPDF({
          orientation: img.width > img.height ? 'l' : 'p',
          unit: 'px',
          format: [img.width, img.height],
        });

        const imgWidth = img.width;
        const imgHeight = img.height;
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        const scaleX = pageWidth / imgWidth;
        const scaleY = pageHeight / imgHeight;
        const scale = Math.min(scaleX, scaleY) * 0.9;

        const scaledWidth = imgWidth * scale;
        const scaledHeight = imgHeight * scale;
        const x = (pageWidth - scaledWidth) / 2;
        const y = (pageHeight - scaledHeight) / 2;

        canvas.width = imgWidth;
        canvas.height = imgHeight;
        ctx?.drawImage(img, 0, 0);
        const imgData = canvas.toDataURL('image/jpeg', 0.8);

        pdf.addImage(imgData, 'JPEG', x, y, scaledWidth, scaledHeight);

        const pdfBlob = pdf.output('blob');
        const pdfFile = new File(
          [pdfBlob],
          imageFile.name.replace(/\.[^/.]+$/, '.pdf'),
          { type: 'application/pdf' }
        );

        resolve(pdfFile);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(imageFile);
  });
};

const convertDocumentToPdf = async (docFile: File): Promise<File> => {
  try {
    if (docFile.type.includes('text') || docFile.type.includes('document')) {
      const text = await docFile.text();
      const pdf = new jsPDF('p', 'mm', 'a4');

      pdf.setFont('helvetica');
      pdf.setFontSize(12);

      const pageWidth = pdf.internal.pageSize.getWidth() - 20;
      const lines = pdf.splitTextToSize(text, pageWidth);

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
        { type: 'application/pdf' }
      );

      return pdfFile;
    }
    return docFile;
  } catch (error) {
    console.error('Error converting document to PDF:', error);
    return docFile;
  }
};