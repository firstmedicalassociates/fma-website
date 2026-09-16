import { requireAdminPage } from "../../../lib/admin-page-auth";
import PasswordForm from "./password-form";
export default async function AccountPage() {
  const user = await requireAdminPage("account");
  return (
    <>
      <header className="admin-top">
        <div>
          <span className="admin-kicker">Your sign-in</span>
          <h1 className="admin-title">My Account</h1>
          <p className="admin-subtitle">{user.email}</p>
        </div>
      </header>
      <PasswordForm requiredChange={user.mustChangePassword} />
    </>
  );
}
