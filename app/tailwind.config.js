/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        body: ['"Silkscreen"', 'monospace'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        rpg: {
          void: '#0a0e1a',
          deep: '#0f1628',
          panel: '#141c33',
          border: '#2a3a5c',
          'border-light': '#3d5a8a',
          text: '#c8d6e5',
          'text-dim': '#6b7fa3',
          'text-bright': '#e8f0ff',
        },
        neon: {
          cyan: '#00e5ff',
          'cyan-dim': '#006b7a',
          magenta: '#ff2daa',
          'magenta-dim': '#7a1654',
          gold: '#ffd700',
          'gold-dim': '#7a6800',
          green: '#39ff14',
          'green-dim': '#1a7a0a',
          red: '#ff3333',
          'red-dim': '#7a1919',
          blue: '#4d8cff',
        },
        hp: { fill: '#39ff14', bg: '#0a2e06' },
        mp: { fill: '#4d8cff', bg: '#0a1a3e' },
        xp: { fill: '#ffd700', bg: '#2e2a06' },
      },
      boxShadow: {
        'pixel': '4px 4px 0px rgba(0,0,0,0.8)',
        'pixel-sm': '2px 2px 0px rgba(0,0,0,0.8)',
        'glow-cyan': '0 0 20px rgba(0,229,255,0.15), 0 0 60px rgba(0,229,255,0.05)',
        'glow-magenta': '0 0 20px rgba(255,45,170,0.15), 0 0 60px rgba(255,45,170,0.05)',
        'glow-gold': '0 0 20px rgba(255,215,0,0.15), 0 0 60px rgba(255,215,0,0.05)',
        'inner-panel': 'inset 0 2px 12px rgba(0,0,0,0.4)',
      },
      animation: {
        'blink': 'blink 1s step-end infinite',
        'scanline': 'scanline 8s linear infinite',
        'pixel-float': 'pixelFloat 3s ease-in-out infinite',
        'arrow-bounce': 'arrowBounce 0.6s ease-in-out infinite',
        'stat-fill': 'statFill 1.2s ease-out forwards',
        'cat-walk': 'catWalk 20s linear infinite',
        'cat-idle': 'catIdle 1.5s ease-in-out infinite',
        'typewriter-cursor': 'typewriterCursor 0.7s step-end infinite',
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'glitch': 'glitch 3s infinite',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        pixelFloat: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        arrowBounce: {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(4px)' },
        },
        statFill: {
          '0%': { width: '0%' },
          '100%': { width: 'var(--fill-width)' },
        },
        catWalk: {
          '0%': { transform: 'translateX(-60px)' },
          '45%': { transform: 'translateX(calc(100vw + 60px))' },
          '45.1%': { transform: 'translateX(calc(100vw + 60px)) scaleX(-1)' },
          '90%': { transform: 'translateX(-60px) scaleX(-1)' },
          '90.1%': { transform: 'translateX(-60px) scaleX(1)' },
          '100%': { transform: 'translateX(-60px) scaleX(1)' },
        },
        catIdle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-2px)' },
        },
        typewriterCursor: {
          '0%, 100%': { borderColor: 'currentColor' },
          '50%': { borderColor: 'transparent' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glitch: {
          '0%, 93%, 100%': { transform: 'translate(0)' },
          '94%': { transform: 'translate(-2px, 1px)' },
          '95%': { transform: 'translate(2px, -1px)' },
          '96%': { transform: 'translate(-1px, -1px)' },
          '97%': { transform: 'translate(1px, 2px)' },
        },
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '65ch',
            color: '#c8d6e5',
            a: {
              color: '#00e5ff',
              textDecoration: 'none',
              '&:hover': {
                color: '#ffd700',
              },
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
