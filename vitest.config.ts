import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    fileParallelism: false,
    testTimeout: 25000,
    include: ['tests/**/*.test.ts'],
    exclude: ['frontend/**', 'node_modules/**', 'dist/**'],
    env: {
      NODE_ENV: 'test',
    },
  },
});
