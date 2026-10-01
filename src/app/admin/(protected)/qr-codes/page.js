import { requireAdminPage } from "../../../lib/admin-page-auth";
import { parseQrRange } from "../../../lib/uniqode.mjs";
import QrDashboard from "./qr-dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function QrCodesPage() {
  await requireAdminPage("qr-codes.view");
  const { from, to } = parseQrRange();
  return <QrDashboard initialRange={{ from, to }} />;
}
