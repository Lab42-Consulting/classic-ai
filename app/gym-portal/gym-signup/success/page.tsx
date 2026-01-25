"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

interface GymCredentials {
  gymName: string;
  staffId: string;
  pin: string;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const gymId = searchParams.get("gymId");
  const [credentials, setCredentials] = useState<GymCredentials | null>(null);

  useEffect(() => {
    if (gymId) {
      const stored = sessionStorage.getItem(`gym_credentials_${gymId}`);
      if (stored) {
        setCredentials(JSON.parse(stored));
        // Clear from session storage after retrieving
        sessionStorage.removeItem(`gym_credentials_${gymId}`);
      }
    }
  }, [gymId]);

  return (
    <div className="py-12 lg:py-20">
      <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-10 h-10 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Teretana uspešno registrovana!
          </h1>
          <p className="mt-3 text-foreground-muted">
            {credentials?.gymName || "Vaša teretana"} je sada aktivna na platformi.
          </p>
        </div>

        {/* Credentials Card */}
        {credentials && (
          <div className="bg-background-secondary border border-border rounded-2xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
              Admin pristupni podaci
            </h2>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-4">
              <p className="text-sm text-amber-300 flex items-start gap-2">
                <svg
                  className="w-4 h-4 mt-0.5 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                Sačuvajte ove podatke! Ovo je jedini put kada će biti prikazani.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-background rounded-xl">
                <span className="text-sm text-foreground-muted">Staff ID</span>
                <span className="font-mono font-semibold text-foreground">
                  {credentials.staffId}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-background rounded-xl">
                <span className="text-sm text-foreground-muted">PIN</span>
                <span className="font-mono font-semibold text-foreground">
                  {credentials.pin}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-background-secondary border border-border rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Sledeći koraci
          </h2>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-accent/20 text-accent rounded-full flex items-center justify-center text-sm font-medium shrink-0">
                1
              </span>
              <span className="text-foreground-muted">
                Prijavite se kao admin koristeći gore navedene podatke
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-accent/20 text-accent rounded-full flex items-center justify-center text-sm font-medium shrink-0">
                2
              </span>
              <span className="text-foreground-muted">
                Podesite sadržaj javnog sajta teretane (logo, boje, kontakt)
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-accent/20 text-accent rounded-full flex items-center justify-center text-sm font-medium shrink-0">
                3
              </span>
              <span className="text-foreground-muted">
                Dodajte članove i osoblje
              </span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            href="/staff-login"
            className="block w-full py-4 px-6 bg-accent hover:bg-accent/90 text-white font-semibold text-center rounded-xl transition-colors"
          >
            Prijavi se kao admin
          </Link>
          <Link
            href="/gym-portal"
            className="block w-full py-4 px-6 bg-background-secondary border border-border hover:border-accent/30 text-foreground font-medium text-center rounded-xl transition-colors"
          >
            Pogledaj javni sajt
          </Link>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="py-20 text-center">
      <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
    </div>
  );
}

export default function GymSignupSuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SuccessContent />
    </Suspense>
  );
}
