import dotenv from 'dotenv';
import { join } from 'path';

// Load test environment variables
dotenv.config({
  path: join(__dirname, '../.env.test')
});

// Global test setup
beforeAll(() => {
  // Add any global test setup if needed
});

// Global test teardown
afterAll(() => {
  // Add any global test cleanup if needed
});