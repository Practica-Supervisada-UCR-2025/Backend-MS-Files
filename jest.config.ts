import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  testTimeout: 5000, // 5 seconds should be enough for most tests
  preset: 'ts-jest',
  testEnvironment: 'node',
  verbose: false, // Reduce console noise
  maxWorkers: 1, // Run tests sequentially
  collectCoverage: false, // Only collect coverage when explicitly requested
  moduleFileExtensions: ['ts', 'js'],
  roots: ['<rootDir>/src', '<rootDir>/test-api'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/types/**/*',
    '!src/**/*.d.ts',
    '!src/test-db/**/*',
    '!src/app.ts'
  ],
  setupFilesAfterEnv: ['<rootDir>/test-api/setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  setupFiles: ['dotenv/config'],
  testEnvironmentOptions: {
    env: {
      NODE_ENV: 'test'
    }
  },
  detectOpenHandles: false,
  forceExit: false
};

export default config;