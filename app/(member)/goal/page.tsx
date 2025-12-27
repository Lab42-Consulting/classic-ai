"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GlassCard, FadeIn, SlideUp, Button } from "@/components/ui";
import { getTranslations } from "@/lib/i18n";

const t = getTranslations("sr");

type Goal = "fat_loss" | "muscle_gain" | "recomposition";

interface GoalOption {
  id: Goal;
  icon: string;
  title: string;
  description: string;
  macros: {
    protein: string;
    carbs: string;
    fats: string;
  };
  calorieRange: string;
}

const goalOptions: GoalOption[] = [
  {
    id: "fat_loss",
    icon: "🔥",
    title: "Gubitak masnoće",
    description: "Smanji telesnu masnoću uz očuvanje mišićne mase. Umeren kalorijski deficit sa visokim unosom proteina.",
    macros: {
      protein: "40%",
      carbs: "30%",
      fats: "30%",
    },
    calorieRange: "Kalorijski deficit",
  },
  {
    id: "recomposition",
    icon: "⚖️",
    title: "Rekompozicija",
    description: "Istovremeno gradi mišiće i gubi masnoću. Idealno za početnike ili one koji se vraćaju treningu.",
    macros: {
      protein: "35%",
      carbs: "40%",
      fats: "25%",
    },
    calorieRange: "Održavanje kalorija",
  },
  {
    id: "muscle_gain",
    icon: "💪",
    title: "Rast mišića",
    description: "Maksimalni rast mišićne mase sa umerenim viškom kalorija. Fokus na progresivnom opterećenju.",
    macros: {
      protein: "30%",
      carbs: "45%",
      fats: "25%",
    },
    calorieRange: "Kalorijski višak",
  },
];

export default function GoalPage() {
  const router = useRouter();
  const [currentGoal, setCurrentGoal] = useState<Goal>("fat_loss");
  const [selectedGoal, setSelectedGoal] = useState<Goal>("fat_loss");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCurrentGoal();
  }, []);

  const fetchCurrentGoal = async () => {
    try {
      const response = await fetch("/api/member/profile");
      if (response.ok) {
        const data = await response.json();
        setCurrentGoal(data.goal || "fat_loss");
        setSelectedGoal(data.goal || "fat_loss");
      }
    } catch {
      // Use default
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (selectedGoal === currentGoal) {
      router.back();
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/member/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: selectedGoal }),
      });

      if (response.ok) {
        router.back();
      }
    } catch {
      // Handle error
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = selectedGoal !== currentGoal;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-foreground-muted">Učitava se...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="px-6 pt-14 pb-4 flex items-center gap-4 border-b border-white/5">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full glass flex items-center justify-center btn-press"
          aria-label="Go back"
        >
          <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <FadeIn>
          <div>
            <h1 className="text-xl text-headline text-foreground">Tvoj cilj</h1>
            <p className="text-sm text-foreground-muted">Izaberi šta želiš da postigneš</p>
          </div>
        </FadeIn>
      </header>

      <main className="px-6 py-6 space-y-4">
        {/* Info Card */}
        <SlideUp delay={100}>
          <GlassCard className="bg-accent/5 border-accent/20">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <p className="text-sm text-foreground leading-relaxed">
                  Tvoj cilj određuje koliko kalorija trebaš dnevno i kako se raspoređuju makronutrijenti.
                  Možeš promeniti cilj u bilo kom trenutku.
                </p>
              </div>
            </div>
          </GlassCard>
        </SlideUp>

        {/* Goal Options */}
        {goalOptions.map((goal, index) => (
          <SlideUp key={goal.id} delay={150 + index * 50}>
            <button
              onClick={() => setSelectedGoal(goal.id)}
              className={`w-full text-left transition-all ${
                selectedGoal === goal.id ? "scale-[1.02]" : ""
              }`}
            >
              <GlassCard
                className={`relative overflow-hidden ${
                  selectedGoal === goal.id
                    ? "ring-2 ring-accent glow-accent"
                    : "opacity-70"
                }`}
              >
                {/* Current badge */}
                {currentGoal === goal.id && (
                  <div className="absolute bottom-3 right-3 px-2 py-1 rounded-full bg-success/20 text-success text-xs font-medium">
                    Trenutni
                  </div>
                )}

                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                    selectedGoal === goal.id ? "bg-accent/20" : "bg-white/5"
                  }`}>
                    <span className="text-3xl">{goal.icon}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-lg font-semibold mb-1 ${
                      selectedGoal === goal.id ? "text-foreground" : "text-foreground-muted"
                    }`}>
                      {goal.title}
                    </h3>
                    <p className="text-sm text-foreground-muted mb-3 leading-relaxed">
                      {goal.description}
                    </p>

                    {/* Macros */}
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-success" />
                        <span className="text-foreground-muted">P: {goal.macros.protein}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-warning" />
                        <span className="text-foreground-muted">U: {goal.macros.carbs}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-accent" />
                        <span className="text-foreground-muted">M: {goal.macros.fats}</span>
                      </div>
                    </div>

                    {/* Calorie range */}
                    <div className="mt-2 text-xs text-foreground-muted">
                      <span className="text-foreground font-medium">{goal.calorieRange}</span>
                    </div>
                  </div>

                  {/* Selection indicator */}
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    selectedGoal === goal.id
                      ? "border-accent bg-accent"
                      : "border-white/20"
                  }`}>
                    {selectedGoal === goal.id && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              </GlassCard>
            </button>
          </SlideUp>
        ))}

        {/* Change warning */}
        {hasChanges && (
          <SlideUp delay={400}>
            <div className="p-4 rounded-xl bg-warning/10 border border-warning/20">
              <div className="flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <p className="text-sm text-warning">
                  Promena cilja će ažurirati tvoje dnevne ciljeve kalorija i makronutrijenata.
                  Tvoja istorija i napredak ostaju sačuvani.
                </p>
              </div>
            </div>
          </SlideUp>
        )}
      </main>

      {/* Save Button - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background/95 to-transparent">
        <FadeIn delay={500}>
          <Button
            className="w-full btn-press glow-accent"
            size="lg"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Čuva se..." : hasChanges ? "Sačuvaj promene" : "Nazad"}
          </Button>
        </FadeIn>
      </div>
    </div>
  );
}
