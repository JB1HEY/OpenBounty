import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0f172a', // Slate 900
        surface: '#1e293b',    // Slate 800
        primary: '#3b82f6',    // Blue 500
        secondary: '#60a5fa',  // Blue 400
        accent: '#93c5fd',     // Blue 300
        border: '#2563eb',     // Blue 600
        input: '#1e293b',      // Slate 800
        ring: '#3b82f6',       // Blue 500
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-glow': 'conic-gradient(from 180deg at 50% 50%, #3b82f6 0deg, #60a5fa 180deg, #93c5fd 360deg)',
      },
    },
  },
  plugins: [],
}
export default config