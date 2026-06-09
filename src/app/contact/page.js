import SiteFooter from "../components/site-footer";
import SiteHeader from "../components/site-header";
import { buildStaticMetadata } from "../lib/seo";
import ContactPageShell from "./contact-page-shell";

export const runtime = "nodejs";

export const metadata = buildStaticMetadata({
  title: "Contact First Medical Associates in Maryland",
  description: "Contact First Medical Associates for appointments, patient support, office questions, and care-related inquiries across Maryland locations.",
  pathname: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <ContactPageShell />
      <SiteFooter />
    </>
  );
}
