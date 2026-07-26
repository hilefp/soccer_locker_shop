import type { NextConfig } from "next";

export default {
  images: {
    formats: ["image/avif", "image/webp"],
    // Dev only: allow the image optimizer to fetch from localhost (backend uploads)
    ...(process.env.NODE_ENV === "development"
      ? { dangerouslyAllowLocalIP: true }
      : {}),
    remotePatterns: [
      { hostname: "**.githubassets.com", protocol: "https" },
      { hostname: "**.githubusercontent.com", protocol: "https" },
      { hostname: "**.googleusercontent.com", protocol: "https" },
      { hostname: "**.ufs.sh", protocol: "https" },
      { hostname: "**.unsplash.com", protocol: "https" },
      { hostname: "**.soccerlocker.com", protocol: "https" },
      { hostname: "myuniformsoccerlocker.com", protocol: "https" },
      { hostname: "api.github.com", protocol: "https" },
      { hostname: "utfs.io", protocol: "https" },
      { hostname: "soccerlocker-demo.s3.us-east-1.amazonaws.com", protocol: "https" },
      // Local dev: backend serves uploads at http://localhost:4000/uploads
      { hostname: "localhost", protocol: "http" },
    ],
  },
} satisfies NextConfig;
