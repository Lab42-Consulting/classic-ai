"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { AgentAvatar } from "@/components/ui/agent-avatar";
import { TranslationKeys } from "@/lib/i18n";
import { PORTION_UNITS, PortionUnit } from "@/lib/constants/units";

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
      {/* Row 1 - Ingredient name + Amount + Units */}
      <div className="flex items-center gap-2">
        {/* Name input - gets most of the width */}
        <div className="flex-1 min-w-0">
          <Input
            placeholder={t.ingredients?.name || "Naziv sastojka"}
            value={ingredient.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="h-10 text-sm"
          />
        </div>

        {/* Portion amount - same width as units */}
        <div className="w-16 flex-shrink-0">
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

        {/* Portion unit dropdown - same width as amount */}
        <div className="w-16 flex-shrink-0">
          <select
            value={ingredient.portionUnit}
            onChange={(e) => handleChange("portionUnit", e.target.value)}
            className="select-styled h-10 w-full"
          >
            {PORTION_UNITS.map((unit) => (
              <option key={unit.value} value={unit.value}>
                {unit.label}
              </option>
            ))}
          </select>
        </div>

        {/* Remove button */}
        {canRemove && (
          <button
            onClick={() => onRemove(index)}
            className="p-2 rounded-xl text-foreground-muted hover:text-error hover:bg-error/10 transition-all flex-shrink-0"
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

      {/* Row 2 - Calories (same width as name) + AI Agent button (centered) */}
      <div className="flex items-center gap-2">
        {/* Calories input - same flex-1 as name to match width */}
        <div className="flex-1 min-w-0">
          <Input
            type="number"
            placeholder={t.ingredients?.calories || "kcal"}
            value={ingredient.calories || ""}
            onChange={(e) => handleChange("calories", parseInt(e.target.value) || 0)}
            className="h-10 text-sm"
          />
        </div>
        <span className="text-sm text-foreground-muted flex-shrink-0">kcal</span>

        {/* AI button container - same width as (amount + units + remove minus kcal label) to center the button */}
        <div className="w-[108px] flex-shrink-0 flex justify-center">
          <button
            onClick={() => onAiDeduce(index)}
            disabled={isDeducing || !ingredient.name || !ingredient.portionAmount}
            className="disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            title={t.ingredients?.aiDeduce || "AI popuni"}
          >
            <AgentAvatar
              agent="nutrition"
              size="sm"
              state={isDeducing ? "thinking" : "idle"}
            />
          </button>
        </div>
      </div>

      {/* Row 3 - Toggle macros button */}
      <div className="flex items-center">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-accent flex items-center gap-1"
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
