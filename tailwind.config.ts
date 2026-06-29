import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // AETHON — Deep Teal + Gold (premium industrial / "heavenly")
        abyss: "#03100f",       // deepest base, near-black teal
        base: "#061a18",        // app background
        surface: "#0a2422",     // raised cards
        surface2: "#0e302d",    // elevated panels
        border: "#13413c",      // subtle teal border
        teal: "#1fb8a6",        // primary teal
        tealGlow: "#36e9d2",    // bright glow accent
        gold: "#d9b15e",        // warm gold accent
        goldGlow: "#f4d488",    // bright gold
        text: "#eafaf6",        // primary text (warm white)
        muted: "#7fa39c",       // secondary text
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        "radial-teal":
          "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(54,233,210,0.18), transparent 70%)",
        "radial-gold":
          "radial-gradient(ellipse 60% 40% at 80% 20%, rgba(217,177,94,0.14), transparent 70%)",
        "grid-faint":
          "linear-gradient(rgba(31,184,166,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(31,184,166,0.04) 1px, transparent 1px)",
        "gold-sheen":
          "linear-gradient(110deg, transparent 30%, rgba(244,212,136,0.35) 50%, transparent 70%)",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(31,184,166,0.18), 0 8px 40px rgba(0,0,0,0.5)",
        "glow-teal": "0 0 30px rgba(54,233,210,0.25), 0 0 80px rgba(31,184,166,0.12)",
        "glow-gold": "0 0 30px rgba(244,212,136,0.22), 0 0 70px rgba(217,177,94,0.1)",
      },
      keyframes: {
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        floatSlow: {
          "0%,100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-20px) rotate(2deg)" },
        },
        pulseGlow: {
          "0%,100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        gradientShift: {
          "0%,100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        spinSlow: { to: { transform: "rotate(360deg)" } },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        floatSlow: "floatSlow 9s ease-in-out infinite",
        pulseGlow: "pulseGlow 3s ease-in-out infinite",
        shimmer: "shimmer 3s linear infinite",
        gradientShift: "gradientShift 8s ease infinite",
        spinSlow: "spinSlow 30s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
