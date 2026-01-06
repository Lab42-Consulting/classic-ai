"use client";

import { useState } from "react";
import { GlassCard, Button, Modal } from "@/components/ui";
import {
  SessionRequestData,
  formatSessionType,
  formatSessionLocation,
  formatSessionDuration,
  SESSION_TYPE_OPTIONS,
  SESSION_LOCATION_OPTIONS,
} from "@/lib/types/sessions";

interface SessionRequestCardProps {
  request: SessionRequestData;
  viewerRole: "coach" | "member";
  onAccept: () => Promise<void>;
  onDecline: () => Promise<void>;
  onCounter: () => void; // Opens counter-proposal modal
  isProcessing: boolean;
}

export function SessionRequestCard({
  request,
  viewerRole,
  onAccept,
  onDecline,
  onCounter,
  isProcessing,
}: SessionRequestCardProps) {
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);

  const otherParty = viewerRole === "coach" ? request.member : request.staff;
  const isMyTurn =
    (viewerRole === "coach" && request.lastActionBy === "member") ||
    (viewerRole === "member" && request.lastActionBy === "coach") ||
    (request.lastActionBy === null && request.initiatedBy !== viewerRole);

  const sessionTypeOption = SESSION_TYPE_OPTIONS.find(
    (o) => o.value === request.sessionType
  );
  const locationOption = SESSION_LOCATION_OPTIONS.find(
    (o) => o.value === request.location
  );

  const proposedDate = new Date(request.proposedAt);
  const formattedDate = proposedDate.toLocaleDateString("sr-Latn-RS", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const formattedTime = proposedDate.toLocaleTimeString("sr-Latn-RS", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleDeclineClick = async () => {
    setShowDeclineConfirm(false);
    await onDecline();
  };

  return (
    <>
      <GlassCard className="border-accent/20 bg-accent/5">
        {/* Header with other party info - centered */}
        <div className="flex flex-col items-center text-center mb-4">
          {otherParty.avatarUrl ? (
            <img
              src={otherParty.avatarUrl}
              alt={otherParty.name}
              className="w-14 h-14 rounded-full object-cover mb-2"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center text-xl font-semibold text-accent mb-2">
              {otherParty.name.charAt(0).toUpperCase()}
            </div>
          )}
          <h3 className="font-semibold text-foreground text-lg">
            {otherParty.name}
          </h3>
          <div className="flex items-center justify-center gap-2 text-sm text-foreground-muted mt-1">
            <span>{sessionTypeOption?.icon} {formatSessionType(request.sessionType)}</span>
            <span>•</span>
            <span>{locationOption?.icon} {formatSessionLocation(request.location)}</span>
          </div>
          {request.counterCount > 0 && (
            <span className="text-xs px-2 py-1 rounded-full bg-warning/20 text-warning mt-2">
              {request.counterCount}x predlog
            </span>
          )}
        </div>

        {/* Proposed time */}
        <div className="bg-background/50 rounded-xl p-4 mb-4 text-center">
          <div className="text-sm text-foreground-muted mb-1">Predlozeni termin</div>
          <div className="text-lg font-semibold text-foreground capitalize">
            {formattedDate}
          </div>
          <div className="flex items-center justify-center gap-3 text-foreground-muted">
            <span>{formattedTime}</span>
            <span>•</span>
            <span>{formatSessionDuration(request.duration as 30 | 45 | 60 | 90)}</span>
          </div>
        </div>

        {/* Note if present */}
        {request.note && (
          <div className="bg-background/30 rounded-xl p-3 mb-4">
            <p className="text-sm text-foreground-muted italic">"{request.note}"</p>
          </div>
        )}

        {/* Status indicator */}
        {!isMyTurn && (
          <div className="text-center text-sm text-foreground-muted mb-4 py-2 bg-background/30 rounded-lg">
            Ceka se odgovor {viewerRole === "coach" ? "clana" : "trenera"}
          </div>
        )}

        {/* Actions */}
        {isMyTurn && (
          <div className="space-y-2">
            <Button
              variant="primary"
              size="lg"
              onClick={onAccept}
              disabled={isProcessing}
              loading={isProcessing}
              className="w-full"
            >
              Prihvati termin
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={onCounter}
                disabled={isProcessing}
              >
                Novi predlog
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowDeclineConfirm(true)}
                disabled={isProcessing}
              >
                Odbij
              </Button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Decline confirmation modal */}
      <Modal
        isOpen={showDeclineConfirm}
        onClose={() => setShowDeclineConfirm(false)}
        title="Odbij zahtev"
        variant="modal"
      >
        <div className="space-y-4">
          <p className="text-foreground-muted text-center">
            Da li ste sigurni da zelite da odbijete ovaj zahtev za termin?
          </p>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => setShowDeclineConfirm(false)}
              className="flex-1"
            >
              Otkazi
            </Button>
            <Button
              variant="danger"
              onClick={handleDeclineClick}
              disabled={isProcessing}
              loading={isProcessing}
              className="flex-1"
            >
              Odbij
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
