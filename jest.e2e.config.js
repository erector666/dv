module.exports = {
  preset: 'jest-puppeteer',
  testMatch: ['**/e2e/**/*.test.ts'],
  transform: {
    '^.+\.tsx?$': 'ts-jest',
  },
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/e2e/setupTests.ts'],
};
