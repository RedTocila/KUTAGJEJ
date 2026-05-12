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
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
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
