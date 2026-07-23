import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}', './lib/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        trust: {
          black: '#070709',
          panel: '#111116',
          violet: '#7C3AED',
          glow: '#A855F7',
          soft: '#C084FC',
        },
      },
      boxShadow: {
        glow: '0 0 40px rgba(168, 85, 247, 0.28)',
        panel: '0 20px 80px rgba(0,0,0,.45)',
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        pulseGlow: 'pulseGlow 2.8s ease-in-out infinite',
      },
      keyframes: {
        float: {'0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' }},
        pulseGlow: {'0%,100%': { boxShadow: '0 0 18px rgba(168,85,247,.25)' }, '50%': { boxShadow: '0 0 45px rgba(168,85,247,.55)' }},
      },
      backgroundImage: {
        'radial-trust': 'radial-gradient(circle at top right, rgba(124,58,237,.35), transparent 30%), radial-gradient(circle at 20% 20%, rgba(192,132,252,.18), transparent 28%)',
      },
    },
  },
  plugins: [],
};
export default config;
