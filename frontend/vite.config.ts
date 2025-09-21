import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    // Enable HTTPS for WebRTC support
    https: process.env.VITE_USE_HTTPS === 'true',
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
