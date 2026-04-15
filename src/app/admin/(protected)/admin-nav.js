"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  FileText,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  PenSquare,
  UserPlus,
  X,
} from "./admin-icons";
import { ADMIN_NAV_SECTIONS, isAdminLinkActive } from "../../lib/config/admin-navigation.mjs";

const ICONS_BY_KEY = {
  dashboard: LayoutDashboard,
  posts: FileText,
  locations: MapPin,
  providers: UserPlus,
  "new-post": PenSquare,
  "new-location": MapPin,
  "new-provider": UserPlus,
};

function getDisplayName(email) {
  const prefix = email?.split("@")[0] || "system admin";
  return prefix
    .split(/[\W_]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function getInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export default function AdminNav({ email, role }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [logoutState, setLogoutState] = useState("idle");

  const displayName = getDisplayName(email);
  const initials = getInitials(displayName);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  async function handleLogout() {
    if (logoutState === "loading") return;

    setLogoutState("loading");

    try {
      const response = await fetch("/api/admin/logout", { method: "POST" });
      if (!response.ok && response.status !== 401) {
        throw new Error("Logout failed");
      }

      router.replace("/admin/login");
      router.refresh();
    } catch {
      setLogoutState("error");
    }
  }

  return (
    <>
      <div className="admin-mobile-toolbar">
        <button
          type="button"
          className="admin-mobile-toggle"
          onClick={() => setIsOpen((current) => !current)}
          aria-expanded={isOpen}
          aria-controls="admin-navigation"
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        >
          {isOpen ? <X /> : <Menu />}
        </button>
        <div className="admin-mobile-brand">
          <span className="admin-mobile-brand-mark">FMA</span>
          <span className="admin-mobile-brand-copy">Admin</span>
        </div>
      </div>

      <button
        type="button"
        className={`admin-nav-overlay ${isOpen ? "is-visible" : ""}`}
        onClick={() => setIsOpen(false)}
        aria-hidden={!isOpen}
        tabIndex={isOpen ? 0 : -1}
      />

      <aside id="admin-navigation" className={`admin-nav ${isOpen ? "admin-nav-open" : ""}`}>
        <div className="admin-logo-wrap">
          <div className="admin-logo-mark">F</div>
          <div>
            <p className="admin-logo">First Medical</p>
            <p className="admin-logo-copy">Content system</p>
          </div>
        </div>

        {ADMIN_NAV_SECTIONS.map((section, sectionIndex) => (
          <div key={section.id}>
            {sectionIndex > 0 ? <div className="admin-nav-divider" /> : null}
            <div className="admin-nav-group">
              <p className="admin-nav-section-label">{section.label}</p>
              {section.links.map(({ href, label, icon }) => {
                const Icon = ICONS_BY_KEY[icon];
                const isActive = isAdminLinkActive(pathname, href);

                return (
                  <Link
                    key={href}
                    href={href}
                    className={`admin-nav-link ${
                      section.id === "quick-actions" ? "admin-nav-link-secondary" : ""
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {Icon ? <Icon className="admin-nav-icon" /> : null}
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        <div className="admin-user-card">
          <div className="admin-user-avatar">{initials || "SA"}</div>
          <div className="admin-user-meta">
            <p className="admin-user-name">{displayName || "System Admin"}</p>
            <p className="admin-user-role">{role || "ADMIN"}</p>
          </div>
        </div>

        <button
          type="button"
          className="builder-button secondary admin-logout-button"
          onClick={handleLogout}
          disabled={logoutState === "loading"}
        >
          <LogOut className="admin-nav-icon" />
          {logoutState === "loading" ? "Logging out..." : "Log out"}
        </button>

        {logoutState === "error" ? (
          <p className="admin-nav-error">Unable to log out right now. Please try again.</p>
        ) : null}
      </aside>
    </>
  );
}
