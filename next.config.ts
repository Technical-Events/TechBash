import type { NextConfig } from "next";

const dev = process.env.NODE_ENV === "development";

/**
 * Content-Security-Policy without nonces, so pages stay prerendered (a
 * nonce policy makes every page dynamic). Next.js needs inline scripts and
 * styles; everything else is limited to this site, plus Vercel Blob photos.
 * Development adds what React's dev tooling and hot reload use.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com",
  "font-src 'self'",
  `connect-src 'self'${dev ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // Only on Vercel: plain-HTTP local runs (next start) must keep working.
  ...(process.env.VERCEL ? ["upgrade-insecure-requests"] : []),
].join("; ");

const nextConfig: NextConfig = {
  // No "x-powered-by: Next.js" header.
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Team and faculty photos uploaded to Vercel Blob by the admin panel.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/people/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      // Photo uploads are capped at 2 MB (lib/validations/content.ts).
      bodySizeLimit: "3mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          // HTTPS only from now on. Vercel serves HTTPS; skipped for local
          // plain-HTTP runs. No includeSubDomains: other sites on a shared
          // parent domain are not ours to force.
          ...(process.env.VERCEL
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000",
                },
              ]
            : []),
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
