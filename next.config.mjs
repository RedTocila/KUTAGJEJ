/** @type {import('next').NextConfig} */
const backendOrigin = (process.env.API_URL || 'http://localhost:5001').replace(/\/$/, '');
const backendHostname = (() => {
  try {
    return new URL(backendOrigin).hostname;
  } catch {
    return null;
  }
})();

const config = {
  reactStrictMode: true,

  // AI import (and similar) can exceed the default 30s rewrite proxy timeout.
  experimental: {
    proxyTimeout: 120_000,
  },

  images: {
    remotePatterns: [
      ...(backendHostname
        ? [
            {
              protocol: 'https',
              hostname: backendHostname,
              pathname: '/**',
            },
          ]
        : []),
      {
        protocol: 'https',
        hostname: 'retireesystem-backend.vercel.app',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
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
