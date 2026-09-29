import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The multiplayer backend is executed as native ESM on Vercel and therefore
  // uses explicit `.js` specifiers. Resolve those specifiers to the TypeScript
  // sources when the same game modules are bundled for the browser.
  webpack(config) {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
      '.jsx': ['.tsx', '.jsx'],
    };
    return config;
  },
};

export default nextConfig;
