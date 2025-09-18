import React, { useEffect, useRef, useState } from 'react';

interface CameraScannerProps {
	onClose: () => void;
	onCapture: (file: File) => void;
}

const constraints: MediaStreamConstraints = {
	video: {
		facingMode: 'environment',
		width: { ideal: 1280 },
		height: { ideal: 720 },
	},
	audio: false,
};

const CameraScanner: React.FC<CameraScannerProps> = ({ onClose, onCapture }) => {
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const [isCameraLoading, setIsCameraLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				// Request camera
				streamRef.current = await navigator.mediaDevices.getUserMedia(constraints);
				if (!mounted) return;
				const videoEl = videoRef.current;
				if (videoEl) {
					videoEl.srcObject = streamRef.current;
					// Wait for video to be ready
					videoEl.onloadedmetadata = () => {
						if (!mounted) return;
						setIsCameraLoading(false);
					};
					await videoEl.play();
				}
			} catch (e: any) {
				console.error('Camera init error:', e);
				setError(e?.message || 'Unable to access camera');
				setIsCameraLoading(false);
			}
		})();
		return () => {
			mounted = false;
			const v = videoRef.current;
			if (v) {
				v.pause();
				v.srcObject = null;
			}
			if (streamRef.current) {
				streamRef.current.getTracks().forEach(t => t.stop());
				streamRef.current = null;
			}
		};
	}, []);

	const handleCapture = async () => {
		try {
			if (!canvasRef.current || !videoRef.current) return;
			const canvas = canvasRef.current;
			const video = videoRef.current;
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;
			const ctx = canvas.getContext('2d');
			if (!ctx) return;
			ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
			
			// Direct capture without any processing
			const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
			if (!blob) return;
			const file = new File([blob], `scan_${Date.now()}.png`, { type: 'image/png' });
			onCapture(file);
			onClose();
		} catch (e) {
			console.error('Capture failed:', e);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<div className="absolute inset-0 bg-black bg-opacity-70" onClick={onClose}></div>
			<div className="relative bg-white dark:bg-gray-800 w-full max-w-3xl rounded-xl overflow-hidden shadow-2xl z-10">
				<div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
					<h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Scan with Camera</h3>
					<button onClick={onClose} className="text-gray-500 hover:text-gray-700">
						✕
					</button>
				</div>
				<div className="relative bg-black">
					<video ref={videoRef} className="w-full max-h-[70vh] object-contain" playsInline muted />
					<canvas ref={canvasRef} className="hidden"></canvas>
					{isCameraLoading && (
						<div className="absolute inset-0 flex items-center justify-center text-white bg-black">
							<div className="text-center">
								<div className="mb-2">Loading camera...</div>
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
							</div>
						</div>
					)}
					{error && (
						<div className="absolute inset-0 flex items-center justify-center text-red-200 bg-black bg-opacity-70">
							{error}
						</div>
					)}
					{/* Simple guide overlay */}
					{!isCameraLoading && !error && (
						<div className="absolute inset-0 pointer-events-none">
							<div className="absolute inset-8 border-2 border-blue-500 border-dashed rounded-lg opacity-50"></div>
						</div>
					)}
				</div>
				<div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
					<div className="text-xs text-gray-500 dark:text-gray-400">
						Align the document within the frame
					</div>
					<div className="flex items-center space-x-2">
						<button onClick={onClose} className="px-3 py-2 rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200">Cancel</button>
						<button onClick={handleCapture} className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">Capture</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default CameraScanner;