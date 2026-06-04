import PublicInfoPage from "../components/public-info-page";

export const metadata = {
  title: "Privacy Policy | Primary Care Doctor at First Medical Associates",
  description:
    "Learn how First Medical Associates handles website privacy questions, patient communications, and requests for more information.",
};

export default function PrivacyPolicyPage() {
  return (
    <PublicInfoPage
      eyebrow="Privacy"
      title="Privacy Policy"
      intro="First Medical Associates is updating this website privacy policy. This page provides a current point of contact for privacy-related questions while the full policy copy is finalized for the new website."
      sections={[
        {
          heading: "Website and communication privacy",
          body: [
            "If you submit a form, request information, or contact our team through this website, First Medical Associates may use the information you provide to respond to your request and support patient service needs.",
            "For questions about how your information is handled through this website or patient communications, contact our team directly so we can route your request appropriately.",
          ],
        },
        {
          heading: "Patient privacy questions",
          body: [
            "Questions related to patient records, protected health information, or privacy rights should be directed to First Medical Associates using our published contact information so the correct team can assist you.",
            "If you need immediate help, please call the main office line listed on the website rather than relying on web form submissions for urgent privacy matters.",
          ],
        },
      ]}
    />
  );
}
