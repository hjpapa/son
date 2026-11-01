import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    watch: {
      // Browser tests and art preparation produce large files that do not
      // belong to the running app. Avoid watching their generated output.
      ignored: ['**/output/**', '**/test-results/**', '**/playwright-report/**', '**/art-source/**']
    }
  },
  preview: {
    port: 4173
  },
  build: {
    // Phaser is large but rarely changes; a separate file stays cached
    // across game updates.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser']
        }
      }
    }
  }
});
