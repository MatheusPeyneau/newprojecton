/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        /* brand palette (azul-índigo) */
        brand: {
          50:  '#eef0ff',
          100: '#e0e3ff',
          200: '#c4caff',
          300: '#a3aaff',
          400: '#8189ff',
          500: '#6366f1',
          600: '#5457e2',
          700: '#4548bd',
          800: '#373a96',
          900: '#2c2e74',
        },
        /* ink palette (dark backgrounds) */
        ink: {
          DEFAULT: '#0a0a0a',
          900: '#0c0c0e',
          800: '#111114',
          700: '#16161a',
          600: '#1c1c21',
        },
        /* shadcn-compat CSS variable colors */
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        border:  'hsl(var(--border))',
        input:   'hsl(var(--input))',
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        ring: 'hsl(var(--ring))',
      },
    },
  },
  plugins: [],
};
