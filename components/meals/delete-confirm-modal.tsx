"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { TranslationKeys } from "@/lib/i18n";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  message: string;
  t: TranslationKeys;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  t,
}: DeleteConfirmModalProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} variant="modal">
      <div className="text-center space-y-4">
        {/* Warning icon */}
        <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mx-auto">
          <svg
            className="w-8 h-8 text-error"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Title */}
        <h3 className="text-xl font-semibold text-foreground">{title}</h3>

        {/* Message */}
        <p className="text-foreground-muted">{message}</p>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            {t.common.cancel}
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            loading={loading}
            disabled={loading}
            className="flex-1"
          >
            {t.meals?.deleteMeal || "Obriši"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export type { DeleteConfirmModalProps };
