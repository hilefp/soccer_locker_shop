import type { NextConfig } from "next";

export default {
  eslint: { ignoreDuringBuilds: true },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { hostname: "**.githubassets.com", protocol: "https" },
      { hostname: "**.githubusercontent.com", protocol: "https" },
      { hostname: "**.googleusercontent.com", protocol: "https" },
      { hostname: "**.ufs.sh", protocol: "https" },
      { hostname: "**.unsplash.com", protocol: "https" },
      { hostname: "**.soccerlocker.com", protocol: "https" },
      { hostname: "api.github.com", protocol: "https" },
      { hostname: "utfs.io", protocol: "https" },
      { hostname: "soccerlocker-demo.s3.us-east-1.amazonaws.com", protocol: "https" },
    ],
  },
} satisfies NextConfig;
