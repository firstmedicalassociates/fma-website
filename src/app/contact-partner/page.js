import SiteFooter from "../components/site-footer";
import SiteHeader from "../components/site-header";
import ContactPageShell from "../contact/contact-page-shell";
import { buildStaticMetadata } from "../lib/seo";

export const metadata = buildStaticMetadata({
  title: "Become a Partner | First Medical Associates",
  description: "Connect with First Medical Associates about vendor services and partnership opportunities.",
  pathname: "/contact-partner",
});

export default function ContactPartnerPage() {
  return (
    <>
      <SiteHeader />
      <ContactPageShell partner />
      <SiteFooter />
    </>
  );
}
