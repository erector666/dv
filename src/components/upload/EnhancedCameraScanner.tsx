import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface EnhancedCameraScannerProps {
  onClose: () => void;
  onCapture: (file: File) => void;
  inline?: boolean;
  maxPhotos?: number;
}

interface CapturedPhoto {
  id: string;
  file: File;
  dataUrl: string;
  timestamp: number;
}

const constraints: MediaStreamConstraints = {
  video: {
    facingMode: 'environment',
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
  audio: false,
};

const EnhancedCameraScanner: React.FC<EnhancedCameraScannerProps> = ({ 
  onClose, 
  onCapture, 
  inline = false,
  maxPhotos = 10 
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isCameraLoading, setIsCameraLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [currentFacingMode, setCurrentFacingMode] = useState<'user' | 'environment'>('environment');
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [gridEnabled, setGridEnabled] = useState(true);

  // Initialize camera
  const initCamera = useCallback(async (facingMode: 'user' | 'environment' = 'environment') => {
    try {
      setIsCameraLoading(true);
      setError(null);

      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      const videoEl = videoRef.current;
      
      if (videoEl) {
        videoEl.srcObject = stream;
        videoEl.onloadedmetadata = () => {
          setIsCameraLoading(false);
        };
        await videoEl.play();
      }
    } catch (e: any) {
      console.error('Camera init error:', e);
      setError(e?.message || 'Unable to access camera');
      setIsCameraLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    initCamera(currentFacingMode);
    
    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [initCamera, currentFacingMode]);

  const handleCapture = useCallback(async () => {
    if (!canvasRef.current || !videoRef.current || isCapturing) return;
    
    setIsCapturing(true);
    
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      // Set canvas size to video size
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Apply flash effect if enabled
      if (flashEnabled) {
        const flashOverlay = document.createElement('div');
        flashOverlay.className = 'fixed inset-0 bg-white z-50 pointer-events-none';
        document.body.appendChild(flashOverlay);
        setTimeout(() => document.body.removeChild(flashOverlay), 200);
      }
      
      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to blob with high quality
      const blob = await new Promise<Blob | null>(resolve => 
        canvas.toBlob(resolve, 'image/jpeg', 0.9)
      );
      
      if (!blob) return;
      
      const id = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const file = new File([blob], `${id}.jpg`, { type: 'image/jpeg' });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      
      const photo: CapturedPhoto = {
        id,
        file,
        dataUrl,
        timestamp: Date.now(),
      };
      
      setCapturedPhotos(prev => {
        const newPhotos = [photo, ...prev];
        // Limit to maxPhotos
        return newPhotos.slice(0, maxPhotos);
      });
      
      // Auto-show preview for first photo
      if (capturedPhotos.length === 0) {
        setShowPreview(true);
      }
      
    } catch (error) {
      console.error('Capture failed:', error);
      setError('Failed to capture photo');
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, flashEnabled, capturedPhotos.length, maxPhotos]);

  const handleRetake = useCallback((photoId: string) => {
    setCapturedPhotos(prev => prev.filter(p => p.id !== photoId));
  }, []);

  const handleUsePhoto = useCallback((photo: CapturedPhoto) => {
    onCapture(photo.file);
    if (!inline) {
      onClose();
    }
  }, [onCapture, onClose, inline]);

  const handleUseAllPhotos = useCallback(() => {
    capturedPhotos.forEach(photo => onCapture(photo.file));
    if (!inline) {
      onClose();
    } else {
      setCapturedPhotos([]);
      setShowPreview(false);
    }
  }, [capturedPhotos, onCapture, onClose, inline]);

  const toggleCamera = useCallback(() => {
    const newFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    setCurrentFacingMode(newFacingMode);
  }, [currentFacingMode]);

  const clearAllPhotos = useCallback(() => {
    setCapturedPhotos([]);
    setShowPreview(false);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleCapture();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setFlashEnabled(prev => !prev);
      } else if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        setGridEnabled(prev => !prev);
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        toggleCamera();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handleCapture, onClose, toggleCamera]);

  const CameraInterface = () => (
    <div className={`relative ${inline ? 'rounded-xl overflow-hidden' : ''} bg-black`}>
      {/* Video Feed */}
      <div className="relative">
        <video 
          ref={videoRef} 
          className={`w-full ${inline ? 'max-h-80' : 'max-h-[70vh]'} object-cover`}
          playsInline 
          muted 
        />
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Loading State */}
        {isCameraLoading && (
          <div className="absolute inset-0 flex items-center justify-center text-white bg-black bg-opacity-70">
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"
              />
              <div>Loading camera...</div>
            </div>
          </div>
        )}
        
        {/* Error State */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-red-200 bg-black bg-opacity-70">
            <div className="text-center">
              <div className="text-4xl mb-2">📷</div>
              <div>{error}</div>
            </div>
          </div>
        )}
        
        {/* Grid Overlay */}
        {gridEnabled && !isCameraLoading && !error && (
          <div className="absolute inset-0 pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <pattern id="grid" width="33.33" height="33.33" patternUnits="userSpaceOnUse">
                  <path d="M 33.33 0 L 33.33 33.33 M 0 33.33 L 33.33 33.33" 
                        fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#grid)" />
            </svg>
          </div>
        )}
        
        {/* Document Guide */}
        {!isCameraLoading && !error && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="border-2 border-blue-400 border-dashed rounded-lg w-4/5 h-3/5 opacity-60"
            />
          </div>
        )}
        
        {/* Camera Controls Overlay */}
        {!isCameraLoading && !error && (
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
            <div className="flex space-x-2">
              <button
                onClick={() => setFlashEnabled(!flashEnabled)}
                className={`p-2 rounded-full ${flashEnabled ? 'bg-yellow-500' : 'bg-black bg-opacity-50'} text-white`}
                title={`Flash ${flashEnabled ? 'on' : 'off'}`}
              >
                {flashEnabled ? '⚡' : '🔦'}
              </button>
              <button
                onClick={() => setGridEnabled(!gridEnabled)}
                className={`p-2 rounded-full ${gridEnabled ? 'bg-blue-500' : 'bg-black bg-opacity-50'} text-white`}
                title={`Grid ${gridEnabled ? 'on' : 'off'}`}
              >
                ⊞
              </button>
            </div>
            <button
              onClick={toggleCamera}
              className="p-2 rounded-full bg-black bg-opacity-50 text-white"
              title="Switch camera"
            >
              🔄
            </button>
          </div>
        )}
      </div>
      
      {/* Camera Controls */}
      <div className="flex items-center justify-between p-4 bg-gray-900 text-white">
        <div className="text-sm">
          <div>📱 {currentFacingMode === 'environment' ? 'Back' : 'Front'} Camera</div>
          <div className="text-xs text-gray-400 mt-1">
            Space/Enter: Capture • F: Flash • G: Grid • C: Switch
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Photo Count */}
          {capturedPhotos.length > 0 && (
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center space-x-2 px-3 py-1 bg-blue-600 rounded-full text-sm"
            >
              <span>📸</span>
              <span>{capturedPhotos.length}</span>
            </button>
          )}
          
          {/* Capture Button */}
          <motion.button
            onClick={handleCapture}
            disabled={isCameraLoading || error || isCapturing}
            whileTap={{ scale: 0.95 }}
            className={`w-16 h-16 rounded-full border-4 border-white ${
              isCapturing ? 'bg-red-500' : 'bg-transparent'
            } ${isCameraLoading || error ? 'opacity-50' : 'hover:bg-white hover:bg-opacity-20'} 
            transition-all duration-200 flex items-center justify-center`}
          >
            {isCapturing ? (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.3 }}
                className="w-8 h-8 bg-white rounded-full"
              />
            ) : (
              <div className="w-12 h-12 bg-white rounded-full" />
            )}
          </motion.button>
          
          {/* Close Button */}
          {!inline && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const PhotoPreview = () => (
    <AnimatePresence>
      {showPreview && capturedPhotos.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              📸 Captured Photos ({capturedPhotos.length})
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={handleUseAllPhotos}
                className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
              >
                ✅ Use All ({capturedPhotos.length})
              </button>
              <button
                onClick={clearAllPhotos}
                className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
              >
                🗑️ Clear All
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-64 overflow-y-auto">
            {capturedPhotos.map((photo) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative group bg-white dark:bg-gray-700 rounded-lg overflow-hidden shadow-md"
              >
                <img
                  src={photo.dataUrl}
                  alt={`Captured photo ${photo.id}`}
                  className="w-full h-24 object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
                    <button
                      onClick={() => handleUsePhoto(photo)}
                      className="p-1 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
                      title="Use this photo"
                    >
                      ✅
                    </button>
                    <button
                      onClick={() => handleRetake(photo.id)}
                      className="p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                      title="Delete this photo"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="absolute top-1 right-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                  {new Date(photo.timestamp).toLocaleTimeString()}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (inline) {
    return (
      <div className="space-y-4">
        <CameraInterface />
        <PhotoPreview />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
      <div className="w-full max-w-4xl mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              📷 Document Scanner
            </h3>
            <button 
              onClick={onClose} 
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl"
            >
              ✕
            </button>
          </div>
          <CameraInterface />
          <PhotoPreview />
        </div>
      </div>
    </div>
  );
};

export default EnhancedCameraScanner;