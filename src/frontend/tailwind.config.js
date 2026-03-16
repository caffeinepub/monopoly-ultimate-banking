/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Figtree", "sans-serif"],
        display: ["Bricolage Grotesque", "sans-serif"],
      },
      colors: {
        "board-bg": "#1a6b30",
        "board-cell": "#faf6ed",
        "board-corner": "#f0e8d0",
        "board-center": "#1a6b30",
        "board-border": "#1a5c28",
        "board-text": "#1a1a1a",
        "board-text-muted": "#555",
        "board-accent": "#b8860b",
        "board-price": "#006400",
        "board-logo": "#ffd700",
        "board-logo-sub": "#ffd700",
        board: {
          bg: "var(--board-bg)",
          cell: "var(--board-cell)",
          corner: "var(--board-corner)",
          center: "var(--board-center)",
          border: "var(--board-border)",
          text: "var(--board-text)",
          "text-muted": "var(--board-text-muted)",
          price: "var(--board-price)",
          accent: "var(--board-accent)",
          logo: "var(--board-logo)",
          "logo-sub": "var(--board-logo-sub)",
        },
        background: "oklch(var(--background))",
        foreground: "oklch(var(--foreground))",
        primary: {
          DEFAULT: "oklch(var(--primary))",
          foreground: "oklch(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "oklch(var(--secondary))",
          foreground: "oklch(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "oklch(var(--muted))",
          foreground: "oklch(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "oklch(var(--accent))",
          foreground: "oklch(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "oklch(var(--destructive))",
          foreground: "oklch(var(--destructive-foreground))",
        },
        border: "oklch(var(--border))",
        input: "oklch(var(--input))",
        ring: "oklch(var(--ring))",
        card: {
          DEFAULT: "oklch(var(--card))",
          foreground: "oklch(var(--card-foreground))",
        },
      },
      boxShadow: {
        board: "0 4px 32px -4px rgba(0,0,0,0.6), 0 0 0 2px rgba(255,255,255,0.05)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
