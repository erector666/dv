import React, { createContext, useContext, useState, useEffect } from 'react';

// Supported languages in the application
export type LanguageType = 'en' | 'mk' | 'fr';

// Interface for translations
export interface Translations {
  [key: string]: {
    [language in LanguageType]?: string;
  };
}

interface LanguageContextType {
  language: LanguageType;
  setLanguage: (language: LanguageType) => void;
  translate: (key: string, params?: Record<string, any>) => string;
}

// Default translations
const defaultTranslations: Translations = {
  appTitle: {
    en: 'DocVault',
    mk: 'DocVault',
    fr: 'DocVault',
  },
  dashboard: {
    en: 'Dashboard',
    mk: 'Табла',
    fr: 'Tableau de bord',
  },
  categories: {
    en: 'Categories',
    mk: 'Категории',
    fr: 'Catégories',
  },
  personal: {
    en: 'Personal',
    mk: 'Лични',
    fr: 'Personnel',
  },
  bills: {
    en: 'Bills',
    mk: 'Сметки',
    fr: 'Factures',
  },
  medical: {
    en: 'Medical',
    mk: 'Медицински',
    fr: 'Médical',
  },
  insurance: {
    en: 'Insurance',
    mk: 'Осигурување',
    fr: 'Assurance',
  },
  other: {
    en: 'Other',
    mk: 'Друго',
    fr: 'Autre',
  },
  recentUploads: {
    en: 'Recent Uploads',
    mk: 'Неодамна Прикачени',
    fr: 'Téléchargements récents',
  },
  search: {
    en: 'Search',
    mk: 'Пребарај',
    fr: 'Rechercher',
  },
  settings: {
    en: 'Settings',
    mk: 'Поставки',
    fr: 'Paramètres',
  },
  upload: {
    en: 'Upload',
    mk: 'Прикачи',
    fr: 'Télécharger',
  },
  darkMode: {
    en: 'Dark Mode',
    mk: 'Темен режим',
    fr: 'Mode sombre',
  },
  lightMode: {
    en: 'Light Mode',
    mk: 'Светол режим',
    fr: 'Mode clair',
  },
  // Authentication translations
  'auth.login.title': {
    en: 'Sign In',
    mk: 'Најави се',
    fr: 'Connexion',
  },
  'auth.login.subtitle': {
    en: 'Sign in to your account',
    mk: 'Најави се на твојата сметка',
    fr: 'Connectez-vous à votre compte',
  },
  'auth.fields.email': {
    en: 'Email',
    mk: 'Е-пошта',
    fr: 'E-mail',
  },
  'auth.fields.password': {
    en: 'Password',
    mk: 'Лозинка',
    fr: 'Mot de passe',
  },
  'auth.login.rememberMe': {
    en: 'Remember me',
    mk: 'Запомни ме',
    fr: 'Se souvenir de moi',
  },
  'auth.login.forgotPassword': {
    en: 'Forgot password?',
    mk: 'Заборавена лозинка?',
    fr: 'Mot de passe oublié?',
  },
  'auth.login.signIn': {
    en: 'Sign In',
    mk: 'Најави се',
    fr: 'Connexion',
  },
  'auth.login.noAccount': {
    en: 'Don\'t have an account?',
    mk: 'Немаш сметка?',
    fr: 'Vous n\'avez pas de compte?',
  },
  'auth.login.signUp': {
    en: 'Sign Up',
    mk: 'Регистрирај се',
    fr: 'S\'inscrire',
  },
  // Document translations
  'documents.deleteConfirmation.message': {
    en: 'Are you sure you want to delete {name}?',
    mk: 'Дали сте сигурни дека сакате да го избришете {name}?',
    fr: 'Êtes-vous sûr de vouloir supprimer {name}?',
  },
  // Upload translations
  'upload.error.fileSize': {
    en: 'File size exceeds the limit of {maxSize} MB',
    mk: 'Големината на датотеката го надминува ограничувањето од {maxSize} MB',
    fr: 'La taille du fichier dépasse la limite de {maxSize} Mo',
  },
  'upload.error.fileType': {
    en: 'File type not allowed. Allowed types: {allowedTypes}',
    mk: 'Типот на датотеката не е дозволен. Дозволени типови: {allowedTypes}',
    fr: 'Type de fichier non autorisé. Types autorisés: {allowedTypes}',
  },
  'upload.allowedTypes': {
    en: 'Allowed file types: {types}',
    mk: 'Дозволени типови на датотеки: {types}',
    fr: 'Types de fichiers autorisés: {types}',
  },
  // Common translations
  'common.cancel': {
    en: 'Cancel',
    mk: 'Откажи',
    fr: 'Annuler',
  },
  'documents.deleteConfirmation.title': {
    en: 'Delete Document',
    mk: 'Избриши документ',
    fr: 'Supprimer le document',
  },
  'auth.errors.invalidCredentials': {
    en: 'Invalid email or password',
    mk: 'Невалидна е-пошта или лозинка',
    fr: 'Email ou mot de passe invalide',
  },
  'auth.login.signingIn': {
    en: 'Signing In...',
    mk: 'Најавување...',
    fr: 'Connexion en cours...',
  },
  'auth.signOut': {
    en: 'Sign Out',
    mk: 'Одјави се',
    fr: 'Déconnexion',
  },
  'splash.tagline': {
    en: 'Secure Document Management',
    mk: 'Безбедно управување со документи',
    fr: 'Gestion sécurisée de documents',
  },
  'auth.register.title': {
    en: 'Sign Up',
    mk: 'Регистрирај се',
    fr: 'S\'inscrire',
  },
  'auth.register.subtitle': {
    en: 'Create your account',
    mk: 'Создај своја сметка',
    fr: 'Créez votre compte',
  },
  'auth.register.createAccount': {
    en: 'Sign Up',
    mk: 'Регистрирај се',
    fr: 'S\'inscrire',
  },
  'auth.register.creating': {
    en: 'Creating Account...',
    mk: 'Создавање сметка...',
    fr: 'Création du compte...',
  },
  'auth.register.haveAccount': {
    en: 'Already have an account?',
    mk: 'Веќе имаш сметка?',
    fr: 'Vous avez déjà un compte?',
  },
  // Upload translations
  'upload.dropzone': {
    en: 'Drag & drop files here, or click to select files',
    mk: 'Влечете и пуштете датотеки овде, или кликнете за да изберете датотеки',
    fr: 'Glissez et déposez des fichiers ici, ou cliquez pour sélectionner des fichiers',
  },
  'upload.title': {
    en: 'Upload Documents',
    mk: 'Прикачување на документи',
    fr: 'Télécharger des documents',
  },
  'upload.instructions': {
    en: 'Supported formats: PDF, JPG, PNG, DOCX',
    mk: 'Поддржани формати: PDF, JPG, PNG, DOCX',
    fr: 'Formats pris en charge : PDF, JPG, PNG, DOCX',
  },
  'upload.browse': {
    en: 'Browse Files',
    mk: 'Прегледај датотеки',
    fr: 'Parcourir les fichiers',
  },
  'upload.selectedFiles': {
    en: 'Selected Files',
    mk: 'Избрани датотеки',
    fr: 'Fichiers sélectionnés',
  },
  'upload.removeFile': {
    en: 'Remove',
    mk: 'Отстрани',
    fr: 'Supprimer',
  },
  'upload.uploading': {
    en: 'Uploading...',
    mk: 'Се прикачува...',
    fr: 'Téléchargement...',
  },
  'upload.uploadFiles': {
    en: 'Upload Files',
    mk: 'Прикачи датотеки',
    fr: 'Télécharger les fichiers',
  },
  // Loading states
  'loading': {
    en: 'Loading...',
    mk: 'Се вчитува...',
    fr: 'Chargement...',
  },
  'auth.register.signIn': {
    en: 'Sign In',
    mk: 'Најави се',
    fr: 'Connexion',
  },
  'auth.fields.displayName': {
    en: 'Full Name',
    mk: 'Целосно име',
    fr: 'Nom complet',
  },
  'auth.fields.confirmPassword': {
    en: 'Confirm Password',
    mk: 'Потврди лозинка',
    fr: 'Confirmer le mot de passe',
  },
  'auth.errors.passwordMismatch': {
    en: 'Passwords do not match',
    mk: 'Лозинките не се совпаѓаат',
    fr: 'Les mots de passe ne correspondent pas',
  },
  'auth.errors.passwordLength': {
    en: 'Password must be at least 6 characters',
    mk: 'Лозинката мора да има најмалку 6 карактери',
    fr: 'Le mot de passe doit comporter au moins 6 caractères',
  },
  'auth.errors.emailInUse': {
    en: 'Email is already in use',
    mk: 'Е-поштата е веќе во употреба',
    fr: 'L\'email est déjà utilisé',
  },
  'auth.errors.registrationFailed': {
    en: 'Failed to register. Please try again',
    mk: 'Неуспешна регистрација. Обидете се повторно',
    fr: 'Échec de l\'inscription. Veuillez réessayer',
  },
  'auth.forgotPassword.title': {
    en: 'Forgot Password',
    mk: 'Заборавена лозинка',
    fr: 'Mot de passe oublié',
  },
  'auth.forgotPassword.subtitle': {
    en: 'Enter your email to reset your password',
    mk: 'Внесете ја вашата е-пошта за да ја ресетирате лозинката',
    fr: 'Entrez votre email pour réinitialiser votre mot de passe',
  },
  'auth.forgotPassword.resetPassword': {
    en: 'Reset Password',
    mk: 'Ресетирај лозинка',
    fr: 'Réinitialiser le mot de passe',
  },
  'auth.forgotPassword.sending': {
    en: 'Sending Reset Link...',
    mk: 'Испраќање на линк за ресетирање...',
    fr: 'Envoi du lien de réinitialisation...',
  },
  'auth.forgotPassword.resetSent': {
    en: 'Password reset email sent. Check your inbox.',
    mk: 'Испратен е е-пошта за ресетирање на лозинката. Проверете го вашето сандаче.',
    fr: 'Email de réinitialisation du mot de passe envoyé. Vérifiez votre boîte de réception.',
  },
  'auth.forgotPassword.rememberPassword': {
    en: 'Remember your password?',
    mk: 'Се сеќавате на вашата лозинка?',
    fr: 'Vous vous souvenez de votre mot de passe?',
  },
  'auth.forgotPassword.backToLogin': {
    en: 'Back to Login',
    mk: 'Назад кон најава',
    fr: 'Retour à la connexion',
  },
  'auth.errors.resetFailed': {
    en: 'Failed to reset password. Please check your email and try again.',
    mk: 'Неуспешно ресетирање на лозинката. Проверете ја вашата е-пошта и обидете се повторно.',
    fr: 'Échec de la réinitialisation du mot de passe. Veuillez vérifier votre email et réessayer.',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<LanguageType>(() => {
    // Check if language is stored in localStorage
    const savedLanguage = localStorage.getItem('language') as LanguageType;
    // Default to browser language or English
    const browserLanguage = navigator.language.split('-')[0];
    const defaultLanguage = (browserLanguage === 'mk' || browserLanguage === 'fr') 
      ? browserLanguage as LanguageType 
      : 'en';
    
    return savedLanguage || defaultLanguage;
  });

  // Store translations
  const [translations] = useState<Translations>(defaultTranslations);

  useEffect(() => {
    // Update localStorage when language changes
    localStorage.setItem('language', language);
    // Update document language attribute
    document.documentElement.setAttribute('lang', language);
  }, [language]);

  // Translation function
  const translate = (key: string, params?: Record<string, any>): string => {
    if (!translations[key]) {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
    
    let text = translations[key][language] || translations[key]['en'] || key;
    
    // Replace parameters in the text if provided
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
      });
    }
    
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, translate }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
