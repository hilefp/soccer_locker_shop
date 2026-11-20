import type { NextConfig } from "next";

/**
 * Content-Security-Policy for the payment page (payment audit F-14 / PCI DSS
 * v4 6.4.3): only Square's Web Payments SDK and the 3DS (Cardinal) provider
 * may run scripts or frames there. Card is the only payment method (no Apple
 * Pay / Google Pay). Card data itself lives
 * in Square's iframes; this limits what else can run next to them.
 * 'unsafe-inline' is required by Next's inline bootstrap without nonces;
 * 'unsafe-eval' only in development (React Refresh).
 */
const isDev = process.env.NODE_ENV === "development";
const apiOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? "").origin;
  } catch {
    return "";
  }
})();
const SQUARE = [
  "https://*.squarecdn.com",
  "https://*.squareup.com",
  "https://*.squareupsandbox.com",
];
// Square's SDK fonts (CloudFront) and its own error telemetry (Sentry)
const SQUARE_FONTS = ["https://d1g145x70srn7h.cloudfront.net"];
const SQUARE_TELEMETRY = ["https://*.ingest.sentry.io"];
// Vercel Speed Insights (already used by the app)
const VERCEL = ["https://va.vercel-scripts.com"];
const THREE_DS = ["https://*.cardinalcommerce.com"];
const checkoutCsp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${[...SQUARE, ...THREE_DS, ...VERCEL].join(" ")}`,
  `frame-src 'self' ${[...SQUARE, ...THREE_DS].join(" ")}`,
  `connect-src 'self' ${apiOrigin} ${[...SQUARE, ...SQUARE_TELEMETRY, ...THREE_DS, ...VERCEL].join(" ")}${isDev ? " ws: http://localhost:*" : ""}`,
  "img-src 'self' data: blob: https:" + (isDev ? " http://localhost:*" : ""),
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com ${SQUARE.join(" ")}`,
  `font-src 'self' data: https://fonts.gstatic.com ${[...SQUARE, ...SQUARE_FONTS].join(" ")}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

export default {
  async headers() {
    return [
      {
        source: "/checkout",
        headers: [
          { key: "Content-Security-Policy", value: checkoutCsp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
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
