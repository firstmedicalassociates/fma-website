import PublicInfoPage from "../components/public-info-page";

export const metadata = {
  title: "Accessibility Notice | First Medical Associates",
  description:
    "Read the First Medical Associates accessibility notice and learn how to request assistance with website access or care-related accommodations.",
};

export default function AccessibilityPage() {
  return (
    <PublicInfoPage
      eyebrow="Accessibility"
      title="Accessibility Notice"
      intro="First Medical Associates is committed to improving access to care information and website content. If you encounter an accessibility barrier while using this site, contact our team so we can assist you directly."
      sections={[
        {
          heading: "Website accessibility support",
          body: [
            "If you have trouble using any part of this website, please contact First Medical Associates and describe the page or feature that caused the issue.",
            "Providing the page URL, device type, and a short description of the accessibility barrier will help our team investigate more quickly.",
          ],
        },
        {
          heading: "Care access and accommodations",
          body: [
            "If you need help accessing care information, scheduling support, or communication accommodations, our team can help route your request to the appropriate office.",
            "For specialized care needs, please call the office directly rather than relying on website messaging alone.",
          ],
        },
      ]}
    />
  );
}
