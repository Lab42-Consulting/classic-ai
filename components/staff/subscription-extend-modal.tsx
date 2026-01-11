"use client";

import { useState } from "react";

interface SubscriptionExtendModalProps {
  memberId: string;
  memberName: string;
  currentEndDate: string | null;
  isExpired: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SUBSCRIPTION_OPTIONS = [
  { months: 1, price: 5, label: "1 mesec", perMonth: 5 },
  { months: 3, price: 12, label: "3 meseca", perMonth: 4, discount: "20%" },
  { months: 6, price: 24, label: "6 meseci", perMonth: 4, discount: "20%" },
  { months: 12, price: 48, label: "12 meseci", perMonth: 4, discount: "20%" },
];

export function SubscriptionExtendModal({
  memberId,
  memberName,
  currentEndDate,
  isExpired,
  onClose,
  onSuccess,
}: SubscriptionExtendModalProps) {
  const [selectedMonths, setSelectedMonths] = useState<number | null>(null);
  const [customDate, setCustomDate] = useState<string>("");
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedMonths && !customDate) {
      setError("Izaberite period ili unesite datum");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/members/${memberId}/subscription/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          useCustomDate
            ? { extendUntil: customDate }
            : { months: selectedMonths }
        ),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Greška pri produženju članarine");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nepoznata greška");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate new end date for preview
  const getPreviewEndDate = (): string | null => {
    if (useCustomDate && customDate) {
      return new Date(customDate).toLocaleDateString("sr-Latn-RS", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }

    if (selectedMonths) {
      const baseDate = currentEndDate && !isExpired
        ? new Date(currentEndDate)
        : new Date();
      const newDate = new Date(baseDate);
      newDate.setMonth(newDate.getMonth() + selectedMonths);
      return newDate.toLocaleDateString("sr-Latn-RS", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }

    return null;
  };

  const previewDate = getPreviewEndDate();
  const selectedOption = SUBSCRIPTION_OPTIONS.find(o => o.months === selectedMonths);

  // Get minimum date for custom date input (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-background-secondary border border-border rounded-2xl w-full max-w-md p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {isExpired ? "Aktiviraj članarinu" : "Produži članarinu"}
            </h2>
            <p className="text-sm text-foreground-muted">{memberName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5 text-foreground-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Current status */}
        {currentEndDate && !isExpired && (
          <div className="mb-6 p-3 bg-background rounded-xl">
            <p className="text-xs text-foreground-muted">Trenutno aktivna do</p>
            <p className="text-sm font-medium text-foreground">
              {new Date(currentEndDate).toLocaleDateString("sr-Latn-RS", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-xl">
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

        {/* Options */}
        <div className="space-y-4 mb-6">
          {/* Quick select options */}
          <div className="grid grid-cols-2 gap-3">
            {SUBSCRIPTION_OPTIONS.map((option) => (
              <button
                key={option.months}
                onClick={() => {
                  setSelectedMonths(option.months);
                  setUseCustomDate(false);
                  setError(null);
                }}
                className={`
                  p-4 rounded-xl border-2 text-left transition-all relative
                  ${selectedMonths === option.months && !useCustomDate
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-foreground-muted"
                  }
                `}
              >
                {option.discount && (
                  <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-emerald-500 text-white text-xs font-medium rounded-full">
                    -{option.discount}
                  </span>
                )}
                <p className="font-medium text-foreground">{option.label}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-sm text-foreground-muted">{option.price}€</p>
                  {option.perMonth && option.months > 1 && (
                    <p className="text-xs text-foreground-muted/70">({option.perMonth}€/mes)</p>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-foreground-muted">ili</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Custom date */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Prilagođeni datum
            </label>
            <input
              type="date"
              min={minDate}
              value={customDate}
              onChange={(e) => {
                setCustomDate(e.target.value);
                setUseCustomDate(true);
                setSelectedMonths(null);
                setError(null);
              }}
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
            />
          </div>
        </div>

        {/* Preview */}
        {previewDate && (
          <div className="mb-6 p-4 bg-accent/10 border border-accent/20 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-foreground-muted">Nova članarina do</p>
                <p className="text-lg font-semibold text-accent">{previewDate}</p>
              </div>
              {selectedOption && !useCustomDate && (
                <div className="text-right">
                  <p className="text-xs text-foreground-muted">Cena</p>
                  <p className="text-lg font-semibold text-foreground">{selectedOption.price}€</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-background rounded-xl text-foreground font-medium hover:bg-white/10 transition-colors"
          >
            Otkaži
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (!selectedMonths && !customDate)}
            className="flex-1 py-3 px-4 bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-white font-medium rounded-xl transition-colors"
          >
            {isSubmitting ? "Čuvanje..." : isExpired ? "Aktiviraj" : "Produži"}
          </button>
        </div>
      </div>
    </div>
  );
}
