import PublicInfoPage from "../components/public-info-page";

export const metadata = {
  title: "HIPAA Notice | First Medical Associates",
  description:
    "Access the First Medical Associates HIPAA notice contact page for questions about patient privacy rights and protected health information.",
};

export default function HipaaNoticePage() {
  return (
    <PublicInfoPage
      eyebrow="HIPAA"
      title="HIPAA Notice"
      intro="First Medical Associates is preparing the full online HIPAA notice for this new website. Until the formal notice text is published here, use this page as the correct destination for HIPAA-related questions and patient privacy requests."
      sections={[
        {
          heading: "Protected health information",
          body: [
            "Questions about protected health information, disclosure practices, or privacy rights should be submitted directly to First Medical Associates so the appropriate team can respond.",
            "Public website forms and AI search are for general website and service-routing questions only. Please do not include protected health information in those tools.",
            "If your request is time-sensitive, please contact the office by phone instead of relying on a general web inquiry.",
          ],
        },
        {
          heading: "Records and patient requests",
          body: [
            "Requests involving patient records, access questions, or privacy concerns may require additional verification before information can be shared.",
            "Please have the relevant patient details available when contacting the office so your request can be routed correctly.",
          ],
        },
      ]}
    />
  );
}
