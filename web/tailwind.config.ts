import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(240 10% 4%)",
        foreground: "hsl(0 0% 98%)",
        muted: "hsl(240 4% 16%)",
        "muted-foreground": "hsl(240 5% 65%)",
        border: "hsl(240 4% 16%)",
        accent: "hsl(25 95% 53%)",
        card: "hsl(240 6% 10%)",
      },
    },
  },
  plugins: [],
};

export default config;
