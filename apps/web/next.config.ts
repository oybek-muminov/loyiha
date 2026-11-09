import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@univer/contract'],
  output: 'standalone',
  reactStrictMode: true,
  async rewrites() {
    // Mini App va API bitta domenda ishlashi uchun same-origin proxy.
    // Brauzer `/api/v1/...` ga murojaat qiladi, Next uni API'ga uzatadi.
    const target = process.env.API_PROXY_TARGET ?? 'http://localhost:4000';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${target.replace(/\/$/, '')}/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
