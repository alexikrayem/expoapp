/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",                     // Scans your main HTML file
    "./src/**/*.{js,ts,jsx,tsx}",       // Scans all JS, TS, JSX, TSX files in the src folder
  ],
  theme: {
    extend: {
      // You can extend your theme here if needed later
      // For example, custom colors, fonts, etc.
    },
  },
  plugins: [
    require('@tailwindcss/forms'),    // Add the forms plugin if you installed it
    // Add other plugins here if you use them
  ],
}