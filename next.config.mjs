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
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com https://www.googletagmanager.com https://www.google-analytics.com https://widget.emitrr.com https://www.google.com https://www.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https: ws: wss:",
      "frame-src https:",
    ].join("; "),
  },
];

const noStoreHeaders = [
  ...securityHeaders,
  { key: "Cache-Control", value: "no-store, max-age=0" },
];

const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/search",
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
    ];
  },
  async redirects() {
    return [
      { source: "/about-us", destination: "/about", permanent: true },
      { source: "/contact-us", destination: "/contact", permanent: true },
      { source: "/jobs", destination: "/about/careers", permanent: true },
      { source: "/resources", destination: "/patient-resources", permanent: true },
      { source: "/insurances", destination: "/patient-resources/insurance", permanent: true },
      { source: "/billing-questions", destination: "/patient-resources/insurance", permanent: true },
      { source: "/accessibility-notice", destination: "/accessibility", permanent: true },
      {
        source: "/blog/navigating-healthcare-choices-in-maryland-er-urgent-care-and-primary-doctor",
        destination: "/blog/navigating-healthcare-choices-in-maryland-er-specialized-care-and-primary-doctor",
        permanent: true,
      },
      {
        source: "/blog/why-first-medical-associates-is-your-go-to-walk-in-clinic-for-convenient-quality-care",
        destination: "/blog/why-first-medical-associates-is-your-go-to-for-same-day-appointments",
        permanent: true,
      },
      { source: "/columbia", destination: "/location/columbia", permanent: true },
      { source: "/robin-codjoe", destination: "/providers/robin-codjoe", permanent: true },
      { source: "/elesa-yihdego", destination: "/providers/elesa-yihdego", permanent: true },
      { source: "/ilan-kokotek-2", destination: "/providers/ilan-kokotek-2", permanent: true },
      { source: "/alexander-jimenez", destination: "/providers/alexander-jimenez", permanent: true },
      { source: "/paula-moon-2", destination: "/providers/paula-moon-2", permanent: true },
      { source: "/soma-mitra", destination: "/providers/soma-mitra", permanent: true },
      { source: "/lily-grainger-2", destination: "/providers/lily-grainger-2", permanent: true },
      { source: "/janelle-dennis", destination: "/providers/janelle-dennis", permanent: true },
      { source: "/grace-nzouatcham", destination: "/providers/grace-nzouatcham", permanent: true },
      { source: "/faith-kim", destination: "/providers/faith-kim", permanent: true },
      { source: "/susana-beza-2", destination: "/providers/susana-beza-2", permanent: true },
      { source: "/liu-manchang-2", destination: "/providers/liu-manchang-2", permanent: true },
      { source: "/monica-braland", destination: "/providers/monica-braland", permanent: true },
      { source: "/providers/anita-kunwar-md", destination: "/providers/anita-kunwar", permanent: true },
      { source: "/providers/angelique-ramirez", destination: "/providers", permanent: true },
      { source: "/providers/ashley-myatt", destination: "/providers", permanent: true },
      { source: "/providers/eleanor-dzozomenyo-fnp", destination: "/providers", permanent: true },
      { source: "/providers/kimaya-vaidya", destination: "/providers", permanent: true },
      { source: "/providers/ronald-attanasio", destination: "/providers", permanent: true },
      { source: "/providers/yvonne-tukei", destination: "/providers", permanent: true },
      { source: "/service/adhd", destination: "/service/primary-care", permanent: true },
      { source: "/service/anxiety", destination: "/service/depression", permanent: true },
      { source: "/service/arthritis", destination: "/service/primary-care", permanent: true },
      { source: "/service/eczema", destination: "/service/skin-rash-and-eczema", permanent: true },
      { source: "/service/migraines", destination: "/service/primary-care", permanent: true },
      { source: "/service/walk-in-services", destination: "/service/same-day-care", permanent: true },
      { source: "/service/urgent-needs", destination: "/service/same-day-care", permanent: true },
      { source: "/location/joppa", destination: "/locations", permanent: true },
      { source: "/location/columbia-oldie-oldie", destination: "/location/columbia", permanent: true },
    ];
  },
};

export default nextConfig;
