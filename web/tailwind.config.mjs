/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'JetBrains Mono', 'monospace'],
      },
      colors: {
        aura: {
          purple: '#A855F7',
          blue: '#3B82F6',
          green: '#10B981',
          cyan: '#06B6D4',
        },
      },
      animation: {
        'glow-pulse': 'glow-pulse 4s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'fade-in-up': 'fade-in-up 0.8s ease-out forwards',
        'slide-in-left': 'slide-in-left 0.6s ease-out forwards',
        'slide-in-right': 'slide-in-right 0.6s ease-out forwards',
        'spin-slow': 'spin 20s linear infinite',
        'gradient-shift': 'gradient-shift 8s ease infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { 
            opacity: '0.4',
            transform: 'scale(1)',
          },
          '50%': { 
            opacity: '0.8',
            transform: 'scale(1.05)',
          },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'fade-in-up': {
          '0%': { 
            opacity: '0',
            transform: 'translateY(30px)',
          },
          '100%': { 
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'slide-in-left': {
          '0%': { 
            opacity: '0',
            transform: 'translateX(-50px)',
          },
          '100%': { 
            opacity: '1',
            transform: 'translateX(0)',
          },
        },
        'slide-in-right': {
          '0%': { 
            opacity: '0',
            transform: 'translateX(50px)',
          },
          '100%': { 
            opacity: '1',
            transform: 'translateX(0)',
          },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'aura-mesh': `
          radial-gradient(at 40% 20%, hsla(270, 80%, 50%, 0.15) 0px, transparent 50%),
          radial-gradient(at 80% 0%, hsla(220, 80%, 50%, 0.15) 0px, transparent 50%),
          radial-gradient(at 0% 50%, hsla(280, 80%, 45%, 0.12) 0px, transparent 50%),
          radial-gradient(at 80% 50%, hsla(180, 80%, 40%, 0.1) 0px, transparent 50%),
          radial-gradient(at 0% 100%, hsla(240, 80%, 50%, 0.12) 0px, transparent 50%),
          radial-gradient(at 80% 100%, hsla(320, 80%, 45%, 0.1) 0px, transparent 50%)
        `,
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow-sm': '0 0 20px -5px rgba(168, 85, 247, 0.4)',
        'glow-md': '0 0 40px -10px rgba(168, 85, 247, 0.5)',
        'glow-lg': '0 0 60px -15px rgba(168, 85, 247, 0.6)',
        'glow-blue': '0 0 40px -10px rgba(59, 130, 246, 0.5)',
        'glow-green': '0 0 40px -10px rgba(16, 185, 129, 0.5)',
        'inner-glow': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.1)',
      },
    },
  },
  plugins: [],
}