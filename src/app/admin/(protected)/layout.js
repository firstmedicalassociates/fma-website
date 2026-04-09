import "./admin.css";
import { Space_Grotesk } from "next/font/google";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAdminSession, SESSION_COOKIE } from "../../lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default async function AdminLayout({ children }) {
  const cookieStore = await cookies();
  const session = verifyAdminSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className={`admin-shell ${spaceGrotesk.className}`}>
      <aside className="admin-nav">
        <div className="admin-logo">CMS Admin</div>
        <Link href="/admin">Dashboard</Link>
        <Link href="/admin/posts">Posts</Link>
        <Link href="/admin/providers">Providers</Link>
        <span className="admin-pill">{session.email}</span>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
