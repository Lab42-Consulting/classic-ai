"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button, GlassCard, Input, PinInput } from "@/components/ui";
import { Suspense } from "react";

interface Gym {
  id: string;
  name: string;
  logo: string | null;
}

function StaffLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/dashboard";

  const [staffId, setStaffId] = useState("");
  const [gymId, setGymId] = useState("");
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [gymsLoading, setGymsLoading] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"id" | "pin">("id");

  useEffect(() => {
    const fetchGyms = async () => {
      try {
        const response = await fetch("/api/gyms");
        if (response.ok) {
          const data = await response.json();
          setGyms(data.gyms);
        }
      } catch {
        // Handle silently
      } finally {
        setGymsLoading(false);
      }
    };

    fetchGyms();
  }, []);

  const handleIdSubmit = () => {
    if (!gymId) {
      setError("Izaberi teretanu");
      return;
    }
    if (staffId.length < 4) {
      setError("Unesi svoj Staff ID");
      return;
    }
    setError("");
    setStep("pin");
  };

  const handleLogin = async (enteredPin: string) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/staff-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId, pin: enteredPin, gymId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Prijava nije uspela");
        return;
      }

      // Redirect based on role: admins go to gym portal, coaches go to dashboard
      const isAdmin = data.user?.role?.toLowerCase() === "admin";
      if (isAdmin) {
        router.push("/gym-portal/manage");
      } else {
        // Validate redirect URL to prevent open redirect
        const safeRedirect = redirectUrl.startsWith("/") ? redirectUrl : "/dashboard";
        router.push(safeRedirect);
      }
    } catch {
      setError("Greška u povezivanju. Pokušaj ponovo.");
    } finally {
      setLoading(false);
    }
  };

  const handlePinComplete = (enteredPin: string) => {
    handleLogin(enteredPin);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient orb top left - different position for staff */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-accent/15 rounded-full blur-[120px]" />
        {/* Gradient orb bottom right */}
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-accent/10 rounded-full blur-[120px]" />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Branding */}
        <div className="text-center mb-12">
          {/* Staff badge icon */}
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-accent"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
          </div>

          {/* Brand name */}
          <h1 className="text-4xl font-black tracking-tight text-foreground mb-2">
            CLASSIC
          </h1>
          <p className="text-sm font-medium tracking-[0.2em] text-accent uppercase">
            Staff Portal
          </p>
        </div>

        {/* Login Card */}
        <GlassCard variant="prominent" className="p-8">
          {step === "id" ? (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Prijava osoblja
                </h2>
                <p className="text-foreground-muted">Izaberi teretanu i unesi Staff ID</p>
              </div>

              <div className="space-y-6">
                {/* Gym Selector */}
                <div>
                  <label className="block text-sm text-foreground-muted text-center mb-4">Teretana</label>
                  <div className="flex items-center gap-3">
                    {/* Gym Logo */}
                    {gymId && gyms.find(g => g.id === gymId)?.logo && (
                      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border border-border bg-white/5">
                        <Image
                          src={gyms.find(g => g.id === gymId)!.logo!}
                          alt={gyms.find(g => g.id === gymId)?.name || "Gym"}
                          width={56}
                          height={56}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                    <div className="relative flex-1">
                      <select
                        value={gymId}
                        onChange={(e) => setGymId(e.target.value)}
                        disabled={gymsLoading}
                        className="w-full h-14 px-4 rounded-xl bg-background border border-border text-white text-lg font-medium appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all disabled:opacity-50 [&>option]:bg-background [&>option]:text-white"
                      >
                        <option value="">
                          {gymsLoading ? "Učitavanje..." : "Izaberi teretanu"}
                        </option>
                        {gyms.map((gym) => (
                          <option key={gym.id} value={gym.id}>
                            {gym.name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="w-5 h-5 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                <Input
                  placeholder="S-ADMIN"
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value.toUpperCase())}
                  autoComplete="off"
                  error={error}
                  className="text-center text-xl font-semibold tracking-widest h-14"
                />

                <Button
                  className="w-full h-14 text-lg font-bold"
                  onClick={handleIdSubmit}
                  disabled={!gymId || staffId.length < 4}
                >
                  Nastavi
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Unesi PIN
                </h2>
                <p className="text-foreground-muted">
                  <span className="font-medium text-foreground">
                    {gyms.find(g => g.id === gymId)?.name}
                  </span>
                  {" · "}
                  <span className="font-mono font-semibold text-foreground">
                    {staffId}
                  </span>
                </p>
              </div>

              <PinInput
                length={4}
                onComplete={handlePinComplete}
                error={error}
                disabled={loading}
              />

              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep("id");
                  setError("");
                }}
                disabled={loading}
              >
                Promeni Staff ID
              </Button>
            </div>
          )}
        </GlassCard>

        {/* Footer */}
        <div className="mt-10 text-center space-y-4">
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-12 bg-border" />
            <span className="text-xs text-foreground-muted uppercase tracking-wider">
              ili
            </span>
            <div className="h-px w-12 bg-border" />
          </div>

          <div className="flex items-center justify-center gap-4">
            <a
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-accent transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Prijava člana
            </a>

            <span className="text-border">|</span>

            <a
              href="/gym-portal"
              className="inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-accent transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              Registruj teretanu
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function StaffLoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <StaffLoginContent />
    </Suspense>
  );
}
