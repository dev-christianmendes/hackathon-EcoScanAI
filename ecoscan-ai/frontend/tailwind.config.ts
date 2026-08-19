import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // EcoScan brand palette
        eco: {
          green: "#22C55E",
          blue: "#3B82F6",
          yellow: "#EAB308",
          red: "#EF4444",
          amber: "#A16207",
          dark: "#0F172A",
          card: "#1E293B",
          border: "#334155",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "eco-gradient": "linear-gradient(135deg, #0F172A 0%, #1a2744 50%, #0F172A 100%)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 3s linear infinite",
      },
    },
  },
  plugins: [],
  safelist: [
    // Ensure dynamic Tailwind color classes are not purged
    { pattern: /bg-(yellow|blue|green|red|amber|gray)-(100|200|500|600|900)/ },
    { pattern: /text-(yellow|blue|green|red|amber)-(400|500|600)/ },
    { pattern: /border-(yellow|blue|green|red|amber)-(400|500)/ },
    { pattern: /ring-(yellow|blue|green|red|amber)-(400|500)/ },
    { pattern: /shadow-(yellow|blue|green|red|amber)-(900)/ },
    { pattern: /from-(yellow|blue|green|red|amber)-(500)/ },
  ],
};

export default config;
