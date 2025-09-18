import React, { useEffect, useRef, useState } from 'react';
import loadOpenCv from '../../utils/opencvLoader';

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
	const overlayRef = useRef<HTMLCanvasElement | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const [isCameraLoading, setIsCameraLoading] = useState(true);
	const [isOpenCvReady, setIsOpenCvReady] = useState(false);
	const [error, setError] = useState<string | null>(null);
	// Store latest detected quadrilateral for perspective correction on capture
	const latestQuadRef = useRef<Array<{ x: number; y: number }>|null>(null);
	const animationRef = useRef<number | null>(null);

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
				// Load OpenCV lazily (don't block camera display)
				loadOpenCv().then(() => {
					if (!mounted) return;
					setIsOpenCvReady(true);
					startEdgeDetection();
				}).catch(err => {
					console.error('OpenCV loading failed:', err);
					// Continue without edge detection
					if (!mounted) return;
					setIsOpenCvReady(false);
				});
			} catch (e: any) {
				console.error('Camera init error:', e);
				setError(e?.message || 'Unable to access camera');
				setIsCameraLoading(false);
			}
		})();
    return () => {
			mounted = false;
			stopEdgeDetection();
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

	const startEdgeDetection = () => {
		if (!(window as any).cv || !videoRef.current || !overlayRef.current || !isOpenCvReady) return;
		const cv = (window as any).cv as any;
		const overlay = overlayRef.current;
		const ctx = overlay.getContext('2d');
		if (!ctx) return;

		// Sync overlay canvas size to video size
		const ensureSizes = () => {
			const v = videoRef.current!;
			const w = v.videoWidth || v.clientWidth || 640;
			const h = v.videoHeight || v.clientHeight || 480;
			if (overlay.width !== w || overlay.height !== h) {
				overlay.width = w;
				overlay.height = h;
			}
		};
		ensureSizes();

		const cap = new cv.VideoCapture(videoRef.current);
		const src = new cv.Mat(overlay.height, overlay.width, cv.CV_8UC4);
		const gray = new cv.Mat();
		const blur = new cv.Mat();
		const edges = new cv.Mat();
		const hierarchy = new cv.Mat();
		const contours = new cv.MatVector();

		const process = () => {
			try {
				ensureSizes();
				cap.read(src);
				cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
				cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0);
				cv.Canny(blur, edges, 75, 200);
				cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
				ctx.clearRect(0, 0, overlay.width, overlay.height);
				ctx.strokeStyle = 'rgba(59, 130, 246, 0.9)';
				ctx.lineWidth = 2;

				let bestQuad: { pts: Array<{ x: number; y: number }>; area: number } | null = null;
				for (let i = 0; i < contours.size(); i++) {
					const contour = contours.get(i);
					const peri = cv.arcLength(contour, true);
					const approx = new cv.Mat();
					cv.approxPolyDP(contour, approx, 0.02 * peri, true);
					if (approx.rows === 4) {
						const area = cv.contourArea(approx);
						if (area > (bestQuad?.area || 0)) {
							const pts: Array<{ x: number; y: number }> = [];
							for (let j = 0; j < 4; j++) {
								const x = approx.intPtr(j, 0)[0];
								const y = approx.intPtr(j, 0)[1];
								pts.push({ x, y });
							}
							bestQuad = { pts, area };
						}
					}
					approx.delete();
				}

				if (bestQuad) {
					latestQuadRef.current = bestQuad.pts;
					ctx.beginPath();
					const p = bestQuad.pts;
					ctx.moveTo(p[0].x, p[0].y);
					for (let k = 1; k < p.length; k++) ctx.lineTo(p[k].x, p[k].y);
					ctx.closePath();
					ctx.stroke();
				} else {
					// Fallback guide rectangle
					const margin = Math.min(overlay.width, overlay.height) * 0.08;
					ctx.strokeRect(margin, margin, overlay.width - margin * 2, overlay.height - margin * 2);
				}
			} catch {}
			animationRef.current = requestAnimationFrame(process);
		};
		process();

		// Cleanup function
		const cleanup = () => {
			try {
				src.delete();
				gray.delete();
				blur.delete();
				edges.delete();
				hierarchy.delete();
				contours.delete();
			} catch {}
		};
		// Store cleanup on ref so we can call on unmount
		(overlayRef.current as any).__cleanup = cleanup;
	};

	const stopEdgeDetection = () => {
		if (animationRef.current) cancelAnimationFrame(animationRef.current);
		animationRef.current = null;
		const overlay = overlayRef.current as any;
		if (overlay && overlay.__cleanup) {
			try { overlay.__cleanup(); } catch {}
			overlay.__cleanup = null;
		}
	};

	const orderQuad = (pts: Array<{ x: number; y: number }>) => {
		// Order points: top-left, top-right, bottom-right, bottom-left
		const sum = pts.map(p => p.x + p.y);
		const diff = pts.map(p => p.y - p.x);
		const tl = pts[sum.indexOf(Math.min(...sum))];
		const br = pts[sum.indexOf(Math.max(...sum))];
		const tr = pts[diff.indexOf(Math.min(...diff))];
		const bl = pts[diff.indexOf(Math.max(...diff))];
		return [tl, tr, br, bl];
	};

	const distance = (a: {x:number;y:number}, b:{x:number;y:number}) => Math.hypot(a.x-b.x, a.y-b.y);

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
			
			// Check if OpenCV is available for advanced processing
			const cv = (window as any).cv;
			if (!cv || !isOpenCvReady) {
				// Fallback: capture without perspective correction
				const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
				if (!blob) return;
				const file = new File([blob], `scan_${Date.now()}.png`, { type: 'image/png' });
				onCapture(file);
				onClose();
				return;
			}
			
			// Read frame into OpenCV matrix
			const src = cv.imread(canvas);
			let processed: any = null;
			if (latestQuadRef.current && latestQuadRef.current.length === 4) {
				const [tl, tr, br, bl] = orderQuad(latestQuadRef.current);
				const widthA = distance(br, bl);
				const widthB = distance(tr, tl);
				const maxWidth = Math.max(widthA, widthB);
				const heightA = distance(tr, br);
				const heightB = distance(tl, bl);
				const maxHeight = Math.max(heightA, heightB);
				const dstSize = new cv.Size(Math.floor(maxWidth), Math.floor(maxHeight));
				const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
					tl.x, tl.y,
					tr.x, tr.y,
					br.x, br.y,
					bl.x, bl.y,
				]);
				const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
					0, 0,
					dstSize.width - 1, 0,
					dstSize.width - 1, dstSize.height - 1,
					0, dstSize.height - 1,
				]);
				const M = cv.getPerspectiveTransform(srcTri, dstTri);
				processed = new cv.Mat();
				cv.warpPerspective(src, processed, M, dstSize, cv.INTER_LINEAR, cv.BORDER_REPLICATE);
				srcTri.delete();
				dstTri.delete();
				M.delete();
			} else {
				processed = src.clone();
			}

			// Convert to grayscale and apply adaptive threshold for OCR-friendly output
			const gray = new cv.Mat();
			cv.cvtColor(processed, gray, cv.COLOR_RGBA2GRAY);
			const thresh = new cv.Mat();
			cv.adaptiveThreshold(gray, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 25, 10);

			// Optional contrast normalization
			const normalized = new cv.Mat();
			cv.normalize(thresh, normalized, 0, 255, cv.NORM_MINMAX);

			// Render to a temp canvas and export as PNG
			const outCanvas = document.createElement('canvas');
			outCanvas.width = normalized.cols;
			outCanvas.height = normalized.rows;
			cv.imshow(outCanvas, normalized);
			const blob = await new Promise<Blob | null>(resolve => outCanvas.toBlob(resolve, 'image/png'));
			// Cleanup mats
			try { src.delete(); } catch {}
			try { processed.delete(); } catch {}
			try { gray.delete(); } catch {}
			try { thresh.delete(); } catch {}
			try { normalized.delete(); } catch {}

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
					<canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none"></canvas>
					<canvas ref={canvasRef} className="hidden"></canvas>
					{isCameraLoading && (
						<div className="absolute inset-0 flex items-center justify-center text-white bg-black">
							<div className="text-center">
								<div className="mb-2">Loading camera...</div>
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
							</div>
						</div>
					)}
					{!isCameraLoading && !isOpenCvReady && (
						<div className="absolute top-2 left-2 text-xs text-yellow-300 bg-black bg-opacity-50 px-2 py-1 rounded">
							Edge detection loading...
						</div>
					)}
					{error && (
						<div className="absolute inset-0 flex items-center justify-center text-red-200 bg-black bg-opacity-70">
							{error}
						</div>
					)}
				</div>
				<div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
					<div className="text-xs text-gray-500 dark:text-gray-400">
						Align the document within the frame; edges will be detected.
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
