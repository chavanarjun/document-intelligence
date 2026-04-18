import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "books.toscrape.com",
      },
      {
        protocol: "http",
        hostname: "books.toscrape.com",
      },
    ],
  },
};

export default nextConfig;
