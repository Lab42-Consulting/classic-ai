"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { navGroups, ownerNavGroups, NavIcon, type NavGroup } from "./sidebar";

interface MobileNavProps {
  isOwner: boolean;
  staffName?: string;
  staffRole?: string;
  onLogout: () => void;
}

export default function MobileNav({
  isOwner,
  staffName,
  staffRole,
  onLogout,
}: MobileNavProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const groups = isOwner ? ownerNavGroups : navGroups;

  // All groups expanded by default for mobile
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    return new Set(navGroups.filter((g) => g.items).map((g) => g.id));
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const toggleGroup = (groupId: string) => {
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

  const mobileMenu =
    isOpen && isMounted
      ? createPortal(
          <div className="lg:hidden fixed inset-0 z-[9999]">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu panel - slide in from right */}
            <div className="absolute top-0 right-0 bottom-0 w-full max-w-xs bg-background-secondary border-l border-border shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <span className="font-semibold text-foreground">Meni</span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg hover:bg-white/10 text-foreground-muted hover:text-foreground transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Navigation */}
              <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-12rem)]">
                {groups.map((group) => {
                  const isExpanded = expandedGroups.has(group.id);
                  const hasItems = group.items && group.items.length > 0;
                  const groupActive = isGroupActive(group);

                  // Filter out owner-only items for non-owners
                  const visibleItems = hasItems
                    ? group.items?.filter((item) => !item.ownerOnly || isOwner)
                    : null;

                  // Single item (like Dashboard or Locations for owner)
                  if (group.href && !hasItems) {
                    return (
                      <Link
                        key={group.id}
                        href={group.href}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                          isActive(group.href)
                            ? "text-accent bg-accent/10 font-medium"
                            : "text-foreground-muted hover:text-foreground hover:bg-white/5"
                        }`}
                      >
                        <NavIcon
                          icon={group.icon}
                          className="w-5 h-5 flex-shrink-0"
                        />
                        <span>{group.label}</span>
                      </Link>
                    );
                  }

                  // Group with items
                  return (
                    <div key={group.id} className="space-y-0.5">
                      <button
                        onClick={() => toggleGroup(group.id)}
                        className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl transition-all ${
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
                          <span className="font-medium">{group.label}</span>
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
                          isExpanded
                            ? "max-h-96 opacity-100"
                            : "max-h-0 opacity-0"
                        }`}
                      >
                        <div className="pl-6 space-y-0.5 pt-1">
                          {visibleItems?.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
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

              {/* Footer */}
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-background-secondary">
                <button
                  onClick={onLogout}
                  className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all"
                >
                  <svg
                    className="w-5 h-5"
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
                  <span>Odjavi se</span>
                </button>
                {staffName && (
                  <p className="text-xs text-foreground-muted text-center mt-3">
                    {staffName} ({staffRole})
                  </p>
                )}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      {/* Toggle button - rendered inline */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden p-2 rounded-xl hover:bg-white/10 transition-colors text-foreground-muted hover:text-foreground"
        aria-label="Toggle menu"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
          />
        </svg>
      </button>

      {/* Portal-rendered menu */}
      {mobileMenu}
    </>
  );
}
