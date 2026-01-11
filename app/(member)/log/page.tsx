"use client";

import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, GlassCard, Input, Modal, SlideUp, FadeIn, useToast } from "@/components/ui";
import { getTranslations } from "@/lib/i18n";
import { estimateMealMacros, Goal, MealSize as MealSizeType } from "@/lib/calculations";

type LogType = "meal" | "training" | "water" | "photo" | null;
type MealSize = "small" | "medium" | "large" | "custom" | "saved";

// Photo analysis estimation from AI
interface PhotoEstimation {
  description: string;
  items: string[];
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  confidence: "high" | "medium" | "low";
}

interface SavedMeal {
  id: string;
  name: string;
  totalCalories: number;
  totalProtein?: number | null;
  totalCarbs?: number | null;
  totalFats?: number | null;
  photoUrl?: string | null;
  ingredients: { name: string }[];
  isCoachMeal?: boolean;
  coachName?: string;
}

const t = getTranslations("sr");

function LogPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const preselectedMealId = searchParams.get("mealId");

  const [selectedType, setSelectedType] = useState<LogType>(preselectedMealId ? "meal" : null);
  const [mealSize, setMealSize] = useState<MealSize | null>(preselectedMealId ? "saved" : null);
  const [mealName, setMealName] = useState("");
  const [customCalories, setCustomCalories] = useState("");
  const [customProtein, setCustomProtein] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [userGoal, setUserGoal] = useState<Goal>("fat_loss");
  const [requireExactMacros, setRequireExactMacros] = useState(false);
  const [difficultyMode, setDifficultyMode] = useState<"simple" | "standard" | "pro">("standard");
  const [customCarbs, setCustomCarbs] = useState("");
  const [customFats, setCustomFats] = useState("");
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [selectedSavedMeal, setSelectedSavedMeal] = useState<SavedMeal | null>(null);
  const [loadingMeals, setLoadingMeals] = useState(false);

  // Photo logging state
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoMealName, setPhotoMealName] = useState("");
  const [photoMealSize, setPhotoMealSize] = useState<MealSize | null>(null);
  const [photoEstimation, setPhotoEstimation] = useState<PhotoEstimation | null>(null);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [photoAiUsage, setPhotoAiUsage] = useState<{ remaining: number; limit: number } | null>(null);
  const [useAiEstimation, setUseAiEstimation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSavedMeals = useCallback(async () => {
    setLoadingMeals(true);
    try {
      const response = await fetch("/api/member/meals");
      if (response.ok) {
        const data = await response.json();
        // Mark coach meals and combine all meals (coach first, then own, then shared)
        const coachMeals = (data.coach || []).map((m: SavedMeal) => ({
          ...m,
          isCoachMeal: true,
        }));
        const ownMeals = data.own || [];
        const sharedMeals = data.shared || [];
        const allMeals = [...coachMeals, ...ownMeals, ...sharedMeals];
        setSavedMeals(allMeals);

        // If there's a preselected meal ID, find and select it
        if (preselectedMealId) {
          const preselectedMeal = allMeals.find((m: SavedMeal) => m.id === preselectedMealId);
          if (preselectedMeal) {
            setSelectedSavedMeal(preselectedMeal);
          }
        }
      }
    } catch {
      // Silently fail
    } finally {
      setLoadingMeals(false);
    }
  }, [preselectedMealId]);

  useEffect(() => {
    fetchUserProfile();
    // If there's a preselected meal, fetch meals immediately
    if (preselectedMealId) {
      fetchSavedMeals();
    }
  }, [preselectedMealId, fetchSavedMeals]);

  // Fetch meals when meal modal opens (for exact macros mode to show coach meals)
  useEffect(() => {
    if (selectedType === "meal" && savedMeals.length === 0) {
      fetchSavedMeals();
    }
  }, [selectedType, savedMeals.length, fetchSavedMeals]);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch("/api/member/profile");
      if (response.ok) {
        const data = await response.json();
        setUserGoal(data.goal || "fat_loss");
        setRequireExactMacros(data.requireExactMacros || false);
        setDifficultyMode(data.difficultyMode || "standard");
      }
    } catch {
      // Use default values
    }
  };

  // Fetch photo AI usage limits
  const fetchPhotoAiUsage = async () => {
    try {
      const response = await fetch("/api/ai/analyze-meal-photo");
      if (response.ok) {
        const data = await response.json();
        setPhotoAiUsage({ remaining: data.remaining, limit: data.limit });
      }
    } catch {
      // Silently fail
    }
  };

  // Handle photo capture/selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      showToast("Molimo izaberite sliku", "error");
      return;
    }

    // Validate file size (max 1MB)
    if (file.size > 1024 * 1024) {
      showToast("Slika je prevelika. Maksimum 1MB.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setPhotoBase64(base64);
      setSelectedType("photo");
      fetchPhotoAiUsage();
      fetchSavedMeals(); // For meal name autocomplete
    };
    reader.readAsDataURL(file);
  };

  // Request AI analysis of photo
  const handleAiAnalysis = async () => {
    if (!photoBase64 || !photoMealSize) return;

    setAnalyzingPhoto(true);
    try {
      const response = await fetch("/api/ai/analyze-meal-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photo: photoBase64,
          sizeHint: photoMealSize,
          goal: userGoal,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPhotoEstimation(data.estimation);
        setPhotoAiUsage({ remaining: data.remaining, limit: data.limit });
        setUseAiEstimation(true);
        showToast("AI analiza završena!", "success");
      } else if (response.status === 429) {
        const data = await response.json();
        showToast(data.message || "Dnevni limit AI analize dostignut", "error");
      } else {
        showToast("Greška pri analizi. Koristi procenu.", "error");
      }
    } catch {
      showToast("Greška pri komunikaciji sa serverom", "error");
    } finally {
      setAnalyzingPhoto(false);
    }
  };

  // Log meal from photo
  const handlePhotoLog = async () => {
    if (!photoBase64 || !photoMealSize) return;

    setLoading(true);
    try {
      // Determine macros: AI estimation or local calculation
      let macros;
      if (useAiEstimation && photoEstimation) {
        macros = {
          calories: photoEstimation.calories,
          protein: photoEstimation.protein,
          carbs: photoEstimation.carbs,
          fats: photoEstimation.fats,
        };
      } else {
        // Use local estimation based on size
        macros = estimateMealMacros(photoMealSize as MealSizeType, userGoal);
      }

      // Check if meal name matches a saved meal (Tier 1: FREE)
      const matchedMeal = savedMeals.find(
        m => m.name.toLowerCase() === photoMealName.toLowerCase().trim()
      );
      if (matchedMeal) {
        macros = {
          calories: matchedMeal.totalCalories,
          protein: matchedMeal.totalProtein || macros.protein,
          carbs: matchedMeal.totalCarbs || macros.carbs,
          fats: matchedMeal.totalFats || macros.fats,
        };
      }

      const response = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "meal",
          mealSize: photoMealSize,
          mealName: photoMealName || photoEstimation?.description || undefined,
          mealPhotoUrl: photoBase64, // Will be stored
          customCalories: macros.calories,
          customProtein: macros.protein,
          customCarbs: macros.carbs,
          customFats: macros.fats,
        }),
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/home");
          router.refresh();
        }, 1000);
      } else {
        const data = await response.json();
        showToast(data.error || "Greška pri čuvanju obroka", "error");
      }
    } catch {
      showToast("Greška pri komunikaciji sa serverom", "error");
    } finally {
      setLoading(false);
    }
  };

  // Reset photo state
  const resetPhotoState = () => {
    setPhotoBase64(null);
    setPhotoMealName("");
    setPhotoMealSize(null);
    setPhotoEstimation(null);
    setUseAiEstimation(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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

    // Validation for exact macros mode (coach-enforced OR Pro difficulty mode)
    if (selectedType === "meal" && effectiveRequireExactMacros) {
      // In exact macros mode: need either a selected coach meal OR manual P/C/F
      if (!selectedSavedMeal && (!customProtein || !customCarbs || !customFats)) return;
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
        mealPhotoUrl?: string;
        customCalories?: number;
        customProtein?: number;
        customCarbs?: number;
        customFats?: number;
      } = {
        type: selectedType,
        mealName: selectedType === "meal" && mealName ? mealName : undefined,
      };

      if (selectedType === "meal") {
        if (effectiveRequireExactMacros && selectedSavedMeal) {
          // Exact macros mode with coach/saved meal selected
          payload.mealSize = "saved";
          payload.mealName = selectedSavedMeal.name;
          payload.mealPhotoUrl = selectedSavedMeal.photoUrl || undefined;
          payload.customCalories = selectedSavedMeal.totalCalories;
          payload.customProtein = selectedSavedMeal.totalProtein || undefined;
          payload.customCarbs = selectedSavedMeal.totalCarbs || undefined;
          payload.customFats = selectedSavedMeal.totalFats || undefined;
        } else if (effectiveRequireExactMacros) {
          // Exact macros mode (Pro or coach-enforced): calculate calories from P/C/F
          payload.customProtein = parseInt(customProtein, 10);
          payload.customCarbs = parseInt(customCarbs, 10);
          payload.customFats = parseInt(customFats, 10);
          payload.customCalories = calculateCaloriesFromMacros();
          payload.mealSize = "exact";
        } else if (mealSize === "saved" && selectedSavedMeal) {
          // Saved meal mode: use saved meal values
          payload.mealSize = "saved";
          payload.mealName = selectedSavedMeal.name;
          payload.mealPhotoUrl = selectedSavedMeal.photoUrl || undefined;
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
      } else {
        const data = await response.json();
        showToast(data.error || "Greška pri čuvanju obroka", "error");
      }
    } catch {
      showToast("Greška pri komunikaciji sa serverom", "error");
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
      } else {
        const data = await response.json();
        showToast(data.error || "Greška pri čuvanju aktivnosti", "error");
      }
    } catch {
      showToast("Greška pri komunikaciji sa serverom", "error");
    } finally {
      setLoading(false);
    }
  };

  // Simple mode: Quick meal log without macros (just logs that user ate)
  const handleSimpleMealLog = async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "meal",
          mealSize: "medium",
          mealName: "Obrok",
          // No macros - Simple mode doesn't track them
        }),
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/home");
          router.refresh();
        }, 800);
      } else {
        const data = await response.json();
        showToast(data.error || "Greška pri čuvanju obroka", "error");
      }
    } catch {
      showToast("Greška pri komunikaciji sa serverom", "error");
    } finally {
      setLoading(false);
    }
  };

  // Helper for difficulty modes
  const isSimpleMode = difficultyMode === "simple";
  const isProMode = difficultyMode === "pro";

  // Pro mode also requires exact macros (same as coach-enforced requireExactMacros)
  const effectiveRequireExactMacros = requireExactMacros || isProMode;

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
        {/* Simple Mode: 2x2 grid without photo option */}
        {isSimpleMode ? (
          <SlideUp delay={100}>
            <div className="grid grid-cols-2 gap-4">
              <GlassCard
                hover
                className="cursor-pointer btn-press"
                onClick={() => handleQuickLog("training")}
              >
                <div className="flex flex-col items-center text-center py-6">
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
                <div className="flex flex-col items-center text-center py-6">
                  <div className="text-4xl mb-3">💧</div>
                  <span className="text-foreground font-semibold">{t.log.drankWater}</span>
                  <span className="text-xs text-foreground-muted mt-1">{t.log.plusOneGlass}</span>
                </div>
              </GlassCard>

              <GlassCard
                hover
                className="cursor-pointer btn-press col-span-2"
                onClick={handleSimpleMealLog}
              >
                <div className="flex flex-col items-center text-center py-6">
                  <div className="text-4xl mb-3">🍽️</div>
                  <span className="text-foreground font-semibold">Jeo/la sam</span>
                  <span className="text-xs text-foreground-muted mt-1">Brzi unos obroka</span>
                </div>
              </GlassCard>
            </div>
          </SlideUp>
        ) : isProMode ? (
          /* Pro Mode: 2x2 grid with exact macro entry */
          <SlideUp delay={100}>
            <div className="grid grid-cols-2 gap-4">
              <GlassCard
                hover
                className="cursor-pointer btn-press"
                onClick={() => handleQuickLog("training")}
              >
                <div className="flex flex-col items-center text-center py-6">
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
                <div className="flex flex-col items-center text-center py-6">
                  <div className="text-4xl mb-3">💧</div>
                  <span className="text-foreground font-semibold">{t.log.drankWater}</span>
                  <span className="text-xs text-foreground-muted mt-1">{t.log.plusOneGlass}</span>
                </div>
              </GlassCard>

              {/* Pro Mode Meal Entry - Full width with accent */}
              <div
                className="col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/20 via-purple-500/10 to-purple-500/5 border-2 border-purple-500/30 cursor-pointer btn-press"
                onClick={() => setSelectedType("meal")}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/5 to-transparent animate-pulse" />
                <div className="relative flex flex-col items-center text-center py-6 px-4">
                  <div className="text-4xl mb-3">📊</div>
                  <span className="text-lg font-semibold text-foreground">Unesi obrok</span>
                  <span className="text-sm text-foreground-muted mt-1">Tačan unos P/U/M</span>
                  <span className="text-xs text-purple-400 mt-2 bg-purple-500/10 px-2 py-0.5 rounded-full">Pro režim</span>
                </div>
              </div>
            </div>
          </SlideUp>
        ) : (
          /* Standard Mode: Option A - 2x2 grid grouped by type */
          <SlideUp delay={100}>
            <div className="space-y-4">
              {/* Row 1: Quick one-tap logs */}
              <div className="grid grid-cols-2 gap-4">
                <GlassCard
                  hover
                  className="cursor-pointer btn-press"
                  onClick={() => handleQuickLog("training")}
                >
                  <div className="flex flex-col items-center text-center py-6">
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
                  <div className="flex flex-col items-center text-center py-6">
                    <div className="text-4xl mb-3">💧</div>
                    <span className="text-foreground font-semibold">{t.log.drankWater}</span>
                    <span className="text-xs text-foreground-muted mt-1">{t.log.plusOneGlass}</span>
                  </div>
                </GlassCard>
              </div>

              {/* Row 2: Meal options */}
              <div className="grid grid-cols-2 gap-4">
                {/* Photo Meal Logging - Accent colored */}
                <div
                  className="rounded-3xl p-6 bg-gradient-to-br from-accent/20 via-accent/10 to-accent/5 border-2 border-accent/30 cursor-pointer btn-press transition-all duration-300 hover:scale-[1.02]"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center text-center py-6">
                    <div className="text-4xl mb-3">📸</div>
                    <span className="text-foreground font-semibold">Slikaj obrok</span>
                    <span className="text-xs text-accent mt-1">Brzi unos</span>
                  </div>
                </div>
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />

                {/* Standard Meal Logging */}
                <GlassCard
                  hover
                  className="cursor-pointer btn-press"
                  onClick={() => setSelectedType("meal")}
                >
                  <div className="flex flex-col items-center text-center py-6">
                    <div className="text-4xl mb-3">🍽️</div>
                    <span className="text-foreground font-semibold">{t.log.iAte}</span>
                    <span className="text-xs text-foreground-muted mt-1">{t.log.logMealWithSize}</span>
                  </div>
                </GlassCard>
              </div>
            </div>
          </SlideUp>
        )}

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
          {effectiveRequireExactMacros ? (
            /* Exact Macros Mode - Pro mode or Coach requires P/C/F input */
            <>
              {/* Coach meals section - show first if available */}
              {savedMeals.filter(m => m.isCoachMeal).length > 0 && (
                <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
                  <p className="text-xs font-medium text-accent mb-3 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    Obroci od trenera
                  </p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {savedMeals.filter(m => m.isCoachMeal).map((meal) => (
                      <button
                        key={meal.id}
                        onClick={() => {
                          setSelectedSavedMeal(meal);
                          // Clear manual inputs when selecting a coach meal
                          setCustomProtein("");
                          setCustomCarbs("");
                          setCustomFats("");
                        }}
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
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground truncate">{meal.name}</p>
                            <p className="text-sm text-foreground-muted">
                              {meal.totalCalories} kcal
                              {meal.totalProtein && ` • P:${meal.totalProtein}g`}
                              {meal.totalCarbs && ` • U:${meal.totalCarbs}g`}
                              {meal.totalFats && ` • M:${meal.totalFats}g`}
                            </p>
                          </div>
                          {selectedSavedMeal?.id === meal.id && (
                            <svg className="w-5 h-5 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* User's saved meals section (always show, with empty state) */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-foreground-muted flex items-center gap-1">
                    <span className="text-base">⭐</span>
                    Moji sačuvani obroci
                  </p>
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
                {savedMeals.filter(m => !m.isCoachMeal).length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {savedMeals.filter(m => !m.isCoachMeal).map((meal) => (
                      <button
                        key={meal.id}
                        onClick={() => {
                          setSelectedSavedMeal(meal);
                          // Clear manual inputs when selecting a saved meal
                          setCustomProtein("");
                          setCustomCarbs("");
                          setCustomFats("");
                        }}
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
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground truncate">{meal.name}</p>
                            <p className="text-sm text-foreground-muted">
                              {meal.totalCalories} kcal
                              {meal.totalProtein && ` • P:${meal.totalProtein}g`}
                              {meal.totalCarbs && ` • U:${meal.totalCarbs}g`}
                              {meal.totalFats && ` • M:${meal.totalFats}g`}
                            </p>
                          </div>
                          {selectedSavedMeal?.id === meal.id && (
                            <svg className="w-5 h-5 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-foreground-muted text-center py-2">
                    Nemaš sačuvane obroke. Kreiraj prvi!
                  </p>
                )}
              </div>

              {/* Loading state for meals */}
              {loadingMeals && (
                <div className="flex justify-center py-4">
                  <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {/* Manual entry section */}
              {!selectedSavedMeal && (
                <>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-sm text-foreground-muted mb-4">
                      {savedMeals.length > 0
                        ? "Ili unesi ručno:"
                        : isProMode
                          ? "Pro režim zahteva unos tačnih makrosa za svaki obrok."
                          : "Tvoj trener zahteva unos tačnih makrosa za svaki obrok."}
                    </p>
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
                      <div className="mt-4 p-3 rounded-lg bg-background text-center">
                        <p className="text-xs text-foreground-muted mb-1">Izračunate kalorije:</p>
                        <p className="text-xl font-bold text-foreground">
                          {calculateCaloriesFromMacros()} <span className="text-sm font-normal text-foreground-muted">kcal</span>
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Selected coach meal preview */}
              {selectedSavedMeal && (
                <div className="p-4 rounded-xl bg-accent/10 border border-accent/30">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-medium text-foreground">{selectedSavedMeal.name}</p>
                    <button
                      onClick={() => setSelectedSavedMeal(null)}
                      className="text-xs text-foreground-muted hover:text-foreground"
                    >
                      Promeni
                    </button>
                  </div>
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
            </>
          ) : (
            /* Standard Mode - Meal size selection */
            <>
              {/* Preset Sizes - 3 column grid */}
              <div>
                <p className="text-label mb-3">{t.log.howBigMeal}</p>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { size: "small" as const, emoji: "🥗", label: t.log.small },
                    { size: "medium" as const, emoji: "🍛", label: t.log.medium },
                    { size: "large" as const, emoji: "🍱", label: t.log.large },
                  ]).map(({ size, emoji, label }) => {
                    const macros = getMacrosForSize(size);
                    return (
                      <button
                        key={size}
                        onClick={() => setMealSize(size)}
                        className={`
                          py-5 px-2 rounded-2xl border-2 transition-all btn-press text-center
                          ${
                            mealSize === size
                              ? "border-accent bg-accent/10 glow-accent"
                              : "border-white/10 glass hover:border-white/20"
                          }
                        `}
                      >
                        <span className="block text-3xl mb-2">{emoji}</span>
                        <span className="block text-sm font-semibold text-foreground">
                          {label}
                        </span>
                        <span className="block text-xs text-foreground-muted mt-1">
                          ~{macros.calories} kcal
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Saved Meals Option */}
              <div>
                <p className="text-label mb-3">Ili izaberi sačuvan obrok:</p>
                <button
                  onClick={() => {
                    setMealSize("saved");
                    fetchSavedMeals();
                  }}
                  className={`
                    w-full py-4 px-3 rounded-2xl border-2 transition-all btn-press text-center
                    ${
                      mealSize === "saved"
                        ? "border-accent bg-accent/10 glow-accent"
                        : "border-white/10 glass hover:border-white/20"
                    }
                  `}
                >
                  <span className="block text-2xl mb-2">⭐</span>
                  <span className="block text-sm font-semibold text-foreground">Sačuvano</span>
                  <span className="block text-xs text-foreground-muted mt-1">Moji obroci</span>
                </button>
              </div>

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
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {savedMeals.map((meal, index) => {
                        const isFirstCoachMeal = meal.isCoachMeal && (index === 0 || !savedMeals[index - 1]?.isCoachMeal);
                        const isFirstOwnMeal = !meal.isCoachMeal && (index === 0 || savedMeals[index - 1]?.isCoachMeal);
                        return (
                          <div key={meal.id}>
                            {/* Section headers */}
                            {isFirstCoachMeal && (
                              <p className="text-xs font-medium text-accent mb-2 flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                </svg>
                                Od trenera
                              </p>
                            )}
                            {isFirstOwnMeal && savedMeals.some(m => m.isCoachMeal) && (
                              <p className="text-xs font-medium text-foreground-muted mb-2 mt-3">Moji obroci</p>
                            )}
                            <button
                              onClick={() => setSelectedSavedMeal(meal)}
                              className={`
                                w-full p-3 rounded-xl text-left transition-all
                                ${
                                  selectedSavedMeal?.id === meal.id
                                    ? "bg-accent/20 border-2 border-accent"
                                    : meal.isCoachMeal
                                      ? "bg-accent/5 border-2 border-accent/30 hover:bg-accent/10"
                                      : "bg-white/5 border-2 border-transparent hover:bg-white/10"
                                }
                              `}
                            >
                              <div className="flex items-center justify-between">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-foreground truncate">{meal.name}</p>
                                    {meal.isCoachMeal && (
                                      <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium bg-accent/20 text-accent rounded">
                                        Trener
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-foreground-muted">
                                    {meal.totalCalories} kcal
                                    {meal.totalProtein && ` • P:${meal.totalProtein}g`}
                                    {meal.ingredients.length > 0 && ` • ${meal.ingredients.length} sast.`}
                                  </p>
                                </div>
                                {selectedSavedMeal?.id === meal.id && (
                                  <svg
                                    className="w-5 h-5 text-accent flex-shrink-0"
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
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Selected Saved Meal Preview */}
              {mealSize === "saved" && selectedSavedMeal && (
                <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-foreground-muted">Izabran obrok:</p>
                    {selectedSavedMeal.isCoachMeal && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-accent/20 text-accent rounded-full flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                        Od trenera
                      </span>
                    )}
                  </div>
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
          {mealSize !== "saved" && !selectedSavedMeal && !effectiveRequireExactMacros && (
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
              effectiveRequireExactMacros
                ? // In exact macros mode (Pro or coach-enforced): need either saved meal OR manual P/C/F
                  (!selectedSavedMeal && (!customProtein || !customCarbs || !customFats)) || loading
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

      {/* Photo Meal Modal */}
      <Modal
        isOpen={selectedType === "photo" && photoBase64 !== null}
        onClose={() => {
          setSelectedType(null);
          resetPhotoState();
        }}
        title="Slikaj obrok"
        variant="bottom-sheet"
      >
        <div className="space-y-5">
          {/* Photo Preview */}
          {photoBase64 && (
            <div className="relative rounded-2xl overflow-hidden border border-white/10">
              <img
                src={photoBase64}
                alt="Meal preview"
                className="w-full h-48 object-cover"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-2 right-2 px-3 py-1.5 bg-black/60 rounded-lg text-xs text-white flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Promeni sliku
              </button>
            </div>
          )}

          {/* Meal name with autocomplete */}
          <div>
            <label className="text-label block mb-2">Šta si jeo/la?</label>
            <input
              type="text"
              placeholder="npr. Piletina sa risom"
              value={photoMealName}
              onChange={(e) => setPhotoMealName(e.target.value)}
              list="saved-meals-list"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent/50 transition-colors"
            />
            <datalist id="saved-meals-list">
              {savedMeals.map((meal) => (
                <option key={meal.id} value={meal.name} />
              ))}
            </datalist>
            {savedMeals.some(m => m.name.toLowerCase() === photoMealName.toLowerCase().trim()) && (
              <p className="text-xs text-success mt-1.5 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Koristi makrose iz sačuvanog obroka
              </p>
            )}
          </div>

          {/* Meal size selector - REQUIRED */}
          <div>
            <label className="text-label block mb-2">Veličina obroka *</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { size: "small" as const, emoji: "🥗", label: "Malo" },
                { size: "medium" as const, emoji: "🍛", label: "Srednje" },
                { size: "large" as const, emoji: "🍱", label: "Veliko" },
              ]).map(({ size, emoji, label }) => {
                const macros = getMacrosForSize(size);
                return (
                  <button
                    key={size}
                    onClick={() => {
                      setPhotoMealSize(size);
                      setUseAiEstimation(false);
                      setPhotoEstimation(null);
                    }}
                    className={`
                      py-3 px-2 rounded-xl border-2 transition-all text-center
                      ${
                        photoMealSize === size
                          ? "border-accent bg-accent/10"
                          : "border-white/10 bg-white/5 hover:border-white/20"
                      }
                    `}
                  >
                    <span className="block text-xl mb-1">{emoji}</span>
                    <span className="block text-xs font-medium text-foreground">{label}</span>
                    <span className="block text-xs text-foreground-muted">~{macros.calories} kcal</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Estimation preview */}
          {photoMealSize && (
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-foreground-muted">
                  {useAiEstimation && photoEstimation ? "AI procena:" : "Procena na osnovu veličine:"}
                </p>
                {useAiEstimation && photoEstimation?.confidence && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    photoEstimation.confidence === "high" ? "bg-success/20 text-success" :
                    photoEstimation.confidence === "medium" ? "bg-warning/20 text-warning" :
                    "bg-foreground-muted/20 text-foreground-muted"
                  }`}>
                    {photoEstimation.confidence === "high" ? "Visoka" :
                     photoEstimation.confidence === "medium" ? "Srednja" : "Niska"} pouzdanost
                  </span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                {(() => {
                  const macros = useAiEstimation && photoEstimation
                    ? photoEstimation
                    : getMacrosForSize(photoMealSize);
                  return (
                    <>
                      <div>
                        <p className="text-lg font-bold text-foreground">{macros.calories}</p>
                        <p className="text-xs text-foreground-muted">kcal</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-success">{macros.protein}g</p>
                        <p className="text-xs text-foreground-muted">proteini</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-warning">{macros.carbs}g</p>
                        <p className="text-xs text-foreground-muted">ugljeni</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-accent">{macros.fats}g</p>
                        <p className="text-xs text-foreground-muted">masti</p>
                      </div>
                    </>
                  );
                })()}
              </div>
              {useAiEstimation && photoEstimation?.items && photoEstimation.items.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-xs text-foreground-muted mb-1">AI prepoznao:</p>
                  <p className="text-sm text-foreground">{photoEstimation.items.join(", ")}</p>
                </div>
              )}
            </div>
          )}

          {/* AI Analysis Button - Optional, shows remaining count */}
          {photoMealSize && !useAiEstimation && (
            <button
              onClick={handleAiAnalysis}
              disabled={analyzingPhoto || (photoAiUsage?.remaining ?? 0) === 0}
              className={`
                w-full py-3 px-4 rounded-xl border transition-all flex items-center justify-center gap-2
                ${(photoAiUsage?.remaining ?? 0) > 0
                  ? "border-accent/30 bg-accent/5 hover:bg-accent/10 text-accent"
                  : "border-white/10 bg-white/5 text-foreground-muted cursor-not-allowed"
                }
              `}
            >
              {analyzingPhoto ? (
                <>
                  <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <span>Analiziram...</span>
                </>
              ) : (
                <>
                  <span className="text-lg">✨</span>
                  <span>AI Analiza</span>
                  {photoAiUsage && (
                    <span className="text-xs opacity-70">
                      ({photoAiUsage.remaining}/{photoAiUsage.limit} danas)
                    </span>
                  )}
                </>
              )}
            </button>
          )}

          {/* AI limit message */}
          {photoAiUsage?.remaining === 0 && !useAiEstimation && (
            <p className="text-xs text-foreground-muted text-center">
              AI analiza nije dostupna (limit 3/dan). Koristi procenu na osnovu veličine obroka.
            </p>
          )}

          {/* Log button */}
          <Button
            className="w-full btn-press glow-accent"
            size="lg"
            onClick={handlePhotoLog}
            disabled={!photoMealSize || loading}
            loading={loading}
          >
            Upiši obrok
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// Main page component with Suspense wrapper for useSearchParams
export default function LogPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LogPageContent />
    </Suspense>
  );
}
