import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ivory: "#f7f3ec",
        gold: {
          DEFAULT: "#b88a44",
          soft: "#d8b98b",
          deep: "#8b642b"
        },
        ink: "#090807"
      },
      boxShadow: {
        luxe: "0 28px 90px rgba(5, 5, 5, 0.16)"
      },
      backgroundImage: {
        "gold-haze":
          "radial-gradient(circle at top, rgba(216, 185, 139, 0.18), transparent 40%), radial-gradient(circle at bottom right, rgba(184, 138, 68, 0.12), transparent 30%)"
      }
    }
  },
  plugins: []
};

export default config;
