/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
    './src/components/**/*.{js,jsx}',
    './src/pages/**/*.{js,jsx}',
    './src/lib/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Canvas & Surfaces — Official F1 Broadcast Carbon Theme
        canvas: 'var(--bg-canvas)',
        panel: 'var(--bg-panel)',
        elevated: 'var(--bg-elevated)',
        'fw-border': 'var(--border-subtle)',
        'fw-border-medium': 'var(--border-medium)',
        'fw-border-active': 'var(--border-active)',
        
        // Official F1 Sector Timing Palette
        'sector-purple': 'var(--sector-purple)',
        'sector-purple-bg': 'var(--sector-purple-bg)',
        'sector-purple-border': 'var(--sector-purple-border)',
        'sector-green': 'var(--sector-green)',
        'sector-green-bg': 'var(--sector-green-bg)',
        'sector-green-border': 'var(--sector-green-border)',
        'sector-yellow': 'var(--sector-yellow)',
        'sector-yellow-bg': 'var(--sector-yellow-bg)',
        'sector-yellow-border': 'var(--sector-yellow-border)',

        // Typography Colors
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'text-dim': 'var(--text-dim)',

        // Accent & Telemetry
        'f1-red': 'var(--f1-red)',
        'drs-cyan': 'var(--driver-chaser)',
        'teammate-yellow': 'var(--driver-defender)',

        // Tire Compounds
        'tire-soft': '#FF2B49',
        'tire-medium': '#FFD600',
        'tire-hard': '#FFFFFF',
        'tire-inter': '#00D26A',
        'tire-wet': '#0D6EFD',
      },
      fontFamily: {
        f1: ['Titillium Web', 'Barlow Condensed', 'Outfit', 'sans-serif'],
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Roboto Mono', 'monospace'],
      },
      fontSize: {
        'display': ['32px', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
        'h1': ['22px', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '700' }],
        'h2': ['16px', { lineHeight: '1.4', letterSpacing: '0em', fontWeight: '600' }],
        'body': ['14px', { lineHeight: '1.6', letterSpacing: '0.01em', fontWeight: '400' }],
        'mono-data': ['13px', { lineHeight: '1.4', letterSpacing: '0em', fontWeight: '600' }],
        'mono-meta': ['11px', { lineHeight: '1.3', letterSpacing: '0.03em', fontWeight: '500' }],
      },
      spacing: {
        'xxs': '4px',
        'xs': '8px',
        'sm-space': '12px',
        'md-space': '16px',
        'lg-space': '24px',
        'xl-space': '32px',
        'xxl': '48px',
      },
      borderRadius: {
        'card': '6px',
        'button': '4px',
      },
      maxWidth: {
        'thread': '100%',
        'canvas': '1600px',
      },
      transitionTimingFunction: {
        'fw': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'fw-out': 'cubic-bezier(0.4, 0, 1, 1)',
      },
      keyframes: {
        'cursor-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'trace-draw': {
          from: { strokeDashoffset: '1000' },
          to: { strokeDashoffset: '0' },
        },
        'skeleton-shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(8px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'score-fill': {
          from: { strokeDashoffset: 'var(--score-circumference)' },
          to: { strokeDashoffset: 'var(--score-offset)' },
        },
      },
      animation: {
        'cursor-pulse': 'cursor-pulse 1s infinite',
        'trace-draw': 'trace-draw 800ms ease forwards',
        'skeleton': 'skeleton-shimmer 1.5s linear infinite',
        'slide-up': 'slide-up 150ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slide-in-right 150ms cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fade-in 150ms ease',
        'score-fill': 'score-fill 600ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
    },
  },
  plugins: [],
};
