import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  roots: ['<rootDir>/server', '<rootDir>/shared'],
  setupFilesAfterEnv: ['<rootDir>/server/__tests__/jest.setup.ts'],
  // Only run files explicitly marked as tests (avoid treating jest.setup.ts as a test)
  testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)'],
  testPathIgnorePatterns: ['<rootDir>/server/__tests__/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/client/src/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    // Allow importing ESM paths without .js extension mapping back to TS during tests
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  // Keep diagnostics on to catch TS issues during tests
  globals: {
    'ts-jest': {
      useESM: true,
      isolatedModules: true,
    },
  },
};

export default config;
