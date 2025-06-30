import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts'
      ]
    },
    testTimeout: 30000, // 30 seconds for integration tests
    hookTimeout: 30000,
    retry: 2, // Retry failed tests up to 2 times
    pool: 'forks', // Use forks to isolate tests
    poolOptions: {
      forks: {
        singleFork: true // Run tests sequentially to avoid rate limiting
      }
    }
  }
});