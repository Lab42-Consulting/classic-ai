"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { TranslationKeys } from "@/lib/i18n";
import { PORTION_UNITS, PortionUnit } from "@/lib/constants/units";

// Nutrition agent icon (cherries) - matches the nutrition AI assistant
function NutritionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="8" cy="16" r="5" />
      <circle cx="16" cy="18" r="4" />
      <path
        d="M8 11 C8 8, 10 5, 13 4 M16 14 C16 10, 14 6, 13 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <ellipse cx="14" cy="4" rx="3" ry="1.5" transform="rotate(-20 14 4)" />
    </svg>
  );
}

interface IngredientData {
  id?: string;
  name: string;
  portionAmount: number;
  portionUnit: PortionUnit;
  calories: number;
  protein?: number | null;
  carbs?: number | null;
  fats?: number | null;
}

interface IngredientRowProps {
  ingredient: IngredientData;
  index: number;
  onChange: (index: number, data: IngredientData) => void;
  onRemove: (index: number) => void;
  onAiDeduce: (index: number) => void;
  isDeducing?: boolean;
  canRemove?: boolean;
  t: TranslationKeys;
}

export function IngredientRow({
  ingredient,
  index,
  onChange,
  onRemove,
  onAiDeduce,
  isDeducing = false,
  canRemove = true,
  t,
}: IngredientRowProps) {
  const [expanded, setExpanded] = useState(false);

  const handleChange = (field: keyof IngredientData, value: string | number) => {
    onChange(index, {
      ...ingredient,
      [field]: value,
    });
  };

  const hasMacros = ingredient.protein || ingredient.carbs || ingredient.fats;

  return (
    <div className="bg-background-tertiary rounded-xl p-4 space-y-3">
      {/* Main row - name, portion (amount + unit), AI button, remove */}
      <div className="flex items-start gap-2">
        {/* Name input */}
        <div className="flex-1">
          <Input
            placeholder={t.ingredients?.name || "Naziv"}
            value={ingredient.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="h-10 text-sm"
          />
        </div>

        {/* Portion amount */}
        <div className="w-20">
          <Input
            type="number"
            placeholder={t.ingredients?.amount || "Kol."}
            value={ingredient.portionAmount || ""}
            onChange={(e) =>
              handleChange("portionAmount", parseFloat(e.target.value) || 0)
            }
            className="h-10 text-sm"
            min={0}
            step="any"
          />
        </div>

        {/* Portion unit dropdown */}
        <div className="w-24">
          <select
            value={ingredient.portionUnit}
            onChange={(e) => handleChange("portionUnit", e.target.value)}
            className="select-styled h-10"
          >
            {PORTION_UNITS.map((unit) => (
              <option key={unit.value} value={unit.value}>
                {unit.label}
              </option>
            ))}
          </select>
        </div>

        {/* AI Deduce button - uses Nutrition Agent visual identity */}
        <button
          onClick={() => onAiDeduce(index)}
          disabled={isDeducing || !ingredient.name || !ingredient.portionAmount}
          className={`
            p-2.5 rounded-xl transition-all
            ${
              isDeducing
                ? "bg-emerald-500/20 text-emerald-500 animate-pulse"
                : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
            }
            disabled:opacity-40 disabled:cursor-not-allowed
          `}
          title={t.ingredients?.aiDeduce || "AI popuni"}
        >
          {isDeducing ? (
            <svg
              className="w-5 h-5 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <NutritionIcon className="w-5 h-5" />
          )}
        </button>

        {/* Remove button */}
        {canRemove && (
          <button
            onClick={() => onRemove(index)}
            className="p-2.5 rounded-xl text-foreground-muted hover:text-error hover:bg-error/10 transition-all"
            title={t.common.cancel}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Calories (always visible) */}
      <div className="flex items-center gap-2">
        <Input
          type="number"
          placeholder={t.ingredients?.calories || "Kalorije"}
          value={ingredient.calories || ""}
          onChange={(e) => handleChange("calories", parseInt(e.target.value) || 0)}
          className="h-10 text-sm w-28"
        />
        <span className="text-sm text-foreground-muted">{t.common.cal}</span>

        {/* Toggle macros button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="ml-auto text-sm text-accent flex items-center gap-1"
        >
          {expanded ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              {t.ingredients?.hideMacros || "Sakrij makrose"}
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {hasMacros
                ? `P:${ingredient.protein || 0} C:${ingredient.carbs || 0} F:${ingredient.fats || 0}`
                : t.ingredients?.addMacros || "Dodaj makrose"}
            </>
          )}
        </button>
      </div>

      {/* Expanded macros */}
      {expanded && (
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">
              {t.ingredients?.protein || "Proteini (g)"}
            </label>
            <Input
              type="number"
              value={ingredient.protein || ""}
              onChange={(e) => handleChange("protein", parseInt(e.target.value) || 0)}
              className="h-9 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">
              {t.ingredients?.carbs || "UH (g)"}
            </label>
            <Input
              type="number"
              value={ingredient.carbs || ""}
              onChange={(e) => handleChange("carbs", parseInt(e.target.value) || 0)}
              className="h-9 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">
              {t.ingredients?.fats || "Masti (g)"}
            </label>
            <Input
              type="number"
              value={ingredient.fats || ""}
              onChange={(e) => handleChange("fats", parseInt(e.target.value) || 0)}
              className="h-9 text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export type { IngredientData, IngredientRowProps };
