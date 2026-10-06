import type { NextConfig } from "next";

// Basic hardening for every page and API route.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Workshop pages live at /@name (a folder can't start with "@": that marks a parallel route).
  rewrites() {
    return [{ source: "/@:slug", destination: "/p/:slug" }];
  },
};

export default nextConfig;
