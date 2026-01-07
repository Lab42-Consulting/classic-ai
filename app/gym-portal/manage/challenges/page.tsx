"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
  createdAt: string;
}

interface NewChallengeForm {
  name: string;
  description: string;
  rewardDescription: string;
  startDate: string;
  endDate: string;
  joinDeadlineDays: number;
  winnerCount: number;
  pointsPerMeal: number;
  pointsPerTraining: number;
  pointsPerWater: number;
  pointsPerCheckin: number;
  streakBonus: number;
  excludeTopN: number;
  winnerCooldownMonths: number;
}

const defaultForm: NewChallengeForm = {
  name: "",
  description: "",
  rewardDescription: "",
  startDate: "",
  endDate: "",
  joinDeadlineDays: 7,
  winnerCount: 3,
  pointsPerMeal: 5,
  pointsPerTraining: 15,
  pointsPerWater: 1,
  pointsPerCheckin: 25,
  streakBonus: 5,
  excludeTopN: 3,
  winnerCooldownMonths: 3,
};

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

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPointsConfig, setShowPointsConfig] = useState(false);
  const [form, setForm] = useState<NewChallengeForm>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    try {
      const response = await fetch("/api/admin/challenges");
      if (response.ok) {
        const data = await response.json();
        setChallenges(data.challenges);
      }
    } catch (error) {
      console.error("Failed to fetch challenges:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.description.trim() || !form.rewardDescription.trim()) {
      setError("Sva polja su obavezna");
      return;
    }

    if (!form.startDate || !form.endDate) {
      setError("Datumi su obavezni");
      return;
    }

    if (new Date(form.endDate) <= new Date(form.startDate)) {
      setError("Datum završetka mora biti posle datuma početka");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/admin/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (response.ok) {
        setShowModal(false);
        setForm(defaultForm);
        setShowPointsConfig(false);
        fetchChallenges();
      } else {
        setError(data.error || "Kreiranje nije uspelo");
      }
    } catch {
      setError("Nije moguće povezivanje. Pokušaj ponovo.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetModal = () => {
    setShowModal(false);
    setForm(defaultForm);
    setShowPointsConfig(false);
    setError("");
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("sr-RS", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getDaysLeft = (endDate: string) => {
    const diff = new Date(endDate).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  // Stats
  const activeCount = challenges.filter(
    (c) => c.computedStatus === "active" || c.computedStatus === "registration"
  ).length;
  const endedCount = challenges.filter((c) => c.computedStatus === "ended").length;
  const totalParticipants = challenges.reduce((sum, c) => sum + c.participantCount, 0);

  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Izazovi</h1>
          <p className="text-foreground-muted mt-1">
            Kreiraj takmičenja za članove teretane
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white px-5 py-2.5 rounded-xl font-medium transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Novi izazov
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-background-secondary border border-border rounded-xl p-4">
          <p className="text-sm text-foreground-muted">Ukupno</p>
          <p className="text-2xl font-bold text-foreground">{challenges.length}</p>
        </div>
        <div className="bg-background-secondary border border-border rounded-xl p-4">
          <p className="text-sm text-foreground-muted">Aktivni</p>
          <p className="text-2xl font-bold text-emerald-400">{activeCount}</p>
        </div>
        <div className="bg-background-secondary border border-border rounded-xl p-4">
          <p className="text-sm text-foreground-muted">Završeni</p>
          <p className="text-2xl font-bold text-foreground-muted">{endedCount}</p>
        </div>
        <div className="bg-background-secondary border border-border rounded-xl p-4">
          <p className="text-sm text-foreground-muted">Učesnici</p>
          <p className="text-2xl font-bold text-blue-400">{totalParticipants}</p>
        </div>
      </div>

      {/* Challenges Table */}
      <div className="bg-background-secondary border border-border rounded-xl overflow-hidden">
        {challenges.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <p className="text-foreground-muted mb-4">Još nema izazova</p>
            <button
              onClick={() => setShowModal(true)}
              className="text-accent hover:underline"
            >
              Kreiraj prvi izazov
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-background/50">
                  <th className="text-left px-4 py-3 text-sm font-medium text-foreground-muted">Izazov</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-foreground-muted">Status</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-foreground-muted hidden md:table-cell">Trajanje</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-foreground-muted">Učesnici</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-foreground-muted">Akcije</th>
                </tr>
              </thead>
              <tbody>
                {challenges.map((challenge) => (
                  <tr key={challenge.id} className="border-b border-border/50 hover:bg-background/30 transition-colors">
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-foreground">{challenge.name}</p>
                        <p className="text-sm text-foreground-muted line-clamp-1">
                          {challenge.rewardDescription}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[challenge.computedStatus]}`}>
                        {statusLabels[challenge.computedStatus]}
                      </span>
                      {(challenge.computedStatus === "active" || challenge.computedStatus === "registration") && (
                        <p className="text-xs text-foreground-muted mt-1">
                          {getDaysLeft(challenge.endDate)} dana
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <p className="text-sm text-foreground">
                        {formatDate(challenge.startDate)}
                      </p>
                      <p className="text-xs text-foreground-muted">
                        do {formatDate(challenge.endDate)}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="font-medium text-foreground">{challenge.participantCount}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        href={`/gym-portal/manage/challenges/${challenge.id}`}
                        className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
                      >
                        Detalji
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Challenge Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-background border border-border rounded-2xl p-6 w-full max-w-xl my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-foreground">Novi izazov</h2>
              <button
                onClick={resetModal}
                className="p-2 text-foreground-muted hover:text-foreground"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1 -mx-1">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-foreground-muted mb-2">
                  Naziv izazova *
                </label>
                <input
                  type="text"
                  placeholder="npr. Zimski izazov 2026"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 bg-background-secondary border border-border rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-foreground-muted mb-2">
                  Opis *
                </label>
                <textarea
                  placeholder="Opišite pravila i ciljeve izazova..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-background-secondary border border-border rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
                />
              </div>

              {/* Reward */}
              <div>
                <label className="block text-sm font-medium text-foreground-muted mb-2">
                  Nagrada *
                </label>
                <input
                  type="text"
                  placeholder="npr. Besplatna mesečna članarina + suplementi"
                  value={form.rewardDescription}
                  onChange={(e) => setForm({ ...form, rewardDescription: e.target.value })}
                  className="w-full px-4 py-3 bg-background-secondary border border-border rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground-muted mb-2">
                    Početak *
                  </label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-4 py-3 bg-background-secondary border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground-muted mb-2">
                    Završetak *
                  </label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-4 py-3 bg-background-secondary border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                </div>
              </div>

              {/* Join Deadline & Winners */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground-muted mb-2">
                    Rok za prijavu (dana)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={form.joinDeadlineDays}
                    onChange={(e) => setForm({ ...form, joinDeadlineDays: parseInt(e.target.value) || 7 })}
                    className="w-full px-4 py-3 bg-background-secondary border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                  <p className="text-xs text-foreground-muted mt-1">Dana nakon početka</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground-muted mb-2">
                    Broj pobednika
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={form.winnerCount}
                    onChange={(e) => setForm({ ...form, winnerCount: parseInt(e.target.value) || 3 })}
                    className="w-full px-4 py-3 bg-background-secondary border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                </div>
              </div>

              {/* Points Configuration (Collapsible) */}
              <div className="border border-border rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowPointsConfig(!showPointsConfig)}
                  className="w-full px-4 py-3 flex items-center justify-between text-foreground hover:bg-background-secondary transition-colors"
                >
                  <span className="font-medium">Konfiguracija bodova</span>
                  <svg
                    className={`w-5 h-5 transition-transform ${showPointsConfig ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showPointsConfig && (
                  <div className="p-4 border-t border-border bg-background-secondary/50 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-foreground-muted mb-1">Obrok</label>
                        <input
                          type="number"
                          min="0"
                          value={form.pointsPerMeal}
                          onChange={(e) => setForm({ ...form, pointsPerMeal: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-foreground-muted mb-1">Trening</label>
                        <input
                          type="number"
                          min="0"
                          value={form.pointsPerTraining}
                          onChange={(e) => setForm({ ...form, pointsPerTraining: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-foreground-muted mb-1">Čaša vode</label>
                        <input
                          type="number"
                          min="0"
                          value={form.pointsPerWater}
                          onChange={(e) => setForm({ ...form, pointsPerWater: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-foreground-muted mb-1">Nedeljni pregled</label>
                        <input
                          type="number"
                          min="0"
                          value={form.pointsPerCheckin}
                          onChange={(e) => setForm({ ...form, pointsPerCheckin: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-foreground-muted mb-1">Dnevni bonus za niz</label>
                      <input
                        type="number"
                        min="0"
                        value={form.streakBonus}
                        onChange={(e) => setForm({ ...form, streakBonus: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                      />
                      <p className="text-xs text-foreground-muted mt-1">Bonus za uzastopne dane aktivnosti</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Winner Exclusion Settings */}
              <div className="border border-border rounded-xl p-4 space-y-3">
                <h4 className="font-medium text-foreground text-sm">Podešavanja pobednika</h4>
                <p className="text-xs text-foreground-muted">
                  Prošli pobednici mogu biti isključeni iz učešća za određeni period
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-foreground-muted mb-1">Isključi top N</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={form.excludeTopN}
                      onChange={(e) => setForm({ ...form, excludeTopN: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-background-secondary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                    />
                    <p className="text-xs text-foreground-muted mt-1">Broj pobednika koji se isključuju</p>
                  </div>
                  <div>
                    <label className="block text-xs text-foreground-muted mb-1">Period čekanja</label>
                    <input
                      type="number"
                      min="0"
                      max="12"
                      value={form.winnerCooldownMonths}
                      onChange={(e) => setForm({ ...form, winnerCooldownMonths: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-background-secondary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                    />
                    <p className="text-xs text-foreground-muted mt-1">Meseci do ponovnog učešća</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={resetModal}
                className="flex-1 px-4 py-3 bg-background-secondary border border-border rounded-xl text-foreground hover:border-foreground-muted transition-colors"
              >
                Otkaži
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 px-4 py-3 bg-accent text-white rounded-xl font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {submitting ? "Kreiram..." : "Kreiraj izazov"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
