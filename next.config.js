/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // WARNING: This allows production builds to complete even with type errors
    // Type errors will still be caught in development and by IDE
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;



