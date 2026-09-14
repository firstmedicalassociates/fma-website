import Link from "next/link";
import { requireAdminPage } from "../../../lib/admin-page-auth";
export default async function AccessDeniedPage() {
  await requireAdminPage("account");
  return (
    <section className="admin-panel admin-account-editor">
      <h1>Access unavailable</h1>
      <p>
        Your account does not have permission to view this section. A full admin
        can update your access.
      </p>
      <Link href="/admin" className="builder-button secondary">
        Back to dashboard
      </Link>
    </section>
  );
}
