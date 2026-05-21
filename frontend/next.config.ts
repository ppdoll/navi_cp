import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  webpack: (config, { isServer, nextRuntime }) => {
    const needsNodeFallback = !isServer || nextRuntime === 'edge';
    if (needsNodeFallback) {
      config.resolve = config.resolve ?? {};
      config.resolve.fallback = {
        ...(config.resolve.fallback ?? {}),
        fs: false,
        path: false,
        url: false,
      };
    }
    return config;
  },
};

export default nextConfig;

