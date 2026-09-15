import type { NextConfig } from 'next';

const nextConfig: NextConfig = process.env.GITHUB_PAGES === 'true'
  ? {
      output: 'export',
      assetPrefix: '/references-board',
      trailingSlash: true,
    }
  : {};

export default nextConfig;
