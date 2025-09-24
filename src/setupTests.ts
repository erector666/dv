// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Polyfill for TextEncoder/TextDecoder (required for Firebase in Node.js test environment)
import { TextEncoder, TextDecoder } from 'util';

// Polyfill for Web Streams (required for Firebase fetch in Node.js test environment)
// @ts-ignore
import {
  ReadableStream,
  WritableStream,
  TransformStream,
} from 'web-streams-polyfill/dist/ponyfill';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

global.ReadableStream = ReadableStream as any;
global.WritableStream = WritableStream as any;
global.TransformStream = TransformStream as any;

// Mock window.matchMedia for responsive design tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
global.localStorage = localStorageMock as Storage;
