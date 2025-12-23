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
      },
      boxShadow: {
        "ci-soft": "0 1px 3px rgba(0, 0, 0, 0.08)",
        panel: "0 1px 3px rgba(0, 0, 0, 0.08)",
      },
      borderRadius: {
        lg: "0.5rem",
      }
    }
  },
  plugins: []
};


