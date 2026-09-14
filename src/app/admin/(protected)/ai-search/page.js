import { requireAdminPage } from "../../../lib/admin-page-auth";
import { hasPermission } from "../../../lib/admin-permissions.mjs";
import AnalyticsDashboard from "./analytics-dashboard";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export default async function AdminAiSearchPage() {
  const user = await requireAdminPage("ai-search.view");
  return <AnalyticsDashboard showSpending={hasPermission(user, "spending.view")} showDiagnostics={hasPermission(user, "admin")} />;
}
