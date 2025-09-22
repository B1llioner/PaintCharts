/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  env: {
    COINGLASS_API_KEY: process.env.COINGLASS_API_KEY || '57e6078b48cf4f2bb9a308fabde7a594',
    COINGLASS_API_BASE: 'https://open-api-v4.coinglass.com/api',
  },
  async rewrites() {
    return [
      {
        source: '/api/coinglass/:path*',
        destination: 'https://open-api-v4.coinglass.com/api/:path*',
      },
    ];
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
};

module.exports = nextConfig;
