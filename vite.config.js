// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Remove path import if you added it earlier
// import path from 'path'
import tailwindcss from 'tailwindcss'; // Import tailwindcss
import autoprefixer from 'autoprefixer'; // Import autoprefixer

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      // Define plugins directly here
      plugins: [
        tailwindcss(), // Add tailwindcss plugin
        autoprefixer(), // Add autoprefixer plugin
      ],
    },
  },
  // Optional: Add build target if you haven't already
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: true,
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.endsWith('.css')) {
            return 'assets/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  }
})