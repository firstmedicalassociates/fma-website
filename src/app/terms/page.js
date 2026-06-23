import PublicInfoPage from "../components/public-info-page";

export const metadata = {
  title: "Terms & Conditions | First Medical Associates",
  description:
    "Review the website terms page for First Medical Associates and find the correct point of contact for questions about site use.",
};

export default function TermsPage() {
  return (
    <PublicInfoPage
      eyebrow="Terms"
      title="Terms & Conditions"
      intro="First Medical Associates is updating the website terms and conditions for this new platform. This page serves as the replacement destination for the prior live terms URL while the full legal copy is being finalized."
      sections={[
        {
          heading: "Website use",
          body: [
            "Website content is provided for general informational purposes and should not be treated as a substitute for direct medical advice, diagnosis, or treatment.",
            "Do not submit protected health information or patient-specific medical details through public website forms or AI search. Use the patient portal or call the office for medical questions, records, prescriptions, results, or urgent concerns.",
            "If you need urgent medical guidance, contact the office directly or seek emergency care where appropriate.",
          ],
        },
        {
          heading: "Questions about this page",
          body: [
            "If you need clarification on the use of this website or the information presented here, please contact First Medical Associates directly.",
            "A fuller terms and conditions notice may be published here as the new website rollout is completed.",
          ],
        },
      ]}
    />
  );
}
