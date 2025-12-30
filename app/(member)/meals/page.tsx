"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { GlassCard, FadeIn, SlideUp, Button } from "@/components/ui";
import {
  MealCard,
  CreateEditMealModal,
  DeleteConfirmModal,
  Meal,
  MealFormData,
  IngredientData,
} from "@/components/meals";
import { getTranslations } from "@/lib/i18n";
import { formatPortion, parsePortion } from "@/lib/constants/units";

const t = getTranslations("sr");

type Tab = "own" | "coach" | "shared";

interface MealWithAuthor extends Meal {
  member?: {
    name: string;
  };
  coachName?: string;
}

interface MealsData {
  own: MealWithAuthor[];
  coach: MealWithAuthor[];
  shared: MealWithAuthor[];
  loading: boolean;
  hasCoach: boolean;
}

export default function MealsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("own");
  const [data, setData] = useState<MealsData>({
    own: [],
    coach: [],
    shared: [],
    loading: true,
    hasCoach: false,
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMeal, setEditingMeal] = useState<MealFormData | null>(null);
  const [deletingMeal, setDeletingMeal] = useState<Meal | null>(null);
  const [copyingMealId, setCopyingMealId] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState<string | null>(null);

  const fetchMeals = useCallback(async () => {
    try {
      // Fetch meals and profile in parallel
      const [mealsResponse, profileResponse] = await Promise.all([
        fetch("/api/member/meals"),
        fetch("/api/member/profile"),
      ]);

      let hasCoach = false;
      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        hasCoach = !!profile.coachAssignment;
      }

      if (mealsResponse.ok) {
        const result = await mealsResponse.json();
        setData({
          own: result.own || [],
          coach: result.coach || [],
          shared: result.shared || [],
          loading: false,
          hasCoach,
        });
      } else {
        setData({ own: [], coach: [], shared: [], loading: false, hasCoach });
      }
    } catch {
      setData({ own: [], coach: [], shared: [], loading: false, hasCoach: false });
    }
  }, []);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  const handleSaveMeal = async (meal: MealFormData) => {
    const isEdit = !!meal.id;
    const url = isEdit ? `/api/member/meals/${meal.id}` : "/api/member/meals";
    const method = isEdit ? "PATCH" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: meal.name,
        totalCalories: meal.totalCalories,
        totalProtein: meal.totalProtein,
        totalCarbs: meal.totalCarbs,
        totalFats: meal.totalFats,
        isShared: meal.isShared,
        isManualTotal: meal.isManualTotal,
        ingredients: meal.ingredients.map((ing: IngredientData) => ({
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
      throw new Error("Failed to save meal");
    }

    await fetchMeals();
  };

  const handleDeleteMeal = async () => {
    if (!deletingMeal?.id) return;

    const response = await fetch(`/api/member/meals/${deletingMeal.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete meal");
    }

    setDeletingMeal(null);
    await fetchMeals();
  };

  const handleLogMeal = (meal: Meal) => {
    // Redirect to log page with meal pre-selected
    router.push(`/log?mealId=${meal.id}`);
  };

  const handleCopyMeal = async (meal: Meal) => {
    setCopyingMealId(meal.id);
    try {
      const response = await fetch("/api/member/meals/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mealId: meal.id }),
      });

      if (response.ok) {
        setCopyToast(`"${meal.name}" sačuvan u tvoje obroke`);
        setTimeout(() => setCopyToast(null), 3000);
        // Refresh meals to show the new copy in "own" tab
        await fetchMeals();
      }
    } catch (err) {
      console.error("Failed to copy meal:", err);
    } finally {
      setCopyingMealId(null);
    }
  };

  const meals = activeTab === "own" ? data.own : activeTab === "coach" ? data.coach : data.shared;

  // Determine if current tab allows editing
  const canEdit = activeTab === "own";
  // Coach meals show coach name, shared meals show author name
  const isCoachTab = activeTab === "coach";

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="px-6 pt-14 pb-4 flex items-center gap-4 border-b border-white/5">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full glass flex items-center justify-center btn-press"
          aria-label="Go back"
        >
          <svg
            className="w-5 h-5 text-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <FadeIn>
          <div>
            <h1 className="text-xl text-headline text-foreground">
              {t.meals.title}
            </h1>
            <p className="text-sm text-foreground-muted">
              Kreiraj i koristi sačuvane obroke
            </p>
          </div>
        </FadeIn>
      </header>

      {/* Tabs - 3 tabs now */}
      <div className="px-6 py-4">
        <SlideUp>
          <div className="flex gap-1 p-1 bg-background-secondary rounded-xl">
            <button
              onClick={() => setActiveTab("own")}
              className={`
                flex-1 py-2.5 px-2 rounded-lg text-xs font-medium transition-all
                ${
                  activeTab === "own"
                    ? "bg-accent text-white"
                    : "text-foreground-muted hover:text-foreground"
                }
              `}
            >
              Moji obroci
            </button>
            <button
              onClick={() => setActiveTab("coach")}
              className={`
                flex-1 py-2.5 px-2 rounded-lg text-xs font-medium transition-all
                ${
                  activeTab === "coach"
                    ? "bg-accent text-white"
                    : "text-foreground-muted hover:text-foreground"
                }
              `}
            >
              Od trenera
            </button>
            <button
              onClick={() => setActiveTab("shared")}
              className={`
                flex-1 py-2.5 px-2 rounded-lg text-xs font-medium transition-all
                ${
                  activeTab === "shared"
                    ? "bg-accent text-white"
                    : "text-foreground-muted hover:text-foreground"
                }
              `}
            >
              Biblioteka
            </button>
          </div>
        </SlideUp>
      </div>

      {/* Meals List */}
      <main className="px-6 space-y-4">
        {data.loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : meals.length === 0 ? (
          <SlideUp delay={100}>
            <GlassCard className="text-center py-12">
              {/* Own meals - empty state */}
              {activeTab === "own" && (
                <>
                  <div className="w-16 h-16 bg-background-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🍽️</span>
                  </div>
                  <p className="text-foreground font-medium mb-2">
                    {t.meals.noMeals}
                  </p>
                  <p className="text-sm text-foreground-muted">
                    Kreiraj svoj prvi obrok koristeći dugme ispod
                  </p>
                </>
              )}

              {/* Coach meals - empty state */}
              {activeTab === "coach" && (
                <>
                  <div className="w-16 h-16 bg-background-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">👨‍🏫</span>
                  </div>
                  {data.hasCoach ? (
                    <>
                      <p className="text-foreground font-medium mb-2">
                        Trener ti još nije kreirao obroke
                      </p>
                      <p className="text-sm text-foreground-muted">
                        Tvoj trener može da ti kreira personalizovane obroke
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-foreground font-medium mb-2">
                        Nemaš dodeljenog trenera
                      </p>
                      <p className="text-sm text-foreground-muted mb-4">
                        Pronađi personalnog trenera koji će ti kreirati prilagođene obroke
                      </p>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => router.push("/find-coach")}
                      >
                        Pronađi trenera
                      </Button>
                    </>
                  )}
                </>
              )}

              {/* Shared meals - empty state */}
              {activeTab === "shared" && (
                <>
                  <div className="w-16 h-16 bg-background-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">📚</span>
                  </div>
                  <p className="text-foreground font-medium mb-2">
                    {t.meals.noSharedMeals}
                  </p>
                  <p className="text-sm text-foreground-muted">
                    Ovde će se pojaviti obroci koje članovi dele sa teretanom
                  </p>
                </>
              )}
            </GlassCard>
          </SlideUp>
        ) : (
          meals.map((meal, index) => (
            <SlideUp key={meal.id} delay={100 + index * 50}>
              <MealCard
                meal={{
                  ...meal,
                  // For coach meals, show coach name as member name for display
                  member: isCoachTab && meal.coachName
                    ? { name: meal.coachName }
                    : meal.member,
                }}
                isOwner={activeTab === "own" || activeTab === "coach"}
                onEdit={canEdit ? () => {
                  // Transform meal ingredients from portionSize string to portionAmount + portionUnit
                  const transformedMeal: MealFormData = {
                    ...meal,
                    ingredients: meal.ingredients.map((ing) => {
                      const parsed = parsePortion(ing.portionSize);
                      return {
                        id: ing.id,
                        name: ing.name,
                        portionAmount: parsed.amount,
                        portionUnit: parsed.unit,
                        calories: ing.calories,
                        protein: ing.protein,
                        carbs: ing.carbs,
                        fats: ing.fats,
                      };
                    }),
                  };
                  setEditingMeal(transformedMeal);
                } : undefined}
                onDelete={activeTab !== "shared" ? () => setDeletingMeal(meal) : undefined}
                onLog={() => handleLogMeal(meal)}
                onCopy={activeTab === "shared" ? () => handleCopyMeal(meal) : undefined}
                t={t}
                isCoachMeal={isCoachTab}
              />
            </SlideUp>
          ))
        )}
      </main>

      {/* Floating Add Button */}
      <div className="fixed bottom-6 left-0 right-0 px-6">
        <Button
          onClick={() => setShowCreateModal(true)}
          className="w-full shadow-lg shadow-accent/20"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          {t.meals.newMeal}
        </Button>
      </div>

      {/* Create/Edit Modal */}
      <CreateEditMealModal
        isOpen={showCreateModal || !!editingMeal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingMeal(null);
        }}
        onSave={handleSaveMeal}
        existingMeal={editingMeal}
        t={t}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingMeal}
        onClose={() => setDeletingMeal(null)}
        onConfirm={handleDeleteMeal}
        title={t.meals.deleteConfirmTitle}
        message={t.meals.deleteConfirmMessage}
        t={t}
      />

      {/* Copying overlay */}
      {copyingMealId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-success border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-foreground">Kopiram obrok...</p>
          </div>
        </div>
      )}

      {/* Copy success toast */}
      {copyToast && (
        <div className="fixed top-6 left-6 right-6 z-50">
          <div className="bg-success/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-medium text-white flex-1">{copyToast}</p>
              <button
                onClick={() => setCopyToast(null)}
                className="p-1 rounded-full hover:bg-white/20 transition-colors"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
