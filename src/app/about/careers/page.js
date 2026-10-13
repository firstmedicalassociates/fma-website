import { permanentRedirect } from "next/navigation";

export default function LegacyCareersPage() {
  permanentRedirect("/careers/");
}
