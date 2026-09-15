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
        // Surfaces — Official F1 Broadcast Carbon Theme
        canvas: 'var(--surface-canvas)',
        'surface-canvas': 'var(--surface-canvas)',
        'surface-base': 'var(--surface-base)',
        'surface-raised': 'var(--surface-raised)',
        'surface-overlay': 'var(--surface-overlay)',
        'surface-subtle': 'var(--surface-subtle)',
        panel: 'var(--surface-base)',
        elevated: 'var(--surface-raised)',
        overlay: 'var(--surface-overlay)',

        // Borders & Dividers
        'fw-border': 'var(--border-subtle)',
        'fw-border-medium': 'var(--border-medium)',
        'fw-border-active': 'var(--border-strong)',
        'border-subtle': 'var(--border-subtle)',
        'border-medium': 'var(--border-medium)',
        'border-strong': 'var(--border-strong)',
        'border-focus': 'var(--border-focus)',
        
        // Official F1 Sector Timing Palette
        'timing-purple': 'var(--timing-purple)',
        'timing-green': 'var(--timing-green)',
        'timing-yellow': 'var(--timing-yellow)',
        'sector-purple': 'var(--timing-purple)',
        'sector-purple-bg': 'var(--timing-purple-subtle)',
        'sector-purple-border': 'var(--timing-purple-border)',
        'sector-green': 'var(--timing-green)',
        'sector-green-bg': 'var(--timing-green-subtle)',
        'sector-green-border': 'var(--timing-green-border)',
        'sector-yellow': 'var(--timing-yellow)',
        'sector-yellow-bg': 'var(--timing-yellow-subtle)',
        'sector-yellow-border': 'var(--timing-yellow-border)',

        // Typography Colors
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'text-dim': 'var(--text-dim)',
        'text-disabled': 'var(--text-disabled)',
        'text-accent': 'var(--text-accent)',

        // Accent & Brand (Speed Red)
        'f1-red': 'var(--accent-primary)',
        'accent-primary': 'var(--accent-primary)',
        'accent-hover': 'var(--accent-primary-hover)',
        'accent-active': 'var(--accent-primary-active)',
        'accent-danger': 'var(--accent-danger)',
        'accent-warning': 'var(--accent-warning)',
        'accent-success': 'var(--accent-success)',
        'drs-cyan': 'var(--accent-primary)',
        'teammate-yellow': 'var(--timing-yellow)',

        // Tyre Compounds
        'tyre-soft': 'var(--tyre-soft)',
        'tyre-medium': 'var(--tyre-medium)',
        'tyre-hard': 'var(--tyre-hard)',
        'tyre-inter': 'var(--tyre-inter)',
        'tyre-wet': 'var(--tyre-wet)',
        'tire-soft': 'var(--tyre-soft)',
        'tire-medium': 'var(--tyre-medium)',
        'tire-hard': 'var(--tyre-hard)',
        'tire-inter': 'var(--tyre-inter)',
        'tire-wet': 'var(--tyre-wet)',
      },
      fontFamily: {
        display: ['Barlow Condensed', 'Titillium Web', 'Outfit', 'sans-serif'],
        f1: ['Barlow Condensed', 'Titillium Web', 'Outfit', 'sans-serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        body: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
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
