/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef5ff",
          600: "#1557A6",
          700: "#0B2A5B"
        }
      }
    }
  },
  plugins: []
};
