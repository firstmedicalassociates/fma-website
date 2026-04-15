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
    key: "providers",
    href: "/admin/providers",
    label: "Providers",
    icon: "providers",
    smokeText: "Providers",
  },
];

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
