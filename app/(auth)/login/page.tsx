"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button, GlassCard, Input, PinInput } from "@/components/ui";

interface Gym {
  id: string;
  name: string;
  logo: string | null;
}

export default function LoginPage() {
  const router = useRouter();
  const [memberId, setMemberId] = useState("");
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
    if (memberId.length < 4) {
      setError("Unesi svoj Member ID");
      return;
    }
    setError("");
    setStep("pin");
  };

  const handleLogin = async (enteredPin: string) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, pin: enteredPin, gymId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Prijava nije uspela");
        return;
      }

      router.push("/home");
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
        {/* Gradient orb top right */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-accent/20 rounded-full blur-[120px]" />
        {/* Gradient orb bottom left */}
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/10 rounded-full blur-[120px]" />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Branding */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black tracking-tight text-foreground mb-1">
            CLASSIC
          </h1>
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="h-[2px] w-6 bg-accent" />
            <p className="text-sm font-medium tracking-[0.3em] text-foreground-muted uppercase">
              Method
            </p>
            <div className="h-[2px] w-6 bg-accent" />
          </div>
        </div>

        {/* Login Card */}
        <GlassCard variant="prominent" className="p-8">
          {step === "id" ? (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Dobrodošao
                </h2>
                <p className="text-foreground-muted">
                  Izaberi teretanu i unesi Member ID
                </p>
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
                  placeholder="ABC123"
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value.toUpperCase())}
                  autoComplete="off"
                  error={error}
                  className="text-center text-xl font-semibold tracking-widest h-14"
                />

                <Button
                  className="w-full h-14 text-lg font-bold"
                  onClick={handleIdSubmit}
                  disabled={!gymId || memberId.length < 4}
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
                  <span className="font-mono font-semibold text-foreground">{memberId}</span>
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
                Promeni Member ID
              </Button>
            </div>
          )}
        </GlassCard>

        {/* Footer */}
        <div className="mt-10 text-center space-y-4">
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-12 bg-border" />
            <span className="text-xs text-foreground-muted uppercase tracking-wider">ili</span>
            <div className="h-px w-12 bg-border" />
          </div>

          <div className="flex items-center justify-center gap-6">
            <a
              href="/staff-login"
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
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              Staff pristup
            </a>
            <span className="text-foreground-muted">·</span>
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
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Nazad na sajt
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
