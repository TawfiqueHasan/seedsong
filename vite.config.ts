import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base './' makes the build work at any GitHub Pages path (/<repo>/) without knowing the repo name.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 900,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
