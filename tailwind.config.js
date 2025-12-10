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
        ciNavy: "#0A2540",
        ciSlate: "#1E293B",
        sapphire: {
          900: "#0B1221",
          800: "#111A2C",
          700: "#162238",
          600: "#1E2D4B",
        },
        slateglass: {
          800: "rgba(255,255,255,0.06)",
          700: "rgba(255,255,255,0.10)",
        },
      },
      boxShadow: {
        "ci-soft": "0 18px 40px rgba(15, 23, 42, 0.18)",
        card: "0 2px 12px rgba(0,0,0,0.35)",
      },
      borderRadius: {
        xl: "0.9rem",
      }
    }
  },
  plugins: []
};


