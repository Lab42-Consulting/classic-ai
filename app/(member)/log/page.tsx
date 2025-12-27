"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, GlassCard, Input, Modal, SlideUp, FadeIn } from "@/components/ui";
import { getTranslations } from "@/lib/i18n";
import { estimateMealMacros, Goal, MealSize as MealSizeType } from "@/lib/calculations";

type LogType = "meal" | "training" | "water" | null;
type MealSize = "small" | "medium" | "large";

const t = getTranslations("sr");

export default function LogPage() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<LogType>(null);
  const [mealSize, setMealSize] = useState<MealSize | null>(null);
  const [mealName, setMealName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [userGoal, setUserGoal] = useState<Goal>("fat_loss");

  useEffect(() => {
    fetchUserGoal();
  }, []);

  const fetchUserGoal = async () => {
    try {
      const response = await fetch("/api/member/profile");
      if (response.ok) {
        const data = await response.json();
        setUserGoal(data.goal || "fat_loss");
      }
    } catch {
      // Use default goal
    }
  };

  const getMacrosForSize = (size: MealSize) => {
    return estimateMealMacros(size as MealSizeType, userGoal);
  };

  const handleLog = async () => {
    if (!selectedType) return;
    if (selectedType === "meal" && !mealSize) return;

    setLoading(true);

    try {
      const response = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedType,
          mealSize: selectedType === "meal" ? mealSize : undefined,
          mealName: selectedType === "meal" && mealName ? mealName : undefined,
        }),
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/home");
          router.refresh();
        }, 1000);
      }
    } catch {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLog = async (type: "training" | "water") => {
    setLoading(true);

    try {
      const response = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/home");
          router.refresh();
        }, 800);
      }
    } catch {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <FadeIn>
          <div className="text-center animate-scale-in">
            <div className="w-20 h-20 bg-success rounded-full flex items-center justify-center mx-auto mb-4 glow-success">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-2xl text-display text-foreground">{t.log.logged}</p>
          </div>
        </FadeIn>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-6 pt-14 pb-6 flex items-center justify-between">
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
          <h1 className="text-xl text-headline text-foreground">{t.log.title}</h1>
        </FadeIn>
        <div className="w-10" />
      </header>

      {/* Main Content */}
      <main className="px-6 space-y-4">
        {/* Quick Actions */}
        <SlideUp delay={100}>
          <div className="grid grid-cols-2 gap-4">
            <GlassCard
              hover
              className="cursor-pointer btn-press"
              onClick={() => handleQuickLog("training")}
            >
              <div className="flex flex-col items-center py-6">
                <div className="text-4xl mb-3">💪</div>
                <span className="text-foreground font-semibold">{t.log.iTrained}</span>
                <span className="text-xs text-foreground-muted mt-1">{t.log.oneTapLog}</span>
              </div>
            </GlassCard>

            <GlassCard
              hover
              className="cursor-pointer btn-press"
              onClick={() => handleQuickLog("water")}
            >
              <div className="flex flex-col items-center py-6">
                <div className="text-4xl mb-3">💧</div>
                <span className="text-foreground font-semibold">{t.log.drankWater}</span>
                <span className="text-xs text-foreground-muted mt-1">{t.log.plusOneGlass}</span>
              </div>
            </GlassCard>
          </div>
        </SlideUp>

        {/* Meal Logging */}
        <SlideUp delay={200}>
          <GlassCard
            hover
            className="cursor-pointer btn-press"
            onClick={() => setSelectedType("meal")}
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">🍽️</div>
              <div className="flex-1">
                <h3 className="text-foreground font-semibold text-lg">{t.log.iAte}</h3>
                <p className="text-sm text-foreground-muted">{t.log.logMealWithSize}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                <svg className="w-5 h-5 text-foreground-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </GlassCard>
        </SlideUp>

        {/* Info */}
        <SlideUp delay={300}>
          <div className="text-center py-6">
            <p className="text-sm text-foreground-muted">
              {t.log.tapToLog}<br />
              {t.log.noCaloryCounting}
            </p>
          </div>
        </SlideUp>
      </main>

      {/* Meal Size Modal */}
      <Modal
        isOpen={selectedType === "meal"}
        onClose={() => {
          setSelectedType(null);
          setMealSize(null);
          setMealName("");
        }}
        title={t.log.logMeal}
        variant="bottom-sheet"
      >
        <div className="space-y-6">
          <div>
            <p className="text-label mb-4">{t.log.howBigMeal}</p>
            <div className="grid grid-cols-3 gap-3">
              {([
                { size: "small" as const, emoji: "🥗" },
                { size: "medium" as const, emoji: "🍛" },
                { size: "large" as const, emoji: "🍱" },
              ]).map(({ size, emoji }) => {
                const macros = getMacrosForSize(size);
                return (
                  <button
                    key={size}
                    onClick={() => setMealSize(size)}
                    className={`
                      py-5 px-2 rounded-2xl border-2 transition-all btn-press
                      ${
                        mealSize === size
                          ? "border-accent bg-accent/10 glow-accent"
                          : "border-white/10 glass hover:border-white/20"
                      }
                    `}
                  >
                    <span className="block text-3xl mb-2">{emoji}</span>
                    <span className="text-sm font-semibold text-foreground capitalize">
                      {size === "small" ? t.log.small : size === "medium" ? t.log.medium : t.log.large}
                    </span>
                    <span className="block text-xs text-foreground-muted mt-1">
                      ~{macros.calories} {t.common.cal}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Macro Breakdown Preview */}
          {mealSize && (
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-xs text-foreground-muted mb-3">Procena za ovaj obrok:</p>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-foreground">{getMacrosForSize(mealSize).calories}</p>
                  <p className="text-xs text-foreground-muted">kcal</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-success">{getMacrosForSize(mealSize).protein}g</p>
                  <p className="text-xs text-foreground-muted">proteini</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-warning">{getMacrosForSize(mealSize).carbs}g</p>
                  <p className="text-xs text-foreground-muted">ugljeni</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-accent">{getMacrosForSize(mealSize).fats}g</p>
                  <p className="text-xs text-foreground-muted">masti</p>
                </div>
              </div>
              <p className="text-xs text-foreground-muted mt-3 text-center">
                Bazirano na veličini obroka i tvom cilju
              </p>
            </div>
          )}

          <Input
            label={t.log.whatDidYouEat}
            placeholder={t.log.mealPlaceholder}
            value={mealName}
            onChange={(e) => setMealName(e.target.value)}
          />

          <Button
            className="w-full btn-press glow-accent"
            size="lg"
            onClick={handleLog}
            disabled={!mealSize || loading}
            loading={loading}
          >
            {t.log.logMeal}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
