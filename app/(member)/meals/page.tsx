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

type Tab = "own" | "shared";

interface MealWithAuthor extends Meal {
  member?: {
    name: string;
  };
}

interface MealsData {
  own: MealWithAuthor[];
  shared: MealWithAuthor[];
  loading: boolean;
}

export default function MealsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("own");
  const [data, setData] = useState<MealsData>({
    own: [],
    shared: [],
    loading: true,
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMeal, setEditingMeal] = useState<MealFormData | null>(null);
  const [deletingMeal, setDeletingMeal] = useState<Meal | null>(null);
  const [loggingMeal, setLoggingMeal] = useState<Meal | null>(null);
  const [copyingMealId, setCopyingMealId] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState<string | null>(null);

  const fetchMeals = useCallback(async () => {
    try {
      const response = await fetch("/api/member/meals");
      if (response.ok) {
        const result = await response.json();
        setData({
          own: result.own || [],
          shared: result.shared || [],
          loading: false,
        });
      } else {
        setData({ own: [], shared: [], loading: false });
      }
    } catch {
      setData({ own: [], shared: [], loading: false });
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

  const handleLogMeal = async (meal: Meal) => {
    setLoggingMeal(meal);
    try {
      const response = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "meal",
          mealSize: "saved",
          mealName: meal.name,
          customCalories: meal.totalCalories,
          customProtein: meal.totalProtein,
          customCarbs: meal.totalCarbs,
          customFats: meal.totalFats,
        }),
      });

      if (response.ok) {
        // Show success and redirect to home
        router.push("/home");
      }
    } catch (err) {
      console.error("Failed to log meal:", err);
    } finally {
      setLoggingMeal(null);
    }
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

  const meals = activeTab === "own" ? data.own : data.shared;

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

      {/* Tabs */}
      <div className="px-6 py-4">
        <SlideUp>
          <div className="flex gap-2 p-1 bg-background-secondary rounded-xl">
            <button
              onClick={() => setActiveTab("own")}
              className={`
                flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all
                ${
                  activeTab === "own"
                    ? "bg-accent text-white"
                    : "text-foreground-muted hover:text-foreground"
                }
              `}
            >
              {t.meals.myMeals}
            </button>
            <button
              onClick={() => setActiveTab("shared")}
              className={`
                flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all
                ${
                  activeTab === "shared"
                    ? "bg-accent text-white"
                    : "text-foreground-muted hover:text-foreground"
                }
              `}
            >
              {t.meals.sharedMeals}
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
              <div className="w-16 h-16 bg-background-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-foreground-muted"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <p className="text-foreground-muted">
                {activeTab === "own" ? t.meals.noMeals : t.meals.noSharedMeals}
              </p>
            </GlassCard>
          </SlideUp>
        ) : (
          meals.map((meal, index) => (
            <SlideUp key={meal.id} delay={100 + index * 50}>
              <MealCard
                meal={meal}
                isOwner={activeTab === "own"}
                onEdit={() => {
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
                }}
                onDelete={() => setDeletingMeal(meal)}
                onLog={() => handleLogMeal(meal)}
                onCopy={activeTab === "shared" ? () => handleCopyMeal(meal) : undefined}
                t={t}
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

      {/* Logging overlay */}
      {loggingMeal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-foreground">Unosim obrok...</p>
          </div>
        </div>
      )}

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
