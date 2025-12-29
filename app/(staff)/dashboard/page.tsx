"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, GlassCard, FadeIn, SlideUp } from "@/components/ui";

interface MemberStats {
  id: string;
  memberId: string;
  name: string;
  goal: string;
  currentWeight: number | null;
  activityStatus: "on_track" | "slipping" | "off_track";
  consistencyScore: number;
  streak: number;
  lastActivityDate: string | null;
  daysSinceActivity: number;
  weeklyTrainingSessions: number;
  calorieAdherence: number;
  proteinAdherence: number;
  weightTrend: "up" | "down" | "stable";
  weightChange: number;
  missedCheckin: boolean;
  alerts: string[];
}

interface DashboardData {
  coachName: string;
  isCoach: boolean;
  stats: {
    total: number;
    onTrack: number;
    slipping: number;
    offTrack: number;
    needsAttention: number;
  };
  members: MemberStats[];
}

const activityColors = {
  on_track: "bg-success",
  slipping: "bg-warning",
  off_track: "bg-error",
};

const activityLabels = {
  on_track: "Na putu",
  slipping: "Klizi",
  off_track: "Ispao",
};

const activityEmojis = {
  on_track: "🟢",
  slipping: "🟡",
  off_track: "🔴",
};

const trendIcons = {
  up: "↗",
  down: "↘",
  stable: "→",
};

const goalLabels: Record<string, string> = {
  fat_loss: "Mršavljenje",
  muscle_gain: "Masa",
  recomposition: "Rekompozicija",
};

export default function CoachDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "on_track" | "slipping" | "off_track">("all");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await fetch("/api/coach/dashboard");
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

    fetchDashboard();
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/staff-login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <FadeIn>
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full glass flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-foreground-muted">Učitavanje...</p>
          </div>
        </FadeIn>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground-muted">Greška pri učitavanju</p>
      </div>
    );
  }

  const filteredMembers = data.members.filter((member) => {
    if (filter === "all") return true;
    return member.activityStatus === filter;
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="px-6 pt-12 pb-6 flex items-center justify-between">
        <div>
          <p className="text-foreground-muted text-sm">
            {data.isCoach ? "Tvoji klijenti" : "Kontrolna tabla"}
          </p>
          <h1 className="text-2xl font-bold text-foreground">
            {data.coachName}
          </h1>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 text-foreground-muted hover:text-foreground"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </header>

      <main className="px-6 space-y-6">
        {/* Stats Cards */}
        <SlideUp delay={100}>
          <div className="grid grid-cols-4 gap-3">
            <Card className="text-center py-4">
              <p className="text-2xl font-bold text-foreground">{data.stats.total}</p>
              <p className="text-xs text-foreground-muted">Ukupno</p>
            </Card>
            <Card className="text-center py-4">
              <p className="text-2xl font-bold text-success">{data.stats.onTrack}</p>
              <p className="text-xs text-foreground-muted">Na putu</p>
            </Card>
            <Card className="text-center py-4">
              <p className="text-2xl font-bold text-warning">{data.stats.slipping}</p>
              <p className="text-xs text-foreground-muted">Klize</p>
            </Card>
            <Card className="text-center py-4">
              <p className="text-2xl font-bold text-error">{data.stats.offTrack}</p>
              <p className="text-xs text-foreground-muted">Ispali</p>
            </Card>
          </div>
        </SlideUp>

        {/* Needs Attention Alert */}
        {data.stats.needsAttention > 0 && (
          <SlideUp delay={150}>
            <GlassCard className="border-warning/20 bg-warning/5">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="text-sm font-medium text-warning">
                    {data.stats.needsAttention} {data.stats.needsAttention === 1 ? "klijent treba" : "klijenata treba"} pažnju
                  </p>
                  <p className="text-xs text-foreground-muted">
                    Pregledaj označene ispod
                  </p>
                </div>
              </div>
            </GlassCard>
          </SlideUp>
        )}

        {/* Filter Buttons */}
        <SlideUp delay={200}>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {(["all", "off_track", "slipping", "on_track"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`
                  px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap
                  ${filter === f
                    ? "bg-accent text-white"
                    : "bg-background-secondary text-foreground-muted hover:text-foreground"
                  }
                `}
              >
                {f === "all" ? "Svi" : `${activityEmojis[f]} ${activityLabels[f]}`}
              </button>
            ))}
          </div>
        </SlideUp>

        {/* Members List */}
        <SlideUp delay={250}>
          {filteredMembers.length === 0 ? (
            <Card className="text-center py-12">
              <p className="text-foreground-muted">
                {filter === "all" ? "Nema klijenata" : `Nema klijenata u statusu "${activityLabels[filter]}"`}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredMembers.map((member, index) => (
                <SlideUp key={member.id} delay={300 + index * 50}>
                  <GlassCard
                    hover
                    className={`cursor-pointer ${member.alerts.length > 0 ? "border-warning/30" : ""}`}
                    onClick={() => router.push(`/members/${member.id}`)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Status indicator */}
                      <div className="flex flex-col items-center gap-1 pt-1">
                        <div className={`w-3 h-3 rounded-full ${activityColors[member.activityStatus]}`} />
                        <span className="text-xs text-foreground-muted">
                          {member.consistencyScore}%
                        </span>
                      </div>

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-foreground truncate">
                            {member.name}
                          </h3>
                          {member.streak > 0 && (
                            <span className="text-xs bg-accent/20 text-accent px-1.5 py-0.5 rounded">
                              🔥 {member.streak}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-foreground-muted">
                          {member.memberId} • {goalLabels[member.goal]}
                        </p>

                        {/* Quick stats row */}
                        <div className="flex gap-4 mt-2 text-xs text-foreground-muted">
                          <span title="Treninzi ove nedelje">
                            🏋️ {member.weeklyTrainingSessions}x
                          </span>
                          {member.currentWeight && (
                            <span title="Težina">
                              ⚖️ {member.currentWeight}kg
                              <span className={
                                member.weightTrend === "down" && member.goal === "fat_loss" ? "text-success" :
                                member.weightTrend === "up" && member.goal === "muscle_gain" ? "text-success" :
                                member.weightTrend !== "stable" ? "text-warning" : ""
                              }>
                                {" "}{trendIcons[member.weightTrend]}
                              </span>
                            </span>
                          )}
                          {member.daysSinceActivity < 999 && (
                            <span title="Poslednja aktivnost">
                              📅 {member.daysSinceActivity === 0 ? "Danas" :
                                  member.daysSinceActivity === 1 ? "Juče" :
                                  `Pre ${member.daysSinceActivity}d`}
                            </span>
                          )}
                        </div>

                        {/* Alerts */}
                        {member.alerts.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {member.alerts.slice(0, 2).map((alert, i) => (
                              <span
                                key={i}
                                className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded"
                              >
                                {alert}
                              </span>
                            ))}
                            {member.alerts.length > 2 && (
                              <span className="text-xs text-foreground-muted">
                                +{member.alerts.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Arrow */}
                      <svg className="w-5 h-5 text-foreground-muted flex-shrink-0 mt-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </GlassCard>
                </SlideUp>
              ))}
            </div>
          )}
        </SlideUp>
      </main>

      {/* Add Member Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent">
        <FadeIn delay={500}>
          <Button
            className="w-full btn-press glow-accent"
            size="lg"
            onClick={() => router.push("/register")}
          >
            Registruj novog člana
          </Button>
        </FadeIn>
      </div>
    </div>
  );
}
