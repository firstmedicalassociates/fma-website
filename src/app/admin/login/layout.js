import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAdminSession, SESSION_COOKIE } from "../../lib/admin-auth";

export default async function AdminLoginLayout({ children }) {
  const cookieStore = await cookies();
  const session = verifyAdminSession(cookieStore.get(SESSION_COOKIE)?.value);

  if (session) {
    redirect("/admin");
  }

  return children;
}
