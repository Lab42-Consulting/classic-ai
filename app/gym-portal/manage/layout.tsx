"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Sidebar from "./sidebar";
import MobileNav from "./mobile-nav";

interface GymData {
  id: string;
  name: string;
  logo?: string | null;
  subscriptionStatus: string;
  subscribedUntil?: string | null;
  primaryColor?: string | null;
}

interface StaffData {
  id: string;
  name: string;
  role: string;
}

export default function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [gym, setGym] = useState<GymData | null>(null);
  const [staff, setStaff] = useState<StaffData | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if user is logged in as admin staff
        const response = await fetch("/api/gym/settings");

        if (!response.ok) {
          router.push("/staff-login");
          return;
        }

        const data = await response.json();

        // Check if user is admin or owner
        const role = data.staff?.role?.toLowerCase();
        if (role !== "admin" && role !== "owner") {
          router.push("/dashboard");
          return;
        }

        // Owners can only access the locations page
        if (role === "owner" && !pathname.includes("/locations")) {
          router.push("/gym-portal/manage/locations");
          return;
        }

        setGym(data.gym);
        setStaff(data.staff);
        setIsLoading(false);
      } catch {
        router.push("/staff-login");
      }
    };

    checkAuth();
  }, [router, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-foreground-muted">Učitavanje...</p>
        </div>
      </div>
    );
  }

  const daysRemaining = gym?.subscribedUntil
    ? Math.ceil(
        (new Date(gym.subscribedUntil).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  const isOwner = staff?.role?.toLowerCase() === "owner";

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/staff-login");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header - minimal design */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50 h-16">
        <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Logo */}
          <Link
            href={
              isOwner ? "/gym-portal/manage/locations" : "/gym-portal/manage"
            }
            className="flex items-center gap-3"
          >
            {gym?.logo ? (
              <img
                src={gym.logo}
                alt={gym.name}
                className="w-10 h-10 rounded-xl object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                <span className="text-xl font-bold text-white">
                  {gym?.name?.charAt(0) || "G"}
                </span>
              </div>
            )}
            <div className="hidden sm:block">
              <span className="text-lg font-semibold text-foreground">
                {gym?.name}
              </span>
            </div>
          </Link>

          {/* Mobile menu button */}
          <MobileNav
            isOwner={isOwner}
            staffName={staff?.name}
            staffRole={staff?.role}
            onLogout={handleLogout}
          />
        </div>
      </header>

      {/* Subscription warning banner */}
      {daysRemaining !== null && daysRemaining <= 7 && (
        <div
          className={`px-4 py-3 text-center text-sm ${
            daysRemaining <= 0
              ? "bg-red-500/20 text-red-400"
              : "bg-yellow-500/20 text-yellow-400"
          }`}
        >
          {daysRemaining <= 0 ? (
            <>
              Vaša pretplata je istekla.{" "}
              <Link
                href="/gym-portal/manage/billing"
                className="underline font-medium"
              >
                Obnovite sada
              </Link>
            </>
          ) : (
            <>
              Vaša pretplata ističe za {daysRemaining}{" "}
              {daysRemaining === 1 ? "dan" : "dana"}.{" "}
              <Link
                href="/gym-portal/manage/billing"
                className="underline font-medium"
              >
                Upravljajte pretplatom
              </Link>
            </>
          )}
        </div>
      )}

      {/* Main layout with sidebar */}
      <div className="flex flex-1">
        {/* Sidebar - desktop only */}
        <Sidebar
          isOwner={isOwner}
          accentColor={gym?.primaryColor || undefined}
          staffName={staff?.name}
          staffRole={isOwner ? "Owner" : "Admin"}
          onLogout={handleLogout}
        />

        {/* Main Content */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      {/* Footer - hidden on mobile */}
      <footer className="border-t border-border py-4 hidden sm:block">
        <div className="px-4 sm:px-6 lg:px-8">
          <p className="text-sm text-foreground-muted text-center">
            Classic Method &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
