"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Participant {
  id: string;
  totalPoints: number;
  mealPoints: number;
  trainingPoints: number;
  waterPoints: number;
  checkinPoints: number;
  streakPoints: number;
  currentStreak: number;
  joinedAt: string;
  member: {
    id: string;
    name: string;
    memberId: string;
    avatarUrl: string | null;
  };
}

interface Challenge {
  id: string;
  name: string;
  description: string;
  rewardDescription: string;
  startDate: string;
  endDate: string;
  joinDeadlineDays: number;
  winnerCount: number;
  status: string;
  computedStatus: "draft" | "registration" | "active" | "ended";
  participantCount: number;
  pointsPerMeal: number;
  pointsPerTraining: number;
  pointsPerWater: number;
  pointsPerCheckin: number;
  streakBonus: number;
}

type TabType = "leaderboard" | "settings";

const statusLabels: Record<string, string> = {
  draft: "Nacrt",
  upcoming: "Uskoro",
  registration: "Registracija",
  active: "Aktivno",
  ended: "Završeno",
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-500/20 text-gray-400",
  upcoming: "bg-amber-500/20 text-amber-400",
  registration: "bg-blue-500/20 text-blue-400",
  active: "bg-emerald-500/20 text-emerald-400",
  ended: "bg-foreground-muted/20 text-foreground-muted",
};

export default function ChallengeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const challengeId = params.id as string;

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [leaderboard, setLeaderboard] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("leaderboard");
  const [publishing, setPublishing] = useState(false);
  const [ending, setEnding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConfirmPublish, setShowConfirmPublish] = useState(false);
  const [showConfirmEnd, setShowConfirmEnd] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    fetchChallenge();
  }, [challengeId]);

  const fetchChallenge = async () => {
    try {
      const response = await fetch(`/api/admin/challenges/${challengeId}`);
      if (response.ok) {
        const data = await response.json();
        setChallenge(data.challenge);
        setLeaderboard(data.leaderboard);
      } else {
        router.push("/gym-portal/manage/challenges");
      }
    } catch (error) {
      console.error("Failed to fetch challenge:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublishChallenge = async () => {
    setPublishing(true);
    try {
      const response = await fetch(`/api/admin/challenges/${challengeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      });

      if (response.ok) {
        fetchChallenge();
        setShowConfirmPublish(false);
      }
    } catch (error) {
      console.error("Failed to publish challenge:", error);
    } finally {
      setPublishing(false);
    }
  };

  const handleEndChallenge = async () => {
    setEnding(true);
    try {
      const response = await fetch(`/api/admin/challenges/${challengeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end" }),
      });

      if (response.ok) {
        fetchChallenge();
        setShowConfirmEnd(false);
      }
    } catch (error) {
      console.error("Failed to end challenge:", error);
    } finally {
      setEnding(false);
    }
  };

  const handleDeleteChallenge = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/challenges/${challengeId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/gym-portal/manage/challenges");
      }
    } catch (error) {
      console.error("Failed to delete challenge:", error);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("sr-RS", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getDaysLeft = (endDate: string) => {
    const diff = new Date(endDate).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const getRankBadge = (rank: number, winnerCount: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    if (rank <= winnerCount) return "🏆";
    return null;
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!challenge) {
    return null;
  }

  const topScore = leaderboard.length > 0 ? leaderboard[0].totalPoints : 0;

  return (
    <div>
      {/* Back Link */}
      <Link
        href="/gym-portal/manage/challenges"
        className="inline-flex items-center gap-2 text-foreground-muted hover:text-foreground mb-6 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Nazad na izazove
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{challenge.name}</h1>
            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[challenge.computedStatus]}`}>
              {statusLabels[challenge.computedStatus]}
            </span>
          </div>
          <p className="text-foreground-muted">{challenge.rewardDescription}</p>
        </div>

        <div className="flex gap-2">
          {challenge.computedStatus === "draft" && (
            <button
              onClick={() => setShowConfirmPublish(true)}
              className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Objavi
            </button>
          )}
          {challenge.computedStatus !== "ended" && challenge.computedStatus !== "draft" && (
            <button
              onClick={() => setShowConfirmEnd(true)}
              className="inline-flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-xl font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
              Završi izazov
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-background-secondary border border-border rounded-xl p-4">
          <p className="text-sm text-foreground-muted">Učesnici</p>
          <p className="text-2xl font-bold text-foreground">{challenge.participantCount}</p>
        </div>
        <div className="bg-background-secondary border border-border rounded-xl p-4">
          <p className="text-sm text-foreground-muted">Pobednici</p>
          <p className="text-2xl font-bold text-yellow-400">Top {challenge.winnerCount}</p>
        </div>
        <div className="bg-background-secondary border border-border rounded-xl p-4">
          <p className="text-sm text-foreground-muted">
            {challenge.computedStatus === "ended" ? "Trajalo" : "Preostalo"}
          </p>
          <p className="text-2xl font-bold text-foreground">
            {challenge.computedStatus === "ended" ? "Završeno" : `${getDaysLeft(challenge.endDate)} dana`}
          </p>
        </div>
        <div className="bg-background-secondary border border-border rounded-xl p-4">
          <p className="text-sm text-foreground-muted">Vodeći rezultat</p>
          <p className="text-2xl font-bold text-emerald-400">{topScore} bod.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("leaderboard")}
          className={`px-4 py-2 rounded-xl font-medium transition-colors ${
            activeTab === "leaderboard"
              ? "bg-accent text-white"
              : "bg-background-secondary border border-border text-foreground hover:border-foreground-muted"
          }`}
        >
          Rang lista
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2 rounded-xl font-medium transition-colors ${
            activeTab === "settings"
              ? "bg-accent text-white"
              : "bg-background-secondary border border-border text-foreground hover:border-foreground-muted"
          }`}
        >
          Podešavanja
        </button>
      </div>

      {/* Leaderboard Tab */}
      {activeTab === "leaderboard" && (
        <div className="bg-background-secondary border border-border rounded-xl overflow-hidden">
          {leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-foreground-muted">Još nema učesnika</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-background/50">
                    <th className="text-center px-4 py-3 text-sm font-medium text-foreground-muted w-16">#</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-foreground-muted">Član</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-foreground-muted hidden lg:table-cell">Obroci</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-foreground-muted hidden lg:table-cell">Treninzi</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-foreground-muted hidden lg:table-cell">Voda</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-foreground-muted hidden md:table-cell">Pregledi</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-foreground-muted hidden md:table-cell">Niz</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-foreground-muted">Ukupno</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((participant, index) => {
                    const rank = index + 1;
                    const badge = getRankBadge(rank, challenge.winnerCount);
                    const isWinner = rank <= challenge.winnerCount;

                    return (
                      <tr
                        key={participant.id}
                        className={`border-b border-border/50 transition-colors ${
                          isWinner ? "bg-yellow-500/5" : "hover:bg-background/30"
                        }`}
                      >
                        <td className="px-4 py-4 text-center">
                          <span className="text-lg">
                            {badge || <span className="text-foreground-muted">{rank}</span>}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden">
                              {participant.member.avatarUrl ? (
                                <img
                                  src={participant.member.avatarUrl}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-sm font-medium text-accent">
                                  {participant.member.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{participant.member.name}</p>
                              <p className="text-xs text-foreground-muted">{participant.member.memberId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center hidden lg:table-cell">
                          <span className="text-foreground-muted">{participant.mealPoints}</span>
                        </td>
                        <td className="px-4 py-4 text-center hidden lg:table-cell">
                          <span className="text-foreground-muted">{participant.trainingPoints}</span>
                        </td>
                        <td className="px-4 py-4 text-center hidden lg:table-cell">
                          <span className="text-foreground-muted">{participant.waterPoints}</span>
                        </td>
                        <td className="px-4 py-4 text-center hidden md:table-cell">
                          <span className="text-foreground-muted">{participant.checkinPoints}</span>
                        </td>
                        <td className="px-4 py-4 text-center hidden md:table-cell">
                          <span className="text-foreground-muted">{participant.streakPoints}</span>
                          {participant.currentStreak > 0 && (
                            <span className="text-xs text-orange-400 ml-1">🔥{participant.currentStreak}</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="text-lg font-bold text-foreground">{participant.totalPoints}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          {/* Challenge Info */}
          <div className="bg-background-secondary border border-border rounded-xl p-6">
            <h3 className="font-medium text-foreground mb-4">Informacije o izazovu</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-foreground-muted">Opis</p>
                <p className="text-foreground mt-1">{challenge.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-foreground-muted">Početak</p>
                  <p className="text-foreground mt-1">{formatDate(challenge.startDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-foreground-muted">Završetak</p>
                  <p className="text-foreground mt-1">{formatDate(challenge.endDate)}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-foreground-muted">Rok za prijavu</p>
                <p className="text-foreground mt-1">{challenge.joinDeadlineDays} dana od početka</p>
              </div>
            </div>
          </div>

          {/* Point Configuration */}
          <div className="bg-background-secondary border border-border rounded-xl p-6">
            <h3 className="font-medium text-foreground mb-4">Konfiguracija bodova</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-foreground-muted">Obrok</p>
                <p className="text-lg font-medium text-foreground">{challenge.pointsPerMeal} bod.</p>
              </div>
              <div>
                <p className="text-sm text-foreground-muted">Trening</p>
                <p className="text-lg font-medium text-foreground">{challenge.pointsPerTraining} bod.</p>
              </div>
              <div>
                <p className="text-sm text-foreground-muted">Čaša vode</p>
                <p className="text-lg font-medium text-foreground">{challenge.pointsPerWater} bod.</p>
              </div>
              <div>
                <p className="text-sm text-foreground-muted">Nedeljni pregled</p>
                <p className="text-lg font-medium text-foreground">{challenge.pointsPerCheckin} bod.</p>
              </div>
              <div>
                <p className="text-sm text-foreground-muted">Dnevni bonus za niz</p>
                <p className="text-lg font-medium text-foreground">{challenge.streakBonus} bod.</p>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          {challenge.computedStatus === "draft" && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
              <h3 className="font-medium text-red-400 mb-2">Opasna zona</h3>
              <p className="text-sm text-foreground-muted mb-4">
                Brisanje izazova je trajno i ne može se poništiti.
              </p>
              <button
                onClick={() => setShowConfirmDelete(true)}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-medium transition-colors"
              >
                Obriši izazov
              </button>
            </div>
          )}
        </div>
      )}

      {/* Publish Challenge Confirmation Modal */}
      {showConfirmPublish && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-foreground mb-2">Objavi izazov?</h3>
            <p className="text-foreground-muted mb-4">
              Objavljivanjem izazova, članovi teretane će moći da ga vide.
            </p>
            {new Date(challenge!.startDate) > new Date() ? (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4">
                <p className="text-sm text-amber-400">
                  Izazov počinje {formatDate(challenge!.startDate)}. Do tada će članovi videti izazov kao "Uskoro" i neće moći da se prijave.
                </p>
              </div>
            ) : (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mb-4">
                <p className="text-sm text-blue-400">
                  Izazov će odmah biti otvoren za prijave jer je datum početka već prošao.
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmPublish(false)}
                className="flex-1 px-4 py-3 bg-background-secondary border border-border rounded-xl text-foreground hover:border-foreground-muted transition-colors"
              >
                Otkaži
              </button>
              <button
                onClick={handlePublishChallenge}
                disabled={publishing}
                className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                {publishing ? "Objavljujem..." : "Objavi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Challenge Confirmation Modal */}
      {showConfirmEnd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-foreground mb-2">Završi izazov?</h3>
            <p className="text-foreground-muted mb-6">
              Ova akcija će trajno završiti izazov. Trenutna rang lista će biti konačna.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmEnd(false)}
                className="flex-1 px-4 py-3 bg-background-secondary border border-border rounded-xl text-foreground hover:border-foreground-muted transition-colors"
              >
                Otkaži
              </button>
              <button
                onClick={handleEndChallenge}
                disabled={ending}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {ending ? "Završavam..." : "Završi izazov"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Challenge Confirmation Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-foreground mb-2">Obriši izazov?</h3>
            <p className="text-foreground-muted mb-6">
              Ova akcija je trajna i ne može se poništiti. Svi podaci o izazovu će biti izgubljeni.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="flex-1 px-4 py-3 bg-background-secondary border border-border rounded-xl text-foreground hover:border-foreground-muted transition-colors"
              >
                Otkaži
              </button>
              <button
                onClick={handleDeleteChallenge}
                disabled={deleting}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting ? "Brišem..." : "Obriši"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
