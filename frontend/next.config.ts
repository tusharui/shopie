import type { NextConfig } from "next";

const BACKEND_URL = process.env.API_BACKEND_URL || "https://shopie-api.vercel.app";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
