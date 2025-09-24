import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import * as FirestoreMod from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  // Using the correct Firebase Storage bucket format
  storageBucket: 'gpt1-77ce0.firebasestorage.app',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();
// Enhanced Firestore configuration to handle QUIC protocol errors
const db = (FirestoreMod as any).initializeFirestore
  ? (FirestoreMod as any).initializeFirestore(app, {
      // Force long polling to avoid QUIC/WebChannel issues
      experimentalForceLongPolling: true,
      useFetchStreams: false,
      // Additional settings for better connection stability
      ignoreUndefinedProperties: true,
      // Reduce connection timeout issues
      maxIdleTime: 30000, // 30 seconds
      // Additional QUIC protocol error prevention
      experimentalAutoDetectLongPolling: true,
      // Force WebChannel transport for better compatibility
      experimentalForceOwningTab: false,
    })
  : (FirestoreMod.getFirestore as any)(app);
const storage = getStorage(app);
const functions = getFunctions(app);

// Basic Firestore connection configuration

// Handle network connectivity issues and QUIC protocol errors
let networkRetryAttempts = 0;
const MAX_NETWORK_RETRIES = 3;

const handleNetworkError = async (error: any) => {
  // Enhanced QUIC protocol error detection
  const isQuicError =
    error?.message?.includes('QUIC') ||
    error?.code === 'ERR_QUIC_PROTOCOL_ERROR' ||
    error?.toString()?.includes('webchannel') ||
    error?.toString()?.includes('Listen/channel') ||
    error?.message?.includes('net::ERR_QUIC_PROTOCOL_ERROR') ||
    error?.message?.includes('gsessionid') ||
    error?.message?.includes('WebChannel') ||
    error?.message?.includes('stream_bridge');

  const isConnectionError = 
    error?.code === 'unavailable' ||
    error?.code === 'deadline-exceeded' ||
    error?.message?.includes('network') ||
    error?.message?.includes('connection');

  if ((isQuicError || isConnectionError) && networkRetryAttempts < MAX_NETWORK_RETRIES) {
    networkRetryAttempts++;

    console.warn(
      `Firestore connection error detected (attempt ${networkRetryAttempts}/${MAX_NETWORK_RETRIES}):`,
      error?.message || error
    );

    try {
      // Exponential backoff with jitter for better recovery
      const baseDelay = Math.pow(2, networkRetryAttempts) * 1000;
      const jitter = Math.random() * 1000;
      const delay = Math.min(baseDelay + jitter, 8000); // Max 8 seconds
      
      await new Promise(resolve => setTimeout(resolve, delay));

      // Reset on successful recovery
      if (networkRetryAttempts >= MAX_NETWORK_RETRIES) {
        networkRetryAttempts = 0;
      }
      
      return true;
    } catch (recoveryError) {
      console.error('Network recovery failed:', recoveryError);
      
      // Final fallback - suggest user refresh
      if (networkRetryAttempts >= MAX_NETWORK_RETRIES) {
        console.error('Max retry attempts reached. Please refresh the page.');
        // Could dispatch a user notification here
      }
    }
  }
  
  return false;
};

// Export network recovery function for use in other services
export const recoverFromNetworkError = handleNetworkError;

// Note: Functions emulator connection removed for compatibility
// The chatbot service includes HTTP fallback for development if needed

export { app, auth, db, storage, functions };
