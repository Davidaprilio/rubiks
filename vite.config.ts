/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'opencv': ['@techstark/opencv-js'],
          'three': ['three'],
          'vendor': ['gsap', 'animejs', 'troika-three-text'],
        },
      },
    },
  },
  test: {
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
  },
})
