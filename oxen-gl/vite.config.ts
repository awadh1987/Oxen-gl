import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// ====================================================================
// OxenGL Enterprise Frontend Configuration Pipeline (Vite/React)
// Purpose: Configures reverse proxy mapping, path resolution aliases,
//          and secure dev server boundaries for Phase 1 and Phase 2.
// ====================================================================
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Setup absolute path aliases to optimize import footprints across views
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@features': path.resolve(__dirname, './src/features'),
      '@views': path.resolve(__dirname, './src/views'),
      '@types': path.resolve(__dirname, './src/types.ts'),
    },
  },
  server: {
    port: 3000,
    host: true, // Exposes the server to the local Docker network mesh
    strictPort: true,
    proxy: {
      // Intercept and route frontend API calls transparently to the FastAPI backend
      '/api/v1': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        ws: true, // Enables full WebSocket proxying for live Phase 2 Fleet Tracking streams
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Core structural chunk split strategies to prevent single-file dashboard bloat
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-core';
            }
            if (id.includes('@reduxjs') || id.includes('redux')) {
              return 'vendor-state';
            }
            return 'vendor-utils';
          }
        },
      },
    },
  },
});
