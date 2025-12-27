/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./app/(internal)/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Emergency Operations Center Theme
        ciNavy: "#1A1D29",
        ciSlate: "#2D3748",
        ciCyan: "#00D9FF",
        ciCyanHover: "#00B8D9",
        ciAmber: "#FFB020",
        ciSeverityHigh: "#FF3B5C",
        ciSeverityMedium: "#FF8A3D",
        ciSeverityLow: "#00E5A0",
        ciTextPrimary: "#FFFFFF",
        ciTextSecondary: "#B8BFCC",
        ciTextMuted: "#8B92A3",
        ciBorder: "#3A4556",
      },
      boxShadow: {
        "ci-soft": "0 4px 12px rgba(0, 0, 0, 0.4)",
        panel: "0 4px 12px rgba(0, 0, 0, 0.4)",
        "glow-cyan": "0 0 20px rgba(0, 217, 255, 0.15)",
        "glow-amber": "0 0 20px rgba(255, 176, 32, 0.15)",
      },
      borderRadius: {
        lg: "0.5rem",
      }
    }
  },
  plugins: []
};


