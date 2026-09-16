import { hasPermission } from "../admin-permissions.mjs";
export const ADMIN_PRIMARY_LINKS = [
  {
    key: "dashboard",
    href: "/admin",
    label: "Dashboard",
    icon: "dashboard",
    smokeText: "Dashboard",
  },
  {
    key: "posts",
    href: "/admin/posts",
    label: "Posts",
    icon: "posts",
    smokeText: "Posts",
  },
  {
    key: "locations",
    href: "/admin/locations",
    label: "Locations",
    icon: "locations",
    smokeText: "Locations",
  },
  {
    key: "services",
    href: "/admin/services",
    label: "Services",
    icon: "services",
    smokeText: "Services",
  },
  {
    key: "providers",
    href: "/admin/providers",
    label: "Providers",
    icon: "providers",
    smokeText: "Providers",
  },
  {
    key: "ai-search",
    href: "/admin/ai-search",
    label: "AI Search",
    icon: "ai-search",
    smokeText: "AI Search",
  },
];

ADMIN_PRIMARY_LINKS.push(
  { key: "users", href: "/admin/users", label: "Admins", icon: "users", smokeText: "Admins" },
  { key: "account", href: "/admin/account", label: "My Account", icon: "account", smokeText: "My Account" },
);

export const ADMIN_QUICK_LINKS = [
  {
    key: "new-post",
    href: "/admin/posts/new",
    label: "New Post",
    icon: "new-post",
    smokeText: "New Blog Post",
  },
  {
    key: "new-location",
    href: "/admin/locations/new",
    label: "New Location",
    icon: "new-location",
    smokeText: "Add Location",
  },
  {
    key: "new-service",
    href: "/admin/services/new",
    label: "Add Service",
    icon: "new-service",
    smokeText: "Add Service",
  },
  {
    key: "new-provider",
    href: "/admin/providers/new",
    label: "Add Provider",
    icon: "new-provider",
    smokeText: "Add Provider",
  },

];

export const ADMIN_NAV_SECTIONS = [
  { id: "overview", label: "Overview", links: ADMIN_PRIMARY_LINKS },
  { id: "quick-actions", label: "Quick actions", links: ADMIN_QUICK_LINKS },
];

export const ADMIN_PRIMARY_LINK_BY_KEY = Object.fromEntries(
  ADMIN_PRIMARY_LINKS.map((link) => [link.key, link])
);

export const ADMIN_PROTECTED_SMOKE_PAGES = [...ADMIN_PRIMARY_LINKS, ...ADMIN_QUICK_LINKS].map(
  ({ href, label, smokeText }) => ({
    href,
    label,
    smokeText,
  })
);

export function isAdminLinkActive(pathname, href) {
  if (href === "/admin") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function canSeeAdminLink(user, link) {
  const required = link.key === "users" ? "admin" : link.key === "account" ? "account" : link.key === "dashboard" ? "dashboard" : link.key.startsWith("new-") ? `${({post:"posts", location:"locations", service:"services", provider:"providers"})[link.key.slice(4)]}.edit` : `${link.key}.view`;
  return hasPermission(user, required);
}
