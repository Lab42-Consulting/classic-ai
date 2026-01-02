"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SubscriptionExtendModal } from "@/components/staff/subscription-extend-modal";

interface MemberDetail {
  member: {
    id: string;
    memberId: string;
    name: string;
    goal: string;
    weight: number | null;
    height: number | null;
    status: string;
    subscriptionStatus: string;
    subscribedAt: string | null;
    subscribedUntil: string | null;
    createdAt: string;
  };
  targets: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  streak: number;
  activitySummary: {
    totalLogs: number;
    mealLogs: number;
    trainingLogs: number;
    waterLogs: number;
  };
  weeklyCheckins: Array<{
    weight: number;
    feeling: number;
    weekNumber: number;
    year: number;
    createdAt: string;
  }>;
  notes: Array<{
    id: string;
    content: string;
    createdAt: string;
    staff: { name: string };
  }>;
}

const goalLabels: Record<string, string> = {
  fat_loss: "Mršavljenje",
  muscle_gain: "Rast mišića",
  recomposition: "Rekompozicija",
};

const feelingEmojis = ["", "😞", "😐", "🙂", "😄"];

export default function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<MemberDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    const fetchMember = async () => {
      try {
        const response = await fetch(`/api/members/${id}`);
        if (response.ok) {
          const result = await response.json();
          setData(result);
        } else {
          setError("Član nije pronađen");
        }
      } catch (err) {
        console.error("Failed to fetch member:", err);
        setError("Greška pri učitavanju podataka");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMember();
  }, [id]);

  const refreshData = async () => {
    const response = await fetch(`/api/members/${id}`);
    if (response.ok) {
      setData(await response.json());
    }
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;
    setSavingNote(true);

    try {
      const response = await fetch(`/api/members/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: noteContent }),
      });

      if (response.ok) {
        setShowNoteModal(false);
        setNoteContent("");
        refreshData();
      }
    } catch (err) {
      console.error("Failed to add note:", err);
    } finally {
      setSavingNote(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-20 text-center">
        <p className="text-foreground-muted mb-4">{error || "Član nije pronađen"}</p>
        <button
          onClick={() => router.push("/gym-portal/manage/members")}
          className="text-accent hover:underline"
        >
          Nazad na listu članova
        </button>
      </div>
    );
  }

  const { member, targets, streak, activitySummary, weeklyCheckins, notes } = data;

  const daysUntilExpiry = member.subscribedUntil
    ? Math.ceil((new Date(member.subscribedUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 7;
  const isExpired = member.subscriptionStatus === "expired" || (daysUntilExpiry !== null && daysUntilExpiry <= 0);

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-2xl bg-accent/20 flex items-center justify-center">
            <span className="text-2xl font-bold text-accent">
              {member.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
            </span>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              {member.name}
            </h1>
            <p className="text-foreground-muted mt-1">
              {member.memberId} • {goalLabels[member.goal]}
            </p>
            <p className="text-sm text-foreground-muted mt-1">
              Član od {new Date(member.createdAt).toLocaleDateString("sr-RS", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowNoteModal(true)}
            className="px-4 py-2 bg-background-secondary border border-border rounded-lg text-foreground hover:border-accent/30 transition-colors"
          >
            Dodaj belešku
          </button>
          <button
            onClick={() => setShowSubscriptionModal(true)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isExpired
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-accent text-white hover:bg-accent/90"
            }`}
          >
            {isExpired ? "Aktiviraj članarinu" : "Produži članarinu"}
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Subscription Status */}
          <div className={`bg-background-secondary border rounded-2xl p-6 ${
            isExpired
              ? "border-red-500/30 bg-red-500/5"
              : isExpiringSoon
                ? "border-yellow-500/30 bg-yellow-500/5"
                : "border-emerald-500/30 bg-emerald-500/5"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  isExpired ? "bg-red-500/20" : isExpiringSoon ? "bg-yellow-500/20" : "bg-emerald-500/20"
                }`}>
                  <span className="text-xl">💳</span>
                </div>
                <div>
                  <h3 className={`font-semibold ${
                    isExpired ? "text-red-400" : isExpiringSoon ? "text-yellow-400" : "text-emerald-400"
                  }`}>
                    {isExpired ? "Članarina istekla" : isExpiringSoon ? "Uskoro ističe" : "Aktivna članarina"}
                  </h3>
                  <p className="text-sm text-foreground-muted">
                    {member.subscribedUntil ? (
                      isExpired ? (
                        `Istekla ${new Date(member.subscribedUntil).toLocaleDateString("sr-RS")}`
                      ) : (
                        `Važi do ${new Date(member.subscribedUntil).toLocaleDateString("sr-RS", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })} (${daysUntilExpiry} ${daysUntilExpiry === 1 ? "dan" : "dana"})`
                      )
                    ) : (
                      "Nije aktivirana"
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSubscriptionModal(true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isExpired
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "bg-accent/20 text-accent hover:bg-accent/30"
                }`}
              >
                {isExpired ? "Aktiviraj" : "Produži"}
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-background-secondary border border-border rounded-xl p-4">
              <p className="text-sm text-foreground-muted mb-1">Težina</p>
              <p className="text-xl font-bold text-foreground">
                {member.weight ? `${member.weight} kg` : "—"}
              </p>
            </div>
            <div className="bg-background-secondary border border-border rounded-xl p-4">
              <p className="text-sm text-foreground-muted mb-1">Visina</p>
              <p className="text-xl font-bold text-foreground">
                {member.height ? `${member.height} cm` : "—"}
              </p>
            </div>
            <div className="bg-background-secondary border border-border rounded-xl p-4">
              <p className="text-sm text-foreground-muted mb-1">Streak</p>
              <p className="text-xl font-bold text-foreground">{streak} dana</p>
            </div>
            <div className="bg-background-secondary border border-border rounded-xl p-4">
              <p className="text-sm text-foreground-muted mb-1">Logovi (30d)</p>
              <p className="text-xl font-bold text-foreground">{activitySummary.totalLogs}</p>
            </div>
          </div>

          {/* Targets */}
          <div className="bg-background-secondary border border-border rounded-2xl p-6">
            <h3 className="font-semibold text-foreground mb-4">Dnevni ciljevi</h3>
            <div className="grid sm:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-background rounded-xl">
                <p className="text-2xl font-bold text-accent">{targets.calories}</p>
                <p className="text-sm text-foreground-muted">kcal</p>
              </div>
              <div className="text-center p-3 bg-background rounded-xl">
                <p className="text-2xl font-bold text-emerald-400">{targets.protein}g</p>
                <p className="text-sm text-foreground-muted">Proteini</p>
              </div>
              <div className="text-center p-3 bg-background rounded-xl">
                <p className="text-2xl font-bold text-blue-400">{targets.carbs}g</p>
                <p className="text-sm text-foreground-muted">Ugljeni hidrati</p>
              </div>
              <div className="text-center p-3 bg-background rounded-xl">
                <p className="text-2xl font-bold text-yellow-400">{targets.fats}g</p>
                <p className="text-sm text-foreground-muted">Masti</p>
              </div>
            </div>
          </div>

          {/* Activity Summary */}
          <div className="bg-background-secondary border border-border rounded-2xl p-6">
            <h3 className="font-semibold text-foreground mb-4">Aktivnost (poslednjih 30 dana)</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-background rounded-xl">
                <span className="text-2xl">🍽️</span>
                <div>
                  <p className="text-xl font-bold text-foreground">{activitySummary.mealLogs}</p>
                  <p className="text-sm text-foreground-muted">Obroka</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-background rounded-xl">
                <span className="text-2xl">💪</span>
                <div>
                  <p className="text-xl font-bold text-foreground">{activitySummary.trainingLogs}</p>
                  <p className="text-sm text-foreground-muted">Treninga</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-background rounded-xl">
                <span className="text-2xl">💧</span>
                <div>
                  <p className="text-xl font-bold text-foreground">{activitySummary.waterLogs}</p>
                  <p className="text-sm text-foreground-muted">Vode</p>
                </div>
              </div>
            </div>
          </div>

          {/* Weight Progress */}
          {weeklyCheckins.length > 0 && (
            <div className="bg-background-secondary border border-border rounded-2xl p-6">
              <h3 className="font-semibold text-foreground mb-4">Napredak težine</h3>
              <div className="space-y-3">
                {weeklyCheckins.slice(0, 8).map((checkin, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{feelingEmojis[checkin.feeling]}</span>
                      <span className="text-foreground-muted">Nedelja {checkin.weekNumber}, {checkin.year}</span>
                    </div>
                    <span className="font-semibold text-foreground">{checkin.weight} kg</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Notes */}
        <div className="space-y-6">
          <div className="bg-background-secondary border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Beleške</h3>
              <button
                onClick={() => setShowNoteModal(true)}
                className="text-sm text-accent hover:text-accent/80 transition-colors"
              >
                + Dodaj
              </button>
            </div>
            {notes.length === 0 ? (
              <p className="text-sm text-foreground-muted text-center py-6">
                Još nema beleški
              </p>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {notes.map((note) => (
                  <div key={note.id} className="p-3 bg-background rounded-xl">
                    <p className="text-sm text-foreground">{note.content}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-foreground-muted">
                      <span>{note.staff.name}</span>
                      <span>•</span>
                      <span>{new Date(note.createdAt).toLocaleDateString("sr-RS")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-background-secondary border border-border rounded-2xl p-6">
            <h3 className="font-semibold text-foreground mb-4">Brze akcije</h3>
            <div className="space-y-2">
              <button
                onClick={() => setShowSubscriptionModal(true)}
                className="w-full flex items-center gap-3 p-3 bg-background rounded-xl hover:bg-accent/10 transition-colors text-left"
              >
                <span className="text-lg">💳</span>
                <span className="text-foreground">Produži članarinu</span>
              </button>
              <button
                onClick={() => setShowNoteModal(true)}
                className="w-full flex items-center gap-3 p-3 bg-background rounded-xl hover:bg-accent/10 transition-colors text-left"
              >
                <span className="text-lg">📝</span>
                <span className="text-foreground">Dodaj belešku</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Dodaj belešku</h2>
              <button
                onClick={() => setShowNoteModal(false)}
                className="p-2 text-foreground-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Privatna beleška o članu..."
              className="w-full h-32 p-3 bg-background-secondary border border-border rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowNoteModal(false)}
                className="flex-1 px-4 py-2 bg-background-secondary border border-border rounded-lg text-foreground hover:border-foreground-muted transition-colors"
              >
                Otkaži
              </button>
              <button
                onClick={handleAddNote}
                disabled={!noteContent.trim() || savingNote}
                className="flex-1 px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {savingNote ? "Čuvam..." : "Sačuvaj"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Modal */}
      {showSubscriptionModal && (
        <SubscriptionExtendModal
          memberId={member.id}
          memberName={member.name}
          currentEndDate={member.subscribedUntil}
          isExpired={isExpired}
          onClose={() => setShowSubscriptionModal(false)}
          onSuccess={() => {
            setShowSubscriptionModal(false);
            refreshData();
          }}
        />
      )}
    </div>
  );
}
