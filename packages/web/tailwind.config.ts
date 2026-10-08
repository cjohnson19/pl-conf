import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";
import tailwindcssAnimate from "tailwindcss-animate";
import containerQueries from "@tailwindcss/container-queries";

// Set on <html> before first paint by lib/pre-paint.ts.
const osVariant = plugin(({ addVariant }) => {
  addVariant("os-mac", '[data-os="mac"] &');
});

export default {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Background + foreground palette (canonical)
        bg: "var(--bg)",
        "bg-2": "var(--bg-2)",
        card: "var(--card)",
        fg: "var(--fg)",
        "fg-2": "var(--fg-2)",
        "fg-3": "var(--fg-3)",
        border: "var(--border)",
        accent: "var(--accent)",
        urgent: "var(--urgent)",
      },
      borderColor: {
        DEFAULT: "var(--border)",
      },
      borderRadius: {
        xs: "2px",
        sm: "4px",
        md: "6px",
        lg: "8px",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
    },
  },
  plugins: [tailwindcssAnimate, containerQueries, osVariant],
} satisfies Config;
