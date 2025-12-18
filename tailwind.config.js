/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#E53935",       // rojo estilo banner
        primaryDark: "#B71C1C",
        charcoal: "#2B2B2B",
      },
      boxShadow: {
        soft: "0 10px 25px rgba(245, 234, 234, 0.25)"
      },
      backgroundImage: {
        'hero-gradient': "linear-gradient(135deg, #1f2937 0%, #0b0f14 60%)",
        'brand-gradient': "linear-gradient(135deg, #E53935 0%, #3b3b3b 100%)"
      },
      spacing: {
        '80': '20rem'   // para ml-80 del layout
      }
    },
  },
  plugins: [],
}
