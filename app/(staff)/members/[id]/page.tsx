"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, GlassCard, FadeIn, SlideUp, AgentAvatar, agentMeta } from "@/components/ui";
import { AgentType } from "@/components/ui/agent-avatar";
import { CreateEditMealModal, MealFormData } from "@/components/meals";
import { getTranslations } from "@/lib/i18n";
import { formatPortion } from "@/lib/constants/units";

const t = getTranslations("sr");

interface NudgeTemplate {
  id: string;
  label: string;
  message: string;
}

interface CoachMeal {
  id: string;
  name: string;
  totalCalories: number;
  totalProtein?: number | null;
  totalCarbs?: number | null;
  totalFats?: number | null;
  ingredientCount: number;
  createdAt: string;
}

interface MemberDetail {
  member: {
    id: string;
    memberId: string;
    name: string;
    goal: string;
    weight: number | null;
    height: number | null;
    gender: string | null;
    status: string;
    subscriptionStatus: string;
    memberSince: string;
  };
  snapshot: {
    currentWeight: number | null;
    startWeight: number | null;
    weightChange: number;
    weightTrend: "up" | "down" | "stable";
    weeklyTrainingSessions: number;
    daysWithMeals: number;
    avgDailyCalories: number;
    avgDailyProtein: number;
    waterGlasses: number;
    targets: { calories: number; protein: number; carbs: number; fats: number };
    lastActivity: string | null;
    lastTraining: string | null;
    lastMeal: string | null;
  };
  summary: string;
  recentCheckins: Array<{
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
  }>;
  nudges: Array<{
    id: string;
    message: string;
    createdAt: string;
    seen: boolean;
  }>;
}

const feelingEmojis = ["", "😞", "😐", "🙂", "😄"];

const goalLabels: Record<string, string> = {
  fat_loss: "Mršavljenje",
  muscle_gain: "Rast mišića",
  recomposition: "Rekompozicija",
};

const trendIcons = {
  up: "↗️",
  down: "↘️",
  stable: "➡️",
};

export default function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<NudgeTemplate[]>([]);
  const [showNudgeModal, setShowNudgeModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [nudgeMessage, setNudgeMessage] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [sending, setSending] = useState(false);
  const [showKnowledgeModal, setShowKnowledgeModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentType | null>(null);
  const [coachKnowledge, setCoachKnowledge] = useState<Record<AgentType, string>>({
    nutrition: "",
    supplements: "",
    training: "",
  });
  const [knowledgeContent, setKnowledgeContent] = useState("");
  const [savingKnowledge, setSavingKnowledge] = useState(false);
  const [knowledgeSaved, setKnowledgeSaved] = useState(false);

  // Coach meals state
  const [coachMeals, setCoachMeals] = useState<CoachMeal[]>([]);
  const [showMealModal, setShowMealModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [memberRes, templatesRes, knowledgeRes, mealsRes] = await Promise.all([
          fetch(`/api/coach/member/${id}`),
          fetch("/api/coach/nudge?templates=true"),
          fetch(`/api/coach/knowledge?memberId=${id}`),
          fetch(`/api/coach/member-meals/${id}`),
        ]);

        if (memberRes.ok) {
          const result = await memberRes.json();
          setData(result);
        } else {
          // Handle specific error cases
          const errorData = await memberRes.json().catch(() => ({}));
          if (memberRes.status === 403) {
            setError(errorData.error || "Niste dodeljeni ovom članu");
          } else if (memberRes.status === 404) {
            setError("Član nije pronađen");
          } else {
            setError("Greška pri učitavanju podataka");
          }
        }

        if (templatesRes.ok) {
          const templatesData = await templatesRes.json();
          setTemplates(templatesData.templates || []);
        }

        if (knowledgeRes.ok) {
          const knowledgeData = await knowledgeRes.json();
          setCoachKnowledge({
            nutrition: knowledgeData.nutrition || "",
            supplements: knowledgeData.supplements || "",
            training: knowledgeData.training || "",
          });
        }

        if (mealsRes.ok) {
          const mealsData = await mealsRes.json();
          setCoachMeals(mealsData.meals || []);
        }
      } catch {
        setError("Greška pri povezivanju");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleSendNudge = async (templateId?: string) => {
    if (!nudgeMessage && !templateId) return;
    setSending(true);

    try {
      const response = await fetch("/api/coach/nudge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: id,
          message: nudgeMessage || undefined,
          templateId: templateId || undefined,
        }),
      });

      if (response.ok) {
        setShowNudgeModal(false);
        setNudgeMessage("");
        // Refresh data
        const refreshRes = await fetch(`/api/coach/member/${id}`);
        if (refreshRes.ok) {
          setData(await refreshRes.json());
        }
      }
    } catch {
      // Handle error
    } finally {
      setSending(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;
    setSending(true);

    try {
      const response = await fetch(`/api/members/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: noteContent }),
      });

      if (response.ok) {
        setShowNoteModal(false);
        setNoteContent("");
        // Refresh data
        const refreshRes = await fetch(`/api/coach/member/${id}`);
        if (refreshRes.ok) {
          setData(await refreshRes.json());
        }
      }
    } catch {
      // Handle error
    } finally {
      setSending(false);
    }
  };

  const handleOpenKnowledgeEditor = (agent: AgentType) => {
    setSelectedAgent(agent);
    setKnowledgeContent(coachKnowledge[agent] || getDefaultTemplate(agent));
    setShowKnowledgeModal(true);
  };

  const handleSaveKnowledge = async () => {
    if (!selectedAgent) return;
    setSavingKnowledge(true);

    try {
      const response = await fetch("/api/coach/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: id,
          agentType: selectedAgent,
          content: knowledgeContent,
        }),
      });

      if (response.ok) {
        setCoachKnowledge((prev) => ({
          ...prev,
          [selectedAgent]: knowledgeContent,
        }));
        // Show success feedback
        setKnowledgeSaved(true);
        setTimeout(() => {
          setKnowledgeSaved(false);
          setShowKnowledgeModal(false);
          setSelectedAgent(null);
          setKnowledgeContent("");
        }, 1200);
      } else {
        const errorData = await response.json();
        console.error("Save knowledge error:", errorData);
        alert(errorData.error || "Greška pri čuvanju smernica");
      }
    } catch (err) {
      console.error("Save knowledge error:", err);
    } finally {
      setSavingKnowledge(false);
    }
  };

  const handleCreateMeal = async (meal: MealFormData) => {
    const response = await fetch(`/api/coach/member-meals/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: meal.name,
        isManualTotal: meal.isManualTotal,
        totalCalories: meal.totalCalories,
        totalProtein: meal.totalProtein,
        totalCarbs: meal.totalCarbs,
        totalFats: meal.totalFats,
        ingredients: meal.ingredients.map((ing) => ({
          name: ing.name,
          portionSize: formatPortion(ing.portionAmount, ing.portionUnit),
          calories: ing.calories,
          protein: ing.protein,
          carbs: ing.carbs,
          fats: ing.fats,
        })),
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to create meal");
    }

    const result = await response.json();
    setCoachMeals((prev) => [result.meal, ...prev]);
    setShowMealModal(false);
  };

  const handleDeleteMeal = async (mealId: string) => {
    try {
      const response = await fetch(`/api/coach/member-meals/${id}/${mealId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setCoachMeals((prev) => prev.filter((m) => m.id !== mealId));
      }
    } catch {
      // Handle error
    }
  };

  const getDefaultTemplate = (agent: AgentType): string => {
    const templates: Record<AgentType, string> = {
      nutrition: `Smernice za ishranu ovog člana:

- Preporučene namirnice: [npr. piletina, riba, jaja, povrće]
- Namirnice za izbegavanje: [npr. brza hrana, slatkiši]
- Broj obroka dnevno: [npr. 4-5]
- Timing obroka: [npr. protein u svakom obroku]
- Posebne napomene: [alergije, preferencije, restrikcije]`,
      supplements: `Smernice za suplemente ovog člana:

- Preporučeni suplementi: [npr. whey protein, kreatin]
- Timing uzimanja: [npr. protein posle treninga]
- Doziranje: [npr. 30g proteina, 5g kreatina dnevno]
- Suplementi za izbegavanje: [ako postoje]
- Posebne napomene: [intolerancije, preferencije]`,
      training: `Smernice za trening ovog člana:

- Tip programa: [npr. Push/Pull/Legs, Full Body]
- Učestalost: [npr. 4x nedeljno]
- Fokus: [npr. snaga, hipertrofija]
- Vežbe za naglasiti: [npr. složene vežbe]
- Vežbe za izbegavati: [ako postoje povrede]
- Posebne napomene: [povrede, ograničenja]`,
    };
    return templates[agent];
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
      <div className="min-h-screen bg-background px-6 pt-12">
        <Card className="text-center py-8">
          <p className="text-foreground-muted">{error || "Član nije pronađen"}</p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => router.push("/dashboard")}
          >
            Nazad na kontrolnu tablu
          </Button>
        </Card>
      </div>
    );
  }

  const { member, snapshot, summary, recentCheckins, notes, nudges } = data;
  const isProgressPositive =
    (member.goal === "fat_loss" && snapshot.weightTrend === "down") ||
    (member.goal === "muscle_gain" && snapshot.weightTrend === "up") ||
    (member.goal === "recomposition" && snapshot.weightTrend === "stable");

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="px-6 pt-12 pb-6 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full glass flex items-center justify-center btn-press"
          aria-label="Go back"
        >
          <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-foreground">Profil klijenta</h1>
        <div className="w-10" />
      </header>

      <main className="px-6 space-y-6">
        {/* Member Header */}
        <SlideUp delay={100}>
          <GlassCard variant="prominent">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground">{member.name}</h2>
                <p className="text-foreground-muted">{member.memberId} • {goalLabels[member.goal]}</p>
              </div>
              <div className={`
                px-3 py-1 rounded-full flex items-center gap-1.5
                ${isProgressPositive ? "bg-success/10" : "bg-warning/10"}
              `}>
                <span>{trendIcons[snapshot.weightTrend]}</span>
                <span className={isProgressPositive ? "text-success" : "text-warning"}>
                  {snapshot.weightChange > 0 ? "+" : ""}{snapshot.weightChange}kg
                </span>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center">
                <p className="text-xl font-bold text-foreground">{snapshot.currentWeight || "-"}</p>
                <p className="text-xs text-foreground-muted">Trenutno kg</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-foreground">{snapshot.weeklyTrainingSessions}</p>
                <p className="text-xs text-foreground-muted">Treninzi/ned</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-foreground">{snapshot.daysWithMeals}/7</p>
                <p className="text-xs text-foreground-muted">Dana loguje</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-foreground">{snapshot.waterGlasses}</p>
                <p className="text-xs text-foreground-muted">Vode/ned</p>
              </div>
            </div>
          </GlassCard>
        </SlideUp>

        {/* AI Behavior Summary */}
        <SlideUp delay={150}>
          <GlassCard className="border-accent/20 bg-accent/5">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🤖</span>
              <div>
                <p className="text-sm font-medium text-accent mb-1">Rezime ponašanja</p>
                <p className="text-sm text-foreground leading-relaxed">{summary}</p>
              </div>
            </div>
          </GlassCard>
        </SlideUp>

        {/* Nutrition Stats */}
        <SlideUp delay={200}>
          <GlassCard>
            <h3 className="text-sm font-medium text-foreground-muted mb-3">Prosek ove nedelje</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-foreground">Kalorije</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        snapshot.avgDailyCalories / snapshot.targets.calories > 1.1
                          ? "bg-warning"
                          : "bg-accent"
                      }`}
                      style={{
                        width: `${Math.min((snapshot.avgDailyCalories / snapshot.targets.calories) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-foreground-muted w-20 text-right">
                    {snapshot.avgDailyCalories}/{snapshot.targets.calories}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground">Proteini</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        snapshot.avgDailyProtein / snapshot.targets.protein < 0.7
                          ? "bg-warning"
                          : "bg-success"
                      }`}
                      style={{
                        width: `${Math.min((snapshot.avgDailyProtein / snapshot.targets.protein) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-foreground-muted w-20 text-right">
                    {snapshot.avgDailyProtein}g/{snapshot.targets.protein}g
                  </span>
                </div>
              </div>
            </div>
          </GlassCard>
        </SlideUp>

        {/* Weight Progress */}
        {recentCheckins.length > 0 && (
          <SlideUp delay={250}>
            <GlassCard>
              <h3 className="text-sm font-medium text-foreground-muted mb-3">Napredak težine</h3>
              <div className="space-y-2">
                {recentCheckins.slice(0, 4).map((checkin, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <span className="text-sm text-foreground-muted">
                      Ned {checkin.weekNumber}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{feelingEmojis[checkin.feeling]}</span>
                      <span className="font-medium text-foreground">{checkin.weight} kg</span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </SlideUp>
        )}

        {/* Recent Nudges */}
        {nudges.length > 0 && (
          <SlideUp delay={300}>
            <GlassCard>
              <h3 className="text-sm font-medium text-foreground-muted mb-3">Poslednje poruke</h3>
              <div className="space-y-2">
                {nudges.slice(0, 3).map((nudge) => (
                  <div key={nudge.id} className="flex items-start gap-2 py-2 border-b border-white/5 last:border-0">
                    <span className="text-sm">{nudge.seen ? "✅" : "📨"}</span>
                    <div className="flex-1">
                      <p className="text-sm text-foreground">{nudge.message}</p>
                      <p className="text-xs text-foreground-muted mt-1">
                        {new Date(nudge.createdAt).toLocaleDateString("sr-RS")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </SlideUp>
        )}

        {/* Coach Notes */}
        {notes.length > 0 && (
          <SlideUp delay={350}>
            <GlassCard>
              <h3 className="text-sm font-medium text-foreground-muted mb-3">Moje beleške</h3>
              <div className="space-y-2">
                {notes.slice(0, 3).map((note) => (
                  <div key={note.id} className="py-2 border-b border-white/5 last:border-0">
                    <p className="text-sm text-foreground">{note.content}</p>
                    <p className="text-xs text-foreground-muted mt-1">
                      {new Date(note.createdAt).toLocaleDateString("sr-RS")}
                    </p>
                  </div>
                ))}
              </div>
            </GlassCard>
          </SlideUp>
        )}

        {/* AI Knowledge Section */}
        <SlideUp delay={400}>
          <GlassCard>
            <h3 className="text-sm font-medium text-foreground-muted mb-1">AI Podešavanja</h3>
            <p className="text-xs text-foreground-muted/70 mb-4">
              Tvoje smernice koje će AI agenti koristiti za ovog člana
            </p>
            <div className="space-y-3">
              {(["nutrition", "supplements", "training"] as AgentType[]).map((agent) => {
                const meta = agentMeta[agent];
                const hasContent = !!coachKnowledge[agent];
                const dotColor = hasContent
                  ? agent === "nutrition"
                    ? "bg-emerald-500"
                    : agent === "supplements"
                      ? "bg-violet-500"
                      : "bg-orange-500"
                  : "bg-foreground-muted/30";
                return (
                  <button
                    key={agent}
                    onClick={() => handleOpenKnowledgeEditor(agent)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${meta.borderClass} border ${meta.hoverBgClass}`}
                  >
                    <AgentAvatar agent={agent} size="sm" state="idle" />
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-foreground">{meta.name}</p>
                      <p className="text-xs text-foreground-muted">
                        {hasContent ? "Smernice postavljene" : "Klikni da dodaš smernice"}
                      </p>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                    <svg className={`w-4 h-4 ${meta.textClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                );
              })}
            </div>
          </GlassCard>
        </SlideUp>

        {/* Coach Meals Section */}
        <SlideUp delay={450}>
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium text-foreground-muted">Obroci za člana</h3>
                <p className="text-xs text-foreground-muted/70">
                  Obroci koje si kreirao/la za ovog člana
                </p>
              </div>
              <button
                onClick={() => setShowMealModal(true)}
                className="px-3 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent/90 transition-colors"
              >
                + Dodaj
              </button>
            </div>

            {coachMeals.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-background-tertiary rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">🍽️</span>
                </div>
                <p className="text-sm text-foreground-muted">
                  Još nisi kreirao/la obroke za ovog člana
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {coachMeals.map((meal) => (
                  <div
                    key={meal.id}
                    className="flex items-center justify-between p-3 bg-background-tertiary rounded-xl"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{meal.name}</p>
                      <div className="flex items-center gap-2 text-xs text-foreground-muted mt-0.5">
                        <span>{meal.totalCalories} kcal</span>
                        {meal.totalProtein && <span>P: {meal.totalProtein}g</span>}
                        {meal.totalCarbs && <span>U: {meal.totalCarbs}g</span>}
                        {meal.totalFats && <span>M: {meal.totalFats}g</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteMeal(meal.id)}
                      className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                      title="Obriši obrok"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </SlideUp>
      </main>

      {/* Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent">
        <FadeIn delay={400}>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1 btn-press"
              onClick={() => setShowNoteModal(true)}
            >
              📝 Beleška
            </Button>
            <Button
              className="flex-1 btn-press glow-accent"
              onClick={() => setShowNudgeModal(true)}
            >
              💬 Pošalji poruku
            </Button>
          </div>
        </FadeIn>
      </div>

      {/* Nudge Modal */}
      {showNudgeModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
          <div className="bg-background w-full rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-foreground">Pošalji poruku</h2>
              <button
                onClick={() => setShowNudgeModal(false)}
                className="p-2 text-foreground-muted"
              >
                ✕
              </button>
            </div>

            {/* Quick Templates */}
            <div className="space-y-2 mb-6">
              <p className="text-sm text-foreground-muted mb-2">Brzi izbor:</p>
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSendNudge(template.id)}
                  disabled={sending}
                  className="w-full text-left p-3 glass rounded-xl hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  <p className="text-sm font-medium text-foreground">{template.label}</p>
                  <p className="text-xs text-foreground-muted mt-1">{template.message}</p>
                </button>
              ))}
            </div>

            {/* Custom Message */}
            <div className="space-y-3">
              <p className="text-sm text-foreground-muted">Ili napiši svoju poruku:</p>
              <textarea
                value={nudgeMessage}
                onChange={(e) => setNudgeMessage(e.target.value)}
                placeholder="Napiši personalizovanu poruku..."
                className="w-full h-24 p-3 glass rounded-xl text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              />
              <Button
                className="w-full btn-press"
                onClick={() => handleSendNudge()}
                disabled={!nudgeMessage.trim() || sending}
              >
                {sending ? "Šaljem..." : "Pošalji"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
          <div className="bg-background w-full rounded-t-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-foreground">Dodaj belešku</h2>
              <button
                onClick={() => setShowNoteModal(false)}
                className="p-2 text-foreground-muted"
              >
                ✕
              </button>
            </div>

            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Privatna beleška o klijentu..."
              className="w-full h-32 p-3 glass rounded-xl text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:ring-2 focus:ring-accent resize-none mb-4"
            />
            <Button
              className="w-full btn-press"
              onClick={handleAddNote}
              disabled={!noteContent.trim() || sending}
            >
              {sending ? "Čuvam..." : "Sačuvaj belešku"}
            </Button>
          </div>
        </div>
      )}

      {/* Knowledge Editor Modal */}
      {showKnowledgeModal && selectedAgent && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
          <div className="bg-background w-full rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto">
            {knowledgeSaved ? (
              /* Success State */
              <FadeIn>
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-xl font-bold text-foreground">Sačuvano!</p>
                  <p className="text-sm text-foreground-muted mt-1">
                    Smernice su uspešno ažurirane
                  </p>
                </div>
              </FadeIn>
            ) : (
              /* Edit Form */
              <>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <AgentAvatar agent={selectedAgent} size="sm" state="idle" />
                    <div>
                      <h2 className="text-lg font-bold text-foreground">
                        {agentMeta[selectedAgent].name} smernice
                      </h2>
                      <p className="text-xs text-foreground-muted">
                        Ove smernice će AI koristiti za savete
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowKnowledgeModal(false);
                      setSelectedAgent(null);
                      setKnowledgeContent("");
                    }}
                    className="p-2 text-foreground-muted"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-foreground-muted mb-2">
                      Upiši smernice koje AI treba da prati za ovog člana:
                    </p>
                    <textarea
                      value={knowledgeContent}
                      onChange={(e) => setKnowledgeContent(e.target.value)}
                      placeholder={getDefaultTemplate(selectedAgent)}
                      className="w-full h-64 p-4 glass rounded-xl text-foreground placeholder:text-foreground-muted/30 focus:outline-none focus:ring-2 focus:ring-accent resize-none text-sm leading-relaxed"
                    />
                    <p className="text-xs text-foreground-muted/50 mt-2">
                      {knowledgeContent.length}/2000 karaktera
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="secondary"
                      className="flex-1 btn-press"
                      onClick={() => setKnowledgeContent(getDefaultTemplate(selectedAgent))}
                    >
                      Resetuj šablon
                    </Button>
                    <Button
                      className={`flex-1 btn-press ${
                        selectedAgent === "nutrition"
                          ? "bg-emerald-600 hover:bg-emerald-700"
                          : selectedAgent === "supplements"
                            ? "bg-violet-600 hover:bg-violet-700"
                            : "bg-orange-600 hover:bg-orange-700"
                      }`}
                      onClick={handleSaveKnowledge}
                      disabled={savingKnowledge || knowledgeContent.length > 2000}
                    >
                      {savingKnowledge ? "Čuvam..." : "Sačuvaj"}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Create Meal Modal */}
      <CreateEditMealModal
        isOpen={showMealModal}
        onClose={() => setShowMealModal(false)}
        onSave={handleCreateMeal}
        existingMeal={null}
        t={t}
        hideShareOption
      />
    </div>
  );
}
