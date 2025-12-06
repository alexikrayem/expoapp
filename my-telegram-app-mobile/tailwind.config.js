/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['TajawalCustom', 'Tajawal_400Regular', 'System'],
        regular: ['TajawalCustom', 'Tajawal_400Regular', 'System'],
        medium: ['Tajawal_500Medium', 'System'],
        bold: ['Tajawal_700Bold', 'System'],
      },
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
        background: {
          DEFAULT: '#ffffff',
          dark: '#0f172a',
        },
        surface: {
          DEFAULT: '#f8fafc',
          dark: '#1e293b',
        },
        'text-main': {
          DEFAULT: '#0f172a',
          dark: '#f1f5f9',
        },
        'text-secondary': {
          DEFAULT: '#64748b',
          dark: '#94a3b8',
        },
        border: {
          DEFAULT: '#e2e8f0',
          dark: '#334155',
        },
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
      },
    },
  },
  plugins: [],
}
