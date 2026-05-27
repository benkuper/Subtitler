import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  base: '/nexus/',
  plugins: [svelte()],
  build: {
    target: 'esnext',
    cssCodeSplit: true,
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        qr: fileURLToPath(new URL('./qr/index.html', import.meta.url))
      },
      output: {
        manualChunks: undefined
      }
    }
  },
  server: {
    port: 5173,
    strictPort: false
  }
})
