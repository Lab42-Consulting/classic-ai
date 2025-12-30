"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { GlassCard, FadeIn, SlideUp, Button, Input, Modal } from "@/components/ui";
import { DeleteConfirmModal, SavedIngredient } from "@/components/meals";
import { getTranslations } from "@/lib/i18n";

const t = getTranslations("sr");

interface IngredientsData {
  own: SavedIngredient[];
  shared: SavedIngredient[];
  loading: boolean;
}

type Tab = "own" | "shared";

interface IngredientFormData {
  name: string;
  defaultPortion: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  isShared: boolean;
}

const EMPTY_FORM: IngredientFormData = {
  name: "",
  defaultPortion: "",
  calories: 0,
  protein: 0,
  carbs: 0,
  fats: 0,
  isShared: false,
};

export default function IngredientsPage() {
  const router = useRouter();
  const [data, setData] = useState<IngredientsData>({
    own: [],
    shared: [],
    loading: true,
  });
  const [activeTab, setActiveTab] = useState<Tab>("shared"); // Default to shared (gym library)
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<SavedIngredient | null>(null);
  const [deletingIngredient, setDeletingIngredient] = useState<SavedIngredient | null>(null);
  const [form, setForm] = useState<IngredientFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deducing, setDeducing] = useState(false);

  const fetchIngredients = useCallback(async (query: string = "") => {
    try {
      const params = new URLSearchParams();
      if (query) params.set("search", query);

      const response = await fetch(`/api/member/ingredients?${params}`);
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
    fetchIngredients();
  }, [fetchIngredients]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchIngredients(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, fetchIngredients]);

  const openCreateModal = () => {
    setForm(EMPTY_FORM);
    setEditingIngredient(null);
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (ingredient: SavedIngredient) => {
    setForm({
      name: ingredient.name,
      defaultPortion: ingredient.defaultPortion,
      calories: ingredient.calories,
      protein: ingredient.protein || 0,
      carbs: ingredient.carbs || 0,
      fats: ingredient.fats || 0,
      isShared: ingredient.isShared,
    });
    setEditingIngredient(ingredient);
    setError(null);
    setShowModal(true);
  };

  const handleAiDeduce = async () => {
    if (!form.name || !form.defaultPortion) return;

    setDeducing(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/deduce-ingredient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          portionSize: form.defaultPortion,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to deduce");
      }

      const data = await response.json();
      setForm((prev) => ({
        ...prev,
        calories: data.calories,
        protein: data.protein || 0,
        carbs: data.carbs || 0,
        fats: data.fats || 0,
      }));
    } catch (err) {
      console.error("AI deduction error:", err);
      setError(t.ingredients.aiError);
    } finally {
      setDeducing(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("Naziv je obavezan");
      return;
    }
    if (!form.defaultPortion.trim()) {
      setError("Porcija je obavezna");
      return;
    }
    if (form.calories <= 0) {
      setError("Kalorije su obavezne");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const url = editingIngredient
        ? `/api/member/ingredients/${editingIngredient.id}`
        : "/api/member/ingredients";
      const method = editingIngredient ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          defaultPortion: form.defaultPortion.trim(),
          calories: form.calories,
          protein: form.protein || null,
          carbs: form.carbs || null,
          fats: form.fats || null,
          isShared: form.isShared,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save");
      }

      setShowModal(false);
      await fetchIngredients(search);
    } catch (err) {
      console.error("Save error:", err);
      setError("Greška prilikom čuvanja");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingIngredient?.id) return;

    const response = await fetch(`/api/member/ingredients/${deletingIngredient.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete");
    }

    setDeletingIngredient(null);
    await fetchIngredients(search);
  };

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
              {t.ingredients.title}
            </h1>
            <p className="text-sm text-foreground-muted">
              Sačuvaj sastojke za brže kreiranje obroka
            </p>
          </div>
        </FadeIn>
      </header>

      {/* Tabs */}
      <div className="px-6 py-4">
        <SlideUp>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab("shared")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === "shared"
                  ? "bg-accent text-white"
                  : "bg-background-secondary text-foreground-muted hover:text-foreground"
              }`}
            >
              Biblioteka teretane ({data.shared.length})
            </button>
            <button
              onClick={() => setActiveTab("own")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === "own"
                  ? "bg-accent text-white"
                  : "bg-background-secondary text-foreground-muted hover:text-foreground"
              }`}
            >
              Moji sastojci ({data.own.length})
            </button>
          </div>
          <Input
            placeholder={t.ingredients.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </SlideUp>
      </div>

      {/* Ingredients List */}
      <main className="px-6 space-y-3">
        {data.loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (activeTab === "own" ? data.own : data.shared).length === 0 ? (
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
              <p className="text-foreground-muted mb-4">
                {search ? t.ingredients.noResults : (activeTab === "own" ? t.ingredients.noIngredients : "Nema sastojaka u biblioteci teretane")}
              </p>
              {!search && activeTab === "own" && (
                <Button size="sm" onClick={openCreateModal}>
                  {t.ingredients.newIngredient}
                </Button>
              )}
            </GlassCard>
          </SlideUp>
        ) : (
          (activeTab === "own" ? data.own : data.shared).map((ingredient, index) => (
            <SlideUp key={ingredient.id} delay={100 + index * 30}>
              <GlassCard className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground truncate">
                    {ingredient.name}
                  </h3>
                  <p className="text-sm text-foreground-muted">
                    {ingredient.defaultPortion} • {ingredient.calories} {t.common.cal}
                  </p>
                  <div className="flex gap-2 mt-1 text-xs text-foreground-muted">
                    {ingredient.protein && <span>P:{ingredient.protein}g</span>}
                    {ingredient.carbs && <span>C:{ingredient.carbs}g</span>}
                    {ingredient.fats && <span>F:{ingredient.fats}g</span>}
                  </div>
                  {ingredient.isShared && (
                    <span className="inline-flex items-center gap-1 text-xs text-accent mt-2">
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      {t.meals.sharedWithGym}
                    </span>
                  )}
                </div>

                {/* Actions - only for own ingredients */}
                {activeTab === "own" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(ingredient)}
                      className="p-2 rounded-lg hover:bg-background-tertiary transition-colors"
                      title={t.ingredients.editIngredient}
                    >
                      <svg
                        className="w-5 h-5 text-foreground-muted"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeletingIngredient(ingredient)}
                      className="p-2 rounded-lg hover:bg-error/10 transition-colors"
                      title={t.ingredients.deleteIngredient}
                    >
                      <svg
                        className="w-5 h-5 text-error"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                )}
              </GlassCard>
            </SlideUp>
          ))
        )}
      </main>

      {/* Floating Add Button */}
      <div className="fixed bottom-6 left-0 right-0 px-6">
        <Button
          onClick={openCreateModal}
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
          {t.ingredients.newIngredient}
        </Button>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingIngredient ? t.ingredients.editIngredient : t.ingredients.newIngredient}
      >
        <div className="space-y-4">
          {/* Name */}
          <Input
            label={t.ingredients.name}
            placeholder="npr. Pileća prsa"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          {/* Portion */}
          <Input
            label={t.ingredients.defaultPortion}
            placeholder="npr. 100g"
            value={form.defaultPortion}
            onChange={(e) => setForm({ ...form, defaultPortion: e.target.value })}
          />

          {/* AI Deduce button */}
          <Button
            variant="secondary"
            onClick={handleAiDeduce}
            disabled={deducing || !form.name || !form.defaultPortion}
            loading={deducing}
            className="w-full"
          >
            {deducing ? t.ingredients.aiDeducing : t.ingredients.aiDeduce}
          </Button>

          {/* Nutritional values */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-foreground-muted mb-1 block">
                {t.ingredients.calories}
              </label>
              <Input
                type="number"
                value={form.calories || ""}
                onChange={(e) => setForm({ ...form, calories: parseInt(e.target.value) || 0 })}
                className="h-10"
              />
            </div>
            <div>
              <label className="text-xs text-foreground-muted mb-1 block">
                {t.ingredients.protein}
              </label>
              <Input
                type="number"
                value={form.protein || ""}
                onChange={(e) => setForm({ ...form, protein: parseInt(e.target.value) || 0 })}
                className="h-10"
              />
            </div>
            <div>
              <label className="text-xs text-foreground-muted mb-1 block">
                {t.ingredients.carbs}
              </label>
              <Input
                type="number"
                value={form.carbs || ""}
                onChange={(e) => setForm({ ...form, carbs: parseInt(e.target.value) || 0 })}
                className="h-10"
              />
            </div>
            <div>
              <label className="text-xs text-foreground-muted mb-1 block">
                {t.ingredients.fats}
              </label>
              <Input
                type="number"
                value={form.fats || ""}
                onChange={(e) => setForm({ ...form, fats: parseInt(e.target.value) || 0 })}
                className="h-10"
              />
            </div>
          </div>

          {/* Share with gym */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={form.isShared}
              onChange={(e) => setForm({ ...form, isShared: e.target.checked })}
              className="checkbox-styled"
            />
            <div className="flex items-center gap-2">
              <svg
                className={`w-5 h-5 transition-colors ${form.isShared ? "text-accent" : "text-foreground-muted"}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="text-foreground group-hover:text-foreground-muted transition-colors">
                {t.meals.shareWithGym}
              </span>
            </div>
          </label>

          {/* Error */}
          {error && <p className="text-sm text-error text-center">{error}</p>}

          {/* Save button */}
          <Button onClick={handleSave} loading={saving} disabled={saving} className="w-full">
            {t.common.save}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <DeleteConfirmModal
        isOpen={!!deletingIngredient}
        onClose={() => setDeletingIngredient(null)}
        onConfirm={handleDelete}
        title={t.ingredients.deleteConfirmTitle}
        message={t.ingredients.deleteConfirmMessage}
        t={t}
      />
    </div>
  );
}
