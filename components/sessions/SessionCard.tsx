"use client";

import { GlassCard, Button } from "@/components/ui";
import {
  ScheduledSessionData,
  formatSessionType,
  formatSessionLocation,
  formatSessionDuration,
  SESSION_TYPE_OPTIONS,
  SESSION_LOCATION_OPTIONS,
} from "@/lib/types/sessions";

interface SessionCardProps {
  session: ScheduledSessionData;
  viewerRole: "coach" | "member";
  onCancel: () => void;
  onComplete?: () => void;
  isProcessing?: boolean;
  compact?: boolean;
}

export function SessionCard({
  session,
  viewerRole,
  onCancel,
  onComplete,
  isProcessing = false,
  compact = false,
}: SessionCardProps) {
  const otherParty = viewerRole === "coach" ? session.member : session.staff;

  const sessionTypeOption = SESSION_TYPE_OPTIONS.find(
    (o) => o.value === session.sessionType
  );
  const locationOption = SESSION_LOCATION_OPTIONS.find(
    (o) => o.value === session.location
  );

  const scheduledDate = new Date(session.scheduledAt);
  const now = new Date();
  const isPast = scheduledDate < now;
  const isToday = scheduledDate.toDateString() === now.toDateString();

  const formattedDate = scheduledDate.toLocaleDateString("sr-Latn-RS", {
    weekday: isToday ? undefined : "short",
    day: "numeric",
    month: "short",
  });
  const formattedTime = scheduledDate.toLocaleTimeString("sr-Latn-RS", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Calculate time until session
  const timeDiff = scheduledDate.getTime() - now.getTime();
  const hoursUntil = Math.floor(timeDiff / (1000 * 60 * 60));
  const daysUntil = Math.floor(hoursUntil / 24);

  let timeUntilLabel = "";
  if (isToday && !isPast) {
    if (hoursUntil < 1) {
      timeUntilLabel = "Uskoro";
    } else {
      timeUntilLabel = `Za ${hoursUntil}h`;
    }
  } else if (daysUntil === 1) {
    timeUntilLabel = "Sutra";
  } else if (daysUntil > 1 && daysUntil <= 7) {
    timeUntilLabel = `Za ${daysUntil} dana`;
  }

  // Status styling
  const getStatusStyle = () => {
    switch (session.status) {
      case "confirmed":
        return isPast
          ? "border-warning/20 bg-warning/5"
          : "border-success/20 bg-success/5";
      case "completed":
        return "border-foreground-muted/20 bg-foreground-muted/5";
      case "cancelled":
        return "border-error/20 bg-error/5";
      default:
        return "";
    }
  };

  if (compact) {
    return (
      <div className={`rounded-xl p-3 border ${getStatusStyle()}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{sessionTypeOption?.icon}</span>
            <div>
              <div className="font-medium text-sm text-foreground">
                {isToday ? "Danas" : formattedDate} u {formattedTime}
              </div>
              <div className="text-xs text-foreground-muted">
                {otherParty.name} • {formatSessionDuration(session.duration as 30 | 45 | 60 | 90)}
              </div>
            </div>
          </div>
          {session.status === "confirmed" && timeUntilLabel && (
            <span className="text-xs px-2 py-1 rounded-full bg-success/20 text-success">
              {timeUntilLabel}
            </span>
          )}
          {session.status === "cancelled" && (
            <span className="text-xs px-2 py-1 rounded-full bg-error/20 text-error">
              Otkazano
            </span>
          )}
          {session.status === "completed" && (
            <span className="text-xs px-2 py-1 rounded-full bg-foreground-muted/20 text-foreground-muted">
              Zavrseno
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <GlassCard className={getStatusStyle()}>
      {/* Header - centered */}
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
          <span>{sessionTypeOption?.icon} {formatSessionType(session.sessionType)}</span>
          <span>•</span>
          <span>{locationOption?.icon} {formatSessionLocation(session.location)}</span>
        </div>
        {session.status === "confirmed" && timeUntilLabel && (
          <span className="text-xs px-2 py-1 rounded-full bg-success/20 text-success mt-2">
            {timeUntilLabel}
          </span>
        )}
      </div>

      {/* Time details */}
      <div className="bg-background/50 rounded-xl p-4 mb-4 text-center">
        <div className="text-lg font-semibold text-foreground capitalize">
          {isToday ? "Danas" : formattedDate}
        </div>
        <div className="text-foreground-muted">
          {formattedTime} • {formatSessionDuration(session.duration as 30 | 45 | 60 | 90)}
        </div>
        {session.status === "cancelled" && (
          <span className="inline-block mt-2 px-3 py-1 rounded-full bg-error/20 text-error text-sm">
            Otkazano
          </span>
        )}
        {session.status === "completed" && (
          <span className="inline-block mt-2 px-3 py-1 rounded-full bg-foreground-muted/20 text-foreground-muted text-sm">
            Zavrseno
          </span>
        )}
      </div>

      {/* Note */}
      {session.note && (
        <div className="bg-background/30 rounded-xl p-3 mb-4">
          <p className="text-sm text-foreground-muted italic">"{session.note}"</p>
        </div>
      )}

      {/* Cancellation reason */}
      {session.status === "cancelled" && session.cancellationReason && (
        <div className="bg-error/10 rounded-xl p-3 mb-4">
          <div className="text-xs text-error mb-1">
            Otkazao/la: {session.cancelledBy === viewerRole ? "Vi" : otherParty.name}
          </div>
          <p className="text-sm text-foreground-muted">
            "{session.cancellationReason}"
          </p>
        </div>
      )}

      {/* Actions */}
      {session.status === "confirmed" && (
        <div className="space-y-2">
          {viewerRole === "coach" && isPast && onComplete && (
            <Button
              variant="primary"
              size="lg"
              onClick={onComplete}
              disabled={isProcessing}
              loading={isProcessing}
              className="w-full"
            >
              Oznaci kao zavrseno
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isProcessing}
            className="w-full"
          >
            Otkazi termin
          </Button>
        </div>
      )}
    </GlassCard>
  );
}
