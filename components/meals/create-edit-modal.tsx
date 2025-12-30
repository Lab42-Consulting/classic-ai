"use client";

import { useState, useEffect, useCallback } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { IngredientRow, IngredientData } from "./ingredient-row";
import { IngredientPicker, SavedIngredient } from "./ingredient-picker";
import { TranslationKeys } from "@/lib/i18n";
import { parsePortion, formatPortion, PortionUnit } from "@/lib/constants/units";

interface MealFormData {
  id?: string;
  name: string;
  totalCalories: number;
  totalProtein?: number | null;
  totalCarbs?: number | null;
  totalFats?: number | null;
  isShared: boolean;
  isManualTotal: boolean;
  ingredients: IngredientData[];
}

interface CreateEditMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (meal: MealFormData) => Promise<void>;
  existingMeal?: MealFormData | null;
  t: TranslationKeys;
}

const EMPTY_INGREDIENT: IngredientData = {
  name: "",
  portionAmount: 0,
  portionUnit: "g",
  calories: 0,
  protein: null,
  carbs: null,
  fats: null,
};

export function CreateEditMealModal({
  isOpen,
  onClose,
  onSave,
  existingMeal,
  t,
}: CreateEditMealModalProps) {
  const [name, setName] = useState("");
  const [ingredients, setIngredients] = useState<IngredientData[]>([{ ...EMPTY_INGREDIENT }]);
  const [isShared, setIsShared] = useState(false);
  const [isManualTotal, setIsManualTotal] = useState(false);
  const [manualCalories, setManualCalories] = useState(0);
  const [manualProtein, setManualProtein] = useState(0);
  const [manualCarbs, setManualCarbs] = useState(0);
  const [manualFats, setManualFats] = useState(0);
  const [deducingIndex, setDeducingIndex] = useState<number | null>(null);
  const [showIngredientPicker, setShowIngredientPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens or existingMeal changes
  useEffect(() => {
    if (isOpen) {
      if (existingMeal) {
        setName(existingMeal.name);
        setIngredients(existingMeal.ingredients.length > 0
          ? existingMeal.ingredients
          : [{ ...EMPTY_INGREDIENT }]);
        setIsShared(existingMeal.isShared);
        setIsManualTotal(existingMeal.isManualTotal);
        if (existingMeal.isManualTotal) {
          setManualCalories(existingMeal.totalCalories);
          setManualProtein(existingMeal.totalProtein || 0);
          setManualCarbs(existingMeal.totalCarbs || 0);
          setManualFats(existingMeal.totalFats || 0);
        }
      } else {
        setName("");
        setIngredients([{ ...EMPTY_INGREDIENT }]);
        setIsShared(false);
        setIsManualTotal(false);
        setManualCalories(0);
        setManualProtein(0);
        setManualCarbs(0);
        setManualFats(0);
      }
      setError(null);
    }
  }, [isOpen, existingMeal]);

  // Calculate totals from ingredients
  const calculatedTotals = ingredients.reduce(
    (acc, ing) => ({
      calories: acc.calories + (ing.calories || 0),
      protein: acc.protein + (ing.protein || 0),
      carbs: acc.carbs + (ing.carbs || 0),
      fats: acc.fats + (ing.fats || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  const totals = isManualTotal
    ? {
        calories: manualCalories,
        protein: manualProtein,
        carbs: manualCarbs,
        fats: manualFats,
      }
    : calculatedTotals;

  const handleIngredientChange = useCallback((index: number, data: IngredientData) => {
    setIngredients(prev => {
      const updated = [...prev];
      updated[index] = data;
      return updated;
    });
  }, []);

  const handleRemoveIngredient = useCallback((index: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddIngredient = useCallback(() => {
    setIngredients(prev => [...prev, { ...EMPTY_INGREDIENT }]);
  }, []);

  const handleAddFromLibrary = useCallback((savedIngredient: SavedIngredient) => {
    // Parse the saved ingredient's defaultPortion string into amount + unit
    const parsed = parsePortion(savedIngredient.defaultPortion);

    setIngredients(prev => [
      ...prev,
      {
        name: savedIngredient.name,
        portionAmount: parsed.amount,
        portionUnit: parsed.unit,
        calories: savedIngredient.calories,
        protein: savedIngredient.protein,
        carbs: savedIngredient.carbs,
        fats: savedIngredient.fats,
      },
    ]);
    setShowIngredientPicker(false);
  }, []);

  const handleAiDeduce = async (index: number) => {
    const ingredient = ingredients[index];
    if (!ingredient.name || !ingredient.portionAmount) return;

    setDeducingIndex(index);
    setError(null);

    try {
      // Combine amount + unit into portionSize string for the API
      const portionSize = formatPortion(ingredient.portionAmount, ingredient.portionUnit);

      const response = await fetch("/api/ai/deduce-ingredient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: ingredient.name,
          portionSize,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to deduce ingredient");
      }

      const data = await response.json();

      setIngredients(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          calories: data.calories,
          protein: data.protein,
          carbs: data.carbs,
          fats: data.fats,
        };
        return updated;
      });
    } catch (err) {
      console.error("AI deduction error:", err);
      setError(t.ingredients?.aiError || "Greška prilikom AI dedukcije");
    } finally {
      setDeducingIndex(null);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      setError(t.meals?.nameRequired || "Naziv obroka je obavezan");
      return;
    }

    const validIngredients = ingredients.filter(ing => ing.name.trim() && ing.calories > 0);
    if (validIngredients.length === 0) {
      setError(t.meals?.needIngredients || "Dodaj bar jedan sastojak sa kalorijama");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave({
        id: existingMeal?.id,
        name: name.trim(),
        totalCalories: totals.calories,
        totalProtein: totals.protein || null,
        totalCarbs: totals.carbs || null,
        totalFats: totals.fats || null,
        isShared,
        isManualTotal,
        ingredients: validIngredients,
      });
      onClose();
    } catch (err) {
      console.error("Save error:", err);
      setError(t.meals?.saveError || "Greška prilikom čuvanja");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={existingMeal ? (t.meals?.editMeal || "Izmeni obrok") : (t.meals?.newMeal || "Novi obrok")}
      >
        <div className="space-y-6">
          {/* Meal name */}
          <Input
            label={t.meals?.mealName || "Naziv obroka"}
            placeholder="npr. Piletina sa rizom"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {/* Ingredients */}
          <div>
            <label className="block text-sm font-medium text-foreground-muted mb-3">
              {t.meals?.ingredients || "Sastojci"}
            </label>
            <div className="space-y-3">
              {ingredients.map((ingredient, index) => (
                <IngredientRow
                  key={index}
                  ingredient={ingredient}
                  index={index}
                  onChange={handleIngredientChange}
                  onRemove={handleRemoveIngredient}
                  onAiDeduce={handleAiDeduce}
                  isDeducing={deducingIndex === index}
                  canRemove={ingredients.length > 1}
                  t={t}
                />
              ))}
            </div>

            {/* Add ingredient buttons */}
            <div className="flex gap-2 mt-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddIngredient}
                className="flex-1"
              >
                <svg
                  className="w-4 h-4 mr-2"
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
                {t.meals?.addIngredient || "Dodaj sastojak"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowIngredientPicker(true)}
                className="flex-1"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                {t.meals?.fromLibrary || "Iz biblioteke"}
              </Button>
            </div>
          </div>

          {/* Totals */}
          <div className="bg-background-tertiary rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-foreground">
                {t.meals?.total || "Ukupno"}
              </span>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={isManualTotal}
                  onChange={(e) => setIsManualTotal(e.target.checked)}
                  className="checkbox-styled"
                />
                <span className="text-foreground-muted">
                  {t.meals?.manualTotal || "Ručno podesi"}
                </span>
              </label>
            </div>

            {isManualTotal ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-foreground-muted mb-1 block">
                    {t.ingredients?.calories || "Kalorije"}
                  </label>
                  <Input
                    type="number"
                    value={manualCalories}
                    onChange={(e) => setManualCalories(parseInt(e.target.value) || 0)}
                    className="h-10"
                  />
                </div>
                <div>
                  <label className="text-xs text-foreground-muted mb-1 block">
                    {t.ingredients?.protein || "Proteini (g)"}
                  </label>
                  <Input
                    type="number"
                    value={manualProtein}
                    onChange={(e) => setManualProtein(parseInt(e.target.value) || 0)}
                    className="h-10"
                  />
                </div>
                <div>
                  <label className="text-xs text-foreground-muted mb-1 block">
                    {t.ingredients?.carbs || "UH (g)"}
                  </label>
                  <Input
                    type="number"
                    value={manualCarbs}
                    onChange={(e) => setManualCarbs(parseInt(e.target.value) || 0)}
                    className="h-10"
                  />
                </div>
                <div>
                  <label className="text-xs text-foreground-muted mb-1 block">
                    {t.ingredients?.fats || "Masti (g)"}
                  </label>
                  <Input
                    type="number"
                    value={manualFats}
                    onChange={(e) => setManualFats(parseInt(e.target.value) || 0)}
                    className="h-10"
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="font-semibold text-accent">
                  {totals.calories} {t.common.cal}
                </span>
                {totals.protein > 0 && (
                  <span className="text-foreground-muted">P: {totals.protein}g</span>
                )}
                {totals.carbs > 0 && (
                  <span className="text-foreground-muted">C: {totals.carbs}g</span>
                )}
                {totals.fats > 0 && (
                  <span className="text-foreground-muted">F: {totals.fats}g</span>
                )}
              </div>
            )}
          </div>

          {/* Share with gym */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={isShared}
              onChange={(e) => setIsShared(e.target.checked)}
              className="checkbox-styled"
            />
            <div className="flex items-center gap-2">
              <svg
                className={`w-5 h-5 transition-colors ${isShared ? "text-accent" : "text-foreground-muted"}`}
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
                {t.meals?.shareWithGym || "Podeli sa teretanom"}
              </span>
            </div>
          </label>

          {/* Error message */}
          {error && (
            <p className="text-sm text-error text-center">{error}</p>
          )}

          {/* Save button */}
          <Button
            onClick={handleSave}
            loading={saving}
            disabled={saving}
            className="w-full"
          >
            {t.meals?.saveMeal || "Sačuvaj obrok"}
          </Button>
        </div>
      </Modal>

      {/* Ingredient picker modal */}
      <IngredientPicker
        isOpen={showIngredientPicker}
        onClose={() => setShowIngredientPicker(false)}
        onSelect={handleAddFromLibrary}
        t={t}
      />
    </>
  );
}

export type { MealFormData, CreateEditMealModalProps };
