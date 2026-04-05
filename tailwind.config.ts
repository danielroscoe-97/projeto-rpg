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
        // Brand gold — CTA buttons, headings, primary accent
        gold: {
          DEFAULT: "#D4A853",
          light: "#E8C87A",
          dark: "#B8903D",
          hover: "#C49A48", // hover state for gold CTAs
        },
        // Oracle AI accent — slightly cooler/greener gold than brand
        oracle: {
          DEFAULT: "#c9a959",
          light: "#e8e4d0", // foreground text on oracle surfaces
        },
        warm: "#E8593C",
        cool: "#5B8DEF",
        "brand-red": "#C43C3C",
        "brand-green": "#4A9E5C",
        // Purple — temporary HP indicator
        "temp-hp": "#9f7aea",
        // Surface depth scale — darkest to lightest
        surface: {
          primary: "#13131E",   // page background
          secondary: "#1A1A28", // panels, sidebars
          tertiary: "#222234",  // cards, nested surfaces
          deep: "#0e0e18",      // deepest bg (compendium scroll areas)
          overlay: "#1a1a2e",   // modals, tooltips, overlays
          auth: "#16213e",      // auth/dialog modals (blue-navy tint)
        },
        // SRD statblock colors — parchment theme
        srd: {
          parchment: "#fdf1dc", // statblock background
          ink: "#1a1a1a",       // body text on parchment
          header: "#7a200d",    // section headers, borders, labels
          subtitle: "#e8d5b5",  // subtitles, metadata
          accent: "#922610",    // secondary accent
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
        "tour-pulse": {
          "0%, 100%": { opacity: "0.4", strokeWidth: "2" },
          "50%": { opacity: "1", strokeWidth: "3" },
        },
        "tour-pulse-intense": {
          "0%": { opacity: "0.6", strokeWidth: "3" },
          "25%": { opacity: "1", strokeWidth: "5" },
          "50%": { opacity: "0.8", strokeWidth: "4" },
          "75%": { opacity: "1", strokeWidth: "5" },
          "100%": { opacity: "0.6", strokeWidth: "3" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "torch-flicker": "torch-flicker 3s ease-in-out infinite",
        "ember-float": "ember-float 4s ease-out infinite",
        "rune-pulse": "rune-pulse 4s ease-in-out infinite",
        "tour-pulse": "tour-pulse 2s ease-in-out infinite",
        "tour-pulse-intense": "tour-pulse-intense 0.5s ease-in-out 2",
        "fade-in": "fade-in 0.6s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
