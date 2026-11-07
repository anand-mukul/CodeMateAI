/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./popup.html",
    "./sidepanel.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        codemate: {
          dark: '#0a0f1d',
          surface: '#111827',
          card: '#1e293b',
          border: '#334155',
          primary: '#6366f1',
          primaryHover: '#4f46e5',
          accent: '#8b5cf6',
          cyan: '#06b6d4',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
          muted: '#94a3b8',
        }
      }
    },
  },
  plugins: [],
}

