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
        // Canvas & Surfaces (design_system.md §4)
        canvas: '#090A0C',
        panel: '#0E1013',
        elevated: '#16191E',
        'fw-border': 'hsla(220, 10%, 60%, 0.15)',
        'fw-border-active': 'hsla(220, 10%, 80%, 0.25)',
        // Typography Colors
        'text-primary': '#F3F5F7',
        'text-secondary': '#8B95A5',
        'text-muted': '#5C6470',
        // Accent & Telemetry
        'f1-red': '#FF1801',
        'drs-cyan': '#00E5FF',
        'teammate-yellow': '#FFD600',
        // Tire Compounds
        'tire-soft': '#FF2B49',
        'tire-medium': '#FFD600',
        'tire-hard': '#E5E7EB',
        'tire-inter': '#1BC944',
        'tire-wet': '#0D6EFD',
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Roboto Mono', 'monospace'],
      },
      fontSize: {
        'display': ['32px', { lineHeight: '1.2', letterSpacing: '-0.03em', fontWeight: '600' }],
        'h1': ['20px', { lineHeight: '1.3', letterSpacing: '-0.02em', fontWeight: '600' }],
        'h2': ['14px', { lineHeight: '1.4', letterSpacing: '-0.01em', fontWeight: '500' }],
        'body': ['14px', { lineHeight: '1.55', letterSpacing: '0.01em', fontWeight: '400' }],
        'mono-data': ['13px', { lineHeight: '1.4', letterSpacing: '0em', fontWeight: '500' }],
        'mono-meta': ['11px', { lineHeight: '1.3', letterSpacing: '0.02em', fontWeight: '400' }],
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
        'card': '4px',
        'button': '2px',
      },
      maxWidth: {
        'thread': '768px',
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
