"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type TierFeature = "challenges" | "sessionScheduling" | "coachFeatures" | "customBranding";

interface TierGateProps {
  feature: TierFeature;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface TierInfo {
  tier: string;
  tierName: string;
  limits: {
    maxActiveMembers: number | null;
    aiMessagesPerMemberPerDay: number;
    aiMonthlyBudgetUsd: number;
  };
  features: Record<TierFeature, boolean>;
  memberCount: number;
  memberCapacityUsed: number;
}

const FEATURE_NAMES: Record<TierFeature, string> = {
  challenges: "Izazovi",
  sessionScheduling: "Zakazivanje termina",
  coachFeatures: "Trenerske funkcije",
  customBranding: "Prilagođeno brendiranje",
};

const REQUIRED_TIER: Record<TierFeature, string> = {
  challenges: "Pro",
  sessionScheduling: "Pro",
  coachFeatures: "Pro",
  customBranding: "Elite",
};

export function TierGate({ feature, children, fallback }: TierGateProps) {
  const [tierInfo, setTierInfo] = useState<TierInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTierInfo = async () => {
      try {
        const response = await fetch("/api/gym/tier-info");
        if (response.ok) {
          const data = await response.json();
          setTierInfo(data);
        } else {
          setError("Greška pri učitavanju informacija o paketu");
        }
      } catch {
        setError("Greška pri učitavanju");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTierInfo();
  }, []);

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center text-foreground-muted">
        {error}
      </div>
    );
  }

  // If feature is allowed, render children
  if (tierInfo?.features[feature]) {
    return <>{children}</>;
  }

  // If custom fallback is provided, use it
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default upgrade prompt
  return (
    <div className="py-12">
      <div className="max-w-lg mx-auto text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center">
          <svg
            className="w-10 h-10 text-accent"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-3">
          {FEATURE_NAMES[feature]}
        </h2>

        <p className="text-foreground-muted mb-6">
          Ova funkcija je dostupna na <span className="font-semibold text-accent">{REQUIRED_TIER[feature]}</span> paketu i višim paketima.
          Nadogradite vaš paket da biste otključali ovu funkciju.
        </p>

        <div className="bg-background-secondary border border-border rounded-2xl p-6 mb-6">
          <p className="text-sm text-foreground-muted mb-2">Trenutni paket</p>
          <p className="text-xl font-bold text-foreground">{tierInfo?.tierName || "Starter"}</p>
        </div>

        <Link
          href="/gym-portal/manage/subscription"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent hover:bg-accent/90 text-white font-semibold rounded-xl transition-colors"
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
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
          Nadogradi paket
        </Link>
      </div>
    </div>
  );
}

/**
 * Hook to check if a feature is available for the current gym's tier
 */
export function useTierFeature(feature: TierFeature) {
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
  const [tierInfo, setTierInfo] = useState<TierInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTierInfo = async () => {
      try {
        const response = await fetch("/api/gym/tier-info");
        if (response.ok) {
          const data = await response.json();
          setTierInfo(data);
          setIsAllowed(data.features[feature] ?? false);
        } else {
          setIsAllowed(false);
        }
      } catch {
        setIsAllowed(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTierInfo();
  }, [feature]);

  return { isAllowed, tierInfo, isLoading };
}

/**
 * Inline component for conditionally showing content based on tier
 */
export function TierFeatureCheck({
  feature,
  children,
  showUpgradeHint = false,
}: {
  feature: TierFeature;
  children: React.ReactNode;
  showUpgradeHint?: boolean;
}) {
  const { isAllowed, isLoading } = useTierFeature(feature);

  if (isLoading) return null;
  if (!isAllowed) {
    if (showUpgradeHint) {
      return (
        <span className="text-xs text-foreground-muted">
          ({REQUIRED_TIER[feature]}+)
        </span>
      );
    }
    return null;
  }

  return <>{children}</>;
}
