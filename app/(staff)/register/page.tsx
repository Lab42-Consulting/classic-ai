"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input } from "@/components/ui";

const GOALS = [
  { value: "fat_loss", label: "Gubitak masnoće", description: "Gubitak masnog tkiva uz očuvanje mišića" },
  { value: "muscle_gain", label: "Rast mišića", description: "Izgradnja mišića i povećanje snage" },
  { value: "recomposition", label: "Rekompozicija", description: "Gubitak masnoće i rast mišića istovremeno" },
];

interface Credentials {
  memberId: string;
  pin: string;
  qrCode: string;
}

export default function RegisterMemberPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "success">("form");
  const [name, setName] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  const handleSubmit = async () => {
    if (!name.trim() || !goal) {
      setError("Ime i cilj su obavezni");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          height: height || undefined,
          weight: weight || undefined,
          gender: gender || undefined,
          goal,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setCredentials(data.credentials);
        setStep("success");
      } else {
        setError(data.error || "Registracija člana nije uspela");
      }
    } catch {
      setError("Nije moguće povezivanje. Pokušaj ponovo.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "success" && credentials) {
    return (
      <div className="min-h-screen bg-background px-6 pt-12 pb-24">
        <header className="flex items-center justify-between mb-8">
          <div className="w-10" />
          <h1 className="text-xl font-bold text-foreground">Član registrovan</h1>
          <div className="w-10" />
        </header>

        <div className="space-y-6">
          <Card className="text-center py-6">
            <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {name} je registrovan/a!
            </h2>
            <p className="text-foreground-muted">
              Podeli ove pristupne podatke
            </p>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-foreground mb-4">Pristupni podaci</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-border">
                <span className="text-foreground-muted">Member ID</span>
                <span className="text-xl font-mono font-bold text-foreground">
                  {credentials.memberId}
                </span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-foreground-muted">PIN</span>
                <span className="text-xl font-mono font-bold text-foreground">
                  {credentials.pin}
                </span>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-foreground mb-4">QR kod za prijavu</h3>
            <div className="flex justify-center">
              <img
                src={credentials.qrCode}
                alt="Login QR Code"
                className="w-48 h-48 rounded-lg"
              />
            </div>
            <p className="text-sm text-foreground-muted text-center mt-4">
              Skeniraj ovaj QR kod za brzu prijavu
            </p>
          </Card>

          <div className="space-y-3">
            <Button
              className="w-full"
              onClick={() => {
                setStep("form");
                setName("");
                setHeight("");
                setWeight("");
                setGender(null);
                setGoal(null);
                setCredentials(null);
              }}
            >
              Registruj još jednog člana
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => router.push("/dashboard")}
            >
              Nazad na kontrolnu tablu
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="px-6 pt-12 pb-6 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2"
          aria-label="Go back"
        >
          <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-foreground">Registruj člana</h1>
        <div className="w-10" />
      </header>

      <main className="px-6 space-y-6">
        {error && (
          <div className="p-4 bg-error/10 border border-error/20 rounded-xl">
            <p className="text-error text-sm">{error}</p>
          </div>
        )}

        <Card>
          <h3 className="text-lg font-semibold text-foreground mb-4">Osnovne informacije</h3>
          <div className="space-y-4">
            <Input
              label="Ime ili nadimak *"
              placeholder="npr. Marko"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Visina (cm)"
                type="number"
                placeholder="175"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
              <Input
                label="Težina (kg)"
                type="number"
                placeholder="70"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground-muted mb-2">
                Pol (opciono)
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: "male", label: "Muški" },
                  { value: "female", label: "Ženski" },
                  { value: "other", label: "Drugo" },
                ].map((g) => (
                  <button
                    key={g.value}
                    onClick={() => setGender(g.value)}
                    className={`
                      py-3 rounded-xl border-2 transition-all
                      ${gender === g.value
                        ? "border-accent bg-accent/10"
                        : "border-border hover:border-border-hover"
                      }
                    `}
                  >
                    <span className="text-sm font-medium text-foreground">{g.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-foreground mb-4">Primarni cilj *</h3>
          <div className="space-y-3">
            {GOALS.map((g) => (
              <button
                key={g.value}
                onClick={() => setGoal(g.value)}
                className={`
                  w-full text-left p-4 rounded-xl border-2 transition-all
                  ${goal === g.value
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-border-hover"
                  }
                `}
              >
                <span className="block font-medium text-foreground">{g.label}</span>
                <span className="block text-sm text-foreground-muted mt-1">
                  {g.description}
                </span>
              </button>
            ))}
          </div>
        </Card>
      </main>

      {/* Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent">
        <Button
          className="w-full"
          size="lg"
          onClick={handleSubmit}
          disabled={!name.trim() || !goal || loading}
          loading={loading}
        >
          Registruj člana
        </Button>
      </div>
    </div>
  );
}
