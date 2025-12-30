"use client";

import { useState, useEffect, useCallback } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { TranslationKeys } from "@/lib/i18n";

interface SavedIngredient {
  id: string;
  name: string;
  defaultPortion: string;
  calories: number;
  protein?: number | null;
  carbs?: number | null;
  fats?: number | null;
  isShared: boolean;
  member?: {
    name: string;
  };
}

interface IngredientPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (ingredient: SavedIngredient) => void;
  t: TranslationKeys;
}

export function IngredientPicker({
  isOpen,
  onClose,
  onSelect,
  t,
}: IngredientPickerProps) {
  const [search, setSearch] = useState("");
  const [ingredients, setIngredients] = useState<SavedIngredient[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchIngredients = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("search", query);

      const response = await fetch(`/api/member/ingredients?${params}`);
      if (response.ok) {
        const data = await response.json();
        setIngredients(data.ingredients || []);
      }
    } catch (err) {
      console.error("Failed to fetch ingredients:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch ingredients when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchIngredients("");
      setSearch("");
    }
  }, [isOpen, fetchIngredients]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isOpen) {
        fetchIngredients(search);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, isOpen, fetchIngredients]);

  const handleSelect = (ingredient: SavedIngredient) => {
    onSelect(ingredient);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t.meals?.fromLibrary || "Iz biblioteke"}
    >
      <div className="space-y-4">
        {/* Search */}
        <Input
          placeholder={t.ingredients?.searchPlaceholder || "Pretraži sastojke..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto space-y-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : ingredients.length === 0 ? (
            <div className="text-center py-8 text-foreground-muted">
              {search
                ? (t.ingredients?.noResults || "Nema rezultata")
                : (t.ingredients?.noIngredients || "Nema sačuvanih sastojaka")}
            </div>
          ) : (
            ingredients.map((ingredient) => (
              <button
                key={ingredient.id}
                onClick={() => handleSelect(ingredient)}
                className="w-full p-4 bg-background-tertiary rounded-xl text-left hover:bg-background-secondary transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-foreground">
                      {ingredient.name}
                    </h4>
                    <p className="text-sm text-foreground-muted">
                      {ingredient.defaultPortion} • {ingredient.calories} {t.common.cal}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {ingredient.protein && (
                      <span className="text-xs text-foreground-muted">
                        P:{ingredient.protein}
                      </span>
                    )}
                    {ingredient.carbs && (
                      <span className="text-xs text-foreground-muted">
                        C:{ingredient.carbs}
                      </span>
                    )}
                    {ingredient.fats && (
                      <span className="text-xs text-foreground-muted">
                        F:{ingredient.fats}
                      </span>
                    )}
                  </div>
                </div>
                {ingredient.isShared && ingredient.member && (
                  <p className="text-xs text-foreground-muted mt-1 italic">
                    {t.meals?.sharedBy || "Podelio/la"}: {ingredient.member.name}
                  </p>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}

export type { SavedIngredient, IngredientPickerProps };
