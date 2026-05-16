import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#221B22",
        champagne: "#F7E7D7",
        rose: "#C87486",
        blush: "#FFF7F8",
        plum: "#61364B",
        sage: "#7B9071"
      },
      boxShadow: {
        soft: "0 20px 60px rgba(97, 54, 75, 0.12)"
      }
    }
  },
  plugins: []
};
export default config;
