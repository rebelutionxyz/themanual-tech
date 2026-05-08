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
        // Kettle states (semantic palette — sourced/unsourced retained as
        // green/red affordance colors used outside the Kettle metaphor)
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
        'bling-hop': 'bling-hop 0.9s cubic-bezier(0.32, 0.72, 0.35, 1)',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'slide-in-right': 'slide-in-right 0.18s ease-out',
        // Promotion top-ticker (Phase C Component D, Code 24, 2026-05-08).
        // Pairs with a duplicated content track inside the ticker so the
        // scroll appears continuous when transform hits -50%.
        'promo-ticker': 'promo-ticker 40s linear infinite',
      },
      keyframes: {
        'honey-drop': {
          '0%': { transform: 'translateY(-8px) scale(0.9)', opacity: '0' },
          '50%': { transform: 'translateY(0) scale(1.05)', opacity: '1' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        // BLiNG! drop hop/skip/jump — three vertical hops with subtle horizontal sway.
        // Pillar-ID motion signature per MMF §15.1; gated to pillar contexts at the call site.
        'bling-hop': {
          '0%':   { transform: 'translate(0, 0) scale(1)' },
          '15%':  { transform: 'translate(0, -6px) scale(1.06)' },
          '30%':  { transform: 'translate(1px, 0) scale(1)' },
          '50%':  { transform: 'translate(1px, -4px) scale(1.04)' },
          '65%':  { transform: 'translate(-1px, 0) scale(1)' },
          '85%':  { transform: 'translate(-1px, -2px) scale(1.02)' },
          '100%': { transform: 'translate(0, 0) scale(1)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(8px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'promo-ticker': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
