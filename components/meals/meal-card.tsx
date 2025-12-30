"use client";

import { Card } from "@/components/ui/card";
import { TranslationKeys } from "@/lib/i18n";

interface MealIngredient {
  id: string;
  name: string;
  portionSize: string;
  calories: number;
  protein?: number | null;
  carbs?: number | null;
  fats?: number | null;
}

interface Meal {
  id: string;
  name: string;
  totalCalories: number;
  totalProtein?: number | null;
  totalCarbs?: number | null;
  totalFats?: number | null;
  isShared: boolean;
  isManualTotal: boolean;
  shareApproved?: boolean;
  sharePending?: boolean;
  ingredients: MealIngredient[];
  member?: {
    name: string;
  };
  createdAt?: string;
}

interface MealCardProps {
  meal: Meal;
  onEdit?: () => void;
  onDelete?: () => void;
  onLog?: () => void;
  onCopy?: () => void;
  isOwner: boolean;
  t: TranslationKeys;
}

export function MealCard({
  meal,
  onEdit,
  onDelete,
  onLog,
  onCopy,
  isOwner,
  t,
}: MealCardProps) {
  const hasMacros = meal.totalProtein || meal.totalCarbs || meal.totalFats;

  return (
    <Card className="relative">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Meal name */}
          <h3 className="text-lg font-semibold text-foreground truncate">
            {meal.name}
          </h3>

          {/* Calories and ingredient count */}
          <p className="text-sm text-foreground-muted mt-1">
            {meal.totalCalories} {t.common.cal} • {meal.ingredients.length}{" "}
            {t.meals?.ingredients || "sastojaka"}
          </p>

          {/* Macros if available */}
          {hasMacros && (
            <div className="flex gap-3 mt-2 text-xs text-foreground-muted">
              {meal.totalProtein && (
                <span>P: {meal.totalProtein}g</span>
              )}
              {meal.totalCarbs && (
                <span>C: {meal.totalCarbs}g</span>
              )}
              {meal.totalFats && (
                <span>F: {meal.totalFats}g</span>
              )}
            </div>
          )}

          {/* Author for shared meals */}
          {meal.isShared && meal.member && !isOwner && (
            <p className="text-xs text-foreground-muted mt-2 italic">
              {t.meals?.sharedBy || "Podelio/la"}: {meal.member.name}
            </p>
          )}
        </div>

        {/* Actions menu */}
        <div className="flex items-center gap-2">
          {/* Copy button (for shared meals not owned by user) */}
          {onCopy && !isOwner && (
            <button
              onClick={onCopy}
              className="p-2 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors"
              title={t.meals?.copyToSaved || "Sačuvaj u svoje obroke"}
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
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </button>
          )}

          {/* Log button */}
          {onLog && (
            <button
              onClick={onLog}
              className="p-2 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
              title={t.meals?.logThis || "Unesi ovaj obrok"}
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          )}

          {/* Menu button (only for owner) */}
          {isOwner && (onEdit || onDelete) && (
            <div className="relative group">
              <button
                className="p-2 rounded-lg hover:bg-background-tertiary transition-colors"
                title={t.meals?.options || "Opcije"}
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
                    d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                  />
                </svg>
              </button>

              {/* Dropdown */}
              <div className="absolute right-0 top-full mt-1 bg-background-secondary border border-border rounded-xl shadow-lg opacity-0 invisible group-focus-within:opacity-100 group-focus-within:visible transition-all z-10 min-w-[140px]">
                {onEdit && (
                  <button
                    onClick={onEdit}
                    className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-background-tertiary transition-colors rounded-t-xl flex items-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
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
                    {t.meals?.editMeal || "Izmeni"}
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={onDelete}
                    className="w-full px-4 py-3 text-left text-sm text-error hover:bg-background-tertiary transition-colors rounded-b-xl flex items-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
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
                    {t.meals?.deleteMeal || "Obriši"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Shared badge */}
      {meal.isShared && isOwner && (
        <div className="mt-3 pt-3 border-t border-border">
          {meal.sharePending ? (
            // Pending approval - show warning style
            <span className="inline-flex items-center gap-1.5 text-xs text-warning bg-warning/10 px-2 py-1 rounded-full">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Čeka odobrenje admina
            </span>
          ) : (
            // Approved - show accent style
            <span className="inline-flex items-center gap-1.5 text-xs text-accent bg-accent/10 px-2 py-1 rounded-full">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {t.meals?.sharedWithGym || "Podeljeno sa teretanom"}
            </span>
          )}
        </div>
      )}
    </Card>
  );
}

export type { Meal, MealIngredient, MealCardProps };
