import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@univer/contract'],
  output: 'standalone',
  reactStrictMode: true,
};

export default nextConfig;
