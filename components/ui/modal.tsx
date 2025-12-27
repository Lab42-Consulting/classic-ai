"use client";

import { useEffect, useCallback, ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  variant?: "modal" | "bottom-sheet";
}

export function Modal({
  isOpen,
  onClose,
  children,
  title,
  variant = "bottom-sheet",
}: ModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  const isBottomSheet = variant === "bottom-sheet";

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Content */}
      <div
        className={`
          absolute bg-background-secondary
          ${
            isBottomSheet
              ? "bottom-0 left-0 right-0 rounded-t-3xl max-h-[90vh] overflow-y-auto"
              : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl max-w-md w-[calc(100%-2rem)] max-h-[80vh] overflow-y-auto"
          }
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
      >
        {/* Handle for bottom sheet */}
        {isBottomSheet && (
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-border rounded-full" />
          </div>
        )}

        {/* Header */}
        {title && (
          <div className="px-6 py-4 border-b border-border">
            <h2
              id="modal-title"
              className="text-xl font-semibold text-foreground text-center"
            >
              {title}
            </h2>
          </div>
        )}

        {/* Body */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export type { ModalProps };
