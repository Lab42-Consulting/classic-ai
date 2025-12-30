"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button, GlassCard, Input, Modal, SlideUp, FadeIn } from "@/components/ui";
import { getTranslations } from "@/lib/i18n";
import { estimateMealMacros, Goal, MealSize as MealSizeType } from "@/lib/calculations";

type LogType = "meal" | "training" | "water" | null;
type MealSize = "small" | "medium" | "large" | "custom" | "saved";

interface SavedMeal {
  id: string;
  name: string;
  totalCalories: number;
  totalProtein?: number | null;
  totalCarbs?: number | null;
  totalFats?: number | null;
  ingredients: { name: string }[];
}

const t = getTranslations("sr");

export default function LogPage() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<LogType>(null);
  const [mealSize, setMealSize] = useState<MealSize | null>(null);
  const [mealName, setMealName] = useState("");
  const [customCalories, setCustomCalories] = useState("");
  const [customProtein, setCustomProtein] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [userGoal, setUserGoal] = useState<Goal>("fat_loss");
  const [requireExactMacros, setRequireExactMacros] = useState(false);
  const [customCarbs, setCustomCarbs] = useState("");
  const [customFats, setCustomFats] = useState("");
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [selectedSavedMeal, setSelectedSavedMeal] = useState<SavedMeal | null>(null);
  const [loadingMeals, setLoadingMeals] = useState(false);

  const fetchSavedMeals = useCallback(async () => {
    setLoadingMeals(true);
    try {
      const response = await fetch("/api/member/meals");
      if (response.ok) {
        const data = await response.json();
        // Combine own and shared meals
        const allMeals = [...(data.own || []), ...(data.shared || [])];
        setSavedMeals(allMeals);
      }
    } catch {
      // Silently fail
    } finally {
      setLoadingMeals(false);
    }
  }, []);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch("/api/member/profile");
      if (response.ok) {
        const data = await response.json();
        setUserGoal(data.goal || "fat_loss");
        setRequireExactMacros(data.requireExactMacros || false);
      }
    } catch {
      // Use default values
    }
  };

  // Auto-calculate calories from macros
  const calculateCaloriesFromMacros = () => {
    const p = parseInt(customProtein) || 0;
    const c = parseInt(customCarbs) || 0;
    const f = parseInt(customFats) || 0;
    return p * 4 + c * 4 + f * 9;
  };

  const getMacrosForSize = (size: MealSize) => {
    return estimateMealMacros(size as MealSizeType, userGoal);
  };

  const handleLog = async () => {
    if (!selectedType) return;

    // Validation for exact macros mode
    if (selectedType === "meal" && requireExactMacros) {
      if (!customProtein || !customCarbs || !customFats) return;
    } else if (selectedType === "meal" && mealSize === "saved") {
      if (!selectedSavedMeal) return;
    } else if (selectedType === "meal" && !mealSize) {
      return;
    } else if (selectedType === "meal" && mealSize === "custom" && !customCalories) {
      return;
    }

    setLoading(true);

    try {
      const payload: {
        type: string;
        mealSize?: string;
        mealName?: string;
        customCalories?: number;
        customProtein?: number;
        customCarbs?: number;
        customFats?: number;
      } = {
        type: selectedType,
        mealName: selectedType === "meal" && mealName ? mealName : undefined,
      };

      if (selectedType === "meal") {
        if (requireExactMacros) {
          // Exact macros mode: calculate calories from P/C/F
          payload.customProtein = parseInt(customProtein, 10);
          payload.customCarbs = parseInt(customCarbs, 10);
          payload.customFats = parseInt(customFats, 10);
          payload.customCalories = calculateCaloriesFromMacros();
          payload.mealSize = "exact";
        } else if (mealSize === "saved" && selectedSavedMeal) {
          // Saved meal mode: use saved meal values
          payload.mealSize = "saved";
          payload.mealName = selectedSavedMeal.name;
          payload.customCalories = selectedSavedMeal.totalCalories;
          payload.customProtein = selectedSavedMeal.totalProtein || undefined;
          payload.customCarbs = selectedSavedMeal.totalCarbs || undefined;
          payload.customFats = selectedSavedMeal.totalFats || undefined;
        } else if (mealSize === "custom") {
          // Custom mode: use entered values
          payload.mealSize = mealSize;
          payload.customCalories = parseInt(customCalories, 10);
          if (customProtein) {
            payload.customProtein = parseInt(customProtein, 10);
          }
        } else {
          // Standard size mode
          payload.mealSize = mealSize || undefined;
        }
      }

      const response = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
          setCustomCalories("");
          setCustomProtein("");
          setCustomCarbs("");
          setCustomFats("");
          setSelectedSavedMeal(null);
        }}
        title={t.log.logMeal}
        variant="bottom-sheet"
      >
        <div className="space-y-6">
          {requireExactMacros ? (
            /* Exact Macros Mode - Coach requires P/C/F input */
            <>
              <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
                <p className="text-sm text-foreground-muted">
                  Tvoj trener zahteva unos tačnih makrosa za svaki obrok.
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    label="Proteini (g) *"
                    type="number"
                    placeholder="30"
                    value={customProtein}
                    onChange={(e) => setCustomProtein(e.target.value)}
                  />
                  <Input
                    label="UH (g) *"
                    type="number"
                    placeholder="50"
                    value={customCarbs}
                    onChange={(e) => setCustomCarbs(e.target.value)}
                  />
                  <Input
                    label="Masti (g) *"
                    type="number"
                    placeholder="15"
                    value={customFats}
                    onChange={(e) => setCustomFats(e.target.value)}
                  />
                </div>

                {/* Auto-calculated calories preview */}
                {(customProtein || customCarbs || customFats) && (
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                    <p className="text-xs text-foreground-muted mb-2">Izračunate kalorije:</p>
                    <p className="text-2xl font-bold text-foreground">
                      {calculateCaloriesFromMacros()} <span className="text-sm font-normal text-foreground-muted">kcal</span>
                    </p>
                    <p className="text-xs text-foreground-muted mt-2">
                      = {customProtein || 0}g P × 4 + {customCarbs || 0}g UH × 4 + {customFats || 0}g M × 9
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Standard Mode - Meal size selection */
            <>
              <div>
                <p className="text-label mb-4">{t.log.howBigMeal}</p>
                <div className="grid grid-cols-5 gap-2">
                  {([
                    { size: "small" as const, emoji: "🥗", label: t.log.small },
                    { size: "medium" as const, emoji: "🍛", label: t.log.medium },
                    { size: "large" as const, emoji: "🍱", label: t.log.large },
                    { size: "custom" as const, emoji: "✏️", label: "Tačno" },
                    { size: "saved" as const, emoji: "⭐", label: "Sačuvano" },
                  ]).map(({ size, emoji, label }) => {
                    const isCustom = size === "custom";
                    const isSaved = size === "saved";
                    const macros = isCustom || isSaved ? null : getMacrosForSize(size as Exclude<MealSize, "custom" | "saved">);
                    return (
                      <button
                        key={size}
                        onClick={() => {
                          setMealSize(size);
                          if (size === "saved") {
                            fetchSavedMeals();
                          }
                        }}
                        className={`
                          py-4 px-1 rounded-2xl border-2 transition-all btn-press
                          ${
                            mealSize === size
                              ? "border-accent bg-accent/10 glow-accent"
                              : "border-white/10 glass hover:border-white/20"
                          }
                        `}
                      >
                        <span className="block text-2xl mb-1">{emoji}</span>
                        <span className="text-xs font-semibold text-foreground">
                          {label}
                        </span>
                        {macros && (
                          <span className="block text-xs text-foreground-muted mt-1">
                            ~{macros.calories}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Calorie Input */}
              {mealSize === "custom" && (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                  <p className="text-xs text-foreground-muted">Unesi tačne vrednosti:</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Kalorije *"
                      type="number"
                      placeholder="npr. 450"
                      value={customCalories}
                      onChange={(e) => setCustomCalories(e.target.value)}
                    />
                    <Input
                      label="Proteini (g)"
                      type="number"
                      placeholder="npr. 30"
                      value={customProtein}
                      onChange={(e) => setCustomProtein(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Saved Meals Picker */}
              {mealSize === "saved" && (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-foreground-muted">Izaberi sačuvani obrok:</p>
                    <button
                      onClick={() => router.push("/meals")}
                      className="text-xs text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Novi obrok
                    </button>
                  </div>
                  {loadingMeals ? (
                    <div className="flex justify-center py-4">
                      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : savedMeals.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-foreground-muted text-sm mb-3">{t.meals.noMeals}</p>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => router.push("/meals")}
                      >
                        Kreiraj obrok
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {savedMeals.map((meal) => (
                        <button
                          key={meal.id}
                          onClick={() => setSelectedSavedMeal(meal)}
                          className={`
                            w-full p-3 rounded-xl text-left transition-all
                            ${
                              selectedSavedMeal?.id === meal.id
                                ? "bg-accent/20 border-2 border-accent"
                                : "bg-white/5 border-2 border-transparent hover:bg-white/10"
                            }
                          `}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-foreground">{meal.name}</p>
                              <p className="text-sm text-foreground-muted">
                                {meal.totalCalories} kcal
                                {meal.ingredients.length > 0 && ` • ${meal.ingredients.length} sastojaka`}
                              </p>
                            </div>
                            {selectedSavedMeal?.id === meal.id && (
                              <svg
                                className="w-5 h-5 text-accent"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Selected Saved Meal Preview */}
              {mealSize === "saved" && selectedSavedMeal && (
                <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
                  <p className="text-xs text-foreground-muted mb-3">Izabran obrok:</p>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold text-foreground">{selectedSavedMeal.totalCalories}</p>
                      <p className="text-xs text-foreground-muted">kcal</p>
                    </div>
                    {selectedSavedMeal.totalProtein && (
                      <div>
                        <p className="text-lg font-bold text-success">{selectedSavedMeal.totalProtein}g</p>
                        <p className="text-xs text-foreground-muted">proteini</p>
                      </div>
                    )}
                    {selectedSavedMeal.totalCarbs && (
                      <div>
                        <p className="text-lg font-bold text-warning">{selectedSavedMeal.totalCarbs}g</p>
                        <p className="text-xs text-foreground-muted">ugljeni</p>
                      </div>
                    )}
                    {selectedSavedMeal.totalFats && (
                      <div>
                        <p className="text-lg font-bold text-accent">{selectedSavedMeal.totalFats}g</p>
                        <p className="text-xs text-foreground-muted">masti</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Macro Breakdown Preview - only for preset sizes */}
              {mealSize && mealSize !== "custom" && mealSize !== "saved" && (
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
            </>
          )}

          {/* Hide meal name input for saved meals since name comes from saved meal */}
          {mealSize !== "saved" && (
            <Input
              label={t.log.whatDidYouEat}
              placeholder={t.log.mealPlaceholder}
              value={mealName}
              onChange={(e) => setMealName(e.target.value)}
            />
          )}

          <Button
            className="w-full btn-press glow-accent"
            size="lg"
            onClick={handleLog}
            disabled={
              requireExactMacros
                ? !customProtein || !customCarbs || !customFats || loading
                : !mealSize ||
                  (mealSize === "custom" && !customCalories) ||
                  (mealSize === "saved" && !selectedSavedMeal) ||
                  loading
            }
            loading={loading}
          >
            {t.log.logMeal}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
