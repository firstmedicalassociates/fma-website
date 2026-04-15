import "./admin.css";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAdminSession, SESSION_COOKIE } from "../../lib/admin-auth";
import AdminNav from "./admin-nav";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }) {
  const cookieStore = await cookies();
  const session = verifyAdminSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) {
    redirect("/admin/login");
  }

  return (
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
  );
}
