"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

        // Check if user is admin
        if (data.staff?.role?.toLowerCase() !== "admin") {
          router.push("/dashboard");
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
  }, [router]);

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
    ? Math.ceil((new Date(gym.subscribedUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <Link href="/gym-portal/manage" className="flex items-center gap-3">
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
                  <span className="text-lg font-semibold text-foreground">{gym?.name}</span>
                  <span className="text-sm text-foreground-muted ml-2">Admin Panel</span>
                </div>
              </Link>
            </div>

            {/* Navigation */}
            <nav className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/gym-portal/manage"
                className="text-sm text-foreground-muted hover:text-foreground transition-colors px-3 py-2"
              >
                Pregled
              </Link>
              <Link
                href="/gym-portal/manage/members"
                className="text-sm text-foreground-muted hover:text-foreground transition-colors px-3 py-2"
              >
                Članovi
              </Link>
              <Link
                href="/gym-portal/manage/staff"
                className="text-sm text-foreground-muted hover:text-foreground transition-colors px-3 py-2 hidden sm:inline-flex"
              >
                Osoblje
              </Link>
              <Link
                href="/gym-portal/manage/branding"
                className="text-sm text-foreground-muted hover:text-foreground transition-colors px-3 py-2 hidden sm:inline-flex"
              >
                Brendiranje
              </Link>
              <button
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  router.push("/staff-login");
                }}
                className="ml-2 text-sm font-medium border border-accent/30 text-accent hover:bg-accent hover:text-white px-4 py-1.5 rounded-lg transition-all"
              >
                Odjavi se
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Subscription warning banner */}
      {daysRemaining !== null && daysRemaining <= 7 && (
        <div className={`px-4 py-3 text-center text-sm ${
          daysRemaining <= 0
            ? "bg-red-500/20 text-red-400"
            : "bg-yellow-500/20 text-yellow-400"
        }`}>
          {daysRemaining <= 0 ? (
            <>Vaša pretplata je istekla. <Link href="/gym-portal/manage/billing" className="underline font-medium">Obnovite sada</Link></>
          ) : (
            <>Vaša pretplata ističe za {daysRemaining} {daysRemaining === 1 ? "dan" : "dana"}. <Link href="/gym-portal/manage/billing" className="underline font-medium">Upravljajte pretplatom</Link></>
          )}
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between text-sm text-foreground-muted">
            <span>Classic Method &copy; {new Date().getFullYear()}</span>
            <span>Prijavljeni kao: {staff?.name} ({staff?.role})</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
