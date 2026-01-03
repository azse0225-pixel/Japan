/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig = {
  // 1. 修復圖片網域警告 (改用 remotePatterns)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'maps.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  // 2. 為了讓 Turbopack 安靜，我們給它一個空設定，但主要還是靠下一步的 flag
  experimental: {
    turbo: {},
  }
};

module.exports = withPWA(nextConfig);