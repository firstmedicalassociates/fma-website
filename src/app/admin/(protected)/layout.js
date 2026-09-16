import "./admin.css";

import { redirect } from "next/navigation";
import { getAdminUser } from "../../lib/admin-page-auth";
import { AdminAccessProvider } from "./admin-access";
import AdminNav from "./admin-nav";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }) {
  const session = await getAdminUser();
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <AdminAccessProvider user={session}>
    <div className="admin-shell">
      <div className="admin-noise" aria-hidden="true" />
      <div className="admin-frame-wrap">
        <p className="admin-shell-label">CMS Admin Dashboard</p>
        <div className="admin-frame">
          <AdminNav email={session.email} role={session.role} />
          <main className="admin-main">
            <div className="admin-main-inner">{children}</div>
          </main>
        </div>
      </div>
    </div>
    </AdminAccessProvider>
  );
}
