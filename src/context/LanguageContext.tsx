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
  translate: (key: string) => string;
}

// Default translations
const defaultTranslations: Translations = {
  appTitle: {
    en: 'AppVault',
    mk: 'АппВаулт',
    fr: 'AppVault',
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
  const translate = (key: string): string => {
    if (!translations[key]) {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
    
    return translations[key][language] || translations[key]['en'] || key;
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
