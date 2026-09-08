import { defineConfig } from 'vitest/config';

export default defineConfig({
  clearScreen: false,
  test: {
    include: ['src/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/worktrees/**',
      '**/.artifacts/**',
      '**/coverage/**',
      '**/.cache/**',
    ],
  },
});
