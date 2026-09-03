import { CANONICAL_ORIGIN, absoluteUrl } from "./lib/config/site";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: CANONICAL_ORIGIN,
  };
}
