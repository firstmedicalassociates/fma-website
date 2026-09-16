import { requireAdminPage } from "../../../../lib/admin-page-auth";
import ServiceForm from "../service-form";

export default async function NewServicePage() {
  await requireAdminPage("services.edit");
  return <ServiceForm mode="create" />;
}
