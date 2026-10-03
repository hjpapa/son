import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173
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
