
import { getAuth } from 'firebase/auth';

// Helper function to get auth token
const getAuthToken = async (): Promise<string | null> => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

// Storage usage API - Direct call with proper CORS handling
export const getStorageUsage = async () => {
  try {
    const token = await getAuthToken();
    if (!token) {
      console.warn('No auth token available');
      return { totalSize: 0 };
    }

    const functionsBaseUrl = process.env.REACT_APP_FUNCTIONS_BASE_URL || '';
    const response = await fetch(`${functionsBaseUrl}/getStorageUsage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data as { totalSize: number };
  } catch (error) {
    console.error('Error calling getStorageUsage function:', error);
    // Return a fallback value
    return { totalSize: 0 };
  }
};

// Add more API functions here as needed
export const api = {
  getStorageUsage,
};
