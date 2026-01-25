"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";

interface LocationSwitcherProps {
  currentLocation: {
    name: string;
    slug: string;
    logo: string | null;
  };
  siblingLocations: Array<{
    id: string;
    name: string;
    slug: string;
    logo: string | null;
  }>;
  accentColor: string;
}

export function LocationSwitcher({
  currentLocation,
  siblingLocations,
  accentColor,
}: LocationSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Mount check for portal
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen && window.innerWidth < 640) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (siblingLocations.length === 0) {
    return null;
  }

  const mobileSheet = isOpen && isMounted ? createPortal(
    <div
      className="sm:hidden fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="absolute bottom-0 left-0 right-0 bg-background-secondary border-t border-border rounded-t-2xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Current location */}
        <div className="px-5 py-3 border-b border-border">
          <p className="text-xs text-foreground-muted uppercase tracking-wide mb-2">Trenutna lokacija</p>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={{ backgroundColor: `${accentColor}20` }}
            >
              {currentLocation.logo ? (
                <img src={currentLocation.logo} alt={currentLocation.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-semibold" style={{ color: accentColor }}>
                  {currentLocation.name.charAt(0)}
                </span>
              )}
            </div>
            <p className="font-medium text-foreground">{currentLocation.name}</p>
            <svg className="w-5 h-5 text-accent ml-auto" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          </div>
        </div>

        {/* Other locations - scrollable */}
        <div className="p-3 max-h-[40vh] overflow-y-auto">
          <p className="text-xs text-foreground-muted uppercase tracking-wide px-2 py-2">Druge lokacije</p>
          {siblingLocations.map((location) => (
            <Link
              key={location.id}
              href={`/gym-portal/${location.slug}`}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={{ backgroundColor: `${accentColor}20` }}
              >
                {location.logo ? (
                  <img src={location.logo} alt={location.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-semibold" style={{ color: accentColor }}>
                    {location.name.charAt(0)}
                  </span>
                )}
              </div>
              <span className="text-base text-foreground flex-1">
                {location.name}
              </span>
              <svg
                className="w-5 h-5 text-foreground-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>

        {/* Close button */}
        <div className="p-4 border-t border-border">
          <button
            onClick={() => setIsOpen(false)}
            className="w-full py-3 text-center text-foreground-muted font-medium rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            Zatvori
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-foreground-muted hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-white/5 transition-all text-sm"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        <span className="hidden sm:inline">Druga lokacija</span>
      </button>

      {/* Mobile: Bottom Sheet via Portal */}
      {mobileSheet}

      {/* Desktop: Dropdown */}
      {isOpen && (
        <div
          className="hidden sm:block absolute top-full left-0 mt-2 min-w-[240px] max-w-[300px] bg-background-secondary border border-border rounded-xl shadow-xl shadow-black/20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50"
        >
          {/* Current location */}
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs text-foreground-muted uppercase tracking-wide mb-2">Trenutna lokacija</p>
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={{ backgroundColor: `${accentColor}20` }}
              >
                {currentLocation.logo ? (
                  <img src={currentLocation.logo} alt={currentLocation.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-semibold" style={{ color: accentColor }}>
                    {currentLocation.name.charAt(0)}
                  </span>
                )}
              </div>
              <p className="font-medium text-foreground truncate flex-1">{currentLocation.name}</p>
              <svg className="w-4 h-4 text-accent flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
            </div>
          </div>

          {/* Other locations */}
          <div className="p-2">
            <p className="text-xs text-foreground-muted uppercase tracking-wide px-2 py-1">Druge lokacije</p>
            {siblingLocations.map((location) => (
              <Link
                key={location.id}
                href={`/gym-portal/${location.slug}`}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors group"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
                  style={{ backgroundColor: `${accentColor}20` }}
                >
                  {location.logo ? (
                    <img src={location.logo} alt={location.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-semibold" style={{ color: accentColor }}>
                      {location.name.charAt(0)}
                    </span>
                  )}
                </div>
                <span className="text-sm text-foreground-muted group-hover:text-foreground truncate flex-1">
                  {location.name}
                </span>
                <svg
                  className="w-4 h-4 text-foreground-muted opacity-0 group-hover:opacity-100 transition-opacity"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
