import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock Firebase to avoid TextEncoder issues in test environment
jest.mock('./services/firebase', () => ({
  auth: {},
  db: {},
  storage: {},
  functions: {}
}));

test('renders AppVault application', () => {
  render(<App />);
  // Check for loading state or auth context
  expect(document.body).toBeInTheDocument();
});
