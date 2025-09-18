import {
  collection,
  addDoc,
  updateDoc,
  doc,
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
import { Document, DocumentUploadProgress } from './documentService';

/**
 * Optimized document upload with faster AI processing
 * Target: < 15 seconds total upload time
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
    console.log('🚀 Starting OPTIMIZED upload for:', file.name);
    const startTime = Date.now();

    // Step 1: Convert to PDF if needed (keep as-is, already optimized)
    onAIProgress?.('converting', 10);
    let pdfFile = file;
    const originalType = file.type;
    
    if (!file.type.includes('pdf')) {
      if (file.type.startsWith('image/')) {
        pdfFile = await convertImageToPdf(file);
      } else if (file.type.includes('text') || file.type.includes('document')) {
        pdfFile = await convertDocumentToPdf(file);
      }
    }

    // Step 2: Upload directly to permanent storage (skip temp upload)
    onAIProgress?.('uploading', 20);
    const storageRef = ref(
      storage,
      `documents/${userId}/${Date.now()}_${pdfFile.name}`
    );

    const uploadTask = uploadBytesResumable(storageRef, pdfFile);
    
    // Upload with progress tracking
    const downloadURL = await new Promise<string>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        snapshot => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) {
            onProgress({ progress: progress * 0.5, snapshot }); // 0-50% for upload
          }
        },
        error => reject(error),
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        }
      );
    });

    // Step 3: Fast AI processing (single AI, no retries, shorter timeout)
    onAIProgress?.('ai_processing', 50);
    
    // Create document object for AI processing
    const tempDocument: Document = {
      id: '',
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
      metadata: metadata || {},
    };

    // Use optimized fast AI processing
    let aiEnhancedDocument = tempDocument;
    try {
      aiEnhancedDocument = await processDocumentFast(tempDocument);
      onAIProgress?.('ai_completed', 80);
    } catch (aiError) {
      console.warn('⚠️ Fast AI processing failed, using basic document:', aiError);
      // Continue without AI enhancement
    }

    // Step 4: Save to Firestore
    onAIProgress?.('saving', 90);
    const docData = {
      ...aiEnhancedDocument,
      id: undefined, // Remove id before saving
      uploadedAt: serverTimestamp(),
      lastModified: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'documents'), docData);
    
    const finalDocument: Document = {
      ...aiEnhancedDocument,
      id: docRef.id,
      firestoreId: docRef.id,
    };

    const elapsed = Date.now() - startTime;
    console.log(`✅ OPTIMIZED upload completed in ${(elapsed/1000).toFixed(1)}s`);
    onAIProgress?.('completed', 100);

    return finalDocument;
  } catch (error) {
    console.error('❌ Optimized upload error:', error);
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