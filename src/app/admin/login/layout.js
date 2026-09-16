import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { resolveAdminSession, SESSION_COOKIE } from "../../lib/admin-auth";

export default async function AdminLoginLayout({ children }) {
  const cookieStore = await cookies();
  const session = await resolveAdminSession(cookieStore.get(SESSION_COOKIE)?.value);

  if (session) {
    redirect(session.mustChangePassword ? "/admin/account" : "/admin");
  }

  return children;
}
