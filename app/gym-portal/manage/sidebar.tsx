"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  icon: string;
  ownerOnly?: boolean;
}

interface NavGroup {
  id: string;
  label: string;
  icon: string;
  href?: string;
  items?: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    id: "dashboard",
    label: "Pregled",
    icon: "home",
    href: "/gym-portal/manage",
  },
  {
    id: "membership",
    label: "Članstvo",
    icon: "users",
    items: [
      { label: "Članovi", href: "/gym-portal/manage/members", icon: "users" },
      { label: "Osoblje", href: "/gym-portal/manage/staff", icon: "badge" },
      { label: "Check-in", href: "/gym-portal/manage/checkin", icon: "qr" },
    ],
  },
  {
    id: "activities",
    label: "Aktivnosti",
    icon: "trophy",
    items: [
      {
        label: "Izazovi",
        href: "/gym-portal/manage/challenges",
        icon: "trophy",
      },
      { label: "Ciljevi", href: "/gym-portal/manage/goals", icon: "target" },
    ],
  },
  {
    id: "gym",
    label: "Teretana",
    icon: "building",
    items: [
      { label: "Prodavnica", href: "/gym-portal/manage/shop", icon: "shop" },
      { label: "Galerija", href: "/gym-portal/manage/gallery", icon: "gallery" },
      {
        label: "Branding",
        href: "/gym-portal/manage/branding",
        icon: "palette",
      },
      {
        label: "Podešavanja",
        href: "/gym-portal/manage/settings",
        icon: "settings",
      },
      {
        label: "Obroci na čekanju",
        href: "/gym-portal/manage/pending-meals",
        icon: "meal",
      },
      {
        label: "Lokacije",
        href: "/gym-portal/manage/locations",
        icon: "locations",
        ownerOnly: true,
      },
    ],
  },
];

// Owner-only view - just locations
const ownerNavGroups: NavGroup[] = [
  {
    id: "locations",
    label: "Lokacije",
    icon: "locations",
    href: "/gym-portal/manage/locations",
  },
];

function NavIcon({ icon, className }: { icon: string; className?: string }) {
  switch (icon) {
    case "home":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
          />
        </svg>
      );
    case "users":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
          />
        </svg>
      );
    case "badge":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z"
          />
        </svg>
      );
    case "trophy":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0"
          />
        </svg>
      );
    case "target":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case "gallery":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
          />
        </svg>
      );
    case "settings":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      );
    case "locations":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
          />
        </svg>
      );
    case "qr":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z"
          />
        </svg>
      );
    case "meal":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.125-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265zm-3 0a.375.375 0 11-.53 0L9 2.845l.265.265zm6 0a.375.375 0 11-.53 0L15 2.845l.265.265z"
          />
        </svg>
      );
    case "palette":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z"
          />
        </svg>
      );
    case "building":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z"
          />
        </svg>
      );
    case "shop":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z"
          />
        </svg>
      );
    case "chevron":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
          />
        </svg>
      );
    case "collapse":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5"
          />
        </svg>
      );
    case "expand":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5"
          />
        </svg>
      );
    default:
      return null;
  }
}

interface SidebarProps {
  isOwner: boolean;
  accentColor?: string;
  staffName?: string;
  staffRole?: string;
  onLogout?: () => void;
}

export default function Sidebar({ isOwner, staffName, staffRole, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const groups = isOwner ? ownerNavGroups : navGroups;

  // Sidebar collapsed state
  const [isCollapsed, setIsCollapsed] = useState(false);

  // All groups expanded by default
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const allGroupIds = new Set(
      navGroups.filter((g) => g.items).map((g) => g.id)
    );
    return allGroupIds;
  });

  // Load saved states from localStorage after mount
  useEffect(() => {
    const savedExpanded = localStorage.getItem("sidebar-expanded-groups");
    if (savedExpanded) {
      try {
        setExpandedGroups(new Set(JSON.parse(savedExpanded)));
      } catch {
        // Ignore parse errors
      }
    }

    const savedCollapsed = localStorage.getItem("sidebar-collapsed");
    if (savedCollapsed) {
      setIsCollapsed(savedCollapsed === "true");
    }
  }, []);

  // Save expanded groups to localStorage
  useEffect(() => {
    localStorage.setItem(
      "sidebar-expanded-groups",
      JSON.stringify([...expandedGroups])
    );
  }, [expandedGroups]);

  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(isCollapsed));
  }, [isCollapsed]);

  const toggleGroup = (groupId: string) => {
    if (isCollapsed) return; // Don't toggle groups when collapsed
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const isActive = (href: string) => {
    if (href === "/gym-portal/manage") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const isGroupActive = (group: NavGroup) => {
    if (group.href) {
      return isActive(group.href);
    }
    return group.items?.some((item) => isActive(item.href)) ?? false;
  };

  return (
    <aside
      className={`flex-shrink-0 border-r border-border bg-background-secondary hidden lg:flex flex-col transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-60"
      }`}
    >
      <nav className="sticky top-16 flex-1 p-2 space-y-1 max-h-[calc(100vh-4rem-3.5rem)] overflow-y-auto">
        {groups.map((group) => {
          const isExpanded = expandedGroups.has(group.id);
          const hasItems = group.items && group.items.length > 0;
          const groupActive = isGroupActive(group);

          // Filter out owner-only items for non-owners
          const visibleItems = hasItems
            ? group.items?.filter((item) => !item.ownerOnly || isOwner)
            : null;

          // Single item (like Dashboard)
          if (group.href && !hasItems) {
            return (
              <Link
                key={group.id}
                href={group.href}
                title={isCollapsed ? group.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  isActive(group.href)
                    ? "text-accent bg-accent/10 font-medium"
                    : "text-foreground-muted hover:text-foreground hover:bg-white/5"
                } ${isCollapsed ? "justify-center" : ""}`}
              >
                <NavIcon icon={group.icon} className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && (
                  <span className="text-sm">{group.label}</span>
                )}
              </Link>
            );
          }

          // Group with items - collapsed view shows all items as icons
          if (isCollapsed) {
            return (
              <div key={group.id} className="space-y-1">
                {/* Group header as icon */}
                <div
                  title={group.label}
                  className={`flex items-center justify-center px-3 py-2 rounded-lg ${
                    groupActive
                      ? "text-accent"
                      : "text-foreground-muted"
                  }`}
                >
                  <NavIcon
                    icon={group.icon}
                    className="w-5 h-5 flex-shrink-0"
                  />
                </div>
                {/* Show item icons */}
                {visibleItems?.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    className={`flex items-center justify-center px-3 py-2 rounded-lg transition-all ${
                      isActive(item.href)
                        ? "text-accent bg-accent/10 font-medium"
                        : "text-foreground-muted hover:text-foreground hover:bg-white/5"
                    }`}
                  >
                    <NavIcon
                      icon={item.icon}
                      className="w-4 h-4 flex-shrink-0"
                    />
                  </Link>
                ))}
              </div>
            );
          }

          // Group with items - expanded view
          return (
            <div key={group.id} className="space-y-0.5">
              <button
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg transition-all ${
                  groupActive && !isExpanded
                    ? "text-accent bg-accent/5"
                    : "text-foreground-muted hover:text-foreground hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <NavIcon
                    icon={group.icon}
                    className="w-5 h-5 flex-shrink-0"
                  />
                  <span className="text-sm font-medium">{group.label}</span>
                </div>
                <NavIcon
                  icon="chevron"
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Expandable items */}
              <div
                className={`overflow-hidden transition-all duration-200 ${
                  isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="pl-4 space-y-0.5 pt-0.5">
                  {visibleItems?.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                        isActive(item.href)
                          ? "text-accent bg-accent/10 font-medium"
                          : "text-foreground-muted hover:text-foreground hover:bg-white/5"
                      }`}
                    >
                      <NavIcon
                        icon={item.icon}
                        className="w-4 h-4 flex-shrink-0"
                      />
                      <span className="text-sm">{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer with user info, logout, and collapse */}
      <div className="p-2 border-t border-border space-y-1">
        {/* User info */}
        {staffName && (
          <div className={`flex items-center gap-3 px-3 py-2.5 ${isCollapsed ? "justify-center" : ""}`}>
            {/* Avatar with online indicator */}
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-semibold text-sm">
                {staffName.charAt(0).toUpperCase()}
              </div>
              {/* Online indicator */}
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-background-secondary" />
            </div>
            {/* Name and role */}
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-foreground font-medium text-sm truncate">{staffName}</p>
                <p className="text-foreground-muted text-xs">{staffRole}</p>
              </div>
            )}
          </div>
        )}

        {/* Logout button */}
        {onLogout && (
          <button
            onClick={onLogout}
            title={isCollapsed ? "Odjavi se" : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all ${
              isCollapsed ? "justify-center" : ""
            }`}
          >
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
              />
            </svg>
            {!isCollapsed && <span className="text-sm">Odjavi se</span>}
          </button>
        )}

        {/* Collapse toggle button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Proširi meni" : "Skupi meni"}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-white/5 transition-all ${
            isCollapsed ? "justify-center" : ""
          }`}
        >
          <NavIcon
            icon={isCollapsed ? "expand" : "collapse"}
            className="w-5 h-5 flex-shrink-0"
          />
          {!isCollapsed && <span className="text-sm">Skupi meni</span>}
        </button>
      </div>
    </aside>
  );
}

export { navGroups, ownerNavGroups, NavIcon };
export type { NavGroup, NavItem };
