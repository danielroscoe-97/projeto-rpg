import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-cinzel)", "Cinzel", "serif"],
        sans: ["var(--font-jakarta)", "Plus Jakarta Sans", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        gold: {
          DEFAULT: "#D4A853",
          light: "#E8C87A",
          dark: "#B8903D",
        },
        warm: "#E8593C",
        cool: "#5B8DEF",
        "brand-red": "#C43C3C",
        "brand-green": "#4A9E5C",
        surface: {
          primary: "#13131E",
          secondary: "#1A1A28",
          tertiary: "#222234",
        },
        rpg: {
          "fire-dark": "#7f1d1d",
          "fire-mid": "#c2410c",
          "fire-warm": "#E8593C",
          ember: "#f59e0b",
          torch: "#fbbf24",
          parchment: "#2a2520",
          stone: "#1e1e2a",
        },
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        card: "0 4px 32px rgba(0, 0, 0, 0.4)",
        "gold-glow": "0 0 15px rgba(212, 168, 83, 0.4)",
        "gold-glow-lg": "0 0 25px rgba(212, 168, 83, 0.5)",
      },
      transitionTimingFunction: {
        theme: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      keyframes: {
        "torch-flicker": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.85" },
        },
        "ember-float": {
          "0%": { transform: "translateY(0) scale(1)", opacity: "0.6" },
          "100%": { transform: "translateY(-20px) scale(0.5)", opacity: "0" },
        },
        "rune-pulse": {
          "0%, 100%": { boxShadow: "0 0 8px rgba(212,168,83,0.3)" },
          "50%": { boxShadow: "0 0 20px rgba(212,168,83,0.6)" },
        },
      },
      animation: {
        "torch-flicker": "torch-flicker 3s ease-in-out infinite",
        "ember-float": "ember-float 4s ease-out infinite",
        "rune-pulse": "rune-pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
