"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface PendingMeal {
  id: string;
  name: string;
  totalCalories: number;
  totalProtein?: number | null;
  totalCarbs?: number | null;
  totalFats?: number | null;
  photoUrl?: string | null;
  ingredientCount: number;
  ingredients: Array<{
    name: string;
    portionSize: string;
    calories: number;
  }>;
  memberName: string;
  memberId: string;
  requestedAt: string;
}

export default function PendingMealsPage() {
  const [meals, setMeals] = useState<PendingMeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPendingMeals = async () => {
    try {
      const response = await fetch("/api/admin/pending-shares");
      if (response.ok) {
        const data = await response.json();
        setMeals(data.pendingMeals || []);
      } else {
        setError("Greška pri učitavanju obroka");
      }
    } catch (err) {
      console.error("Failed to fetch pending meals:", err);
      setError("Greška pri učitavanju obroka");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingMeals();
  }, []);

  const handleAction = async (mealId: string, action: "approve" | "reject") => {
    setProcessingId(mealId);
    setError(null);

    try {
      const response = await fetch("/api/admin/pending-shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mealId, action }),
      });

      if (response.ok) {
        // Remove from list
        setMeals(meals.filter((m) => m.id !== mealId));
      } else {
        const data = await response.json();
        setError(data.error || "Greška pri obradi zahteva");
      }
    } catch (err) {
      console.error("Failed to process meal:", err);
      setError("Greška pri obradi zahteva");
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("sr-Latn-RS", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link
            href="/gym-portal/manage"
            className="p-2 rounded-lg hover:bg-background-secondary transition-colors"
          >
            <svg className="w-5 h-5 text-foreground-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Obroci na čekanju
            </h1>
            <p className="text-foreground-muted mt-1">
              Odobri ili odbij obroke koje članovi žele da podele sa teretanom
            </p>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
          {error}
        </div>
      )}

      {/* Pending meals list */}
      {meals.length === 0 ? (
        <div className="text-center py-16 bg-background-secondary rounded-2xl border border-border">
          <div className="w-16 h-16 bg-background-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-foreground-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-foreground font-medium mb-2">
            Nema obroka na čekanju
          </p>
          <p className="text-sm text-foreground-muted">
            Svi zahtevi za deljenje su obrađeni
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {meals.map((meal) => (
            <div
              key={meal.id}
              className="bg-background-secondary border border-border rounded-2xl overflow-hidden"
            >
              {/* Meal photo */}
              {meal.photoUrl && (
                <img
                  src={meal.photoUrl}
                  alt={meal.name}
                  className="w-full aspect-[4/3] object-cover"
                />
              )}

              {/* Meal content */}
              <div className="p-5">
                {/* Name and calories */}
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {meal.name}
                </h3>
                <p className="text-sm text-foreground-muted mb-3">
                  {meal.totalCalories} kal • {meal.ingredientCount} sastojaka
                </p>

                {/* Macros */}
                {(meal.totalProtein || meal.totalCarbs || meal.totalFats) && (
                  <div className="flex gap-3 text-xs text-foreground-muted mb-4">
                    {meal.totalProtein && <span>P: {meal.totalProtein}g</span>}
                    {meal.totalCarbs && <span>C: {meal.totalCarbs}g</span>}
                    {meal.totalFats && <span>F: {meal.totalFats}g</span>}
                  </div>
                )}

                {/* Ingredients preview */}
                <div className="mb-4 text-xs text-foreground-muted">
                  <p className="font-medium text-foreground mb-1">Sastojci:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {meal.ingredients.slice(0, 3).map((ing, idx) => (
                      <li key={idx} className="truncate">
                        {ing.name} ({ing.portionSize})
                      </li>
                    ))}
                    {meal.ingredients.length > 3 && (
                      <li className="text-foreground-muted">
                        +{meal.ingredients.length - 3} više...
                      </li>
                    )}
                  </ul>
                </div>

                {/* Member info */}
                <div className="flex items-center gap-2 mb-4 text-sm text-foreground-muted">
                  <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span>{meal.memberName}</span>
                  <span className="text-xs">({meal.memberId})</span>
                </div>

                {/* Request date */}
                <p className="text-xs text-foreground-muted mb-4">
                  Zatraženo: {formatDate(meal.requestedAt)}
                </p>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleAction(meal.id, "approve")}
                    disabled={processingId === meal.id}
                    className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {processingId === meal.id ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Odobri
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleAction(meal.id, "reject")}
                    disabled={processingId === meal.id}
                    className="flex-1 py-2.5 px-4 bg-red-600/20 hover:bg-red-600/30 disabled:opacity-50 text-red-400 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Odbij
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
