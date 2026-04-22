import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Manual palette (Silver · Black · White · Authority)
        bg: {
          DEFAULT: '#07080A',   // primary background
          elevated: '#0C0E12',  // elevated surfaces
          panel: '#0F1217',
          panel2: '#14171C',
        },
        border: {
          DEFAULT: '#1F252C',
          bright: '#2A3138',
        },
        text: {
          DEFAULT: '#F8F9FA',
          silver: '#C8D1DA',
          'silver-bright': '#E0E6EC',
          dim: '#8A94A0',
          muted: '#6B7580',
          'muted-deep': '#5A636D',
        },
        // Honey signature (for BLiNG! only, not ambient)
        honey: '#FAD15E',
        // Front colors
        front: {
          ur: '#FAD15E',      // UNITE & RULE
          inv: '#E88938',     // INVESTIGATE
          nwo: '#9B7FC8',     // THE NEW WORLD ORDER
          pros: '#6FCF8F',    // PROSECUTE
          ds: '#C94C4C',      // THE DEEP STATE
        },
        // Kettle states
        kettle: {
          sourced: '#6FCF8F',    // whistling / FACT (green)
          accepted: '#6B94C8',   // rolling boil (blue)
          contested: '#E8A838',  // amber
          emerging: '#E88938',   // bubbling (orange)
          fringe: '#9B7FC8',     // steam (purple)
          unsourced: '#C94C4C',  // cold (red)
        },
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // Custom small sizes respecting 11px minimum
        xxs: ['0.6875rem', { lineHeight: '1rem' }],     // 11px
        xs: ['0.75rem', { lineHeight: '1rem' }],        // 12px (default)
      },
      boxShadow: {
        'honey-glow': '0 0 6px rgba(250,209,94,0.5)',
      },
      animation: {
        'honey-drop': 'honey-drop 0.6s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        'honey-drop': {
          '0%': { transform: 'translateY(-8px) scale(0.9)', opacity: '0' },
          '50%': { transform: 'translateY(0) scale(1.05)', opacity: '1' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
