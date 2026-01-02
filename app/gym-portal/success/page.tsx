"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface GymCredentials {
  gymName: string;
  staffId: string;
  pin: string;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const gymId = searchParams.get("gymId");

  const [isLoading, setIsLoading] = useState(true);
  const [credentials, setCredentials] = useState<GymCredentials | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!gymId) {
      setIsLoading(false);
      return;
    }

    // Retrieve credentials from sessionStorage (stored during registration)
    const storedCredentials = sessionStorage.getItem(`gym_credentials_${gymId}`);
    if (storedCredentials) {
      try {
        const parsed = JSON.parse(storedCredentials);
        setCredentials(parsed);
        // Clear credentials from storage after retrieval for security
        sessionStorage.removeItem(`gym_credentials_${gymId}`);
      } catch (error) {
        console.error("Error parsing credentials:", error);
      }
    }
    setIsLoading(false);
  }, [gymId]);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="py-20">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Učitavanje...
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 lg:py-20">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success Header */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-success/10 flex items-center justify-center">
            <span className="text-4xl">🎉</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
            Uspešna aktivacija!
          </h1>
          <p className="mt-4 text-lg text-foreground-muted">
            Vaša teretana je sada aktivna na Classic Method platformi.
          </p>
        </div>

        {/* Admin Credentials */}
        <div className="bg-background-secondary border border-border rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <span className="text-2xl">🔐</span>
            Vaši pristupni podaci
          </h2>
          <p className="text-sm text-foreground-muted mb-6">
            Sačuvajte ove podatke na sigurnom mestu. Koristićete ih za pristup admin panelu.
          </p>

          <div className="space-y-4">
            {/* Staff ID */}
            <div className="bg-background rounded-xl p-4 border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-foreground-muted mb-1">Staff ID</p>
                  <p className="text-xl font-mono font-bold text-foreground">
                    {credentials?.staffId || "S-XXXX"}
                  </p>
                </div>
                <button
                  onClick={() => credentials?.staffId && copyToClipboard(credentials.staffId, "staffId")}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-foreground-muted transition-colors"
                >
                  {copied === "staffId" ? "Kopirano!" : "Kopiraj"}
                </button>
              </div>
            </div>

            {/* PIN */}
            <div className="bg-background rounded-xl p-4 border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-foreground-muted mb-1">PIN</p>
                  <p className="text-xl font-mono font-bold text-foreground">
                    {credentials?.pin || "••••"}
                  </p>
                </div>
                <button
                  onClick={() => credentials?.pin && copyToClipboard(credentials.pin, "pin")}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-foreground-muted transition-colors"
                >
                  {copied === "pin" ? "Kopirano!" : "Kopiraj"}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-warning/10 border border-warning/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="text-sm font-medium text-warning">Važno</p>
                <p className="text-sm text-foreground-muted mt-1">
                  PIN se prikazuje samo jednom. Sačuvajte ga na sigurnom mestu.
                  Ako ga izgubite, kontaktirajte podršku.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-background-secondary border border-border rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Sledeći koraci
          </h2>
          <ol className="space-y-4">
            <li className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-accent">1</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Ulogujte se kao admin</p>
                <p className="text-sm text-foreground-muted">
                  Idite na <code className="text-accent">/staff-login</code> i unesite pristupne podatke.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-accent">2</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Dodajte trenere</p>
                <p className="text-sm text-foreground-muted">
                  Kreirajte naloge za vaše trenere u admin panelu.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-accent">3</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Registrujte članove</p>
                <p className="text-sm text-foreground-muted">
                  Počnite da dodajete članove i aktivirate njihove pretplate.
                </p>
              </div>
            </li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/staff-login"
            className="flex-1 py-4 px-6 bg-accent hover:bg-accent/90 text-white font-semibold text-center rounded-xl transition-colors"
          >
            Uloguj se kao admin
          </Link>
          <Link
            href="/gym-portal/manage"
            className="flex-1 py-4 px-6 bg-white/5 hover:bg-white/10 text-foreground font-medium text-center rounded-xl transition-colors"
          >
            Upravljanje teretanom
          </Link>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="py-20">
      <div className="max-w-md mx-auto px-4 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          Učitavanje...
        </h1>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SuccessContent />
    </Suspense>
  );
}
