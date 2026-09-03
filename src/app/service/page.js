import { permanentRedirect } from "next/navigation";

export const runtime = "nodejs";
export const revalidate = 60;

export default function ServicePage() {
  permanentRedirect("/services/");
}
