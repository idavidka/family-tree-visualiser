/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./node_modules/flowbite-react/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    screens: {
      'mc': '400px',
      // => @media (min-width: 400px) { ... }

      'sm': '640px',
      // => @media (min-width: 640px) { ... }

      'md': '768px',
      // => @media (min-width: 768px) { ... }

      'lg': '1024px',
      // => @media (min-width: 1024px) { ... }

      'xl': '1280px',
      // => @media (min-width: 1280px) { ... }

      '2xl': '1536px',
      // => @media (min-width: 1536px) { ... }
  },
    extend: {
      keyframes: {
        pulse2: {
          '0%, 100%': {
            opacity: 0.5,
          },
          '50%': {
            opacity: 0.2
          }
        },
        ping2: {
          '75%, 100%': {
            transform: 'scale(1.2)'
          }
        }
      },
      animation: {
        pulse2: 'pulse2 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        ping2: 'ping2 1s cubic-bezier(0, 0, 0.2, 1) infinite'
      }
    },
  },
  plugins: [require('flowbite/plugin')],
}

