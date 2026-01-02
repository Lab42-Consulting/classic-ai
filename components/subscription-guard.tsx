"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

// Pages that expired users can still access
const ALLOWED_EXPIRED_PATHS = [
  "/subscription-expired",
  "/subscription",
  "/unavailable",
];

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    // Skip check for allowed paths
    if (ALLOWED_EXPIRED_PATHS.some(path => pathname.startsWith(path))) {
      setIsAllowed(true);
      setIsChecking(false);
      return;
    }

    const checkSubscription = async () => {
      try {
        const response = await fetch("/api/member/subscription");

        if (!response.ok) {
          // If API fails, allow access (fail open for better UX)
          setIsAllowed(true);
          setIsChecking(false);
          return;
        }

        const data = await response.json();

        if (data.status === "gym_expired") {
          // Gym subscription expired - show generic unavailable message
          router.replace("/unavailable");
          return;
        }

        if (data.status === "expired") {
          // Member subscription expired
          router.replace("/subscription-expired");
          return;
        }

        // Subscription is active
        setIsAllowed(true);
        setIsChecking(false);
      } catch {
        // On error, allow access (fail open)
        setIsAllowed(true);
        setIsChecking(false);
      }
    };

    checkSubscription();
  }, [pathname, router]);

  // Show loading while checking
  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-foreground-muted">Učitava se...</div>
      </div>
    );
  }

  // If not allowed, don't render (redirect is happening)
  if (!isAllowed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-foreground-muted">Preusmeravanje...</div>
      </div>
    );
  }

  return <>{children}</>;
}
