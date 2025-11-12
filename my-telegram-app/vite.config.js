// In vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
  },

  // 🚧 --- Temporary ngrok fix (remove when deploying) ---
  server: {
    allowedHosts: ['.ngrok-free.dev'], // allow all ngrok subdomains
  },
  // 🚧 --- End temporary ngrok fix ---
})
