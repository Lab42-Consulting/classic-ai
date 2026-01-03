"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface GymStats {
  gym: {
    id: string;
    name: string;
    logo?: string | null;
    subscriptionStatus: string;
    subscribedAt?: string | null;
    subscribedUntil?: string | null;
    primaryColor?: string | null;
  };
  stats: {
    totalMembers: number;
    activeMembers: number;
    totalStaff: number;
    coaches: number;
  };
}

export default function ManagePage() {
  const [data, setData] = useState<GymStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/gym/settings");
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error("Failed to fetch gym stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-20 text-center text-foreground-muted">
        Greška pri učitavanju podataka
      </div>
    );
  }

  const { gym, stats } = data;

  const daysRemaining = gym.subscribedUntil
    ? Math.ceil((new Date(gym.subscribedUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const statusColors = {
    active: "text-emerald-400 bg-emerald-500/20",
    grace: "text-yellow-400 bg-yellow-500/20",
    expired: "text-red-400 bg-red-500/20",
    pending: "text-gray-400 bg-gray-500/20",
  };

  const statusLabels = {
    active: "Aktivna",
    grace: "Grace period",
    expired: "Istekla",
    pending: "Na čekanju",
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Pregled teretane
        </h1>
        <p className="text-foreground-muted mt-2">
          Upravljajte postavkama i pratite statistiku vaše teretane
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Subscription Status */}
        <div className="bg-background-secondary border border-border rounded-2xl p-6">
          <p className="text-sm text-foreground-muted mb-2">Status pretplate</p>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              statusColors[gym.subscriptionStatus as keyof typeof statusColors] || statusColors.pending
            }`}>
              {statusLabels[gym.subscriptionStatus as keyof typeof statusLabels] || "Nepoznato"}
            </span>
          </div>
          {daysRemaining !== null && gym.subscriptionStatus === "active" && (
            <p className="text-xs text-foreground-muted mt-2">
              Još {daysRemaining} {daysRemaining === 1 ? "dan" : "dana"}
            </p>
          )}
        </div>

        {/* Total Members */}
        <div className="bg-background-secondary border border-border rounded-2xl p-6">
          <p className="text-sm text-foreground-muted mb-2">Ukupno članova</p>
          <p className="text-3xl font-bold text-foreground">{stats.totalMembers}</p>
          <p className="text-xs text-foreground-muted mt-2">
            {stats.activeMembers} aktivnih
          </p>
        </div>

        {/* Total Staff */}
        <div className="bg-background-secondary border border-border rounded-2xl p-6">
          <p className="text-sm text-foreground-muted mb-2">Osoblje</p>
          <p className="text-3xl font-bold text-foreground">{stats.totalStaff}</p>
          <p className="text-xs text-foreground-muted mt-2">
            {stats.coaches} trenera
          </p>
        </div>

        {/* Member Since */}
        <div className="bg-background-secondary border border-border rounded-2xl p-6">
          <p className="text-sm text-foreground-muted mb-2">Aktivna od</p>
          <p className="text-lg font-semibold text-foreground">
            {gym.subscribedAt
              ? new Date(gym.subscribedAt).toLocaleDateString("sr-RS", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "—"}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">Brze akcije</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/gym-portal/manage/members"
            className="flex items-center gap-4 bg-background-secondary border border-border rounded-xl p-5 hover:border-accent/30 transition-colors group"
          >
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 group-hover:bg-violet-500/20 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-foreground">Članovi</p>
              <p className="text-sm text-foreground-muted">Upravljaj članovima</p>
            </div>
          </Link>

          <Link
            href="/gym-portal/manage/members/new"
            className="flex items-center gap-4 bg-background-secondary border border-border rounded-xl p-5 hover:border-accent/30 transition-colors group"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-foreground">Novi član</p>
              <p className="text-sm text-foreground-muted">Registruj člana</p>
            </div>
          </Link>

          <Link
            href="/gym-portal/manage/staff"
            className="flex items-center gap-4 bg-background-secondary border border-border rounded-xl p-5 hover:border-accent/30 transition-colors group"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/20 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-foreground">Osoblje</p>
              <p className="text-sm text-foreground-muted">Treneri i admini</p>
            </div>
          </Link>

          <Link
            href="/gym-portal/manage/branding"
            className="flex items-center gap-4 bg-background-secondary border border-border rounded-xl p-5 hover:border-accent/30 transition-colors group"
          >
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent/20 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-foreground">Brendiranje</p>
              <p className="text-sm text-foreground-muted">Logo, boje, izgled</p>
            </div>
          </Link>

          <Link
            href="/gym-portal/manage/checkin"
            className="flex items-center gap-4 bg-background-secondary border border-border rounded-xl p-5 hover:border-accent/30 transition-colors group"
          >
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500/20 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-foreground">QR Prijava</p>
              <p className="text-sm text-foreground-muted">Verifikacija treninga</p>
            </div>
          </Link>

          <Link
            href="/gym-portal/manage/pending-meals"
            className="flex items-center gap-4 bg-background-secondary border border-border rounded-xl p-5 hover:border-accent/30 transition-colors group"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/20 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-foreground">Obroci na čekanju</p>
              <p className="text-sm text-foreground-muted">Odobri podeljene obroke</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Branding Preview */}
      <div className="bg-background-secondary border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Brendiranje teretane</h2>
          <Link
            href="/gym-portal/manage/branding"
            className="text-sm text-accent hover:text-accent/80 transition-colors"
          >
            Izmeni
          </Link>
        </div>

        <div className="flex items-center gap-6">
          {/* Logo Preview */}
          <div className="flex flex-col items-center">
            {gym.logo ? (
              <img
                src={gym.logo}
                alt={gym.name}
                className="w-20 h-20 rounded-2xl object-cover border border-border"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center border border-border">
                <span className="text-3xl font-bold text-accent">
                  {gym.name.charAt(0)}
                </span>
              </div>
            )}
            <p className="text-xs text-foreground-muted mt-2">Logo</p>
          </div>

          {/* Color Preview */}
          <div className="flex flex-col items-center">
            <div
              className="w-20 h-20 rounded-2xl border border-border"
              style={{ backgroundColor: gym.primaryColor || "#ef4444" }}
            />
            <p className="text-xs text-foreground-muted mt-2">Primarna boja</p>
          </div>
        </div>
      </div>
    </div>
  );
}
