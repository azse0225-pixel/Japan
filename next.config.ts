/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // 開發模式下不啟用 PWA
});

const nextConfig = {
  // 您原本的設定 (如果有)
  images: {
    domains: ['maps.googleapis.com', 'lh3.googleusercontent.com'], // 允許 Google 圖片
  },
};

module.exports = withPWA(nextConfig);