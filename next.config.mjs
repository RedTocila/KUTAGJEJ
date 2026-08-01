/** @type {import('next').NextConfig} */
const backendOrigin = (process.env.API_URL || 'http://localhost:5001').replace(/\/$/, '');

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

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },

  trailingSlash: false,

  poweredByHeader: false,

  productionBrowserSourceMaps: false,
};

export default config;
