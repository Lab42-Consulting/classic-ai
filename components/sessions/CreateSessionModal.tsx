"use client";

import { useState, useEffect } from "react";
import { Modal, Button, Input } from "@/components/ui";
import {
  SessionType,
  SessionLocation,
  SessionDuration,
  SESSION_TYPE_OPTIONS,
  SESSION_LOCATION_OPTIONS,
  SESSION_DURATION_OPTIONS,
  isValidProposedTime,
} from "@/lib/types/sessions";

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SessionFormData) => Promise<void>;
  mode: "create" | "counter";
  recipientName: string;
  initialData?: Partial<SessionFormData>;
}

export interface SessionFormData {
  sessionType: SessionType;
  proposedAt: string;
  duration: SessionDuration;
  location: SessionLocation;
  note?: string;
}

export function CreateSessionModal({
  isOpen,
  onClose,
  onSubmit,
  mode,
  recipientName,
  initialData,
}: CreateSessionModalProps) {
  const [sessionType, setSessionType] = useState<SessionType>(
    initialData?.sessionType || "training"
  );
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState<SessionDuration>(
    initialData?.duration || 60
  );
  const [location, setLocation] = useState<SessionLocation>(
    initialData?.location || "gym"
  );
  const [note, setNote] = useState(initialData?.note || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSessionType(initialData?.sessionType || "training");
      setDuration(initialData?.duration || 60);
      setLocation(initialData?.location || "gym");
      setNote(initialData?.note || "");
      setError(null);

      // Set default date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDate(tomorrow.toISOString().split("T")[0]);
      setTime("10:00");
    }
  }, [isOpen, initialData]);

  // Get minimum date (tomorrow)
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  };

  const handleSubmit = async () => {
    setError(null);

    // Validate date and time
    if (!date || !time) {
      setError("Izaberite datum i vreme");
      return;
    }

    const proposedDate = new Date(`${date}T${time}`);

    if (!isValidProposedTime(proposedDate)) {
      setError("Termin mora biti zakazan najmanje 24 sata unapred");
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        sessionType,
        proposedAt: proposedDate.toISOString(),
        duration,
        location,
        note: note.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška pri slanju zahteva");
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = mode === "create" ? "Zakaži termin" : "Predloži drugo vreme";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-5">
        {/* Recipient info */}
        <div className="text-center text-foreground-muted text-sm">
          {mode === "create" ? "Zakaži termin sa" : "Novi predlog za"}{" "}
          <span className="font-medium text-foreground">{recipientName}</span>
        </div>

        {/* Session Type */}
        <div>
          <label className="block text-sm font-medium text-foreground-muted mb-2">
            Tip termina
          </label>
          <div className="grid grid-cols-3 gap-2">
            {SESSION_TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSessionType(option.value)}
                className={`
                  p-3 rounded-xl border text-center transition-all
                  ${
                    sessionType === option.value
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-background hover:border-foreground-muted"
                  }
                `}
              >
                <div className="text-xl mb-1">{option.icon}</div>
                <div className="text-xs">{option.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground-muted mb-2">
              Datum
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={getMinDate()}
              className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:border-accent [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-70"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground-muted mb-2">
              Vreme
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:border-accent [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-70"
            />
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-foreground-muted mb-2">
            Trajanje
          </label>
          <div className="grid grid-cols-4 gap-2">
            {SESSION_DURATION_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setDuration(option.value)}
                className={`
                  py-2 px-3 rounded-xl border text-sm transition-all
                  ${
                    duration === option.value
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-background hover:border-foreground-muted text-foreground-muted"
                  }
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-foreground-muted mb-2">
            Lokacija
          </label>
          <div className="grid grid-cols-2 gap-2">
            {SESSION_LOCATION_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setLocation(option.value)}
                className={`
                  p-3 rounded-xl border flex items-center justify-center gap-2 transition-all
                  ${
                    location === option.value
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-background hover:border-foreground-muted text-foreground-muted"
                  }
                `}
              >
                <span className="text-lg">{option.icon}</span>
                <span className="text-sm">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="block text-sm font-medium text-foreground-muted mb-2">
            Napomena (opciono)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Dodajte napomenu..."
            rows={2}
            maxLength={500}
            className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent resize-none"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="text-sm text-error text-center bg-error/10 rounded-lg p-2">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            Otkaži
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
            loading={isSubmitting}
            className="flex-1"
          >
            {mode === "create" ? "Pošalji zahtev" : "Pošalji predlog"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
