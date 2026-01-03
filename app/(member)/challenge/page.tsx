"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { GlassCard, FadeIn, SlideUp, Button } from "@/components/ui";

interface LeaderboardEntry {
  rank: number;
  memberId: string;
  name: string;
  avatarUrl: string | null;
  totalPoints: number;
  isCurrentMember: boolean;
}

interface Challenge {
  id: string;
  name: string;
  description: string;
  rewardDescription: string;
  startDate: string;
  endDate: string;
  winnerCount: number;
  status: "draft" | "upcoming" | "registration" | "active" | "ended";
  canJoin: boolean;
  daysUntilDeadline: number;
  daysUntilEnd: number;
  daysUntilStart: number;
  participantCount: number;
  pointsPerMeal: number;
  pointsPerTraining: number;
  pointsPerWater: number;
  pointsPerCheckin: number;
  streakBonus: number;
}

interface Participation {
  totalPoints: number;
  mealPoints: number;
  trainingPoints: number;
  waterPoints: number;
  checkinPoints: number;
  streakPoints: number;
  currentStreak: number;
  joinedAt: string;
}

interface PageData {
  challenge: Challenge | null;
  participation: Participation | null;
  rank: number | null;
  leaderboard: LeaderboardEntry[];
  isStaffMember: boolean;
  gymCheckinRequired: boolean;
  checkedInToday: boolean;
}

export default function ChallengePage() {
  const router = useRouter();
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Gym check-in state
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [checkinSecret, setCheckinSecret] = useState("");
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinError, setCheckinError] = useState<string | null>(null);
  const [checkedInToday, setCheckedInToday] = useState(false);

  const fetchChallenge = useCallback(async () => {
    try {
      const response = await fetch("/api/member/challenge");
      if (response.ok) {
        const result = await response.json();
        setData(result);
        setCheckedInToday(result.checkedInToday || false);
      }
    } catch {
      console.error("Failed to fetch challenge");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChallenge();
  }, [fetchChallenge]);

  const handleJoin = async () => {
    setJoining(true);
    setError(null);

    try {
      const response = await fetch("/api/member/challenge", {
        method: "POST",
      });

      if (response.ok) {
        fetchChallenge();
      } else {
        const result = await response.json();
        setError(result.error || "Greška prilikom prijave");
      }
    } catch {
      setError("Nije moguće povezivanje");
    } finally {
      setJoining(false);
    }
  };

  const handleCheckin = async () => {
    if (!checkinSecret.trim()) {
      setCheckinError("Unesi kod za prijavu");
      return;
    }

    setCheckinLoading(true);
    setCheckinError(null);

    try {
      const response = await fetch("/api/member/gym-checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: checkinSecret.trim() }),
      });

      const result = await response.json();

      if (response.ok) {
        setCheckedInToday(true);
        setShowCheckinModal(false);
        setCheckinSecret("");
      } else {
        setCheckinError(result.error || "Greška pri prijavi");
      }
    } catch {
      setCheckinError("Nije moguće povezivanje");
    } finally {
      setCheckinLoading(false);
    }
  };

  const getRankBadge = (rank: number, winnerCount: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    if (rank <= winnerCount) return "🏆";
    return null;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="animate-pulse text-foreground-muted">Učitavam...</div>
      </div>
    );
  }

  // No challenge available
  if (!data?.challenge) {
    return (
      <div className="min-h-screen bg-background p-4 pb-24">
        <FadeIn>
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl hover:bg-background-secondary transition-colors"
            >
              <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Izazov</h1>
              <p className="text-sm text-foreground-muted">Takmičenje članova</p>
            </div>
          </div>

          <GlassCard className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-background-tertiary flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-foreground-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Nema aktivnog izazova</h2>
            <p className="text-foreground-muted">
              Trenutno nema izazova. Pratite obaveštenja za nove takmičenje!
            </p>
          </GlassCard>
        </FadeIn>
      </div>
    );
  }

  const { challenge, participation, rank, leaderboard, isStaffMember } = data;

  // Upcoming challenge - show preview (can't join yet)
  if (!participation && challenge.status === "upcoming") {
    return (
      <div className="min-h-screen bg-background p-4 pb-24">
        <FadeIn>
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl hover:bg-background-secondary transition-colors"
            >
              <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Izazov</h1>
              <p className="text-sm text-foreground-muted">Uskoro počinje!</p>
            </div>
          </div>

          {/* Challenge Info Card */}
          <GlassCard className="p-6 mb-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⏳</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 rounded-full mb-3">
                <span className="text-amber-400 text-sm font-medium">Uskoro</span>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">{challenge.name}</h2>
              <p className="text-foreground-muted">{challenge.description}</p>
            </div>

            {/* Countdown to start */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-4 text-center">
              <p className="text-sm text-amber-400 mb-1">Počinje za</p>
              <p className="text-3xl font-bold text-amber-400">
                {challenge.daysUntilStart} {challenge.daysUntilStart === 1 ? "dan" : "dana"}
              </p>
              <p className="text-xs text-foreground-muted mt-2">
                Prijave otvorene od {new Date(challenge.startDate).toLocaleDateString("sr-RS", { day: "numeric", month: "long" })}
              </p>
            </div>

            {/* Reward */}
            <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-4 mb-4">
              <p className="text-sm text-yellow-400 font-medium mb-1">Nagrada</p>
              <p className="text-foreground">{challenge.rewardDescription}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center bg-background-secondary rounded-xl p-3">
                <p className="text-2xl font-bold text-foreground">{challenge.daysUntilEnd}</p>
                <p className="text-xs text-foreground-muted">dana trajanja</p>
              </div>
              <div className="text-center bg-background-secondary rounded-xl p-3">
                <p className="text-2xl font-bold text-yellow-400">Top {challenge.winnerCount}</p>
                <p className="text-xs text-foreground-muted">pobednika</p>
              </div>
            </div>
          </GlassCard>

          {/* Point info */}
          <GlassCard className="p-4">
            <h3 className="font-medium text-foreground mb-3">Kako se boduje?</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-foreground-muted">🍽️ Obrok</span>
                <span className="text-foreground font-medium">+{challenge.pointsPerMeal} bod.</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground-muted">💪 Trening</span>
                <span className="text-foreground font-medium">+{challenge.pointsPerTraining} bod.</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground-muted">💧 Čaša vode</span>
                <span className="text-foreground font-medium">+{challenge.pointsPerWater} bod.</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground-muted">📊 Nedeljni pregled</span>
                <span className="text-foreground font-medium">+{challenge.pointsPerCheckin} bod.</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground-muted">🔥 Dnevni niz bonus</span>
                <span className="text-foreground font-medium">+{challenge.streakBonus} bod.</span>
              </div>
            </div>
          </GlassCard>
        </FadeIn>
      </div>
    );
  }

  // Coach view-only mode - can see challenge but cannot participate
  if (isStaffMember && !participation) {
    return (
      <div className="min-h-screen bg-background p-4 pb-24">
        <FadeIn>
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl hover:bg-background-secondary transition-colors"
            >
              <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">{challenge.name}</h1>
              <p className="text-sm text-foreground-muted">
                {challenge.status === "ended" ? "Završeno" : `${challenge.daysUntilEnd} dana preostalo`}
              </p>
            </div>
          </div>

          {/* Coach notice */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">👀</span>
              <div>
                <p className="text-sm font-medium text-blue-400">Pregled izazova</p>
                <p className="text-xs text-foreground-muted">Kao trener možete pratiti izazov, ali ne učestvovati</p>
              </div>
            </div>
          </div>

          {/* Challenge Info */}
          <GlassCard className="p-4 mb-4">
            <p className="text-foreground-muted text-sm mb-3">{challenge.description}</p>
            <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">🏆</span>
                <div className="flex-1">
                  <p className="text-sm text-foreground">{challenge.rewardDescription}</p>
                  <p className="text-xs text-yellow-400">Top {challenge.winnerCount} pobednika</p>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Leaderboard */}
          <div className="mb-3">
            <h2 className="font-medium text-foreground mb-3">Rang lista ({leaderboard.length})</h2>
          </div>

          {leaderboard.length === 0 ? (
            <GlassCard className="p-6 text-center">
              <p className="text-foreground-muted">Još nema učesnika</p>
            </GlassCard>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry, index) => {
                const badge = getRankBadge(entry.rank, challenge.winnerCount);
                const isWinner = entry.rank <= challenge.winnerCount;

                return (
                  <SlideUp key={entry.memberId} delay={index * 0.03}>
                    <GlassCard
                      className={`p-3 ${
                        isWinner ? "bg-yellow-500/5 border-yellow-500/20" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Rank */}
                        <div className="w-8 text-center">
                          {badge ? (
                            <span className="text-xl">{badge}</span>
                          ) : (
                            <span className="text-foreground-muted font-medium">{entry.rank}</span>
                          )}
                        </div>

                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {entry.avatarUrl ? (
                            <img src={entry.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-medium text-accent">
                              {entry.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)}
                            </span>
                          )}
                        </div>

                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-foreground">
                            {entry.name}
                          </p>
                        </div>

                        {/* Points */}
                        <div className="text-right">
                          <p className="font-bold text-foreground">{entry.totalPoints}</p>
                          <p className="text-xs text-foreground-muted">bodova</p>
                        </div>
                      </div>
                    </GlassCard>
                  </SlideUp>
                );
              })}
            </div>
          )}
        </FadeIn>
      </div>
    );
  }

  // Not joined yet - show join screen
  if (!participation && challenge.canJoin) {
    return (
      <div className="min-h-screen bg-background p-4 pb-24">
        <FadeIn>
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl hover:bg-background-secondary transition-colors"
            >
              <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Izazov</h1>
              <p className="text-sm text-foreground-muted">Pridruži se takmičenju!</p>
            </div>
          </div>

          {/* Challenge Info Card */}
          <GlassCard className="p-6 mb-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">{challenge.name}</h2>
              <p className="text-foreground-muted">{challenge.description}</p>
            </div>

            {/* Reward */}
            <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-4 mb-4">
              <p className="text-sm text-yellow-400 font-medium mb-1">Nagrada</p>
              <p className="text-foreground">{challenge.rewardDescription}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{challenge.participantCount}</p>
                <p className="text-xs text-foreground-muted">učesnika</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{challenge.daysUntilEnd}</p>
                <p className="text-xs text-foreground-muted">dana</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-400">Top {challenge.winnerCount}</p>
                <p className="text-xs text-foreground-muted">pobednika</p>
              </div>
            </div>

            {/* Deadline warning */}
            {challenge.daysUntilDeadline > 0 && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mb-4">
                <p className="text-sm text-blue-400 text-center">
                  Još {challenge.daysUntilDeadline} dana za prijavu
                </p>
              </div>
            )}

            {error && (
              <p className="text-sm text-error text-center mb-4">{error}</p>
            )}

            <Button onClick={handleJoin} loading={joining} disabled={joining} className="w-full">
              Pridruži se izazovu
            </Button>
          </GlassCard>

          {/* Point info */}
          <GlassCard className="p-4">
            <h3 className="font-medium text-foreground mb-3">Kako se boduje?</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-foreground-muted">🍽️ Obrok</span>
                <span className="text-foreground font-medium">+{challenge.pointsPerMeal} bod.</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground-muted">💪 Trening</span>
                <span className="text-foreground font-medium">+{challenge.pointsPerTraining} bod.</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground-muted">💧 Čaša vode</span>
                <span className="text-foreground font-medium">+{challenge.pointsPerWater} bod.</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground-muted">📊 Nedeljni pregled</span>
                <span className="text-foreground font-medium">+{challenge.pointsPerCheckin} bod.</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground-muted">🔥 Dnevni niz bonus</span>
                <span className="text-foreground font-medium">+{challenge.streakBonus} bod.</span>
              </div>
            </div>
          </GlassCard>
        </FadeIn>
      </div>
    );
  }

  // Joined or registration closed - show leaderboard
  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <FadeIn>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl hover:bg-background-secondary transition-colors"
          >
            <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">{challenge.name}</h1>
            <p className="text-sm text-foreground-muted">
              {challenge.status === "ended" ? "Završeno" : `${challenge.daysUntilEnd} dana preostalo`}
            </p>
          </div>
        </div>

        {/* My Rank Card (if participating) */}
        {participation && rank && (
          <SlideUp>
            <GlassCard className="p-4 mb-4 bg-gradient-to-r from-accent/10 to-accent/5 border-accent/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{getRankBadge(rank, challenge.winnerCount) || `#${rank}`}</span>
                  <div>
                    <p className="text-sm text-foreground-muted">Tvoj rang</p>
                    <p className="text-2xl font-bold text-foreground">{participation.totalPoints} bodova</p>
                  </div>
                </div>
                {participation.currentStreak > 0 && (
                  <div className="text-right">
                    <p className="text-2xl">🔥</p>
                    <p className="text-xs text-orange-400">{participation.currentStreak} dana</p>
                  </div>
                )}
              </div>

              {/* Points breakdown */}
              <div className="grid grid-cols-5 gap-2 text-center text-xs">
                <div>
                  <p className="text-foreground font-medium">{participation.mealPoints}</p>
                  <p className="text-foreground-muted">Obroci</p>
                </div>
                <div>
                  <p className="text-foreground font-medium">{participation.trainingPoints}</p>
                  <p className="text-foreground-muted">Treninzi</p>
                </div>
                <div>
                  <p className="text-foreground font-medium">{participation.waterPoints}</p>
                  <p className="text-foreground-muted">Voda</p>
                </div>
                <div>
                  <p className="text-foreground font-medium">{participation.checkinPoints}</p>
                  <p className="text-foreground-muted">Pregledi</p>
                </div>
                <div>
                  <p className="text-foreground font-medium">{participation.streakPoints}</p>
                  <p className="text-foreground-muted">Niz</p>
                </div>
              </div>
            </GlassCard>
          </SlideUp>
        )}

        {/* Gym Check-in Banner (when required and participating) */}
        {participation && data?.gymCheckinRequired && (
          <SlideUp delay={50}>
            <button
              onClick={() => !checkedInToday && setShowCheckinModal(true)}
              disabled={checkedInToday}
              className={`w-full mb-4 p-4 rounded-xl border transition-colors ${
                checkedInToday
                  ? "bg-emerald-500/10 border-emerald-500/20"
                  : "bg-red-500/10 border-red-500/20 hover:bg-red-500/15"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  checkedInToday ? "bg-emerald-500/20" : "bg-red-500/20"
                }`}>
                  {checkedInToday ? (
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className={`font-medium ${checkedInToday ? "text-emerald-400" : "text-red-400"}`}>
                    {checkedInToday ? "Prijavljen/a u teretanu" : "Prijavi se u teretanu"}
                  </p>
                  <p className="text-xs text-foreground-muted">
                    {checkedInToday
                      ? "Tvoji treninzi danas se računaju za izazov"
                      : "Skeniraj QR kod za bodove treninga"}
                  </p>
                </div>
                {!checkedInToday && (
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            </button>
          </SlideUp>
        )}

        {/* Reward */}
        <GlassCard className="p-3 mb-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div className="flex-1">
              <p className="text-sm text-foreground">{challenge.rewardDescription}</p>
              <p className="text-xs text-yellow-400">Top {challenge.winnerCount} pobednika</p>
            </div>
          </div>
        </GlassCard>

        {/* Leaderboard */}
        <div className="mb-3">
          <h2 className="font-medium text-foreground mb-3">Rang lista ({leaderboard.length})</h2>
        </div>

        {leaderboard.length === 0 ? (
          <GlassCard className="p-6 text-center">
            <p className="text-foreground-muted">Još nema učesnika</p>
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((entry, index) => {
              const badge = getRankBadge(entry.rank, challenge.winnerCount);
              const isWinner = entry.rank <= challenge.winnerCount;

              return (
                <SlideUp key={entry.memberId} delay={index * 0.03}>
                  <GlassCard
                    className={`p-3 ${
                      entry.isCurrentMember
                        ? "bg-accent/10 border-accent/30"
                        : isWinner
                        ? "bg-yellow-500/5 border-yellow-500/20"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Rank */}
                      <div className="w-8 text-center">
                        {badge ? (
                          <span className="text-xl">{badge}</span>
                        ) : (
                          <span className="text-foreground-muted font-medium">{entry.rank}</span>
                        )}
                      </div>

                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {entry.avatarUrl ? (
                          <img src={entry.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm font-medium text-accent">
                            {entry.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </span>
                        )}
                      </div>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-medium truncate ${
                            entry.isCurrentMember ? "text-accent" : "text-foreground"
                          }`}
                        >
                          {entry.name}
                          {entry.isCurrentMember && " (Ti)"}
                        </p>
                      </div>

                      {/* Points */}
                      <div className="text-right">
                        <p className="font-bold text-foreground">{entry.totalPoints}</p>
                        <p className="text-xs text-foreground-muted">bodova</p>
                      </div>
                    </div>
                  </GlassCard>
                </SlideUp>
              );
            })}
          </div>
        )}
      </FadeIn>

      {/* Check-in Modal */}
      {showCheckinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border rounded-2xl p-6 max-w-sm w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Prijava u teretanu</h3>
              <p className="text-sm text-foreground-muted">
                Skeniraj QR kod u teretani ili unesi kod ručno
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground-muted mb-2">
                Kod za prijavu
              </label>
              <input
                type="text"
                value={checkinSecret}
                onChange={(e) => setCheckinSecret(e.target.value)}
                placeholder="Unesi kod sa QR koda"
                className="w-full px-4 py-3 bg-background-secondary border border-border rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
                autoFocus
              />
            </div>

            {checkinError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-sm text-red-400">{checkinError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCheckinModal(false);
                  setCheckinSecret("");
                  setCheckinError(null);
                }}
                disabled={checkinLoading}
                className="flex-1 px-4 py-3 bg-background-secondary border border-border text-foreground rounded-xl font-medium hover:border-foreground-muted transition-colors disabled:opacity-50"
              >
                Otkaži
              </button>
              <button
                onClick={handleCheckin}
                disabled={checkinLoading || !checkinSecret.trim()}
                className="flex-1 px-4 py-3 bg-accent text-white rounded-xl font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {checkinLoading ? "Proveravam..." : "Prijavi se"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
