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
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        brand: {
          50: '#e6f6fd',
          100: '#ccecfb',
          200: '#99daf7',
          300: '#66c7f3',
          400: '#33b4ef',
          500: '#0096DB',
          600: '#0084c2',
          700: '#006ea2',
          800: '#005780',
          900: '#00405e',
          azure: '#0096DB',
          teal: '#29B47D',
          green: '#5AB331',
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.03), 0 1px 2px -1px rgba(0, 0, 0, 0.03)',
        'card': '0 0 0 1px rgba(0, 0, 0, 0.03), 0 2px 8px rgba(0, 0, 0, 0.02)',
        'glass': '0 8px 30px 0 rgba(0, 150, 219, 0.05), 0 1px 3px 0 rgba(0, 0, 0, 0.02)',
        'glass-hover': '0 14px 40px -6px rgba(0, 150, 219, 0.15), 0 2px 8px rgba(0, 0, 0, 0.03)',
        'glow-primary': '0 4px 18px 0 rgba(0, 150, 219, 0.35)',
        'glow-teal': '0 4px 18px 0 rgba(41, 180, 125, 0.35)',
        'glow-green': '0 4px 18px 0 rgba(90, 179, 49, 0.35)',
        'dialog': '0 25px 50px -12px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.8)',
      }
    },
  },
  plugins: [],
}

