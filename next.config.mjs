/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: "/location", destination: "/locations", permanent: true },
      { source: "/service", destination: "/services", permanent: true },
      { source: "/about-us", destination: "/about", permanent: true },
      { source: "/contact-us", destination: "/contact", permanent: true },
      { source: "/jobs", destination: "/about/careers", permanent: true },
      { source: "/resources", destination: "/patient-resources", permanent: true },
      { source: "/insurances", destination: "/patient-resources/insurance", permanent: true },
      { source: "/billing-questions", destination: "/patient-resources/insurance", permanent: true },
      { source: "/accessibility-notice", destination: "/accessibility", permanent: true },
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
      { source: "/service/eczema", destination: "/service/skin-rash-and-eczema", permanent: true },
      { source: "/service/walk-in-services", destination: "/service/urgent-needs", permanent: true },
      { source: "/service/adhd", destination: "/services", permanent: true },
      { source: "/service/anxiety", destination: "/services", permanent: true },
      { source: "/service/arthritis", destination: "/services", permanent: true },
      { source: "/service/migraines", destination: "/services", permanent: true },
      { source: "/location/joppa", destination: "/locations", permanent: true },
      { source: "/location/columbia-oldie-oldie", destination: "/location/columbia", permanent: true },
    ];
  },
};

export default nextConfig;
