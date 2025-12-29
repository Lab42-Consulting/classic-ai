"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, GlassCard, FadeIn, SlideUp } from "@/components/ui";

interface NudgeTemplate {
  id: string;
  label: string;
  message: string;
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
  const [templates, setTemplates] = useState<NudgeTemplate[]>([]);
  const [showNudgeModal, setShowNudgeModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [nudgeMessage, setNudgeMessage] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [memberRes, templatesRes] = await Promise.all([
          fetch(`/api/coach/member/${id}`),
          fetch("/api/coach/nudge?templates=true"),
        ]);

        if (memberRes.ok) {
          const result = await memberRes.json();
          setData(result);
        }

        if (templatesRes.ok) {
          const templatesData = await templatesRes.json();
          setTemplates(templatesData.templates || []);
        }
      } catch {
        // Handle error silently
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
          <p className="text-foreground-muted">Član nije pronađen</p>
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
    </div>
  );
}
