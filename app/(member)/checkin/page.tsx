"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, GlassCard, SlideUp, FadeIn } from "@/components/ui";
import { getTranslations } from "@/lib/i18n";

const t = getTranslations("sr");

const FEELINGS = [
  { value: 1, emoji: "😞", label: t.checkin.feelings.notGreat },
  { value: 2, emoji: "😐", label: t.checkin.feelings.okay },
  { value: 3, emoji: "🙂", label: t.checkin.feelings.good },
  { value: 4, emoji: "😄", label: t.checkin.feelings.great },
];

interface CheckinStatus {
  hasCheckedInThisWeek: boolean;
  canCheckIn: boolean;
  daysUntilNextCheckin: number;
  missedWeeks: number;
}

export default function CheckinPage() {
  const router = useRouter();
  const [weight, setWeight] = useState("");
  const [feeling, setFeeling] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [status, setStatus] = useState<CheckinStatus | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch("/api/checkins");
        const data = await response.json();
        setStatus(data);
      } catch {
        // Continue to show form
      } finally {
        setCheckingStatus(false);
      }
    };

    checkStatus();
  }, []);

  const handleSubmit = async () => {
    if (!weight || !feeling) return;

    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum < 30 || weightNum > 300) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weight: weightNum, feeling }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/home");
          router.refresh();
        }, 1500);
      } else {
        setError(data.error || "Greška pri čuvanju");
      }
    } catch {
      setError("Greška u povezivanju");
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <FadeIn>
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full glass flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-foreground-muted">{t.common.loading}</p>
          </div>
        </FadeIn>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <FadeIn>
          <div className="text-center animate-scale-in">
            <div className="w-20 h-20 bg-success rounded-full flex items-center justify-center mx-auto mb-4 glow-success">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-2xl text-display text-foreground mb-2">{t.checkin.completed}</p>
            <p className="text-foreground-muted">{t.checkin.greatJob}</p>
          </div>
        </FadeIn>
      </div>
    );
  }

  // Already checked in this week
  if (status?.hasCheckedInThisWeek) {
    return (
      <div className="min-h-screen bg-background">
        <Header router={router} />
        <main className="px-6">
          <SlideUp delay={100}>
            <GlassCard variant="prominent" className="text-center py-10">
              <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4 glow-success">
                <svg className="w-10 h-10 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl text-display text-foreground mb-2">
                {t.checkin.alreadyCheckedIn}
              </h2>
              <p className="text-foreground-muted">
                {t.checkin.alreadyCheckedInDesc}
              </p>
            </GlassCard>
          </SlideUp>

          <SlideUp delay={200}>
            <div className="mt-6">
              <Button
                variant="secondary"
                className="w-full btn-press"
                size="lg"
                onClick={() => router.push("/home")}
              >
                {t.checkin.backToHome}
              </Button>
            </div>
          </SlideUp>
        </main>
      </div>
    );
  }

  // Must wait X days before next check-in
  if (status && !status.canCheckIn && status.daysUntilNextCheckin > 0) {
    const days = status.daysUntilNextCheckin;
    return (
      <div className="min-h-screen bg-background">
        <Header router={router} />
        <main className="px-6">
          <SlideUp delay={100}>
            <GlassCard variant="prominent" className="text-center py-10">
              <div className="w-20 h-20 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">⏳</span>
              </div>
              <h2 className="text-xl text-display text-foreground mb-2">
                Sačekaj još malo
              </h2>
              <p className="text-foreground-muted mb-4">
                Možeš ponovo da uradiš pregled za
              </p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-4xl font-bold text-accent">{days}</span>
                <span className="text-foreground-muted">
                  {days === 1 ? "dan" : "dana"}
                </span>
              </div>
              <p className="text-sm text-foreground-muted mt-4">
                Pregledi su dozvoljeni jednom nedeljno (minimum 7 dana)
              </p>
            </GlassCard>
          </SlideUp>

          <SlideUp delay={200}>
            <div className="mt-6">
              <Button
                variant="secondary"
                className="w-full btn-press"
                size="lg"
                onClick={() => router.push("/home")}
              >
                {t.checkin.backToHome}
              </Button>
            </div>
          </SlideUp>
        </main>
      </div>
    );
  }

  // Main check-in form
  return (
    <div className="min-h-screen bg-background pb-32">
      <Header router={router} />

      <main className="px-6 space-y-6">
        {/* Missed Weeks Warning (Accountability) */}
        {status && status.missedWeeks > 0 && (
          <SlideUp delay={50}>
            <GlassCard className="border-warning/30 bg-warning/5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-warning/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">⚠️</span>
                </div>
                <div>
                  <p className="text-foreground font-medium mb-1">
                    Propušteno {status.missedWeeks} {status.missedWeeks === 1 ? "pregled" : "pregleda"}
                  </p>
                  <p className="text-sm text-foreground-muted">
                    Redovni pregledi su ključni za praćenje napretka.
                    Nema brige, nastavi gde si stao!
                  </p>
                </div>
              </div>
            </GlassCard>
          </SlideUp>
        )}

        <SlideUp delay={100}>
          <p className="text-foreground-muted text-center text-lg">
            {t.checkin.subtitle}
          </p>
        </SlideUp>

        {/* Weight Input */}
        <SlideUp delay={200}>
          <GlassCard variant="prominent">
            <h2 className="text-label mb-4">{t.checkin.currentWeight}</h2>
            <div className="flex items-center justify-center gap-3">
              <div className="relative flex-1 max-w-[160px]">
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="70.5"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full h-16 px-4 bg-white/5 border-2 border-white/10 rounded-2xl text-center text-3xl text-number text-foreground placeholder:text-foreground-muted/30 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                />
              </div>
              <span className="text-xl text-foreground-muted font-medium">kg</span>
            </div>
          </GlassCard>
        </SlideUp>

        {/* Feeling Selection */}
        <SlideUp delay={300}>
          <GlassCard>
            <h2 className="text-label mb-4">{t.checkin.howFeeling}</h2>
            <div className="grid grid-cols-4 gap-3">
              {FEELINGS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFeeling(f.value)}
                  className={`
                    flex flex-col items-center py-4 rounded-2xl border-2 transition-all btn-press
                    ${
                      feeling === f.value
                        ? "border-accent bg-accent/10 glow-accent"
                        : "border-white/10 glass hover:border-white/20"
                    }
                  `}
                >
                  <span className="text-3xl mb-2">{f.emoji}</span>
                  <span className="text-xs text-foreground-muted">{f.label}</span>
                </button>
              ))}
            </div>
          </GlassCard>
        </SlideUp>

        {/* Error message */}
        {error && (
          <SlideUp delay={350}>
            <div className="text-center py-2">
              <p className="text-sm text-error">{error}</p>
            </div>
          </SlideUp>
        )}

        {/* Progress Tip */}
        <SlideUp delay={400}>
          <div className="text-center py-4">
            <p className="text-sm text-foreground-muted">
              {t.checkin.weeklyHelp}
            </p>
          </div>
        </SlideUp>
      </main>

      {/* Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background/95 to-transparent">
        <FadeIn delay={500}>
          <Button
            className="w-full btn-press glow-accent"
            size="lg"
            onClick={handleSubmit}
            disabled={!weight || !feeling || loading}
            loading={loading}
          >
            {t.checkin.complete}
          </Button>
        </FadeIn>
      </div>
    </div>
  );
}

// Header component to reduce duplication
function Header({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <header className="px-6 pt-14 pb-6 flex items-center justify-between">
      <button
        onClick={() => router.back()}
        className="w-10 h-10 rounded-full glass flex items-center justify-center btn-press"
        aria-label="Go back"
      >
        <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <FadeIn>
        <h1 className="text-xl text-headline text-foreground">{t.checkin.title}</h1>
      </FadeIn>
      <div className="w-10" />
    </header>
  );
}
