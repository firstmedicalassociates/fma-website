import {
  WWW_TO_APEX_REDIRECT,
  WWW_TO_APEX_FALLBACK_REDIRECT,
  buildLegacyRedirects,
} from "./src/app/lib/config/legacy-redirects.mjs";

/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com https://www.googletagmanager.com https://www.google-analytics.com https://widget.emitrr.com https://www.google.com https://www.gstatic.com https://cdn.rlets.com https://bat.bing.com https://pubads.g.doubleclick.net https://beacon.krxd.net https://ssl.google-analytics.com https://tag.simpli.fi https://i.simpli.fi https://connect.facebook.net https://www.googleadservices.com https://pixel.mathtag.com https://reachlocal.thinkingchat.com https://eu.thinkingchat.com https://www.reachlocallivechat.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https: https://fault.rlets.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https: ws: wss: https://apgb2b-reachcodeandproxy.gannettdigital.com https://*.rlets.com https://capture-api.reachlocalservices.com https://um.simpli.fi",
      "frame-src https:",
    ].join("; "),
  },
];

const noStoreHeaders = [
  ...securityHeaders,
  { key: "Cache-Control", value: "no-store, max-age=0" },
];

// Keep the medical authorization page isolated from marketing/chat scripts and connections.
const medicalRecordsHeaders = [
  ...securityHeaders.filter(header => header.key !== "Content-Security-Policy"),
  { key: "Cache-Control", value: "private, no-store, max-age=0" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Content-Security-Policy", value: "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-src 'none'" },
];

const nextConfig = {
  skipTrailingSlashRedirect: true,
  outputFileTracingIncludes: {
    "/api/medical-records-release": ["./public/wp-content/uploads/2023/04/FMA-MR-release-4.18.23.pdf", "./src/assets/medical-records/NotoSans-Regular.ttf"],
    "/api/medical-records-request": ["./public/wp-content/uploads/2023/04/FMA-MR-request-4.18.23.pdf", "./src/assets/medical-records/NotoSans-Regular.ttf"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/search/:path*",
        headers: noStoreHeaders,
      },
      {
        source: "/api/search",
        headers: noStoreHeaders,
      },
      {
        source: "/api/ai-search",
        headers: noStoreHeaders,
      },
      {
        source: "/api/ai-search/:path*",
        headers: noStoreHeaders,
      },
      {
        source: "/patient-resources/medical-records-release/:path*",
        headers: medicalRecordsHeaders,
      },
      {
        source: "/api/medical-records-release",
        headers: medicalRecordsHeaders,
      },
      {
        source: "/patient-resources/medical-records-request/:path*",
        headers: medicalRecordsHeaders,
      },
      {
        source: "/api/medical-records-request",
        headers: medicalRecordsHeaders,
      },
    ];
  },
  async redirects() {
    return [
      WWW_TO_APEX_REDIRECT,
      WWW_TO_APEX_FALLBACK_REDIRECT,
      ...buildLegacyRedirects(),
    ];
  },
};

export default nextConfig;
