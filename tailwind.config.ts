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
          DEFAULT: "var(--hb-primary)",
          hover:   "var(--hb-primary-hover)",
          soft:    "var(--hb-primary-soft)",
          accent:  "var(--hb-accent)",
          bg:      "var(--hb-bg)",
          warm:    "var(--hb-bg-warm)",
          fg:      "var(--hb-fg)",
          muted:   "var(--hb-fg-muted)",
          subtle:  "var(--hb-fg-subtle)",
          border:  "var(--hb-border)",
          success: "var(--hb-success)",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans:    ["var(--font-jakarta)", "system-ui", "sans-serif"],
        mono:    ["var(--font-jetbrains)", "monospace"],
      },
      borderRadius: {
        "hb-sm":   "8px",
        "hb-md":   "12px",
        "hb-lg":   "16px",
        "hb-xl":   "24px",
        "hb-pill": "9999px",
      },
      boxShadow: {
        "hb-soft": "0 1px 2px rgba(11,19,28,.04)",
        "hb-card": "0 8px 32px -8px rgba(11,19,28,.16), 0 2px 6px rgba(11,19,28,.04)",
        "hb-pop":  "0 12px 32px -8px rgba(11,19,28,.22)",
      },
    },
  },
  plugins: [],
};

export default config;
