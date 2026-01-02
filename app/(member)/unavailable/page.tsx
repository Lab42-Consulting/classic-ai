"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function UnavailablePage() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-foreground-muted/10 flex items-center justify-center">
          <svg
            className="w-12 h-12 text-foreground-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Message */}
        <h1 className="text-2xl font-bold text-foreground mb-4">
          Aplikacija trenutno nije dostupna
        </h1>
        <p className="text-foreground-muted mb-8">
          Molimo pokušajte ponovo kasnije ili kontaktirajte svoju teretanu za više informacija.
        </p>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full py-4 px-6 bg-white/5 hover:bg-white/10 disabled:bg-white/5 text-foreground font-medium rounded-xl transition-colors"
        >
          {isLoggingOut ? "Odjava..." : "Odjavi se"}
        </button>
      </div>
    </div>
  );
}
