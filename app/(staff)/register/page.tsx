"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, FadeIn, SlideUp, GlassCard } from "@/components/ui";

const GOALS = [
  { value: "fat_loss", label: "Gubitak masnoće", description: "Gubitak masnog tkiva uz očuvanje mišića" },
  { value: "muscle_gain", label: "Rast mišića", description: "Izgradnja mišića i povećanje snage" },
  { value: "recomposition", label: "Rekompozicija", description: "Gubitak masnoće i rast mišića istovremeno" },
];

const goalLabels: Record<string, string> = {
  fat_loss: "Mršavljenje",
  muscle_gain: "Masa",
  recomposition: "Rekompozicija",
};

interface UnassignedMember {
  id: string;
  memberId: string;
  name: string;
  avatarUrl: string | null;
  goal: string;
  weight: number | null;
  height: number | null;
  createdAt: string;
  hasPendingRequest: boolean;
  pendingRequestFromMe: boolean;
  pendingRequestCoachName: string | null;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function AssignMemberPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Coach assignment state
  const [unassignedMembers, setUnassignedMembers] = useState<UnassignedMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<UnassignedMember | null>(null);
  const [step, setStep] = useState<"select" | "setup" | "success">("select");
  const [searchQuery, setSearchQuery] = useState("");
  const [goal, setGoal] = useState<string | null>(null);
  const [customCalories, setCustomCalories] = useState("");
  const [customProtein, setCustomProtein] = useState("");
  const [customCarbs, setCustomCarbs] = useState("");
  const [customFats, setCustomFats] = useState("");
  const [caloriesManuallySet, setCaloriesManuallySet] = useState(false);
  const [notes, setNotes] = useState("");
  const [requireExactMacros, setRequireExactMacros] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Auto-calculate calories from macros
  const calculateCaloriesFromMacros = (protein: string, carbs: string, fats: string) => {
    const p = parseInt(protein) || 0;
    const c = parseInt(carbs) || 0;
    const f = parseInt(fats) || 0;
    if (p > 0 || c > 0 || f > 0) {
      return (p * 4 + c * 4 + f * 9).toString();
    }
    return "";
  };

  const handleMacroChange = (type: "protein" | "carbs" | "fats", value: string) => {
    const newProtein = type === "protein" ? value : customProtein;
    const newCarbs = type === "carbs" ? value : customCarbs;
    const newFats = type === "fats" ? value : customFats;

    if (type === "protein") setCustomProtein(value);
    if (type === "carbs") setCustomCarbs(value);
    if (type === "fats") setCustomFats(value);

    // Auto-calculate calories unless manually set
    if (!caloriesManuallySet) {
      setCustomCalories(calculateCaloriesFromMacros(newProtein, newCarbs, newFats));
    }
  };

  const handleCaloriesChange = (value: string) => {
    setCustomCalories(value);
    setCaloriesManuallySet(true);
  };

  useEffect(() => {
    const fetchUnassignedMembers = async () => {
      try {
        const membersRes = await fetch("/api/coach/unassigned-members");
        if (membersRes.ok) {
          const membersData = await membersRes.json();
          setUnassignedMembers(membersData.members);
        }
      } catch {
        // Handle error silently
      } finally {
        setLoading(false);
      }
    };

    fetchUnassignedMembers();
  }, []);

  // Coach assignment submit
  const handleAssign = async () => {
    if (!selectedMember || !goal) {
      setError("Morate izabrati člana i cilj");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/coach/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: selectedMember.id,
          customGoal: goal,
          customCalories: customCalories || undefined,
          customProtein: customProtein || undefined,
          customCarbs: customCarbs || undefined,
          customFats: customFats || undefined,
          notes: notes || undefined,
          requireExactMacros,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep("success");
      } else {
        setError(data.error || "Dodeljivanje člana nije uspelo");
      }
    } catch {
      setError("Nije moguće povezivanje. Pokušaj ponovo.");
    } finally {
      setSubmitting(false);
    }
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

  // ============= SUCCESS VIEW =============
  if (step === "success") {
    return (
      <div className="min-h-screen bg-background px-6 pt-12 pb-24">
        <header className="flex items-center justify-between mb-8">
          <div className="w-10" />
          <h1 className="text-xl font-bold text-foreground">Zahtev poslat</h1>
          <div className="w-10" />
        </header>

        <div className="space-y-6">
          <Card className="text-center py-6">
            <div className="w-16 h-16 bg-warning rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Zahtev poslat članu {selectedMember?.name}
            </h2>
            <p className="text-foreground-muted">
              Čeka se odobrenje. Član mora prihvatiti zahtev pre nego što postane tvoj klijent.
            </p>
          </Card>

          <Card className="bg-warning/5 border-warning/20">
            <div className="flex items-start gap-3">
              <span className="text-xl">ℹ️</span>
              <div>
                <p className="text-sm text-foreground">
                  Kada član prihvati zahtev, njegov napredak će biti resetovan i ciljevi postavljeni prema tvom planu.
                </p>
              </div>
            </div>
          </Card>

          <div className="space-y-3">
            <Button
              className="w-full"
              onClick={() => {
                setStep("select");
                setSelectedMember(null);
                setGoal(null);
                setCustomCalories("");
                setCustomProtein("");
                setCustomCarbs("");
                setCustomFats("");
                setCaloriesManuallySet(false);
                setNotes("");
                setRequireExactMacros(false);
                // Refresh unassigned members
                fetch("/api/coach/unassigned-members")
                  .then(res => res.json())
                  .then(data => setUnassignedMembers(data.members));
              }}
            >
              Dodeli još jednog člana
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => router.push("/dashboard")}
            >
              Nazad na kontrolnu tablu
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ============= SETUP VIEW (after selecting member) =============
  if (step === "setup" && selectedMember) {
    return (
      <div className="min-h-screen bg-background pb-32">
        <header className="px-6 pt-12 pb-6 flex items-center justify-between">
          <button
            onClick={() => setStep("select")}
            className="p-2 -ml-2"
            aria-label="Go back"
          >
            <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-foreground">Postavi plan</h1>
          <div className="w-10" />
        </header>

        <main className="px-6 space-y-6">
          {error && (
            <div className="p-4 bg-error/10 border border-error/20 rounded-xl">
              <p className="text-error text-sm">{error}</p>
            </div>
          )}

          <Card>
            <h3 className="text-lg font-semibold text-foreground mb-2">Član</h3>
            <div className="flex items-center gap-3">
              {selectedMember.avatarUrl ? (
                <img
                  src={selectedMember.avatarUrl}
                  alt={selectedMember.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                  <span className="text-xl font-bold text-accent">
                    {getInitials(selectedMember.name)}
                  </span>
                </div>
              )}
              <div>
                <p className="font-medium text-foreground">{selectedMember.name}</p>
                <p className="text-sm text-foreground-muted">
                  {selectedMember.memberId} • {selectedMember.weight ? `${selectedMember.weight}kg` : "Težina nije uneta"}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-foreground mb-4">Cilj *</h3>
            <div className="space-y-3">
              {GOALS.map((g) => (
                <button
                  key={g.value}
                  onClick={() => setGoal(g.value)}
                  className={`
                    w-full text-left p-4 rounded-xl border-2 transition-all
                    ${goal === g.value
                      ? "border-accent bg-accent/10"
                      : "border-border hover:border-border-hover"
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
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-foreground mb-4">Prilagođeni ciljevi (opciono)</h3>
            <p className="text-sm text-foreground-muted mb-4">
              Unesi makrose — kalorije će se automatski izračunati.
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="Proteini (g)"
                  type="number"
                  placeholder="150"
                  value={customProtein}
                  onChange={(e) => handleMacroChange("protein", e.target.value)}
                />
                <Input
                  label="UH (g)"
                  type="number"
                  placeholder="200"
                  value={customCarbs}
                  onChange={(e) => handleMacroChange("carbs", e.target.value)}
                />
                <Input
                  label="Masti (g)"
                  type="number"
                  placeholder="60"
                  value={customFats}
                  onChange={(e) => handleMacroChange("fats", e.target.value)}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground-muted">
                    Dnevne kalorije
                  </label>
                  {customCalories && !caloriesManuallySet && (
                    <span className="text-xs text-accent">auto-izračunato</span>
                  )}
                </div>
                <input
                  type="number"
                  placeholder="npr. 2000"
                  value={customCalories}
                  onChange={(e) => handleCaloriesChange(e.target.value)}
                  className="w-full px-4 py-3 bg-background-secondary border border-border rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent"
                />
                {(customProtein || customCarbs || customFats) && customCalories && (
                  <p className="text-xs text-foreground-muted mt-2">
                    = {customProtein || 0}g P × 4 + {customCarbs || 0}g UH × 4 + {customFats || 0}g M × 9
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-foreground mb-4">Praćenje makrosa</h3>
            <button
              type="button"
              onClick={() => setRequireExactMacros(!requireExactMacros)}
              className="flex items-start gap-3 w-full text-left"
            >
              <div
                className={`
                  mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all
                  ${requireExactMacros
                    ? "bg-accent border-accent"
                    : "bg-transparent border-border hover:border-foreground-muted"
                  }
                `}
              >
                {requireExactMacros && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div>
                <span className="font-medium text-foreground">Zahtevaj unos tačnih makrosa</span>
                <p className="text-sm text-foreground-muted mt-1">
                  Član mora uneti proteine, ugljene hidrate i masti za svaki obrok. Kalorije se automatski računaju.
                </p>
              </div>
            </button>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-foreground mb-4">Beleške (opciono)</h3>
            <textarea
              className="w-full h-24 bg-background-secondary border border-border rounded-xl p-3 text-foreground placeholder:text-foreground-muted resize-none focus:outline-none focus:border-accent"
              placeholder="Početne napomene o klijentu..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Card>
        </main>

        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent">
          <Button
            className="w-full"
            size="lg"
            onClick={handleAssign}
            disabled={!goal || submitting}
            loading={submitting}
          >
            Dodeli člana
          </Button>
        </div>
      </div>
    );
  }

  // ============= SELECT MEMBER VIEW =============
  // Filter members by search query
  const filteredMembers = unassignedMembers.filter((member) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      member.name.toLowerCase().includes(query) ||
      member.memberId.toLowerCase().includes(query)
    );
  });

  // Limit displayed members for performance
  const MAX_DISPLAY = 20;
  const displayedMembers = filteredMembers.slice(0, MAX_DISPLAY);
  const hasMore = filteredMembers.length > MAX_DISPLAY;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="px-6 pt-12 pb-6 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2"
          aria-label="Go back"
        >
          <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-foreground">Dodeli člana</h1>
        <div className="w-10" />
      </header>

      <main className="px-6 space-y-4">
        <SlideUp delay={100}>
          <Card className="bg-accent/5 border-accent/20">
            <div className="flex items-center gap-3">
              <span className="text-2xl">👥</span>
              <div>
                <p className="text-sm font-medium text-accent">
                  {unassignedMembers.length} {unassignedMembers.length === 1 ? "član" : "članova"} bez trenera
                </p>
                <p className="text-xs text-foreground-muted">
                  Izaberi člana da postaviš njegov plan
                </p>
              </div>
            </div>
          </Card>
        </SlideUp>

        {unassignedMembers.length > 0 && (
          <SlideUp delay={150}>
            <div className="relative">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Pretraži po imenu ili ID-u..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-background-secondary border border-border rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </SlideUp>
        )}

        {unassignedMembers.length === 0 ? (
          <SlideUp delay={200}>
            <Card className="text-center py-12">
              <span className="text-4xl mb-4 block">🎉</span>
              <p className="text-foreground-muted">
                Svi članovi teretane imaju dodeljenog trenera
              </p>
            </Card>
          </SlideUp>
        ) : filteredMembers.length === 0 ? (
          <SlideUp delay={200}>
            <Card className="text-center py-8">
              <span className="text-3xl mb-3 block">🔍</span>
              <p className="text-foreground-muted">
                Nema rezultata za &quot;{searchQuery}&quot;
              </p>
            </Card>
          </SlideUp>
        ) : (
          <SlideUp delay={200}>
            <div className="space-y-3">
              {searchQuery && (
                <p className="text-sm text-foreground-muted">
                  {filteredMembers.length} {filteredMembers.length === 1 ? "rezultat" : "rezultata"}
                </p>
              )}
              {displayedMembers.map((member, index) => (
                <SlideUp key={member.id} delay={250 + Math.min(index, 5) * 30}>
                  <GlassCard
                    hover={!member.pendingRequestFromMe}
                    className={member.pendingRequestFromMe ? "opacity-75" : "cursor-pointer"}
                    onClick={() => {
                      if (member.pendingRequestFromMe) return;
                      setSelectedMember(member);
                      setGoal(member.goal); // Pre-fill with current goal
                      setStep("setup");
                    }}
                  >
                    <div className="flex items-center gap-4">
                      {member.avatarUrl ? (
                        <img
                          src={member.avatarUrl}
                          alt={member.name}
                          className={`w-12 h-12 rounded-full object-cover ${
                            member.pendingRequestFromMe ? "opacity-75" : ""
                          }`}
                        />
                      ) : (
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          member.pendingRequestFromMe ? "bg-warning/20" : "bg-accent/20"
                        }`}>
                          <span className={`text-lg font-bold ${
                            member.pendingRequestFromMe ? "text-warning" : "text-accent"
                          }`}>
                            {getInitials(member.name)}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-foreground truncate">
                            {member.name}
                          </h3>
                          <span className="text-xs bg-background-secondary text-foreground-muted px-2 py-0.5 rounded font-mono">
                            {member.memberId}
                          </span>
                          {member.pendingRequestFromMe && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-warning/20 text-warning rounded-full flex-shrink-0">
                              Zahtev poslat
                            </span>
                          )}
                          {member.hasPendingRequest && !member.pendingRequestFromMe && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-foreground-muted/20 text-foreground-muted rounded-full flex-shrink-0">
                              {member.pendingRequestCoachName}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-foreground-muted">
                          {goalLabels[member.goal] || member.goal}
                        </p>
                        {member.weight && (
                          <p className="text-xs text-foreground-muted mt-1">
                            ⚖️ {member.weight}kg
                            {member.height && ` • 📏 ${member.height}cm`}
                          </p>
                        )}
                      </div>
                      {member.pendingRequestFromMe ? (
                        <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      ) : (
                        <svg className="w-5 h-5 text-foreground-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </div>
                  </GlassCard>
                </SlideUp>
              ))}
              {hasMore && (
                <p className="text-center text-sm text-foreground-muted py-2">
                  Prikazano {MAX_DISPLAY} od {filteredMembers.length} članova.
                  Koristi pretragu za preciznije rezultate.
                </p>
              )}
            </div>
          </SlideUp>
        )}
      </main>
    </div>
  );
}
