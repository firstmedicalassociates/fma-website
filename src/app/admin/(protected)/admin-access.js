"use client";
import { createContext, useContext } from "react";
import { hasPermission } from "../../lib/admin-permissions.mjs";
const AdminAccess = createContext(null);
export function AdminAccessProvider({ user, children }) {
  return <AdminAccess.Provider value={user}>{children}</AdminAccess.Provider>;
}
export function useAdminAccess() {
  const user = useContext(AdminAccess);
  return { user, can: (permission) => hasPermission(user, permission) };
}
export function Permission({ name, children }) {
  const { can } = useAdminAccess();
  return can(name) ? children : null;
}
