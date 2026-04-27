import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./pages/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "./node_modules/@shadcn/ui/dist/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#FF7A39",
          accent:  "#E8453C",
          bg:      "#FFF5EB",
          fg:      "#16202B",
          border:  "#EDE3D2",
          green:   "#2ECC71",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        sans:    ["var(--font-inter)", "system-ui", "sans-serif"],
        mono:    ["var(--font-jetbrains)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
