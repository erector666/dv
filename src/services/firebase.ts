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
// Force long polling to avoid QUIC/WebChannel issues; disable fetch streams
// Use initializeFirestore if available; otherwise fall back to getFirestore
const db = (FirestoreMod as any).initializeFirestore
  ? (FirestoreMod as any).initializeFirestore(app, {
      // Hard-enable long polling to mitigate QUIC/WebChannel flakiness
      experimentalForceLongPolling: true,
      useFetchStreams: false,
    })
  : (FirestoreMod.getFirestore as any)(app);
const storage = getStorage(app);
const functions = getFunctions(app);

// Basic Firestore connection configuration

// Handle network connectivity issues and QUIC protocol errors
let networkRetryAttempts = 0;
const MAX_NETWORK_RETRIES = 3;

const handleNetworkError = async (error: any) => {
  // Check for specific QUIC protocol errors
  const isQuicError =
    error?.message?.includes('QUIC') ||
    error?.code === 'ERR_QUIC_PROTOCOL_ERROR' ||
    error?.toString()?.includes('webchannel');

  if (isQuicError && networkRetryAttempts < MAX_NETWORK_RETRIES) {
    networkRetryAttempts++;

    try {
      // Simple delay-based recovery for QUIC issues
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds for network recovery

      networkRetryAttempts = 0; // Reset on success
      return true;
    } catch (recoveryError) {

      // Final fallback - manual intervention required
      if (networkRetryAttempts >= MAX_NETWORK_RETRIES) {
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
