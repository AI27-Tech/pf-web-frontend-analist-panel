import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
// defineConfig viene de vitest/config, no de vite: es el que admite el bloque `test`.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    // El plugin del router va antes de react: genera src/routeTree.gen.ts a partir
    // de src/routes/ y ese archivo tiene que existir cuando react compile.
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/pruebas/setup.ts'],
  },
});
