import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gateway.pinit.io',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
