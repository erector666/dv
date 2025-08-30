import React from 'react';
import { render } from '@testing-library/react';
import App from './App';

// Mock Firebase to avoid issues in test environment
jest.mock('./services/firebase', () => ({
  auth: {
    onAuthStateChanged: jest.fn(() => jest.fn()), // Mock unsubscribe function
  },
  db: {},
  storage: {},
  functions: {}
}));

// Mock all contexts to avoid browser API dependencies
jest.mock('./context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-provider">{children}</div>,
  useAuth: () => ({
    currentUser: null,
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    resetPassword: jest.fn(),
  }),
}));

jest.mock('./context/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="theme-provider">{children}</div>,
  useTheme: () => ({
    theme: 'light',
    toggleTheme: jest.fn(),
    setTheme: jest.fn(),
  }),
}));

jest.mock('./context/LanguageContext', () => ({
  LanguageProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="language-provider">{children}</div>,
  useLanguage: () => ({
    language: 'en',
    setLanguage: jest.fn(),
    translate: jest.fn((key) => key),
  }),
}));

test('App component can be imported and rendered', () => {
  // This test verifies that the App component can be imported and rendered
  // without throwing errors, even with mocked dependencies
  expect(() => {
    render(<App />);
  }).not.toThrow();
});
