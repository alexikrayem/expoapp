import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // This is the crucial change. It tells Vite to
             // resolve assets relative to the domain root (e.g., https://supplieradmin.netlify.app/)
});