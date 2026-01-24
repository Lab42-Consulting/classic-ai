"use client";

import { useEffect, useState, useRef } from "react";
import { TierGate } from "@/components/tier-gate";

interface GoalOption {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  targetAmount: number;
  voteCount: number;
  percentage: number;
  isWinner: boolean;
  displayOrder: number;
}

interface Goal {
  id: string;
  name: string;
  description: string | null;
  status: "draft" | "voting" | "fundraising" | "completed" | "cancelled";
  isVisible: boolean;
  votingEndsAt: string | null;
  votingEndedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  totalVotes: number;
  voteCount: number;
  currentAmount: number;
  targetAmount: number;
  progressPercentage: number;
  contributionCount: number;
  options: GoalOption[];
  winningOptionId: string | null;
}

interface NewOptionForm {
  name: string;
  description: string;
  targetAmount: string;
  imageUrl: string | null;
}

interface NewGoalForm {
  name: string;
  description: string;
  votingEndsAt: string;
  isVisible: boolean;
  options: NewOptionForm[];
}

const defaultOptionForm: NewOptionForm = {
  name: "",
  description: "",
  targetAmount: "",
  imageUrl: null,
};

const defaultForm: NewGoalForm = {
  name: "",
  description: "",
  votingEndsAt: "",
  isVisible: true,
  options: [{ ...defaultOptionForm }],
};

const statusLabels: Record<string, string> = {
  draft: "Nacrt",
  voting: "Glasanje",
  fundraising: "Prikupljanje",
  completed: "Završeno",
  cancelled: "Otkazano",
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-500/20 text-gray-400",
  voting: "bg-blue-500/20 text-blue-400",
  fundraising: "bg-amber-500/20 text-amber-400",
  completed: "bg-emerald-500/20 text-emerald-400",
  cancelled: "bg-red-500/20 text-red-400",
};

type TabFilter = "all" | "draft" | "voting" | "fundraising" | "completed";

export default function GoalsPage() {
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<NewGoalForm>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Detail modal state
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [addAmountModal, setAddAmountModal] = useState<Goal | null>(null);
  const [addAmount, setAddAmount] = useState("");
  const [addNote, setAddNote] = useState("");

  // Edit modal state
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    votingEndsAt: "",
  });

  // Success message state
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async (refreshSelectedId?: string) => {
    try {
      const response = await fetch("/api/admin/goals");
      if (response.ok) {
        const data = await response.json();
        setGoals(data.goals);

        // If we need to refresh the selected goal, find it in the new data
        if (refreshSelectedId) {
          const updatedGoal = data.goals.find((g: Goal) => g.id === refreshSelectedId);
          if (updatedGoal) {
            setSelectedGoal(updatedGoal);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch goals:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredGoals = goals.filter((goal) => {
    if (activeTab === "all") return true;
    return goal.status === activeTab;
  });

  const handlePhotoUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Molimo izaberite sliku");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Slika mora biti manja od 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setForm((prev) => ({
        ...prev,
        options: prev.options.map((opt, i) =>
          i === index ? { ...opt, imageUrl: base64 } : opt
        ),
      }));
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = (index: number) => {
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((opt, i) =>
        i === index ? { ...opt, imageUrl: null } : opt
      ),
    }));
    if (fileInputRefs.current[index]) {
      fileInputRefs.current[index]!.value = "";
    }
  };

  const addOption = () => {
    if (form.options.length >= 5) {
      setError("Maksimalno 5 opcija");
      return;
    }
    setForm((prev) => ({
      ...prev,
      options: [...prev.options, { ...defaultOptionForm }],
    }));
  };

  const removeOption = (index: number) => {
    if (form.options.length <= 1) {
      setError("Potrebna je najmanje jedna opcija");
      return;
    }
    setForm((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const updateOption = (index: number, field: keyof NewOptionForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((opt, i) =>
        i === index ? { ...opt, [field]: value } : opt
      ),
    }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError("Naziv cilja je obavezan");
      return;
    }

    // Validate options
    for (let i = 0; i < form.options.length; i++) {
      const opt = form.options[i];
      if (!opt.name.trim()) {
        setError(`Opcija ${i + 1}: naziv je obavezan`);
        return;
      }
      const amount = parseFloat(opt.targetAmount);
      if (isNaN(amount) || amount <= 0) {
        setError(`Opcija ${i + 1}: unesite validan ciljni iznos`);
        return;
      }
    }

    // Multi-option goals need voting deadline
    if (form.options.length > 1 && !form.votingEndsAt) {
      setError("Rok za glasanje je obavezan kada ima više opcija");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/admin/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          votingEndsAt: form.votingEndsAt || null,
          isVisible: form.isVisible,
          options: form.options.map((opt) => ({
            name: opt.name.trim(),
            description: opt.description.trim() || null,
            targetAmount: parseFloat(opt.targetAmount),
            imageUrl: opt.imageUrl,
          })),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowModal(false);
        setForm(defaultForm);
        setSuccessMessage("✓ Cilj je kreiran");
        setTimeout(() => setSuccessMessage(""), 3000);
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

  const handlePublish = async (goalId: string) => {
    try {
      const response = await fetch(`/api/admin/goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      });

      if (response.ok) {
        setSelectedGoal(null);
        setSuccessMessage("✓ Cilj je objavljen!");
        setTimeout(() => setSuccessMessage(""), 3000);
        fetchGoals();
      } else {
        const data = await response.json();
        setError(data.error || "Objava nije uspela");
      }
    } catch {
      setError("Greška pri objavi");
    }
  };

  const handleCloseVoting = async (goalId: string) => {
    if (!confirm("Da li ste sigurni da želite da zatvorite glasanje? Pobednik će biti automatski izabran.")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close_voting" }),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedGoal(null);
        setSuccessMessage(`✓ Glasanje zatvoreno! Pobednik: ${data.winningOption?.name || "izabran"}`);
        setTimeout(() => setSuccessMessage(""), 4000);
        fetchGoals();
      } else {
        const data = await response.json();
        setError(data.error || "Zatvaranje glasanja nije uspelo");
      }
    } catch {
      setError("Greška pri zatvaranju glasanja");
    }
  };

  const handleCancel = async (goalId: string) => {
    if (!confirm("Da li ste sigurni da želite da otkažete ovaj cilj?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });

      if (response.ok) {
        setSelectedGoal(null);
        setSuccessMessage("✓ Cilj je otkazan");
        setTimeout(() => setSuccessMessage(""), 3000);
        fetchGoals();
      } else {
        const data = await response.json();
        setError(data.error || "Otkazivanje nije uspelo");
      }
    } catch {
      setError("Greška pri otkazivanju");
    }
  };

  const handleDelete = async (goalId: string) => {
    if (!confirm("Da li ste sigurni da želite da obrišete ovaj nacrt?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/goals/${goalId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSelectedGoal(null);
        setSuccessMessage("✓ Nacrt je obrisan");
        setTimeout(() => setSuccessMessage(""), 3000);
        fetchGoals();
      } else {
        const data = await response.json();
        setError(data.error || "Brisanje nije uspelo");
      }
    } catch {
      setError("Greška pri brisanju");
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
      const response = await fetch(`/api/admin/goals/${addAmountModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addAmount: amount,
          addNote: addNote || "Ručni unos",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const goalId = addAmountModal.id;
        setAddAmountModal(null);
        setAddAmount("");
        setAddNote("");

        // Show success message
        if (data.completed) {
          setSuccessMessage("🎉 Cilj je dostignut! Čestitamo!");
        } else {
          setSuccessMessage(`✓ Dodat iznos: ${amount.toLocaleString()}€`);
        }
        setTimeout(() => setSuccessMessage(""), 4000);

        // Refresh goals and update the selected goal detail view
        await fetchGoals(goalId);
      } else {
        setError(data.error || "Dodavanje nije uspelo");
      }
    } catch {
      setError("Greška pri dodavanju");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (goal: Goal) => {
    setEditForm({
      name: goal.name,
      description: goal.description || "",
      votingEndsAt: goal.votingEndsAt
        ? new Date(goal.votingEndsAt).toISOString().slice(0, 16)
        : "",
    });
    setEditingGoal(goal);
    setSelectedGoal(null);
    setError("");
  };

  const handleEditSubmit = async () => {
    if (!editingGoal) return;

    if (!editForm.name.trim()) {
      setError("Naziv cilja je obavezan");
      return;
    }

    // Multi-option goals need deadline
    if (editingGoal.options.length > 1 && !editForm.votingEndsAt) {
      setError("Rok za glasanje je obavezan kada ima više opcija");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/goals/${editingGoal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim(),
          description: editForm.description.trim() || null,
          votingEndsAt: editForm.votingEndsAt || null,
        }),
      });

      if (response.ok) {
        setEditingGoal(null);
        setSuccessMessage("✓ Izmene sačuvane");
        setTimeout(() => setSuccessMessage(""), 3000);
        fetchGoals();
      } else {
        const data = await response.json();
        setError(data.error || "Ažuriranje nije uspelo");
      }
    } catch {
      setError("Greška pri ažuriranju");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("sr-RS", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("sr-RS", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Stats
  const stats = {
    total: goals.length,
    voting: goals.filter((g) => g.status === "voting").length,
    fundraising: goals.filter((g) => g.status === "fundraising").length,
    totalVotes: goals.reduce((sum, g) => sum + g.totalVotes, 0),
  };

  return (
    <TierGate feature="challenges">
      <div className="min-h-screen bg-background p-4 md:p-8">
        {/* Success Toast */}
        {successMessage && (
          <div className="fixed top-4 right-4 z-[60] animate-in slide-in-from-top-2 duration-300">
            <div className="bg-emerald-500/90 text-white px-4 py-3 rounded-xl shadow-lg backdrop-blur-sm">
              <p className="font-medium">{successMessage}</p>
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Glasanje za ciljeve</h1>
              <p className="text-foreground-muted text-sm mt-1">
                Kreiraj ciljeve, omogući članovima da glasaju
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors font-medium"
            >
              + Novi cilj
            </button>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-background-secondary rounded-xl p-4 border border-border">
              <p className="text-foreground-muted text-sm">Ukupno ciljeva</p>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            </div>
            <div className="bg-background-secondary rounded-xl p-4 border border-border">
              <p className="text-foreground-muted text-sm">Aktivna glasanja</p>
              <p className="text-2xl font-bold text-blue-400">{stats.voting}</p>
            </div>
            <div className="bg-background-secondary rounded-xl p-4 border border-border">
              <p className="text-foreground-muted text-sm">U prikupljanju</p>
              <p className="text-2xl font-bold text-amber-400">{stats.fundraising}</p>
            </div>
            <div className="bg-background-secondary rounded-xl p-4 border border-border">
              <p className="text-foreground-muted text-sm">Ukupno glasova</p>
              <p className="text-2xl font-bold text-emerald-400">{stats.totalVotes}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {(["all", "draft", "voting", "fundraising", "completed"] as TabFilter[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? "bg-accent text-white"
                    : "bg-background-secondary text-foreground-muted hover:text-foreground"
                }`}
              >
                {tab === "all" ? "Svi" : statusLabels[tab]}
                {tab !== "all" && (
                  <span className="ml-2 opacity-70">
                    ({goals.filter((g) => g.status === tab).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Goals List */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-foreground-muted">Učitavanje...</p>
            </div>
          ) : filteredGoals.length === 0 ? (
            <div className="text-center py-12 bg-background-secondary rounded-xl border border-border">
              <p className="text-4xl mb-4">🗳️</p>
              <p className="text-foreground-muted">
                {activeTab === "all" ? "Nema kreiranih ciljeva" : `Nema ciljeva u statusu "${statusLabels[activeTab]}"`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredGoals.map((goal) => (
                <div
                  key={goal.id}
                  onClick={() => setSelectedGoal(goal)}
                  className="bg-background-secondary rounded-xl border border-border p-5 cursor-pointer hover:border-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold text-foreground truncate">{goal.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[goal.status]}`}>
                          {statusLabels[goal.status]}
                        </span>
                      </div>
                      {goal.description && (
                        <p className="text-sm text-foreground-muted line-clamp-1">{goal.description}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      {goal.status === "voting" && (
                        <>
                          <p className="text-lg font-bold text-blue-400">{goal.totalVotes} glasova</p>
                          <p className="text-xs text-foreground-muted">
                            Do {formatDateTime(goal.votingEndsAt!)}
                          </p>
                        </>
                      )}
                      {goal.status === "fundraising" && (
                        <>
                          <p className="text-lg font-bold text-amber-400">{goal.progressPercentage}%</p>
                          <p className="text-xs text-foreground-muted">
                            {goal.currentAmount.toLocaleString()}€ / {goal.targetAmount.toLocaleString()}€
                          </p>
                        </>
                      )}
                      {goal.status === "completed" && (
                        <p className="text-lg font-bold text-emerald-400">✓ Završeno</p>
                      )}
                    </div>
                  </div>

                  {/* Options Preview */}
                  <div className="flex flex-wrap gap-2">
                    {goal.options.slice(0, 3).map((opt) => (
                      <div
                        key={opt.id}
                        className={`px-3 py-1.5 rounded-lg text-sm ${
                          opt.isWinner
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-white/5 text-foreground-muted"
                        }`}
                      >
                        {opt.name}
                        {goal.status === "voting" && (
                          <span className="ml-2 opacity-70">{opt.percentage}%</span>
                        )}
                        {opt.isWinner && <span className="ml-1">👑</span>}
                      </div>
                    ))}
                    {goal.options.length > 3 && (
                      <span className="px-3 py-1.5 text-sm text-foreground-muted">
                        +{goal.options.length - 3} više
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Goal Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-background-secondary rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-bold text-foreground">Novi cilj</h2>
                <p className="text-sm text-foreground-muted mt-1">
                  Dodaj opcije za glasanje članovima
                </p>
              </div>

              <div className="p-6 space-y-6">
                {error && (
                  <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
                    {error}
                  </div>
                )}

                {/* Goal Name */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Naziv cilja *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="npr. Oprema za Q2 2026"
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                {/* Goal Description */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Opis (opciono)
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Kratki opis cilja..."
                    rows={2}
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                  />
                </div>

                {/* Options */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-foreground">
                      Opcije za glasanje *
                    </label>
                    <button
                      type="button"
                      onClick={addOption}
                      className="text-sm text-accent hover:text-accent/80"
                    >
                      + Dodaj opciju
                    </button>
                  </div>

                  <div className="space-y-4">
                    {form.options.map((opt, index) => (
                      <div key={index} className="bg-background rounded-xl p-4 border border-border">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-foreground-muted">
                            Opcija {index + 1}
                          </span>
                          {form.options.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeOption(index)}
                              className="text-error text-sm hover:text-error/80"
                            >
                              Ukloni
                            </button>
                          )}
                        </div>

                        <div className="space-y-3">
                          <input
                            type="text"
                            value={opt.name}
                            onChange={(e) => updateOption(index, "name", e.target.value)}
                            placeholder="Naziv opcije (npr. Squat Rack)"
                            className="w-full px-3 py-2 bg-background-secondary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                          />

                          <input
                            type="text"
                            value={opt.description}
                            onChange={(e) => updateOption(index, "description", e.target.value)}
                            placeholder="Opis opcije (opciono)"
                            className="w-full px-3 py-2 bg-background-secondary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                          />

                          <div className="flex gap-3">
                            <div className="flex-1">
                              <input
                                type="number"
                                value={opt.targetAmount}
                                onChange={(e) => updateOption(index, "targetAmount", e.target.value)}
                                placeholder="Cena (€)"
                                min="1"
                                className="w-full px-3 py-2 bg-background-secondary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                              />
                            </div>
                            <div>
                              <input
                                type="file"
                                accept="image/*"
                                ref={(el) => { fileInputRefs.current[index] = el; }}
                                onChange={(e) => handlePhotoUpload(index, e)}
                                className="hidden"
                                id={`photo-${index}`}
                              />
                              {opt.imageUrl ? (
                                <div className="flex items-center gap-2">
                                  <img
                                    src={opt.imageUrl}
                                    alt="Preview"
                                    className="w-10 h-10 rounded-lg object-cover"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePhoto(index)}
                                    className="text-error text-xs"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <label
                                  htmlFor={`photo-${index}`}
                                  className="px-3 py-2 bg-background-secondary border border-border rounded-lg text-foreground-muted text-sm cursor-pointer hover:border-accent/50 flex items-center gap-1"
                                >
                                  📷 Slika
                                </label>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Voting Deadline (only for multi-option) */}
                {form.options.length > 1 && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Rok za glasanje *
                    </label>
                    <input
                      type="datetime-local"
                      value={form.votingEndsAt}
                      onChange={(e) => setForm((f) => ({ ...f, votingEndsAt: e.target.value }))}
                      min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                      className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <p className="text-xs text-foreground-muted mt-1">
                      Članovi mogu glasati do ovog datuma
                    </p>
                  </div>
                )}

                {/* Single option note */}
                {form.options.length === 1 && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-sm text-blue-400">
                      ℹ️ Sa jednom opcijom, glasanje se preskače i cilj ide direktno u fazu prikupljanja sredstava.
                    </p>
                  </div>
                )}

                {/* Visibility */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isVisible}
                    onChange={(e) => setForm((f) => ({ ...f, isVisible: e.target.checked }))}
                    className="w-5 h-5 rounded border-border text-accent focus:ring-accent"
                  />
                  <span className="text-sm text-foreground">Vidljivo članovima</span>
                </label>
              </div>

              <div className="p-6 border-t border-border flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setForm(defaultForm);
                    setError("");
                  }}
                  className="px-4 py-2 text-foreground-muted hover:text-foreground transition-colors"
                >
                  Otkaži
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
                >
                  {submitting ? "Kreiranje..." : "Kreiraj cilj"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Goal Detail Modal */}
        {selectedGoal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-background-secondary rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{selectedGoal.name}</h2>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[selectedGoal.status]}`}>
                      {statusLabels[selectedGoal.status]}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedGoal(null)}
                    className="text-foreground-muted hover:text-foreground"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {error && (
                  <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
                    {error}
                  </div>
                )}

                {selectedGoal.description && (
                  <p className="text-foreground-muted">{selectedGoal.description}</p>
                )}

                {/* Voting Info */}
                {selectedGoal.status === "voting" && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-400">Glasanje aktivno</span>
                      <span className="text-sm text-foreground-muted">
                        Do {formatDateTime(selectedGoal.votingEndsAt!)}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-blue-400">{selectedGoal.totalVotes} glasova</p>
                  </div>
                )}

                {/* Fundraising Progress */}
                {selectedGoal.status === "fundraising" && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-amber-400">Prikupljanje sredstava</span>
                      <span className="text-lg font-bold text-amber-400">{selectedGoal.progressPercentage}%</span>
                    </div>
                    <div className="h-3 bg-background rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                        style={{ width: `${selectedGoal.progressPercentage}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-sm text-foreground-muted">
                      <span>Prikupljeno: {selectedGoal.currentAmount.toLocaleString()}€</span>
                      <span>Cilj: {selectedGoal.targetAmount.toLocaleString()}€</span>
                    </div>
                  </div>
                )}

                {/* Options */}
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-3">Opcije</h3>
                  <div className="space-y-3">
                    {selectedGoal.options.map((opt) => (
                      <div
                        key={opt.id}
                        className={`p-4 rounded-xl border ${
                          opt.isWinner
                            ? "bg-emerald-500/10 border-emerald-500/30"
                            : "bg-background border-border"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {opt.imageUrl && (
                            <img
                              src={opt.imageUrl}
                              alt={opt.name}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">{opt.name}</span>
                              {opt.isWinner && <span>👑</span>}
                            </div>
                            {opt.description && (
                              <p className="text-sm text-foreground-muted">{opt.description}</p>
                            )}
                          </div>
                          <div className="text-right">
                            {selectedGoal.status === "voting" && (
                              <>
                                <p className="text-lg font-bold text-blue-400">{opt.percentage}%</p>
                                <p className="text-xs text-foreground-muted">{opt.voteCount} glasova</p>
                              </>
                            )}
                            <p className="text-sm text-foreground-muted">{opt.targetAmount.toLocaleString()}€</p>
                          </div>
                        </div>

                        {selectedGoal.status === "voting" && (
                          <div className="mt-3 h-2 bg-background-tertiary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${opt.percentage}%` }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Meta Info */}
                <div className="text-sm text-foreground-muted space-y-1">
                  <p>Kreirano: {formatDate(selectedGoal.createdAt)}</p>
                  {selectedGoal.votingEndedAt && (
                    <p>Glasanje završeno: {formatDate(selectedGoal.votingEndedAt)}</p>
                  )}
                  {selectedGoal.completedAt && (
                    <p>Cilj dostignut: {formatDate(selectedGoal.completedAt)}</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="p-6 border-t border-border flex flex-wrap gap-3 justify-end">
                {selectedGoal.status === "draft" && (
                  <>
                    <button
                      onClick={() => handleDelete(selectedGoal.id)}
                      className="px-4 py-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                    >
                      Obriši
                    </button>
                    <button
                      onClick={() => openEditModal(selectedGoal)}
                      className="px-4 py-2 border border-border text-foreground hover:bg-white/5 rounded-lg transition-colors"
                    >
                      Uredi
                    </button>
                    <button
                      onClick={() => handlePublish(selectedGoal.id)}
                      className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
                    >
                      Objavi
                    </button>
                  </>
                )}

                {selectedGoal.status === "voting" && (
                  <>
                    <button
                      onClick={() => handleCancel(selectedGoal.id)}
                      className="px-4 py-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                    >
                      Otkaži
                    </button>
                    <button
                      onClick={() => handleCloseVoting(selectedGoal.id)}
                      className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-500/90 transition-colors"
                    >
                      Zatvori glasanje
                    </button>
                  </>
                )}

                {selectedGoal.status === "fundraising" && (
                  <>
                    <button
                      onClick={() => handleCancel(selectedGoal.id)}
                      className="px-4 py-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                    >
                      Otkaži
                    </button>
                    <button
                      onClick={() => setAddAmountModal(selectedGoal)}
                      className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-500/90 transition-colors"
                    >
                      Dodaj iznos
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Add Amount Modal */}
        {addAmountModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-background-secondary rounded-2xl w-full max-w-md">
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-bold text-foreground">Dodaj iznos</h2>
                <p className="text-sm text-foreground-muted mt-1">
                  Ručni unos doprinosa za "{addAmountModal.name}"
                </p>
              </div>

              <div className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Iznos (€) *
                  </label>
                  <input
                    type="number"
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    placeholder="0"
                    min="1"
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground text-xl font-bold focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Napomena (opciono)
                  </label>
                  <input
                    type="text"
                    value={addNote}
                    onChange={(e) => setAddNote(e.target.value)}
                    placeholder="npr. Keš uplata, donacija..."
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-border flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setAddAmountModal(null);
                    setAddAmount("");
                    setAddNote("");
                    setError("");
                  }}
                  className="px-4 py-2 text-foreground-muted hover:text-foreground transition-colors"
                >
                  Otkaži
                </button>
                <button
                  onClick={handleAddAmount}
                  disabled={submitting}
                  className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-500/90 transition-colors disabled:opacity-50"
                >
                  {submitting ? "Dodavanje..." : "Dodaj"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Goal Modal */}
        {editingGoal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-background-secondary rounded-2xl w-full max-w-lg">
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-bold text-foreground">Uredi cilj</h2>
                <p className="text-sm text-foreground-muted mt-1">
                  Izmeni detalje nacrta cilja
                </p>
              </div>

              <div className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Naziv cilja *
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="npr. Oprema za Q2 2026"
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Opis (opciono)
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Kratki opis cilja..."
                    rows={3}
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                  />
                </div>

                {editingGoal.options.length > 1 && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Rok za glasanje *
                    </label>
                    <input
                      type="datetime-local"
                      value={editForm.votingEndsAt}
                      onChange={(e) => setEditForm((f) => ({ ...f, votingEndsAt: e.target.value }))}
                      min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                      className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <p className="text-xs text-foreground-muted mt-1">
                      Članovi mogu glasati do ovog datuma
                    </p>
                  </div>
                )}

                {/* Options summary (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Opcije ({editingGoal.options.length})
                  </label>
                  <div className="space-y-2">
                    {editingGoal.options.map((opt, index) => (
                      <div
                        key={opt.id}
                        className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border"
                      >
                        {opt.imageUrl && (
                          <img
                            src={opt.imageUrl}
                            alt={opt.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {index + 1}. {opt.name}
                          </p>
                          <p className="text-xs text-foreground-muted">
                            {opt.targetAmount.toLocaleString()}€
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-foreground-muted mt-2">
                    Za izmenu opcija, obrišite nacrt i kreirajte novi cilj
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-border flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setEditingGoal(null);
                    setError("");
                  }}
                  className="px-4 py-2 text-foreground-muted hover:text-foreground transition-colors"
                >
                  Otkaži
                </button>
                <button
                  onClick={handleEditSubmit}
                  disabled={submitting}
                  className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
                >
                  {submitting ? "Čuvanje..." : "Sačuvaj izmene"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TierGate>
  );
}
