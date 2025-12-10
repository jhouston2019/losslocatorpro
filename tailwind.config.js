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
        ciSlate: "#1E293B"
      },
      boxShadow: {
        "ci-soft": "0 18px 40px rgba(15, 23, 42, 0.18)"
      },
      borderRadius: {
        xl: "0.75rem"
      }
    }
  },
  plugins: []
};


