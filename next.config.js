/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  typedRoutes: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Fix for module resolution issues
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './app'),
    };
    
    return config;
  },
}

module.exports = nextConfig;
