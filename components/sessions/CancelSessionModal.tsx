"use client";

import { useState } from "react";
import { Modal, Button } from "@/components/ui";
import {
  isValidCancellationReason,
  MIN_CANCELLATION_REASON_LENGTH,
  formatSessionType,
  SessionType,
} from "@/lib/types/sessions";

interface CancelSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  sessionDetails: {
    type: SessionType;
    scheduledAt: string;
    otherPartyName: string;
  };
}

export function CancelSessionModal({
  isOpen,
  onClose,
  onConfirm,
  sessionDetails,
}: CancelSessionModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scheduledDate = new Date(sessionDetails.scheduledAt);
  const formattedDate = scheduledDate.toLocaleDateString("sr-RS", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const formattedTime = scheduledDate.toLocaleTimeString("sr-RS", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleSubmit = async () => {
    setError(null);

    if (!isValidCancellationReason(reason)) {
      setError(`Razlog mora imati najmanje ${MIN_CANCELLATION_REASON_LENGTH} karaktera`);
      return;
    }

    setIsSubmitting(true);

    try {
      await onConfirm(reason.trim());
      setReason("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška pri otkazivanju");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason("");
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Otkaži termin" variant="modal">
      <div className="space-y-4">
        {/* Session details */}
        <div className="bg-background rounded-xl p-4 text-center">
          <div className="text-foreground-muted text-sm mb-1">
            {formatSessionType(sessionDetails.type)} sa
          </div>
          <div className="font-semibold text-foreground">
            {sessionDetails.otherPartyName}
          </div>
          <div className="text-foreground-muted text-sm mt-2">
            {formattedDate} u {formattedTime}
          </div>
        </div>

        {/* Warning */}
        <div className="bg-warning/10 border border-warning/20 rounded-xl p-3 text-center">
          <span className="text-warning text-sm">
            ⚠️ Ova akcija ne može biti poništena
          </span>
        </div>

        {/* Reason input */}
        <div>
          <label className="block text-sm font-medium text-foreground-muted mb-2">
            Razlog otkazivanja <span className="text-error">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Unesite razlog otkazivanja..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent resize-none"
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-foreground-muted">
              Minimum {MIN_CANCELLATION_REASON_LENGTH} karaktera
            </span>
            <span
              className={`text-xs ${
                reason.length >= MIN_CANCELLATION_REASON_LENGTH
                  ? "text-success"
                  : "text-foreground-muted"
              }`}
            >
              {reason.length}
            </span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="text-sm text-error text-center bg-error/10 rounded-lg p-2">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={handleClose} className="flex-1">
            Nazad
          </Button>
          <Button
            variant="danger"
            onClick={handleSubmit}
            disabled={isSubmitting || !isValidCancellationReason(reason)}
            loading={isSubmitting}
            className="flex-1"
          >
            Otkaži termin
          </Button>
        </div>
      </div>
    </Modal>
  );
}
