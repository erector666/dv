import React from 'react';

// Simple test to verify the test environment is working
test('Test environment is working', () => {
  expect(true).toBe(true);
});

test('React is available', () => {
  expect(React).toBeDefined();
});

test('Basic arithmetic works', () => {
  expect(2 + 2).toBe(4);
  expect(5 * 3).toBe(15);
});

test('String operations work', () => {
  expect('hello' + ' world').toBe('hello world');
  expect('test'.length).toBe(4);
});
