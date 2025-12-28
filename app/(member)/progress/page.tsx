"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, GlassCard, SlideUp, FadeIn, AnimatedNumber } from "@/components/ui";
import { getTranslations } from "@/lib/i18n";

const t = getTranslations("sr");

interface CheckinData {
  weight: number;
  feeling: number;
  weekNumber: number;
  year: number;
  createdAt: string;
}

interface ProgressData {
  checkins: CheckinData[];
  stats: {
    startWeight: number | null;
    currentWeight: number | null;
    totalChange: number;
    weeklyAvgChange: number;
    avgFeeling: number;
    totalCheckins: number;
    isProgressPositive: boolean;
    memberSince: string;
  };
  goal: string;
  hasCheckedInThisWeek: boolean;
}

const feelingEmojis = ["", "😞", "😐", "🙂", "😄"];

const goalLabels: Record<string, string> = {
  fat_loss: "Gubitak masnoće",
  muscle_gain: "Rast mišića",
  recomposition: "Rekompozicija",
};

export default function ProgressPage() {
  const router = useRouter();
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const response = await fetch("/api/member/progress");
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch {
        // Handle error silently
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, []);

  if (loading) {
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

  const hasData = data && data.checkins.length > 0;

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
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
          <h1 className="text-xl text-headline text-foreground">Napredak</h1>
        </FadeIn>
        <div className="w-10" />
      </header>

      <main className="px-6 space-y-6">
        {!hasData ? (
          /* Empty State */
          <SlideUp delay={100}>
            <GlassCard variant="prominent" className="text-center py-12">
              <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">📊</span>
              </div>
              <h2 className="text-xl text-display text-foreground mb-3">
                Nema podataka
              </h2>
              <p className="text-foreground-muted mb-6 max-w-xs mx-auto">
                Završi svoj prvi nedeljni pregled da bi video napredak i statistiku.
              </p>
              <Button
                className="btn-press"
                onClick={() => router.push("/checkin")}
              >
                Započni pregled
              </Button>
            </GlassCard>
          </SlideUp>
        ) : (
          <>
            {/* Stats Summary */}
            <SlideUp delay={100}>
              <GlassCard variant="prominent">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-label">Trenutna težina</p>
                    <p className="text-4xl text-display text-number text-foreground">
                      {data.stats.currentWeight}
                      <span className="text-xl text-foreground-muted ml-1">kg</span>
                    </p>
                  </div>
                  <div className={`
                    px-4 py-2 rounded-2xl flex items-center gap-2
                    ${data.stats.isProgressPositive ? "bg-success/10" : "bg-warning/10"}
                  `}>
                    <span className={`text-2xl ${data.stats.isProgressPositive ? "text-success" : "text-warning"}`}>
                      {data.stats.totalChange > 0 ? "↑" : data.stats.totalChange < 0 ? "↓" : "→"}
                    </span>
                    <span className={`text-lg font-bold ${data.stats.isProgressPositive ? "text-success" : "text-warning"}`}>
                      {data.stats.totalChange > 0 ? "+" : ""}{data.stats.totalChange} kg
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground text-number">
                      {data.stats.startWeight || "-"}
                    </p>
                    <p className="text-xs text-foreground-muted">Početna</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground text-number">
                      <AnimatedNumber value={data.stats.totalCheckins} />
                    </p>
                    <p className="text-xs text-foreground-muted">Pregleda</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">
                      {feelingEmojis[Math.round(data.stats.avgFeeling)] || "😐"}
                    </p>
                    <p className="text-xs text-foreground-muted">Prosek</p>
                  </div>
                </div>
              </GlassCard>
            </SlideUp>

            {/* Weight Chart */}
            <SlideUp delay={200}>
              <GlassCard>
                <h3 className="text-label mb-4">Težina tokom vremena</h3>
                <WeightChart checkins={data.checkins} />
              </GlassCard>
            </SlideUp>

            {/* Weekly Average */}
            <SlideUp delay={300}>
              <GlassCard>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-label">Prosečna promena</p>
                    <p className="text-foreground-muted text-sm">po nedelji</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold text-number ${
                      data.goal === "fat_loss"
                        ? data.stats.weeklyAvgChange < 0 ? "text-success" : "text-warning"
                        : data.goal === "muscle_gain"
                        ? data.stats.weeklyAvgChange > 0 ? "text-success" : "text-warning"
                        : "text-foreground"
                    }`}>
                      {data.stats.weeklyAvgChange > 0 ? "+" : ""}{data.stats.weeklyAvgChange} kg
                    </p>
                    <p className="text-xs text-foreground-muted">
                      {goalLabels[data.goal]}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </SlideUp>

            {/* Recent Check-ins */}
            <SlideUp delay={400}>
              <GlassCard>
                <h3 className="text-label mb-4">Poslednji pregledi</h3>
                <div className="space-y-3">
                  {data.checkins.slice(-5).reverse().map((checkin, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-3 border-b border-white/5 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{feelingEmojis[checkin.feeling]}</span>
                        <div>
                          <p className="text-foreground font-medium">{checkin.weight} kg</p>
                          <p className="text-xs text-foreground-muted">
                            Nedelja {checkin.weekNumber}, {checkin.year}
                          </p>
                        </div>
                      </div>
                      {index > 0 && data.checkins.length > 1 && (
                        <WeightChangeIndicator
                          current={checkin.weight}
                          previous={data.checkins.slice(-5).reverse()[index - 1]?.weight || checkin.weight}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </GlassCard>
            </SlideUp>

            {/* Motivation Card */}
            <SlideUp delay={500}>
              <GlassCard className="bg-gradient-to-br from-accent/10 to-accent/5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">💪</span>
                  </div>
                  <div>
                    <p className="text-foreground font-medium mb-1">
                      {getMotivationalMessage(data)}
                    </p>
                    <p className="text-sm text-foreground-muted">
                      Nastavi tako! Doslednost je ključ.
                    </p>
                  </div>
                </div>
              </GlassCard>
            </SlideUp>
          </>
        )}
      </main>

      {/* Check-in Button */}
      {hasData && !data.hasCheckedInThisWeek && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background/95 to-transparent">
          <FadeIn delay={600}>
            <Button
              className="w-full btn-press glow-accent"
              size="lg"
              onClick={() => router.push("/checkin")}
            >
              Nedeljni pregled
            </Button>
          </FadeIn>
        </div>
      )}
    </div>
  );
}

// Simple SVG weight chart component
function WeightChart({ checkins }: { checkins: CheckinData[] }) {
  if (checkins.length < 2) {
    return (
      <div className="h-40 flex items-center justify-center text-foreground-muted text-sm">
        Potrebno je više podataka za grafikon
      </div>
    );
  }

  const weights = checkins.map((c) => c.weight);
  const minWeight = Math.min(...weights) - 1;
  const maxWeight = Math.max(...weights) + 1;
  const range = maxWeight - minWeight || 1;

  // Use wider aspect ratio for full-width chart
  const width = 350;
  const height = 120;
  const paddingX = 8;
  const paddingY = 15;

  const points = checkins.map((c, i) => {
    const x = paddingX + ((width - 2 * paddingX) / (checkins.length - 1)) * i;
    const y = height - paddingY - ((c.weight - minWeight) / range) * (height - 2 * paddingY);
    return { x, y, weight: c.weight };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  // Create gradient area
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${paddingX} ${height - paddingY} Z`;

  return (
    <div className="relative -mx-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-40"
        preserveAspectRatio="none"
      >
        {/* Gradient definition */}
        <defs>
          <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgb(239, 68, 68)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="rgb(239, 68, 68)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1={paddingX}
            y1={paddingY + (height - 2 * paddingY) * ratio}
            x2={width - paddingX}
            y2={paddingY + (height - 2 * paddingY) * ratio}
            stroke="rgba(255,255,255,0.05)"
            strokeDasharray="4,4"
          />
        ))}

        {/* Area fill */}
        <path d={areaD} fill="url(#chartGradient)" />

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke="rgb(239, 68, 68)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Data points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="5"
            fill="rgb(239, 68, 68)"
            stroke="#0a0a0a"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      {/* Weight labels - show first (oldest) and last (current) actual values */}
      <div className="flex justify-between text-xs text-foreground-muted mt-2">
        <span>{checkins[0].weight} kg</span>
        <span>{checkins[checkins.length - 1].weight} kg</span>
      </div>
    </div>
  );
}

function WeightChangeIndicator({ current, previous }: { current: number; previous: number }) {
  const change = current - previous;
  if (Math.abs(change) < 0.1) return null;

  return (
    <span className={`text-sm font-medium ${change > 0 ? "text-warning" : "text-success"}`}>
      {change > 0 ? "+" : ""}{change.toFixed(1)}
    </span>
  );
}

function getMotivationalMessage(data: ProgressData): string {
  const { stats, goal } = data;

  if (stats.totalCheckins === 1) {
    return "Odličan početak! Nastavi sa nedeljnim pregledima.";
  }

  if (goal === "fat_loss" && stats.totalChange < -2) {
    return `Sjajno! Izgubio si ${Math.abs(stats.totalChange)} kg od početka.`;
  }

  if (goal === "muscle_gain" && stats.totalChange > 1) {
    return `Odlično! Dobio si ${stats.totalChange} kg mišićne mase.`;
  }

  if (goal === "recomposition" && Math.abs(stats.totalChange) < 1) {
    return "Stabilna težina - rekompozicija napreduje!";
  }

  if (stats.avgFeeling >= 3) {
    return "Osećaš se dobro! To je znak da si na pravom putu.";
  }

  return `${stats.totalCheckins} pregleda završeno. Samo nastavi!`;
}
