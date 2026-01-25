"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

interface MobileMenuProps {
  accentColor: string;
  hasTrainers: boolean;
  hasContact: boolean;
  gymName: string;
  gymLogo: string | null;
}

// Back to top button component
export function BackToTop({ accentColor }: { accentColor: string }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      setIsVisible(window.scrollY > 400);
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95"
      style={{ backgroundColor: accentColor, boxShadow: `0 4px 20px ${accentColor}40` }}
      aria-label="Vrati se na vrh"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
    </button>
  );
}

// Full-screen menu overlay rendered via portal
function MenuOverlay({
  isOpen,
  onClose,
  accentColor,
  hasTrainers,
  hasContact,
  gymName,
  gymLogo,
}: {
  isOpen: boolean;
  onClose: () => void;
  accentColor: string;
  hasTrainers: boolean;
  hasContact: boolean;
  gymName: string;
  gymLogo: string | null;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!mounted) return null;

  const menuContent = (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "#0a0a0a",
        zIndex: 9999,
        display: isOpen ? "flex" : "none",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: "1.5rem",
          right: "1.5rem",
          padding: "0.5rem",
          borderRadius: "0.75rem",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "#888",
        }}
        aria-label="Zatvori meni"
      >
        <svg
          width="28"
          height="28"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Logo */}
      <div style={{ marginBottom: "2.5rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
        {gymLogo ? (
          <img
            src={gymLogo}
            alt={gymName}
            style={{
              width: "4rem",
              height: "4rem",
              borderRadius: "1rem",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              width: "4rem",
              height: "4rem",
              borderRadius: "1rem",
              backgroundColor: accentColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "white" }}>
              {gymName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <span style={{ fontSize: "1.25rem", fontWeight: 600, color: "#fff" }}>{gymName}</span>
      </div>

      {/* Navigation links */}
      <nav style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", marginBottom: "2.5rem" }}>
        {hasTrainers && (
          <a
            href="#trainers"
            onClick={onClose}
            style={{
              fontSize: "1.5rem",
              fontWeight: 500,
              color: "#999",
              padding: "0.75rem 1.5rem",
              borderRadius: "0.75rem",
              textDecoration: "none",
            }}
          >
            Treneri
          </a>
        )}
        <a
          href="#features"
          onClick={onClose}
          style={{
            fontSize: "1.5rem",
            fontWeight: 500,
            color: "#999",
            padding: "0.75rem 1.5rem",
            borderRadius: "0.75rem",
            textDecoration: "none",
          }}
        >
          Šta nudimo
        </a>
        <a
          href="#gallery"
          onClick={onClose}
          style={{
            fontSize: "1.5rem",
            fontWeight: 500,
            color: "#999",
            padding: "0.75rem 1.5rem",
            borderRadius: "0.75rem",
            textDecoration: "none",
          }}
        >
          Galerija
        </a>
        {hasContact && (
          <a
            href="#contact"
            onClick={onClose}
            style={{
              fontSize: "1.5rem",
              fontWeight: 500,
              color: "#999",
              padding: "0.75rem 1.5rem",
              borderRadius: "0.75rem",
              textDecoration: "none",
            }}
          >
            Kontakt
          </a>
        )}
      </nav>

      {/* Divider */}
      <div style={{ width: "4rem", height: "1px", backgroundColor: "rgba(255,255,255,0.1)", marginBottom: "2.5rem" }} />

      {/* Login buttons */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", width: "100%", maxWidth: "280px", padding: "0 1rem" }}>
        <Link
          href="/login"
          onClick={onClose}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            padding: "1rem 1.5rem",
            borderRadius: "0.75rem",
            backgroundColor: accentColor,
            color: "white",
            fontSize: "1.125rem",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Prijava za članove
        </Link>
        <Link
          href="/staff-login"
          onClick={onClose}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            padding: "1rem 1.5rem",
            borderRadius: "0.75rem",
            backgroundColor: "rgba(255,255,255,0.1)",
            color: "#eee",
            fontSize: "1.125rem",
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          Staff prijava
        </Link>
      </div>
    </div>
  );

  return createPortal(menuContent, document.body);
}

export function MobileMenu({ accentColor, hasTrainers, hasContact, gymName, gymLogo }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Burger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden p-2 rounded-xl hover:bg-white/10 transition-colors text-foreground-muted hover:text-foreground"
        aria-label="Otvori meni"
        aria-expanded={isOpen}
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
        </svg>
      </button>

      {/* Full-screen overlay via portal */}
      <MenuOverlay
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        accentColor={accentColor}
        hasTrainers={hasTrainers}
        hasContact={hasContact}
        gymName={gymName}
        gymLogo={gymLogo}
      />
    </>
  );
}
