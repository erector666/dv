import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  sendEmailVerification,
  UserCredential
} from 'firebase/auth';
import { auth } from '../services/firebase';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<UserCredential>;
  signIn: (email: string, password: string) => Promise<UserCredential>;
  logOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (displayName: string) => Promise<void>;
  resendVerificationEmail: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Sign up with email and password
  const signUp = async (email: string, password: string, displayName: string): Promise<UserCredential> => {
    try {
      console.log('Starting signup process for:', email);
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('User created successfully:', userCredential.user.uid);
      
      // Update the user's display name
      if (userCredential.user) {
        console.log('Updating user profile with display name:', displayName);
        await updateProfile(userCredential.user, {
          displayName
        });
        
        // Send email verification
        console.log('Sending email verification...');
        console.log('User email:', userCredential.user.email);
        console.log('User UID:', userCredential.user.uid);
        console.log('Email verified status:', userCredential.user.emailVerified);
        
        try {
          await sendEmailVerification(userCredential.user);
          console.log('Email verification sent successfully');
        } catch (verificationError) {
          console.error('Error sending email verification:', verificationError);
          throw verificationError;
        }
        
        // Don't sign out immediately - let the user see the success message
        // await signOut(auth);
      }
      
      return userCredential;
    } catch (error) {
      console.error('Error in signUp:', error);
      throw error;
    }
  };

  // Sign in with email and password
  const signIn = (email: string, password: string): Promise<UserCredential> => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  // Sign out
  const logOut = (): Promise<void> => {
    return signOut(auth);
  };

  // Reset password
  const resetPassword = async (email: string): Promise<void> => {
    console.log('Attempting to reset password for email:', email);
    console.log('Firebase auth object:', auth);
    console.log('Firebase config:', auth.app.options);
    try {
      await sendPasswordResetEmail(auth, email);
      console.log('Password reset email sent successfully');
    } catch (error) {
      console.error('Error in resetPassword:', error);
      throw error;
    }
  };

  // Update user profile
  const updateUserProfile = async (displayName: string): Promise<void> => {
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, {
        displayName
      });
    }
  };

  // Resend verification email
  const resendVerificationEmail = async (email: string, password: string): Promise<void> => {
    try {
      console.log('Attempting to resend verification email to:', email);
      
      // Sign in temporarily to get the user object
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      if (userCredential.user && !userCredential.user.emailVerified) {
        console.log('User found and not verified, sending verification email...');
        console.log('User email:', userCredential.user.email);
        console.log('User UID:', userCredential.user.uid);
        console.log('Email verified status:', userCredential.user.emailVerified);
        
        try {
          await sendEmailVerification(userCredential.user);
          console.log('Verification email resent successfully');
        } catch (verificationError) {
          console.error('Error resending email verification:', verificationError);
          throw verificationError;
        }
        
        // Sign out after sending verification
        await signOut(auth);
      } else if (userCredential.user && userCredential.user.emailVerified) {
        await signOut(auth);
        throw new Error('Email is already verified');
      } else {
        await signOut(auth);
        throw new Error('User not found');
      }
    } catch (error) {
      console.error('Error in resendVerificationEmail:', error);
      throw error;
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loading,
    signUp,
    signIn,
    logOut,
    resetPassword,
    updateUserProfile,
    resendVerificationEmail
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
