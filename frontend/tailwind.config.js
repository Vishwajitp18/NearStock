/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          bg: 'var(--color-bg)',
          surface: 'var(--color-surface)',
          'surface-hover': 'var(--color-surface-hover)',
          border: 'var(--color-border)',
          'border-subtle': 'var(--color-border-subtle)',
          teal: 'var(--color-accent)',
          'teal-dim': 'var(--color-accent-dim)',
          'teal-glow': 'var(--color-accent-glow)',
          heading: 'var(--color-heading)',
          body: 'var(--color-body)',
          muted: 'var(--color-muted)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'teal-glow': '0 0 25px -5px rgba(45, 226, 198, 0.25)',
        'surface': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
    },
  },
  plugins: [],
};

