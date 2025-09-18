// Lazy loader for OpenCV.js to keep bundle size small and load on demand
// Loads from official OpenCV CDN and resolves when cv is ready.

let opencvLoadingPromise: Promise<any> | null = null;

export const loadOpenCv = (): Promise<any> => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('OpenCV can only be loaded in the browser'));
  }

  if ((window as any).cv) {
    return Promise.resolve((window as any).cv);
  }

  if (opencvLoadingPromise) {
    return opencvLoadingPromise;
  }

  opencvLoadingPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-opencv]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve((window as any).cv));
      existing.addEventListener('error', () => reject(new Error('Failed to load OpenCV.js')));
      return;
    }

    const script = document.createElement('script');
    script.setAttribute('data-opencv', 'true');
    // Use a pinned version for stability; can be adjusted if needed
    script.src = 'https://docs.opencv.org/4.x/opencv.js';
    script.async = true;

    const handleReady = () => {
      const cv = (window as any).cv;
      if (!cv) {
        reject(new Error('OpenCV loaded but window.cv is undefined'));
        return;
      }
      // If OpenCV requires onRuntimeInitialized, wait for it
      if (cv['onRuntimeInitialized']) {
        const prev = cv['onRuntimeInitialized'];
        cv['onRuntimeInitialized'] = () => {
          try {
            if (typeof prev === 'function') prev();
          } catch {}
          resolve(cv);
        };
      } else {
        resolve(cv);
      }
    };

    script.onload = handleReady;
    script.onerror = () => reject(new Error('Failed to load OpenCV.js'));

    document.body.appendChild(script);
  });

  return opencvLoadingPromise;
};

export default loadOpenCv;
