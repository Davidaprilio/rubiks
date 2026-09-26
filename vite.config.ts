/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'

/**
 * Dev only: lets the camera tracker save captured frames into ./captures/<session>/<file>
 * (POST /__captures/<session>/<file>), for replaying them with `npm run replay`.
 */
function cubeCaptures(): Plugin {
  return {
    name: 'cube-captures',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__captures', (req, res, next) => {
        if (req.method !== 'POST') return next()
        const rel = decodeURIComponent((req.url ?? '').split('?')[0]).replace(/^\/+/, '')
        if (!/^[\w-]+\/[\w.-]+\.(png|json)$/.test(rel)) {
          res.statusCode = 400
          res.end('bad capture path')
          return
        }
        const file = path.resolve(__dirname, 'captures', rel)
        const chunks: Buffer[] = []
        req.on('data', (c: Buffer) => chunks.push(c))
        req.on('end', () => {
          fs.mkdirSync(path.dirname(file), { recursive: true })
          fs.writeFileSync(file, Buffer.concat(chunks))
          res.end('ok')
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [
    tailwindcss(),
    cubeCaptures(),
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
  server: {
    watch: { ignored: ['**/captures/**'] },
  },
  test: {
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
  },
})
