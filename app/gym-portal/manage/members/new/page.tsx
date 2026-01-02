"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

export default function NewMemberPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "success">("form");
  const [name, setName] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  const handleSubmit = async () => {
    if (!name.trim() || !goal) {
      setError("Ime i cilj su obavezni");
      return;
    }

    setSubmitting(true);
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
      setSubmitting(false);
    }
  };

  if (step === "success" && credentials) {
    return (
      <div className="max-w-2xl mx-auto">
          {/* Success Card */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-8 text-center mb-8">
            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {name} je registrovan/a!
            </h1>
            <p className="text-foreground-muted">
              Podeli ove pristupne podatke članu
            </p>
          </div>

          {/* Credentials */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-background-secondary border border-border rounded-2xl p-6">
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
            </div>

            <div className="bg-background-secondary border border-border rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">QR kod za prijavu</h3>
              <div className="flex justify-center">
                <img
                  src={credentials.qrCode}
                  alt="Login QR Code"
                  className="w-40 h-40 rounded-lg"
                />
              </div>
              <p className="text-sm text-foreground-muted text-center mt-4">
                Skeniraj za brzu prijavu
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => {
                setStep("form");
                setName("");
                setHeight("");
                setWeight("");
                setGender(null);
                setGoal(null);
                setCredentials(null);
              }}
              className="flex-1 px-6 py-3 bg-accent text-white rounded-xl font-medium hover:bg-accent/90 transition-colors"
            >
              Registruj još jednog člana
            </button>
            <Link
              href="/gym-portal/manage/members"
              className="flex-1 px-6 py-3 bg-background-secondary border border-border text-foreground rounded-xl font-medium hover:border-foreground-muted transition-colors text-center"
            >
              Nazad na listu članova
            </Link>
          </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Registruj novog člana
        </h1>
        <p className="text-foreground-muted mt-1">
          Unesi osnovne podatke za registraciju člana
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl max-w-5xl">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Form - Two Column Layout on Desktop */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr,300px] gap-6">
        {/* Left Column - Basic Info */}
        <div className="bg-background-secondary border border-border rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Osnovne informacije</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground-muted mb-2">
                Ime ili nadimak *
              </label>
              <input
                type="text"
                placeholder="npr. Marko Marković"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground-muted mb-2">
                  Visina (cm)
                </label>
                <input
                  type="number"
                  placeholder="175"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground-muted mb-2">
                  Težina (kg)
                </label>
                <input
                  type="number"
                  placeholder="70"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
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
                    type="button"
                    onClick={() => setGender(gender === g.value ? null : g.value)}
                    className={`
                      py-3 rounded-xl border-2 transition-all text-sm font-medium
                      ${gender === g.value
                        ? "border-accent bg-accent/10 text-foreground"
                        : "border-border text-foreground hover:border-foreground-muted"
                      }
                    `}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Goal */}
        <div className="bg-background-secondary border border-border rounded-2xl p-6 h-fit">
          <h2 className="text-lg font-semibold text-foreground mb-4">Primarni cilj *</h2>
          <div className="space-y-3">
            {GOALS.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => setGoal(g.value)}
                className={`
                  w-full text-left p-4 rounded-xl border-2 transition-all
                  ${goal === g.value
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-foreground-muted"
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
        </div>
      </div>

      {/* Submit - Full Width Below */}
      <div className="flex flex-col sm:flex-row gap-4 mt-6">
        <button
          onClick={handleSubmit}
          disabled={!name.trim() || !goal || submitting}
          className="flex-1 px-6 py-3 bg-accent text-white rounded-xl font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Registrujem..." : "Registruj člana"}
        </button>
        <Link
          href="/gym-portal/manage/members"
          className="px-6 py-3 bg-background-secondary border border-border text-foreground rounded-xl font-medium hover:border-foreground-muted transition-colors text-center"
        >
          Otkaži
        </Link>
      </div>
    </div>
  );
}
