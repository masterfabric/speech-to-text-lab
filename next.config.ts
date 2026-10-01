import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async rewrites() {
    return [
      { source: "/slides", destination: "/slides/index.html" },
      { source: "/slides/", destination: "/slides/index.html" },
    ];
  },
};

export default nextConfig;
