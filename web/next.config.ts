import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /** Local /public cards: avoid long-lived optimizer cache when filenames stay the same */
    minimumCacheTTL: 0,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
