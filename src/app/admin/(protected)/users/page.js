import { requireAdminPage } from "../../../lib/admin-page-auth";
import { prisma } from "../../../lib/prisma";
import { ACCOUNT_SELECT } from "../../../lib/admin-accounts";
import UsersClient from "./users-client";
export default async function AdminUsersPage() {
  const user = await requireAdminPage("admin");
  const users = await prisma.adminUser.findMany({
    select: ACCOUNT_SELECT,
    orderBy: { createdAt: "asc" },
  });
  return (
    <UsersClient
      currentUserId={user.id}
      initialUsers={users.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      }))}
    />
  );
}
