import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const base = command === 'serve' ? '/supplier-admin/' : '/supplier-admin/'; // Or just '/' if deploying to root
  // If deploying to root of a domain/subdomain, production base should be '/'
  // If deploying to a subfolder on a domain, production base should be '/supplier-admin/'

  return {
    plugins: [react()],
    base: base, // Tells Vite about the base path
  }
})
