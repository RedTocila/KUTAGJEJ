/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'retireesystem-backend.vercel.app',
        pathname: '/**',
      },
    ],
    unoptimized: process.env.NODE_ENV !== 'production',
  },

  trailingSlash: false,

  poweredByHeader: false,

  output: 'standalone',

  productionBrowserSourceMaps: false,
};

export default config;
