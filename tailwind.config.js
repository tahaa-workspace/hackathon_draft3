/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],

  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },

      colors: {
        ink: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#080f1e",
        },

        brand: {
          50: "#eef6ff",
          100: "#d9ecff",
          200: "#bcdeff",
          300: "#8ec8ff",
          400: "#59a8ff",
          500: "#3385fc",
          600: "#1d66f2",
          700: "#1651dc",
          800: "#1843b1",
          900: "#1a3d8b",
        },

        accent: {
          cyan: "#22d3ee",
          violet: "#8b5cf6",
          gold: "#f59e0b",
          mint: "#10b981",
        },
      },

      boxShadow: {
        card:
          "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.06)",

        glow:
          "0 18px 55px rgba(29, 102, 242, 0.18)",

        premium:
          "0 30px 80px rgba(15, 23, 42, 0.12)",
      },
    },
  },

  plugins: [],
};
