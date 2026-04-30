import SiteFooter from "../components/site-footer";
import SiteHeader from "../components/site-header";
import ContactPageShell from "./contact-page-shell";

export const runtime = "nodejs";

export const metadata = {
  title: "Contact",
  description: "Contact First Medical Associates for appointments, questions, and patient support.",
};

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <ContactPageShell />
      <SiteFooter />
    </>
  );
}
