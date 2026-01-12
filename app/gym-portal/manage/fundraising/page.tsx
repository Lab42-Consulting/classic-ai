"use client";

import { useEffect, useState, useRef } from "react";
import { TierGate } from "@/components/tier-gate";

interface FundraisingGoal {
  id: string;
  name: string;
  description: string | null;
  targetAmount: number;
  currentAmount: number;
  progressPercentage: number;
  imageUrl: string | null;
  isVisible: boolean;
  status: "active" | "completed" | "archived";
  startDate: string;
  endDate: string | null;
  completedAt: string | null;
  contributionCount: number;
  createdAt: string;
}

interface NewGoalForm {
  name: string;
  description: string;
  targetAmount: string;
  isVisible: boolean;
  endDate: string;
}

const defaultForm: NewGoalForm = {
  name: "",
  description: "",
  targetAmount: "",
  isVisible: true,
  endDate: "",
};

const statusLabels: Record<string, string> = {
  active: "Aktivno",
  completed: "Završeno",
  archived: "Arhivirano",
};

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400",
  completed: "bg-blue-500/20 text-blue-400",
  archived: "bg-gray-500/20 text-gray-400",
};

export default function FundraisingPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [goals, setGoals] = useState<FundraisingGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<NewGoalForm>(defaultForm);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Edit modal state
  const [editingGoal, setEditingGoal] = useState<FundraisingGoal | null>(null);
  const [addAmountModal, setAddAmountModal] = useState<FundraisingGoal | null>(null);
  const [addAmount, setAddAmount] = useState("");
  const [addNote, setAddNote] = useState("");

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const response = await fetch("/api/admin/fundraising-goals");
      if (response.ok) {
        const data = await response.json();
        // Convert amounts from cents to euros
        const goalsInEuros = data.goals.map((g: FundraisingGoal) => ({
          ...g,
          targetAmount: g.targetAmount / 100,
          currentAmount: g.currentAmount / 100,
        }));
        setGoals(goalsInEuros);
      }
    } catch (error) {
      console.error("Failed to fetch goals:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Molimo izaberite sliku");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError("Slika mora biti manja od 2MB");
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setImageUrl(base64);
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setImageUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError("Naziv je obavezan");
      return;
    }

    const amount = parseFloat(form.targetAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Unesite validan iznos");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/admin/fundraising-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          targetAmount: amount,
          isVisible: form.isVisible,
          endDate: form.endDate || null,
          imageUrl: imageUrl,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowModal(false);
        setForm(defaultForm);
        fetchGoals();
      } else {
        setError(data.error || "Kreiranje nije uspelo");
      }
    } catch {
      setError("Nije moguće povezivanje. Pokušaj ponovo.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddAmount = async () => {
    if (!addAmountModal) return;

    const amount = parseFloat(addAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Unesite validan iznos");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/fundraising-goals/${addAmountModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addAmount: amount,
          addNote: addNote || "Ručni unos",
        }),
      });

      if (response.ok) {
        setAddAmountModal(null);
        setAddAmount("");
        setAddNote("");
        fetchGoals();
      } else {
        const data = await response.json();
        setError(data.error || "Dodavanje nije uspelo");
      }
    } catch {
      setError("Nije moguće povezivanje. Pokušaj ponovo.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleVisibility = async (goal: FundraisingGoal) => {
    try {
      await fetch(`/api/admin/fundraising-goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVisible: !goal.isVisible }),
      });
      fetchGoals();
    } catch (error) {
      console.error("Failed to toggle visibility:", error);
    }
  };

  const handleArchive = async (goal: FundraisingGoal) => {
    if (!confirm("Da li ste sigurni da želite da arhivirate ovaj cilj?")) return;

    try {
      await fetch(`/api/admin/fundraising-goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });
      fetchGoals();
    } catch (error) {
      console.error("Failed to archive goal:", error);
    }
  };

  const handleDelete = async (goal: FundraisingGoal) => {
    if (!confirm("Da li ste sigurni da želite da obrišete ovaj cilj? Ova akcija se ne može poništiti.")) return;

    try {
      await fetch(`/api/admin/fundraising-goals/${goal.id}`, {
        method: "DELETE",
      });
      fetchGoals();
    } catch (error) {
      console.error("Failed to delete goal:", error);
    }
  };

  const resetModal = () => {
    setShowModal(false);
    setEditingGoal(null);
    setForm(defaultForm);
    setImageUrl(null);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const openEditModal = (goal: FundraisingGoal) => {
    setEditingGoal(goal);
    setForm({
      name: goal.name,
      description: goal.description || "",
      targetAmount: goal.targetAmount.toString(),
      isVisible: goal.isVisible,
      endDate: goal.endDate ? goal.endDate.split("T")[0] : "",
    });
    setImageUrl(goal.imageUrl);
    setShowModal(true);
  };

  const handleUpdate = async () => {
    if (!editingGoal) return;

    if (!form.name.trim()) {
      setError("Naziv je obavezan");
      return;
    }

    const amount = parseFloat(form.targetAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Unesite validan iznos");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/fundraising-goals/${editingGoal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          targetAmount: amount,
          isVisible: form.isVisible,
          endDate: form.endDate || null,
          imageUrl: imageUrl,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        resetModal();
        fetchGoals();
      } else {
        setError(data.error || "Ažuriranje nije uspelo");
      }
    } catch {
      setError("Nije moguće povezivanje. Pokušaj ponovo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TierGate feature="challenges">
      <div className="min-h-screen bg-background p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Ciljevi prikupljanja</h1>
            <p className="text-foreground-muted text-sm mt-1">
              Upravljajte ciljevima za unapređenje teretane
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors"
          >
            + Novi cilj
          </button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="glass rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-foreground">
              {goals.filter((g) => g.status === "active").length}
            </p>
            <p className="text-xs text-foreground-muted">Aktivnih ciljeva</p>
          </div>
          <div className="glass rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">
              €{goals.filter((g) => g.status === "active").reduce((sum, g) => sum + g.currentAmount, 0).toFixed(0)}
            </p>
            <p className="text-xs text-foreground-muted">Ukupno prikupljeno</p>
          </div>
          <div className="glass rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">
              {goals.filter((g) => g.status === "completed").length}
            </p>
            <p className="text-xs text-foreground-muted">Završenih ciljeva</p>
          </div>
        </div>

        {/* Goals List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : goals.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Nema ciljeva</h3>
            <p className="text-foreground-muted mb-6">
              Kreirajte prvi cilj prikupljanja sredstava za vašu teretanu
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-2 bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors"
            >
              Kreiraj cilj
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => (
              <div key={goal.id} className="glass rounded-2xl p-6">
                <div className="flex items-start gap-4 mb-4">
                  {/* Goal Photo */}
                  {goal.imageUrl && (
                    <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                      <img
                        src={goal.imageUrl}
                        alt={goal.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-foreground">{goal.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[goal.status]}`}>
                        {statusLabels[goal.status]}
                      </span>
                      {goal.isVisible ? (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-400">
                          Vidljivo
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-gray-500/20 text-gray-400">
                          Skriveno
                        </span>
                      )}
                    </div>
                    {goal.description && (
                      <p className="text-sm text-foreground-muted mb-3">{goal.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {goal.status === "active" && (
                      <>
                        <button
                          onClick={() => setAddAmountModal(goal)}
                          className="px-3 py-1.5 text-sm bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors"
                        >
                          + Dodaj
                        </button>
                        <button
                          onClick={() => openEditModal(goal)}
                          className="px-3 py-1.5 text-sm bg-accent/20 text-accent rounded-lg hover:bg-accent/30 transition-colors"
                        >
                          Uredi
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleToggleVisibility(goal)}
                      className="px-3 py-1.5 text-sm glass rounded-lg hover:bg-white/10 transition-colors"
                    >
                      {goal.isVisible ? "Sakrij" : "Prikaži"}
                    </button>
                    {goal.status === "active" && (
                      <button
                        onClick={() => handleArchive(goal)}
                        className="px-3 py-1.5 text-sm text-amber-400 hover:bg-amber-500/20 rounded-lg transition-colors"
                      >
                        Arhiviraj
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(goal)}
                      className="px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                    >
                      Obriši
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-foreground-muted">Napredak</span>
                    <span className="font-semibold text-foreground">
                      €{goal.currentAmount.toFixed(0)} / €{goal.targetAmount.toFixed(0)}
                    </span>
                  </div>
                  <div className="h-3 bg-background-tertiary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        goal.progressPercentage >= 100
                          ? "bg-emerald-500"
                          : goal.progressPercentage >= 75
                          ? "bg-blue-500"
                          : goal.progressPercentage >= 50
                          ? "bg-amber-500"
                          : "bg-accent"
                      }`}
                      style={{ width: `${goal.progressPercentage}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-foreground-muted mt-1">
                    <span>{goal.progressPercentage}% prikupljeno</span>
                    <span>{goal.contributionCount} uplata</span>
                  </div>
                </div>

                {/* Dates */}
                <div className="flex items-center gap-4 text-xs text-foreground-muted">
                  <span>Početak: {new Date(goal.startDate).toLocaleDateString("sr-RS")}</span>
                  {goal.endDate && (
                    <span>Rok: {new Date(goal.endDate).toLocaleDateString("sr-RS")}</span>
                  )}
                  {goal.completedAt && (
                    <span className="text-emerald-400">
                      Završeno: {new Date(goal.completedAt).toLocaleDateString("sr-RS")}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Goal Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="glass rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-foreground mb-6">
                {editingGoal ? "Uredi cilj" : "Novi cilj prikupljanja"}
              </h2>

              {error && (
                <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-xl">
                  <p className="text-sm text-error">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                {/* Photo Upload */}
                <div>
                  <label className="block text-sm text-foreground-muted mb-2">Fotografija</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="goal-photo"
                  />
                  {imageUrl ? (
                    <div className="relative">
                      <div className="w-full h-40 rounded-xl overflow-hidden">
                        <img
                          src={imageUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        onClick={handleRemovePhoto}
                        className="absolute top-2 right-2 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-colors"
                      >
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="goal-photo"
                      className="flex flex-col items-center justify-center w-full h-32 glass rounded-xl cursor-pointer hover:bg-white/5 transition-colors"
                    >
                      <svg className="w-8 h-8 text-foreground-muted mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm text-foreground-muted">Dodaj fotografiju</span>
                      <span className="text-xs text-foreground-muted mt-1">Max 2MB</span>
                    </label>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-foreground-muted mb-1">Naziv *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-3 glass rounded-xl text-foreground placeholder-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="npr. Novi squat rack-ovi"
                  />
                </div>

                <div>
                  <label className="block text-sm text-foreground-muted mb-1">Opis</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-4 py-3 glass rounded-xl text-foreground placeholder-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                    rows={3}
                    placeholder="Opišite za šta se prikupljaju sredstva..."
                  />
                </div>

                <div>
                  <label className="block text-sm text-foreground-muted mb-1">Ciljni iznos (€) *</label>
                  <input
                    type="number"
                    value={form.targetAmount}
                    onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
                    className="w-full px-4 py-3 glass rounded-xl text-foreground placeholder-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="5000"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm text-foreground-muted mb-1">Rok (opciono)</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-4 py-3 glass rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isVisible"
                    checked={form.isVisible}
                    onChange={(e) => setForm({ ...form, isVisible: e.target.checked })}
                    className="w-5 h-5 rounded accent-accent"
                  />
                  <label htmlFor="isVisible" className="text-sm text-foreground">
                    Prikaži članovima na početnoj stranici
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={resetModal}
                  className="flex-1 px-4 py-3 glass rounded-xl text-foreground hover:bg-white/10 transition-colors"
                >
                  Otkaži
                </button>
                <button
                  onClick={editingGoal ? handleUpdate : handleSubmit}
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50"
                >
                  {submitting
                    ? editingGoal ? "Ažuriranje..." : "Kreiranje..."
                    : editingGoal ? "Sačuvaj" : "Kreiraj"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Amount Modal */}
        {addAmountModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="glass rounded-2xl p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-foreground mb-2">Dodaj iznos</h2>
              <p className="text-sm text-foreground-muted mb-6">
                Ručno dodajte iznos za cilj &quot;{addAmountModal.name}&quot;
              </p>

              {error && (
                <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-xl">
                  <p className="text-sm text-error">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-foreground-muted mb-1">Iznos (€) *</label>
                  <input
                    type="number"
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    className="w-full px-4 py-3 glass rounded-xl text-foreground placeholder-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="100"
                    min="0.01"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm text-foreground-muted mb-1">Napomena</label>
                  <input
                    type="text"
                    value={addNote}
                    onChange={(e) => setAddNote(e.target.value)}
                    className="w-full px-4 py-3 glass rounded-xl text-foreground placeholder-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="npr. Donacija od sponzora"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setAddAmountModal(null);
                    setAddAmount("");
                    setAddNote("");
                    setError("");
                  }}
                  className="flex-1 px-4 py-3 glass rounded-xl text-foreground hover:bg-white/10 transition-colors"
                >
                  Otkaži
                </button>
                <button
                  onClick={handleAddAmount}
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-500/90 transition-colors disabled:opacity-50"
                >
                  {submitting ? "Dodavanje..." : "Dodaj"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TierGate>
  );
}
