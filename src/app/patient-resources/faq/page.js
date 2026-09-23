import { buildStaticMetadata } from "../../lib/seo";
import FaqContent from "./faq-content";

export const metadata = buildStaticMetadata({
  title: "Patient FAQ | First Medical Associates",
  description: "Find answers to common questions about appointments, visits, telemedicine, and patient support at First Medical Associates.",
  pathname: "/patient-resources/faq",
});

export default function FAQPage() {
  return <FaqContent />;
}
