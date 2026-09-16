import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { resolveAdminSession, SESSION_COOKIE } from "./admin-auth";
import { hasPermission } from "./admin-permissions.mjs";
export const getAdminUser = cache(async () =>
  resolveAdminSession((await cookies()).get(SESSION_COOKIE)?.value),
);
export async function requireAdminPage(permission = "dashboard") {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  if (user.mustChangePassword && permission !== "account")
    redirect("/admin/account");
  if (!hasPermission(user, permission)) redirect("/admin/access-denied");
  return user;
}
