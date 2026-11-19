/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: "#09090b",
        surface: "#111114",
        line: "#27272a",
        violet: { 400: "#a78bfa", 500: "#8b5cf6", 600: "#7c3aed" }
      },
      fontFamily: { sans: ["Inter", "sans-serif"], mono: ["DM Mono", "monospace"] },
      boxShadow: { glow: "0 0 48px rgba(139,92,246,.18)" }
    }
  },
  plugins: []
};
