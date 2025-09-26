import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Camera, 
  Mail, 
  Calendar, 
  Shield, 
  Settings as SettingsIcon,
  Download,
  Upload as UploadIcon,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Key,
  Trash2,
  Activity,
  FileText,
  HardDrive,
  Clock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUserPreferences } from '../../context/UserPreferencesContext';
import { storage, db } from '../../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile, updatePassword, sendEmailVerification, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useToast, createToastHelpers } from '../ui/FeedbackSystem';
import { Card, CardHeader, CardTitle, CardContent, Button } from '../ui';
import { Link } from 'react-router-dom';
import { 
  validateProfileData, 
  validatePassword, 
  validateAvatarFile, 
  sanitizeTextInput,
  ProfileUpdateRateLimit,
  ValidationResult 
} from '../../utils/profileValidation';

interface UserStats {
  documentsUploaded: number;
  storageUsed: number;
  lastLogin: Date | null;
  accountCreated: Date | null;
}

interface ProfileData {
  bio: string;
  phoneNumber: string;
  location: string;
  website: string;
  profileVisibility: 'public' | 'private';
}

const EnhancedProfile: React.FC = () => {
  const { currentUser } = useAuth();
  const { preferences } = useUserPreferences();
  const { addToast } = useToast();
  const toast = createToastHelpers(addToast);
  
  // File handling
  const [newAvatar, setNewAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  // Form states
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'account' | 'privacy'>('profile');
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [profileData, setProfileData] = useState<ProfileData>({
    bio: '',
    phoneNumber: '',
    location: '',
    website: '',
    profileVisibility: 'private'
  });

  // Validation states
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Security states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // User stats
  const [userStats, setUserStats] = useState<UserStats>({
    documentsUploaded: 0,
    storageUsed: 0,
    lastLogin: null,
    accountCreated: null
  });

  // Load profile data
  useEffect(() => {
    const loadProfileData = async () => {
      if (!currentUser) return;

      try {
        setProfileLoading(true);
        
        // Load extended profile data
        const profileRef = doc(db, 'userProfiles', currentUser.uid);
        const profileSnap = await getDoc(profileRef);
        
        if (profileSnap.exists()) {
          const data = profileSnap.data();
          setProfileData({
            bio: data.bio || '',
            phoneNumber: data.phoneNumber || '',
            location: data.location || '',
            website: data.website || '',
            profileVisibility: data.profileVisibility || 'private'
          });
        }

        // Load user statistics
        const statsRef = doc(db, 'userStats', currentUser.uid);
        const statsSnap = await getDoc(statsRef);
        
        if (statsSnap.exists()) {
          const data = statsSnap.data();
          setUserStats({
            documentsUploaded: data.documentsUploaded || 0,
            storageUsed: data.storageUsed || 0,
            lastLogin: data.lastLogin?.toDate() || null,
            accountCreated: data.accountCreated?.toDate() || new Date(currentUser.metadata.creationTime!)
          });
        } else {
          setUserStats(prev => ({
            ...prev,
            accountCreated: new Date(currentUser.metadata.creationTime!)
          }));
        }

        setAvatarPreview(currentUser.photoURL || '');
      } catch (error) {
        console.error('Failed to load profile data:', error);
        toast.error('Load Failed', 'Failed to load profile data.');
      } finally {
        setProfileLoading(false);
      }
    };

    loadProfileData();
  }, [currentUser, toast]);

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        handleAvatarFile(file);
      } else {
        toast.error('Invalid File', 'Please select an image file.');
      }
    }
  }, [toast]);

  const handleAvatarFile = (file: File) => {
    // Validate file using our validation utility
    const validation = validateAvatarFile(file);
    
    if (!validation.isValid) {
      validation.errors.forEach(error => {
        toast.error('Invalid File', error);
      });
      return;
    }

    // Show warnings if any
    validation.warnings.forEach(warning => {
      toast.warning('File Warning', warning);
    });

    setNewAvatar(file);
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    
    toast.success('Image Selected', 'Image ready for upload. Click Save Changes to apply.');
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleAvatarFile(e.target.files[0]);
    }
  };

  const handleProfileSave = async () => {
    if (!currentUser) return;

    // Check rate limiting
    const rateLimitCheck = ProfileUpdateRateLimit.canUpdate();
    if (!rateLimitCheck.allowed) {
      toast.error('Rate Limited', rateLimitCheck.message || 'Please wait before updating again.');
      return;
    }

    // Validate profile data
    const sanitizedDisplayName = sanitizeTextInput(displayName);
    const sanitizedProfileData = {
      bio: sanitizeTextInput(profileData.bio),
      phoneNumber: sanitizeTextInput(profileData.phoneNumber),
      location: sanitizeTextInput(profileData.location),
      website: profileData.website.trim(),
      profileVisibility: profileData.profileVisibility
    };

    const validation = validateProfileData({
      displayName: sanitizedDisplayName,
      ...sanitizedProfileData
    });

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      validation.errors.forEach(error => {
        toast.error('Validation Error', error);
      });
      return;
    }

    // Show warnings but continue
    if (validation.warnings.length > 0) {
      setValidationWarnings(validation.warnings);
      validation.warnings.forEach(warning => {
        toast.warning('Validation Warning', warning);
      });
    }

    setLoading(true);
    setValidationErrors([]);
    setValidationWarnings([]);

    try {
      let newPhotoURL = currentUser.photoURL;

      // Upload new avatar if selected
      if (newAvatar) {
        // Re-validate avatar file before upload
        const avatarValidation = validateAvatarFile(newAvatar);
        if (!avatarValidation.isValid) {
          throw new Error(avatarValidation.errors[0]);
        }

        const avatarRef = ref(storage, `avatars/${currentUser.uid}`);
        await uploadBytes(avatarRef, newAvatar);
        newPhotoURL = await getDownloadURL(avatarRef);
        setUploadProgress(100);
      }

      // Update Firebase Auth profile
      await updateProfile(currentUser, {
        displayName: sanitizedDisplayName,
        photoURL: newPhotoURL || null,
      });

      // Update extended profile data in Firestore
      const profileRef = doc(db, 'userProfiles', currentUser.uid);
      await updateDoc(profileRef, {
        ...sanitizedProfileData,
        displayName: sanitizedDisplayName,
        photoURL: newPhotoURL,
        updatedAt: serverTimestamp(),
        lastValidated: serverTimestamp()
      });

      // Record successful update for rate limiting
      ProfileUpdateRateLimit.recordUpdate();

      // Reset form states
      setNewAvatar(null);
      setUploadProgress(0);
      
      toast.success('Profile Updated', 'Your profile has been updated successfully!');
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      toast.error('Update Failed', error.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentUser || !currentUser.email) return;

    // Validate password using our validation utility
    const passwordValidation = validatePassword({
      currentPassword,
      newPassword,
      confirmPassword
    });

    if (!passwordValidation.isValid) {
      setValidationErrors(passwordValidation.errors);
      passwordValidation.errors.forEach(error => {
        toast.error('Password Validation', error);
      });
      return;
    }

    // Show warnings
    if (passwordValidation.warnings.length > 0) {
      passwordValidation.warnings.forEach(warning => {
        toast.warning('Password Warning', warning);
      });
    }

    setLoading(true);
    setValidationErrors([]);

    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // Update password
      await updatePassword(currentUser, newPassword);

      // Log password change for security audit
      const securityLogRef = doc(db, 'securityLogs', currentUser.uid);
      await updateDoc(securityLogRef, {
        lastPasswordChange: serverTimestamp(),
        passwordChangeCount: (await getDoc(securityLogRef)).data()?.passwordChangeCount + 1 || 1
      }).catch(() => {
        // Create log if it doesn't exist
        updateDoc(securityLogRef, {
          lastPasswordChange: serverTimestamp(),
          passwordChangeCount: 1
        });
      });

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      toast.success('Password Updated', 'Your password has been changed successfully.');
    } catch (error: any) {
      console.error('Failed to update password:', error);
      if (error.code === 'auth/wrong-password') {
        toast.error('Incorrect Password', 'Current password is incorrect.');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Weak Password', 'Please choose a stronger password.');
      } else if (error.code === 'auth/requires-recent-login') {
        toast.error('Re-authentication Required', 'Please sign out and sign in again to change your password.');
      } else {
        toast.error('Update Failed', error.message || 'Failed to update password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      await sendEmailVerification(currentUser);
      toast.success('Email Sent', 'Verification email has been sent to your email address.');
    } catch (error) {
      console.error('Failed to send verification email:', error);
      toast.error('Send Failed', 'Failed to send verification email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = () => {
    const data = {
      profile: {
        displayName: currentUser?.displayName,
        email: currentUser?.email,
        emailVerified: currentUser?.emailVerified,
        ...profileData
      },
      preferences: preferences,
      stats: userStats,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profile-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Data Exported', 'Your profile data has been downloaded.');
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getProfileCompletion = () => {
    let completed = 0;
    const total = 6;

    if (displayName) completed++;
    if (currentUser?.photoURL) completed++;
    if (currentUser?.emailVerified) completed++;
    if (profileData.bio) completed++;
    if (profileData.location) completed++;
    if (profileData.phoneNumber) completed++;

    return Math.round((completed / total) * 100);
  };

  // Helper component for field validation display
  const FieldError: React.FC<{ errors?: string[] }> = ({ errors }) => {
    if (!errors || errors.length === 0) return null;
    
    return (
      <div className="mt-1 space-y-1">
        {errors.map((error, index) => (
          <p key={index} className="text-sm text-red-600 dark:text-red-400 flex items-center">
            <AlertCircle className="w-4 h-4 mr-1" />
            {error}
          </p>
        ))}
      </div>
    );
  };

  // Helper function to get field-specific errors
  const getFieldErrors = (fieldName: string): string[] => {
    return fieldErrors[fieldName] || [];
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'account', label: 'Account', icon: SettingsIcon },
    { id: 'privacy', label: 'Privacy', icon: Eye }
  ];

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Your Profile
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your account information, security settings, and preferences
        </p>
      </div>

      {/* Validation Errors/Warnings Summary */}
      {(validationErrors.length > 0 || validationWarnings.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          {validationErrors.length > 0 && (
            <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-red-800 dark:text-red-200">
                      Please fix the following issues:
                    </h3>
                    <ul className="mt-2 space-y-1">
                      {validationErrors.map((error, index) => (
                        <li key={index} className="text-sm text-red-700 dark:text-red-300">
                          • {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {validationWarnings.length > 0 && (
            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-amber-800 dark:text-amber-200">
                      Recommendations:
                    </h3>
                    <ul className="mt-2 space-y-1">
                      {validationWarnings.map((warning, index) => (
                        <li key={index} className="text-sm text-amber-700 dark:text-amber-300">
                          • {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      {/* Profile Completion Banner */}
      <Card className="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border-primary-200 dark:border-primary-800">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="transparent"
                  className="text-primary-200 dark:text-primary-800"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - getProfileCompletion() / 100)}`}
                  className="text-primary-600 dark:text-primary-400 transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-primary-700 dark:text-primary-300">
                  {getProfileCompletion()}%
                </span>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-primary-900 dark:text-primary-100">
                Profile Completion
              </h3>
              <p className="text-sm text-primary-700 dark:text-primary-300">
                Complete your profile to get the most out of DocVault
              </p>
            </div>
          </div>
          <Link to="/settings">
            <Button variant="outline" size="sm" className="border-primary-300 text-primary-700 hover:bg-primary-50">
              <SettingsIcon className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <Card className="p-1">
        <div className="flex flex-wrap gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  activeTab === tab.id
                    ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                aria-label={`${tab.label} settings`}
                role="tab"
                aria-selected={activeTab === tab.id}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Picture and Basic Info */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Profile Picture
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col items-center space-y-4">
                    <div 
                      className={`relative group ${dragActive ? 'ring-2 ring-primary-500 ring-offset-2' : ''}`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      <img
                        src={avatarPreview || '/default-avatar.svg'}
                        alt="Avatar"
                        className="h-32 w-32 rounded-full object-cover border-4 border-primary-500 transition-all duration-200 group-hover:scale-105"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 bg-primary-600 hover:bg-primary-700 text-white p-2 rounded-full shadow-lg transition-colors"
                        aria-label="Change avatar"
                      >
                        <Camera className="w-5 h-5" />
                      </button>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        ref={fileInputRef}
                        className="hidden"
                      />
                      {dragActive && (
                        <div className="absolute inset-0 bg-primary-500/20 rounded-full flex items-center justify-center">
                          <p className="text-primary-700 font-medium text-sm">Drop image here</p>
                        </div>
                      )}
                    </div>
                    
                    {uploadProgress > 0 && uploadProgress < 100 && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    )}
                    
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                      Click to upload or drag and drop<br />
                      Maximum file size: 5MB
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Basic Information Form */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className={`w-full px-3 py-2 bg-white dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                          getFieldErrors('displayName').length > 0 
                            ? 'border-red-300 dark:border-red-600' 
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                        placeholder="Enter your full name"
                        maxLength={50}
                      />
                      <FieldError errors={getFieldErrors('displayName')} />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email Address
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="email"
                          value={currentUser?.email || ''}
                          disabled
                          className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-500"
                        />
                        {currentUser?.emailVerified ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <button
                            onClick={handleResendVerification}
                            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                            disabled={loading}
                          >
                            Verify
                          </button>
                        )}
                      </div>
                      {!currentUser?.emailVerified && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          Email not verified. Click "Verify" to resend verification email.
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Bio
                    </label>
                    <textarea
                      value={profileData.bio}
                      onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="Tell us about yourself..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={profileData.phoneNumber}
                        onChange={(e) => setProfileData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                        placeholder="Enter your phone number"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Location
                      </label>
                      <input
                        type="text"
                        value={profileData.location}
                        onChange={(e) => setProfileData(prev => ({ ...prev, location: e.target.value }))}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                        placeholder="City, Country"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      value={profileData.website}
                      onChange={(e) => setProfileData(prev => ({ ...prev, website: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="https://example.com"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDisplayName(currentUser?.displayName || '');
                        setAvatarPreview(currentUser?.photoURL || '');
                        setNewAvatar(null);
                      }}
                    >
                      Reset
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleProfileSave}
                      disabled={loading}
                      leftIcon={loading ? undefined : <User className="w-4 h-4" />}
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Password Change */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Key className="w-5 h-5 mr-2" />
                    Change Password
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.current ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-3 py-2 pr-10 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3 py-2 pr-10 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                        placeholder="Enter new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-3 py-2 pr-10 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    onClick={handlePasswordChange}
                    disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                    className="w-full"
                    leftIcon={<Key className="w-4 h-4" />}
                  >
                    {loading ? 'Updating...' : 'Update Password'}
                  </Button>
                </CardContent>
              </Card>

              {/* Account Security Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="w-5 h-5 mr-2" />
                    Security Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="font-medium">Email Verification</p>
                        <p className="text-sm text-gray-500">
                          {currentUser?.emailVerified ? 'Verified' : 'Not verified'}
                        </p>
                      </div>
                    </div>
                    {currentUser?.emailVerified ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-500" />
                    )}
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Key className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="font-medium">Password Strength</p>
                        <p className="text-sm text-gray-500">Strong password set</p>
                      </div>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Activity className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="font-medium">Last Login</p>
                        <p className="text-sm text-gray-500">
                          {userStats.lastLogin ? userStats.lastLogin.toLocaleDateString() : 'Today'}
                        </p>
                      </div>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Account Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="w-5 h-5 mr-2" />
                    Account Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                      <FileText className="w-8 h-8 text-primary-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-primary-700 dark:text-primary-300">
                        {userStats.documentsUploaded}
                      </p>
                      <p className="text-sm text-primary-600 dark:text-primary-400">Documents</p>
                    </div>
                    
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <HardDrive className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                        {formatBytes(userStats.storageUsed)}
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400">Storage Used</p>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-3 mb-2">
                      <Calendar className="w-5 h-5 text-gray-500" />
                      <p className="font-medium">Account Created</p>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {userStats.accountCreated?.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-3 mb-2">
                      <Clock className="w-5 h-5 text-gray-500" />
                      <p className="font-medium">Last Activity</p>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {userStats.lastLogin?.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) || 'Today'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Data Management */}
              <Card>
                <CardHeader>
                  <CardTitle>Data Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      onClick={handleExportData}
                      leftIcon={<Download className="w-4 h-4" />}
                      className="w-full justify-start"
                    >
                      Export Profile Data
                    </Button>
                    
                    <Link to="/settings" className="block">
                      <Button
                        variant="outline"
                        leftIcon={<SettingsIcon className="w-4 h-4" />}
                        className="w-full justify-start"
                      >
                        Manage Preferences
                      </Button>
                    </Link>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 className="font-medium text-red-600 dark:text-red-400 mb-3">Danger Zone</h4>
                    <Button
                      variant="danger"
                      leftIcon={<Trash2 className="w-4 h-4" />}
                      className="w-full justify-start"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                          toast.error('Feature Coming Soon', 'Account deletion will be available in a future update.');
                        }
                      }}
                    >
                      Delete Account
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Eye className="w-5 h-5 mr-2" />
                    Privacy Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Profile Visibility
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="visibility"
                          value="private"
                          checked={profileData.profileVisibility === 'private'}
                          onChange={(e) => setProfileData(prev => ({ ...prev, profileVisibility: e.target.value as 'public' | 'private' }))}
                          className="text-primary-600 focus:ring-primary-500"
                        />
                        <div>
                          <p className="font-medium">Private</p>
                          <p className="text-sm text-gray-500">Only you can see your profile information</p>
                        </div>
                      </label>
                      
                      <label className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="visibility"
                          value="public"
                          checked={profileData.profileVisibility === 'public'}
                          onChange={(e) => setProfileData(prev => ({ ...prev, profileVisibility: e.target.value as 'public' | 'private' }))}
                          className="text-primary-600 focus:ring-primary-500"
                        />
                        <div>
                          <p className="font-medium">Public</p>
                          <p className="text-sm text-gray-500">Other users can see your basic profile information</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Data Usage
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Analytics</p>
                          <p className="text-sm text-gray-500">Help us improve by sharing usage data</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Marketing Communications</p>
                          <p className="text-sm text-gray-500">Receive updates about new features</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      variant="primary"
                      onClick={handleProfileSave}
                      disabled={loading}
                      leftIcon={<Eye className="w-4 h-4" />}
                    >
                      {loading ? 'Saving...' : 'Save Privacy Settings'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default EnhancedProfile;